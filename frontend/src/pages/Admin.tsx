import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, Download, Upload, Users, RefreshCw, Trash2,
  CheckCircle, AlertCircle, Sparkles, Database, AlertTriangle,
  CheckSquare, Square, X, UserCheck, Pill, Calendar, FileSpreadsheet, Receipt
} from 'lucide-react';
import { adminApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const Admin: React.FC = () => {
  const { user: currentAuthUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Table summary for selective wipe
  const {
    data: tablesSummary,
    isLoading: isLoadingTables,
    refetch: refetchTablesSummary,
  } = useQuery({
    queryKey: ['adminTablesSummary'],
    queryFn: adminApi.getTablesSummary,
  });

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeFeedback, setWipeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selection helpers
  const toggleTable = (key: string) => {
    setSelectedTables((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (!tablesSummary) return;
    setSelectedTables(tablesSummary.tables.map((t) => t.key));
  };

  const handleDeselectAll = () => {
    setSelectedTables([]);
  };

  const handleSelectClinical = () => {
    setSelectedTables(['patients', 'doctors', 'medicines', 'appointments', 'prescriptions', 'billing']);
  };

  const handleExecuteWipe = async () => {
    if (selectedTables.length === 0) return;
    if (wipeConfirmInput.trim().toUpperCase() !== 'WIPE') return;

    setIsWiping(true);
    setWipeFeedback(null);

    try {
      const res = await adminApi.wipeDatabase(selectedTables, 'WIPE');
      setWipeFeedback({
        type: 'success',
        text: res.message || `Successfully wiped ${selectedTables.length} table(s)!`,
      });
      setSelectedTables([]);
      setIsWipeModalOpen(false);
      setWipeConfirmInput('');
      await refetchTablesSummary();
      queryClient.invalidateQueries();
    } catch (err: any) {
      setWipeFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to wipe database tables.',
      });
    } finally {
      setIsWiping(false);
    }
  };

  const getTableIcon = (key: string) => {
    switch (key) {
      case 'patients':
        return <Users className="w-4 h-4 text-teal-600" />;
      case 'doctors':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'medicines':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'appointments':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'prescriptions':
        return <FileSpreadsheet className="w-4 h-4 text-amber-600" />;
      case 'billing':
        return <Receipt className="w-4 h-4 text-rose-600" />;
      case 'staff_users':
        return <Users className="w-4 h-4 text-indigo-600" />;
      default:
        return <Database className="w-4 h-4 text-slate-600" />;
    }
  };

  const selectedRecordsCount =
    tablesSummary?.tables
      .filter((t) => selectedTables.includes(t.key))
      .reduce((acc, curr) => acc + curr.count, 0) || 0;

  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminApi.getUsers,
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      adminApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  // Handle backup download
  const handleDownloadBackup = async () => {
    try {
      await adminApi.downloadBackup();
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download database backup');
    }
  };

  // Handle restore file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Are you sure you want to restore database from "${file.name}"? Existing clinical and accounting tables will be replaced by the backup.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreMessage(null);
      const res = await adminApi.restoreBackup(file);
      setRestoreMessage({
        type: 'success',
        text: `Restored successfully! Restored ${res.restored_counts.patients} patients, ${res.restored_counts.medicines} medicines, and ${res.restored_counts.billing} invoices.`
      });
      // Invalidate all app queries to reflect restored state
      queryClient.invalidateQueries();
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Database restoration failed.'
      });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Seed sample data
  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      await adminApi.seedDemoData();
      queryClient.invalidateQueries();
      alert('Demo data populated successfully!');
    } catch (err: any) {
      alert('Seed failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-pharmacy-teal-600" />
          System Administration & Data Vault
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage system users, access roles, database backups, and emergency recovery routines.
        </p>
      </div>

      {/* Database Backup & Restore Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-pharmacy-teal-700 flex items-center justify-center mb-4">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Export Database Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Dumps the complete Neon PostgreSQL database into a structured, downloadable JSON snapshot. Includes all patients, doctors, medicines, prescriptions, and accounting invoices.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleDownloadBackup}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              Download Database Backup (.json)
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Restore Database Snapshot</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload a previously exported JSON backup file to overwrite or recover system state. Operations run inside an atomic database transaction.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Restoring Database...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Restore Backup
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Restore Status Feedback Banner */}
      {restoreMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
            restoreMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {restoreMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{restoreMessage.text}</span>
        </div>
      )}

      {/* Selective Database Wipe & Table Checklist Section */}
      <div className="bg-white rounded-2xl border border-rose-200/80 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-rose-100 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Selective Database Wipe & Reset</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                  Danger Zone
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Check specific tables to purge permanently. Only the selected tables will be erased; unselected tables and Administrator accounts remain safe.
              </p>
            </div>
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleSelectClinical}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              Clinical Only
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Wipe Feedback Message */}
        {wipeFeedback && (
          <div
            className={`mx-5 mt-4 p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
              wipeFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {wipeFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{wipeFeedback.text}</span>
          </div>
        )}

        {/* Table Checklist Grid */}
        <div className="p-5">
          {isLoadingTables ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-pharmacy-teal-600" />
              Scanning database table counts...
            </div>
          ) : tablesSummary && tablesSummary.tables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tablesSummary.tables.map((table) => {
                const isSelected = selectedTables.includes(table.key);

                return (
                  <div
                    key={table.key}
                    onClick={() => toggleTable(table.key)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-400/20 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-rose-100 text-rose-700' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {getTableIcon(table.key)}
                          </div>
                          <span className="font-bold text-xs text-slate-900 tracking-tight">
                            {table.label}
                          </span>
                        </div>

                        {/* Checkbox Icon */}
                        <div className="text-slate-400">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-rose-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {table.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        Current Size
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          table.count > 0
                            ? isSelected
                              ? 'bg-rose-200 text-rose-900'
                              : 'bg-slate-200/80 text-slate-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {table.count} {table.count === 1 ? 'row' : 'rows'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">No table summaries available.</p>
          )}

          {/* Action Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>{selectedTables.length}</strong> of {tablesSummary?.tables.length || 0} tables selected (
                <strong className="text-rose-600 font-mono">{selectedRecordsCount}</strong> records to be purged)
              </span>
            </div>

            <button
              type="button"
              disabled={selectedTables.length === 0}
              onClick={() => {
                setWipeConfirmInput('');
                setIsWipeModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
            >
              <Trash2 className="w-4 h-4" />
              Wipe Selected Tables ({selectedTables.length})
            </button>
          </div>
        </div>
      </div>

      {/* User Role Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pharmacy-teal-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Users & Access Control</h3>
              <p className="text-xs text-slate-500">Configure administrative access roles</p>
            </div>
          </div>

          <button
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {isSeeding ? 'Seeding...' : 'Populate Demo Records'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">User ID</th>
                <th className="p-3.5">Email Address</th>
                <th className="p-3.5">Provider</th>
                <th className="p-3.5">Current Role</th>
                <th className="p-3.5">Registered Date</th>
                <th className="p-3.5 text-right pr-5">Manage Role / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    Loading users list...
                  </td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((u) => {
                  const isCurrent = u.id === currentAuthUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-xs text-slate-400 font-semibold">
                        #{u.id}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-900">
                        {u.email}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                            You
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="text-xs font-mono uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {u.auth_provider}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-3.5 text-right pr-5 space-x-2 whitespace-nowrap">
                        <select
                          value={u.role}
                          disabled={isCurrent}
                          onChange={(e) => {
                            updateRoleMutation.mutate({
                              userId: u.id,
                              role: e.target.value as UserRole,
                            });
                          }}
                          className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-pharmacy-teal-500 disabled:opacity-40"
                        >
                          <option value="STAFF">STAFF</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>

                        {!isCurrent && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete user account ${u.email}?`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            title="Delete User"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Permanent Table Deletion</h3>
                  <p className="text-[11px] text-rose-700 font-semibold">Immediate destructive operation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed">
                <strong>Warning:</strong> This will permanently erase all data in the <strong>{selectedTables.length} selected table(s)</strong>. There is no undo.
              </div>

              {/* List of tables to be deleted */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Tables to be wiped:
                </p>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                  {tablesSummary?.tables
                    .filter((t) => selectedTables.includes(t.key))
                    .map((t) => (
                      <div key={t.key} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          {getTableIcon(t.key)}
                          {t.label}
                        </span>
                        <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {t.count} records
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Type confirmation requirement */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type <strong className="font-mono text-rose-600">WIPE</strong> below to confirm:
                </label>
                <input
                  type="text"
                  value={wipeConfirmInput}
                  onChange={(e) => setWipeConfirmInput(e.target.value)}
                  placeholder="Type WIPE"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase tracking-widest text-center"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wipeConfirmInput.trim().toUpperCase() !== 'WIPE' || isWiping}
                onClick={handleExecuteWipe}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isWiping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Wiping Database...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Wipe ({selectedRecordsCount} records)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
