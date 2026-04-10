import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import { FormField, FormInput, FormTextarea, FormButton } from '../components/Modal';

export default function Settings() {
  const { state, actions } = useApp();
  const [schoolName, setSchoolName] = useState(state.schoolName);
  const [schoolPhone, setSchoolPhone] = useState(state.schoolPhone);
  const [schoolEmail, setSchoolEmail] = useState(state.schoolEmail);
  const [schoolAddress, setSchoolAddress] = useState(state.schoolAddress);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function handleSave() {
    try {
      await actions.updateSettings({ schoolName, schoolPhone, schoolEmail, schoolAddress });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error('Failed to save settings:', err); }
  }

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    try {
      await actions.resetData();
      setSchoolName('SurfDesk Surf School');
      setSchoolPhone('+1 555 0000');
      setSchoolEmail('info@surfdesk.com');
      setSchoolAddress('Bondi Beach, Sydney, Australia');
      setConfirmReset(false);
    } catch (err) { console.error('Failed to reset data:', err); }
  }

  const stats = {
    lessons: state.lessons.length,
    rentals: state.boardRentals.length,
    instructors: state.instructors.length,
    students: state.students.length,
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your surf school configuration"
      />

      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        <div className="grid grid-cols-2 gap-6 max-w-4xl">
          {/* School Info */}
          <div className="col-span-2 bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand">
                <SettingsIcon size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-lg">School Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="School Name">
                <FormInput value={schoolName} onChange={e => setSchoolName(e.target.value)} />
              </FormField>
              <FormField label="Phone">
                <FormInput value={schoolPhone} onChange={e => setSchoolPhone(e.target.value)} />
              </FormField>
              <FormField label="Email">
                <FormInput type="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)} />
              </FormField>
              <FormField label="Address">
                <FormInput value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <FormButton onClick={handleSave}>
                <span className="flex items-center gap-2"><Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}</span>
              </FormButton>
              {saved && <span className="text-xs font-bold text-green-600 dark:text-green-400">Settings saved successfully</span>}
            </div>
          </div>

          {/* Data Summary */}
          <div className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-5">
            <h3 className="font-bold text-lg">Data Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-subtle rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{stats.lessons}</span>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Lessons</span>
              </div>
              <div className="bg-surface-subtle rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{stats.rentals}</span>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Rentals</span>
              </div>
              <div className="bg-surface-subtle rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{stats.instructors}</span>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Instructors</span>
              </div>
              <div className="bg-surface-subtle rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{stats.students}</span>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Students</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-surface p-6 rounded-3xl border border-red-100 dark:border-red-500/20 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Danger Zone</h3>
            </div>
            <p className="text-sm text-text-secondary">Reset all data back to default sample data. This cannot be undone.</p>
            <FormButton variant="danger" onClick={handleReset}>
              <span className="flex items-center gap-2">
                <RotateCcw size={14} />
                {confirmReset ? 'Click again to confirm reset' : 'Reset All Data'}
              </span>
            </FormButton>
            {confirmReset && (
              <button onClick={() => setConfirmReset(false)} className="text-xs text-text-secondary font-medium">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
