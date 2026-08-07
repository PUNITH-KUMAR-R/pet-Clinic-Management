import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, Phone, Mail, FileText, UserPlus, X, Check } from 'lucide-react';
import { Doctor } from '../types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface DoctorsManagerProps {
  doctors: Doctor[];
  onRefresh: () => void;
  autoOpenForm?: boolean;
  onFormOpened?: () => void;
}

export default function DoctorsManager({ doctors, onRefresh, autoOpenForm, onFormOpened }: DoctorsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-open add form if requested by parent component
  useEffect(() => {
    if (autoOpenForm) {
      resetForm();
      setEditingDoctor(null);
      setShowAddForm(true);
      if (onFormOpened) {
        onFormOpened();
      }
    }
  }, [autoOpenForm]);

  // Form states
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<Doctor['specialty']>('General Medicine');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('17:00');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const resetForm = () => {
    setName('');
    setSpecialty('General Medicine');
    setEmail('');
    setPhone('');
    setBio('');
    setAvatar('');
    setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setStartHour('09:00');
    setEndHour('17:00');
    setError(null);
  };

  const startEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialty(doc.specialty);
    setEmail(doc.email);
    setPhone(doc.phone);
    setBio(doc.bio);
    setAvatar(doc.avatar);
    setWorkingDays(doc.workingDays);
    setStartHour(doc.workingHours.start);
    setEndHour(doc.workingHours.end);
    setShowAddForm(true);
  };

  const handleDayToggle = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !phone.trim() || !bio.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (workingDays.length === 0) {
      setError('Please select at least one working day.');
      return;
    }

    const payload = {
      name,
      specialty,
      email,
      phone,
      bio,
      avatar: avatar.trim() || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
      workingDays,
      workingHours: {
        start: startHour,
        end: endHour
      }
    };

    try {
      const url = editingDoctor ? `/api/doctors/${editingDoctor.id}` : '/api/doctors';
      const method = editingDoctor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingDoctor ? 'Doctor details updated successfully!' : 'New doctor added successfully!');
        resetForm();
        setShowAddForm(false);
        setEditingDoctor(null);
        onRefresh();
      } else {
        setError(data.error || 'Failed to save doctor.');
      }
    } catch (err: any) {
      setError('Failed to reach server. Please try again.');
    }
  };

  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmPermanentDelete = async () => {
    if (!deletingDoctor) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/doctors/${deletingDoctor.id}?permanent=true`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Doctor "${deletingDoctor.name}" permanently deleted.`);
        onRefresh();
      } else {
        setError(data.error || 'Failed to delete doctor.');
      }
    } catch (err) {
      setError('Failed to reach server.');
    } finally {
      setIsDeleting(false);
      setDeletingDoctor(null);
    }
  };

  const handleConfirmMoveToTrash = async () => {
    if (!deletingDoctor) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/doctors/${deletingDoctor.id}?permanent=false`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Doctor "${deletingDoctor.name}" moved to Trash / Deleted Data (trash.json).`);
        onRefresh();
      } else {
        setError(data.error || 'Failed to move doctor to trash.');
      }
    } catch (err) {
      setError('Failed to reach server.');
    } finally {
      setIsDeleting(false);
      setDeletingDoctor(null);
    }
  };

  return (
    <div className="space-y-6" id="doctors-manager">
      {/* Upper bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Veterinary Specialists</h3>
          <p className="text-xs text-slate-500">Manage practitioner availability, contact information, and specialties.</p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              resetForm();
              setEditingDoctor(null);
              setShowAddForm(false);
            } else {
              resetForm();
              setShowAddForm(true);
            }
          }}
          className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors duration-150 shadow-sm"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? 'Cancel Form' : 'Register Doctor'}</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{success}</span>
        </div>
      )}

      {/* Add / Edit Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
            {editingDoctor ? `Edit Doctor Details: ${editingDoctor.name}` : 'Register New Practitioner'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left side */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Goodall"
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Specialty *</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as Doctor['specialty'])}
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Dentistry">Dentistry</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Behavioral">Behavioral</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dr.jane@clinic.com"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="555-0199"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                />
              </div>
            </div>

            {/* Right side - Scheduling */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Practitioner Bio *</label>
                <textarea
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe doctor qualifications and specialties..."
                  rows={3}
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Weekly Working Days (Availability Grid)</label>
                <div className="flex flex-wrap gap-1.5">
                  {daysOfWeek.map(day => {
                    const isSelected = workingDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition-colors duration-100 cursor-pointer ${
                          isSelected ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Shift Start Hour</label>
                  <input
                    type="time"
                    required
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Shift End Hour</label>
                  <input
                    type="time"
                    required
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingDoctor(null);
                setShowAddForm(false);
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingDoctor ? 'Save Updates' : 'Add Practitioner'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid of Doctors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doc) => (
          <div
            key={doc.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start space-x-4">
              <img
                src={doc.avatar}
                alt={doc.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover bg-slate-100 flex-shrink-0 border border-slate-200 shadow-sm"
              />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{doc.name}</h4>
                  <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-100">
                    {doc.specialty}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{doc.bio}</p>
                <div className="flex flex-col space-y-1 pt-1.5 text-[11px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{doc.email}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{doc.phone}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Availability tags */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-600 flex flex-col space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Working Days:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {daysOfWeek.map(day => {
                  const isAvailable = doc.workingDays.includes(day);
                  return (
                    <span
                      key={day}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        isAvailable ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-300 bg-slate-100/50 line-through'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center space-x-1.5 text-slate-500 pt-1 border-t border-slate-200/50">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Shift Hours: <strong>{doc.workingHours.start} - {doc.workingHours.end}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => startEdit(doc)}
                className="p-1.5 border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 hover:border-teal-500 transition-all duration-150 cursor-pointer flex items-center justify-center bg-white"
                title="Edit Details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeletingDoctor(doc)}
                className="p-1.5 border border-slate-200 rounded-xl text-slate-600 hover:text-rose-600 hover:border-rose-500 transition-all duration-150 cursor-pointer flex items-center justify-center bg-white"
                title="Remove Doctor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {doctors.length === 0 && (
          <div className="col-span-2 text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed text-slate-500">
            <UserPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs">No veterinary specialists registered. Click the button in the top right to register your first doctor.</p>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deletingDoctor)}
        itemType="doctor"
        itemName={deletingDoctor?.name || ''}
        onConfirmPermanent={handleConfirmPermanentDelete}
        onConfirmMoveToTrash={handleConfirmMoveToTrash}
        onCancel={() => setDeletingDoctor(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
