import React, { useState } from 'react';
import { Plus, Sailboat, Edit2, Trash2, RotateCcw, Filter, Clock, AlertTriangle, DollarSign, Gift, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import PaymentModal, { PaymentStatusBadge } from '../components/PaymentModal';
import { BoardRental, Payment, PaymentStatus } from '../types';
import { cn } from '../lib/utils';

const today = new Date().toISOString().split('T')[0];

const emptyRental: Omit<BoardRental, 'id'> = {
  boardType: 'longboard', boardNumber: '', customerName: '', customerPhone: '',
  rentedAt: `${today}T${new Date().toTimeString().slice(0, 5)}:00`,
  dueAt: `${today}T${String(new Date().getHours() + 2).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:00`,
  returnedAt: null, pricePerHour: 15, totalPrice: 30, status: 'active',
  deposit: 50, isFree: false, freeReason: '', discount: 0, discountReason: '',
  paymentStatus: 'unpaid', payments: [], notes: '',
};

function calcPaymentStatus(payments: Payment[], totalAmount: number, isFree: boolean): PaymentStatus {
  if (isFree) return 'paid';
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid <= 0) return 'unpaid';
  if (paid >= totalAmount) return 'paid';
  return 'partial';
}

export default function BoardRentals() {
  const { state, actions } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BoardRental | null>(null);
  const [form, setForm] = useState(emptyRental);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [payModalRental, setPayModalRental] = useState<BoardRental | null>(null);

  const filtered = state.boardRentals.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const activeCount = state.boardRentals.filter(r => r.status === 'active').length;
  const overdueCount = state.boardRentals.filter(r => r.status === 'overdue').length;
  const returnedCount = state.boardRentals.filter(r => r.status === 'returned').length;

  function openAdd() {
    setEditing(null);
    setForm(emptyRental);
    setModalOpen(true);
  }

  function openEdit(rental: BoardRental) {
    setEditing(rental);
    setForm({ ...rental });
    setModalOpen(true);
  }

  function calcTotalPrice(rentedAt: string, dueAt: string, pricePerHour: number, isFree: boolean, discount: number): number {
    if (isFree) return 0;
    const rentedTime = new Date(rentedAt).getTime();
    const dueTime = new Date(dueAt).getTime();
    const hours = Math.max(1, Math.ceil((dueTime - rentedTime) / (1000 * 60 * 60)));
    const base = hours * pricePerHour;
    return Math.round(base * (1 - discount / 100) * 100) / 100;
  }

  async function handleSave() {
    if (!form.boardNumber || !form.customerName) return;
    const totalPrice = calcTotalPrice(form.rentedAt, form.dueAt, form.pricePerHour, form.isFree, form.discount);
    const existingPayments = editing ? form.payments : [];
    const paymentStatus = calcPaymentStatus(existingPayments, totalPrice, form.isFree);

    const rentalData = { ...form, totalPrice, paymentStatus };

    try {
      if (editing) {
        await actions.updateBoardRental(editing.id, { ...rentalData, id: editing.id });
      } else {
        await actions.addBoardRental(rentalData);
      }
      setModalOpen(false);
    } catch (err) { console.error('Failed to save rental:', err); }
  }

  async function handleReturn(rental: BoardRental) {
    try {
      await actions.updateBoardRental(rental.id, { ...rental, status: 'returned', returnedAt: new Date().toISOString() });
    } catch (err) { console.error('Failed to return rental:', err); }
  }

  async function handleDelete(id: string) {
    try { await actions.deleteBoardRental(id); }
    catch (err) { console.error('Failed to delete rental:', err); }
  }

  async function handleAddPayment(rental: BoardRental, payment: Payment) {
    const updatedPayments = [...rental.payments, payment];
    const finalAmount = rental.isFree ? 0 : rental.totalPrice;
    const paymentStatus = calcPaymentStatus(updatedPayments, finalAmount, rental.isFree);
    const updated: BoardRental = { ...rental, payments: updatedPayments, paymentStatus };
    try {
      const result = await actions.updateBoardRental(updated.id, updated);
      setPayModalRental(result);
    } catch (err) { console.error('Failed to add payment:', err); }
  }

  const statusColors: Record<string, string> = {
    'active': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    'returned': 'bg-surface-dim text-text-secondary',
    'overdue': 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
  };

  const boardTypeColors: Record<string, string> = {
    'longboard': 'bg-blue-500',
    'shortboard': 'bg-brand',
    'foam': 'bg-amber-500',
    'sup': 'bg-emerald-500',
    'bodyboard': 'bg-pink-500',
  };

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      <PageHeader
        title="Board Rentals"
        subtitle={`${activeCount} active, ${overdueCount} overdue, ${returnedCount} returned`}
        action={
          <button onClick={openAdd} className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={16} /> New Rental
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 custom-scrollbar">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div className="bg-surface p-5 rounded-3xl border border-border-default shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500"><Sailboat size={24} className="text-white" /></div>
            <div className="flex flex-col"><span className="text-2xl font-bold">{activeCount}</span><span className="text-xs text-text-secondary font-medium">Active Rentals</span></div>
          </div>
          <div className="bg-surface p-5 rounded-3xl border border-border-default shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500"><Clock size={24} className="text-white" /></div>
            <div className="flex flex-col"><span className="text-2xl font-bold">{overdueCount}</span><span className="text-xs text-text-secondary font-medium">Overdue</span></div>
          </div>
          <div className="bg-surface p-5 rounded-3xl border border-border-default shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-400 dark:bg-gray-600"><RotateCcw size={24} className="text-white" /></div>
            <div className="flex flex-col"><span className="text-2xl font-bold">{returnedCount}</span><span className="text-xs text-text-secondary font-medium">Returned Today</span></div>
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
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Rentals List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <Sailboat size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No rentals found</p>
              <button onClick={openAdd} className="mt-4 text-brand font-bold text-sm">+ Add a rental</button>
            </div>
          )}
          {filtered.map(rental => (
            <div key={rental.id} className="bg-surface p-6 rounded-3xl border border-border-default shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", boardTypeColors[rental.boardType])}>
                    <Sailboat size={20} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold">{rental.boardType.charAt(0).toUpperCase() + rental.boardType.slice(1)} #{rental.boardNumber}</h3>
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

              {/* Free / Discount Indicators */}
              {rental.isFree && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/15 rounded-xl px-3 py-2">
                  <Gift size={14} className="text-green-600 dark:text-green-400" />
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">FREE</span>
                  {rental.freeReason && <span className="text-[10px] text-green-600 dark:text-green-400">- {rental.freeReason}</span>}
                </div>
              )}
              {!rental.isFree && rental.discount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/15 rounded-xl px-3 py-2">
                  <Percent size={14} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{rental.discount}% Discount</span>
                  {rental.discountReason && <span className="text-[10px] text-amber-600 dark:text-amber-400">- {rental.discountReason}</span>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Rented At</span>
                  <span className="text-sm font-bold">{formatTime(rental.rentedAt)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Due At</span>
                  <span className="text-sm font-bold">{formatTime(rental.dueAt)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Price</span>
                  <span className={cn("text-sm font-bold", rental.isFree ? "text-green-600 dark:text-green-400" : "text-green-600 dark:text-green-400")}>
                    {rental.isFree ? 'FREE' : `$${rental.totalPrice.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Deposit</span>
                  <span className="text-sm font-bold">${rental.deposit}</span>
                </div>
                {rental.customerPhone && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Phone</span>
                    <span className="text-sm font-bold">{rental.customerPhone}</span>
                  </div>
                )}
              </div>

              {rental.returnedAt && (
                <div className="bg-surface-subtle rounded-xl p-3">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Returned At: </span>
                  <span className="text-xs font-bold">{formatTime(rental.returnedAt)}</span>
                </div>
              )}

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
                      <RotateCcw size={10} /> Return Board
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rental' : 'New Board Rental'} width="max-w-2xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Board Type">
              <FormSelect value={form.boardType} onChange={e => setForm({ ...form, boardType: e.target.value as any })}>
                <option value="longboard">Longboard</option>
                <option value="shortboard">Shortboard</option>
                <option value="foam">Foam Board</option>
                <option value="sup">SUP Board</option>
                <option value="bodyboard">Bodyboard</option>
              </FormSelect>
            </FormField>
            <FormField label="Board Number">
              <FormInput value={form.boardNumber} onChange={e => setForm({ ...form, boardNumber: e.target.value })} placeholder="e.g. LB-07" />
            </FormField>
            <FormField label="Customer Name">
              <FormInput value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" />
            </FormField>
            <FormField label="Customer Phone">
              <FormInput value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="+1 555 0000" />
            </FormField>
            <FormField label="Rented At">
              <FormInput type="datetime-local" value={form.rentedAt.slice(0, 16)} onChange={e => setForm({ ...form, rentedAt: e.target.value + ':00' })} />
            </FormField>
            <FormField label="Due At">
              <FormInput type="datetime-local" value={form.dueAt.slice(0, 16)} onChange={e => setForm({ ...form, dueAt: e.target.value + ':00' })} />
            </FormField>
            <FormField label="Price Per Hour ($)">
              <FormInput type="number" value={form.pricePerHour} onChange={e => setForm({ ...form, pricePerHour: parseFloat(e.target.value) || 0 })} min={0} />
            </FormField>
            <FormField label="Deposit ($)">
              <FormInput type="number" value={form.deposit} onChange={e => setForm({ ...form, deposit: parseFloat(e.target.value) || 0 })} min={0} />
            </FormField>
          </div>

          {/* Auto-calculated total preview */}
          <div className="bg-surface-subtle rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Estimated Total</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {form.isFree ? 'FREE' : `$${calcTotalPrice(form.rentedAt, form.dueAt, form.pricePerHour, form.isFree, form.discount).toFixed(2)}`}
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
              <span className="text-sm font-bold">Free Rental</span>
            </label>
            {form.isFree && (
              <FormField label="Free Reason">
                <FormInput value={form.freeReason} onChange={e => setForm({ ...form, freeReason: e.target.value })} placeholder="e.g. Included with lesson" />
              </FormField>
            )}
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
            <FormButton onClick={handleSave} disabled={!form.boardNumber || !form.customerName}>
              {editing ? 'Update Rental' : 'Create Rental'}
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      {payModalRental && (
        <PaymentModal
          open={!!payModalRental}
          onClose={() => setPayModalRental(null)}
          title={`Payment - ${payModalRental.boardType.charAt(0).toUpperCase() + payModalRental.boardType.slice(1)} #${payModalRental.boardNumber}`}
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
