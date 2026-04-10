import { Router } from 'express';
import Instructor from '../models/Instructor.js';
const router = Router();
// GET all
router.get('/', async (_req, res) => {
    try {
        const items = await Instructor.find().sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET by id
router.get('/:id', async (req, res) => {
    try {
        const item = await Instructor.findById(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST create
router.post('/', async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.id) {
            data._id = data.id;
            delete data.id;
        }
        const item = await Instructor.create(data);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT update
router.put('/:id', async (req, res) => {
    try {
        const item = await Instructor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const item = await Instructor.findByIdAndDelete(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
