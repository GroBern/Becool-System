import React, { useState, useMemo } from 'react';
import { Plus, Users, Edit2, Trash2, UserCheck, UserX, Phone, ChevronDown, ChevronUp, DollarSign, Banknote, CreditCard, Wifi } from 'lucide-react';
import { useApp, generateId } from '../context/AppContext';
// generateId kept for payment subdocument IDs
import PageHeader from '../components/PageHeader';
import Modal, { FormField, FormInput, FormSelect, FormTextarea, FormButton } from '../components/Modal';
import { PaymentStatusBadge } from '../components/PaymentModal';
import { Agent, AgentCommission, Payment, PaymentMethod, PaymentStatus } from '../types';
import { cn } from '../lib/utils';

const emptyAgent: Omit<Agent, 'id'> = {
  name: '',
  phone: '',
  commissionType: 'percentage',
  commissionRate: 10,
  status: 'active',
  notes: '',
};

export default function Agents() {
  const { state, actions } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyAgent);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [payingCommission, setPayingCommission] = useState<AgentCommission | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNote, setPayNote] = useState('');

  // Compute commission summaries per agent
  const agentSummaries = useMemo(() => {
    const map: Record<string, { totalEarned: number; totalPaid: number; outstanding: number }> = {};
    state.agents.forEach(a => {
      const commissions = state.agentCommissions.filter(c => c.agentId === a.id);
      const totalEarned = commissions.reduce((sum, c) => sum + c.totalCommission, 0);
      const totalPaid = commissions.reduce((sum, c) => sum + c.paidAmount, 0);
      map[a.id] = { totalEarned, totalPaid, outstanding: totalEarned - totalPaid };
    });
    return map;
  }, [state.agents, state.agentCommissions]);

  // Global summaries
  const globalSummary = useMemo(() => {
    const totalEarned = state.agentCommissions.reduce((sum, c) => sum + c.totalCommission, 0);
    const totalPaid = state.agentCommissions.reduce((sum, c) => sum + c.paidAmount, 0);
    return { totalAgents: state.agents.length, totalEarned, totalPaid, outstanding: totalEarned - totalPaid };
  }, [state.agents, state.agentCommissions]);

  function openAdd() {
    setEditing(null);
    setForm(emptyAgent);
    setModalOpen(true);
  }

  function openEdit(agent: Agent) {
    setEditing(agent);
    setForm({ name: agent.name, phone: agent.phone, commissionType: agent.commissionType, commissionRate: agent.commissionRate, status: agent.status, notes: agent.notes });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name) return;
    try {
      if (editing) {
        await actions.updateAgent(editing.id, { ...form, id: editing.id });
      } else {
        await actions.addAgent(form);
      }
      setModalOpen(false);
    } catch (err) { console.error('Failed to save agent:', err); }
  }

  async function toggleStatus(agent: Agent) {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try { await actions.updateAgent(agent.id, { ...agent, status: newStatus }); }
    catch (err) { console.error('Failed to toggle status:', err); }
  }

  async function handleDelete(id: string) {
    try { await actions.deleteAgent(id); }
    catch (err) { console.error('Failed to delete agent:', err); }
  }

  function getServiceLabel(c: AgentCommission) {
    if (c.serviceType === 'lesson') {
      const lesson = state.lessons.find(l => l.id === c.serviceId);
      return lesson ? lesson.name : 'Lesson (deleted)';
    }
    const gl = state.groupLessons.find(g => g.id === c.serviceId);
    return gl ? gl.name : 'Group Lesson (deleted)';
  }

  function openPayCommission(commission: AgentCommission) {
    setPayingCommission(commission);
    setPayAmount('');
    setPayMethod('cash');
    setPayNote('');
  }

  async function handlePayCommission() {
    if (!payingCommission) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    const newPayment: Payment = {
      id: generateId('pay'),
      amount,
      method: payMethod,
      date: new Date().toISOString(),
      note: payNote,
    };

    const newPaidAmount = payingCommission.paidAmount + amount;
    let newStatus: PaymentStatus = 'unpaid';
    if (newPaidAmount >= payingCommission.totalCommission) newStatus = 'paid';
    else if (newPaidAmount > 0) newStatus = 'partial';

    const updated: AgentCommission = {
      ...payingCommission,
      payments: [...payingCommission.payments, newPayment],
      paidAmount: newPaidAmount,
      paymentStatus: newStatus,
    };

    try {
      await actions.updateAgentCommission(payingCommission.id, updated);
      setPayingCommission(null);
    } catch (err) { console.error('Failed to pay commission:', err); }
  }

  const methodIcons: Record<PaymentMethod, any> = { cash: Banknote, card: CreditCard, online: Wifi };

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    inactive: 'bg-surface-dim text-text-secondary',
  };

  return (
    <>
      <PageHeader
        title="Agents"
        subtitle={`${state.agents.filter(a => a.status === 'active').length} active out of ${state.agents.length} total`}
        action={
          <button onClick={openAdd} className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={16} /> Add Agent
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        {/* Summary Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Agents</span>
            <span className="text-2xl font-bold">{globalSummary.totalAgents}</span>
          </div>
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Commissions Earned</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">${globalSummary.totalEarned.toFixed(2)}</span>
          </div>
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Paid</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">${globalSummary.totalPaid.toFixed(2)}</span>
          </div>
          <div className="bg-surface border border-border-default shadow-sm rounded-3xl p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Outstanding</span>
            <span className={cn("text-2xl font-bold", globalSummary.outstanding > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
              ${globalSummary.outstanding.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-2 gap-6">
          {state.agents.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <Users size={48} className="text-border-default mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No agents added yet</p>
              <button onClick={openAdd} className="mt-4 text-brand font-bold text-sm">+ Add agent</button>
            </div>
          )}

          {state.agents.map(agent => {
            const summary = agentSummaries[agent.id] || { totalEarned: 0, totalPaid: 0, outstanding: 0 };
            const commissions = state.agentCommissions.filter(c => c.agentId === agent.id);
            const isExpanded = expandedAgent === agent.id;

            return (
              <div key={agent.id} className="bg-surface border border-border-default shadow-sm rounded-3xl flex flex-col">
                {/* Card Body */}
                <div className="p-6 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-bold text-lg">{agent.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Phone size={12} /> <span>{agent.phone}</span>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", statusColors[agent.status])}>
                      {agent.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Commission Type & Rate */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-brand-light text-brand px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {agent.commissionType === 'percentage' ? `${agent.commissionRate}% Commission` : `$${agent.commissionRate} Fixed`}
                    </span>
                    {agent.notes && (
                      <span className="text-[10px] text-text-secondary truncate">{agent.notes}</span>
                    )}
                  </div>

                  {/* Commission Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Total Earned</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">${summary.totalEarned.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Paid</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">${summary.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Outstanding</span>
                      <span className={cn("text-sm font-bold", summary.outstanding > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                        ${summary.outstanding.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border-default flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStatus(agent)}
                        className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all",
                          agent.status === 'active'
                            ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/15 hover:bg-red-500 hover:text-white"
                            : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/15 hover:bg-green-500 hover:text-white"
                        )}>
                        {agent.status === 'active' ? <><UserX size={10} /> Deactivate</> : <><UserCheck size={10} /> Activate</>}
                      </button>
                      {commissions.length > 0 && (
                        <button
                          onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-brand bg-brand-light hover:bg-brand hover:text-white transition-all"
                        >
                          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          Commissions ({commissions.length})
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(agent)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(agent.id)} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Commission Details (Expandable) */}
                {isExpanded && commissions.length > 0 && (
                  <div className="border-t border-border-default px-6 py-4 flex flex-col gap-3 bg-surface-subtle rounded-b-3xl">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Commission Details</span>
                    {commissions.map(comm => {
                      const remaining = comm.totalCommission - comm.paidAmount;
                      return (
                        <div key={comm.id} className="bg-surface rounded-2xl border border-border-default p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold">{getServiceLabel(comm)}</span>
                              <span className="text-[10px] text-text-secondary capitalize">{comm.serviceType.replace('-', ' ')} &middot; {comm.guestCount} guest{comm.guestCount !== 1 ? 's' : ''} &middot; {new Date(comm.date).toLocaleDateString()}</span>
                            </div>
                            <PaymentStatusBadge status={comm.paymentStatus} />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Commission</span>
                              <span className="text-sm font-bold">${comm.totalCommission.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Paid</span>
                              <span className="text-sm font-bold text-green-600 dark:text-green-400">${comm.paidAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Remaining</span>
                              <span className={cn("text-sm font-bold", remaining > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                ${remaining.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {/* Payment history for this commission */}
                          {comm.payments.length > 0 && (
                            <div className="flex flex-col gap-1">
                              {comm.payments.map(p => {
                                const Icon = methodIcons[p.method];
                                return (
                                  <div key={p.id} className="flex items-center justify-between py-1.5 px-3 bg-surface-subtle rounded-xl text-xs">
                                    <div className="flex items-center gap-2">
                                      <Icon size={12} className="text-text-secondary" />
                                      <span className="font-bold">${p.amount.toFixed(2)}</span>
                                      <span className="text-text-secondary capitalize">{p.method}</span>
                                    </div>
                                    <span className="text-text-secondary">{new Date(p.date).toLocaleDateString()}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {remaining > 0 && (
                            <button
                              onClick={() => openPayCommission(comm)}
                              className="self-start flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full bg-brand text-white shadow-lg shadow-brand/30 hover:scale-105 transition-transform"
                            >
                              <DollarSign size={10} /> Pay Commission
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Agent Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Agent' : 'Add Agent'}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name">
              <FormInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agent name" />
            </FormField>
            <FormField label="Phone">
              <FormInput value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0000" />
            </FormField>
            <FormField label="Commission Type">
              <FormSelect value={form.commissionType} onChange={e => setForm({ ...form, commissionType: e.target.value as 'percentage' | 'fixed' })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </FormSelect>
            </FormField>
            <FormField label={form.commissionType === 'percentage' ? 'Commission Rate (%)' : 'Commission Amount ($)'}>
              <FormInput type="number" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })} min={0} />
            </FormField>
            <FormField label="Status">
              <FormSelect value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </FormSelect>
            </FormField>
          </div>
          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </FormField>
          <div className="flex justify-end gap-3 pt-4">
            <FormButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</FormButton>
            <FormButton onClick={handleSave} disabled={!form.name}>
              {editing ? 'Update Agent' : 'Add Agent'}
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* Pay Commission Modal */}
      <Modal open={!!payingCommission} onClose={() => setPayingCommission(null)} title="Pay Commission" width="max-w-md">
        {payingCommission && (() => {
          const remaining = Math.max(0, payingCommission.totalCommission - payingCommission.paidAmount);
          const agentName = state.agents.find(a => a.id === payingCommission.agentId)?.name || 'Agent';
          return (
            <div className="flex flex-col gap-4">
              <div className="bg-surface-subtle rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-text-secondary">Agent</span>
                  <span className="text-sm font-bold">{agentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-text-secondary">Service</span>
                  <span className="text-sm font-bold">{getServiceLabel(payingCommission)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-text-secondary">Total Commission</span>
                  <span className="text-sm font-bold">${payingCommission.totalCommission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-text-secondary">Already Paid</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">${payingCommission.paidAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-border-default pt-2 flex justify-between">
                  <span className="text-xs font-bold text-text-secondary">Remaining</span>
                  <span className="text-sm font-bold text-red-500 dark:text-red-400">${remaining.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Amount ($)">
                  <FormInput type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={remaining.toFixed(2)} min={0} />
                </FormField>
                <FormField label="Method">
                  <FormSelect value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online Transfer</option>
                  </FormSelect>
                </FormField>
              </div>
              <FormField label="Note (optional)">
                <FormInput value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Payment note..." />
              </FormField>
              <div className="flex gap-2 pt-2">
                <FormButton onClick={handlePayCommission} disabled={!payAmount || parseFloat(payAmount) <= 0}>
                  Record Payment
                </FormButton>
                <button
                  onClick={() => setPayAmount(remaining.toFixed(2))}
                  className="px-4 py-2 rounded-full text-xs font-bold text-brand bg-brand-light hover:bg-brand hover:text-white transition-all"
                >
                  Pay Full (${remaining.toFixed(2)})
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
