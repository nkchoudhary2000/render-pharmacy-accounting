import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Pill, Plus, AlertTriangle, Clock, Trash2, X } from 'lucide-react';
import { medicinesApi } from '../api/endpoints';
import { Medicine } from '../types';
import { EditableCell } from '../components/EditableCell';
import { useAuth } from '../context/AuthContext';

export const Inventory: React.FC = () => {
  const queryClient = useQueryClient();
  const { currency } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Debounce search keystrokes to prevent UI lag and network thrashing
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Form state
  const [name, setName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number>(50);
  const [price, setPrice] = useState<number>(15.0);
  const [location, setLocation] = useState('Aisle 1 - Shelf A');

  const { data: medicines, isLoading, isFetching } = useQuery({
    queryKey: ['medicines', debouncedSearch, lowStockFilter, expiringFilter],
    queryFn: () =>
      medicinesApi.getAll({
        search: debouncedSearch || undefined,
        low_stock: lowStockFilter || undefined,
        expiring_soon: expiringFilter || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createMedicineMutation = useMutation({
    mutationFn: medicinesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockMedicines'] });
      setIsCreateModalOpen(false);
      setName('');
      setBatchNumber('');
      setExpiryDate('');
      setStockQuantity(50);
      setPrice(15.0);
      setLocation('Aisle 1 - Shelf A');
    },
  });

  const patchMedicineMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Medicine> }) =>
      medicinesApi.patch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockMedicines'] });
    },
  });

  const deleteMedicineMutation = useMutation({
    mutationFn: medicinesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockMedicines'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMedicineMutation.mutate({
      name,
      batch_number: batchNumber,
      expiry_date: expiryDate,
      stock_quantity: Number(stockQuantity),
      price: Number(price),
      location,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-pharmacy-teal-600" />
            Medicines & Pharmacy Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time drug inventory and stock control. Click any cell to inline edit.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 shadow-sm transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Medicine Item
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine name, batch, or storage aisle..."
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shrink-0 ${
              lowStockFilter
                ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock (&le;15)
          </button>

          <button
            onClick={() => setExpiringFilter(!expiringFilter)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shrink-0 ${
              expiringFilter
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Expiring (&le;60d)
          </button>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                <th className="p-3.5 pl-5">ID</th>
                <th className="p-3.5">Medicine Name (Inline Edit)</th>
                <th className="p-3.5">Batch #</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5">Unit Price</th>
                <th className="p-3.5">Storage Location</th>
                <th className="p-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !medicines ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : medicines && medicines.length > 0 ? (
                medicines.map((med) => {
                  const isLowStock = med.stock_quantity <= 15;
                  const expiry = new Date(med.expiry_date);
                  const daysToExpiry = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysToExpiry <= 60;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-xs text-slate-400 font-semibold">
                        #{med.id}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-900">
                        <EditableCell
                          value={med.name}
                          onSave={async (val) => {
                            await patchMedicineMutation.mutateAsync({ id: med.id, data: { name: val } });
                          }}
                        />
                      </td>

                      <td className="p-3.5 font-mono text-xs text-slate-600">
                        <EditableCell
                          value={med.batch_number}
                          onSave={async (val) => {
                            await patchMedicineMutation.mutateAsync({ id: med.id, data: { batch_number: val } });
                          }}
                        />
                      </td>

                      <td className="p-3.5 font-mono text-xs">
                        <span className={isExpiringSoon ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                          <EditableCell
                            value={med.expiry_date}
                            type="date"
                            onSave={async (val) => {
                              await patchMedicineMutation.mutateAsync({ id: med.id, data: { expiry_date: val } });
                            }}
                          />
                        </span>
                        {isExpiringSoon && (
                          <span className="block text-[10px] text-amber-600 font-semibold">
                            {daysToExpiry > 0 ? `${daysToExpiry}d left` : 'Expired'}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={isLowStock ? 'text-rose-600 font-black' : 'text-slate-900 font-bold'}>
                          <EditableCell
                            value={med.stock_quantity}
                            type="number"
                            suffix=" units"
                            onSave={async (val) => {
                              await patchMedicineMutation.mutateAsync({ id: med.id, data: { stock_quantity: val } });
                            }}
                          />
                        </span>
                        {isLowStock && (
                          <span className="inline-block ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                            Reorder
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-slate-900">
                        <EditableCell
                          value={med.price}
                          type="number"
                          prefix={currency}
                          onSave={async (val) => {
                            await patchMedicineMutation.mutateAsync({ id: med.id, data: { price: val } });
                          }}
                        />
                      </td>

                      <td className="p-3.5 text-xs text-slate-600">
                        <EditableCell
                          value={med.location}
                          onSave={async (val) => {
                            await patchMedicineMutation.mutateAsync({ id: med.id, data: { location: val } });
                          }}
                        />
                      </td>

                      <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete medicine item "${med.name}"?`)) {
                              deleteMedicineMutation.mutate(med.id);
                            }
                          }}
                          title="Delete Medicine"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Medicine Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Add New Medicine to Inventory</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Drug Name & Strength</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ciprofloxacin 500mg Tablets"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="CIP-2025-01"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Stock (Units)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Retail Price ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Storage Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Aisle 1 - Shelf B"
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
                  disabled={createMedicineMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 rounded-xl shadow-xs"
                >
                  {createMedicineMutation.isPending ? 'Saving...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
