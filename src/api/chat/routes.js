const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  createChatRoom,
  getChatRoom,
  getChatMessages,
  joinChatRoom,
  leaveChatRoom,
  closeChatRoom,
  validateCreateChatRoom
} = require('./controller');

const router = express.Router();

router.use(protect);

router.post('/rooms', validateCreateChatRoom, createChatRoom);
router.get('/rooms/:id', getChatRoom);
router.get('/rooms/:id/messages', getChatMessages);
router.post('/rooms/:id/join', joinChatRoom);
router.post('/rooms/:id/leave', leaveChatRoom);
router.post('/rooms/:id/close', closeChatRoom);

module.exports = router;