const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../../models/database');
const { generateToken } = require('../../middleware/auth');
const { AppError, asyncHandler } = require('../../middleware/errorHandler');
const config = require('../../config');

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { email, password, name, role = 'user' } = req.body;

  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('User already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds);

  const result = await transaction(async (client) => {
    const userResult = await client.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );

    const user = userResult.rows[0];

    if (role === 'expert') {
      await client.query(
        'INSERT INTO experts (user_id, specialties) VALUES ($1, $2)',
        [user.id, []]
      );
    }

    return user;
  });

  const token = generateToken(result.id);

  res.status(201).json({
    success: true,
    token,
    user: result
  });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation error', 400);
  }

  const { email, password } = req.body;

  const result = await query(
    'SELECT id, email, password, name, role FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken(user.id);

  delete user.password;

  res.json({
    success: true,
    token,
    user
  });
});

const logout = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

const getMe = asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    user: result.rows[0]
  });
});

const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['user', 'expert']).withMessage('Invalid role')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = {
  register,
  login,
  logout,
  getMe,
  validateRegister,
  validateLogin
};