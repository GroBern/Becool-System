import { Router } from 'express';
import Lesson from '../models/Lesson.js';
const router = Router();
// GET all
router.get('/', async (_req, res) => {
    try {
        const items = await Lesson.find().sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET by id
router.get('/:id', async (req, res) => {
    try {
        const item = await Lesson.findById(req.params.id);
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
        const item = await Lesson.create(data);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT update
router.put('/:id', async (req, res) => {
    try {
        const item = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
        const item = await Lesson.findByIdAndDelete(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /:id/payments - Add payment to lesson
router.post('/:id/payments', async (req, res) => {
    try {
        const { amount, method, date } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        if (!['cash', 'card', 'online'].includes(method))
            return res.status(400).json({ error: 'Invalid payment method' });
        if (!date)
            return res.status(400).json({ error: 'Payment date is required' });
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson)
            return res.status(404).json({ error: 'Not found' });
        lesson.payments.push(req.body);
        // Recalculate payment status
        const totalPaid = lesson.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= lesson.totalAmount) {
            lesson.paymentStatus = 'paid';
        }
        else if (totalPaid > 0) {
            lesson.paymentStatus = 'partial';
        }
        else {
            lesson.paymentStatus = 'unpaid';
        }
        await lesson.save();
        res.status(201).json(lesson);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// POST /:id/instructor-payments/:instIdx - Add payment to specific instructor
router.post('/:id/instructor-payments/:instIdx', async (req, res) => {
    try {
        const { amount, method, date } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        if (!['cash', 'card', 'online'].includes(method))
            return res.status(400).json({ error: 'Invalid payment method' });
        if (!date)
            return res.status(400).json({ error: 'Payment date is required' });
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson)
            return res.status(404).json({ error: 'Not found' });
        const instIdx = parseInt(req.params.instIdx, 10);
        if (instIdx < 0 || instIdx >= lesson.instructors.length) {
            return res.status(404).json({ error: 'Instructor index out of range' });
        }
        const instructor = lesson.instructors[instIdx];
        instructor.payments.push(req.body);
        instructor.paidAmount = instructor.payments.reduce((sum, p) => sum + p.amount, 0);
        if (instructor.paidAmount >= instructor.calculatedPay) {
            instructor.paymentStatus = 'paid';
        }
        else if (instructor.paidAmount > 0) {
            instructor.paymentStatus = 'partial';
        }
        else {
            instructor.paymentStatus = 'unpaid';
        }
        await lesson.save();
        res.status(201).json(lesson);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT /:id/status - Update lesson status
router.put('/:id/status', async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson)
            return res.status(404).json({ error: 'Not found' });
        lesson.status = req.body.status;
        await lesson.save();
        res.json(lesson);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
export default router;
