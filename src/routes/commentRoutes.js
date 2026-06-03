const express = require('express');
const {
  createComment,
  getComments,
  getCommentById,
  deleteComment,
} = require('../controllers/commentController');
const { requireAuth, permit } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, permit('admin', 'manager', 'tester', 'developer'), createComment);
router.get('/', requireAuth, getComments);
router.get('/:id', requireAuth, getCommentById);
router.delete('/:id', requireAuth, deleteComment);

module.exports = router;
