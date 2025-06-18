const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  register,
  login,
  logout,
  getMe,
  validateRegister,
  validateLogin
} = require('./controller');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;