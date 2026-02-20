/**
 * Ringia Backend — Main Entry Point
 * 
 * AI Call Assistant: answers calls, streams live transcripts,
 * analyzes conversations, and enables call takeover.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Services
const socketService = require('./services/socketService');
const notificationService = require('./services/notificationService');

// Routes
const authRoutes = require('./routes/authRoutes');
const callRoutes = require('./routes/callRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

// Voice controller (for WebSocket media stream)
const { handleMediaStream } = require('./controllers/voiceController');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ========================
// Socket.io — Real-time transcript streaming
// ========================
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:8081',  // React Native Metro
            '*'                        // Allow all for dev (restrict in production)
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
socketService.initialize(io);

// ========================
// WebSocket Server — Twilio Media Streams
// ========================
const wss = new WebSocket.Server({ server, path: '/voice/media-stream' });
wss.on('connection', (ws, req) => {
    console.log('[WS] New Twilio media stream connection from:', req.socket.remoteAddress);
    handleMediaStream(ws, req);
});

// ========================
// Express Middleware
// ========================
app.use(helmet({
    contentSecurityPolicy: false  // Disable CSP for easier development
}));

app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:8081',
        /\.ngrok\.io$/,              // Allow any ngrok subdomain
        /\.ngrok-free\.app$/         // New ngrok domain format
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// ========================
// Routes
// ========================
app.get('/', (req, res) => {
    res.json({
        name: 'Ringia API',
        version: '1.0.0',
        status: 'OK',
        message: 'Your AI Call Assistant Backend 🤖📞',
        endpoints: {
            auth: '/api/auth',
            calls: '/api/calls',
            voice: '/voice',
            health: '/health'
        }
    });
});

// Health check
app.get('/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'UP',
        database: dbStatus,
        sockets: socketService.getConnectedUsersCount(),
        uptime: Math.round(process.uptime()) + 's'
    });
});

// Twilio Webhook routes (no auth)
app.use('/voice', voiceRoutes);

// API routes (JWT protected)
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ========================
// Database Connection & Server Start
// ========================
async function startServer() {
    try {
        // Connect to MongoDB
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000
            });
            console.log('✅ MongoDB connected');
        } else {
            console.warn('⚠️ MONGODB_URI not provided. Running in limited mode (DB features will fail).');
        }

        // Initialize Firebase push notifications
        notificationService.initialize();

        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`
🚀 Ringia Backend running on port ${PORT}
📡 Socket.io ready for real-time connections
🎙️ WebSocket ready for Twilio media streams at /voice/media-stream

API Endpoints:
  POST /api/auth/register       — Register new user
  POST /api/auth/login          — Login
  GET  /api/calls               — Call history
  POST /api/calls/:id/takeover  — Take over a call
  POST /voice/incoming-call     — Twilio webhook (set in Twilio console)
  POST /voice/call-status       — Twilio status callback

Make sure to set these in your Twilio console:
  Voice Webhook: ${process.env.WEBHOOK_BASE_URL || 'https://your-ngrok.ngrok.io'}/voice/incoming-call
  Status Callback: ${process.env.WEBHOOK_BASE_URL || 'https://your-ngrok.ngrok.io'}/voice/call-status
      `);
        });
    } catch (err) {
        console.warn('⚠️ Failed to connect to MongoDB:', err.message);
        console.warn('Proceeding to start server for demonstration...');

        server.listen(PORT, () => {
            console.log(`🚀 Ringia Backend started in OFFLINE/DEMO mode on port ${PORT}`);
        });
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await mongoose.disconnect();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});

startServer();
