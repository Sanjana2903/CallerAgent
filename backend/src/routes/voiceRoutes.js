const express = require('express');
const router = express.Router();
const { validateTwilioSignature } = require('../middleware/auth');
const {
    handleIncomingCall,
    handleCallStatus
} = require('../controllers/voiceController');

// Twilio webhooks (no JWT auth, but validated by Twilio signature in production)
router.post('/incoming-call', validateTwilioSignature, handleIncomingCall);
router.post('/call-status', validateTwilioSignature, handleCallStatus);

module.exports = router;
