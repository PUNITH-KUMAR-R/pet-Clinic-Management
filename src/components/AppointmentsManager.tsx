import React, { useState } from 'react';
import { Calendar, Clock, Edit2, Trash2, Heart, AlertCircle, Sparkles, Check, CheckCircle2, XCircle, Trash } from 'lucide-react';
import { Appointment, Pet, Doctor } from '../types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface AppointmentsManagerProps {
  appointments: Appointment[];
  pets: Pet[];
  doctors: Doctor[];
  onRefresh: () => void;
}

export default function AppointmentsManager({ appointments, pets, doctors, onRefresh }: AppointmentsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

  // Form fields
  const [petId, setPetId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('Scheduled');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setPetId('');
    setDoctorId('');
    setDate('');
    setTime('');
    setReason('');
    setNotes('');
    setStatus('Scheduled');
    setError(null);
  };

  const startEdit = (apt: Appointment) => {
    setEditingApt(apt);
    setPetId(apt.petId);
    setDoctorId(apt.doctorId);
    setDate(apt.date);
    setTime(apt.time);
    setReason(apt.reason);
    setNotes(apt.notes || '');
    setStatus(apt.status);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!petId || !doctorId || !date || !time || !reason.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      petId,
      doctorId,
      date,
      time,
      reason,
      notes,
      status
    };

    try {
      const url = editingApt ? `/api/appointments/${editingApt.id}` : '/api/appointments';
      const method = editingApt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingApt ? 'Appointment schedule updated successfully!' : 'New appointment booked successfully!');
        resetForm();
        setShowForm(false);
        setEditingApt(null);
        onRefresh();
      } else {
        // Here we catch automated validation and double-booking blocks from the Express API!
        setError(data.error || 'Failed to book appointment.');
      }
    } catch (err) {
      setError('Unable to reach backend services. Try again.');
    }
  };

  const [deletingApt, setDeletingApt] = useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmPermanentDelete = async () => {
    if (!deletingApt) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/appointments/${deletingApt.id}?permanent=true`, { method: 'DELETE' });
      if (response.ok) {
        setSuccess('Appointment permanently deleted.');
        onRefresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete appointment.');
      }
    } catch (err) {
      setError('Unable to reach backend services.');
    } finally {
      setIsDeleting(false);
      setDeletingApt(null);
    }
  };

  const handleConfirmMoveToTrash = async () => {
    if (!deletingApt) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/appointments/${deletingApt.id}?permanent=false`, { method: 'DELETE' });
      if (response.ok) {
        setSuccess('Appointment moved to Trash / Deleted Data (trash.json).');
        onRefresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to move appointment to trash.');
      }
    } catch (err) {
      setError('Unable to reach backend services.');
    } finally {
      setIsDeleting(false);
      setDeletingApt(null);
    }
  };

  return (
    <div className="space-y-6" id="appointments-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Clinic Appointment Scheduling</h3>
          <p className="text-xs text-slate-500">Automated doctor availability check, scheduling conflict notifications, and booking managers.</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
              setEditingApt(null);
              setShowForm(false);
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors duration-150 shadow-sm"
        >
          {showForm ? <span className="flex items-center space-x-1"><Calendar className="w-3.5 h-3.5" /><span>View Bookings</span></span> : <span className="flex items-center space-x-1"><Sparkles className="w-3.5 h-3.5" /><span>Schedule Booking</span></span>}
        </button>
      </div>

      {/* Action status feedbacks */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start space-x-2.5">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-bold block">Scheduling Conflict Blocked</span>
            <p className="leading-relaxed">{error}</p>
            <p className="text-[10px] text-rose-700 font-medium">💡 Try using the **AI Clinic Co-Pilot** chat at the bottom to find valid times or alternative doctors!</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Booking Form Overlay */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
            {editingApt ? 'Reschedule Appointment' : 'Book New Vet Appointment'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Patient (Pet) *</label>
                <select
                  required
                  value={petId}
                  onChange={(e) => setPetId(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                >
                  <option value="">-- Select Registered Pet --</option>
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.breed} - {p.ownerName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Doctor *</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                >
                  <option value="">-- Select Specialist --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Reason for Visit *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Skin scratching, vaccine, suture check"
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Time *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Add Notes / Observations</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any symptoms, weight changes, or pre-visit instructions..."
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                />
              </div>

              {editingApt && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Appointment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Appointment['status'])}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Quick Doctor availability reminders */}
          {doctorId && (
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-800">
              <strong>Availability Note:</strong> {doctors.find(d => d.id === doctorId)?.name} is available on{' '}
              <strong>{doctors.find(d => d.id === doctorId)?.workingDays.join(', ')}</strong> (
              {doctors.find(d => d.id === doctorId)?.workingHours.start} - {doctors.find(d => d.id === doctorId)?.workingHours.end}
              ). Double bookings are blocked automatically.
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingApt(null);
                setShowForm(false);
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingApt ? 'Reschedule Visit' : 'Schedule Appointment'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Appointment Listings */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Patient (Pet)</th>
                <th className="p-4">Doctor</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Reason for Visit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {appointments.map((apt) => {
                const pet = pets.find(p => p.id === apt.petId);
                const doctor = doctors.find(d => d.id === apt.doctorId);
                return (
                  <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{pet?.name || 'Unknown Pet'}</div>
                      <div className="text-[10px] text-slate-400">{pet?.breed} • {pet?.ownerName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{doctor?.name || 'Unknown Doctor'}</div>
                      <div className="text-[10px] text-teal-600 font-medium">{doctor?.specialty}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.date}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.time}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{apt.reason}</div>
                      {apt.notes && <div className="text-[10px] text-slate-400 italic">"{apt.notes}"</div>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        apt.status === 'Scheduled' ? 'bg-sky-50 text-sky-800 border border-sky-100' :
                        apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => startEdit(apt)}
                          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-teal-600 hover:border-teal-500 transition-colors duration-150 cursor-pointer bg-white"
                          title="Reschedule / Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingApt(apt)}
                          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-rose-600 hover:border-rose-500 transition-colors duration-150 cursor-pointer bg-white"
                          title="Delete Appointment"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No veterinary visits booked yet. Click "Schedule Booking" to schedule your first.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deletingApt)}
        itemType="appointment"
        itemName={deletingApt ? `Appointment on ${deletingApt.date} at ${deletingApt.time}` : ''}
        onConfirmPermanent={handleConfirmPermanentDelete}
        onConfirmMoveToTrash={handleConfirmMoveToTrash}
        onCancel={() => setDeletingApt(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
