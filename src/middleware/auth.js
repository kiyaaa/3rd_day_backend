const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError, asyncHandler } = require('./errorHandler');
const { query } = require('../models/database');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpire }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, config.auth.jwtSecret);
};

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized to access this route', 401);
  }

  try {
    const decoded = verifyToken(token);
    
    const result = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    throw new AppError('Not authorized to access this route', 401);
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('User role not authorized to access this route', 403);
    }
    next();
  };
};

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      
      const result = await query(
        'SELECT id, email, name, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch (error) {
      // Token invalid but continue without user
    }
  }

  next();
});

module.exports = {
  generateToken,
  verifyToken,
  protect,
  authorize,
  optionalAuth
};