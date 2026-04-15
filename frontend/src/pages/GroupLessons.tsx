import React, { useState } from 'react';
import {
  Plus, Users, Edit2, Trash2, Play, CheckCircle, XCircle, Filter,
  UserPlus, Phone, DollarSign, Percent, Tag, X, Gift, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import PaymentModal, { PaymentStatusBadge, InstructorPayModal } from '../components/PaymentModal';
import { GroupLesson, GroupParticipant, LessonInstructor, Payment, PaymentStatus } from '../types';
import { cn } from '../lib/utils';

// ── Helpers ────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];

function calcPaymentStatus(payments: Payment[], totalAmount: number): PaymentStatus {
  if (totalAmount <= 0) return 'paid';
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid <= 0) return 'unpaid';
  if (paid >= totalAmount) return 'paid';
  return 'partial';
}

function calcInstructorPay(inst: LessonInstructor, totalRevenue: number): number {
  return inst.payType === 'percentage'
    ? Math.round((inst.payRate / 100) * totalRevenue * 100) / 100
    : inst.payRate;
}

// ── Empty form templates ───────────────────────────────────────

interface LessonFormData {
  name: string;
  level: GroupLesson['level'];
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  maxParticipants: number;
  pricePerPerson: number;
  notes: string;
}

interface InstructorFormRow {
  instructorId: string;
  payType: 'percentage' | 'fixed';
  payRate: number;
}

const emptyForm: LessonFormData = {
  name: '',
  level: 'beginner',
  date: today,
  startTime: '09:00',
  endTime: '10:30',
  zone: 'Beach Zone 1',
  maxParticipants: 10,
  pricePerPerson: 65,
  notes: '',
};

const emptyParticipant = {
  name: '',
  phone: '',
  agentId: '',
  isFree: false,
  freeReason: '',
  discount: 0,
  discountReason: '',
  sunbedId: '',
};

// ── Status colors ──────────────────────────────────────────────

const statusColors: Record<string, string> = {
  scheduled: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'in-progress': 'bg-brand-light text-brand',
  completed: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  cancelled: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
};

const levelColors: Record<string, string> = {
  beginner: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  intermediate: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  advanced: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
};

// ── Main Component ─────────────────────────────────────────────

