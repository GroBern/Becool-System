import React, { useState } from 'react';
import { DollarSign, CreditCard, Wifi, Banknote, Check, Clock, AlertCircle } from 'lucide-react';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from './Modal';
import { Payment, PaymentMethod, PaymentStatus } from '../types';
import { generateId } from '../context/AppContext';
import { cn } from '../lib/utils';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  totalAmount: number;
  discount: number;
  discountReason: string;
  isFree: boolean;
  freeReason: string;
  payments: Payment[];
  onAddPayment: (payment: Payment) => void;
}

export default function PaymentModal({ open, onClose, title, totalAmount, discount, discountReason, isFree, freeReason, payments, onAddPayment }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');

  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const finalAmount = isFree ? 0 : totalAmount * (1 - discount / 100);
  const remaining = Math.max(0, finalAmount - paidAmount);

  function handleSubmit() {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return;
    onAddPayment({
      id: generateId('pay'),
      amount: payAmount,
      method,
      date: new Date().toISOString(),
      note,
    });
    setAmount('');
    setNote('');
  }

  const methodIcons: Record<PaymentMethod, any> = { cash: Banknote, card: CreditCard, online: Wifi };

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-lg">
      <div className="flex flex-col gap-5">
        {/* Summary */}
        <div className="bg-surface-subtle rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Base Amount</span>
            <span className="text-sm font-bold">${totalAmount.toFixed(2)}</span>
          </div>
          {isFree && (
            <div className="flex justify-between items-center text-green-600 dark:text-green-400">
              <span className="text-xs font-bold uppercase tracking-wider">FREE</span>
              <span className="text-xs">{freeReason}</span>
            </div>
          )}
          {discount > 0 && !isFree && (
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider">Discount ({discount}%)</span>
              <span className="text-sm font-bold">-${(totalAmount * discount / 100).toFixed(2)}{discountReason ? ` — ${discountReason}` : ''}</span>
            </div>
          )}
          <div className="border-t border-border-default pt-2 flex justify-between items-center">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Final Amount</span>
            <span className="text-lg font-bold">${finalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Paid</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">${paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Remaining</span>
            <span className={cn("text-sm font-bold", remaining > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
              ${remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Payment History</span>
            {payments.map(p => {
              const Icon = methodIcons[p.method];
              return (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-surface-subtle rounded-xl">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-text-secondary" />
                    <span className="text-xs font-bold">${p.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-text-secondary capitalize">{p.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.note && <span className="text-[10px] text-text-secondary">{p.note}</span>}
                    <span className="text-[10px] text-text-secondary">{new Date(p.date).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Payment Form */}
        {remaining > 0 && !isFree && (
          <div className="flex flex-col gap-3 pt-3 border-t border-border-default">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Add Payment</span>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Amount ($)">
                <FormInput
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={remaining.toFixed(2)}
                  min={0}
                  max={remaining}
                />
              </FormField>
              <FormField label="Method">
                <FormSelect value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online Transfer</option>
                </FormSelect>
              </FormField>
            </div>
            <FormField label="Note (optional)">
              <FormInput value={note} onChange={e => setNote(e.target.value)} placeholder="Payment note..." />
            </FormField>
            <div className="flex gap-2">
              <FormButton onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0}>
                Record Payment
              </FormButton>
              <button
                onClick={() => { setAmount(remaining.toFixed(2)); }}
                className="px-4 py-2 rounded-full text-xs font-bold text-brand bg-brand-light hover:bg-brand hover:text-white transition-all"
              >
                Pay Full (${remaining.toFixed(2)})
              </button>
            </div>
          </div>
        )}

        {(remaining <= 0 || isFree) && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/15 rounded-xl p-3">
            <Check size={16} />
            <span className="text-sm font-bold">{isFree ? 'This service is free' : 'Fully paid'}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Reusable payment status badge
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = {
    paid: { icon: Check, label: 'Paid', cls: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400' },
    partial: { icon: Clock, label: 'Partial', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
    unpaid: { icon: AlertCircle, label: 'Unpaid', cls: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400' },
  };
  const c = config[status];
  return (
    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1", c.cls)}>
      <c.icon size={10} /> {c.label}
    </span>
  );
}

// Instructor payment modal
interface InstructorPayModalProps {
  open: boolean;
  onClose: () => void;
  instructorName: string;
  calculatedPay: number;
  paidAmount: number;
  payments: Payment[];
  onAddPayment: (payment: Payment) => void;
}

export function InstructorPayModal({ open, onClose, instructorName, calculatedPay, paidAmount, payments, onAddPayment }: InstructorPayModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const remaining = Math.max(0, calculatedPay - paidAmount);

  function handleSubmit() {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return;
    onAddPayment({
      id: generateId('pay'),
      amount: payAmount,
      method,
      date: new Date().toISOString(),
      note,
    });
    setAmount('');
    setNote('');
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pay ${instructorName}`} width="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="bg-surface-subtle rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex justify-between"><span className="text-xs font-bold text-text-secondary">Total Due</span><span className="text-sm font-bold">${calculatedPay.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-xs font-bold text-text-secondary">Paid</span><span className="text-sm font-bold text-green-600 dark:text-green-400">${paidAmount.toFixed(2)}</span></div>
          <div className="border-t border-border-default pt-2 flex justify-between"><span className="text-xs font-bold text-text-secondary">Remaining</span><span className={cn("text-sm font-bold", remaining > 0 ? "text-red-500" : "text-green-600")}>${remaining.toFixed(2)}</span></div>
        </div>

        {payments.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">History</span>
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5 px-2 bg-surface-subtle rounded-lg text-xs">
                <span className="font-bold">${p.amount.toFixed(2)} — <span className="capitalize text-text-secondary">{p.method}</span></span>
                <span className="text-text-secondary">{new Date(p.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {remaining > 0 && (
          <div className="flex flex-col gap-3 pt-2 border-t border-border-default">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Amount">
                <FormInput type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={remaining.toFixed(2)} min={0} />
              </FormField>
              <FormField label="Method">
                <FormSelect value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online Transfer</option>
                </FormSelect>
              </FormField>
            </div>
            <FormField label="Note">
              <FormInput value={note} onChange={e => setNote(e.target.value)} placeholder="Optional..." />
            </FormField>
            <div className="flex gap-2">
              <FormButton onClick={handleSubmit}>Record</FormButton>
              <button onClick={() => setAmount(remaining.toFixed(2))} className="px-4 py-2 rounded-full text-xs font-bold text-brand bg-brand-light hover:bg-brand hover:text-white transition-all">
                Pay Full
              </button>
            </div>
          </div>
        )}
        {remaining <= 0 && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/15 rounded-xl p-3">
            <Check size={16} /><span className="text-sm font-bold">Fully Paid</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
