import { Router } from 'express';
import Lesson from './models/Lesson.js';
import GroupLesson from './models/GroupLesson.js';
import BoardRental from './models/BoardRental.js';
import SunbedRental from './models/SunbedRental.js';
import Instructor from './models/Instructor.js';
import Student from './models/Student.js';
import Agent from './models/Agent.js';
import AgentCommission from './models/AgentCommission.js';
import Settings from './models/Settings.js';
const router = Router();
const today = new Date().toISOString().split('T')[0];
async function seedDatabase() {
    // Clear all collections
    await Promise.all([
        Lesson.deleteMany({}),
        GroupLesson.deleteMany({}),
        BoardRental.deleteMany({}),
        SunbedRental.deleteMany({}),
        Instructor.deleteMany({}),
        Student.deleteMany({}),
        Agent.deleteMany({}),
        AgentCommission.deleteMany({}),
        Settings.deleteMany({}),
    ]);
    // Seed instructors
    await Instructor.insertMany([
        { _id: 'inst-1', name: 'Carlos Rivera', phone: '+1 555 0101', email: 'carlos@surfdesk.com', specialties: ['Beginner', 'Kids'], certifications: ['ISA Level 2', 'First Aid'], hourlyRate: 35, commissionPercent: 40, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100', status: 'active', joinDate: '2024-03-15', notes: '' },
        { _id: 'inst-2', name: 'Anna Chen', phone: '+1 555 0102', email: 'anna@surfdesk.com', specialties: ['Intermediate', 'Advanced'], certifications: ['ISA Level 3', 'Lifeguard'], hourlyRate: 45, commissionPercent: 45, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100', status: 'active', joinDate: '2023-11-01', notes: '' },
        { _id: 'inst-3', name: 'David Thompson', phone: '+1 555 0103', email: 'david@surfdesk.com', specialties: ['Kids', 'Group'], certifications: ['ISA Level 2', 'Child Safety'], hourlyRate: 30, commissionPercent: 35, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100', status: 'active', joinDate: '2024-06-10', notes: '' },
        { _id: 'inst-4', name: 'Maria Santos', phone: '+1 555 0104', email: 'maria@surfdesk.com', specialties: ['Private', 'Intermediate'], certifications: ['ISA Level 2', 'First Aid'], hourlyRate: 40, commissionPercent: 40, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100&h=100', status: 'active', joinDate: '2024-01-20', notes: '' },
        { _id: 'inst-5', name: 'Jake Wilson', phone: '+1 555 0105', email: 'jake@surfdesk.com', specialties: ['Advanced', 'Competition'], certifications: ['ISA Level 3', 'Pro Surfer'], hourlyRate: 55, commissionPercent: 50, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100&h=100', status: 'off-duty', joinDate: '2023-08-05', notes: '' },
    ]);
    // Seed students
    await Student.insertMany([
        { _id: 'stu-1', name: 'Tom Kingston', phone: '+1 555 1001', email: 'tom@email.com', level: 'beginner', age: 28, emergencyContact: 'Jane Kingston', emergencyPhone: '+1 555 9001', joinDate: '2025-12-01', totalLessons: 5, notes: '' },
        { _id: 'stu-2', name: 'Lisa Roberts', phone: '+1 555 1002', email: 'lisa@email.com', level: 'intermediate', age: 24, emergencyContact: 'Mark Roberts', emergencyPhone: '+1 555 9002', joinDate: '2025-10-15', totalLessons: 12, notes: '' },
        { _id: 'stu-3', name: 'Mike Davidson', phone: '+1 555 1003', email: 'mike@email.com', level: 'beginner', age: 35, emergencyContact: 'Sara Davidson', emergencyPhone: '+1 555 9003', joinDate: '2026-01-10', totalLessons: 3, notes: '' },
        { _id: 'stu-4', name: 'Sarah Mitchell', phone: '+1 555 1004', email: 'sarah@email.com', level: 'advanced', age: 22, emergencyContact: 'Paul Mitchell', emergencyPhone: '+1 555 9004', joinDate: '2025-06-20', totalLessons: 30, notes: '' },
        { _id: 'stu-5', name: 'Emma Johnson', phone: '+1 555 1005', email: 'emma@email.com', level: 'beginner', age: 16, emergencyContact: 'Robert Johnson', emergencyPhone: '+1 555 9005', joinDate: '2026-02-01', totalLessons: 2, notes: '' },
        { _id: 'stu-6', name: 'Alex Brown', phone: '+1 555 1006', email: 'alex@email.com', level: 'intermediate', age: 30, emergencyContact: 'Chris Brown', emergencyPhone: '+1 555 9006', joinDate: '2025-11-05', totalLessons: 8, notes: '' },
        { _id: 'stu-7', name: 'Noah Garcia', phone: '+1 555 1007', email: 'noah@email.com', level: 'beginner', age: 12, emergencyContact: 'Maria Garcia', emergencyPhone: '+1 555 9007', joinDate: '2026-01-20', totalLessons: 4, notes: '' },
        { _id: 'stu-8', name: 'Olivia White', phone: '+1 555 1008', email: 'olivia@email.com', level: 'beginner', age: 10, emergencyContact: 'James White', emergencyPhone: '+1 555 9008', joinDate: '2026-02-15', totalLessons: 1, notes: '' },
    ]);
    // Seed agents
    await Agent.insertMany([
        { _id: 'agt-1', name: 'Rajeev Kumar', phone: '+1 555 2001', commissionType: 'percentage', commissionRate: 10, status: 'active', notes: 'Hotel Sunrise partner' },
        { _id: 'agt-2', name: 'Sophie Laurent', phone: '+1 555 2002', commissionType: 'fixed', commissionRate: 15, status: 'active', notes: 'Beach resort contact' },
        { _id: 'agt-3', name: 'Marco Rossi', phone: '+1 555 2003', commissionType: 'percentage', commissionRate: 12, status: 'active', notes: 'Tour operator' },
    ]);
    // Seed sunbed rentals first (lessons reference them)
    await SunbedRental.create([
        { _id: 'sb-1', bedNumber: 'SB-01', customerName: 'Tom Kingston', customerPhone: '+1 555 1001', date: today, startTime: '09:00', endTime: '12:00', pricePerHour: 5, totalPrice: 0, isFree: true, freeReason: 'Included with lesson', linkedLessonId: '', linkedGroupLessonId: '', status: 'active', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [], notes: '' },
        { _id: 'sb-2', bedNumber: 'SB-02', customerName: 'Walk-in Guest', customerPhone: '+1 555 4001', date: today, startTime: '10:00', endTime: '14:00', pricePerHour: 5, totalPrice: 20, isFree: false, freeReason: '', linkedLessonId: '', linkedGroupLessonId: '', status: 'active', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [{ amount: 20, method: 'cash', date: today, note: '' }], notes: '' },
        { _id: 'sb-3', bedNumber: 'SB-03', customerName: 'Sarah Mitchell', customerPhone: '+1 555 1004', date: today, startTime: '10:30', endTime: '13:00', pricePerHour: 5, totalPrice: 0, isFree: true, freeReason: 'Included with lesson', linkedLessonId: '', linkedGroupLessonId: '', status: 'active', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [], notes: '' },
        { _id: 'sb-4', bedNumber: 'SB-04', customerName: 'Tom Kingston', customerPhone: '+1 555 1001', date: today, startTime: '09:00', endTime: '11:00', pricePerHour: 5, totalPrice: 0, isFree: true, freeReason: 'Included with group lesson', linkedLessonId: '', linkedGroupLessonId: '', status: 'active', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [], notes: '' },
        { _id: 'sb-5', bedNumber: 'SB-05', customerName: 'Sarah Mitchell', customerPhone: '+1 555 1004', date: today, startTime: '11:00', endTime: '13:00', pricePerHour: 5, totalPrice: 0, isFree: true, freeReason: 'Included with group lesson', linkedLessonId: '', linkedGroupLessonId: '', status: 'active', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [], notes: '' },
    ]);
    // Seed lessons
    await Lesson.create([
        {
            _id: 'les-1', name: 'Private Surf - Tom', type: 'private', level: 'beginner',
            instructors: [{ instructorId: 'inst-1', payType: 'percentage', payRate: 40, calculatedPay: 26, paidAmount: 26, paymentStatus: 'paid', payments: [{ amount: 26, method: 'cash', date: today, note: '' }] }],
            studentIds: ['stu-1'], maxStudents: 1, date: today, startTime: '09:00', endTime: '10:30', zone: 'Beach Zone 1',
            pricePerPerson: 65, status: 'in-progress', agentId: 'agt-1',
            isFree: false, freeReason: '', discount: 0, discountReason: '',
            totalAmount: 65, paymentStatus: 'paid',
            payments: [{ amount: 65, method: 'cash', date: today, note: '' }],
            includedSunbedIds: ['sb-1'], notes: '',
        },
        {
            _id: 'les-2', name: 'Kids Surf Camp', type: 'kids', level: 'beginner',
            instructors: [
                { instructorId: 'inst-3', payType: 'percentage', payRate: 35, calculatedPay: 31.5, paidAmount: 0, paymentStatus: 'unpaid', payments: [] },
            ],
            studentIds: ['stu-7', 'stu-8'], maxStudents: 12, date: today, startTime: '10:00', endTime: '11:30', zone: 'Beach Zone 2',
            pricePerPerson: 45, status: 'scheduled', agentId: '',
            isFree: false, freeReason: '', discount: 0, discountReason: '',
            totalAmount: 90, paymentStatus: 'partial',
            payments: [{ amount: 45, method: 'card', date: today, note: 'Noah paid' }],
            includedSunbedIds: [], notes: '',
        },
        {
            _id: 'les-3', name: 'Private Advanced - Sarah', type: 'private', level: 'advanced',
            instructors: [{ instructorId: 'inst-4', payType: 'fixed', payRate: 50, calculatedPay: 50, paidAmount: 0, paymentStatus: 'unpaid', payments: [] }],
            studentIds: ['stu-4'], maxStudents: 1, date: today, startTime: '10:30', endTime: '12:00', zone: 'Beach Zone 4',
            pricePerPerson: 120, status: 'scheduled', agentId: 'agt-2',
            isFree: false, freeReason: '', discount: 10, discountReason: 'Returning customer',
            totalAmount: 108, paymentStatus: 'unpaid', payments: [],
            includedSunbedIds: ['sb-3'], notes: '',
        },
    ]);
    // Update sunbed linkedLessonId references
    await SunbedRental.findByIdAndUpdate('sb-1', { linkedLessonId: 'les-1' });
    await SunbedRental.findByIdAndUpdate('sb-3', { linkedLessonId: 'les-3' });
    // Seed group lessons
    await GroupLesson.create([
        {
            _id: 'gl-1', name: 'Morning Surf Group', level: 'beginner',
            instructors: [
                { instructorId: 'inst-1', payType: 'percentage', payRate: 30, calculatedPay: 58.5, paidAmount: 0, paymentStatus: 'unpaid', payments: [] },
                { instructorId: 'inst-3', payType: 'fixed', payRate: 40, calculatedPay: 40, paidAmount: 40, paymentStatus: 'paid', payments: [{ amount: 40, method: 'cash', date: today, note: '' }] },
            ],
            participants: [
                { name: 'Tom Kingston', phone: '+1 555 1001', agentId: 'agt-1', isFree: false, freeReason: '', discount: 0, discountReason: '', finalPrice: 65, paymentStatus: 'paid', payments: [{ amount: 65, method: 'cash', date: today, note: '' }], sunbedId: 'sb-4' },
                { name: 'Lisa Roberts', phone: '+1 555 1002', agentId: '', isFree: false, freeReason: '', discount: 0, discountReason: '', finalPrice: 65, paymentStatus: 'paid', payments: [{ amount: 65, method: 'card', date: today, note: '' }], sunbedId: '' },
                { name: 'Walk-in Guest', phone: '+1 555 3001', agentId: 'agt-3', isFree: false, freeReason: '', discount: 10, discountReason: 'Agent discount', finalPrice: 65, paymentStatus: 'partial', payments: [{ amount: 40, method: 'cash', date: today, note: 'Partial' }], sunbedId: '' },
            ],
            maxParticipants: 10, date: today, startTime: '09:00', endTime: '10:30', zone: 'Beach Zone 1',
            pricePerPerson: 65, status: 'in-progress', notes: '',
        },
        {
            _id: 'gl-2', name: 'Intermediate Techniques', level: 'intermediate',
            instructors: [
                { instructorId: 'inst-2', payType: 'percentage', payRate: 45, calculatedPay: 76.5, paidAmount: 0, paymentStatus: 'unpaid', payments: [] },
            ],
            participants: [
                { name: 'Alex Brown', phone: '+1 555 1006', agentId: '', isFree: false, freeReason: '', discount: 0, discountReason: '', finalPrice: 85, paymentStatus: 'paid', payments: [{ amount: 85, method: 'online', date: today, note: '' }], sunbedId: '' },
                { name: 'Sarah Mitchell', phone: '+1 555 1004', agentId: 'agt-1', isFree: false, freeReason: '', discount: 0, discountReason: '', finalPrice: 85, paymentStatus: 'paid', payments: [{ amount: 85, method: 'card', date: today, note: '' }], sunbedId: 'sb-5' },
            ],
            maxParticipants: 8, date: today, startTime: '11:00', endTime: '12:30', zone: 'Beach Zone 3',
            pricePerPerson: 85, status: 'scheduled', notes: '',
        },
    ]);
    // Update sunbed linkedGroupLessonId references
    await SunbedRental.findByIdAndUpdate('sb-4', { linkedGroupLessonId: 'gl-1' });
    await SunbedRental.findByIdAndUpdate('sb-5', { linkedGroupLessonId: 'gl-2' });
    // Seed board rentals
    await BoardRental.create([
        { _id: 'rent-1', boardType: 'longboard', boardNumber: 'LB-07', customerName: 'Tom Kingston', customerPhone: '+1 555 1001', rentedAt: `${today}T08:00:00`, dueAt: `${today}T12:00:00`, returnedAt: null, pricePerHour: 15, totalPrice: 60, status: 'active', deposit: 50, isFree: false, freeReason: '', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [{ amount: 60, method: 'cash', date: today, note: '' }], notes: '' },
        { _id: 'rent-2', boardType: 'shortboard', boardNumber: 'SB-03', customerName: 'Lisa Roberts', customerPhone: '+1 555 1002', rentedAt: `${today}T08:30:00`, dueAt: `${today}T10:30:00`, returnedAt: null, pricePerHour: 18, totalPrice: 36, status: 'active', deposit: 50, isFree: false, freeReason: '', discount: 0, discountReason: '', paymentStatus: 'partial', payments: [{ amount: 20, method: 'card', date: today, note: 'Deposit' }], notes: '' },
        { _id: 'rent-3', boardType: 'foam', boardNumber: 'FB-12', customerName: 'Walk-in Customer', customerPhone: '+1 555 0000', rentedAt: `${today}T09:00:00`, dueAt: `${today}T11:00:00`, returnedAt: null, pricePerHour: 12, totalPrice: 24, status: 'active', deposit: 30, isFree: false, freeReason: '', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [{ amount: 24, method: 'cash', date: today, note: '' }], notes: 'Group rental' },
        { _id: 'rent-4', boardType: 'longboard', boardNumber: 'LB-02', customerName: 'Alex Brown', customerPhone: '+1 555 1006', rentedAt: `${today}T07:00:00`, dueAt: `${today}T09:00:00`, returnedAt: `${today}T08:45:00`, pricePerHour: 15, totalPrice: 30, status: 'returned', deposit: 50, isFree: false, freeReason: '', discount: 0, discountReason: '', paymentStatus: 'paid', payments: [{ amount: 30, method: 'cash', date: today, note: '' }], notes: '' },
    ]);
    // Seed agent commissions
    await AgentCommission.create([
        { _id: 'ac-1', agentId: 'agt-1', serviceType: 'lesson', serviceId: 'les-1', guestCount: 1, totalCommission: 6.5, paidAmount: 6.5, paymentStatus: 'paid', payments: [{ amount: 6.5, method: 'cash', date: today, note: '' }], date: today },
        { _id: 'ac-2', agentId: 'agt-2', serviceType: 'lesson', serviceId: 'les-3', guestCount: 1, totalCommission: 15, paidAmount: 0, paymentStatus: 'unpaid', payments: [], date: today },
        { _id: 'ac-3', agentId: 'agt-1', serviceType: 'group-lesson', serviceId: 'gl-1', guestCount: 1, totalCommission: 6.5, paidAmount: 0, paymentStatus: 'unpaid', payments: [], date: today },
        { _id: 'ac-4', agentId: 'agt-3', serviceType: 'group-lesson', serviceId: 'gl-1', guestCount: 1, totalCommission: 7.8, paidAmount: 0, paymentStatus: 'unpaid', payments: [], date: today },
    ]);
    // Seed settings
    await Settings.create({
        _id: 'settings-1',
        schoolName: 'SurfDesk Surf School',
        schoolPhone: '+1 555 0000',
        schoolEmail: 'info@surfdesk.com',
        schoolAddress: 'Bondi Beach, Sydney, Australia',
    });
    return { message: 'Database seeded successfully' };
}
// POST / - Seed database with default data
router.post('/', async (_req, res) => {
    try {
        const result = await seedDatabase();
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /reset - Same as seed (resets to defaults)
router.post('/reset', async (_req, res) => {
    try {
        const result = await seedDatabase();
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
