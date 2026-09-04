import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, Plus, Printer, Trash2, X } from 'lucide-react';
import { doctorsApi } from '../api/endpoints';
import { Doctor, DoctorProfile } from '../types';
import { EditableCell } from '../components/EditableCell';
import { PrintModal } from '../components/PrintModal';

export const Doctors: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDoctorForPrint, setSelectedDoctorForPrint] = useState<DoctorProfile | null>(null);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Form state
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [contact, setContact] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const { data: doctors, isLoading, isFetching } = useQuery({
    queryKey: ['doctors', debouncedSearch],
    queryFn: () => doctorsApi.getAll(debouncedSearch),
    placeholderData: (previousData) => previousData,
  });

  const createDoctorMutation = useMutation({
    mutationFn: doctorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setIsCreateModalOpen(false);
      setName('');
      setSpecialization('');
      setContact('');
      setLicenseNumber('');
    },
  });

  const patchDoctorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Doctor> }) =>
      doctorsApi.patch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: doctorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDoctorMutation.mutate({
      name,
      specialization,
      contact,
      license_number: licenseNumber,
    });
  };

  const handlePrintProfile = async (id: number) => {
    try {
      const fullProfile = await doctorsApi.getById(id);
      setSelectedDoctorForPrint(fullProfile);
    } catch (err) {
      console.error('Failed to load doctor profile for printing', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-pharmacy-teal-600" />
            Physicians & Medical Specialists
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered clinicians and licensing records. Click any cell to inline edit.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by doctor name, specialty, or license number..."
          className="w-full text-sm outline-none bg-transparent placeholder-slate-400"
        />
        {isFetching && (
          <div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin shrink-0" />
        )}
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">ID</th>
                <th className="p-3.5">Doctor Name (Inline Edit)</th>
                <th className="p-3.5">Specialization</th>
                <th className="p-3.5">License Number</th>
                <th className="p-3.5">Telephone</th>
                <th className="p-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !doctors ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Loading doctors roster...
                  </td>
                </tr>
              ) : doctors && doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-xs text-slate-400 font-semibold">
                      #{doctor.id}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-900">
                      <EditableCell
                        value={doctor.name}
                        onSave={async (val) => {
                          await patchDoctorMutation.mutateAsync({ id: doctor.id, data: { name: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 text-pharmacy-teal-800 font-medium">
                      <EditableCell
                        value={doctor.specialization}
                        onSave={async (val) => {
                          await patchDoctorMutation.mutateAsync({ id: doctor.id, data: { specialization: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 font-mono text-xs text-slate-600">
                      <EditableCell
                        value={doctor.license_number}
                        onSave={async (val) => {
                          await patchDoctorMutation.mutateAsync({ id: doctor.id, data: { license_number: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 font-mono text-xs">
                      <EditableCell
                        value={doctor.contact}
                        onSave={async (val) => {
                          await patchDoctorMutation.mutateAsync({ id: doctor.id, data: { contact: val } });
                        }}
                      />
                    </td>

                    <td className="p-3.5 text-right pr-5 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handlePrintProfile(doctor.id)}
                        title="Print Doctor Profile to PDF"
                        className="p-1.5 text-slate-500 hover:text-pharmacy-teal-600 hover:bg-teal-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        PDF Profile
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete doctor "${doctor.name}"?`)) {
                            deleteDoctorMutation.mutate(doctor.id);
                          }
                        }}
                        title="Delete Doctor"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No physicians found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Doctor Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Register Medical Doctor</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor Name & Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Catherine Bell, MD"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Specialization</label>
                <input
                  type="text"
                  required
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiology, Pediatrics, Oncology..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">License Number</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="MD-NY-12345"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
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
                  disabled={createDoctorMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-xl shadow-xs"
                >
                  {createDoctorMutation.isPending ? 'Saving...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print PDF Modal */}
      {selectedDoctorForPrint && (
        <PrintModal
          isOpen={Boolean(selectedDoctorForPrint)}
          onClose={() => setSelectedDoctorForPrint(null)}
          title={`Doctor Profile: ${selectedDoctorForPrint.name}`}
          type="doctor"
          data={selectedDoctorForPrint}
        />
      )}
    </div>
  );
};
