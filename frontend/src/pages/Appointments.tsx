import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, X } from 'lucide-react';
import { appointmentsApi, patientsApi, doctorsApi } from '../api/endpoints';
import { Appointment, AppointmentStatus } from '../types';
import { EditableCell } from '../components/EditableCell';

export const Appointments: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState<number | ''>('');
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('SCHEDULED');
  const [notes, setNotes] = useState('');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter],
    queryFn: () => appointmentsApi.getAll(statusFilter || undefined),
    placeholderData: (previousData) => previousData,
  });

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsApi.getAll(),
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsApi.getAll(),
  });

  const createAppointmentMutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsCreateModalOpen(false);
      setPatientId('');
      setDoctorId('');
      setAppointmentDate('');
      setStatus('SCHEDULED');
      setNotes('');
    },
  });

  const patchAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Appointment> }) =>
      appointmentsApi.patch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: appointmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !appointmentDate) return;
    createAppointmentMutation.mutate({
      patient_id: Number(patientId),
      doctor_id: Number(doctorId),
      appointment_date: new Date(appointmentDate).toISOString(),
      status,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-pharmacy-teal-600" />
            Clinical Consultations & Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Patient scheduling roster. Click any status badge or notes cell to inline edit.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Schedule Consultation
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        {['', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === st
                ? 'bg-pharmacy-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === '' ? 'All Consultations' : st}
          </button>
        ))}
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">ID</th>
                <th className="p-3.5">Patient</th>
                <th className="p-3.5">Consulting Doctor</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5 text-center">Status (Inline Edit)</th>
                <th className="p-3.5">Clinical Notes</th>
                <th className="p-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !appointments ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments && appointments.length > 0 ? (
                appointments.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-xs text-slate-400 font-semibold">
                      #{app.id}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-900">
                      {app.patient?.name || `Patient #${app.patient_id}`}
                    </td>

                    <td className="p-3.5 text-slate-700">
                      {app.doctor?.name || `Doctor #${app.doctor_id}`}
                      <span className="block text-[11px] text-pharmacy-teal-700">
                        {app.doctor?.specialization}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {new Date(app.appointment_date).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="p-3.5 text-center">
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
                          await patchAppointmentMutation.mutateAsync({ id: app.id, data: { status: newStatus } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 max-w-xs truncate text-xs text-slate-600">
                      <EditableCell
                        value={app.notes || ''}
                        placeholder="Add notes..."
                        onSave={async (val) => {
                          await patchAppointmentMutation.mutateAsync({ id: app.id, data: { notes: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this appointment record?')) {
                            deleteAppointmentMutation.mutate(app.id);
                          }
                        }}
                        title="Delete Appointment"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No appointments recorded for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Appointment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Schedule New Consultation</h3>
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
                  <option value="">-- Choose Patient --</option>
                  {patients?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (ID: #{p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Attending Doctor</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Appointment Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Clinical Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for visit, follow-up tests, symptoms..."
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
                  disabled={createAppointmentMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-xl shadow-xs"
                >
                  {createAppointmentMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
