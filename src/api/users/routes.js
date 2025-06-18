const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  getProfile,
  updateProfile,
  getMyQuestions,
  getMyChats,
  validateUpdateProfile
} = require('./controller');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.get('/profile/:id', getProfile);
router.put('/profile', validateUpdateProfile, updateProfile);
router.get('/questions', getMyQuestions);
router.get('/chats', getMyChats);

module.exports = router;