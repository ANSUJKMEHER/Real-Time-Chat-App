const express = require('express');
const { sendRequest, getPendingRequests, respondToRequest } = require('../controllers/request.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // All routes require auth

router.route('/')
    .post(sendRequest)
    .get(getPendingRequests);

router.route('/:id')
    .put(respondToRequest);

module.exports = router;
