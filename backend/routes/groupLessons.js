import { Router } from 'express';
import GroupLesson from '../models/GroupLesson.js';
const router = Router();
// GET all
router.get('/', async (_req, res) => {
    try {
        const items = await GroupLesson.find().sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET by id
router.get('/:id', async (req, res) => {
    try {
        const item = await GroupLesson.findById(req.params.id);
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
        const item = await GroupLesson.create(data);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT update
router.put('/:id', async (req, res) => {
    try {
        const item = await GroupLesson.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
        const item = await GroupLesson.findByIdAndDelete(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /:id/participants - Add participant to group lesson
router.post('/:id/participants', async (req, res) => {
    try {
        const gl = await GroupLesson.findById(req.params.id);
        if (!gl)
            return res.status(404).json({ error: 'Not found' });
        gl.participants.push(req.body);
        await gl.save();
        res.status(201).json(gl);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// DELETE /:id/participants/:participantId - Remove participant
router.delete('/:id/participants/:participantId', async (req, res) => {
    try {
        const gl = await GroupLesson.findById(req.params.id);
        if (!gl)
            return res.status(404).json({ error: 'Not found' });
        const idx = gl.participants.findIndex((p) => p._id.toString() === req.params.participantId || p.id === req.params.participantId);
        if (idx === -1)
            return res.status(404).json({ error: 'Participant not found' });
        gl.participants.splice(idx, 1);
        await gl.save();
        res.json(gl);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /:id/participants/:participantId/payments - Add payment to participant
router.post('/:id/participants/:participantId/payments', async (req, res) => {
    try {
        const { amount, method, date } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        if (!['cash', 'card', 'online'].includes(method))
            return res.status(400).json({ error: 'Invalid payment method' });
        if (!date)
            return res.status(400).json({ error: 'Payment date is required' });
        const gl = await GroupLesson.findById(req.params.id);
        if (!gl)
            return res.status(404).json({ error: 'Not found' });
        const participant = gl.participants.find((p) => p._id.toString() === req.params.participantId || p.id === req.params.participantId);
        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });
        participant.payments.push(req.body);
        const totalPaid = participant.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= participant.finalPrice) {
            participant.paymentStatus = 'paid';
        }
        else if (totalPaid > 0) {
            participant.paymentStatus = 'partial';
        }
        else {
            participant.paymentStatus = 'unpaid';
        }
        await gl.save();
        res.status(201).json(gl);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// POST /:id/instructor-payments/:instIdx - Add instructor payment
router.post('/:id/instructor-payments/:instIdx', async (req, res) => {
    try {
        const { amount, method, date } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        if (!['cash', 'card', 'online'].includes(method))
            return res.status(400).json({ error: 'Invalid payment method' });
        if (!date)
            return res.status(400).json({ error: 'Payment date is required' });
        const gl = await GroupLesson.findById(req.params.id);
        if (!gl)
            return res.status(404).json({ error: 'Not found' });
        const instIdx = parseInt(req.params.instIdx, 10);
        if (instIdx < 0 || instIdx >= gl.instructors.length) {
            return res.status(404).json({ error: 'Instructor index out of range' });
        }
        const instructor = gl.instructors[instIdx];
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
        await gl.save();
        res.status(201).json(gl);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT /:id/status - Update status
router.put('/:id/status', async (req, res) => {
    try {
        const gl = await GroupLesson.findById(req.params.id);
        if (!gl)
            return res.status(404).json({ error: 'Not found' });
        gl.status = req.body.status;
        await gl.save();
        res.json(gl);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
export default router;
