import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Printer, Trash2, Users, FileText, Check, X } from 'lucide-react';
import { patientsApi } from '../api/endpoints';
import { Patient, PatientProfile } from '../types';
import { EditableCell } from '../components/EditableCell';
import { PrintModal } from '../components/PrintModal';

export const Patients: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPatientForPrint, setSelectedPatientForPrint] = useState<PatientProfile | null>(null);

  // Debounce search keystrokes to prevent network thrashing
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Form state
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState<number>(30);
  const [newGender, setNewGender] = useState('Female');
  const [newContact, setNewContact] = useState('');
  const [newHistory, setNewHistory] = useState('');

  const { data: patients, isLoading, isFetching } = useQuery({
    queryKey: ['patients', debouncedSearch],
    queryFn: () => patientsApi.getAll(debouncedSearch),
    placeholderData: (previousData) => previousData,
  });

  const createPatientMutation = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsCreateModalOpen(false);
      setNewName('');
      setNewAge(30);
      setNewGender('Female');
      setNewContact('');
      setNewHistory('');
    },
  });

  const patchPatientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Patient> }) =>
      patientsApi.patch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: patientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPatientMutation.mutate({
      name: newName,
      age: Number(newAge),
      gender: newGender,
      contact: newContact,
      medical_history: newHistory,
    });
  };

  const handlePrintProfile = async (id: number) => {
    try {
      const fullProfile = await patientsApi.getById(id);
      setSelectedPatientForPrint(fullProfile);
    } catch (err) {
      console.error('Failed to load patient profile for printing', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-pharmacy-teal-600" />
            Patient Records & Clinical Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Click any cell to edit details inline. Hit Enter or blur to save automatically.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-colors active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Add New Patient
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by patient name, contact number, or keyword..."
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

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">ID</th>
                <th className="p-3.5">Full Name (Inline Edit)</th>
                <th className="p-3.5">Age</th>
                <th className="p-3.5">Gender</th>
                <th className="p-3.5">Contact Number</th>
                <th className="p-3.5">Medical History & Allergies</th>
                <th className="p-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !patients ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Loading patients directory...
                  </td>
                </tr>
              ) : patients && patients.length > 0 ? (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-xs text-slate-400 font-semibold">
                      #{patient.id}
                    </td>

                    {/* Name Inline Edit */}
                    <td className="p-3.5 font-semibold text-slate-900">
                      <EditableCell
                        value={patient.name}
                        onSave={async (val) => {
                          await patchPatientMutation.mutateAsync({ id: patient.id, data: { name: val } });
                        }}
                      />
                    </td>

                    {/* Age Inline Edit */}
                    <td className="p-3.5">
                      <EditableCell
                        value={patient.age}
                        type="number"
                        suffix=" yrs"
                        onSave={async (val) => {
                          await patchPatientMutation.mutateAsync({ id: patient.id, data: { age: val } });
                        }}
                      />
                    </td>

                    {/* Gender Inline Edit */}
                    <td className="p-3.5">
                      <EditableCell
                        value={patient.gender}
                        type="select"
                        options={[
                          { label: 'Female', value: 'Female' },
                          { label: 'Male', value: 'Male' },
                          { label: 'Other', value: 'Other' },
                        ]}
                        onSave={async (val) => {
                          await patchPatientMutation.mutateAsync({ id: patient.id, data: { gender: val } });
                        }}
                      />
                    </td>

                    {/* Contact Inline Edit */}
                    <td className="p-3.5 font-mono text-xs">
                      <EditableCell
                        value={patient.contact}
                        onSave={async (val) => {
                          await patchPatientMutation.mutateAsync({ id: patient.id, data: { contact: val } });
                        }}
                      />
                    </td>

                    {/* Medical History Inline Edit */}
                    <td className="p-3.5 max-w-xs truncate text-xs text-slate-600">
                      <EditableCell
                        value={patient.medical_history || ''}
                        placeholder="Add medical history..."
                        onSave={async (val) => {
                          await patchPatientMutation.mutateAsync({ id: patient.id, data: { medical_history: val } });
                        }}
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right pr-5 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handlePrintProfile(patient.id)}
                        title="Print Patient Profile to PDF"
                        className="p-1.5 text-slate-500 hover:text-pharmacy-teal-600 hover:bg-teal-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        PDF Profile
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete patient "${patient.name}"?`)) {
                            deletePatientMutation.mutate(patient.id);
                          }
                        }}
                        title="Delete Patient"
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
                    No patients found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Patient Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Register New Patient</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={150}
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Medical History / Allergies</label>
                <textarea
                  rows={3}
                  value={newHistory}
                  onChange={(e) => setNewHistory(e.target.value)}
                  placeholder="Chronic conditions, known drug allergies (e.g., Penicillin sensitive)..."
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
                  disabled={createPatientMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-xl shadow-xs"
                >
                  {createPatientMutation.isPending ? 'Saving...' : 'Create Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print PDF Modal */}
      {selectedPatientForPrint && (
        <PrintModal
          isOpen={Boolean(selectedPatientForPrint)}
          onClose={() => setSelectedPatientForPrint(null)}
          title={`Patient Record: ${selectedPatientForPrint.name}`}
          type="patient"
          data={selectedPatientForPrint}
        />
      )}
    </div>
  );
};
