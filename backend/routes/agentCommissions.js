import { Router } from 'express';
import AgentCommission from '../models/AgentCommission.js';
const router = Router();
// GET all
router.get('/', async (_req, res) => {
    try {
        const items = await AgentCommission.find().sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET by id
router.get('/:id', async (req, res) => {
    try {
        const item = await AgentCommission.findById(req.params.id);
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
        const item = await AgentCommission.create(data);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT update
router.put('/:id', async (req, res) => {
    try {
        const item = await AgentCommission.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
        const item = await AgentCommission.findByIdAndDelete(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /:id/payments - Add payment to commission
router.post('/:id/payments', async (req, res) => {
    try {
        const { amount, method, date } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        if (!['cash', 'card', 'online'].includes(method))
            return res.status(400).json({ error: 'Invalid payment method' });
        if (!date)
            return res.status(400).json({ error: 'Payment date is required' });
        const commission = await AgentCommission.findById(req.params.id);
        if (!commission)
            return res.status(404).json({ error: 'Not found' });
        commission.payments.push(req.body);
        commission.paidAmount = commission.payments.reduce((sum, p) => sum + p.amount, 0);
        if (commission.paidAmount >= commission.totalCommission) {
            commission.paymentStatus = 'paid';
        }
        else if (commission.paidAmount > 0) {
            commission.paymentStatus = 'partial';
        }
        else {
            commission.paymentStatus = 'unpaid';
        }
        await commission.save();
        res.status(201).json(commission);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
export default router;
