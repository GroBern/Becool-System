import { Router } from 'express';
import Lesson from '../models/Lesson.js';
import GroupLesson from '../models/GroupLesson.js';
import BoardRental from '../models/BoardRental.js';
import SunbedRental from '../models/SunbedRental.js';
import AgentCommission from '../models/AgentCommission.js';
import Instructor from '../models/Instructor.js';
import Agent from '../models/Agent.js';
const router = Router();
// GET / - Aggregated report data
router.get('/', async (req, res) => {
    try {
        const { from, to } = req.query;
        // Build MongoDB date filter for string-based date fields
        const buildDateFilter = (field) => {
            const filter = {};
            if (from)
                filter[field] = { ...filter[field], $gte: from };
            if (to)
                filter[field] = { ...filter[field], $lte: to + 'T23:59:59' };
            return filter;
        };
        // Fetch data with date filtering at DB level
        const [filteredLessons, filteredGroupLessons, filteredBoardRentals, filteredSunbedRentals, filteredCommissions, instructors, agents] = await Promise.all([
            Lesson.find(buildDateFilter('date')),
            GroupLesson.find(buildDateFilter('date')),
            BoardRental.find(buildDateFilter('rentedAt')),
            SunbedRental.find(buildDateFilter('date')),
            AgentCommission.find(buildDateFilter('date')),
            Instructor.find(),
            Agent.find(),
        ]);
        // Revenue from payments
        const sumPayments = (payments) => payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paymentsByMethod = { cash: 0, card: 0, online: 0 };
        const addToMethodTotals = (payments) => {
            for (const p of payments) {
                if (p.method === 'cash')
                    paymentsByMethod.cash += p.amount || 0;
                else if (p.method === 'card')
                    paymentsByMethod.card += p.amount || 0;
                else if (p.method === 'online')
                    paymentsByMethod.online += p.amount || 0;
            }
        };
        // Lesson revenue
        let lessonRevenue = 0;
        for (const l of filteredLessons) {
            const paid = sumPayments(l.payments);
            lessonRevenue += paid;
            addToMethodTotals(l.payments);
        }
        // Group lesson revenue
        let groupLessonRevenue = 0;
        for (const gl of filteredGroupLessons) {
            for (const p of gl.participants) {
                const paid = sumPayments(p.payments);
                groupLessonRevenue += paid;
                addToMethodTotals(p.payments);
            }
        }
        // Board rental revenue
        let boardRentalRevenue = 0;
        for (const br of filteredBoardRentals) {
            const paid = sumPayments(br.payments);
            boardRentalRevenue += paid;
            addToMethodTotals(br.payments);
        }
        // Sunbed rental revenue
        let sunbedRentalRevenue = 0;
        for (const sr of filteredSunbedRentals) {
            const paid = sumPayments(sr.payments);
            sunbedRentalRevenue += paid;
            addToMethodTotals(sr.payments);
        }
        const totalRevenue = lessonRevenue + groupLessonRevenue + boardRentalRevenue + sunbedRentalRevenue;
        // Outstanding balance (totalAmount - paid across all services)
        let totalOwed = 0;
        let totalPaid = 0;
        for (const l of filteredLessons) {
            totalOwed += l.totalAmount || 0;
            totalPaid += sumPayments(l.payments);
        }
        for (const gl of filteredGroupLessons) {
            for (const p of gl.participants) {
                totalOwed += p.finalPrice || 0;
                totalPaid += sumPayments(p.payments);
            }
        }
        for (const br of filteredBoardRentals) {
            totalOwed += br.totalPrice || 0;
            totalPaid += sumPayments(br.payments);
        }
        for (const sr of filteredSunbedRentals) {
            totalOwed += sr.totalPrice || 0;
            totalPaid += sumPayments(sr.payments);
        }
        const outstandingBalance = totalOwed - totalPaid;
        // Instructor payments summary
        const instructorMap = new Map();
        for (const inst of instructors) {
            const id = inst.id || inst._id.toString();
            instructorMap.set(id, { name: inst.name, lessonsCount: 0, calculatedPay: 0, paidAmount: 0 });
        }
        const processInstructors = (items) => {
            for (const item of items) {
                for (const inst of item.instructors) {
                    const id = inst.instructorId;
                    const entry = instructorMap.get(id);
                    if (entry) {
                        entry.lessonsCount += 1;
                        entry.calculatedPay += inst.calculatedPay || 0;
                        entry.paidAmount += inst.paidAmount || 0;
                    }
                }
            }
        };
        processInstructors(filteredLessons);
        processInstructors(filteredGroupLessons);
        const instructorPayments = Array.from(instructorMap.entries()).map(([instructorId, data]) => ({
            instructorId,
            name: data.name,
            lessonsCount: data.lessonsCount,
            calculatedPay: data.calculatedPay,
            paidAmount: data.paidAmount,
            outstanding: data.calculatedPay - data.paidAmount,
        }));
        // Agent commissions summary
        const agentMap = new Map();
        for (const agt of agents) {
            const id = agt.id || agt._id.toString();
            agentMap.set(id, { name: agt.name, guestCount: 0, totalCommission: 0, paidAmount: 0 });
        }
        for (const ac of filteredCommissions) {
            const entry = agentMap.get(ac.agentId);
            if (entry) {
                entry.guestCount += ac.guestCount || 0;
                entry.totalCommission += ac.totalCommission || 0;
                entry.paidAmount += ac.paidAmount || 0;
            }
        }
        const agentCommissionsSummary = Array.from(agentMap.entries()).map(([agentId, data]) => ({
            agentId,
            name: data.name,
            guestCount: data.guestCount,
            totalCommission: data.totalCommission,
            paidAmount: data.paidAmount,
            outstanding: data.totalCommission - data.paidAmount,
        }));
        res.json({
            totalRevenue,
            totalLessons: filteredLessons.length,
            totalGroupLessons: filteredGroupLessons.length,
            totalBoardRentals: filteredBoardRentals.length,
            totalSunbedRentals: filteredSunbedRentals.length,
            outstandingBalance,
            revenueByService: {
                lessons: lessonRevenue,
                groupLessons: groupLessonRevenue,
                boardRentals: boardRentalRevenue,
                sunbedRentals: sunbedRentalRevenue,
            },
            revenueByMethod: paymentsByMethod,
            instructorPayments,
            agentCommissions: agentCommissionsSummary,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
