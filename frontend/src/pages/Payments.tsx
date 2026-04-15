import React, { useState, useMemo } from 'react';
import { Banknote, CreditCard, Wifi, DollarSign, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import { PaymentStatusBadge } from '../components/PaymentModal';
import { FormField, FormInput, FormSelect } from '../components/Modal';
import { Payment, PaymentMethod } from '../types';
import { cn } from '../lib/utils';

type ServiceType = 'lesson' | 'group-lesson' | 'board-rental' | 'sunbed-rental' | 'instructor' | 'agent-commission';

interface PaymentRow {
  id: string;
  date: string;
  serviceType: ServiceType;
  serviceLabel: string;
  customerOrDetails: string;
  amount: number;
  method: PaymentMethod;
  note: string;
}

const methodIcons: Record<PaymentMethod, any> = { cash: Banknote, card: CreditCard, online: Wifi };
const methodLabels: Record<PaymentMethod, string> = { cash: 'Cash', card: 'Card', online: 'Online' };
const serviceLabels: Record<ServiceType, string> = {
  'lesson': 'Lesson',
  'group-lesson': 'Group Lesson',
  'board-rental': 'Board Rental',
  'sunbed-rental': 'Sunbed Rental',
  'instructor': 'Instructor Pay',
  'agent-commission': 'Agent Commission',
};

export default function Payments() {
  const { state } = useApp();
  const today = new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'all'>('all');
  const [filterService, setFilterService] = useState<ServiceType | 'all'>('all');

  // Collect all payments from all sources
  const allPayments = useMemo(() => {
    const rows: PaymentRow[] = [];

    // Lesson payments
    state.lessons.forEach(lesson => {
      lesson.payments.forEach(p => {
        rows.push({
          id: p.id,
          date: p.date,
          serviceType: 'lesson',
          serviceLabel: lesson.name,
          customerOrDetails: lesson.studentIds.length > 0
            ? state.students.find(s => s.id === lesson.studentIds[0])?.name || 'Student'
            : 'N/A',
          amount: p.amount,
          method: p.method,
          note: p.note,
        });
      });

      // Instructor payments from lessons
      lesson.instructors.forEach(li => {
        const inst = state.instructors.find(i => i.id === li.instructorId);
        li.payments.forEach(p => {
          rows.push({
            id: p.id,
            date: p.date,
            serviceType: 'instructor',
            serviceLabel: lesson.name,
            customerOrDetails: inst?.name || 'Instructor',
            amount: p.amount,
            method: p.method,
            note: p.note,
          });
        });
      });
    });

    // Group lesson participant payments
    state.groupLessons.forEach(gl => {
      gl.participants.forEach(part => {
        part.payments.forEach(p => {
          rows.push({
            id: p.id,
            date: p.date,
            serviceType: 'group-lesson',
            serviceLabel: gl.name,
            customerOrDetails: part.name,
            amount: p.amount,
            method: p.method,
            note: p.note,
          });
        });
      });

      // Instructor payments from group lessons
      gl.instructors.forEach(li => {
        const inst = state.instructors.find(i => i.id === li.instructorId);
        li.payments.forEach(p => {
          rows.push({
            id: p.id,
            date: p.date,
            serviceType: 'instructor',
            serviceLabel: gl.name,
            customerOrDetails: inst?.name || 'Instructor',
            amount: p.amount,
            method: p.method,
            note: p.note,
          });
        });
      });
    });

    // Board rental payments
    state.boardRentals.forEach(br => {
      br.payments.forEach(p => {
        rows.push({
          id: p.id,
          date: p.date,
          serviceType: 'board-rental',
          serviceLabel: `${br.boardType} #${br.boardNumber}`,
          customerOrDetails: br.customerName,
          amount: p.amount,
          method: p.method,
          note: p.note,
        });
      });
    });

    // Sunbed rental payments
    state.sunbedRentals.forEach(sb => {
      sb.payments.forEach(p => {
        rows.push({
          id: p.id,
          date: p.date,
          serviceType: 'sunbed-rental',
          serviceLabel: `Sunbed ${sb.bedNumber}`,
          customerOrDetails: sb.customerName,
          amount: p.amount,
          method: p.method,
          note: p.note,
        });
      });
    });

    // Agent commission payments
    state.agentCommissions.forEach(ac => {
      const agent = state.agents.find(a => a.id === ac.agentId);
      ac.payments.forEach(p => {
        rows.push({
          id: p.id,
          date: p.date,
          serviceType: 'agent-commission',
          serviceLabel: `${ac.serviceType.replace('-', ' ')} commission`,
          customerOrDetails: agent?.name || 'Agent',
          amount: p.amount,
          method: p.method,
          note: p.note,
        });
      });
    });

    // Sort by date descending
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [state]);

  // Apply filters
  const filteredPayments = useMemo(() => {
    return allPayments.filter(row => {
      const rowDate = row.date.split('T')[0];
      if (dateFrom && rowDate < dateFrom) return false;
      if (dateTo && rowDate > dateTo) return false;
      if (filterMethod !== 'all' && row.method !== filterMethod) return false;
      if (filterService !== 'all' && row.serviceType !== filterService) return false;
      return true;
    });
  }, [allPayments, dateFrom, dateTo, filterMethod, filterService]);

  // Summary for today
  const todaySummary = useMemo(() => {
    const todayPayments = allPayments.filter(p => p.date.split('T')[0] === today);
    const total = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const cash = todayPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const card = todayPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0);
    const online = todayPayments.filter(p => p.method === 'online').reduce((sum, p) => sum + p.amount, 0);
    return { total, cash, card, online };
  }, [allPayments, today]);

  const serviceTypeColors: Record<ServiceType, string> = {
    'lesson': 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    'group-lesson': 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
    'board-rental': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    'sunbed-rental': 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
    'instructor': 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
    'agent-commission': 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  };

  return (
    <>
      <PageHeader
        title="Payment History"
        subtitle={`${filteredPayments.length} payment${filteredPayments.length !== 1 ? 's' : ''} found`}
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 custom-scrollbar">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Received Today</span>
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">${todaySummary.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cash</span>
            <div className="flex items-center gap-2">
              <Banknote size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">${todaySummary.cash.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Card</span>
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">${todaySummary.card.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Online Transfer</span>
            <div className="flex items-center gap-2">
              <Wifi size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">${todaySummary.online.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={14} className="text-text-secondary" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Filters</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <FormField label="From Date">
              <FormInput type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </FormField>
            <FormField label="To Date">
              <FormInput type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </FormField>
            <FormField label="Payment Method">
              <FormSelect value={filterMethod} onChange={e => setFilterMethod(e.target.value as any)}>
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online Transfer</option>
              </FormSelect>
            </FormField>
            <FormField label="Service Type">
              <FormSelect value={filterService} onChange={e => setFilterService(e.target.value as any)}>
                <option value="all">All Services</option>
                <option value="lesson">Lesson</option>
                <option value="group-lesson">Group Lesson</option>
                <option value="board-rental">Board Rental</option>
                <option value="sunbed-rental">Sunbed Rental</option>
                <option value="instructor">Instructor Pay</option>
                <option value="agent-commission">Agent Commission</option>
              </FormSelect>
            </FormField>
          </div>
        </div>

        {/* Payment Table */}
        <div className="bg-surface border border-border-default shadow-sm rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider px-6 py-4">Date</th>
                <th className="text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider px-4 py-4">Service</th>
                <th className="text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider px-4 py-4">Customer / Details</th>
                <th className="text-right text-[10px] font-bold text-text-secondary uppercase tracking-wider px-4 py-4">Amount</th>
                <th className="text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider px-4 py-4">Method</th>
                <th className="text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider px-6 py-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-text-secondary font-medium">
                    No payments found matching your filters
                  </td>
                </tr>
              )}
              {filteredPayments.map((row, idx) => {
                const Icon = methodIcons[row.method];
                const dateObj = new Date(row.date);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={row.id} className={cn("border-b border-border-default last:border-b-0 hover:bg-surface-dim/50 transition-colors", idx % 2 === 1 && "bg-surface-subtle")}>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{dateStr}</span>
                        <span className="text-[10px] text-text-secondary">{timeStr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full inline-block w-fit", serviceTypeColors[row.serviceType])}>
                          {serviceLabels[row.serviceType]}
                        </span>
                        <span className="text-xs font-medium text-text-secondary truncate max-w-[180px]">{row.serviceLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium">{row.customerOrDetails}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">${row.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Icon size={14} className="text-text-secondary" />
                        <span className="text-xs font-medium capitalize">{methodLabels[row.method]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-xs text-text-secondary truncate max-w-[150px] block">{row.note || '-'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
