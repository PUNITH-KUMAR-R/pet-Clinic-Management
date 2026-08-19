import React, { useState } from 'react';
import { ShieldCheck, Mail, Heart, Calendar, Clock, FileText, Printer, Eye } from 'lucide-react';
import { Pet, Appointment, Doctor } from '../types';

interface PatientPortalProps {
  pets: Pet[];
  appointments: Appointment[];
  doctors: Doctor[];
  onRefresh?: () => void;
}

export default function PatientPortal({ pets, appointments, doctors }: PatientPortalProps) {
  const [authEmail, setAuthEmail] = useState('');
  const [authenticatedPet, setAuthenticatedPet] = useState<Pet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!authEmail.trim()) {
      setError('Please enter a registered email address.');
      return;
    }

    // Secure search mapping
    const foundPet = pets.find(
      p => p.ownerEmail.toLowerCase() === authEmail.trim().toLowerCase()
    );

    if (foundPet) {
      setAuthenticatedPet(foundPet);
    } else {
      setError('No patient record found matching this email. Try "john.doe@gmail.com" or "alice.smith@yahoo.com"!');
    }
  };

  const handleLogout = () => {
    setAuthenticatedPet(null);
    setAuthEmail('');
    setError(null);
  };

  const myAppointments = authenticatedPet
    ? appointments.filter(apt => apt.petId === authenticatedPet.id)
    : [];

  const getDoctorName = (docId: string) => {
    return doctors.find(d => d.id === docId)?.name || 'Clinic Vet Specialist';
  };

  return (
    <div className="space-y-6" id="patient-portal">
      {!authenticatedPet ? (
        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Secure Patient Records Portal</h3>
            <p className="text-xs text-slate-500">Access clinical medical chart records, immunizations, and booked dates.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="john.doe@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl pl-9 pr-3 py-3 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">For testing, log in with <strong className="text-slate-600 select-all">john.doe@gmail.com</strong> or <strong className="text-slate-600 select-all">alice.smith@yahoo.com</strong></p>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-3 rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>Retrieve Patient Dossier</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User welcome bar */}
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                {authenticatedPet.ownerName.substring(0, 1)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-teal-900">Welcome, {authenticatedPet.ownerName}</h4>
                <p className="text-xs text-teal-700">Accessing secure medical passport for <strong>{authenticatedPet.name}</strong> ({authenticatedPet.breed})</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors"
            >
              Exit Portal
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side - Pet Passport & Vaccination */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-gradient-to-br from-teal-700 to-emerald-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-base leading-none">{authenticatedPet.name}</h5>
                    <p className="text-[11px] text-teal-100/80 mt-1">{authenticatedPet.breed}</p>
                  </div>
                  <Heart className="w-6 h-6 text-teal-200 animate-pulse fill-teal-100/10" />
                </div>

                <div className="space-y-2 text-xs border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="text-teal-200">Patient Category:</span>
                    <span className="font-semibold">{authenticatedPet.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-200">Age Bracket:</span>
                    <span className="font-semibold">{authenticatedPet.age} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-200">Weight Metric:</span>
                    <span className="font-semibold">{authenticatedPet.weight} kg</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-teal-200">Owner Identifier:</span>
                    <span className="font-semibold">{authenticatedPet.ownerName}</span>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Medical Passport</span>
                </button>
              </div>

              {/* Secure verification card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                <h5 className="font-bold text-slate-800 flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Compliance Certifications</span>
                </h5>
                <p className="leading-relaxed text-[11px]">This clinic complies fully with digital pet medical record privacy regulations. Only registered email contacts can query details.</p>
                <div className="text-[10px] text-slate-400">Timestamp: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Right side - Charts, Vaccines & Scheduled bookings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Medical history */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                  <FileText className="w-4.5 h-4.5 text-teal-600" />
                  <span>Clinical Case Records & Diagnoses</span>
                </h5>

                <div className="space-y-4">
                  {authenticatedPet.medicalRecords.map((rec) => (
                    <div key={rec.id} className="border-l-2 border-teal-500 pl-4 py-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{rec.diagnosis}</span>
                        <span className="text-slate-400 font-medium flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{rec.date}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Prescribed Care:</strong> {rec.treatment}
                      </p>
                      {rec.notes && <p className="text-xs text-slate-500 italic">"{rec.notes}"</p>}
                      <p className="text-[10px] text-slate-400">Recorded by: {rec.vetName}</p>
                    </div>
                  ))}

                  {authenticatedPet.medicalRecords.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">No historical records logged for this pet.</p>
                  )}
                </div>
              </div>

              {/* Booked appointment dates */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                  <Calendar className="w-4.5 h-4.5 text-teal-600" />
                  <span>Booked Doctor Visits ({myAppointments.length})</span>
                </h5>

                <div className="space-y-3">
                  {myAppointments.map((apt) => (
                    <div key={apt.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            apt.status === 'Scheduled' ? 'bg-sky-400' :
                            apt.status === 'Completed' ? 'bg-emerald-400' : 'bg-slate-400'
                          }`}></span>
                          <span className="text-xs font-bold text-slate-800">{apt.reason}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Practitioner: {getDoctorName(apt.doctorId)}</p>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{apt.date}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{apt.time}</span>
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        apt.status === 'Scheduled' ? 'bg-sky-100 text-sky-800' :
                        apt.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  ))}

                  {myAppointments.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">No future visits booked for {authenticatedPet.name}.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
