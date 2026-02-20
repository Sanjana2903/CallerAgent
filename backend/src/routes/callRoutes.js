const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getCallHistory, getActiveCalls, getCall,
    endCall, deleteCall, getCallStats
} = require('../controllers/callController');
const { handleCallTakeover, muteAI } = require('../controllers/voiceController');

// All call routes require authentication
router.use(authenticate);

// Call history & stats
router.get('/', getCallHistory);
router.get('/stats', getCallStats);
router.get('/active', getActiveCalls);

// Single call operations
router.get('/:id', getCall);
router.post('/:id/takeover', handleCallTakeover);
router.post('/:id/mute-ai', muteAI);
router.post('/:id/end', endCall);
router.delete('/:id', deleteCall);

module.exports = router;
