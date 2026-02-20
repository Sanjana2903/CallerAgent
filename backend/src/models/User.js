const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, trim: true }, // User's real phone number

  // Twilio Assignment
  twilioNumber: { type: String, trim: true },  // Assigned AI number
  userPin: { type: String, length: 4 },         // 4-digit PIN for shared number mode

  // Device tokens for push notifications
  fcmTokens: [{ type: String }],               // Firebase Cloud Messaging tokens

  // AI Settings
  aiSettings: {
    voice: { type: String, default: 'shimmer', enum: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'] },
    tone: { type: String, default: 'professional', enum: ['professional', 'friendly', 'casual'] },
    greeting: { type: String, default: "Hi, you've reached {name}'s assistant. How can I help?" },
    language: { type: String, default: 'en-US' },
    assistantName: { type: String, default: 'Ringia' }
  },

  // Delivery Preferences
  deliveryPreferences: {
    food: {
      defaultAction: { type: String, default: 'leave_at_door', enum: ['leave_at_door', 'hand_to_security', 'call_when_near', 'cancel'] },
      instructions: { type: String, default: 'Please leave the food at the door and ring the bell once.' },
      alternateInstructions: { type: String },
      allowedTimeWindow: {
        start: { type: String, default: '08:00' },
        end: { type: String, default: '22:00' }
      }
    },
    packages: {
      defaultAction: { type: String, default: 'leave_at_location', enum: ['leave_at_location', 'hand_to_person', 'with_security', 'require_signature'] },
      location: { type: String, default: 'shoe rack outside the door' },
      alternateLocation: { type: String, default: 'with security guard' },
      requireSignature: { type: Boolean, default: false },
      instructions: { type: String }
    },
    groceries: {
      defaultAction: { type: String, default: 'hand_to_person', enum: ['hand_to_person', 'leave_outside', 'with_security'] },
      instructions: { type: String, default: 'Please call when you reach the building.' },
      fallbackInstructions: { type: String, default: 'If no answer, leave with security.' }
    }
  },

  // Service Preferences
  servicePreferences: {
    mygate: {
      autoApprove: [{ type: String }],   // e.g. ['maid', 'cook', 'newspaper']
      askPurpose: [{ type: String }],
      reject: [{ type: String }],        // e.g. ['salesperson', 'solicitor']
      instructions: { type: String }
    },
    maintenance: {
      requireAppointment: { type: Boolean, default: true },
      noAppointmentResponse: { type: String, default: 'Please schedule an appointment first via the app.' },
      emergencyException: { type: Boolean, default: true }
    }
  },

  // Caller Rules
  callerRules: {
    contacts: { type: String, default: 'inform_availability', enum: ['inform_availability', 'connect_immediately', 'take_message', 'screen'] },
    vipContacts: { type: String, default: 'connect_immediately', enum: ['connect_immediately', 'inform_availability', 'take_message'] },
    unknown: { type: String, default: 'screen', enum: ['screen', 'take_message', 'decline'] },
    repeated: {
      threshold: { type: Number, default: 3 },
      withinMinutes: { type: Number, default: 10 },
      action: { type: String, default: 'escalate', enum: ['escalate', 'screen', 'decline'] }
    }
  },

  // VIP Contacts
  vipContacts: [{
    name: { type: String },
    phoneNumber: { type: String }
  }],

  // Blocked Numbers
  blockedNumbers: [{ type: String }],

  // User Contacts (synced from phone)
  contacts: [{
    name: { type: String },
    phoneNumber: { type: String }
  }],

  // Availability & DND
  availability: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    workHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' }
    },
    dndSchedule: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '23:00' },
      end: { type: String, default: '07:00' }
    },
    currentStatus: { type: String, default: 'available', enum: ['available', 'busy', 'dnd', 'away'] }
  },

  // Escalation Settings
  escalation: {
    urgentKeywords: [{ type: String }],
    alwaysNotify: { type: Boolean, default: true },
    autoEscalate: [{ type: String }]   // e.g. ['vip', 'repeated', 'urgent']
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate a random 4-digit PIN
userSchema.statics.generatePin = async function () {
  let pin, exists;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
    exists = await this.findOne({ userPin: pin });
  } while (exists);
  return pin;
};

// Omit password from JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
