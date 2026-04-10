import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB, getConnectionStatus } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import User, { ALL_TABS } from './models/User.js';

// Prevent unhandled rejections from crashing the server
process.on('unhandledRejection', (reason) => {
    console.warn('Unhandled rejection (suppressed):', reason instanceof Error ? reason.message : reason);
});

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
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DB check middleware - returns 503 if MongoDB is temporarily disconnected
app.use('/api', (req, res, next) => {
    if (req.path === '/health')
        return next();
    if (!getConnectionStatus()) {
        return res.status(503).json({ error: 'Database not connected. MongoDB may be restarting.' });
    }
    next();
});

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'Becool Surf School backend is running',
        database: getConnectionStatus() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
});

// Protected routes (auth required)
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

// Seed default admin account if none exists
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
    }
    catch (err) {
        console.warn('Could not seed admin:', err instanceof Error ? err.message : err);
    }
}

// Start - wait for MongoDB, then start server
async function start() {
    console.log('Connecting to MongoDB...');
    await connectDB();
    await seedDefaultAdmin();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('MongoDB connected - API ready');
    });
}
start();
