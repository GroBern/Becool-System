import { Router } from 'express';
import Lesson from '../models/Lesson.js';
import GroupLesson from '../models/GroupLesson.js';
import BoardRental from '../models/BoardRental.js';
import SunbedRental from '../models/SunbedRental.js';
import AgentCommission from '../models/AgentCommission.js';
const router = Router();
// GET / - Aggregate all payments across services
router.get('/', async (req, res) => {
    try {
        const { from, to, method, serviceType } = req.query;
        const allPayments = [];
        // Helper to check if a payment date is within range
        const inRange = (dateStr) => {
            if (!from && !to)
                return true;
            const d = dateStr.split('T')[0];
            if (from && d < from)
                return false;
            if (to && d > to)
                return false;
            return true;
        };
        // Helper to check payment method filter
        const matchesMethod = (m) => {
            if (!method)
                return true;
            return m === method;
        };
        // 1. Lesson payments (lesson-level + instructor-level)
        if (!serviceType || serviceType === 'lesson') {
            const lessons = await Lesson.find();
            for (const lesson of lessons) {
                // Lesson payments
                for (const pay of lesson.payments) {
                    if (inRange(pay.date) && matchesMethod(pay.method)) {
                        allPayments.push({
                            id: pay.id || pay._id?.toString(),
                            amount: pay.amount,
                            method: pay.method,
                            date: pay.date,
                            note: pay.note,
                            serviceType: 'lesson',
                            serviceId: lesson.id || lesson._id.toString(),
                            serviceName: lesson.name,
                        });
                    }
                }
                // Instructor payments
                for (const inst of lesson.instructors) {
                    for (const pay of inst.payments) {
                        if (inRange(pay.date) && matchesMethod(pay.method)) {
                            allPayments.push({
                                id: pay.id || pay._id?.toString(),
                                amount: pay.amount,
                                method: pay.method,
                                date: pay.date,
                                note: pay.note,
                                serviceType: 'lesson-instructor',
                                serviceId: lesson.id || lesson._id.toString(),
                                serviceName: `${lesson.name} (Instructor)`,
                            });
                        }
                    }
                }
            }
        }
        // 2. Group lesson payments (participant-level + instructor-level)
        if (!serviceType || serviceType === 'group-lesson') {
            const groupLessons = await GroupLesson.find();
            for (const gl of groupLessons) {
                // Participant payments
                for (const participant of gl.participants) {
                    for (const pay of participant.payments) {
                        if (inRange(pay.date) && matchesMethod(pay.method)) {
                            allPayments.push({
                                id: pay.id || pay._id?.toString(),
                                amount: pay.amount,
                                method: pay.method,
                                date: pay.date,
                                note: pay.note,
                                serviceType: 'group-lesson',
                                serviceId: gl.id || gl._id.toString(),
                                serviceName: `${gl.name} (${participant.name})`,
                            });
                        }
                    }
                }
                // Instructor payments
                for (const inst of gl.instructors) {
                    for (const pay of inst.payments) {
                        if (inRange(pay.date) && matchesMethod(pay.method)) {
                            allPayments.push({
                                id: pay.id || pay._id?.toString(),
                                amount: pay.amount,
                                method: pay.method,
                                date: pay.date,
                                note: pay.note,
                                serviceType: 'group-lesson-instructor',
                                serviceId: gl.id || gl._id.toString(),
                                serviceName: `${gl.name} (Instructor)`,
                            });
                        }
                    }
                }
            }
        }
        // 3. Board rental payments
        if (!serviceType || serviceType === 'board-rental') {
            const boardRentals = await BoardRental.find();
            for (const rental of boardRentals) {
                for (const pay of rental.payments) {
                    if (inRange(pay.date) && matchesMethod(pay.method)) {
                        allPayments.push({
                            id: pay.id || pay._id?.toString(),
                            amount: pay.amount,
                            method: pay.method,
                            date: pay.date,
                            note: pay.note,
                            serviceType: 'board-rental',
                            serviceId: rental.id || rental._id.toString(),
                            serviceName: `Board ${rental.boardNumber} - ${rental.customerName}`,
                        });
                    }
                }
            }
        }
        // 4. Sunbed rental payments
        if (!serviceType || serviceType === 'sunbed-rental') {
            const sunbedRentals = await SunbedRental.find();
            for (const rental of sunbedRentals) {
                for (const pay of rental.payments) {
                    if (inRange(pay.date) && matchesMethod(pay.method)) {
                        allPayments.push({
                            id: pay.id || pay._id?.toString(),
                            amount: pay.amount,
                            method: pay.method,
                            date: pay.date,
                            note: pay.note,
                            serviceType: 'sunbed-rental',
                            serviceId: rental.id || rental._id.toString(),
                            serviceName: `Sunbed ${rental.bedNumber} - ${rental.customerName}`,
                        });
                    }
                }
            }
        }
        // 5. Agent commission payments
        if (!serviceType || serviceType === 'agent-commission') {
            const commissions = await AgentCommission.find();
            for (const commission of commissions) {
                for (const pay of commission.payments) {
                    if (inRange(pay.date) && matchesMethod(pay.method)) {
                        allPayments.push({
                            id: pay.id || pay._id?.toString(),
                            amount: pay.amount,
                            method: pay.method,
                            date: pay.date,
                            note: pay.note,
                            serviceType: 'agent-commission',
                            serviceId: commission.id || commission._id.toString(),
                            serviceName: `Commission (Agent ${commission.agentId})`,
                        });
                    }
                }
            }
        }
        // Sort by date descending
        allPayments.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
        // Pagination support
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 0;
        if (limit > 0) {
            const start = (page - 1) * limit;
            const paginated = allPayments.slice(start, start + limit);
            res.json({ payments: paginated, total: allPayments.length, page, limit });
        }
        else {
            res.json(allPayments);
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
