const express = require('express');
const { register, login, getMe, resetPasswordCasual } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/reset-password-casual', resetPasswordCasual);

module.exports = router;
