const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  validateCreateQuestion,
  validateUpdateQuestion
} = require('./controller');

const router = express.Router();

router.get('/', getQuestions);
router.get('/:id', getQuestion);

router.use(protect);

router.post('/', validateCreateQuestion, createQuestion);
router.put('/:id', validateUpdateQuestion, updateQuestion);
router.delete('/:id', deleteQuestion);

module.exports = router;