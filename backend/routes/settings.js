import { Router } from 'express';
import Settings from '../models/Settings.js';
const router = Router();
const DEFAULT_SETTINGS = {
    _id: 'settings-1',
    schoolName: 'SurfDesk Surf School',
    schoolPhone: '+1 555 0000',
    schoolEmail: 'info@surfdesk.com',
    schoolAddress: 'Bondi Beach, Sydney, Australia',
};
// GET / - Get settings (find first, create default if none)
router.get('/', async (_req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create(DEFAULT_SETTINGS);
        }
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT / - Update settings (findOneAndUpdate with upsert)
router.put('/', async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.id) {
            data._id = data.id;
            delete data.id;
        }
        const settings = await Settings.findOneAndUpdate({}, data, {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        });
        res.json(settings);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
export default router;
