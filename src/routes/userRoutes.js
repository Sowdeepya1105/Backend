const express = require('express');
const { getUsers, getUserById } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getUsers);
router.get('/:id', requireAuth, getUserById);

module.exports = router;
