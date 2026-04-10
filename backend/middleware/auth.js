import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const JWT_SECRET = process.env.JWT_SECRET || 'surfdesk-secret-key-change-in-production';
// Generate JWT token
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
// Verify JWT and attach user to request
export async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided. Please log in.' });
    }
    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Account disabled or not found.' });
        }
        req.user = {
            id: String(user._id),
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            allowedTabs: user.allowedTabs,
            isActive: user.isActive,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}
// Role-based access: only allow specific roles
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        next();
    };
}
