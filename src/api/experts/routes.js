const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  getExperts,
  getExpert,
  registerAsExpert,
  updateExpertProfile,
  acceptQuestion,
  rejectQuestion,
  validateRegisterExpert,
  validateUpdateExpert
} = require('./controller');

const router = express.Router();

router.get('/', getExperts);
router.get('/:id', getExpert);

router.use(protect);

router.post('/register', validateRegisterExpert, registerAsExpert);
router.put('/profile', validateUpdateExpert, updateExpertProfile);
router.post('/questions/:questionId/accept', acceptQuestion);
router.post('/questions/:questionId/reject', rejectQuestion);

module.exports = router;