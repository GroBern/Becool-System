import React, { useState } from 'react';
import { Plus, Users, Edit2, Trash2, UserCheck, UserX, Phone, Mail, DollarSign, BookOpen, ChevronDown, ChevronUp, Clock, MapPin, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import { PaymentStatusBadge, InstructorPayModal } from '../components/PaymentModal';
import { Instructor, Lesson, GroupLesson, LessonInstructor, Payment } from '../types';
import InstructorReport from '../components/InstructorReport';
import { cn } from '../lib/utils';

const emptyInstructor: Omit<Instructor, 'id'> = {
  name: '', phone: '', email: '', specialties: [], certifications: [],
  hourlyRate: 35, commissionPercent: 40,
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100',
  status: 'active', joinDate: new Date().toISOString().split('T')[0], notes: '',
};

const allSpecialties = ['Beginner', 'Intermediate', 'Advanced', 'Kids', 'Group', 'Private', 'Competition', 'SUP'];
const allCerts = ['ISA Level 1', 'ISA Level 2', 'ISA Level 3', 'First Aid', 'Lifeguard', 'Child Safety', 'Pro Surfer', 'CPR'];

const statusColors: Record<string, string> = {
  'active': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  'off-duty': 'bg-surface-dim text-text-secondary',
  'on-leave': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
};

const lessonStatusColors: Record<string, string> = {
  'scheduled': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'in-progress': 'bg-brand-light text-brand',
  'completed': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  'cancelled': 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
};

interface AssignedLesson {
  id: string;
  name: string;
  type: 'private' | 'kids' | 'group';
  date: string;
  startTime: string;
  endTime: string;
  zone: string;
  status: string;
  studentsCount: number;
  instData: LessonInstructor;
  sourceType: 'lesson' | 'group-lesson';
}

export default function Instructors() {
  const { state, actions } = useApp();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [form, setForm] = useState(emptyInstructor);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ instName: string; instData: LessonInstructor; lessonId: string; lessonIdx: number; sourceType: 'lesson' | 'group-lesson' } | null>(null);
  const [reportInstructor, setReportInstructor] = useState<Instructor | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const activeCount = state.instructors.filter(i => i.status === 'active').length;

  // Get all assigned lessons for an instructor
  function getAssignedLessons(instId: string): AssignedLesson[] {
    const results: AssignedLesson[] = [];

    state.lessons.forEach(l => {
      l.instructors.forEach(li => {
        if (li.instructorId === instId) {
          results.push({
            id: l.id, name: l.name, type: l.type, date: l.date,
            startTime: l.startTime, endTime: l.endTime, zone: l.zone,
            status: l.status, studentsCount: l.studentIds.length,
            instData: li, sourceType: 'lesson',
          });
        }
      });
    });

    state.groupLessons.forEach(g => {
      g.instructors.forEach(gi => {
        if (gi.instructorId === instId) {
          results.push({
            id: g.id, name: g.name, type: 'group', date: g.date,
            startTime: g.startTime, endTime: g.endTime, zone: g.zone,
            status: g.status, studentsCount: g.participants.length,
            instData: gi, sourceType: 'group-lesson',
          });
        }
      });
    });

    return results.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }

  function getInstructorStats(instId: string) {
    let totalCalc = 0, totalPaid = 0, lessonCount = 0;
    state.lessons.filter(l => l.date === today && l.status !== 'cancelled').forEach(l => {
      l.instructors.forEach(li => {
        if (li.instructorId === instId) { lessonCount++; totalCalc += li.calculatedPay; totalPaid += li.paidAmount; }
      });
    });
    state.groupLessons.filter(g => g.date === today && g.status !== 'cancelled').forEach(g => {
      g.instructors.forEach(gi => {
        if (gi.instructorId === instId) { lessonCount++; totalCalc += gi.calculatedPay; totalPaid += gi.paidAmount; }
      });
    });
    return { lessonCount, totalCalc, totalPaid, outstanding: totalCalc - totalPaid };
  }

  async function handleInstructorPayment(payment: Payment) {
    if (!payModal) return;
    const { lessonId, lessonIdx, sourceType } = payModal;

    try {
      if (sourceType === 'lesson') {
        const lesson = state.lessons.find(l => l.id === lessonId);
        if (!lesson) return;
        const updatedInstructors = lesson.instructors.map((li, i) => {
          if (i !== lessonIdx) return li;
          const newPayments = [...li.payments, payment];
          const newPaid = newPayments.reduce((s, p) => s + p.amount, 0);
          return {
            ...li,
            payments: newPayments,
            paidAmount: newPaid,
            paymentStatus: newPaid >= li.calculatedPay ? 'paid' as const : newPaid > 0 ? 'partial' as const : 'unpaid' as const,
          };
        });
        await actions.updateLesson(lessonId, { ...lesson, instructors: updatedInstructors });
      } else {
        const gl = state.groupLessons.find(g => g.id === lessonId);
        if (!gl) return;
        const updatedInstructors = gl.instructors.map((gi, i) => {
          if (i !== lessonIdx) return gi;
          const newPayments = [...gi.payments, payment];
          const newPaid = newPayments.reduce((s, p) => s + p.amount, 0);
          return {
            ...gi,
            payments: newPayments,
            paidAmount: newPaid,
            paymentStatus: newPaid >= gi.calculatedPay ? 'paid' as const : newPaid > 0 ? 'partial' as const : 'unpaid' as const,
          };
        });
        await actions.updateGroupLesson(lessonId, { ...gl, instructors: updatedInstructors });
      }
    } catch (err) { console.error('Failed to add instructor payment:', err); }
    setPayModal(null);
  }

  function openAdd() {
    setEditing(null); setForm(emptyInstructor); setSelectedSpecs([]); setSelectedCerts([]); setModalOpen(true);
  }

  function openEdit(inst: Instructor) {
    setEditing(inst); setForm({ ...inst }); setSelectedSpecs(inst.specialties); setSelectedCerts(inst.certifications); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name) return;
    const instructorData = { ...form, specialties: selectedSpecs, certifications: selectedCerts };
    try {
      if (editing) {
        await actions.updateInstructor(editing.id, { ...instructorData, id: editing.id });
      } else {
        await actions.addInstructor(instructorData);
      }
      setModalOpen(false);
    } catch (err) { console.error('Failed to save instructor:', err); }
  }

  async function toggleStatus(inst: Instructor) {
    try {
      await actions.updateInstructor(inst.id, { ...inst, status: inst.status === 'active' ? 'off-duty' : 'active' });
    } catch (err) { console.error('Failed to toggle status:', err); }
  }

  async function handleDelete(id: string) {
    try { await actions.deleteInstructor(id); }
    catch (err) { console.error('Failed to delete instructor:', err); }
  }

  function toggleItem(item: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(item) ? list.filter(s => s !== item) : [...list, item]);
  }

  return (
    <>
      <PageHeader
        title="Instructors"
        subtitle={`${activeCount} active out of ${state.instructors.length} total`}
        action={
          <button onClick={openAdd} className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={16} /> Add Instructor
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        <div className="grid grid-cols-2 gap-6">
          {state.instructors.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <Users size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No instructors added yet</p>
              <button onClick={openAdd} className="mt-4 text-brand font-bold text-sm">+ Add instructor</button>
            </div>
          )}
          {state.instructors.map(inst => {
            const stats = getInstructorStats(inst.id);
            const assigned = getAssignedLessons(inst.id);
            const todayAssigned = assigned.filter(a => a.date === today);
            const isExpanded = expandedId === inst.id;

            return (
              <div key={inst.id} className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img src={inst.avatar} alt={inst.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex flex-col">
                      <h3 className="font-bold">{inst.name}</h3>
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                        Since {new Date(inst.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer", statusColors[inst.status])} onClick={() => toggleStatus(inst)}>
                    {inst.status === 'active' ? 'Active' : inst.status === 'off-duty' ? 'Off Duty' : 'On Leave'}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {inst.specialties.map(s => (
                    <span key={s} className="text-[10px] font-bold bg-brand-light text-brand px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {inst.certifications.map(c => (
                    <span key={c} className="text-[10px] font-bold bg-surface-dim text-text-secondary px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Rate</span>
                    <span className="text-sm font-bold">${inst.hourlyRate}/hr</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Commission</span>
                    <span className="text-sm font-bold">{inst.commissionPercent}%</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Today</span>
                    <span className="text-sm font-bold">{stats.lessonCount} lessons</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Pay Due</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${Math.round(stats.totalCalc)}</span>
                  </div>
                </div>

                {/* Pay Summary */}
                {stats.totalCalc > 0 && (
                  <div className="bg-surface-subtle rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-text-secondary" />
                      <span className="text-xs font-bold text-text-secondary">
                        Paid: <span className="text-green-600 dark:text-green-400">${Math.round(stats.totalPaid)}</span>
                        {stats.outstanding > 0 && (
                          <> / Due: <span className="text-red-500 dark:text-red-400">${Math.round(stats.outstanding)}</span></>
                        )}
                      </span>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      stats.outstanding <= 0 ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400" :
                      stats.totalPaid > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" :
                      "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400"
                    )}>
                      {stats.outstanding <= 0 ? 'Paid' : stats.totalPaid > 0 ? 'Partial' : 'Unpaid'}
                    </span>
                  </div>
                )}

                {/* Contact */}
                <div className="flex items-center gap-3 text-text-secondary">
                  <div className="flex items-center gap-1.5 text-xs"><Phone size={12} /> {inst.phone}</div>
                  <div className="flex items-center gap-1.5 text-xs"><Mail size={12} /> {inst.email}</div>
                </div>

                {/* Assigned Lessons Toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-surface-subtle rounded-xl hover:bg-border-default transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-brand" />
                    <span className="text-xs font-bold text-text-primary">Assigned Lessons ({assigned.length})</span>
                    {todayAssigned.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand">{todayAssigned.length} today</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-text-secondary" /> : <ChevronDown size={14} className="text-text-secondary" />}
                </button>

                {/* Expanded Lessons List */}
                {isExpanded && (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {assigned.length === 0 && (
                      <p className="text-xs text-text-secondary text-center py-3">No lessons assigned</p>
                    )}
                    {assigned.map((al, idx) => {
                      // Find the instructor index in the source lesson
                      let instIdx = 0;
                      if (al.sourceType === 'lesson') {
                        const lesson = state.lessons.find(l => l.id === al.id);
                        instIdx = lesson?.instructors.findIndex(li => li.instructorId === inst.id) ?? 0;
                      } else {
                        const gl = state.groupLessons.find(g => g.id === al.id);
                        instIdx = gl?.instructors.findIndex(gi => gi.instructorId === inst.id) ?? 0;
                      }

                      return (
                        <div key={`${al.id}-${idx}`} className="flex items-center justify-between px-3 py-2.5 bg-surface rounded-xl border border-border-light">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn("w-1 h-8 rounded-full",
                              al.type === 'group' ? "bg-blue-400" : al.type === 'kids' ? "bg-sky-400" : "bg-brand"
                            )} />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold truncate">{al.name}</span>
                                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0", lessonStatusColors[al.status])}>
                                  {al.status.replace('-', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                                <span className="flex items-center gap-0.5"><Clock size={9} /> {al.startTime}-{al.endTime}</span>
                                <span className="flex items-center gap-0.5"><MapPin size={9} /> {al.zone}</span>
                                <span>{al.date === today ? 'Today' : al.date}</span>
                                <span className="capitalize">{al.type}</span>
                                <span>{al.studentsCount} {al.type === 'group' ? 'participants' : 'students'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[10px] font-bold text-text-secondary">
                                {al.instData.payType === 'percentage' ? `${al.instData.payRate}%` : `$${al.instData.payRate}`}
                              </span>
                              <span className="text-xs font-bold">${al.instData.calculatedPay.toFixed(0)}</span>
                            </div>
                            <button
                              onClick={() => setPayModal({
                                instName: inst.name,
                                instData: al.instData,
                                lessonId: al.id,
                                lessonIdx: instIdx,
                                sourceType: al.sourceType,
                              })}
                              className="shrink-0"
                            >
                              <PaymentStatusBadge status={al.instData.paymentStatus} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => navigate('/lessons')}
                        className="text-[10px] font-bold text-brand bg-brand-light px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition-all"
                      >
                        + Assign to Lesson
                      </button>
                      <button
                        onClick={() => navigate('/group-lessons')}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 px-3 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all"
                      >
                        + Assign to Group Lesson
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-border-default flex items-center justify-between">
                  <button onClick={() => toggleStatus(inst)}
                    className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all",
                      inst.status === 'active'
                        ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/15 hover:bg-red-500 hover:text-white"
                        : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/15 hover:bg-green-500 hover:text-white"
                    )}>
                    {inst.status === 'active' ? <><UserX size={10} /> Set Off Duty</> : <><UserCheck size={10} /> Set Active</>}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setReportInstructor(inst)} className="flex items-center gap-1 text-[10px] font-bold text-brand bg-brand-light px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition-all">
                      <FileText size={10} /> Report
                    </button>
                    <button onClick={() => openEdit(inst)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(inst.id)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Instructor' : 'Add Instructor'} width="max-w-2xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name">
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </FormField>
            <FormField label="Phone">
              <FormInput value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0000" />
            </FormField>
            <FormField label="Email">
              <FormInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </FormField>
            <FormField label="Status">
              <FormSelect value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                <option value="active">Active</option>
                <option value="off-duty">Off Duty</option>
                <option value="on-leave">On Leave</option>
              </FormSelect>
            </FormField>
            <FormField label="Hourly Rate ($)">
              <FormInput type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: parseInt(e.target.value) || 0 })} min={0} />
            </FormField>
            <FormField label="Default Commission (%)">
              <FormInput type="number" value={form.commissionPercent} onChange={e => setForm({ ...form, commissionPercent: parseInt(e.target.value) || 0 })} min={0} max={100} />
            </FormField>
            <FormField label="Join Date">
              <FormInput type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} />
            </FormField>
            <FormField label="Avatar URL">
              <FormInput value={form.avatar} onChange={e => setForm({ ...form, avatar: e.target.value })} placeholder="Image URL" />
            </FormField>
          </div>

          <FormField label="Specialties">
            <div className="flex flex-wrap gap-2">
              {allSpecialties.map(s => (
                <button key={s} type="button" onClick={() => toggleItem(s, selectedSpecs, setSelectedSpecs)}
                  className={cn("text-xs font-bold px-3 py-1.5 rounded-full transition-all",
                    selectedSpecs.includes(s) ? "bg-brand text-white" : "bg-surface-dim text-text-secondary hover:bg-border-default"
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Certifications">
            <div className="flex flex-wrap gap-2">
              {allCerts.map(c => (
                <button key={c} type="button" onClick={() => toggleItem(c, selectedCerts, setSelectedCerts)}
                  className={cn("text-xs font-bold px-3 py-1.5 rounded-full transition-all",
                    selectedCerts.includes(c) ? "bg-brand text-white" : "bg-surface-dim text-text-secondary hover:bg-border-default"
                  )}>
                  {c}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </FormField>

          <div className="flex justify-end gap-3 pt-4">
            <FormButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</FormButton>
            <FormButton onClick={handleSave} disabled={!form.name}>
              {editing ? 'Update Instructor' : 'Add Instructor'}
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* Instructor Payment Modal */}
      {payModal && (
        <InstructorPayModal
          open={true}
          onClose={() => setPayModal(null)}
          instructorName={payModal.instName}
          calculatedPay={payModal.instData.calculatedPay}
          paidAmount={payModal.instData.paidAmount}
          payments={payModal.instData.payments}
          onAddPayment={handleInstructorPayment}
        />
      )}

      {/* Instructor Report Modal */}
      {reportInstructor && (
        <InstructorReport
          open={true}
          onClose={() => setReportInstructor(null)}
          instructor={reportInstructor}
          lessons={state.lessons}
          groupLessons={state.groupLessons}
        />
      )}
    </>
  );
}
