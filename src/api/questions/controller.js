const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../../models/database');
const { AppError, asyncHandler } = require('../../middleware/errorHandler');

const createQuestion = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { title, content, category, urgency = 'normal' } = req.body;
  const userId = req.user.id;

  const result = await query(
    `INSERT INTO questions (user_id, title, content, category, urgency) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [userId, title, content, category, urgency]
  );

  const question = result.rows[0];

  if (req.io) {
    req.io.emit('new_question', {
      question,
      user: { id: req.user.id, name: req.user.name }
    });
  }

  res.status(201).json({
    success: true,
    question
  });
});

const getQuestions = asyncHandler(async (req, res) => {
  const { 
    status, 
    category, 
    urgency,
    limit = 20, 
    offset = 0,
    sortBy = 'created_at',
    order = 'DESC' 
  } = req.query;

  let queryText = `
    SELECT q.*, 
           u.name as user_name,
           COUNT(DISTINCT em.expert_id) as expert_matches_count
    FROM questions q
    JOIN users u ON q.user_id = u.id
    LEFT JOIN expert_matches em ON q.id = em.question_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 0;

  if (status) {
    queryText += ` AND q.status = $${++paramCount}`;
    params.push(status);
  }

  if (category) {
    queryText += ` AND q.category = $${++paramCount}`;
    params.push(category);
  }

  if (urgency) {
    queryText += ` AND q.urgency = $${++paramCount}`;
    params.push(urgency);
  }

  const validSortFields = ['created_at', 'urgency', 'status'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  queryText += `
    GROUP BY q.id, u.name
    ORDER BY q.${sortField} ${sortOrder}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;
  
  params.push(limit, offset);
  
  const result = await query(queryText, params);

  const countResult = await query(
    'SELECT COUNT(*) FROM questions WHERE 1=1' + 
    (status ? ' AND status = $1' : '') +
    (category ? ' AND category = $2' : '') +
    (urgency ? ' AND urgency = $3' : ''),
    params.slice(0, -2)
  );

  res.json({
    success: true,
    questions: result.rows,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: parseInt(countResult.rows[0].count)
    }
  });
});

const getQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT q.*, 
            u.name as user_name,
            COUNT(DISTINCT em.expert_id) as expert_matches_count,
            COUNT(DISTINCT cr.id) as active_rooms_count
     FROM questions q
     JOIN users u ON q.user_id = u.id
     LEFT JOIN expert_matches em ON q.id = em.question_id
     LEFT JOIN chat_rooms cr ON q.id = cr.question_id AND cr.status = 'active'
     WHERE q.id = $1
     GROUP BY q.id, u.name`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Question not found', 404);
  }

  const matchesResult = await query(
    `SELECT em.*, e.*, u.name as expert_name
     FROM expert_matches em
     JOIN experts e ON em.expert_id = e.id
     JOIN users u ON e.user_id = u.id
     WHERE em.question_id = $1
     ORDER BY em.match_score DESC`,
    [id]
  );

  res.json({
    success: true,
    question: result.rows[0],
    expertMatches: matchesResult.rows
  });
});

const updateQuestion = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { id } = req.params;
  const { title, content, category, urgency, status } = req.body;

  const questionResult = await query(
    'SELECT user_id, status FROM questions WHERE id = $1',
    [id]
  );

  if (questionResult.rows.length === 0) {
    throw new AppError('Question not found', 404);
  }

  if (questionResult.rows[0].user_id !== req.user.id) {
    throw new AppError('Not authorized to update this question', 403);
  }

  if (questionResult.rows[0].status === 'resolved') {
    throw new AppError('Cannot update resolved question', 400);
  }

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (content !== undefined) {
    updates.push(`content = $${paramCount++}`);
    values.push(content);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramCount++}`);
    values.push(category);
  }
  if (urgency !== undefined) {
    updates.push(`urgency = $${paramCount++}`);
    values.push(urgency);
  }
  if (status !== undefined && ['pending', 'matched', 'cancelled'].includes(status)) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }

  values.push(id);

  const result = await query(
    `UPDATE questions 
     SET ${updates.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING *`,
    values
  );

  res.json({
    success: true,
    question: result.rows[0]
  });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'SELECT user_id, status FROM questions WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Question not found', 404);
  }

  if (result.rows[0].user_id !== req.user.id) {
    throw new AppError('Not authorized to delete this question', 403);
  }

  if (result.rows[0].status !== 'pending') {
    throw new AppError('Can only delete pending questions', 400);
  }

  await query('DELETE FROM questions WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Question deleted successfully'
  });
});

const validateCreateQuestion = [
  body('title').trim().notEmpty().isLength({ max: 500 }),
  body('content').trim().notEmpty(),
  body('category').trim().notEmpty().isLength({ max: 100 }),
  body('urgency').optional().isIn(['low', 'normal', 'high', 'urgent'])
];

const validateUpdateQuestion = [
  body('title').optional().trim().isLength({ max: 500 }),
  body('content').optional().trim().notEmpty(),
  body('category').optional().trim().isLength({ max: 100 }),
  body('urgency').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'matched', 'cancelled'])
];

module.exports = {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  validateCreateQuestion,
  validateUpdateQuestion
};