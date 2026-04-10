import { Router } from 'express';
import User, { ALL_TABS } from '../models/User.js';
import { generateToken, authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }
        const user = await User.findOne({ username: username.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account has been disabled. Contact your administrator.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const token = generateToken({ userId: String(user._id), role: user.role });
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                allowedTabs: user.allowedTabs,
                isActive: user.isActive,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Login failed.' });
    }
});
// ── GET /api/auth/me — Get current user profile ──────────────
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});
// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        const user = await User.findById(req.user.id);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password changed successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to change password.' });
    }
});
// ── GET /api/auth/users — List all users (admin/manager only) ─
router.get('/users', authenticate, requireRole('admin', 'manager'), async (req, res) => {
    try {
        let users;
        if (req.user.role === 'admin') {
            // Admin sees all users
            users = await User.find().sort({ createdAt: -1 });
        }
        else {
            // Manager sees only workers they created
            users = await User.find({ role: 'worker', createdBy: req.user.id }).sort({ createdAt: -1 });
        }
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});
// ── POST /api/auth/users — Create a new user (admin/manager) ─
router.post('/users', authenticate, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const { username, password, displayName, role, allowedTabs } = req.body;
        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'Username, password, and display name are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        // Check duplicate username
        const existing = await User.findOne({ username: username.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ error: 'Username already taken.' });
        }
        // Role restrictions
        let finalRole = role || 'worker';
        if (req.user.role === 'manager') {
            // Managers can only create workers
            finalRole = 'worker';
        }
        if (req.user.role === 'admin') {
            // Admin can create admin, manager, or worker
            if (!['admin', 'manager', 'worker'].includes(finalRole)) {
                finalRole = 'worker';
            }
        }
        // Allowed tabs
        let finalTabs = allowedTabs || [...ALL_TABS];
        if (finalRole === 'admin' || finalRole === 'manager') {
            // Admin and manager get all tabs
            finalTabs = [...ALL_TABS];
        }
        const user = new User({
            username: username.toLowerCase().trim(),
            password,
            displayName,
            role: finalRole,
            allowedTabs: finalTabs,
            createdBy: req.user.id,
        });
        await user.save();
        res.status(201).json(user);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create user.' });
    }
});
// ── PUT /api/auth/users/:id — Update user (admin/manager) ────
router.put('/users/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        // Managers can only edit workers they created
        if (req.user.role === 'manager') {
            if (user.role !== 'worker' || user.createdBy !== req.user.id) {
                return res.status(403).json({ error: 'You can only edit workers you created.' });
            }
        }
        // Prevent editing own role (admin can't demote themselves)
        if (req.params.id === req.user.id && req.body.role && req.body.role !== req.user.role) {
            return res.status(400).json({ error: 'You cannot change your own role.' });
        }
        const { displayName, role, allowedTabs, isActive, password } = req.body;
        if (displayName !== undefined)
            user.displayName = displayName;
        if (isActive !== undefined)
            user.isActive = isActive;
        // Role changes (admin only)
        if (role !== undefined && req.user.role === 'admin') {
            user.role = role;
            if (role === 'admin' || role === 'manager') {
                user.allowedTabs = [...ALL_TABS];
            }
        }
        // Tab permissions
        if (allowedTabs !== undefined && user.role === 'worker') {
            user.allowedTabs = allowedTabs;
        }
        // Password reset
        if (password && password.length >= 6) {
            user.password = password;
        }
        await user.save();
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update user.' });
    }
});
// ── DELETE /api/auth/users/:id — Delete user (admin only) ────
router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        res.json({ message: 'User deleted.' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});
export default router;
