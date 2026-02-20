/**
 * Seed Script for Ringia
 * 
 * Populates the database with default user and some dummy call history for testing.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Call = require('../models/Call');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

const DUMMY_USER = {
    name: 'Test User',
    email: 'test@ringia.ai',
    password: 'password123',
    phoneNumber: '+1234567890',
    twilioNumber: '+18881234567',
    userPin: '1234'
};

const DUMMY_CALLS = [
    {
        callerNumber: '+19995551234',
        callerName: 'Pizza Hut Delivery',
        status: 'ended',
        startedAt: new Date(Date.now() - 3600000), // 1h ago
        endedAt: new Date(Date.now() - 3540000),
        durationSeconds: 60,
        transcript: [
            { role: 'ai', content: "Hello, you've reached Test User's assistant. How can I help?" },
            { role: 'caller', content: "Hi, I'm outside with your pizza delivery." },
            { role: 'ai', content: "The user has instructed to leave the food at the door and ring the bell. Please do that." },
            { role: 'caller', content: "Okay, leaving it now. Bye." }
        ],
        analysis: {
            intent: 'delivery.food',
            intentLabel: 'Food Delivery',
            summary: 'Food delivery from Pizza Hut. AI instructed to leave at door.',
            sentiment: 'positive',
            requiresFollowUp: false
        }
    },
    {
        callerNumber: '+18880009999',
        callerName: 'Unknown',
        status: 'ended',
        startedAt: new Date(Date.now() - 7200000), // 2h ago
        endedAt: new Date(Date.now() - 7140000),
        durationSeconds: 60,
        transcript: [
            { role: 'ai', content: "Hello, how can I help?" },
            { role: 'caller', content: "We are calling about your car's extended warranty." },
            { role: 'ai', content: "This sounds like a sales call. I will end the call now." }
        ],
        analysis: {
            intent: 'spam.telemarketing',
            intentLabel: 'Spam',
            summary: 'Auto-warranty scam call. AI identified and ended the call.',
            sentiment: 'negative',
            requiresFollowUp: false
        }
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding');

        // Clear existing data
        await User.deleteMany({ email: DUMMY_USER.email });
        console.log('Cleared existing test user');

        // Create user
        const hashedPassword = await bcrypt.hash(DUMMY_USER.password, 12);
        const user = new User({
            ...DUMMY_USER,
            password: hashedPassword
        });
        await user.save();
        console.log('Created test user:', user.email);

        // Clear existing calls for this user
        await Call.deleteMany({ userId: user._id });

        // Add dummy calls
        const callsWithUserId = DUMMY_CALLS.map(call => ({
            ...call,
            userId: user._id,
            callSid: 'CA' + Math.random().toString(36).substring(7)
        }));

        await Call.insertMany(callsWithUserId);
        console.log(`Successfully seeded ${callsWithUserId.length} call records`);

        console.log('\nSeeding complete!');
        console.log('Login with:');
        console.log(`  Email: ${DUMMY_USER.email}`);
        console.log(`  Password: ${DUMMY_USER.password}`);

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
