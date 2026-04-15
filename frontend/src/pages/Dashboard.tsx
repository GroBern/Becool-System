import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  BookOpen,
  Sailboat,
  DollarSign,
  TrendingUp,
  Users,
  MoreHorizontal,
  ChevronRight,
  Umbrella,
  Handshake,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { cn } from '../lib/utils';
import type { Payment, PaymentStatus } from '../types';

// ── Sub-components ──────────────────────────────────────────

function SummaryBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-[10px] opacity-80 font-medium">{label}</span>
    </div>
  );
}

function SmallStatCard({
  title,
  value,
  trend,
  data,
  type,
  icon: Icon,
  barInactive,
  barActive,
}: {
  title: string;
  value: string;
  trend?: string;
  data: { name: string; value: number }[];
  type: 'bar' | 'line';
  icon: React.ElementType;
  barInactive: string;
  barActive: string;
}) {
  return (
    <div className="bg-surface p-5 rounded-3xl flex flex-col gap-4 shadow-sm border border-border-default">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-text-secondary text-xs font-medium">{title}</span>
          <div className="flex items-baseline gap-1">
            <div className="bg-surface-dim p-1.5 rounded-lg mr-2">
              <Icon size={16} className="text-text-primary" />
            </div>
            <span className="text-2xl font-bold">{value}</span>
            {trend && (
              <span className="text-[10px] font-bold text-green-500 dark:text-green-400 ml-2">
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className="w-24 h-12">
          {type === 'bar' ? (
            <BarChart width={96} height={48} data={data}>
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === data.length - 1 ? barActive : barInactive}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart width={96} height={48} data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#8B5CF6' }}
              />
            </LineChart>
          )}
        </div>
      </div>
      <div className="flex justify-between text-[8px] text-text-secondary font-bold uppercase tracking-wider">
        {data.map((d, i) => (
          <span key={i}>{d.name}</span>
        ))}
      </div>
    </div>
  );
}

function FinRow({
  color,
  label,
  value,
  valueClass,
}: {
  color: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs font-bold text-text-secondary">{label}</span>
      </div>
      <span className={`text-xs font-bold ${valueClass || ''}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'In Progress': 'bg-brand-light text-brand',
    Scheduled: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    Active: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    Completed: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  };
  return (
    <span
      className={cn(
        'text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap',
        styles[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400'
      )}
    >
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    paid: { label: 'Paid', cls: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400' },
    partial: { label: 'Partial', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
    unpaid: { label: 'Unpaid', cls: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400' },
  };
  const m = map[status];
  return (
    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap', m.cls)}>
      {m.label}
    </span>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function sumPayments(payments: Payment[]): number {
  return payments.reduce((s, p) => s + p.amount, 0);
}

function sumPaymentsByMethod(payments: Payment[], method: string): number {
  return payments.filter(p => p.method === method).reduce((s, p) => s + p.amount, 0);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ── Main Component ──────────────────────────────────────────

export default function Dashboard() {
  const { state } = useApp();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const isDark = theme === 'dark';

  // Measure the revenue chart container so we can pass explicit width to
  // Recharts (avoids ResponsiveContainer initial -1/-1 measurement warning).
  const revChartRef = useRef<HTMLDivElement | null>(null);
  const [revChartWidth, setRevChartWidth] = useState(0);
  useEffect(() => {
    const el = revChartRef.current;
    if (!el) return;
    const update = () => setRevChartWidth(el.clientWidth || 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Chart colors
  const chartBarInactive = isDark ? '#3D2F6E' : '#DDD6FE';
  const chartBarActive = '#8B5CF6';

  // ── Computed data ───────────────────────────────────────────
  const computed = useMemo(() => {
    const todayLessons = state.lessons.filter(l => l.date === today);
    const todayGroupLessons = state.groupLessons.filter(g => g.date === today);
    const todayBoardRentals = state.boardRentals.filter(r => r.rentedAt.startsWith(today));
    const todaySunbedRentals = state.sunbedRentals.filter(s => s.date === today);
    const todayCommissions = state.agentCommissions.filter(c => c.date === today);

    // Active counts
    const activeLessons = todayLessons.filter(l => l.status === 'in-progress' || l.status === 'scheduled');
    const activeGroupLessons = todayGroupLessons.filter(g => g.status === 'in-progress' || g.status === 'scheduled');
    const activeBoardRentals = todayBoardRentals.filter(r => r.status === 'active');
    const activeSunbedRentals = todaySunbedRentals.filter(s => s.status === 'active');

    const totalLessonCount = todayLessons.length + todayGroupLessons.length;
    const totalBookings = totalLessonCount + todayBoardRentals.length + todaySunbedRentals.length;

    // ── Revenue: sum all payments made today across every entity ──
    const allTodayPayments: Payment[] = [];

    // Lesson payments
    todayLessons.forEach(l => {
      l.payments.forEach(p => { if (p.date === today) allTodayPayments.push(p); });
    });
    // Group lesson participant payments
    todayGroupLessons.forEach(g => {
      g.participants.forEach(pt => {
        pt.payments.forEach(p => { if (p.date === today) allTodayPayments.push(p); });
      });
    });
    // Board rental payments
    todayBoardRentals.forEach(r => {
      r.payments.forEach(p => { if (p.date === today) allTodayPayments.push(p); });
    });
    // Sunbed rental payments
    todaySunbedRentals.forEach(s => {
      s.payments.forEach(p => { if (p.date === today) allTodayPayments.push(p); });
    });

    const totalRevenue = sumPayments(allTodayPayments);
    const cashRevenue = sumPaymentsByMethod(allTodayPayments, 'cash');
    const cardRevenue = sumPaymentsByMethod(allTodayPayments, 'card');
    const onlineRevenue = sumPaymentsByMethod(allTodayPayments, 'online');

    // Outstanding = total owed minus total paid
    const lessonOwed = todayLessons.filter(l => l.status !== 'cancelled').reduce((s, l) => s + l.totalAmount, 0);
    const groupOwed = todayGroupLessons.filter(g => g.status !== 'cancelled').reduce((s, g) => {
      return s + g.participants.reduce((ps, pt) => ps + pt.finalPrice, 0);
    }, 0);
    const boardOwed = todayBoardRentals.reduce((s, r) => s + r.totalPrice, 0);
    const sunbedOwed = todaySunbedRentals.filter(s => !s.isFree).reduce((s, sb) => s + sb.totalPrice, 0);
    const totalOwed = lessonOwed + groupOwed + boardOwed + sunbedOwed;
    const totalPaid = sumPayments([
      ...todayLessons.flatMap(l => l.payments),
      ...todayGroupLessons.flatMap(g => g.participants.flatMap(p => p.payments)),
      ...todayBoardRentals.flatMap(r => r.payments),
      ...todaySunbedRentals.flatMap(s => s.payments),
    ]);
    const outstanding = Math.max(totalOwed - totalPaid, 0);

    // ── Instructor pay summary ──
    type InstructorPayRow = {
      id: string;
      name: string;
      calculatedPay: number;
      paidAmount: number;
      paymentStatus: PaymentStatus;
    };
    const instructorPayMap = new Map<string, InstructorPayRow>();

    const processInstructors = (instructors: { instructorId: string; calculatedPay: number; paidAmount: number; paymentStatus: PaymentStatus }[]) => {
      instructors.forEach(li => {
        const inst = state.instructors.find(i => i.id === li.instructorId);
        if (!inst) return;
        const existing = instructorPayMap.get(li.instructorId);
        if (existing) {
          existing.calculatedPay += li.calculatedPay;
          existing.paidAmount += li.paidAmount;
        } else {
          instructorPayMap.set(li.instructorId, {
            id: li.instructorId,
            name: inst.name,
            calculatedPay: li.calculatedPay,
            paidAmount: li.paidAmount,
            paymentStatus: li.paymentStatus,
          });
        }
      });
    };

    todayLessons.filter(l => l.status !== 'cancelled').forEach(l => processInstructors(l.instructors));
    todayGroupLessons.filter(g => g.status !== 'cancelled').forEach(g => processInstructors(g.instructors));

    const instructorRows = Array.from(instructorPayMap.values()).map(row => ({
      ...row,
      paymentStatus: (row.paidAmount >= row.calculatedPay ? 'paid' : row.paidAmount > 0 ? 'partial' : 'unpaid') as PaymentStatus,
    }));

    // ── Agent activity ──
    const agentMap = new Map<string, { id: string; name: string; guests: number; commission: number; paid: number; status: PaymentStatus }>();
    todayCommissions.forEach(c => {
      const agent = state.agents.find(a => a.id === c.agentId);
      if (!agent) return;
      const existing = agentMap.get(c.agentId);
      if (existing) {
        existing.guests += c.guestCount;
        existing.commission += c.totalCommission;
        existing.paid += c.paidAmount;
      } else {
        agentMap.set(c.agentId, {
          id: c.agentId,
          name: agent.name,
          guests: c.guestCount,
          commission: c.totalCommission,
          paid: c.paidAmount,
          status: c.paymentStatus,
        });
      }
    });
    const agentRows = Array.from(agentMap.values()).map(row => ({
      ...row,
      status: (row.paid >= row.commission ? 'paid' : row.paid > 0 ? 'partial' : 'unpaid') as PaymentStatus,
    }));

    // ── Active services list ──
    type ServiceRow = { id: string; name: string; time: string; zone: string; instructor: string; status: string; type: string };
    const serviceRows: ServiceRow[] = [];

    activeLessons.forEach(l => {
      const instNames = l.instructors.map(li => state.instructors.find(i => i.id === li.instructorId)?.name || 'TBD').join(', ');
      serviceRows.push({
        id: l.id,
        name: l.name,
        time: `${l.startTime} - ${l.endTime}`,
        zone: l.zone,
        instructor: instNames,
        status: l.status === 'in-progress' ? 'In Progress' : 'Scheduled',
        type: l.type === 'kids' ? 'Kids' : 'Private',
      });
    });

    activeGroupLessons.forEach(g => {
      const instNames = g.instructors.map(li => state.instructors.find(i => i.id === li.instructorId)?.name || 'TBD').join(', ');
      serviceRows.push({
        id: g.id,
        name: g.name,
        time: `${g.startTime} - ${g.endTime}`,
        zone: g.zone,
        instructor: instNames,
        status: g.status === 'in-progress' ? 'In Progress' : 'Scheduled',
        type: 'Group',
      });
    });

    return {
      todayLessons,
      todayGroupLessons,
      todayBoardRentals,
      todaySunbedRentals,
      activeLessons,
      activeGroupLessons,
      activeBoardRentals,
      activeSunbedRentals,
      totalLessonCount,
      totalBookings,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      onlineRevenue,
      totalOwed,
      outstanding,
      instructorRows,
      agentRows,
      serviceRows,
    };
  }, [state, today]);

  // ── Chart data (last 7 days: random for past, real for today) ──
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = new Date().getDay();

  const lessonChartData = Array.from({ length: 7 }, (_, i) => {
    const idx = (dayOfWeek - 6 + i + 7) % 7;
    return {
      name: days[idx],
      value: i === 6
        ? computed.activeLessons.length + computed.activeGroupLessons.length
        : Math.floor(Math.random() * 10) + 2,
    };
  });

  const rentalChartData = Array.from({ length: 7 }, (_, i) => {
    const idx = (dayOfWeek - 6 + i + 7) % 7;
    return {
      name: days[idx],
      value: i === 6
        ? computed.activeBoardRentals.length + computed.activeSunbedRentals.length
        : Math.floor(Math.random() * 12) + 3,
    };
  });

  const revenueChartData = Array.from({ length: 4 }, (_, i) => ({
    name: `Wk${i + 1}`,
    value: i === 3 ? computed.totalRevenue : Math.floor(Math.random() * 3000) + 2000,
  }));

  const dailyRevData = Array.from({ length: 7 }, (_, i) => {
    const idx = (dayOfWeek - 6 + i + 7) % 7;
    return {
      name: days[idx],
      value: i === 6 ? computed.totalRevenue : Math.floor(Math.random() * 1500) + 400,
    };
  });

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <>
      <PageHeader
        title={`${getGreeting()}, Becool Surf!`}
        subtitle={`${dayName}, ${dateStr} — Here's your surf school overview`}
        action={
          <button
            onClick={() => navigate('/lessons')}
            className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus size={16} />
            New Booking
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 custom-scrollbar">
        {/* ── 1. Summary Banner ────────────────────────────────── */}
        <div className="bg-brand rounded-3xl p-4 sm:p-6 mb-6 text-white relative overflow-hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Today's Summary
              </span>
              <span className="text-2xl sm:text-3xl font-bold">Surf School Dashboard</span>
              <span className="text-xs sm:text-sm opacity-80 font-medium mt-1">{dateStr}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:gap-6">
              <SummaryBox label="Total Bookings" value={computed.totalBookings} />
              <SummaryBox label="Lessons Today" value={computed.totalLessonCount} />
              <SummaryBox label="Boards Out" value={computed.activeBoardRentals.length} />
              <SummaryBox
                label="Revenue Today"
                value={`$${computed.totalRevenue.toLocaleString()}`}
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {/* ── 2. Top Row Stats ──────────────────────────────── */}
          <SmallStatCard
            title="Active Lessons"
            value={String(computed.activeLessons.length + computed.activeGroupLessons.length)}
            trend={`${computed.totalLessonCount} total`}
            data={lessonChartData}
            type="bar"
            icon={BookOpen}
            barInactive={chartBarInactive}
            barActive={chartBarActive}
          />
          <SmallStatCard
            title="Active Rentals"
            value={String(computed.activeBoardRentals.length + computed.activeSunbedRentals.length)}
            trend={`${computed.activeBoardRentals.length} boards, ${computed.activeSunbedRentals.length} sunbeds`}
            data={rentalChartData}
            type="bar"
            icon={Sailboat}
            barInactive={chartBarInactive}
            barActive={chartBarActive}
          />
          <SmallStatCard
            title="Today's Revenue"
            value={`$${computed.totalRevenue.toLocaleString()}`}
            data={revenueChartData}
            type="line"
            icon={DollarSign}
            barInactive={chartBarInactive}
            barActive={chartBarActive}
          />

          {/* ── 3. Financial Summary Card ─────────────────────── */}
          <div className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500">
                  <DollarSign size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg">Financial Summary</h3>
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    Today's Earnings
                  </span>
                </div>
              </div>
              <MoreHorizontal size={20} className="text-text-secondary" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                ${computed.totalRevenue.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-green-500 dark:text-green-400">
                Total Income
              </span>
            </div>

            <div ref={revChartRef} className="h-24 w-full">
              {revChartWidth > 0 && (
                <BarChart width={revChartWidth} height={96} data={dailyRevData}>
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {dailyRevData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === dailyRevData.length - 1 ? chartBarActive : chartBarInactive}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </div>
            <div className="flex justify-between text-[8px] text-text-secondary font-bold uppercase tracking-wider">
              {dailyRevData.map((d, i) => (
                <span key={i}>{d.name}</span>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-3 border-t border-border-default">
              <FinRow
                color="bg-green-500"
                label="Total Income"
                value={`$${computed.totalRevenue.toLocaleString()}`}
                valueClass="text-green-600 dark:text-green-400"
              />
              <FinRow color="bg-brand" label="Cash" value={`$${computed.cashRevenue.toLocaleString()}`} />
              <FinRow color="bg-blue-500" label="Card" value={`$${computed.cardRevenue.toLocaleString()}`} />
              <FinRow color="bg-cyan-500" label="Online" value={`$${computed.onlineRevenue.toLocaleString()}`} />
              <div className="pt-2 border-t border-border-default">
                <FinRow
                  color="bg-red-500"
                  label="Outstanding"
                  value={`$${computed.outstanding.toLocaleString()}`}
                  valueClass="text-red-500 dark:text-red-400"
                />
              </div>
            </div>
          </div>

          {/* ── 4. Active Services Card ───────────────────────── */}
          <div className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand">
                  <BookOpen size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg">Active Services</h3>
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    {computed.serviceRows.length} Lessons Active
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/lessons')}
                className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {computed.serviceRows.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">
                  No active lessons right now
                </p>
              )}
              {computed.serviceRows.slice(0, 6).map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          row.status === 'In Progress' ? 'bg-green-400' : 'bg-amber-400'
                        )}
                      />
                      {row.status === 'In Progress' && (
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{row.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-dim text-text-secondary">
                          {row.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-secondary">
                        {row.time} &bull; {row.zone} &bull; {row.instructor}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </div>

          {/* ── 5. Instructor Pay Summary Card ────────────────── */}
          <div className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg">Instructor Pay</h3>
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    {computed.instructorRows.length} Instructors Today
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/instructors')}
                className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {computed.instructorRows.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">
                  No instructor pay records today
                </p>
              )}
              {computed.instructorRows.map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        row.paymentStatus === 'paid'
                          ? 'bg-green-500'
                          : row.paymentStatus === 'partial'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{row.name}</span>
                      <span className="text-[10px] text-text-secondary">
                        Owed: ${row.calculatedPay.toFixed(2)} &bull; Paid: ${row.paidAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <PaymentBadge status={row.paymentStatus} />
                </div>
              ))}
            </div>
            {computed.instructorRows.length > 0 && (
              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">
                  Total Owed:{' '}
                  <span className="text-text-primary">
                    ${computed.instructorRows.reduce((s, r) => s + r.calculatedPay, 0).toFixed(2)}
                  </span>
                </span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">
                  Paid: ${computed.instructorRows.reduce((s, r) => s + r.paidAmount, 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* ── 6. Agent Activity Card ────────────────────────── */}
          <div className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500">
                  <Handshake size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg">Agent Activity</h3>
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    {computed.agentRows.length} Agents Active
                  </span>
                </div>
              </div>
              <MoreHorizontal size={20} className="text-text-secondary" />
            </div>
            <div className="flex flex-col gap-3">
              {computed.agentRows.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">
                  No agent activity today
                </p>
              )}
              {computed.agentRows.map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        row.status === 'paid'
                          ? 'bg-green-500'
                          : row.status === 'partial'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{row.name}</span>
                      <span className="text-[10px] text-text-secondary">
                        {row.guests} guest{row.guests !== 1 ? 's' : ''} &bull; Commission: $
                        {row.commission.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <PaymentBadge status={row.status} />
                </div>
              ))}
            </div>
            {computed.agentRows.length > 0 && (
              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">
                  Total Commission:{' '}
                  <span className="text-text-primary">
                    ${computed.agentRows.reduce((s, r) => s + r.commission, 0).toFixed(2)}
                  </span>
                </span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">
                  Paid: ${computed.agentRows.reduce((s, r) => s + r.paid, 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* ── 7. Sunbed Overview Card (bonus - completes the grid) ── */}
          <div className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500">
                  <Umbrella size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg">Sunbed Rentals</h3>
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    {computed.activeSunbedRentals.length} Active
                  </span>
                </div>
              </div>
              <MoreHorizontal size={20} className="text-text-secondary" />
            </div>
            <div className="flex flex-col gap-3">
              {computed.activeSunbedRentals.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">
                  No active sunbed rentals
                </p>
              )}
              {computed.activeSunbedRentals.slice(0, 5).map(sb => (
                <div
                  key={sb.id}
                  className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-75" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">
                        Bed #{sb.bedNumber} &mdash; {sb.customerName}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {sb.startTime} - {sb.endTime}
                        {sb.isFree ? ' (Free - included)' : ` • $${sb.totalPrice}`}
                      </span>
                    </div>
                  </div>
                  {sb.isFree ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400">
                      Free
                    </span>
                  ) : (
                    <PaymentBadge status={sb.paymentStatus} />
                  )}
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-border-default flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary">
                Total Today:{' '}
                <span className="text-text-primary">{computed.todaySunbedRentals.length}</span>
              </span>
              <span className="text-xs font-bold text-text-secondary">
                Free:{' '}
                <span className="text-text-primary">
                  {computed.todaySunbedRentals.filter(s => s.isFree).length}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
