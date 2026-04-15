import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  DollarSign,
  BookOpen,
  Umbrella,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import { cn } from '../lib/utils';
import type {
  Payment,
  Lesson,
  GroupLesson,
  BoardRental,
  SunbedRental,
  AgentCommission,
  LessonInstructor,
} from '../types';

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

function dateOnly(iso: string): string {
  return iso.split('T')[0];
}

function inRange(dateStr: string, from: string, to: string): boolean {
  const d = dateOnly(dateStr);
  return d >= from && d <= to;
}

function getStartOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

function getEndOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString().split('T')[0];
}

function getStartOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

function getEndOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

function sumPayments(payments: Payment[], from: string, to: string): number {
  return payments
    .filter((p) => inRange(p.date, from, to))
    .reduce((sum, p) => sum + p.amount, 0);
}

function sumPaymentsByMethod(
  payments: Payment[],
  from: string,
  to: string
): { cash: number; card: number; online: number } {
  const result = { cash: 0, card: 0, online: 0 };
  for (const p of payments) {
    if (inRange(p.date, from, to)) {
      result[p.method] += p.amount;
    }
  }
  return result;
}

type QuickRange = 'today' | 'week' | 'month' | 'custom';

// ── Component ──────────────────────────────────────────────────

export default function Reports() {
  const { state } = useApp();
  const today = new Date().toISOString().split('T')[0];

  const [quickRange, setQuickRange] = useState<QuickRange>('today');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // Effective date range
  const { rangeFrom, rangeTo } = useMemo(() => {
    const now = new Date();
    switch (quickRange) {
      case 'today':
        return { rangeFrom: today, rangeTo: today };
      case 'week':
        return { rangeFrom: getStartOfWeek(now), rangeTo: getEndOfWeek(now) };
      case 'month':
        return { rangeFrom: getStartOfMonth(now), rangeTo: getEndOfMonth(now) };
      case 'custom':
        return { rangeFrom: fromDate, rangeTo: toDate };
      default:
        return { rangeFrom: today, rangeTo: today };
    }
  }, [quickRange, fromDate, toDate, today]);

  const isSingleDay = rangeFrom === rangeTo;

  // ── Filtered data ──────────────────────────────────────────

  const filteredLessons = useMemo(
    () => state.lessons.filter((l) => inRange(l.date, rangeFrom, rangeTo)),
    [state.lessons, rangeFrom, rangeTo]
  );

  const filteredGroupLessons = useMemo(
    () => state.groupLessons.filter((g) => inRange(g.date, rangeFrom, rangeTo)),
    [state.groupLessons, rangeFrom, rangeTo]
  );

  const filteredBoardRentals = useMemo(
    () => state.boardRentals.filter((r) => inRange(r.rentedAt, rangeFrom, rangeTo)),
    [state.boardRentals, rangeFrom, rangeTo]
  );

  const filteredSunbedRentals = useMemo(
    () => state.sunbedRentals.filter((s) => inRange(s.date, rangeFrom, rangeTo)),
    [state.sunbedRentals, rangeFrom, rangeTo]
  );

  const filteredCommissions = useMemo(
    () => state.agentCommissions.filter((c) => inRange(c.date, rangeFrom, rangeTo)),
    [state.agentCommissions, rangeFrom, rangeTo]
  );

  // ── Revenue calculations ───────────────────────────────────

  const calculations = useMemo(() => {
    // Collect all payments received within range
    const allPayments: Payment[] = [];

    // Lesson payments
    for (const l of filteredLessons) {
      for (const p of l.payments) {
        if (inRange(p.date, rangeFrom, rangeTo)) allPayments.push(p);
      }
      for (const inst of l.instructors) {
        for (const p of inst.payments) {
          if (inRange(p.date, rangeFrom, rangeTo)) allPayments.push({ ...p, amount: -p.amount }); // outgoing
        }
      }
    }

    // Group lesson payments (participant-level)
    for (const gl of filteredGroupLessons) {
      for (const part of gl.participants) {
        for (const p of part.payments) {
          if (inRange(p.date, rangeFrom, rangeTo)) allPayments.push(p);
        }
      }
      for (const inst of gl.instructors) {
        for (const p of inst.payments) {
          if (inRange(p.date, rangeFrom, rangeTo)) allPayments.push({ ...p, amount: -p.amount });
        }
      }
    }

    // Board rental payments
    for (const br of filteredBoardRentals) {
      for (const p of br.payments) {
        if (inRange(p.date, rangeFrom, rangeTo)) allPayments.push(p);
      }
    }

    // Sunbed rental payments
    for (const sb of filteredSunbedRentals) {
      for (const p of sb.payments) {
        if (inRange(p.date, rangeFrom, rangeTo)) allPayments.push(p);
      }
    }

    // Total revenue (income only, positive amounts)
    const incomePayments = allPayments.filter((p) => p.amount > 0);
    const totalRevenue = incomePayments.reduce((s, p) => s + p.amount, 0);

    // Lessons count
    const totalLessonsCount = filteredLessons.length + filteredGroupLessons.length;

    // Rentals count
    const totalRentalsCount = filteredBoardRentals.length + filteredSunbedRentals.length;

    // Outstanding: total amounts - paid amounts
    let totalOwed = 0;
    let totalPaid = 0;

    for (const l of filteredLessons) {
      totalOwed += l.totalAmount;
      totalPaid += sumPayments(l.payments, rangeFrom, rangeTo);
    }
    for (const gl of filteredGroupLessons) {
      for (const part of gl.participants) {
        totalOwed += part.finalPrice;
        totalPaid += sumPayments(part.payments, rangeFrom, rangeTo);
      }
    }
    for (const br of filteredBoardRentals) {
      totalOwed += br.totalPrice;
      totalPaid += sumPayments(br.payments, rangeFrom, rangeTo);
    }
    for (const sb of filteredSunbedRentals) {
      totalOwed += sb.totalPrice;
      totalPaid += sumPayments(sb.payments, rangeFrom, rangeTo);
    }

    const outstandingBalance = totalOwed - totalPaid;

    // Revenue by service
    let lessonRevenue = 0;
    let groupLessonRevenue = 0;
    let boardRentalRevenue = 0;
    let sunbedRentalRevenue = 0;

    for (const l of filteredLessons) {
      lessonRevenue += sumPayments(l.payments, rangeFrom, rangeTo);
    }
    for (const gl of filteredGroupLessons) {
      for (const part of gl.participants) {
        groupLessonRevenue += sumPayments(part.payments, rangeFrom, rangeTo);
      }
    }
    for (const br of filteredBoardRentals) {
      boardRentalRevenue += sumPayments(br.payments, rangeFrom, rangeTo);
    }
    for (const sb of filteredSunbedRentals) {
      sunbedRentalRevenue += sumPayments(sb.payments, rangeFrom, rangeTo);
    }

    // Revenue by payment method
    const byMethod = { cash: 0, card: 0, online: 0 };
    for (const l of filteredLessons) {
      const m = sumPaymentsByMethod(l.payments, rangeFrom, rangeTo);
      byMethod.cash += m.cash;
      byMethod.card += m.card;
      byMethod.online += m.online;
    }
    for (const gl of filteredGroupLessons) {
      for (const part of gl.participants) {
        const m = sumPaymentsByMethod(part.payments, rangeFrom, rangeTo);
        byMethod.cash += m.cash;
        byMethod.card += m.card;
        byMethod.online += m.online;
      }
    }
    for (const br of filteredBoardRentals) {
      const m = sumPaymentsByMethod(br.payments, rangeFrom, rangeTo);
      byMethod.cash += m.cash;
      byMethod.card += m.card;
      byMethod.online += m.online;
    }
    for (const sb of filteredSunbedRentals) {
      const m = sumPaymentsByMethod(sb.payments, rangeFrom, rangeTo);
      byMethod.cash += m.cash;
      byMethod.card += m.card;
      byMethod.online += m.online;
    }

    return {
      totalRevenue,
      totalLessonsCount,
      totalRentalsCount,
      outstandingBalance,
      lessonRevenue,
      groupLessonRevenue,
      boardRentalRevenue,
      sunbedRentalRevenue,
      byMethod,
    };
  }, [filteredLessons, filteredGroupLessons, filteredBoardRentals, filteredSunbedRentals, rangeFrom, rangeTo]);

  // ── Instructor data ────────────────────────────────────────

  interface InstructorRow {
    id: string;
    name: string;
    lessonsCount: number;
    totalCalculatedPay: number;
    totalPaid: number;
    outstanding: number;
    status: string;
  }

  const instructorRows: InstructorRow[] = useMemo(() => {
    const map = new Map<string, { lessonsCount: number; calculatedPay: number; paid: number }>();

    const processInstructors = (instructors: LessonInstructor[]) => {
      for (const inst of instructors) {
        const existing = map.get(inst.instructorId) || { lessonsCount: 0, calculatedPay: 0, paid: 0 };
        existing.lessonsCount += 1;
        existing.calculatedPay += inst.calculatedPay;
        existing.paid += inst.paidAmount;
        map.set(inst.instructorId, existing);
      }
    };

    for (const l of filteredLessons) processInstructors(l.instructors);
    for (const gl of filteredGroupLessons) processInstructors(gl.instructors);

    return Array.from(map.entries()).map(([id, data]) => {
      const instructor = state.instructors.find((i) => i.id === id);
      const outstanding = data.calculatedPay - data.paid;
      return {
        id,
        name: instructor?.name || 'Unknown',
        lessonsCount: data.lessonsCount,
        totalCalculatedPay: data.calculatedPay,
        totalPaid: data.paid,
        outstanding,
        status: outstanding <= 0 ? 'Paid' : data.paid > 0 ? 'Partial' : 'Unpaid',
      };
    });
  }, [filteredLessons, filteredGroupLessons, state.instructors]);

  // ── Agent data ─────────────────────────────────────────────

  interface AgentRow {
    id: string;
    name: string;
    guestsBrought: number;
    totalCommission: number;
    paid: number;
    outstanding: number;
    status: string;
  }

  const agentRows: AgentRow[] = useMemo(() => {
    const map = new Map<string, { guests: number; commission: number; paid: number }>();

    for (const c of filteredCommissions) {
      const existing = map.get(c.agentId) || { guests: 0, commission: 0, paid: 0 };
      existing.guests += c.guestCount;
      existing.commission += c.totalCommission;
      existing.paid += c.paidAmount;
      map.set(c.agentId, existing);
    }

    return Array.from(map.entries()).map(([id, data]) => {
      const agent = state.agents.find((a) => a.id === id);
      const outstanding = data.commission - data.paid;
      return {
        id,
        name: agent?.name || 'Unknown',
        guestsBrought: data.guests,
        totalCommission: data.commission,
        paid: data.paid,
        outstanding,
        status: outstanding <= 0 ? 'Paid' : data.paid > 0 ? 'Partial' : 'Unpaid',
      };
    });
  }, [filteredCommissions, state.agents]);

  // ── PDF Export ──────────────────────────────────────────────

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(state.schoolName, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const periodLabel = isSingleDay
      ? `Report for ${rangeFrom}`
      : `Report Period: ${rangeFrom} to ${rangeTo}`;
    doc.text(periodLabel, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Summary table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', fmt(calculations.totalRevenue)],
        ['Total Lessons', String(calculations.totalLessonsCount)],
        ['Total Rentals', String(calculations.totalRentalsCount)],
        ['Outstanding Balance', fmt(calculations.outstandingBalance)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Revenue breakdown
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue Breakdown', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount']],
      body: [
        ['Lessons (Private/Kids)', fmt(calculations.lessonRevenue)],
        ['Group Lessons', fmt(calculations.groupLessonRevenue)],
        ['Board Rentals', fmt(calculations.boardRentalRevenue)],
        ['Sunbed Rentals', fmt(calculations.sunbedRentalRevenue)],
        ['', ''],
        ['Cash', fmt(calculations.byMethod.cash)],
        ['Card', fmt(calculations.byMethod.card)],
        ['Online Transfer', fmt(calculations.byMethod.online)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Instructor payments
    if (instructorRows.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Instructor Payments', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Instructor', 'Lessons', 'Calculated Pay', 'Paid', 'Outstanding', 'Status']],
        body: instructorRows.map((r) => [
          r.name,
          String(r.lessonsCount),
          fmt(r.totalCalculatedPay),
          fmt(r.totalPaid),
          fmt(r.outstanding),
          r.status,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
      });

      y = (doc as any).lastAutoTable.finalY + 12;
    }

    // Agent commissions
    if (agentRows.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Agent Commissions', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Agent', 'Guests', 'Commission', 'Paid', 'Outstanding', 'Status']],
        body: agentRows.map((r) => [
          r.name,
          String(r.guestsBrought),
          fmt(r.totalCommission),
          fmt(r.paid),
          fmt(r.outstanding),
          r.status,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = isSingleDay
      ? `report-${rangeFrom}.pdf`
      : `report-${rangeFrom}-to-${rangeTo}.pdf`;
    doc.save(fileName);
  };

  // ── Quick range handler ────────────────────────────────────

  const handleQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    if (range !== 'custom') {
      const now = new Date();
      switch (range) {
        case 'today':
          setFromDate(today);
          setToDate(today);
          break;
        case 'week':
          setFromDate(getStartOfWeek(now));
          setToDate(getEndOfWeek(now));
          break;
        case 'month':
          setFromDate(getStartOfMonth(now));
          setToDate(getEndOfMonth(now));
          break;
      }
    }
  };

  const handleApplyCustom = () => {
    setQuickRange('custom');
  };

  // ── Render ─────────────────────────────────────────────────

  const summaryCards = [
    {
      label: 'Total Revenue',
      value: fmt(calculations.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Total Lessons',
      value: String(calculations.totalLessonsCount),
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Total Rentals',
      value: String(calculations.totalRentalsCount),
      icon: Umbrella,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Outstanding Balance',
      value: fmt(calculations.outstandingBalance),
      icon: AlertCircle,
      color: 'text-red-500 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Reports"
        subtitle="Generate comprehensive reports and export to PDF"
        action={
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Download size={16} />
            Export PDF
          </button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 space-y-8">
        {/* Date Range Selector */}
        <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-text-secondary" />
              <span className="text-sm font-semibold text-text-primary">Date Range:</span>
            </div>

            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => handleQuickRange(range)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                    quickRange === range
                      ? 'bg-brand text-white'
                      : 'bg-surface-dim text-text-secondary hover:bg-border-default'
                  )}
                >
                  {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-border-default" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setQuickRange('custom');
                }}
                className="px-3 py-2 rounded-xl border border-border-default bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <span className="text-xs text-text-secondary">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setQuickRange('custom');
                }}
                className="px-3 py-2 rounded-xl border border-border-default bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button
                onClick={handleApplyCustom}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  quickRange === 'custom'
                    ? 'bg-brand text-white'
                    : 'bg-surface-dim text-text-secondary hover:bg-border-default'
                )}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-surface border border-border-default shadow-sm rounded-3xl p-6"
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', card.bgColor)}>
                    <Icon size={22} className={card.color} />
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary font-medium">{card.label}</p>
                    <p className={cn('text-xl font-bold mt-0.5', card.color)}>{card.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-6">
          <h2 className="text-text-primary font-bold text-lg mb-6">Revenue Breakdown</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* By Service */}
            <div>
              <h3 className="text-text-primary font-semibold text-sm mb-4">By Service</h3>
              <div className="space-y-3">
                {[
                  { label: 'Lessons (Private/Kids)', amount: calculations.lessonRevenue },
                  { label: 'Group Lessons', amount: calculations.groupLessonRevenue },
                  { label: 'Board Rentals', amount: calculations.boardRentalRevenue },
                  { label: 'Sunbed Rentals', amount: calculations.sunbedRentalRevenue },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-subtle"
                  >
                    <span className="text-sm text-text-secondary">{item.label}</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {fmt(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-dim border border-border-default">
                  <span className="text-sm font-bold text-text-primary">Total</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {fmt(calculations.totalRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* By Payment Method */}
            <div>
              <h3 className="text-text-primary font-semibold text-sm mb-4">By Payment Method</h3>
              <div className="space-y-3">
                {[
                  { label: 'Cash', amount: calculations.byMethod.cash },
                  { label: 'Card', amount: calculations.byMethod.card },
                  { label: 'Online Transfer', amount: calculations.byMethod.online },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-subtle"
                  >
                    <span className="text-sm text-text-secondary">{item.label}</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {fmt(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-dim border border-border-default">
                  <span className="text-sm font-bold text-text-primary">Total</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {fmt(calculations.byMethod.cash + calculations.byMethod.card + calculations.byMethod.online)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructor Payments */}
        <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-6">
          <h2 className="text-text-primary font-bold text-lg mb-6">Instructor Payments</h2>

          {instructorRows.length === 0 ? (
            <p className="text-text-secondary text-sm">No instructor activity in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border-default">
                    <th className="pb-3 font-medium">Instructor</th>
                    <th className="pb-3 font-medium text-center">Lessons</th>
                    <th className="pb-3 font-medium text-right">Calculated Pay</th>
                    <th className="pb-3 font-medium text-right">Paid</th>
                    <th className="pb-3 font-medium text-right">Outstanding</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {instructorRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border-default/50',
                        idx % 2 === 0 ? 'bg-surface-subtle' : ''
                      )}
                    >
                      <td className="py-3 px-2 font-medium text-text-primary">{row.name}</td>
                      <td className="py-3 px-2 text-center text-text-secondary">{row.lessonsCount}</td>
                      <td className="py-3 px-2 text-right text-text-primary">{fmt(row.totalCalculatedPay)}</td>
                      <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">
                        {fmt(row.totalPaid)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-2 text-right font-semibold',
                          row.outstanding > 0
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        )}
                      >
                        {fmt(row.outstanding)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={cn(
                            'inline-block px-3 py-1 rounded-full text-xs font-semibold',
                            row.status === 'Paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : row.status === 'Partial'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Agent Commissions */}
        <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-6">
          <h2 className="text-text-primary font-bold text-lg mb-6">Agent Commissions</h2>

          {agentRows.length === 0 ? (
            <p className="text-text-secondary text-sm">No agent activity in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border-default">
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium text-center">Guests Brought</th>
                    <th className="pb-3 font-medium text-right">Total Commission</th>
                    <th className="pb-3 font-medium text-right">Paid</th>
                    <th className="pb-3 font-medium text-right">Outstanding</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border-default/50',
                        idx % 2 === 0 ? 'bg-surface-subtle' : ''
                      )}
                    >
                      <td className="py-3 px-2 font-medium text-text-primary">{row.name}</td>
                      <td className="py-3 px-2 text-center text-text-secondary">{row.guestsBrought}</td>
                      <td className="py-3 px-2 text-right text-text-primary">{fmt(row.totalCommission)}</td>
                      <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">
                        {fmt(row.paid)}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-2 text-right font-semibold',
                          row.outstanding > 0
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        )}
                      >
                        {fmt(row.outstanding)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={cn(
                            'inline-block px-3 py-1 rounded-full text-xs font-semibold',
                            row.status === 'Paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : row.status === 'Partial'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Day-End Summary (single day only) */}
        {isSingleDay && (
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-6">
            <h2 className="text-text-primary font-bold text-lg mb-6">
              Day-End Summary &mdash; {rangeFrom}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Services Overview */}
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-3">Services</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Private/Kids Lessons</span>
                    <span className="font-semibold text-text-primary">{filteredLessons.length}</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Group Lessons</span>
                    <span className="font-semibold text-text-primary">{filteredGroupLessons.length}</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Board Rentals</span>
                    <span className="font-semibold text-text-primary">{filteredBoardRentals.length}</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Sunbed Rentals</span>
                    <span className="font-semibold text-text-primary">{filteredSunbedRentals.length}</span>
                  </div>
                </div>
              </div>

              {/* Payments Received */}
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-3">Payments Received</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Cash</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {fmt(calculations.byMethod.cash)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Card</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {fmt(calculations.byMethod.card)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Online Transfer</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {fmt(calculations.byMethod.online)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-dim border border-border-default text-sm">
                    <span className="font-bold text-text-primary">Total Received</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {fmt(calculations.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outgoing Payments */}
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-3">Outgoing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Instructor Payments</span>
                    <span className="font-semibold text-text-primary">
                      {fmt(instructorRows.reduce((s, r) => s + r.totalPaid, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Agent Commissions</span>
                    <span className="font-semibold text-text-primary">
                      {fmt(agentRows.reduce((s, r) => s + r.paid, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3 rounded-lg bg-surface-subtle text-sm">
                    <span className="text-text-secondary">Outstanding (All)</span>
                    <span className="font-semibold text-red-500 dark:text-red-400">
                      {fmt(calculations.outstandingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
