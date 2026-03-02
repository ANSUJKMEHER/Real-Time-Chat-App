const express = require('express');
const { sendMessage, allMessages } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/').post(protect, sendMessage);
router.route('/:chatId').get(protect, allMessages);

module.exports = router;
