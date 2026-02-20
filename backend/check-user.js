const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const user = await User.findOne({ email: 'yash@example.com' });
        if (user) {
            console.log('User found:', user.email);
        } else {
            console.log('User NOT found: yash@example.com');
            const allUsers = await User.find({}, 'email');
            console.log('Available users:', allUsers.map(u => u.email));
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
