const { body, validationResult } = require('express-validator');
const { query } = require('../../models/database');
const { AppError, asyncHandler } = require('../../middleware/errorHandler');

const getProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.user.id;

  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.created_at,
     e.specialties, e.experience_years, e.rating, e.total_ratings, e.response_rate, e.bio
     FROM users u
     LEFT JOIN experts e ON u.id = e.user_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = result.rows[0];
  
  if (!user.specialties) {
    delete user.specialties;
    delete user.experience_years;
    delete user.rating;
    delete user.total_ratings;
    delete user.response_rate;
    delete user.bio;
  }

  res.json({
    success: true,
    user
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { name } = req.body;
  const userId = req.user.id;

  const result = await query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role',
    [name, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    user: result.rows[0]
  });
});

const getMyQuestions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, limit = 20, offset = 0 } = req.query;

  let queryText = `
    SELECT q.*, 
           COUNT(DISTINCT em.expert_id) as expert_matches_count,
           COUNT(DISTINCT cr.id) as active_rooms_count
    FROM questions q
    LEFT JOIN expert_matches em ON q.id = em.question_id
    LEFT JOIN chat_rooms cr ON q.id = cr.question_id AND cr.status = 'active'
    WHERE q.user_id = $1
  `;
  
  const params = [userId];
  
  if (status) {
    queryText += ' AND q.status = $2';
    params.push(status);
  }
  
  queryText += `
    GROUP BY q.id
    ORDER BY q.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  
  params.push(limit, offset);
  
  const result = await query(queryText, params);

  res.json({
    success: true,
    questions: result.rows,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: result.rows.length
    }
  });
});

const getMyChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status = 'active', limit = 20, offset = 0 } = req.query;

  const result = await query(
    `SELECT cr.*, q.title as question_title, q.category,
            COUNT(DISTINCT m.id) as message_count,
            MAX(m.created_at) as last_message_at
     FROM chat_rooms cr
     JOIN questions q ON cr.question_id = q.id
     JOIN room_participants rp ON cr.id = rp.room_id
     LEFT JOIN messages m ON cr.id = m.room_id
     WHERE rp.user_id = $1 AND cr.status = $2
     GROUP BY cr.id, q.title, q.category
     ORDER BY last_message_at DESC NULLS LAST
     LIMIT $3 OFFSET $4`,
    [userId, status, limit, offset]
  );

  res.json({
    success: true,
    chatRooms: result.rows,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: result.rows.length
    }
  });
});

const validateUpdateProfile = [
  body('name').trim().notEmpty().withMessage('Name is required')
];

module.exports = {
  getProfile,
  updateProfile,
  getMyQuestions,
  getMyChats,
  validateUpdateProfile
};