import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, ShieldAlert, CheckCircle, RefreshCw, AlertCircle, Calendar, User, Stethoscope, AlertTriangle, X } from 'lucide-react';
import { TrashItem } from '../types';

interface TrashManagerProps {
  onRefreshClinicData: () => void;
}

export default function TrashManager({ onRefreshClinicData }: TrashManagerProps) {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Custom modal states
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/trash');
      if (!res.ok) throw new Error('Failed to load trash data.');
      const data = await res.json();
      setTrashItems(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error connecting to trash storage.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string, itemName: string) => {
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/trash/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`"${itemName}" restored successfully back to active clinic database!`);
        fetchTrash();
        onRefreshClinicData();
      } else {
        setError(data.error || 'Failed to restore item.');
      }
    } catch {
      setError('Failed to reach server.');
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);

    try {
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/trash/${itemToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`"${itemToDelete.itemName}" permanently purged from trash.`);
        fetchTrash();
      } else {
        setError(data.error || 'Failed to delete item.');
      }
    } catch {
      setError('Failed to reach server.');
    } finally {
      setIsProcessing(false);
      setItemToDelete(null);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    setIsProcessing(true);

    try {
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/trash', { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Trash emptied successfully. All items permanently deleted.');
        fetchTrash();
      } else {
        setError('Failed to empty trash.');
      }
    } catch {
      setError('Failed to reach server.');
    } finally {
      setIsProcessing(false);
      setConfirmEmptyTrash(false);
    }
  };

  const getItemBadge = (type: TrashItem['itemType']) => {
    switch (type) {
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
            <Stethoscope className="w-3 h-3" />
            Doctor
          </span>
        );
      case 'pet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
            <User className="w-3 h-3" />
            Pet Profile
          </span>
        );
      case 'appointment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
            <Calendar className="w-3 h-3" />
            Appointment
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" id="trash-manager">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Deleted Data / Trash Bin
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data stored safely in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">trash.json</code> file. Restore items or permanently purge them.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTrash}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Trash</span>
          </button>

          {trashItems.length > 0 && (
            <button
              onClick={() => setConfirmEmptyTrash(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Empty Trash ({trashItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start space-x-3 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start space-x-3 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Trash Items List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
          Loading trash storage...
        </div>
      ) : trashItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl">
          <Trash2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Trash is empty</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            When you choose "Move to Trash" while deleting a doctor, pet, or appointment, it will be stored here safely in <code className="text-teal-600 dark:text-teal-400">trash.json</code>.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Deleted Record</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {trashItems.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {getItemBadge(item.itemType)}
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {item.itemName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center space-x-2">
                    <span>Deleted on: {new Date(item.deletedAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400">ID: {item.id}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleRestore(item.id, item.itemName)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-xs font-semibold cursor-pointer transition-colors border border-teal-200/60 dark:border-teal-800/60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => setItemToDelete(item)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-semibold cursor-pointer transition-colors border border-red-200/60 dark:border-red-800/60"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Permanent Delete Single Item */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Confirm Permanent Deletion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trash Purge</p>
                </div>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isProcessing}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px] mb-1">Target Item</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{itemToDelete.itemName}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this item from trash? It will be removed from <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">trash.json</code> and cannot be recovered.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                disabled={isProcessing}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Empty Trash */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Empty Trash Bin
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bulk Delete</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                disabled={isProcessing}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to empty the trash? All <strong>{trashItems.length}</strong> items in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">trash.json</code> will be permanently destroyed.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmptyTrash}
                disabled={isProcessing}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Emptying...' : 'Empty Entire Trash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
