const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT tokens
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
async function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    return authenticate(req, res, next);
}

/**
 * Validate Twilio webhook signatures (for security)
 */
function validateTwilioSignature(req, res, next) {
    // In production, validate Twilio signature
    // For development, skip validation
    if (process.env.NODE_ENV === 'production') {
        const twilio = require('twilio');
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const signature = req.headers['x-twilio-signature'];
        const url = `${process.env.WEBHOOK_BASE_URL}${req.originalUrl}`;

        const isValid = twilio.validateRequest(authToken, signature, url, req.body);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Twilio signature' });
        }
    }
    next();
}

module.exports = { authenticate, optionalAuthenticate, validateTwilioSignature };
