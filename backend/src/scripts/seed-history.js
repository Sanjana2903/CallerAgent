const mongoose = require('mongoose');
const User = require('../models/User');
const Call = require('../models/Call');
require('dotenv').config();

async function seedHistory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ email: 'sanjanab@example.com' });
        if (!user) {
            console.error('Demo user sanjanab@example.com not found. Run seed first.');
            process.exit(1);
        }

        // Clear existing calls for this user
        await Call.deleteMany({ userId: user._id });

        const mockCalls = [
            {
                userId: user._id,
                callerNumber: '+1 555-0199',
                callerName: 'Domino\'s Pizza',
                status: 'completed',
                direction: 'inbound',
                intent: 'delivery.food',
                sentiment: 'positive',
                transcript: [
                    { role: 'user', text: 'Hello, this is Domino\'s. I\'m outside the gate.' },
                    { role: 'assistant', text: 'Hi! Yash is busy. Please leave the pizza with the security guard and ring the bell.' },
                    { role: 'user', text: 'Okay, no problem. Have a good day.' }
                ],
                summary: 'Food delivery from Domino\'s. AI instructed to leave with security.',
                duration: 45,
                startTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago
                endTime: new Date(Date.now() - 3600000 * 2 + 45000),
            },
            {
                userId: user._id,
                callerNumber: '+1 888-2233',
                callerName: 'Scam Risk',
                status: 'completed',
                direction: 'inbound',
                intent: 'spam.telemarketing',
                sentiment: 'negative',
                transcript: [
                    { role: 'user', text: 'Hello, am I speaking with the owner of the house regarding your electricity bill?' },
                    { role: 'assistant', text: 'I am Yash\'s AI assistant. He is not interested in telemarketing offers. Goodbye.' }
                ],
                summary: 'Spam call regarding electricity bills. AI identified and terminated the call.',
                duration: 15,
                startTime: new Date(Date.now() - 3600000 * 5), // 5 hours ago
                endTime: new Date(Date.now() - 3600000 * 5 + 15000),
            },
            {
                userId: user._id,
                callerNumber: '+1 415-9988',
                callerName: 'Mom',
                status: 'missed',
                direction: 'inbound',
                intent: 'personal.known',
                sentiment: 'neutral',
                transcript: [],
                summary: 'Missed call from Mom.',
                duration: 0,
                startTime: new Date(Date.now() - 3600000 * 24), // Yesterday
                endTime: new Date(Date.now() - 3600000 * 24),
            }
        ];

        await Call.insertMany(mockCalls);
        console.log(`✅ Seeded ${mockCalls.length} demo calls for ${user.email}`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seedHistory();
