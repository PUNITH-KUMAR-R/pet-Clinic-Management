import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemType: 'doctor' | 'pet' | 'appointment';
  itemName: string;
  onConfirmPermanent: () => void;
  onConfirmMoveToTrash: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  itemType,
  itemName,
  onConfirmPermanent,
  onConfirmMoveToTrash,
  onCancel,
  isDeleting = false
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const typeLabels = {
    doctor: 'Doctor / Specialist',
    pet: 'Pet Profile',
    appointment: 'Appointment Booking'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transition-all transform scale-100"
        id="delete-confirm-modal"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Delete Confirmation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {typeLabels[itemType]}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px] mb-1">Target Item</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{itemName}</span>
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Do you want to permanently delete this {itemType}?
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            • <strong className="text-amber-600 dark:text-amber-400">Move to Trash (Deleted Data)</strong>: Stores this item in the <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">trash.json</code> file. You can view, restore, or purge it anytime in the Deleted Data manager.
            <br />
            • <strong className="text-red-600 dark:text-red-400">Permanently Delete</strong>: Destroys this item immediately from memory and storage without recovering.
          </p>
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors order-3 sm:order-1"
          >
            Cancel
          </button>

          <button
            onClick={onConfirmMoveToTrash}
            disabled={isDeleting}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm order-1 sm:order-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Move to Trash (Deleted Data)</span>
          </button>

          <button
            onClick={onConfirmPermanent}
            disabled={isDeleting}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm order-2 sm:order-3"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Permanently Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
