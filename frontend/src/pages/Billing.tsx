import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, DollarSign, Clock, Printer, Trash2, X } from 'lucide-react';
import { billingApi, patientsApi } from '../api/endpoints';
import { Billing as BillingType, PaymentStatus } from '../types';
import { EditableCell } from '../components/EditableCell';
import { PrintModal } from '../components/PrintModal';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

export const Billing: React.FC = () => {
  const queryClient = useQueryClient();
  const { currency } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillingType | null>(null);

  // Form state
  const [patientId, setPatientId] = useState<number | ''>('');
  const [totalAmount, setTotalAmount] = useState<number>(100.0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: bills, isLoading } = useQuery({
    queryKey: ['billing', statusFilter],
    queryFn: () => billingApi.getAll(statusFilter || undefined),
    placeholderData: (previousData) => previousData,
  });

  const { data: stats } = useQuery({
    queryKey: ['financialStats'],
    queryFn: billingApi.getStats,
  });

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsApi.getAll(),
  });

  const createBillMutation = useMutation({
    mutationFn: billingApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['financialStats'] });
      setIsCreateModalOpen(false);
      setPatientId('');
      setTotalAmount(100.0);
      setPaymentStatus('PENDING');
    },
  });

  const patchBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BillingType> }) =>
      billingApi.patch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['financialStats'] });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: billingApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['financialStats'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    createBillMutation.mutate({
      patient_id: Number(patientId),
      total_amount: Number(totalAmount),
      payment_status: paymentStatus,
      date: billDate,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-pharmacy-teal-600" />
            Pharmacy Accounting & Billing Ledgers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Accounts receivable, patient invoices, and revenue tracking. Click any cell to inline edit.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Issue New Invoice
        </button>
      </div>

      {/* Accounting KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Cash Revenue"
          value={`${currency}${stats?.total_revenue.toFixed(2) || '0.00'}`}
          subtitle={`${stats?.paid_invoices_count || 0} paid invoices`}
          variant="mint"
          icon={<DollarSign className="w-6 h-6" />}
        />
        <StatCard
          title="Pending Receivables"
          value={`${currency}${stats?.pending_amount.toFixed(2) || '0.00'}`}
          subtitle={`${stats?.pending_invoices_count || 0} unpaid balances`}
          variant="coral"
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Total Invoices Issued"
          value={stats?.total_invoices_count || 0}
          subtitle="All transactions"
          variant="teal"
          icon={<Receipt className="w-6 h-6" />}
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        {['', 'PAID', 'PENDING', 'REFUNDED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === st
                ? 'bg-pharmacy-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === '' ? 'All Invoices' : st}
          </button>
        ))}
      </div>

      {/* Billing Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">Invoice #</th>
                <th className="p-3.5">Billed Patient</th>
                <th className="p-3.5 text-right">Amount (Inline Edit)</th>
                <th className="p-3.5 text-center">Payment Status (Inline Edit)</th>
                <th className="p-3.5">Invoice Date</th>
                <th className="p-3.5 text-right pr-5">Invoice & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !bills ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Loading financial ledger...
                  </td>
                </tr>
              ) : bills && bills.length > 0 ? (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-xs font-bold text-slate-500">
                      INV-{bill.id.toString().padStart(6, '0')}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-900">
                      {bill.patient?.name || `Patient #${bill.patient_id}`}
                      <span className="block text-[11px] text-slate-400 font-mono">
                        {bill.patient?.contact}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      <EditableCell
                        value={bill.total_amount}
                        type="number"
                        prefix={currency}
                        onSave={async (val) => {
                          await patchBillMutation.mutateAsync({ id: bill.id, data: { total_amount: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 text-center">
                      <EditableCell
                        value={bill.payment_status}
                        type="select"
                        options={[
                          { label: 'PAID', value: 'PAID' },
                          { label: 'PENDING', value: 'PENDING' },
                          { label: 'REFUNDED', value: 'REFUNDED' },
                        ]}
                        badgeColors={{
                          PAID: 'bg-emerald-100 text-emerald-800',
                          PENDING: 'bg-amber-100 text-amber-800',
                          REFUNDED: 'bg-rose-100 text-rose-800',
                        }}
                        onSave={async (newStatus) => {
                          await patchBillMutation.mutateAsync({ id: bill.id, data: { payment_status: newStatus } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 font-mono text-xs">
                      <EditableCell
                        value={bill.date}
                        type="date"
                        onSave={async (val) => {
                          await patchBillMutation.mutateAsync({ id: bill.id, data: { date: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 text-right pr-5 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedBillForPrint(bill)}
                        title="Print Invoice / Bill to PDF"
                        className="px-3 py-1.5 text-xs font-semibold text-pharmacy-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Invoice (PDF)
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this billing invoice?')) {
                            deleteBillMutation.mutate(bill.id);
                          }
                        }}
                        title="Delete Invoice"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No billing records found for this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Generate Pharmacy Invoice</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Patient</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                >
                  <option value="">-- Select Patient --</option>
                  {patients?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Total Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Invoice Date</label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBillMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-xl shadow-xs"
                >
                  {createBillMutation.isPending ? 'Generating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print PDF Modal */}
      {selectedBillForPrint && (
        <PrintModal
          isOpen={Boolean(selectedBillForPrint)}
          onClose={() => setSelectedBillForPrint(null)}
          title={`Pharmacy Tax Invoice: INV-${selectedBillForPrint.id}`}
          type="invoice"
          data={selectedBillForPrint}
        />
      )}
    </div>
  );
};
