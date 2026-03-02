const express = require('express');
const { allUsers, updateProfile } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/').get(protect, allUsers);
router.route('/profile').put(protect, updateProfile);

module.exports = router;
