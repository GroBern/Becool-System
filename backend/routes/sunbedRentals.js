import { Router } from 'express';
import SunbedRental from '../models/SunbedRental.js';
const router = Router();
// GET all
router.get('/', async (_req, res) => {
    try {
        const items = await SunbedRental.find().sort({ createdAt: -1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET by id
router.get('/:id', async (req, res) => {
    try {
        const item = await SunbedRental.findById(req.params.id);
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
        const item = await SunbedRental.create(data);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT update
router.put('/:id', async (req, res) => {
    try {
        const item = await SunbedRental.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
        const item = await SunbedRental.findByIdAndDelete(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /:id/payments - Add payment
router.post('/:id/payments', async (req, res) => {
    try {
        const { amount, method, date } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        if (!['cash', 'card', 'online'].includes(method))
            return res.status(400).json({ error: 'Invalid payment method' });
        if (!date)
            return res.status(400).json({ error: 'Payment date is required' });
        const rental = await SunbedRental.findById(req.params.id);
        if (!rental)
            return res.status(404).json({ error: 'Not found' });
        rental.payments.push(req.body);
        const totalPaid = rental.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= rental.totalPrice) {
            rental.paymentStatus = 'paid';
        }
        else if (totalPaid > 0) {
            rental.paymentStatus = 'partial';
        }
        else {
            rental.paymentStatus = 'unpaid';
        }
        await rental.save();
        res.status(201).json(rental);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT /:id/return - Mark as returned
router.put('/:id/return', async (req, res) => {
    try {
        const rental = await SunbedRental.findById(req.params.id);
        if (!rental)
            return res.status(404).json({ error: 'Not found' });
        rental.status = 'returned';
        rental.returnedAt = new Date().toISOString();
        await rental.save();
        res.json(rental);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
export default router;
