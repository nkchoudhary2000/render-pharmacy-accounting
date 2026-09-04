import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign, AlertTriangle, Users, Pill, Calendar,
  ArrowUpRight, Clock, Plus, CheckCircle2, FileText
} from 'lucide-react';
import { dashboardApi, billingApi, appointmentsApi } from '../api/endpoints';
import { StatCard } from '../components/StatCard';
import { EditableCell } from '../components/EditableCell';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { currency } = useAuth();

  // High-performance single-request dashboard summary
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
  });

  const stats = dashboardData?.stats;
  const lowStockMedicines = dashboardData?.low_stock_medicines;
  const recentAppointments = dashboardData?.recent_appointments;
  const recentBills = dashboardData?.recent_bills;
  const patients = dashboardData?.patients;

  // Inline PATCH mutation for bill status
  const updateBillStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      billingApi.patch(id, { payment_status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentBills'] });
      queryClient.invalidateQueries({ queryKey: ['financialStats'] });
    },
  });

  // Inline PATCH mutation for appointment status
  const updateAppStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      appointmentsApi.patch(id, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentAppointments'] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pharmacy-teal-500/20 text-pharmacy-teal-300 border border-pharmacy-teal-400/30 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pharmacy Operations Center
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Pharmacy & Accounting Ledger
            </h1>
            <p className="text-sm text-teal-100/80 mt-1 max-w-xl">
              Track real-time inventory balances, patient treatments, and financial cash flow with inline editing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/prescriptions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-teal-50 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-pharmacy-teal-600" />
              New Prescription
            </Link>
            <Link
              to="/billing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-pharmacy-coral-600 hover:bg-pharmacy-coral-700 text-white shadow-md shadow-rose-900/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Issue Bill / Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Cash Revenue"
          value={`${currency}${stats?.total_revenue.toFixed(2) || '0.00'}`}
          subtitle={`${stats?.paid_invoices_count || 0} invoices settled`}
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
          title="Registered Patients"
          value={patients?.length || 0}
          subtitle="Active profiles recorded"
          variant="teal"
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="Low Stock Warnings"
          value={lowStockMedicines?.length || 0}
          subtitle="Inventory <= 15 units"
          variant={lowStockMedicines && lowStockMedicines.length > 0 ? 'crimson' : 'slate'}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
      </div>

      {/* Low Stock Attention Alert */}
      {lowStockMedicines && lowStockMedicines.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-rose-950 text-sm">Critical Inventory Alert: Low Stock Detected</h3>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
            >
              Manage Inventory <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockMedicines.slice(0, 3).map((med) => (
              <div key={med.id} className="p-3 bg-white rounded-xl border border-rose-100 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">{med.name}</p>
                  <p className="text-slate-400 text-[11px]">Batch: {med.batch_number}</p>
                </div>
                <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 font-black">
                  {med.stock_quantity} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Grid: Recent Invoices & Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Invoices with Inline Status Edit */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recent Ledger Invoices</h3>
              <p className="text-xs text-slate-500">Click status to toggle inline (PAID / PENDING)</p>
            </div>
            <Link to="/billing" className="text-xs font-bold text-pharmacy-teal-600 hover:text-pharmacy-teal-700">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Patient</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-center">Status (Inline Edit)</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBills && recentBills.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-semibold text-slate-800">
                      {b.patient?.name || `Patient #${b.patient_id}`}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      {currency}{b.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <EditableCell
                        value={b.payment_status}
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
                          await updateBillStatusMutation.mutateAsync({ id: b.id, status: newStatus });
                        }}
                      />
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {new Date(b.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Appointments with Inline Status Edit */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Upcoming Appointments</h3>
              <p className="text-xs text-slate-500">Click status to update consultation state</p>
            </div>
            <Link to="/appointments" className="text-xs font-bold text-pharmacy-teal-600 hover:text-pharmacy-teal-700">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Doctor</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAppointments && recentAppointments.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-semibold text-slate-800">
                      {app.patient?.name || `Patient #${app.patient_id}`}
                    </td>
                    <td className="py-3 text-slate-600">
                      {app.doctor?.name || `Doctor #${app.doctor_id}`}
                    </td>
                    <td className="py-3 text-center">
                      <EditableCell
                        value={app.status}
                        type="select"
                        options={[
                          { label: 'SCHEDULED', value: 'SCHEDULED' },
                          { label: 'COMPLETED', value: 'COMPLETED' },
                          { label: 'CANCELLED', value: 'CANCELLED' },
                          { label: 'NO_SHOW', value: 'NO_SHOW' },
                        ]}
                        badgeColors={{
                          SCHEDULED: 'bg-teal-100 text-teal-800',
                          COMPLETED: 'bg-emerald-100 text-emerald-800',
                          CANCELLED: 'bg-slate-100 text-slate-600',
                          NO_SHOW: 'bg-rose-100 text-rose-800',
                        }}
                        onSave={async (newStatus) => {
                          await updateAppStatusMutation.mutateAsync({ id: app.id, status: newStatus });
                        }}
                      />
                    </td>
                    <td className="py-3 text-right text-slate-500 font-mono text-[11px]">
                      {new Date(app.appointment_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
