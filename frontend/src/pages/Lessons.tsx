import React, { useState, useMemo } from 'react';
import {
  Plus, BookOpen, Edit2, Trash2, Play, CheckCircle, XCircle, Filter,
  DollarSign, Users, Clock, MapPin, UserPlus, X, Gift, Percent, Armchair,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import PaymentModal, { PaymentStatusBadge, InstructorPayModal } from '../components/PaymentModal';
import { Lesson, LessonInstructor, Payment, PaymentStatus } from '../types';
import { cn } from '../lib/utils';

const today = new Date().toISOString().split('T')[0];

// ── Helpers ────────────────────────────────────────────────

function calcTotalAmount(pricePerPerson: number, studentCount: number, isFree: boolean, discount: number): number {
  if (isFree) return 0;
  return pricePerPerson * studentCount * (1 - discount / 100);
}

function calcInstructorPay(inst: Omit<LessonInstructor, 'calculatedPay'>, totalAmount: number): number {
  return inst.payType === 'percentage' ? (inst.payRate / 100) * totalAmount : inst.payRate;
}

function derivePaymentStatus(paid: number, total: number): PaymentStatus {
  if (total <= 0 || paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

// ── Empty form state ───────────────────────────────────────

interface InstructorFormRow {
  instructorId: string;
  payType: 'percentage' | 'fixed';
  payRate: number;
}

interface LessonForm {
  name: string;
  type: 'private' | 'kids';
  level: 'beginner' | 'intermediate' | 'advanced';
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  maxStudents: number;
  pricePerPerson: number;
  agentId: string;
  isFree: boolean;
  freeReason: string;
  discount: number;
  discountReason: string;
  includedSunbedIds: string;
  notes: string;
}

const emptyForm: LessonForm = {
  name: '', type: 'private', level: 'beginner',
  date: today, startTime: '09:00', endTime: '10:30', zone: 'Beach Zone 1',
  maxStudents: 1, pricePerPerson: 65, agentId: '',
  isFree: false, freeReason: '', discount: 0, discountReason: '',
  includedSunbedIds: '', notes: '',
};

// ── Status / Type badge colors ─────────────────────────────

const statusColors: Record<string, string> = {
  'scheduled': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'in-progress': 'bg-brand-light text-brand',
  'completed': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  'cancelled': 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
};

const typeColors: Record<string, string> = {
  'private': 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  'kids': 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
};

// ── Component ──────────────────────────────────────────────

export default function Lessons() {
  const { state, actions } = useApp();

  // List / filter state
  const [filterDate, setFilterDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [instructorRows, setInstructorRows] = useState<InstructorFormRow[]>([]);

  // Payment modals
  const [payModalLesson, setPayModalLesson] = useState<Lesson | null>(null);
  const [instPayModal, setInstPayModal] = useState<{ lesson: Lesson; idx: number } | null>(null);

  // ── Derived data ─────────────────────────────────────────

  const filteredLessons = useMemo(() =>
    state.lessons.filter(l => {
      if (filterDate && l.date !== filterDate) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      return true;
    }),
    [state.lessons, filterDate, filterStatus],
  );

  const scheduledCount = state.lessons.filter(l => l.status === 'scheduled').length;
  const inProgressCount = state.lessons.filter(l => l.status === 'in-progress').length;

  // ── Lookup helpers ───────────────────────────────────────

  const getInstructorName = (id: string) => state.instructors.find(i => i.id === id)?.name || 'Unknown';
  const getAgentName = (id: string) => state.agents.find(a => a.id === id)?.name || '';

  // ── Modal open / close ───────────────────────────────────

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setSelectedStudents([]);
    setInstructorRows([]);
    setModalOpen(true);
  }

  function openEdit(lesson: Lesson) {
    setEditing(lesson);
    setForm({
      name: lesson.name,
      type: lesson.type,
      level: lesson.level,
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      zone: lesson.zone,
      maxStudents: lesson.maxStudents,
      pricePerPerson: lesson.pricePerPerson,
      agentId: lesson.agentId,
      isFree: lesson.isFree,
      freeReason: lesson.freeReason,
      discount: lesson.discount,
      discountReason: lesson.discountReason,
      includedSunbedIds: lesson.includedSunbedIds.join(', '),
      notes: lesson.notes,
    });
    setSelectedStudents(lesson.studentIds);
    setInstructorRows(lesson.instructors.map(i => ({
      instructorId: i.instructorId,
      payType: i.payType,
      payRate: i.payRate,
    })));
    setModalOpen(true);
  }

  // ── Save ─────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name) return;

    const totalAmount = calcTotalAmount(form.pricePerPerson, selectedStudents.length, form.isFree, form.discount);

    // Build instructor array, preserving existing payment data when editing
    const instructors: LessonInstructor[] = instructorRows
      .filter(r => r.instructorId)
      .map(r => {
        const calculatedPay = calcInstructorPay(r, totalAmount);
        const existing = editing?.instructors.find(ei => ei.instructorId === r.instructorId);
        const paidAmount = existing?.paidAmount ?? 0;
        const payments = existing?.payments ?? [];
        return {
          instructorId: r.instructorId,
          payType: r.payType,
          payRate: r.payRate,
          calculatedPay,
          paidAmount,
          paymentStatus: derivePaymentStatus(paidAmount, calculatedPay),
          payments,
        };
      });

    const paidAmount = editing
      ? editing.payments.reduce((s, p) => s + p.amount, 0)
      : 0;

    const sunbedIds = form.includedSunbedIds
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const lessonData = {
      name: form.name,
      type: form.type,
      level: form.level,
      instructors,
      studentIds: selectedStudents,
      maxStudents: form.maxStudents,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      zone: form.zone,
      pricePerPerson: form.pricePerPerson,
      status: editing?.status || 'scheduled' as const,
      agentId: form.agentId,
      isFree: form.isFree,
      freeReason: form.freeReason,
      discount: form.discount,
      discountReason: form.discountReason,
      totalAmount,
      paymentStatus: derivePaymentStatus(paidAmount, totalAmount),
      payments: editing?.payments || [],
      includedSunbedIds: sunbedIds,
      notes: form.notes,
    };

    try {
      if (editing) {
        await actions.updateLesson(editing.id, { ...lessonData, id: editing.id });
      } else {
        await actions.addLesson(lessonData);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save lesson:', err);
    }
  }

  // ── Status / Delete ─────────────────────────────────���────

  async function handleStatusChange(lesson: Lesson, newStatus: Lesson['status']) {
    try {
      await actions.updateLesson(lesson.id, { ...lesson, status: newStatus });
    } catch (err) { console.error('Failed to update status:', err); }
  }

  async function handleDelete(id: string) {
    try {
      await actions.deleteLesson(id);
    } catch (err) { console.error('Failed to delete lesson:', err); }
  }

  // ── Payment handlers ─────────────────────────────────────

  async function handleLessonPayment(payment: Payment) {
    if (!payModalLesson) return;
    const updatedPayments = [...payModalLesson.payments, payment];
    const paidAmount = updatedPayments.reduce((s, p) => s + p.amount, 0);
    const updated: Lesson = {
      ...payModalLesson,
      payments: updatedPayments,
      paymentStatus: derivePaymentStatus(paidAmount, payModalLesson.totalAmount),
    };
    try {
      const result = await actions.updateLesson(updated.id, updated);
      setPayModalLesson(result);
    } catch (err) { console.error('Failed to add payment:', err); }
  }

  async function handleInstructorPayment(payment: Payment) {
    if (!instPayModal) return;
    const { lesson, idx } = instPayModal;
    const inst = { ...lesson.instructors[idx] };
    inst.payments = [...inst.payments, payment];
    inst.paidAmount = inst.payments.reduce((s, p) => s + p.amount, 0);
    inst.paymentStatus = derivePaymentStatus(inst.paidAmount, inst.calculatedPay);

    const updatedInstructors = lesson.instructors.map((i, j) => j === idx ? inst : i);
    const updated: Lesson = { ...lesson, instructors: updatedInstructors };
    try {
      const result = await actions.updateLesson(updated.id, updated);
      setInstPayModal({ lesson: result, idx });
    } catch (err) { console.error('Failed to add instructor payment:', err); }
  }

  // ── Instructor rows in form ──────────────────────────────

  function addInstructorRow() {
    setInstructorRows(prev => [...prev, { instructorId: '', payType: 'percentage', payRate: 40 }]);
  }

  function updateInstructorRow(idx: number, patch: Partial<InstructorFormRow>) {
    setInstructorRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeInstructorRow(idx: number) {
    setInstructorRows(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Student toggle ───────────────────────────────────────

  function toggleStudent(studentId: string) {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(s => s !== studentId) : [...prev, studentId]
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Lessons"
        subtitle={`${scheduledCount} scheduled, ${inProgressCount} in progress`}
        action={
          <button
            onClick={openAdd}
            className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus size={16} /> Add Lesson
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 custom-scrollbar">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-secondary" />
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filters:</span>
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {filteredLessons.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <BookOpen size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No lessons found for this date</p>
              <button onClick={openAdd} className="mt-4 text-brand font-bold text-sm">+ Add a lesson</button>
            </div>
          )}

          {filteredLessons.map(lesson => {
            const paidAmount = lesson.payments.reduce((s, p) => s + p.amount, 0);

            return (
              <div key={lesson.id} className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl", lesson.type === 'kids' ? 'bg-sky-500' : 'bg-brand')}>
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold">{lesson.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", typeColors[lesson.type])}>
                          {lesson.type === 'private' ? 'Private' : 'Kids'}
                        </span>
                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                          {lesson.level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", statusColors[lesson.status])}>
                    {lesson.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Time</span>
                    <span className="text-sm font-bold flex items-center gap-1">
                      <Clock size={12} className="text-text-secondary" />
                      {lesson.startTime} - {lesson.endTime}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Zone</span>
                    <span className="text-sm font-bold flex items-center gap-1">
                      <MapPin size={12} className="text-text-secondary" />
                      {lesson.zone}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Price / Person</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${lesson.pricePerPerson}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Students</span>
                    <span className="text-sm font-bold flex items-center gap-1">
                      <Users size={12} className="text-text-secondary" />
                      {lesson.studentIds.length} / {lesson.maxStudents}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Total Amount</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${lesson.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Free / Discount indicators */}
                {(lesson.isFree || lesson.discount > 0) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {lesson.isFree && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400 inline-flex items-center gap-1">
                        <Gift size={10} /> FREE{lesson.freeReason ? ` — ${lesson.freeReason}` : ''}
                      </span>
                    )}
                    {lesson.discount > 0 && !lesson.isFree && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 inline-flex items-center gap-1">
                        <Percent size={10} /> {lesson.discount}% off{lesson.discountReason ? ` — ${lesson.discountReason}` : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Assigned Instructors */}
                {lesson.instructors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Instructors</span>
                    {lesson.instructors.map((inst, idx) => (
                      <button
                        key={inst.instructorId}
                        onClick={() => setInstPayModal({ lesson, idx })}
                        className="flex items-center justify-between py-2 px-3 bg-surface-subtle rounded-xl hover:bg-border-default/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{getInstructorName(inst.instructorId)}</span>
                          <span className="text-[10px] text-text-secondary">
                            {inst.payType === 'percentage' ? `${inst.payRate}%` : `$${inst.payRate}`}
                          </span>
                          <span className="text-[10px] text-text-secondary">
                            (${inst.calculatedPay.toFixed(2)})
                          </span>
                        </div>
                        <PaymentStatusBadge status={inst.paymentStatus} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Agent */}
                {lesson.agentId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Agent:</span>
                    <span className="text-xs font-bold text-brand">{getAgentName(lesson.agentId)}</span>
                  </div>
                )}

                {/* Payment status */}
                <div className="flex items-center justify-between">
                  <PaymentStatusBadge status={lesson.paymentStatus} />
                  <span className="text-xs font-medium text-text-secondary">
                    <span className="text-green-600 dark:text-green-400 font-bold">${paidAmount.toFixed(2)}</span>
                    {' / '}
                    <span className="font-bold">${lesson.totalAmount.toFixed(2)}</span>
                  </span>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border-default flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {lesson.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange(lesson, 'in-progress')}
                        className="flex items-center gap-1 text-[10px] font-bold text-brand uppercase tracking-wider bg-brand-light px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition-all"
                      >
                        <Play size={10} /> Start
                      </button>
                    )}
                    {lesson.status === 'in-progress' && (
                      <button
                        onClick={() => handleStatusChange(lesson, 'completed')}
                        className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-500/15 px-3 py-1.5 rounded-full hover:bg-green-500 hover:text-white transition-all"
                      >
                        <CheckCircle size={10} /> Complete
                      </button>
                    )}
                    {(lesson.status === 'scheduled' || lesson.status === 'in-progress') && (
                      <button
                        onClick={() => handleStatusChange(lesson, 'cancelled')}
                        className="flex items-center gap-1 text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-500/15 px-3 py-1.5 rounded-full hover:bg-red-500 hover:text-white transition-all"
                      >
                        <XCircle size={10} /> Cancel
                      </button>
                    )}
                    <button
                      onClick={() => setPayModalLesson(lesson)}
                      className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-500/15 px-3 py-1.5 rounded-full hover:bg-green-500 hover:text-white transition-all"
                    >
                      <DollarSign size={10} /> Pay
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(lesson)}
                      className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Lesson' : 'Add New Lesson'} width="max-w-2xl">
        <div className="flex flex-col gap-5">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Lesson Name">
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Private Surf - Tom" />
            </FormField>
            <FormField label="Type">
              <FormSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                <option value="private">Private</option>
                <option value="kids">Kids</option>
              </FormSelect>
            </FormField>
            <FormField label="Level">
              <FormSelect value={form.level} onChange={e => setForm({ ...form, level: e.target.value as any })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </FormSelect>
            </FormField>
            <FormField label="Date">
              <FormInput type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </FormField>
            <FormField label="Start Time">
              <FormInput type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </FormField>
            <FormField label="End Time">
              <FormInput type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </FormField>
            <FormField label="Zone">
              <FormSelect value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}>
                <option value="Beach Zone 1">Beach Zone 1</option>
                <option value="Beach Zone 2">Beach Zone 2</option>
                <option value="Beach Zone 3">Beach Zone 3</option>
                <option value="Beach Zone 4">Beach Zone 4</option>
                <option value="Open Water">Open Water</option>
              </FormSelect>
            </FormField>
            <FormField label="Max Students">
              <FormInput type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: parseInt(e.target.value) || 1 })} min={1} />
            </FormField>
            <FormField label="Price Per Person ($)">
              <FormInput type="number" value={form.pricePerPerson} onChange={e => setForm({ ...form, pricePerPerson: parseFloat(e.target.value) || 0 })} min={0} />
            </FormField>
            <FormField label="Agent">
              <FormSelect value={form.agentId} onChange={e => setForm({ ...form, agentId: e.target.value })}>
                <option value="">No Agent</option>
                {state.agents.filter(a => a.status === 'active').map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          {/* Instructor Assignment */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Assign Instructors</span>
              <button
                type="button"
                onClick={addInstructorRow}
                className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                <UserPlus size={12} /> Add Instructor
              </button>
            </div>
            {instructorRows.length === 0 && (
              <p className="text-xs text-text-secondary italic">No instructors assigned yet.</p>
            )}
            {instructorRows.map((row, idx) => (
              <div key={idx} className="flex items-end gap-2 p-3 bg-surface-subtle rounded-xl">
                <div className="flex-1">
                  <FormField label="Instructor">
                    <FormSelect
                      value={row.instructorId}
                      onChange={e => updateInstructorRow(idx, { instructorId: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {state.instructors.filter(i => i.status === 'active').map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </FormSelect>
                  </FormField>
                </div>
                <div className="w-28">
                  <FormField label="Pay Type">
                    <FormSelect
                      value={row.payType}
                      onChange={e => updateInstructorRow(idx, { payType: e.target.value as any })}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </FormSelect>
                  </FormField>
                </div>
                <div className="w-24">
                  <FormField label={row.payType === 'percentage' ? 'Rate (%)' : 'Amount ($)'}>
                    <FormInput
                      type="number"
                      value={row.payRate}
                      onChange={e => updateInstructorRow(idx, { payRate: parseFloat(e.target.value) || 0 })}
                      min={0}
                    />
                  </FormField>
                </div>
                <button
                  type="button"
                  onClick={() => removeInstructorRow(idx)}
                  className="w-8 h-8 mb-0.5 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Student Selection */}
          <FormField label="Assign Students">
            <div className="border border-border-default rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
              {state.students.length === 0 && <p className="text-xs text-text-secondary">No students registered yet</p>}
              {state.students.map(s => (
                <label key={s.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-surface-subtle px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="accent-brand"
                  />
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-[10px] text-text-secondary ml-auto capitalize">{s.level}</span>
                </label>
              ))}
            </div>
          </FormField>

          {/* Free toggle */}
          <div className="flex flex-col gap-3 p-4 bg-surface-subtle rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={e => setForm({ ...form, isFree: e.target.checked })}
                className="accent-brand w-4 h-4"
              />
              <span className="text-sm font-bold">Free Lesson</span>
            </label>
            {form.isFree && (
              <FormField label="Free Reason">
                <FormInput
                  value={form.freeReason}
                  onChange={e => setForm({ ...form, freeReason: e.target.value })}
                  placeholder="e.g. Complimentary, promo..."
                />
              </FormField>
            )}
          </div>

          {/* Discount */}
          {!form.isFree && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount (%)">
                <FormInput
                  type="number"
                  value={form.discount}
                  onChange={e => setForm({ ...form, discount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                  min={0}
                  max={100}
                />
              </FormField>
              {form.discount > 0 && (
                <FormField label="Discount Reason">
                  <FormInput
                    value={form.discountReason}
                    onChange={e => setForm({ ...form, discountReason: e.target.value })}
                    placeholder="e.g. Returning customer"
                  />
                </FormField>
              )}
            </div>
          )}

          {/* Included Sunbeds */}
          <FormField label="Included Sunbed IDs (comma separated)">
            <FormInput
              value={form.includedSunbedIds}
              onChange={e => setForm({ ...form, includedSunbedIds: e.target.value })}
              placeholder="e.g. sb-1, sb-2"
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </FormField>

          {/* Preview total */}
          <div className="bg-surface-subtle rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Estimated Total</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              ${calcTotalAmount(form.pricePerPerson, selectedStudents.length, form.isFree, form.discount).toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <FormButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</FormButton>
            <FormButton onClick={handleSave} disabled={!form.name}>
              {editing ? 'Update Lesson' : 'Create Lesson'}
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* ── Lesson Payment Modal ─────────────────────────── */}
      {payModalLesson && (
        <PaymentModal
          open={!!payModalLesson}
          onClose={() => setPayModalLesson(null)}
          title={`Payment — ${payModalLesson.name}`}
          totalAmount={payModalLesson.totalAmount}
          discount={0}
          discountReason=""
          isFree={payModalLesson.isFree}
          freeReason={payModalLesson.freeReason}
          payments={payModalLesson.payments}
          onAddPayment={handleLessonPayment}
        />
      )}

      {/* ── Instructor Pay Modal ─────────────────────────── */}
      {instPayModal && (
        <InstructorPayModal
          open={!!instPayModal}
          onClose={() => setInstPayModal(null)}
          instructorName={getInstructorName(instPayModal.lesson.instructors[instPayModal.idx].instructorId)}
          calculatedPay={instPayModal.lesson.instructors[instPayModal.idx].calculatedPay}
          paidAmount={instPayModal.lesson.instructors[instPayModal.idx].paidAmount}
          payments={instPayModal.lesson.instructors[instPayModal.idx].payments}
          onAddPayment={handleInstructorPayment}
        />
      )}
    </>
  );
}
