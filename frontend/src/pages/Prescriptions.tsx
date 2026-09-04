import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Plus, Printer, Trash2, X, PlusCircle, MinusCircle } from 'lucide-react';
import { prescriptionsApi, patientsApi, doctorsApi, medicinesApi } from '../api/endpoints';
import { Prescription, PrescriptionItem } from '../types';
import { PrintModal } from '../components/PrintModal';

export const Prescriptions: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<Prescription | null>(null);

  // Form state
  const [patientId, setPatientId] = useState<number | ''>('');
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [rxDate, setRxDate] = useState(new Date().toISOString().slice(0, 10));
  const [medicationItems, setMedicationItems] = useState<PrescriptionItem[]>([
    { medicine_name: '', dosage: '1 tablet', frequency: 'Twice daily', duration: '7 days', instructions: 'Take after food' },
  ]);

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: prescriptionsApi.getAll,
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

  const { data: medicines } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => medicinesApi.getAll(),
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: prescriptionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setIsCreateModalOpen(false);
      setPatientId('');
      setDoctorId('');
      setMedicationItems([
        { medicine_name: '', dosage: '1 tablet', frequency: 'Twice daily', duration: '7 days', instructions: 'Take after food' },
      ]);
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: prescriptionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });

  const handleAddItem = () => {
    setMedicationItems([
      ...medicationItems,
      { medicine_name: '', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', instructions: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (medicationItems.length > 1) {
      setMedicationItems(medicationItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    const updated = [...medicationItems];
    updated[index][field] = value;
    setMedicationItems(updated);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId) return;

    createPrescriptionMutation.mutate({
      patient_id: Number(patientId),
      doctor_id: Number(doctorId),
      details: JSON.stringify(medicationItems),
      date: rxDate,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-pharmacy-teal-600" />
            Clinical Prescriptions & Medication Orders (Rx)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Doctor prescribed medication regimens. Generate official printable Rx slips with 1-click PDF export.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Write Prescription
        </button>
      </div>

      {/* Prescriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">Rx ID</th>
                <th className="p-3.5">Patient Name</th>
                <th className="p-3.5">Prescribing Physician</th>
                <th className="p-3.5">Prescribed Medicines</th>
                <th className="p-3.5">Issue Date</th>
                <th className="p-3.5 text-right pr-5">Print / Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !prescriptions ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Loading clinical prescriptions...
                  </td>
                </tr>
              ) : prescriptions && prescriptions.length > 0 ? (
                prescriptions.map((rx) => {
                  let items: PrescriptionItem[] = [];
                  try {
                    items = JSON.parse(rx.details);
                  } catch {
                    items = [];
                  }

                  return (
                    <tr key={rx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-xs font-bold text-pharmacy-teal-800">
                        Rx #{rx.id.toString().padStart(5, '0')}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-900">
                        {rx.patient?.name || `Patient #${rx.patient_id}`}
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <span className="font-medium">{rx.doctor?.name || `Doctor #${rx.doctor_id}`}</span>
                        <span className="block text-[11px] text-slate-400 font-mono">
                          {rx.doctor?.license_number}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-sm">
                        {Array.isArray(items) && items.length > 0 ? (
                          <div className="space-y-1">
                            {items.map((it, i) => (
                              <div key={i} className="text-xs flex items-center gap-1.5 text-slate-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-pharmacy-teal-500"></span>
                                <span className="font-semibold">{it.medicine_name}</span>
                                <span className="text-slate-400 text-[11px]">({it.dosage} • {it.frequency})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 truncate">{rx.details}</p>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-xs text-slate-500">
                        {new Date(rx.date).toLocaleDateString()}
                      </td>

                      <td className="p-3.5 text-right pr-5 space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRxForPrint(rx)}
                          className="px-3 py-1.5 text-xs font-semibold text-pharmacy-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Rx (PDF)
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this prescription record?')) {
                              deletePrescriptionMutation.mutate(rx.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No prescriptions issued yet. Click "Write Prescription" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Prescription Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Write Official Clinical Prescription</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                        {p.name} (#{p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prescribing Physician</label>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prescription Date</label>
                <input
                  type="date"
                  required
                  value={rxDate}
                  onChange={(e) => setRxDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              {/* Medication Line Item Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Medication Regimen Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-pharmacy-teal-600 hover:text-pharmacy-teal-700 inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>

                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {medicationItems.map((item, index) => (
                    <div key={index} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500 uppercase">Item #{index + 1}</span>
                        {medicationItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase">Drug Name</label>
                          <input
                            type="text"
                            required
                            list="medicineList"
                            value={item.medicine_name}
                            onChange={(e) => handleItemChange(index, 'medicine_name', e.target.value)}
                            placeholder="e.g. Amoxicillin 500mg"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-pharmacy-teal-500"
                          />
                          <datalist id="medicineList">
                            {medicines?.map((m) => (
                              <option key={m.id} value={m.name} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase">Dosage</label>
                          <input
                            type="text"
                            required
                            value={item.dosage}
                            onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                            placeholder="e.g. 1 capsule, 10ml"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-pharmacy-teal-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase">Frequency</label>
                          <input
                            type="text"
                            required
                            value={item.frequency}
                            onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                            placeholder="e.g. Twice daily"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-pharmacy-teal-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase">Duration</label>
                          <input
                            type="text"
                            required
                            value={item.duration}
                            onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                            placeholder="e.g. 10 days"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-pharmacy-teal-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase">Special Instructions</label>
                          <input
                            type="text"
                            value={item.instructions || ''}
                            onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                            placeholder="e.g. With food"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-pharmacy-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  disabled={createPrescriptionMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-xl shadow-xs"
                >
                  {createPrescriptionMutation.isPending ? 'Issuing...' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print PDF Modal */}
      {selectedRxForPrint && (
        <PrintModal
          isOpen={Boolean(selectedRxForPrint)}
          onClose={() => setSelectedRxForPrint(null)}
          title={`Prescription: Rx #${selectedRxForPrint.id}`}
          type="prescription"
          data={selectedRxForPrint}
        />
      )}
    </div>
  );
};
