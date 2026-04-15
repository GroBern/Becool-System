import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDB, getConnectionStatus } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import User, { ALL_TABS } from './models/User.js';

// Route imports
import authRouter from './routes/auth.js';
import lessonsRouter from './routes/lessons.js';
import groupLessonsRouter from './routes/groupLessons.js';
import boardRentalsRouter from './routes/boardRentals.js';
import sunbedRentalsRouter from './routes/sunbedRentals.js';
import instructorsRouter from './routes/instructors.js';
import studentsRouter from './routes/students.js';
import agentsRouter from './routes/agents.js';
import agentCommissionsRouter from './routes/agentCommissions.js';
import paymentsRouter from './routes/payments.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import seedRouter from './seed.js';

process.on('unhandledRejection', (reason) => {
    console.warn('Unhandled rejection (suppressed):', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust first proxy hop (needed for rate-limit + secure cookies behind LB)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // disable for API; frontend serves its own
}));

// Gzip/Brotli response compression
app.use(compression());

// Request logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS whitelist from env
const allowedOrigins = [
    process.env.DEV_FRONTEND_URL_1,
    process.env.FRONTEND_URL_1,
    process.env.FRONTEND_URL_2,
    process.env.FRONTEND_URL_3,
].filter(Boolean);

app.use(cors({
    origin(origin, cb) {
        // allow non-browser clients (curl, server-to-server) with no origin
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));

// Body parsers with sensible limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global API rate limit
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Stricter limit on auth to slow brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, try again later.' },
});

// DB readiness guard (except /health)
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (!getConnectionStatus()) {
        return res.status(503).json({ error: 'Database not connected. MongoDB may be restarting.' });
    }
    next();
});

// Public routes
app.use('/api/auth', authLimiter, authRouter);

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'Becool Surf School backend is running',
        database: getConnectionStatus() ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        env: NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// Protected routes
app.use('/api/lessons', authenticate, lessonsRouter);
app.use('/api/group-lessons', authenticate, groupLessonsRouter);
app.use('/api/board-rentals', authenticate, boardRentalsRouter);
app.use('/api/sunbed-rentals', authenticate, sunbedRentalsRouter);
app.use('/api/instructors', authenticate, instructorsRouter);
app.use('/api/students', authenticate, studentsRouter);
app.use('/api/agents', authenticate, agentsRouter);
app.use('/api/agent-commissions', authenticate, agentCommissionsRouter);
app.use('/api/payments', authenticate, paymentsRouter);
app.use('/api/reports', authenticate, reportsRouter);
app.use('/api/settings', authenticate, settingsRouter);
app.use('/api/seed', authenticate, seedRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

async function seedDefaultAdmin() {
    try {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 0) {
            const admin = new User({
                username: 'admin',
                password: 'admin123',
                displayName: 'Administrator',
                role: 'admin',
                allowedTabs: [...ALL_TABS],
                isActive: true,
                createdBy: 'system',
            });
            await admin.save();
            console.log('Default admin account created (username: admin, password: admin123)');
        }
    } catch (err) {
        console.warn('Could not seed admin:', err instanceof Error ? err.message : err);
    }
}

async function start() {
    console.log('Connecting to MongoDB...');
    await connectDB();
    await seedDefaultAdmin();

    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT} [${NODE_ENV}]`);
        console.log('MongoDB connected — API ready');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`\n${signal} received — shutting down gracefully`);
        server.close(() => console.log('HTTP server closed'));
        try {
            await mongoose.connection.close(false);
            console.log('MongoDB connection closed');
        } catch (err) {
            console.warn('Error closing MongoDB:', err?.message || err);
        }
        // Force exit if something hangs
        setTimeout(() => process.exit(0), 5000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