export default function GroupLessons() {
  const { state, actions } = useApp();

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState(today);

  // Add/Edit lesson modal
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<GroupLesson | null>(null);
  const [form, setForm] = useState<LessonFormData>(emptyForm);
  const [instructorRows, setInstructorRows] = useState<InstructorFormRow[]>([]);

  // Manage Participants modal
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<GroupLesson | null>(null);
  const [newParticipant, setNewParticipant] = useState(emptyParticipant);

  // Payment modals
  const [paymentModal, setPaymentModal] = useState<{ participant: GroupParticipant; lessonId: string } | null>(null);
  const [instructorPayModal, setInstructorPayModal] = useState<{ instructor: LessonInstructor; lessonId: string } | null>(null);

  // ── Filtered data ──────────────────────────────────────────

  const filteredLessons = state.groupLessons.filter(gl => {
    if (filterDate && gl.date !== filterDate) return false;
    if (filterStatus !== 'all' && gl.status !== filterStatus) return false;
    return true;
  });

  // ── Lookup helpers ─────────────────────────────────────────

  const getInstructorName = (id: string) =>
    state.instructors.find(i => i.id === id)?.name || 'Unknown';

  const getAgentName = (id: string) =>
    state.agents.find(a => a.id === id)?.name || '';

  // ── Lesson CRUD ────────────────────────────────────────────

  function openAddLesson() {
    setEditingLesson(null);
    setForm(emptyForm);
    setInstructorRows([]);
    setLessonModalOpen(true);
  }

  function openEditLesson(gl: GroupLesson) {
    setEditingLesson(gl);
    setForm({
      name: gl.name,
      level: gl.level,
      date: gl.date,
      startTime: gl.startTime,
      endTime: gl.endTime,
      zone: gl.zone,
      maxParticipants: gl.maxParticipants,
      pricePerPerson: gl.pricePerPerson,
      notes: gl.notes,
    });
    setInstructorRows(
      gl.instructors.map(inst => ({
        instructorId: inst.instructorId,
        payType: inst.payType,
        payRate: inst.payRate,
      })),
    );
    setLessonModalOpen(true);
  }

  async function handleSaveLesson() {
    if (!form.name) return;

    // Build instructor list, preserving existing payment data when editing
    const instructors: LessonInstructor[] = instructorRows
      .filter(r => r.instructorId)
      .map(r => {
        const existing = editingLesson?.instructors.find(
          ei => ei.instructorId === r.instructorId,
        );
        return {
          instructorId: r.instructorId,
          payType: r.payType,
          payRate: r.payRate,
          calculatedPay: 0, // will be recalculated
          paidAmount: existing?.paidAmount || 0,
          paymentStatus: existing?.paymentStatus || 'unpaid' as PaymentStatus,
          payments: existing?.payments || [],
        };
      });

    const participants = editingLesson?.participants || [];
    const totalRevenue = participants.reduce((s, p) => s + p.finalPrice, 0);
    const recalcInstructors = instructors.map(inst => ({
      ...inst,
      calculatedPay: calcInstructorPay(inst, totalRevenue),
      paymentStatus: calcPaymentStatus(inst.payments, calcInstructorPay(inst, totalRevenue)),
    }));

    const lessonData = {
      name: form.name,
      level: form.level,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      zone: form.zone,
      maxParticipants: form.maxParticipants,
      pricePerPerson: form.pricePerPerson,
      status: editingLesson?.status || 'scheduled' as const,
      participants,
      instructors: recalcInstructors,
      notes: form.notes,
    };

    try {
      if (editingLesson) {
        await actions.updateGroupLesson(editingLesson.id, { ...lessonData, id: editingLesson.id });
      } else {
        await actions.addGroupLesson(lessonData);
      }
      setLessonModalOpen(false);
    } catch (err) { console.error('Failed to save group lesson:', err); }
  }

  async function handleDeleteLesson(id: string) {
    try { await actions.deleteGroupLesson(id); }
    catch (err) { console.error('Failed to delete group lesson:', err); }
  }

  async function handleStatusChange(gl: GroupLesson, newStatus: GroupLesson['status']) {
    try { await actions.updateGroupLesson(gl.id, { ...gl, status: newStatus }); }
    catch (err) { console.error('Failed to update status:', err); }
  }

  // ── Instructor rows in form ────────────────────────────────

  function addInstructorRow() {
    setInstructorRows(prev => [...prev, { instructorId: '', payType: 'percentage', payRate: 30 }]);
  }

  function updateInstructorRow(idx: number, patch: Partial<InstructorFormRow>) {
    setInstructorRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeInstructorRow(idx: number) {
    setInstructorRows(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Manage Participants ────────────────────────────────────

  function openParticipants(gl: GroupLesson) {
    setActiveLesson(gl);
    setNewParticipant(emptyParticipant);
    setParticipantsModalOpen(true);
  }

  async function addParticipant() {
    if (!activeLesson || !newParticipant.name) return;

    const finalPrice = newParticipant.isFree
      ? 0
      : Math.round(activeLesson.pricePerPerson * (1 - newParticipant.discount / 100) * 100) / 100;

    const participant: Omit<GroupParticipant, 'id'> & { id?: string } = {
      name: newParticipant.name,
      phone: newParticipant.phone,
      agentId: newParticipant.agentId,
      isFree: newParticipant.isFree,
      freeReason: newParticipant.freeReason,
      discount: newParticipant.discount,
      discountReason: newParticipant.discountReason,
      finalPrice,
      paymentStatus: finalPrice <= 0 ? 'paid' : 'unpaid',
      payments: [],
      sunbedId: newParticipant.sunbedId,
    };

    const updated: GroupLesson = {
      ...activeLesson,
      participants: [...activeLesson.participants, participant as GroupParticipant],
    };

    // Recalculate instructor pay
    const totalRevenue = updated.participants.reduce((s, p) => s + p.finalPrice, 0);
    updated.instructors = updated.instructors.map(inst => {
      const calc = calcInstructorPay(inst, totalRevenue);
      return {
        ...inst,
        calculatedPay: calc,
        paymentStatus: calcPaymentStatus(inst.payments, calc),
      };
    });

    try {
      const result = await actions.updateGroupLesson(activeLesson.id, updated);
      setActiveLesson(result);
      setNewParticipant(emptyParticipant);
    } catch (err) { console.error('Failed to add participant:', err); }
  }

  async function removeParticipant(participantId: string) {
    if (!activeLesson) return;

    const updated: GroupLesson = {
      ...activeLesson,
      participants: activeLesson.participants.filter(p => p.id !== participantId),
    };

    const totalRevenue = updated.participants.reduce((s, p) => s + p.finalPrice, 0);
    updated.instructors = updated.instructors.map(inst => {
      const calc = calcInstructorPay(inst, totalRevenue);
      return {
        ...inst,
        calculatedPay: calc,
        paymentStatus: calcPaymentStatus(inst.payments, calc),
      };
    });

    try {
      const result = await actions.updateGroupLesson(activeLesson.id, updated);
      setActiveLesson(result);
    } catch (err) { console.error('Failed to remove participant:', err); }
  }

  // ── Participant Payment ────────────────────────────────────

  async function handleParticipantPayment(payment: Payment) {
    if (!paymentModal || !activeLesson) return;
    const { participant, lessonId } = paymentModal;

    const gl = activeLesson.id === lessonId ? activeLesson : state.groupLessons.find(g => g.id === lessonId);
    if (!gl) return;

    const updatedParticipants = gl.participants.map(p => {
      if (p.id !== participant.id) return p;
      const newPayments = [...p.payments, payment];
      return {
        ...p,
        payments: newPayments,
        paymentStatus: calcPaymentStatus(newPayments, p.finalPrice),
      };
    });

    const updated: GroupLesson = { ...gl, participants: updatedParticipants };

    // Recalc instructor pay
    const totalRevenue = updated.participants.reduce((s, p) => s + p.finalPrice, 0);
    updated.instructors = updated.instructors.map(inst => {
      const calc = calcInstructorPay(inst, totalRevenue);
      return {
        ...inst,
        calculatedPay: calc,
        paymentStatus: calcPaymentStatus(inst.payments, calc),
      };
    });

    try {
      const result = await actions.updateGroupLesson(gl.id, updated);
      setActiveLesson(result);
      const updatedP = result.participants.find(p => p.id === participant.id);
      if (updatedP) {
        setPaymentModal({ participant: updatedP, lessonId });
      }
    } catch (err) { console.error('Failed to add payment:', err); }
  }

  // ── Instructor Payment ─────────────────────────────────────

  async function handleInstructorPayment(payment: Payment) {
    if (!instructorPayModal) return;
    const { instructor, lessonId } = instructorPayModal;

    const gl = state.groupLessons.find(g => g.id === lessonId);
    if (!gl) return;

    const updatedInstructors = gl.instructors.map(inst => {
      if (inst.instructorId !== instructor.instructorId) return inst;
      const newPayments = [...inst.payments, payment];
      const newPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      return {
        ...inst,
        payments: newPayments,
        paidAmount: newPaid,
        paymentStatus: calcPaymentStatus(newPayments, inst.calculatedPay),
      };
    });

    const updated: GroupLesson = { ...gl, instructors: updatedInstructors };
    try {
      const result = await actions.updateGroupLesson(gl.id, updated);
      if (activeLesson?.id === lessonId) {
        setActiveLesson(result);
      }
      // Update instructor pay modal
      const updatedInst = result.instructors.find(i => i.instructorId === instructor.instructorId);
      if (updatedInst) {
        setInstructorPayModal({ instructor: updatedInst, lessonId });
      }
    } catch (err) { console.error('Failed to add instructor payment:', err); }
  }

  // ── Revenue helpers ────────────────────────────────────────

  function getLessonRevenue(gl: GroupLesson) {
    const totalExpected = gl.participants.reduce((s, p) => s + p.finalPrice, 0);
    const totalCollected = gl.participants.reduce(
      (s, p) => s + p.payments.reduce((ps, py) => ps + py.amount, 0),
      0,
    );
    return { totalExpected, totalCollected };
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Group Lessons"
        subtitle={`${filteredLessons.length} group lesson${filteredLessons.length !== 1 ? 's' : ''} found`}
        action={
          <button
            onClick={openAddLesson}
            className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus size={16} /> New Group Lesson
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
              <Users size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No group lessons found for this date</p>
              <button onClick={openAddLesson} className="mt-4 text-brand font-bold text-sm">
                + Add a group lesson
              </button>
            </div>
          )}

          {filteredLessons.map(gl => {
            const { totalExpected, totalCollected } = getLessonRevenue(gl);
            return (
              <div
                key={gl.id}
                className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand">
                      <Users size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold">{gl.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize',
                            levelColors[gl.level],
                          )}
                        >
                          {gl.level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2.5 py-1 rounded-full',
                      statusColors[gl.status],
                    )}
                  >
                    {gl.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Time</span>
                    <span className="text-sm font-bold">
                      {gl.startTime} - {gl.endTime}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Zone</span>
                    <span className="text-sm font-bold">{gl.zone}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                      Price / Person
                    </span>
                    <span className="text-sm font-bold">${gl.pricePerPerson}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                      Participants
                    </span>
                    <span className="text-sm font-bold">
                      {gl.participants.length} / {gl.maxParticipants}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Revenue</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      ${totalCollected.toFixed(2)}{' '}
                      <span className="text-text-secondary font-medium">/ ${totalExpected.toFixed(2)}</span>
                    </span>
                  </div>
                </div>

                {/* Instructors */}
                {gl.instructors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                      Instructors
                    </span>
                    {gl.instructors.map(inst => (
                      <button
                        key={inst.instructorId}
                        onClick={() => setInstructorPayModal({ instructor: inst, lessonId: gl.id })}
                        className="flex items-center justify-between py-2 px-3 bg-surface-subtle rounded-xl hover:bg-surface-dim transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{getInstructorName(inst.instructorId)}</span>
                          <span className="text-[10px] text-text-secondary">
                            {inst.payType === 'percentage' ? `${inst.payRate}%` : `$${inst.payRate}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            ${inst.calculatedPay.toFixed(2)}
                          </span>
                          <PaymentStatusBadge status={inst.paymentStatus} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-border-default flex items-center justify-between">
                  <div className="flex gap-2">
                    {gl.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange(gl, 'in-progress')}
                        className="flex items-center gap-1 text-[10px] font-bold text-brand uppercase tracking-wider bg-brand-light px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition-all"
                      >
                        <Play size={10} /> Start
                      </button>
                    )}
                    {gl.status === 'in-progress' && (
                      <button
                        onClick={() => handleStatusChange(gl, 'completed')}
                        className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-500/15 px-3 py-1.5 rounded-full hover:bg-green-500 hover:text-white transition-all"
                      >
                        <CheckCircle size={10} /> Complete
                      </button>
                    )}
                    {(gl.status === 'scheduled' || gl.status === 'in-progress') && (
                      <button
                        onClick={() => handleStatusChange(gl, 'cancelled')}
                        className="flex items-center gap-1 text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-500/15 px-3 py-1.5 rounded-full hover:bg-red-500 hover:text-white transition-all"
                      >
                        <XCircle size={10} /> Cancel
                      </button>
                    )}
                    <button
                      onClick={() => openParticipants(gl)}
                      className="flex items-center gap-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider bg-surface-dim px-3 py-1.5 rounded-full hover:bg-border-default transition-all"
                    >
                      <UserPlus size={10} /> Participants
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditLesson(gl)}
                      className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(gl.id)}
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

      {/* ── Add/Edit Group Lesson Modal ───────────────────────── */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={editingLesson ? 'Edit Group Lesson' : 'New Group Lesson'}
        width="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Lesson Name">
              <FormInput
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Morning Surf Group"
              />
            </FormField>
            <FormField label="Level">
              <FormSelect
                value={form.level}
                onChange={e => setForm({ ...form, level: e.target.value as GroupLesson['level'] })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </FormSelect>
            </FormField>
            <FormField label="Date">
              <FormInput
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
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
            <FormField label="Start Time">
              <FormInput
                type="time"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
              />
            </FormField>
            <FormField label="End Time">
              <FormInput
                type="time"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
              />
            </FormField>
            <FormField label="Max Participants">
              <FormInput
                type="number"
                value={form.maxParticipants}
                onChange={e => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </FormField>
            <FormField label="Price Per Person ($)">
              <FormInput
                type="number"
                value={form.pricePerPerson}
                onChange={e => setForm({ ...form, pricePerPerson: parseFloat(e.target.value) || 0 })}
                min={0}
              />
            </FormField>
          </div>

          {/* Instructors */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Instructors
              </span>
              <button
                onClick={addInstructorRow}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Instructor
              </button>
            </div>
            {instructorRows.map((row, idx) => (
              <div key={idx} className="flex items-end gap-3 bg-surface-subtle rounded-xl p-3">
                <div className="flex-1">
                  <FormField label="Instructor">
                    <FormSelect
                      value={row.instructorId}
                      onChange={e => updateInstructorRow(idx, { instructorId: e.target.value })}
                    >
                      <option value="">Select Instructor</option>
                      {state.instructors
                        .filter(i => i.status === 'active')
                        .map(i => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </FormSelect>
                  </FormField>
                </div>
                <div className="w-32">
                  <FormField label="Pay Type">
                    <FormSelect
                      value={row.payType}
                      onChange={e =>
                        updateInstructorRow(idx, {
                          payType: e.target.value as 'percentage' | 'fixed',
                        })
                      }
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
                  onClick={() => removeInstructorRow(idx)}
                  className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-100 dark:hover:bg-red-500/25 mb-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {instructorRows.length === 0 && (
              <p className="text-xs text-text-secondary italic">No instructors assigned yet</p>
            )}
          </div>

          <FormField label="Notes">
            <FormTextarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4">
            <FormButton variant="secondary" onClick={() => setLessonModalOpen(false)}>
              Cancel
            </FormButton>
            <FormButton onClick={handleSaveLesson} disabled={!form.name}>
              {editingLesson ? 'Update Lesson' : 'Create Lesson'}
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* ── Manage Participants Modal ─────────────────────────── */}
      <Modal
        open={participantsModalOpen}
        onClose={() => setParticipantsModalOpen(false)}
        title={activeLesson ? `Participants - ${activeLesson.name}` : 'Participants'}
        width="max-w-4xl"
      >
        {activeLesson && (
          <div className="flex flex-col gap-5">
            {/* Summary bar */}
            <div className="flex items-center gap-4 bg-surface-subtle rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <span className="text-sm font-bold">
                  {activeLesson.participants.length} / {activeLesson.maxParticipants} participants
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <DollarSign size={14} className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  ${activeLesson.participants
                    .reduce((s, p) => s + p.payments.reduce((ps, py) => ps + py.amount, 0), 0)
                    .toFixed(2)}
                </span>
                <span className="text-xs text-text-secondary">
                  / ${activeLesson.participants.reduce((s, p) => s + p.finalPrice, 0).toFixed(2)} expected
                </span>
              </div>
            </div>

            {/* Participant List */}
            {activeLesson.participants.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Current Participants
                </span>
                {activeLesson.participants.map(p => {
                  const agentName = getAgentName(p.agentId);
                  const paidAmount = p.payments.reduce((s, py) => s + py.amount, 0);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 py-3 px-4 bg-surface-subtle rounded-xl"
                    >
                      {/* Name & Phone */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold truncate">{p.name}</span>
                        {p.phone && (
                          <span className="text-[10px] text-text-secondary flex items-center gap-1">
                            <Phone size={8} /> {p.phone}
                          </span>
                        )}
                      </div>

                      {/* Agent */}
                      {agentName && (
                        <span className="text-[10px] font-bold text-text-secondary bg-surface-dim px-2 py-0.5 rounded-full">
                          {agentName}
                        </span>
                      )}

                      {/* Free / Discount info */}
                      {p.isFree && (
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Gift size={8} /> Free
                        </span>
                      )}
                      {!p.isFree && p.discount > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tag size={8} /> {p.discount}% off
                        </span>
                      )}

                      {/* Price */}
                      <span className="text-sm font-bold w-16 text-right">
                        ${p.finalPrice.toFixed(2)}
                      </span>

                      {/* Payment Status */}
                      <PaymentStatusBadge status={p.paymentStatus} />

                      {/* Pay button */}
                      {p.paymentStatus !== 'paid' && !p.isFree && (
                        <button
                          onClick={() =>
                            setPaymentModal({ participant: p, lessonId: activeLesson.id })
                          }
                          className="text-[10px] font-bold text-brand bg-brand-light px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition-all"
                        >
                          Pay
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="w-7 h-7 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={32} className="text-border-default mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No participants yet</p>
              </div>
            )}

            {/* Add Participant Form */}
            {activeLesson.participants.length < activeLesson.maxParticipants && (
              <div className="flex flex-col gap-3 pt-4 border-t border-border-default">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Add Participant
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Name">
                    <FormInput
                      value={newParticipant.name}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, name: e.target.value })
                      }
                      placeholder="Participant name"
                    />
                  </FormField>
                  <FormField label="Phone">
                    <FormInput
                      value={newParticipant.phone}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, phone: e.target.value })
                      }
                      placeholder="+1 555 0000"
                    />
                  </FormField>
                  <FormField label="Agent">
                    <FormSelect
                      value={newParticipant.agentId}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, agentId: e.target.value })
                      }
                    >
                      <option value="">No Agent</option>
                      {state.agents
                        .filter(a => a.status === 'active')
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </FormSelect>
                  </FormField>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <FormField label="Free Lesson">
                    <div className="flex items-center gap-2 h-[42px]">
                      <input
                        type="checkbox"
                        checked={newParticipant.isFree}
                        onChange={e =>
                          setNewParticipant({ ...newParticipant, isFree: e.target.checked })
                        }
                        className="accent-brand w-4 h-4"
                      />
                      <span className="text-sm font-medium">Free</span>
                    </div>
                  </FormField>
                  {newParticipant.isFree && (
                    <FormField label="Free Reason">
                      <FormInput
                        value={newParticipant.freeReason}
                        onChange={e =>
                          setNewParticipant({ ...newParticipant, freeReason: e.target.value })
                        }
                        placeholder="Reason..."
                      />
                    </FormField>
                  )}
                  {!newParticipant.isFree && (
                    <>
                      <FormField label="Discount (%)">
                        <FormInput
                          type="number"
                          value={newParticipant.discount}
                          onChange={e =>
                            setNewParticipant({
                              ...newParticipant,
                              discount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                            })
                          }
                          min={0}
                          max={100}
                        />
                      </FormField>
                      {newParticipant.discount > 0 && (
                        <FormField label="Discount Reason">
                          <FormInput
                            value={newParticipant.discountReason}
                            onChange={e =>
                              setNewParticipant({
                                ...newParticipant,
                                discountReason: e.target.value,
                              })
                            }
                            placeholder="Reason..."
                          />
                        </FormField>
                      )}
                    </>
                  )}
                  <FormField label="Sunbed ID">
                    <FormInput
                      value={newParticipant.sunbedId}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, sunbedId: e.target.value })
                      }
                      placeholder="e.g. sb-1"
                    />
                  </FormField>
                </div>

                {/* Preview price */}
                <div className="flex items-center gap-3 bg-surface-dim rounded-xl px-4 py-2">
                  <span className="text-xs text-text-secondary font-bold">Calculated Price:</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    $
                    {newParticipant.isFree
                      ? '0.00'
                      : (
                          activeLesson.pricePerPerson *
                          (1 - newParticipant.discount / 100)
                        ).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3">
                  <FormButton onClick={addParticipant} disabled={!newParticipant.name}>
                    <span className="flex items-center gap-1">
                      <UserPlus size={14} /> Add Participant
                    </span>
                  </FormButton>
                </div>
              </div>
            )}

            {activeLesson.participants.length >= activeLesson.maxParticipants && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 rounded-xl p-3">
                <Clock size={16} />
                <span className="text-sm font-bold">Group is full ({activeLesson.maxParticipants} max)</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Participant Payment Modal ─────────────────────────── */}
      {paymentModal && (
        <PaymentModal
          open={true}
          onClose={() => setPaymentModal(null)}
          title={`Payment - ${paymentModal.participant.name}`}
          totalAmount={paymentModal.participant.finalPrice}
          discount={0}
          discountReason=""
          isFree={paymentModal.participant.isFree}
          freeReason={paymentModal.participant.freeReason}
          payments={paymentModal.participant.payments}
          onAddPayment={handleParticipantPayment}
        />
      )}

      {/* ── Instructor Pay Modal ──────────────────────────────── */}
      {instructorPayModal && (
        <InstructorPayModal
          open={true}
          onClose={() => setInstructorPayModal(null)}
          instructorName={getInstructorName(instructorPayModal.instructor.instructorId)}
          calculatedPay={instructorPayModal.instructor.calculatedPay}
          paidAmount={instructorPayModal.instructor.paidAmount}
          payments={instructorPayModal.instructor.payments}
          onAddPayment={handleInstructorPayment}
        />
      )}
    </>
  );
}
