import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Calendar, UserCheck, Heart, Filter, Clock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { Appointment, Pet, Doctor } from '../types';

interface NotificationsPageProps {
  appointments: Appointment[];
  pets: Pet[];
  doctors: Doctor[];
  onNavigateTab: (tab: 'appointments' | 'pets' | 'doctors' | 'portal') => void;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'appointment' | 'doctor' | 'pet';
  priority: 'high' | 'medium' | 'info';
  linkTab: 'appointments' | 'pets' | 'doctors' | 'portal';
  dateSort: string;
}

export default function NotificationsPage({ appointments, pets, doctors, onNavigateTab }: NotificationsPageProps) {
  // Persistence for read and deleted notification IDs
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vetcore_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vetcore_deleted_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [filterType, setFilterType] = useState<'all' | 'unread' | 'appointment' | 'doctor' | 'pet'>('all');

  useEffect(() => {
    try {
      localStorage.setItem('vetcore_read_notifications', JSON.stringify(readIds));
    } catch (e) {
      console.error(e);
    }
  }, [readIds]);

  useEffect(() => {
    try {
      localStorage.setItem('vetcore_deleted_notifications', JSON.stringify(deletedIds));
    } catch (e) {
      console.error(e);
    }
  }, [deletedIds]);

  // Construct notifications exclusively from live appointments, doctors, and pets
  const allGeneratedNotifications: NotificationItem[] = [];

  // 1. Upcoming & Registered Appointments
  appointments.forEach(apt => {
    const pet = pets.find(p => p.id === apt.petId);
    const doctor = doctors.find(d => d.id === apt.doctorId);
    const petName = pet?.name || 'Patient';
    const doctorName = doctor?.name ? `Dr. ${doctor.name}` : 'Assigned Doctor';

    if (apt.status === 'Scheduled') {
      allGeneratedNotifications.push({
        id: `notif-apt-upcoming-${apt.id}`,
        title: `Upcoming Appointment: ${petName}`,
        message: `Scheduled with ${doctorName} on ${apt.date} at ${apt.time} for "${apt.reason}".`,
        timestamp: `${apt.date} @ ${apt.time}`,
        type: 'appointment',
        priority: 'high',
        linkTab: 'appointments',
        dateSort: `${apt.date}T${apt.time}`
      });
    } else {
      allGeneratedNotifications.push({
        id: `notif-apt-reg-${apt.id}`,
        title: `Appointment Registered (${apt.status})`,
        message: `${petName} appointment with ${doctorName} logged on ${apt.date} at ${apt.time}.`,
        timestamp: `${apt.date} @ ${apt.time}`,
        type: 'appointment',
        priority: 'info',
        linkTab: 'appointments',
        dateSort: `${apt.date}T${apt.time}`
      });
    }
  });

  // 2. Newly Registered Doctors
  doctors.forEach(doc => {
    allGeneratedNotifications.push({
      id: `notif-doc-reg-${doc.id}`,
      title: `New Doctor Registered: Dr. ${doc.name}`,
      message: `Specialty: ${doc.specialty} | Working days: ${doc.workingDays.join(', ')} | Email: ${doc.email}`,
      timestamp: 'Recently Registered',
      type: 'doctor',
      priority: 'medium',
      linkTab: 'doctors',
      dateSort: '2026-07-29T10:00'
    });
  });

  // 3. Newly Registered Pets / Patients
  pets.forEach(pet => {
    allGeneratedNotifications.push({
      id: `notif-pet-reg-${pet.id}`,
      title: `New Pet Registered: ${pet.name}`,
      message: `Species: ${pet.type} (${pet.breed || 'Standard'}), ${pet.age} yr old. Registered under owner: ${pet.ownerName} (${pet.ownerPhone}).`,
      timestamp: 'Recently Registered',
      type: 'pet',
      priority: 'medium',
      linkTab: 'pets',
      dateSort: '2026-07-29T09:00'
    });
  });

  // Filter out deleted items
  const activeNotifications = allGeneratedNotifications.filter(n => !deletedIds.includes(n.id));

  const markAllAsRead = () => {
    const allIds = activeNotifications.map(n => n.id);
    setReadIds(Array.from(new Set([...readIds, ...allIds])));
  };

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
    }
  };

  const deleteNotification = (id: string) => {
    setDeletedIds([...deletedIds, id]);
  };

  const clearRead = () => {
    const readActiveIds = activeNotifications.filter(n => readIds.includes(n.id)).map(n => n.id);
    setDeletedIds(Array.from(new Set([...deletedIds, ...readActiveIds])));
  };

  const filtered = activeNotifications.filter(n => {
    const isRead = readIds.includes(n.id);
    if (filterType === 'unread') return !isRead;
    if (filterType === 'appointment') return n.type === 'appointment';
    if (filterType === 'doctor') return n.type === 'doctor';
    if (filterType === 'pet') return n.type === 'pet';
    return true;
  });

  const unreadCount = activeNotifications.filter(n => !readIds.includes(n.id)).length;

  const getTypeBadge = (type: NotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            <Calendar className="w-3 h-3" /> Appointment
          </span>
        );
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
            <UserCheck className="w-3 h-3" /> Doctor Reg
          </span>
        );
      case 'pet':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Heart className="w-3 h-3" /> Pet Reg
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Notifications Center</h2>
              <p className="text-xs text-slate-500">Upcoming appointments and new registrations for doctors, pets, and bookings</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={clearRead}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear read</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {[
          { id: 'all', label: `All (${activeNotifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'appointment', label: 'Appointments' },
          { id: 'doctor', label: 'Doctor Regs' },
          { id: 'pet', label: 'Pet Regs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === tab.id
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Upcoming Appointments</p>
            <p className="text-lg font-bold text-amber-900">
              {appointments.filter(a => a.status === 'Scheduled').length} Scheduled
            </p>
          </div>
          <Calendar className="w-6 h-6 text-amber-600 opacity-80" />
        </div>

        <div className="p-3.5 bg-teal-50/60 border border-teal-200/60 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Registered Doctors</p>
            <p className="text-lg font-bold text-teal-900">{doctors.length} Doctors</p>
          </div>
          <UserCheck className="w-6 h-6 text-teal-600 opacity-80" />
        </div>

        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Registered Patients</p>
            <p className="text-lg font-bold text-emerald-900">{pets.length} Registered Pets</p>
          </div>
          <Heart className="w-6 h-6 text-emerald-600 opacity-80" />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No notifications in this view</p>
            <p className="text-xs text-slate-400 mt-1">New registrations or appointments will automatically appear here.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`p-4 rounded-2xl border transition-all duration-200 relative group cursor-pointer ${
                  isRead
                    ? 'bg-white border-slate-200 opacity-85'
                    : 'bg-teal-50/40 border-teal-200 shadow-xs ring-1 ring-teal-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {!isRead ? (
                        <span className="w-2.5 h-2.5 bg-teal-500 rounded-full block animate-pulse"></span>
                      ) : (
                        <span className="w-2.5 h-2.5 bg-slate-200 rounded-full block"></span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                        {getTypeBadge(item.type)}
                        {item.priority === 'high' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>

                      <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timestamp}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateTab(item.linkTab);
                          }}
                          className="text-teal-600 hover:text-teal-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          View in section <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      title="Delete Notification"
                      className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
