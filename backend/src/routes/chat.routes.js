const express = require('express');
const { accessChat, fetchChats, createGroupChat } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/').post(protect, accessChat).get(protect, fetchChats);
router.route('/group').post(protect, createGroupChat);

module.exports = router;
