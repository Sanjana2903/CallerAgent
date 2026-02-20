const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * POST /api/auth/register
 */
async function register(req, res) {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Generate a unique 4-digit PIN for shared number mode
        const userPin = await User.generatePin();

        const user = new User({
            name,
            email,
            password,
            phoneNumber,
            userPin,
            // Default greeting with user's name
            aiSettings: {
                greeting: `Hi, you've reached ${name}'s assistant. How can I help you today?`
            }
        });

        await user.save();
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                twilioNumber: user.twilioNumber,
                userPin: user.userPin,
                aiSettings: user.aiSettings,
                availability: user.availability
            }
        });
    } catch (err) {
        console.error('[Auth] Register error:', err);
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                twilioNumber: user.twilioNumber,
                userPin: user.userPin,
                aiSettings: user.aiSettings,
                availability: user.availability,
                deliveryPreferences: user.deliveryPreferences
            }
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get user profile' });
    }
}

/**
 * PUT /api/auth/me
 * Update user profile and preferences
 */
async function updateMe(req, res) {
    const allowedFields = [
        'name', 'phoneNumber', 'aiSettings', 'deliveryPreferences',
        'servicePreferences', 'callerRules', 'vipContacts',
        'blockedNumbers', 'availability', 'escalation'
    ];

    try {
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('[Auth] Update error:', err);
        res.status(500).json({ error: 'Update failed', details: err.message });
    }
}

/**
 * POST /api/auth/register-device
 * Register FCM token for push notifications
 */
async function registerDevice(req, res) {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'FCM token required' });

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            await user.save();
        }

        res.json({ message: 'Device registered' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to register device' });
    }
}

/**
 * POST /api/auth/sync-contacts
 * Sync user's phone contacts for caller identification
 */
async function syncContacts(req, res) {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
        return res.status(400).json({ error: 'contacts must be an array' });
    }

    try {
        // Normalize phone numbers
        const normalizedContacts = contacts.map(c => ({
            name: c.name,
            phoneNumber: c.phoneNumber?.replace(/\s+/g, '').replace(/-/g, '')
        })).filter(c => c.name && c.phoneNumber);

        await User.findByIdAndUpdate(req.user._id, {
            $set: { contacts: normalizedContacts }
        });

        res.json({
            message: 'Contacts synced',
            count: normalizedContacts.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to sync contacts' });
    }
}

/**
 * PUT /api/auth/status
 * Update current availability status
 */
async function updateStatus(req, res) {
    const { status } = req.body;
    const validStatuses = ['available', 'busy', 'dnd', 'away'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        await User.findByIdAndUpdate(req.user._id, {
            $set: { 'availability.currentStatus': status }
        });
        res.json({ message: 'Status updated', status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status' });
    }
}

// ========================
// Helper
// ========================

function generateToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

module.exports = { register, login, getMe, updateMe, registerDevice, syncContacts, updateStatus };
