const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    register, login, getMe, updateMe,
    registerDevice, syncContacts, updateStatus
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.post('/register-device', authenticate, registerDevice);
router.post('/sync-contacts', authenticate, syncContacts);
router.put('/status', authenticate, updateStatus);

module.exports = router;
