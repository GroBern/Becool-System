import React, { useState } from 'react';
import { Plus, Armchair, Edit2, Trash2, RotateCcw, Filter, Clock, Gift, Percent, DollarSign, BookOpen, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import PaymentModal, { PaymentStatusBadge } from '../components/PaymentModal';
import { SunbedRental, Payment, PaymentStatus } from '../types';
import { cn } from '../lib/utils';

const today = new Date().toISOString().split('T')[0];

const emptyRental: Omit<SunbedRental, 'id'> = {
  bedNumber: '', customerName: '', customerPhone: '',
  date: today, startTime: new Date().toTimeString().slice(0, 5),
  endTime: `${String(new Date().getHours() + 2).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  pricePerHour: 5, totalPrice: 10, isFree: false, freeReason: '',
  linkedLessonId: '', linkedGroupLessonId: '', returnedAt: null, status: 'active',
  discount: 0, discountReason: '', paymentStatus: 'unpaid', payments: [], notes: '',
};

function calcTotalPrice(startTime: string, endTime: string, pricePerHour: number, isFree: boolean, discount: number): number {
  if (isFree) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const hours = Math.max(1, Math.ceil(((eh * 60 + em) - (sh * 60 + sm)) / 60));
  const base = hours * pricePerHour;
  return Math.round(base * (1 - discount / 100) * 100) / 100;
}

function calcPaymentStatus(payments: Payment[], totalAmount: number, isFree: boolean): PaymentStatus {
  if (isFree) return 'paid';
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid <= 0) return 'unpaid';
  if (paid >= totalAmount) return 'paid';
  return 'partial';
}

export default function SunbedRentals() {
  const { state, actions } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SunbedRental | null>(null);
  const [form, setForm] = useState(emptyRental);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [payModalRental, setPayModalRental] = useState<SunbedRental | null>(null);

  const filtered = state.sunbedRentals.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const activeCount = state.sunbedRentals.filter(r => r.status === 'active').length;
  const freeCount = state.sunbedRentals.filter(r => r.isFree && r.status !== 'returned').length;
  const returnedCount = state.sunbedRentals.filter(r => r.status === 'returned').length;

  function openAdd() {
    setEditing(null);
    setForm(emptyRental);
    setModalOpen(true);
  }

  function openEdit(rental: SunbedRental) {
    setEditing(rental);
    setForm({ ...rental });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.bedNumber || !form.customerName) return;
    const totalPrice = calcTotalPrice(form.startTime, form.endTime, form.pricePerHour, form.isFree, form.discount);
    const existingPayments = editing ? form.payments : [];
    const paymentStatus = calcPaymentStatus(existingPayments, totalPrice, form.isFree);

    const rentalData = { ...form, totalPrice, paymentStatus };

    try {
      if (editing) {
        await actions.updateSunbedRental(editing.id, { ...rentalData, id: editing.id });
      } else {
        await actions.addSunbedRental(rentalData);
      }
      setModalOpen(false);
    } catch (err) { console.error('Failed to save sunbed rental:', err); }
  }

  async function handleReturn(rental: SunbedRental) {
    try {
      await actions.updateSunbedRental(rental.id, { ...rental, status: 'returned' });
    } catch (err) { console.error('Failed to return sunbed:', err); }
  }

  async function handleDelete(id: string) {
    try { await actions.deleteSunbedRental(id); }
    catch (err) { console.error('Failed to delete sunbed rental:', err); }
  }

  async function handleAddPayment(rental: SunbedRental, payment: Payment) {
    const updatedPayments = [...rental.payments, payment];
    const finalAmount = rental.isFree ? 0 : rental.totalPrice;
    const paymentStatus = calcPaymentStatus(updatedPayments, finalAmount, rental.isFree);
    const updated: SunbedRental = { ...rental, payments: updatedPayments, paymentStatus };
    try {
      const result = await actions.updateSunbedRental(updated.id, updated);
      setPayModalRental(result);
    } catch (err) { console.error('Failed to add payment:', err); }
  }

  function getLessonName(id: string): string {
    const lesson = state.lessons.find(l => l.id === id);
    return lesson ? lesson.name : id;
  }

  function getGroupLessonName(id: string): string {
    const gl = state.groupLessons.find(g => g.id === id);
    return gl ? gl.name : id;
  }

  const statusColors: Record<string, string> = {
    'active': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    'returned': 'bg-surface-dim text-text-secondary',
    'reserved': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  };

  return (
    <>
      <PageHeader
        title="Sunbed Rentals"
        subtitle={`${activeCount} active, ${freeCount} free with lessons, ${returnedCount} returned`}
        action={
          <button onClick={openAdd} className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={16} /> New Sunbed Rental
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 custom-scrollbar">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div className="bg-surface p-5 rounded-3xl border border-border-default shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500"><Armchair size={24} className="text-white" /></div>
            <div className="flex flex-col"><span className="text-2xl font-bold">{activeCount}</span><span className="text-xs text-text-secondary font-medium">Active Sunbeds</span></div>
          </div>
          <div className="bg-surface p-5 rounded-3xl border border-border-default shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500"><Gift size={24} className="text-white" /></div>
            <div className="flex flex-col"><span className="text-2xl font-bold">{freeCount}</span><span className="text-xs text-text-secondary font-medium">Free (with Lessons)</span></div>
          </div>
          <div className="bg-surface p-5 rounded-3xl border border-border-default shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-400 dark:bg-gray-600"><RotateCcw size={24} className="text-white" /></div>
            <div className="flex flex-col"><span className="text-2xl font-bold">{returnedCount}</span><span className="text-xs text-text-secondary font-medium">Returned</span></div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Filter size={16} className="text-text-secondary" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>

        {/* Sunbed Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <Armchair size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No sunbed rentals found</p>
              <button onClick={openAdd} className="mt-4 text-brand font-bold text-sm">+ Add a sunbed rental</button>
            </div>
          )}
          {filtered.map(rental => (
            <div key={rental.id} className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", rental.isFree ? 'bg-blue-500' : 'bg-brand')}>
                    <Armchair size={20} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold">Sunbed #{rental.bedNumber}</h3>
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{rental.customerName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", statusColors[rental.status])}>
                    {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                  </span>
                  <PaymentStatusBadge status={rental.paymentStatus} />
                </div>
              </div>

              {/* Free Indicator */}
              {rental.isFree && (
                <div className="flex flex-col gap-1.5 bg-green-50 dark:bg-green-500/15 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Gift size={14} className="text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">FREE</span>
                    {rental.freeReason && <span className="text-[10px] text-green-600 dark:text-green-400">- {rental.freeReason}</span>}
                  </div>
                  {rental.linkedLessonId && (
                    <div className="flex items-center gap-1.5 ml-5">
                      <BookOpen size={10} className="text-green-600 dark:text-green-400" />
                      <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Lesson: {getLessonName(rental.linkedLessonId)}</span>
                    </div>
                  )}
                  {rental.linkedGroupLessonId && (
                    <div className="flex items-center gap-1.5 ml-5">
                      <Users size={10} className="text-green-600 dark:text-green-400" />
                      <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Group: {getGroupLessonName(rental.linkedGroupLessonId)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Discount Indicator */}
              {!rental.isFree && rental.discount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/15 rounded-xl px-3 py-2">
                  <Percent size={14} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{rental.discount}% Discount</span>
                  {rental.discountReason && <span className="text-[10px] text-amber-600 dark:text-amber-400">- {rental.discountReason}</span>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Date</span>
                  <span className="text-sm font-bold">{rental.date}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Time</span>
                  <span className="text-sm font-bold">{rental.startTime} - {rental.endTime}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Price</span>
                  <span className={cn("text-sm font-bold", "text-green-600 dark:text-green-400")}>
                    {rental.isFree ? 'FREE' : `$${rental.totalPrice.toFixed(2)}`}
                  </span>
                </div>
                {rental.customerPhone && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Phone</span>
                    <span className="text-sm font-bold">{rental.customerPhone}</span>
                  </div>
                )}
              </div>

              {rental.notes && (
                <div className="bg-surface-subtle rounded-xl p-3">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Notes: </span>
                  <span className="text-xs font-medium">{rental.notes}</span>
                </div>
              )}

              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <div className="flex gap-2">
                  {rental.status === 'active' && (
                    <button onClick={() => handleReturn(rental)} className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-500/15 px-3 py-1.5 rounded-full hover:bg-green-500 hover:text-white transition-all">
                      <RotateCcw size={10} /> Return
                    </button>
                  )}
                  {!rental.isFree && rental.paymentStatus !== 'paid' && (
                    <button onClick={() => setPayModalRental(rental)} className="flex items-center gap-1 text-[10px] font-bold text-brand uppercase tracking-wider bg-brand-light px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition-all">
                      <DollarSign size={10} /> Pay
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(rental)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(rental.id)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Sunbed Rental' : 'New Sunbed Rental'} width="max-w-2xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bed Number">
              <FormInput value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} placeholder="e.g. SB-01" />
            </FormField>
            <FormField label="Customer Name">
              <FormInput value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" />
            </FormField>
            <FormField label="Customer Phone">
              <FormInput value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="+1 555 0000" />
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
            <FormField label="Price Per Hour ($)">
              <FormInput type="number" value={form.pricePerHour} onChange={e => setForm({ ...form, pricePerHour: parseFloat(e.target.value) || 0 })} min={0} />
            </FormField>
          </div>

          {/* Auto-calculated total preview */}
          <div className="bg-surface-subtle rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Estimated Total</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {form.isFree ? 'FREE' : `$${calcTotalPrice(form.startTime, form.endTime, form.pricePerHour, form.isFree, form.discount).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Free Toggle */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={e => setForm({ ...form, isFree: e.target.checked, freeReason: e.target.checked ? form.freeReason : '' })}
                className="accent-brand w-4 h-4"
              />
              <span className="text-sm font-bold">Free Sunbed</span>
            </label>
            {form.isFree && (
              <FormField label="Free Reason">
                <FormInput value={form.freeReason} onChange={e => setForm({ ...form, freeReason: e.target.value })} placeholder="e.g. Included with lesson" />
              </FormField>
            )}
          </div>

          {/* Linked Lesson */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Linked Lesson (Optional)">
              <FormSelect value={form.linkedLessonId} onChange={e => setForm({ ...form, linkedLessonId: e.target.value })}>
                <option value="">None</option>
                {state.lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.date})</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Linked Group Lesson (Optional)">
              <FormSelect value={form.linkedGroupLessonId} onChange={e => setForm({ ...form, linkedGroupLessonId: e.target.value })}>
                <option value="">None</option>
                {state.groupLessons.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.date})</option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          {/* Discount */}
          {!form.isFree && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount (%)">
                <FormInput type="number" value={form.discount} onChange={e => setForm({ ...form, discount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })} min={0} max={100} />
              </FormField>
              {form.discount > 0 && (
                <FormField label="Discount Reason">
                  <FormInput value={form.discountReason} onChange={e => setForm({ ...form, discountReason: e.target.value })} placeholder="e.g. Returning customer" />
                </FormField>
              )}
            </div>
          )}

          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </FormField>
          <div className="flex justify-end gap-3 pt-4">
            <FormButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</FormButton>
            <FormButton onClick={handleSave} disabled={!form.bedNumber || !form.customerName}>
              {editing ? 'Update Sunbed' : 'Create Sunbed Rental'}
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      {payModalRental && (
        <PaymentModal
          open={!!payModalRental}
          onClose={() => setPayModalRental(null)}
          title={`Payment - Sunbed #${payModalRental.bedNumber}`}
          totalAmount={payModalRental.totalPrice}
          discount={0}
          discountReason=""
          isFree={payModalRental.isFree}
          freeReason={payModalRental.freeReason}
          payments={payModalRental.payments}
          onAddPayment={(payment) => handleAddPayment(payModalRental, payment)}
        />
      )}
    </>
  );
}
