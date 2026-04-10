import React, { useState, useMemo } from 'react';
import {
  Download, Calendar, Clock, MapPin, DollarSign, BookOpen,
  Users, TrendingUp, ChevronRight, Banknote, CreditCard, Wifi,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal, { FormField, FormInput, FormButton } from './Modal';
import { PaymentStatusBadge } from './PaymentModal';
import { Instructor, Lesson, GroupLesson, LessonInstructor, Payment } from '../types';
import { cn } from '../lib/utils';

// ── Types ─────────────────────────────────────────────────────

interface LessonEntry {
  id: string;
  name: string;
  type: 'private' | 'kids' | 'group';
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  status: string;
  studentsCount: number;
  lessonRevenue: number;
  instData: LessonInstructor;
}

interface DaySummary {
  date: string;
  dayName: string;
  lessons: LessonEntry[];
  totalCalc: number;
  totalPaid: number;
  outstanding: number;
  lessonCount: number;
  totalStudents: number;
}

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getWeekEnd(d: Date): Date {
  const start = getWeekStart(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function dateToStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getDayName(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

function isInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

// ── Component ─────────────────────────────────────────────────

interface InstructorReportProps {
  open: boolean;
  onClose: () => void;
  instructor: Instructor;
  lessons: Lesson[];
  groupLessons: GroupLesson[];
}

export default function InstructorReport({ open, onClose, instructor, lessons, groupLessons }: InstructorReportProps) {
  const today = dateToStr(new Date());
  const weekStart = dateToStr(getWeekStart(new Date()));
  const weekEnd = dateToStr(getWeekEnd(new Date()));

  const [rangeType, setRangeType] = useState<'today' | 'week' | 'custom'>('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const from = rangeType === 'today' ? today : rangeType === 'week' ? weekStart : customFrom;
  const to = rangeType === 'today' ? today : rangeType === 'week' ? weekEnd : customTo;

  // ── Collect all lessons for this instructor in range ─────────

  const allEntries = useMemo((): LessonEntry[] => {
    const entries: LessonEntry[] = [];

    lessons.forEach(l => {
      if (!isInRange(l.date, from, to) || l.status === 'cancelled') return;
      l.instructors.forEach(li => {
        if (li.instructorId === instructor.id) {
          entries.push({
            id: l.id, name: l.name, type: l.type, date: l.date,
            startTime: l.startTime, endTime: l.endTime, zone: l.zone,
            status: l.status, studentsCount: l.studentIds.length,
            lessonRevenue: l.totalAmount, instData: li,
          });
        }
      });
    });

    groupLessons.forEach(g => {
      if (!isInRange(g.date, from, to) || g.status === 'cancelled') return;
      g.instructors.forEach(gi => {
        if (gi.instructorId === instructor.id) {
          const revenue = g.participants.reduce((s, p) => s + p.finalPrice, 0);
          entries.push({
            id: g.id, name: g.name, type: 'group', date: g.date,
            startTime: g.startTime, endTime: g.endTime, zone: g.zone,
            status: g.status, studentsCount: g.participants.length,
            lessonRevenue: revenue, instData: gi,
          });
        }
      });
    });

    return entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [lessons, groupLessons, instructor.id, from, to]);

  // ── Group by day ────────────────────────────────────────────

  const daySummaries = useMemo((): DaySummary[] => {
    const dayMap = new Map<string, LessonEntry[]>();
    allEntries.forEach(e => {
      const existing = dayMap.get(e.date) || [];
      existing.push(e);
      dayMap.set(e.date, existing);
    });

    return Array.from(dayMap.entries()).map(([date, dayLessons]) => {
      const totalCalc = dayLessons.reduce((s, l) => s + l.instData.calculatedPay, 0);
      const totalPaid = dayLessons.reduce((s, l) => s + l.instData.paidAmount, 0);
      return {
        date,
        dayName: getDayName(date),
        lessons: dayLessons,
        totalCalc,
        totalPaid,
        outstanding: totalCalc - totalPaid,
        lessonCount: dayLessons.length,
        totalStudents: dayLessons.reduce((s, l) => s + l.studentsCount, 0),
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [allEntries]);

  // ── Totals ──────────────────────────────────────────────────

  const totals = useMemo(() => {
    const totalCalc = allEntries.reduce((s, e) => s + e.instData.calculatedPay, 0);
    const totalPaid = allEntries.reduce((s, e) => s + e.instData.paidAmount, 0);
    const totalLessonRevenue = allEntries.reduce((s, e) => s + e.lessonRevenue, 0);
    const totalStudents = allEntries.reduce((s, e) => s + e.studentsCount, 0);

    // Payment method breakdown
    let cash = 0, card = 0, online = 0;
    allEntries.forEach(e => {
      e.instData.payments.forEach(p => {
        if (isInRange(p.date.split('T')[0], from, to)) {
          if (p.method === 'cash') cash += p.amount;
          else if (p.method === 'card') card += p.amount;
          else online += p.amount;
        }
      });
    });

    // Lesson type breakdown
    const privateCount = allEntries.filter(e => e.type === 'private').length;
    const kidsCount = allEntries.filter(e => e.type === 'kids').length;
    const groupCount = allEntries.filter(e => e.type === 'group').length;

    return {
      totalCalc, totalPaid, outstanding: totalCalc - totalPaid,
      totalLessonRevenue, totalStudents, lessonCount: allEntries.length,
      cash, card, online,
      privateCount, kidsCount, groupCount,
    };
  }, [allEntries, from, to]);

  // ── PDF Export ──────────────────────────────────────────────

  function exportPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructor Working Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(instructor.name, pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`${instructor.phone} | ${instructor.email}`, pageWidth / 2, 34, { align: 'center' });

    // Period
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const periodLabel = rangeType === 'today' ? `Date: ${formatDate(today)}` :
      rangeType === 'week' ? `Week: ${formatDate(from)} - ${formatDate(to)}` :
      `Period: ${formatDate(from)} - ${formatDate(to)}`;
    doc.text(periodLabel, pageWidth / 2, 42, { align: 'center' });

    // Summary Table
    doc.setFontSize(12);
    doc.text('Summary', 14, 52);

    autoTable(doc, {
      startY: 56,
      head: [['Metric', 'Value']],
      body: [
        ['Total Lessons', String(totals.lessonCount)],
        ['Private Lessons', String(totals.privateCount)],
        ['Kids Lessons', String(totals.kidsCount)],
        ['Group Lessons', String(totals.groupCount)],
        ['Total Students/Participants', String(totals.totalStudents)],
        ['Lesson Revenue Generated', fmt(totals.totalLessonRevenue)],
        ['Total Pay (Calculated)', fmt(totals.totalCalc)],
        ['Total Paid', fmt(totals.totalPaid)],
        ['Outstanding', fmt(totals.outstanding)],
        ['Paid via Cash', fmt(totals.cash)],
        ['Paid via Card', fmt(totals.card)],
        ['Paid via Online', fmt(totals.online)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9 },
    });

    // Day-by-day breakdown
    let currentY = (doc as any).lastAutoTable.finalY + 12;

    daySummaries.forEach(day => {
      // Check if we need a new page
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${day.dayName}, ${formatDate(day.date)}`, 14, currentY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${day.lessonCount} lessons | ${day.totalStudents} students | Pay: ${fmt(day.totalCalc)} | Paid: ${fmt(day.totalPaid)}`, 14, currentY + 5);

      autoTable(doc, {
        startY: currentY + 9,
        head: [['Time', 'Lesson', 'Type', 'Zone', 'Students', 'Status', 'Pay Type', 'Pay Rate', 'Pay Due', 'Paid', 'Method']],
        body: day.lessons.map(l => [
          `${l.startTime}-${l.endTime}`,
          l.name,
          l.type.charAt(0).toUpperCase() + l.type.slice(1),
          l.zone,
          String(l.studentsCount),
          l.status.replace('-', ' '),
          l.instData.payType === 'percentage' ? 'Percentage' : 'Fixed',
          l.instData.payType === 'percentage' ? `${l.instData.payRate}%` : fmt(l.instData.payRate),
          fmt(l.instData.calculatedPay),
          fmt(l.instData.paidAmount),
          l.instData.payments.map(p => p.method).join(', ') || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    // Payment History
    const allPayments: (Payment & { lessonName: string })[] = [];
    allEntries.forEach(e => {
      e.instData.payments.forEach(p => {
        allPayments.push({ ...p, lessonName: e.name });
      });
    });

    if (allPayments.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment History', 14, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Date', 'Lesson', 'Amount', 'Method', 'Note']],
        body: allPayments.map(p => [
          new Date(p.date).toLocaleDateString(),
          p.lessonName,
          fmt(p.amount),
          p.method.charAt(0).toUpperCase() + p.method.slice(1),
          p.note || '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 8 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    const fileName = `Instructor_Report_${instructor.name.replace(/\s+/g, '_')}_${from}_to_${to}.pdf`;
    doc.save(fileName);
  }

  // ── Render ──────────────────────────────────────────────────

  const typeColors: Record<string, string> = {
    'private': 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
    'kids': 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
    'group': 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  };

  const statusColors: Record<string, string> = {
    'scheduled': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    'in-progress': 'bg-brand-light text-brand',
    'completed': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  };

  return (
    <Modal open={open} onClose={onClose} title={`${instructor.name} — Work Report`} width="max-w-5xl">
      <div className="flex flex-col gap-6">

        {/* Date Range Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-surface-dim rounded-xl p-1">
            {(['today', 'week', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setRangeType(t)}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                  rangeType === t ? "bg-brand text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : 'Custom'}
              </button>
            ))}
          </div>
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <FormInput type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span className="text-xs text-text-secondary font-bold">to</span>
              <FormInput type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}
          <button
            onClick={exportPDF}
            className="ml-auto bg-brand text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-1.5"
          >
            <Download size={14} /> Export PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard icon={BookOpen} label="Lessons" value={String(totals.lessonCount)} sub={`${totals.privateCount}P / ${totals.kidsCount}K / ${totals.groupCount}G`} color="bg-brand" />
          <SummaryCard icon={Users} label="Students" value={String(totals.totalStudents)} sub="Total taught" color="bg-blue-500" />
          <SummaryCard icon={DollarSign} label="Total Pay" value={fmt(totals.totalCalc)} sub={`Paid: ${fmt(totals.totalPaid)}`} color="bg-green-500" />
          <SummaryCard icon={TrendingUp} label="Outstanding" value={fmt(totals.outstanding)} sub={totals.outstanding <= 0 ? 'All clear' : 'Remaining'} color={totals.outstanding > 0 ? "bg-red-500" : "bg-green-500"} />
        </div>

        {/* Payment Method Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-subtle rounded-xl p-3 flex items-center gap-3">
            <Banknote size={18} className="text-green-600 dark:text-green-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold">{fmt(totals.cash)}</span>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Cash</span>
            </div>
          </div>
          <div className="bg-surface-subtle rounded-xl p-3 flex items-center gap-3">
            <CreditCard size={18} className="text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold">{fmt(totals.card)}</span>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Card</span>
            </div>
          </div>
          <div className="bg-surface-subtle rounded-xl p-3 flex items-center gap-3">
            <Wifi size={18} className="text-purple-600 dark:text-purple-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold">{fmt(totals.online)}</span>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>

        {/* Day-by-Day Breakdown */}
        {daySummaries.length === 0 && (
          <div className="text-center py-10">
            <Calendar size={40} className="text-border-default mx-auto mb-3" />
            <p className="text-text-secondary font-medium text-sm">No lessons found in this period</p>
          </div>
        )}

        {daySummaries.map(day => (
          <div key={day.date} className="flex flex-col gap-3">
            {/* Day Header */}
            <div className="flex items-center justify-between bg-surface-subtle rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white">
                  <Calendar size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{day.dayName}</span>
                  <span className="text-[10px] text-text-secondary font-bold">{formatDate(day.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <StatPill label="Lessons" value={String(day.lessonCount)} />
                <StatPill label="Students" value={String(day.totalStudents)} />
                <StatPill label="Pay Due" value={fmt(day.totalCalc)} />
                <StatPill label="Paid" value={fmt(day.totalPaid)} green />
                {day.outstanding > 0 && (
                  <StatPill label="Due" value={fmt(day.outstanding)} red />
                )}
              </div>
            </div>

            {/* Lesson Rows */}
            <div className="flex flex-col gap-2 pl-4">
              {day.lessons.map((l, idx) => (
                <div key={`${l.id}-${idx}`} className="flex items-center justify-between px-4 py-3 bg-surface rounded-xl border border-border-light hover:border-border-default transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("w-1.5 h-10 rounded-full",
                      l.type === 'group' ? 'bg-blue-400' : l.type === 'kids' ? 'bg-sky-400' : 'bg-brand'
                    )} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{l.name}</span>
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", typeColors[l.type])}>
                          {l.type}
                        </span>
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", statusColors[l.status] || '')}>
                          {l.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-text-secondary mt-0.5">
                        <span className="flex items-center gap-0.5"><Clock size={9} /> {l.startTime} - {l.endTime}</span>
                        <span className="flex items-center gap-0.5"><MapPin size={9} /> {l.zone}</span>
                        <span className="flex items-center gap-0.5"><Users size={9} /> {l.studentsCount} {l.type === 'group' ? 'participants' : 'students'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Lesson Revenue */}
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] text-text-secondary font-bold uppercase">Lesson Rev.</span>
                      <span className="text-xs font-bold">{fmt(l.lessonRevenue)}</span>
                    </div>

                    {/* Pay Info */}
                    <div className="flex flex-col items-end gap-0.5 border-l border-border-light pl-4">
                      <span className="text-[9px] text-text-secondary font-bold uppercase">
                        {l.instData.payType === 'percentage' ? `${l.instData.payRate}%` : `Fixed $${l.instData.payRate}`}
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(l.instData.calculatedPay)}</span>
                    </div>

                    {/* Paid */}
                    <div className="flex flex-col items-end gap-0.5 border-l border-border-light pl-4">
                      <span className="text-[9px] text-text-secondary font-bold uppercase">Paid</span>
                      <span className="text-xs font-bold">{fmt(l.instData.paidAmount)}</span>
                    </div>

                    <PaymentStatusBadge status={l.instData.paymentStatus} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border-default p-4 flex items-center gap-3">
      <div className={cn("p-2.5 rounded-xl text-white", color)}>
        <Icon size={18} />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-text-secondary">{sub}</span>
      </div>
    </div>
  );
}

function StatPill({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className={cn("text-sm font-bold",
        green ? "text-green-600 dark:text-green-400" :
        red ? "text-red-500 dark:text-red-400" : ""
      )}>{value}</span>
      <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
