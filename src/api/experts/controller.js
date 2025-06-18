const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../../models/database');
const { AppError, asyncHandler } = require('../../middleware/errorHandler');

const getExperts = asyncHandler(async (req, res) => {
  const { 
    specialty,
    minRating,
    limit = 20, 
    offset = 0,
    sortBy = 'rating',
    order = 'DESC' 
  } = req.query;

  let queryText = `
    SELECT e.*, u.name, u.email,
           COUNT(DISTINCT em.question_id) as total_questions,
           COUNT(DISTINCT em.question_id) FILTER (WHERE em.status = 'accepted') as accepted_questions
    FROM experts e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN expert_matches em ON e.id = em.expert_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 0;

  if (specialty) {
    queryText += ` AND $${++paramCount} = ANY(e.specialties)`;
    params.push(specialty);
  }

  if (minRating) {
    queryText += ` AND e.rating >= $${++paramCount}`;
    params.push(minRating);
  }

  const validSortFields = ['rating', 'experience_years', 'response_rate'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'rating';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  queryText += `
    GROUP BY e.id, u.name, u.email
    ORDER BY e.${sortField} ${sortOrder}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;
  
  params.push(limit, offset);
  
  const result = await query(queryText, params);

  res.json({
    success: true,
    experts: result.rows,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: result.rows.length
    }
  });
});

const getExpert = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT e.*, u.name, u.email,
            COUNT(DISTINCT em.question_id) as total_questions,
            COUNT(DISTINCT em.question_id) FILTER (WHERE em.status = 'accepted') as accepted_questions,
            AVG(em.match_score) as avg_match_score
     FROM experts e
     JOIN users u ON e.user_id = u.id
     LEFT JOIN expert_matches em ON e.id = em.expert_id
     WHERE e.id = $1
     GROUP BY e.id, u.name, u.email`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Expert not found', 404);
  }

  res.json({
    success: true,
    expert: result.rows[0]
  });
});

const registerAsExpert = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { specialties, experienceYears, bio } = req.body;
  const userId = req.user.id;

  if (req.user.role === 'expert') {
    throw new AppError('User is already registered as expert', 400);
  }

  const result = await transaction(async (client) => {
    await client.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['expert', userId]
    );

    const expertResult = await client.query(
      `INSERT INTO experts (user_id, specialties, experience_years, bio) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, specialties, experienceYears, bio]
    );

    return expertResult.rows[0];
  });

  res.status(201).json({
    success: true,
    expert: result,
    message: 'Successfully registered as expert'
  });
});

const updateExpertProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { specialties, experienceYears, bio } = req.body;
  const userId = req.user.id;

  if (req.user.role !== 'expert') {
    throw new AppError('User is not an expert', 403);
  }

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (specialties !== undefined) {
    updates.push(`specialties = $${paramCount++}`);
    values.push(specialties);
  }
  if (experienceYears !== undefined) {
    updates.push(`experience_years = $${paramCount++}`);
    values.push(experienceYears);
  }
  if (bio !== undefined) {
    updates.push(`bio = $${paramCount++}`);
    values.push(bio);
  }

  values.push(userId);

  const result = await query(
    `UPDATE experts 
     SET ${updates.join(', ')} 
     WHERE user_id = $${paramCount} 
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Expert profile not found', 404);
  }

  res.json({
    success: true,
    expert: result.rows[0]
  });
});

const acceptQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;

  if (req.user.role !== 'expert') {
    throw new AppError('Only experts can accept questions', 403);
  }

  const expertResult = await query(
    'SELECT id FROM experts WHERE user_id = $1',
    [userId]
  );

  if (expertResult.rows.length === 0) {
    throw new AppError('Expert profile not found', 404);
  }

  const expertId = expertResult.rows[0].id;

  const matchResult = await query(
    'SELECT * FROM expert_matches WHERE question_id = $1 AND expert_id = $2',
    [questionId, expertId]
  );

  if (matchResult.rows.length === 0) {
    throw new AppError('Expert not matched to this question', 404);
  }

  if (matchResult.rows[0].status !== 'pending') {
    throw new AppError('Match already responded', 400);
  }

  await transaction(async (client) => {
    await client.query(
      `UPDATE expert_matches 
       SET status = 'accepted', responded_at = CURRENT_TIMESTAMP 
       WHERE question_id = $1 AND expert_id = $2`,
      [questionId, expertId]
    );

    await client.query(
      `UPDATE questions 
       SET status = 'matched' 
       WHERE id = $1 AND status = 'pending'`,
      [questionId]
    );
  });

  if (req.io) {
    req.io.emit('expert_accepted', {
      questionId,
      expertId,
      expertName: req.user.name
    });
  }

  res.json({
    success: true,
    message: 'Question accepted successfully'
  });
});

const rejectQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;

  if (req.user.role !== 'expert') {
    throw new AppError('Only experts can reject questions', 403);
  }

  const expertResult = await query(
    'SELECT id FROM experts WHERE user_id = $1',
    [userId]
  );

  if (expertResult.rows.length === 0) {
    throw new AppError('Expert profile not found', 404);
  }

  const expertId = expertResult.rows[0].id;

  const result = await query(
    `UPDATE expert_matches 
     SET status = 'rejected', responded_at = CURRENT_TIMESTAMP 
     WHERE question_id = $1 AND expert_id = $2 AND status = 'pending'
     RETURNING *`,
    [questionId, expertId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Match not found or already responded', 404);
  }

  res.json({
    success: true,
    message: 'Question rejected'
  });
});

const validateRegisterExpert = [
  body('specialties').isArray().notEmpty().withMessage('Specialties required'),
  body('experienceYears').isInt({ min: 0 }).withMessage('Valid experience years required'),
  body('bio').optional().trim()
];

const validateUpdateExpert = [
  body('specialties').optional().isArray().notEmpty(),
  body('experienceYears').optional().isInt({ min: 0 }),
  body('bio').optional().trim()
];

module.exports = {
  getExperts,
  getExpert,
  registerAsExpert,
  updateExpertProfile,
  acceptQuestion,
  rejectQuestion,
  validateRegisterExpert,
  validateUpdateExpert
};