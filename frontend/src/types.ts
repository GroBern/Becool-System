// ── Common Types ──────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'online';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;       // ISO datetime
  note: string;
}

export interface LessonInstructor {
  instructorId: string;
  payType: 'percentage' | 'fixed';
  payRate: number;          // % value or fixed $
  calculatedPay: number;    // auto-calculated
  paidAmount: number;
  paymentStatus: PaymentStatus;
  payments: Payment[];
}

// ── Lesson (Private / Kids) ──────────────────────────────────

export interface Lesson {
  id: string;
  name: string;
  type: 'private' | 'kids';
  level: 'beginner' | 'intermediate' | 'advanced';
  instructors: LessonInstructor[];
  studentIds: string[];
  maxStudents: number;
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  pricePerPerson: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  agentId: string;
  isFree: boolean;
  freeReason: string;
  discount: number;          // 0-100 %
  discountReason: string;
  totalAmount: number;       // auto-calculated
  paymentStatus: PaymentStatus;
  payments: Payment[];
  includedSunbedIds: string[];
  notes: string;
}

// ── Group Lesson ─────────────────────────────────────────────

export interface GroupParticipant {
  id: string;
  name: string;
  phone: string;
  agentId: string;
  isFree: boolean;
  freeReason: string;
  discount: number;
  discountReason: string;
  finalPrice: number;
  paymentStatus: PaymentStatus;
  payments: Payment[];
  sunbedId: string;
}

export interface GroupLesson {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructors: LessonInstructor[];
  participants: GroupParticipant[];
  maxParticipants: number;
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  pricePerPerson: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes: string;
}

// ── Sunbed Rental ────────────────────────────────────────────

export interface SunbedRental {
  id: string;
  bedNumber: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
  totalPrice: number;
  isFree: boolean;
  freeReason: string;
  linkedLessonId: string;
  linkedGroupLessonId: string;
  returnedAt: string | null;
  status: 'active' | 'returned' | 'reserved';
  discount: number;
  discountReason: string;
  paymentStatus: PaymentStatus;
  payments: Payment[];
  notes: string;
}

// ── Board Rental ─────────────────────────────────────────────

export interface BoardRental {
  id: string;
  boardType: 'longboard' | 'shortboard' | 'foam' | 'sup' | 'bodyboard';
  boardNumber: string;
  customerName: string;
  customerPhone: string;
  rentedAt: string;
  dueAt: string;
  returnedAt: string | null;
  pricePerHour: number;
  totalPrice: number;
  status: 'active' | 'returned' | 'overdue';
  deposit: number;
  isFree: boolean;
  freeReason: string;
  discount: number;
  discountReason: string;
  paymentStatus: PaymentStatus;
  payments: Payment[];
  notes: string;
}

// ── Agent ────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  phone: string;
  commissionType: 'percentage' | 'fixed';
  commissionRate: number;
  status: 'active' | 'inactive';
  notes: string;
}

export interface AgentCommission {
  id: string;
  agentId: string;
  serviceType: 'lesson' | 'group-lesson';
  serviceId: string;
  guestCount: number;
  totalCommission: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  payments: Payment[];
  date: string;
}

// ── People ───────────────────────────────────────────────────

export interface Instructor {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialties: string[];
  certifications: string[];
  hourlyRate: number;
  commissionPercent: number;
  avatar: string;
  status: 'active' | 'off-duty' | 'on-leave';
  joinDate: string;
  notes: string;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  age: number;
  emergencyContact: string;
  emergencyPhone: string;
  joinDate: string;
  totalLessons: number;
  notes: string;
}

// ── Auth / User ─────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'worker';

export const ALL_TABS = [
  'dashboard',
  'lessons',
  'group-lessons',
  'rentals',
  'sunbeds',
  'schedule',
  'instructors',
  'students',
  'agents',
  'payments',
  'reports',
  'settings',
] as const;

export type TabKey = (typeof ALL_TABS)[number];

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  allowedTabs: TabKey[];
  isActive: boolean;
  createdBy: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ── Settings ────────────────────────────────────────────────

export interface Settings {
  id: string;
  schoolName: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
}

// ── Revenue ──────────────────────────────────────────────────

export interface DayRevenue {
  date: string;
  lessonIncome: number;
  rentalIncome: number;
  otherIncome: number;
  instructorPayments: number;
  expenses: number;
}

// ── App State ────────────────────────────────────────────────

export interface AppState {
  lessons: Lesson[];
  groupLessons: GroupLesson[];
  boardRentals: BoardRental[];
  sunbedRentals: SunbedRental[];
  instructors: Instructor[];
  students: Student[];
  agents: Agent[];
  agentCommissions: AgentCommission[];
  revenues: DayRevenue[];
  schoolName: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
}
