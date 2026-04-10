import React, { useState } from 'react';
import { Plus, GraduationCap, Edit2, Trash2, Search, Phone, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import { Student } from '../types';
import { cn } from '../lib/utils';

const emptyStudent: Omit<Student, 'id'> = {
  name: '', phone: '', email: '', level: 'beginner', age: 18,
  emergencyContact: '', emergencyPhone: '',
  joinDate: new Date().toISOString().split('T')[0], totalLessons: 0, notes: '',
};

export default function Students() {
  const { state, actions } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyStudent);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filtered = state.students.filter(s => {
    if (filterLevel !== 'all' && s.level !== filterLevel) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyStudent);
    setModalOpen(true);
  }

  function openEdit(student: Student) {
    setEditing(student);
    setForm({ ...student });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name) return;
    try {
      if (editing) {
        await actions.updateStudent(editing.id, { ...form, id: editing.id });
      } else {
        await actions.addStudent(form);
      }
      setModalOpen(false);
    } catch (err) { console.error('Failed to save student:', err); }
  }

  async function handleDelete(id: string) {
    try { await actions.deleteStudent(id); }
    catch (err) { console.error('Failed to delete student:', err); }
  }

  function getStudentLessonCount(studentId: string) {
    return state.lessons.filter(l => l.studentIds.includes(studentId)).length;
  }

  const levelColors: Record<string, string> = {
    'beginner': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    'intermediate': 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    'advanced': 'bg-brand-light text-brand',
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${state.students.length} registered students`}
        action={
          <button onClick={openAdd} className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={16} /> Add Student
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search students by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-text-secondary/50"
            />
          </div>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-3 gap-6">
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16">
              <GraduationCap size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No students found</p>
              <button onClick={openAdd} className="mt-4 text-brand font-bold text-sm">+ Add student</button>
            </div>
          )}
          {filtered.map(student => {
            const lessonCount = getStudentLessonCount(student.id);
            return (
              <div key={student.id} className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-sm">
                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-sm">{student.name}</h3>
                      <span className="text-[10px] text-text-secondary">Age {student.age}</span>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", levelColors[student.level])}>
                    {student.level.charAt(0).toUpperCase() + student.level.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Lessons</span>
                    <span className="text-sm font-bold">{lessonCount}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Since</span>
                    <span className="text-sm font-bold">{new Date(student.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-text-secondary">
                  <div className="flex items-center gap-1.5 text-xs"><Phone size={11} /> {student.phone}</div>
                  <div className="flex items-center gap-1.5 text-xs"><Mail size={11} /> {student.email}</div>
                </div>

                <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(student)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(student.id)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'} width="max-w-2xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name">
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </FormField>
            <FormField label="Age">
              <FormInput type="number" value={form.age} onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 0 })} min={4} max={99} />
            </FormField>
            <FormField label="Phone">
              <FormInput value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0000" />
            </FormField>
            <FormField label="Email">
              <FormInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </FormField>
            <FormField label="Level">
              <FormSelect value={form.level} onChange={e => setForm({ ...form, level: e.target.value as any })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </FormSelect>
            </FormField>
            <FormField label="Join Date">
              <FormInput type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} />
            </FormField>
            <FormField label="Emergency Contact">
              <FormInput value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Contact name" />
            </FormField>
            <FormField label="Emergency Phone">
              <FormInput value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="+1 555 0000" />
            </FormField>
          </div>
          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Medical conditions, preferences, etc." />
          </FormField>
          <div className="flex justify-end gap-3 pt-4">
            <FormButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</FormButton>
            <FormButton onClick={handleSave} disabled={!form.name}>
              {editing ? 'Update Student' : 'Add Student'}
            </FormButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
