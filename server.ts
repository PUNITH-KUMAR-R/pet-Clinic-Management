import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Doctor, Pet, Appointment, MedicalRecord } from './src/types';
import { db } from './src/db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to determine day of week from YYYY-MM-DD without timezone offset issues
function getDayName(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day, 12, 0, 0);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function timeToMinutes(tStr: string): number {
  if (!tStr) return 0;
  const match = tStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3] ? match[3].toUpperCase() : null;

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// ------------------------------------
// Doctors Endpoints
// ------------------------------------
app.get('/api/doctors', (req, res) => {
  res.json(db.getDoctors());
});

app.post('/api/doctors', (req, res) => {
  const { name, gender, specialty, email, phone, bio, avatar, workingDays, workingHours } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required.' });
  }

  const isFemale = gender === 'Female' || (gender && gender.toLowerCase().includes('female'));
  const defaultAvatar = isFemale 
    ? 'https://images.unsplash.com/photo-1594824813566-78a08c8e1e7f?auto=format&fit=crop&q=80&w=300'
    : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300';

  const newDoc = db.addDoctor({
    name,
    gender: gender || 'Male',
    specialty: specialty || 'General Medicine',
    email,
    phone,
    bio: bio || 'Veterinary practitioner at Pet Clinic Management.',
    avatar: avatar || defaultAvatar,
    workingDays: Array.isArray(workingDays) && workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: workingHours || { start: '09:00', end: '17:00' }
  });

  res.status(201).json(newDoc);
});

app.put('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateDoctor(id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Doctor not found' });
  }
});

app.delete('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === 'true';
  const deleted = isPermanent ? db.deleteDoctor(id) : db.trashDoctor(id);
  if (deleted) {
    res.json({ 
      success: true, 
      message: isPermanent ? 'Doctor permanently deleted.' : 'Doctor moved to Trash / Deleted Data.' 
    });
  } else {
    res.status(404).json({ error: 'Doctor not found' });
  }
});

// ------------------------------------
// Pets Endpoints
// ------------------------------------
app.get('/api/pets', (req, res) => {
  res.json(db.getPets());
});

app.post('/api/pets', (req, res) => {
  const { name, type, breed, age, weight, ownerName, ownerEmail, ownerPhone, medicalRecords } = req.body;
  if (!name || !ownerName || !ownerEmail) {
    return res.status(400).json({ error: 'Pet name, owner name, and owner email are required.' });
  }

  const newPet = db.addPet({
    name,
    type: type || 'Dog',
    breed: breed || 'Mixed Breed',
    age: Number(age) || 1,
    weight: Number(weight) || 5,
    ownerName,
    ownerEmail,
    ownerPhone: ownerPhone || '555-0199',
    medicalRecords: Array.isArray(medicalRecords) ? medicalRecords : []
  });

  res.status(201).json(newPet);
});

app.put('/api/pets/:id', (req, res) => {
  const { id } = req.params;
  const payload = { ...req.body };
  if (payload.age !== undefined) payload.age = Number(payload.age);
  if (payload.weight !== undefined) payload.weight = Number(payload.weight);

  const updated = db.updatePet(id, payload);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Pet not found' });
  }
});

app.delete('/api/pets/:id', (req, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === 'true';
  const deleted = isPermanent ? db.deletePet(id) : db.trashPet(id);
  if (deleted) {
    res.json({ 
      success: true, 
      message: isPermanent ? 'Pet permanently deleted.' : 'Pet profile moved to Trash / Deleted Data.' 
    });
  } else {
    res.status(404).json({ error: 'Pet not found' });
  }
});

// Add medical record to pet
app.post('/api/pets/:id/records', (req, res) => {
  const { id } = req.params;
  const { diagnosis, treatment, notes, vetName } = req.body;
  if (!diagnosis || !treatment) {
    return res.status(400).json({ error: 'Diagnosis and treatment are required.' });
  }

  const record = db.addMedicalRecord(id, {
    diagnosis,
    treatment,
    notes: notes || '',
    vetName: vetName || 'Dr. Sarah Jenkins'
  });

  if (record) {
    res.status(201).json(record);
  } else {
    res.status(404).json({ error: 'Pet not found' });
  }
});

// ------------------------------------
// Appointments Endpoints & Availability Engine
// ------------------------------------
app.get('/api/appointments', (req, res) => {
  res.json(db.getAppointments());
});

app.post('/api/appointments', (req, res) => {
  const { petId, doctorId, date, time, reason, notes } = req.body;
  const doctors = db.getDoctors();
  const pets = db.getPets();
  const appointments = db.getAppointments();

  // 1. Validate if pet exists
  const petExists = pets.some(p => p.id === petId);
  if (!petExists) {
    return res.status(400).json({ error: 'Selected pet does not exist.' });
  }

  // 2. Validate if doctor exists
  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) {
    return res.status(400).json({ error: 'Selected doctor does not exist.' });
  }

  // 3. Automated Availability Update: Validate day of week working hours
  const dayName = getDayName(date);
  const isWorkingDay = doctor.workingDays.includes(dayName);
  if (!isWorkingDay) {
    return res.status(400).json({ 
      error: `${doctor.name} does not work on ${dayName}s. Available days: ${doctor.workingDays.join(', ')}` 
    });
  }

  // 4. Validate working hours
  const apptMins = timeToMinutes(time);
  const startMins = timeToMinutes(doctor.workingHours.start);
  const endMins = timeToMinutes(doctor.workingHours.end);
  if (apptMins < startMins || apptMins > endMins) {
    return res.status(400).json({ 
      error: `Time slot ${time} is outside of ${doctor.name}'s working hours (${doctor.workingHours.start} - ${doctor.workingHours.end}).` 
    });
  }

  // 5. Automated Doctor Availability Update: Check for conflicts
  const hasConflict = appointments.some(apt => 
    apt.doctorId === doctorId && 
    apt.date === date && 
    apt.time === time && 
    apt.status === 'Scheduled'
  );

  if (hasConflict) {
    return res.status(400).json({ 
      error: `${doctor.name} is already booked at ${time} on ${date}. Please choose a different time or doctor.` 
    });
  }

  const newApt = db.addAppointment({
    petId,
    doctorId,
    date,
    time,
    reason: reason || 'Routine Checkup',
    status: 'Scheduled',
    notes: notes || ''
  });

  res.status(201).json(newApt);
});

app.put('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const doctors = db.getDoctors();
  const appointments = db.getAppointments();
  const currentApt = appointments.find(apt => apt.id === id);

  if (!currentApt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const updatedData = { ...currentApt, ...req.body };

  // Validate doctor availability if doctor or schedule is updated
  if (req.body.doctorId || req.body.date || req.body.time) {
    const doctor = doctors.find(d => d.id === updatedData.doctorId);
    if (!doctor) {
      return res.status(400).json({ error: 'Selected doctor does not exist.' });
    }

    const dayName = getDayName(updatedData.date);
    if (!doctor.workingDays.includes(dayName)) {
      return res.status(400).json({ 
        error: `${doctor.name} does not work on ${dayName}s.` 
      });
    }

    if (updatedData.time < doctor.workingHours.start || updatedData.time > doctor.workingHours.end) {
      return res.status(400).json({ 
        error: `Time slot ${updatedData.time} is outside working hours (${doctor.workingHours.start} - ${doctor.workingHours.end}).` 
      });
    }

    const hasConflict = appointments.some(apt => 
      apt.id !== id &&
      apt.doctorId === updatedData.doctorId && 
      apt.date === updatedData.date && 
      apt.time === updatedData.time && 
      apt.status === 'Scheduled'
    );

    if (hasConflict) {
      return res.status(400).json({ 
        error: `${doctor.name} is already booked at ${updatedData.time} on ${updatedData.date}.` 
      });
    }
  }

  const result = db.updateAppointment(id, updatedData);
  res.json(result);
});

app.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === 'true';
  const deleted = isPermanent ? db.deleteAppointment(id) : db.trashAppointment(id);
  if (deleted) {
    res.json({ 
      success: true, 
      message: isPermanent ? 'Appointment permanently deleted.' : 'Appointment moved to Trash / Deleted Data.' 
    });
  } else {
    res.status(404).json({ error: 'Appointment not found.' });
  }
});

// ------------------------------------
// Trash / Deleted Data Endpoints
// ------------------------------------
app.get('/api/trash', (req, res) => {
  res.json(db.readTrash());
});

app.post('/api/trash/:id/restore', (req, res) => {
  const { id } = req.params;
  const result = db.restoreFromTrash(id);
  if (result.success) {
    res.json({ success: true, message: `Successfully restored ${result.itemType} from trash!` });
  } else {
    res.status(400).json({ error: result.error || 'Failed to restore item.' });
  }
});

app.delete('/api/trash/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.permanentlyDeleteFromTrash(id);
  if (deleted) {
    res.json({ success: true, message: 'Item permanently deleted from trash.' });
  } else {
    res.status(404).json({ error: 'Item not found in trash.' });
  }
});

app.delete('/api/trash', (req, res) => {
  db.emptyTrash();
  res.json({ success: true, message: 'Trash emptied successfully.' });
});

// ------------------------------------
// AI Co-Pilot Handlers & Simulation Logic
// ------------------------------------
function handleRegisterDoctor(args: any): Doctor {
  const isFemale = args.gender === 'Female' || (args.gender && String(args.gender).toLowerCase().includes('female'));
  const defaultAvatar = isFemale 
    ? 'https://images.unsplash.com/photo-1594824813566-78a08c8e1e7f?auto=format&fit=crop&q=80&w=300'
    : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300';

  const newDoc = db.addDoctor({
    name: args.name || args.doctorName || 'Dr. New Doctor',
    gender: args.gender || 'Male',
    specialty: args.specialty || 'General Medicine',
    email: args.email || `dr.${(args.name || 'doctor').toLowerCase().replace(/[^a-z0-9]/g, '')}@petclinic.com`,
    phone: args.phone || '555-0190',
    bio: args.bio || `Veterinary practitioner specializing in ${args.specialty || 'General Medicine'}.`,
    avatar: args.avatar || defaultAvatar,
    workingDays: Array.isArray(args.workingDays) && args.workingDays.length > 0 
      ? args.workingDays 
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: args.workingHours || { start: '09:00', end: '17:00' }
  });
  return newDoc;
}

function handleRegisterPet(args: any): Pet {
  const newPet = db.addPet({
    name: args.name || args.petName || 'New Patient',
    type: args.type || args.petType || 'Dog',
    breed: args.breed || 'Mixed Breed',
    age: Number(args.age) || 2,
    weight: Number(args.weight) || 10,
    ownerName: args.ownerName || 'Registered Owner',
    ownerEmail: args.ownerEmail || 'patient@example.com',
    ownerPhone: args.ownerPhone || '555-0199',
    medicalRecords: [
      {
        id: `rec-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        diagnosis: 'Initial Patient Registration',
        treatment: 'Standard intake medical profile created and verified.',
        notes: 'Registered via AI Practice Assistant.',
        vetName: 'Dr. Sarah Jenkins'
      }
    ]
  });
  return newPet;
}

function handleScheduleAppointment(args: any): { success: boolean; appointment?: Appointment; error?: string } {
  const pets = db.getPets();
  const doctors = db.getDoctors();

  const pet = pets.find(p => p.id === args.petId || p.name.toLowerCase() === (args.petName || '').toLowerCase()) || pets[0];
  const doctor = doctors.find(d => d.id === args.doctorId || d.name.toLowerCase().includes((args.doctorName || '').toLowerCase())) || doctors[0];

  if (!pet) return { success: false, error: 'No pet record found. Please register the pet first.' };
  if (!doctor) return { success: false, error: 'Doctor not found.' };

  const date = args.date || new Date().toISOString().split('T')[0];
  const time = args.time || '10:00';
  const reason = args.reason || 'General health consultation';

  // Check working day
  const dayName = getDayName(date);
  if (!doctor.workingDays.includes(dayName)) {
    return { 
      success: false, 
      error: `${doctor.name} does not work on ${dayName}s. Available days: ${doctor.workingDays.join(', ')}` 
    };
  }

  // Check working hours
  const apptMins = timeToMinutes(time);
  const startMins = timeToMinutes(doctor.workingHours.start);
  const endMins = timeToMinutes(doctor.workingHours.end);
  if (apptMins < startMins || apptMins > endMins) {
    return {
      success: false,
      error: `Time ${time} is outside ${doctor.name}'s hours (${doctor.workingHours.start} - ${doctor.workingHours.end}).`
    };
  }

  // Check double-booking
  const appointments = db.getAppointments();
  const hasConflict = appointments.some(a => a.doctorId === doctor.id && a.date === date && a.time === time && a.status === 'Scheduled');
  if (hasConflict) {
    return {
      success: false,
      error: `${doctor.name} is already booked at ${time} on ${date}.`
    };
  }

  const newApt = db.addAppointment({
    petId: pet.id,
    doctorId: doctor.id,
    date,
    time,
    reason,
    status: 'Scheduled',
    notes: args.notes || 'Booked via AI Practice Assistant'
  });

  return { success: true, appointment: newApt };
}

function handleRecommendDoctor(symptomsOrQuery: string): string {
  const query = symptomsOrQuery.toLowerCase();
  const doctors = db.getDoctors();

  let recommendedDoctor: Doctor = doctors[0]; // default General Medicine
  let matchReason = '';

  if (query.includes('skin') || query.includes('scratch') || query.includes('itch') || query.includes('allergy') || query.includes('dermatology') || query.includes('fur')) {
    const derm = doctors.find(d => d.specialty.toLowerCase().includes('dermatology'));
    if (derm) {
      recommendedDoctor = derm;
      matchReason = 'specializes in veterinary dermatology, managing allergies, ear infections, and skin disorders.';
    }
  } else if (query.includes('surgery') || query.includes('spay') || query.includes('neuter') || query.includes('wound') || query.includes('limp') || query.includes('fracture') || query.includes('tumor')) {
    const surg = doctors.find(d => d.specialty.toLowerCase().includes('surgery'));
    if (surg) {
      recommendedDoctor = surg;
      matchReason = 'is our board-certified veterinary surgeon specializing in soft tissue and orthopedic surgery.';
    }
  } else if (query.includes('tooth') || query.includes('teeth') || query.includes('dental') || query.includes('beak') || query.includes('mouth') || query.includes('breath')) {
    const dent = doctors.find(d => d.specialty.toLowerCase().includes('dentistry'));
    if (dent) {
      recommendedDoctor = dent;
      matchReason = 'specializes in dentistry, periodontology, beak assessments, and oral procedures.';
    }
  } else {
    const gen = doctors.find(d => d.specialty.toLowerCase().includes('general'));
    if (gen) {
      recommendedDoctor = gen;
      matchReason = 'provides expert general veterinary medicine, wellness checkups, and diagnostic triage.';
    }
  }

  return `👨‍⚕️ **Doctor Recommendation Match**:\n\nBased on your query ("*${symptomsOrQuery}*"), I recommend **${recommendedDoctor.name}** (**${recommendedDoctor.specialty}**).\n\n* **Why this match**: ${recommendedDoctor.name} ${matchReason}\n* **Working Days**: **${recommendedDoctor.workingDays.join(', ')}**\n* **Working Hours**: **${recommendedDoctor.workingHours.start} - ${recommendedDoctor.workingHours.end}**\n\nWould you like me to book an appointment with **${recommendedDoctor.name}**? Just tell me the date and preferred time!`;
}

function handleDeletePet(petNameOrId: string, speciesFilter?: string): string {
  const pets = db.getPets();
  const lower = petNameOrId.toLowerCase();

  let species = (speciesFilter || '').toLowerCase();
  if (!species) {
    if (/\b(dog|canine|puppy|dogs)\b/i.test(lower)) species = 'dog';
    else if (/\b(cat|feline|kitten|cats)\b/i.test(lower)) species = 'cat';
    else if (/\b(bird|parrot|canary|birds)\b/i.test(lower)) species = 'bird';
    else if (/\b(rabbit|bunny|rabbits)\b/i.test(lower)) species = 'rabbit';
  }

  // Clean species and command words out of name search
  let cleanName = lower
    .replace(/\b(delete|remove|trash|edit|update|pet|patient|dog|dogs|cat|cats|bird|birds|rabbit|rabbits|feline|canine|puppy|kitten|bunny)\b/gi, '')
    .trim();

  if (!cleanName) cleanName = lower;

  let candidates = pets.filter(p => 
    p.id.toLowerCase() === lower || 
    p.id.toLowerCase() === cleanName ||
    p.name.toLowerCase() === cleanName ||
    p.name.toLowerCase().includes(cleanName) || 
    cleanName.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(lower) ||
    lower.includes(p.name.toLowerCase())
  );

  if (species && candidates.length > 0) {
    const speciesMatches = candidates.filter(p => p.type.toLowerCase().includes(species) || species.includes(p.type.toLowerCase()));
    if (speciesMatches.length > 0) {
      candidates = speciesMatches;
    }
  }

  if (candidates.length === 0) return `❌ Pet matching "${petNameOrId}" not found in database.`;

  if (candidates.length > 1 && !species) {
    const matchDetails = candidates.map(c => `• **${c.name}** (${c.type} - ${c.breed}, Owner: ${c.ownerName})`).join('\n');
    return `⚠️ **Multiple pets found named "${candidates[0].name}"**:\n\n${matchDetails}\n\nPlease specify the species, for example: \`delete dog ${candidates[0].name}\` or \`delete cat ${candidates[0].name}\`.`;
  }

  const pet = candidates[0];
  db.trashPet(pet.id);
  return `🗑️ **Pet Deleted Successfully!**\n\nProfile for **${pet.name}** (${pet.type} - ${pet.breed}, Owner: ${pet.ownerName}) has been deleted and moved to Deleted Data / Trash.`;
}

function handleUpdatePet(args: any): string {
  const pets = db.getPets();
  const rawTarget = String(args.petNameOrId || args.name || args.petName || '').toLowerCase();
  let species = String(args.type || args.species || '').toLowerCase();

  if (!species) {
    if (/\b(dog|canine|puppy|dogs)\b/i.test(rawTarget)) species = 'dog';
    else if (/\b(cat|feline|kitten|cats)\b/i.test(rawTarget)) species = 'cat';
    else if (/\b(bird|parrot|canary|birds)\b/i.test(rawTarget)) species = 'bird';
    else if (/\b(rabbit|bunny|rabbits)\b/i.test(rawTarget)) species = 'rabbit';
  }

  let cleanName = rawTarget
    .replace(/\b(delete|remove|trash|edit|update|pet|patient|dog|dogs|cat|cats|bird|birds|rabbit|rabbits|feline|canine|puppy|kitten|bunny)\b/gi, '')
    .trim();

  if (!cleanName) cleanName = rawTarget;

  let candidates = pets.filter(p => 
    p.id.toLowerCase() === rawTarget || 
    p.id.toLowerCase() === cleanName ||
    p.name.toLowerCase() === cleanName ||
    p.name.toLowerCase().includes(cleanName) || 
    cleanName.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(rawTarget) ||
    rawTarget.includes(p.name.toLowerCase())
  );

  if (species && candidates.length > 0) {
    const speciesMatches = candidates.filter(p => p.type.toLowerCase().includes(species) || species.includes(p.type.toLowerCase()));
    if (speciesMatches.length > 0) {
      candidates = speciesMatches;
    }
  }

  if (candidates.length === 0) return `❌ Pet matching "${rawTarget || 'specified pet'}" not found in database.`;

  if (candidates.length > 1 && !species) {
    const matchDetails = candidates.map(c => `• **${c.name}** (${c.type} - ${c.breed}, Owner: ${c.ownerName})`).join('\n');
    return `⚠️ **Multiple pets found named "${candidates[0].name}"**:\n\n${matchDetails}\n\nPlease specify the species, for example: \`edit dog ${candidates[0].name}\` or \`edit cat ${candidates[0].name}\`.`;
  }

  const pet = candidates[0];

  const updates: Partial<Pet> = {};
  if (args.newName || args.name) updates.name = args.newName || args.name;
  if (args.breed) updates.breed = args.breed;
  if (args.age !== undefined && args.age !== null) updates.age = Number(args.age);
  if (args.weight !== undefined && args.weight !== null) updates.weight = Number(args.weight);
  if (args.ownerName) updates.ownerName = args.ownerName;
  if (args.ownerEmail) updates.ownerEmail = args.ownerEmail;
  if (args.ownerPhone) updates.ownerPhone = args.ownerPhone;
  if (args.type && args.type.toLowerCase() !== species) updates.type = args.type;

  const updated = db.updatePet(pet.id, updates);
  if (!updated) return `❌ Could not update pet profile.`;

  return `✏️ **Pet Profile Updated!**\n\nUpdated record for **${updated.name}**:\n• **Species & Breed:** ${updated.type} - ${updated.breed}\n• **Age & Weight:** ${updated.age} yrs | ${updated.weight} kg\n• **Owner:** ${updated.ownerName} (\`${updated.ownerEmail}\` | ${updated.ownerPhone})`;
}

function handleDeleteDoctor(doctorNameOrId: string): string {
  const doctors = db.getDoctors();
  const lower = doctorNameOrId.toLowerCase();
  const doc = doctors.find(d => d.id.toLowerCase() === lower || d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase()));
  if (!doc) return `❌ Doctor matching "${doctorNameOrId}" not found in database.`;

  db.trashDoctor(doc.id);
  return `🗑️ **Doctor Removed!**\n\nProfile for **${doc.name}** (${doc.specialty}) has been removed and moved to Trash. Any active appointments for ${doc.name} have been marked as Cancelled.`;
}

function handleUpdateDoctor(args: any): string {
  const doctors = db.getDoctors();
  const target = String(args.doctorNameOrId || args.name || args.doctorName || '').toLowerCase();
  const doc = doctors.find(d => d.id.toLowerCase() === target || d.name.toLowerCase().includes(target) || target.includes(d.name.toLowerCase()));
  if (!doc) return `❌ Doctor matching "${target || 'specified doctor'}" not found in database.`;

  const updates: Partial<Doctor> = {};
  if (args.newName) updates.name = args.newName;
  if (args.specialty) updates.specialty = args.specialty;
  if (args.email) updates.email = args.email;
  if (args.phone) updates.phone = args.phone;
  if (args.bio) updates.bio = args.bio;
  if (args.workingDays && Array.isArray(args.workingDays)) updates.workingDays = args.workingDays;
  if (args.workingHours) updates.workingHours = args.workingHours;

  const updated = db.updateDoctor(doc.id, updates);
  if (!updated) return `❌ Could not update doctor profile.`;

  return `✏️ **Doctor Profile Updated!**\n\nUpdated profile for **${updated.name}**:\n• **Specialty:** ${updated.specialty}\n• **Email & Phone:** \`${updated.email}\` | ${updated.phone}\n• **Working Days:** ${updated.workingDays.join(', ')}`;
}

function handleCancelAppointment(args: any): string {
  const appointments = db.getAppointments().filter(a => a.status === 'Scheduled');
  const pets = db.getPets();
  const doctors = db.getDoctors();

  let targetApt: Appointment | undefined;

  if (args.appointmentId) {
    targetApt = appointments.find(a => a.id === args.appointmentId);
  } else {
    const searchPet = String(args.petNameOrId || args.petName || '').toLowerCase();
    const searchDoc = String(args.doctorNameOrId || args.doctorName || '').toLowerCase();
    const searchDate = args.date;

    targetApt = appointments.find(a => {
      const pet = pets.find(p => p.id === a.petId);
      const doc = doctors.find(d => d.id === a.doctorId);

      const petMatch = searchPet ? (pet && (pet.name.toLowerCase().includes(searchPet) || searchPet.includes(pet.name.toLowerCase()))) : true;
      const docMatch = searchDoc ? (doc && (doc.name.toLowerCase().includes(searchDoc) || searchDoc.includes(doc.name.toLowerCase()))) : true;
      const dateMatch = searchDate ? a.date === searchDate : true;

      return petMatch && docMatch && dateMatch;
    });
  }

  if (!targetApt) return `❌ No active scheduled appointment found matching your request.`;

  db.trashAppointment(targetApt.id);
  const pet = pets.find(p => p.id === targetApt?.petId);
  const doc = doctors.find(d => d.id === targetApt?.doctorId);

  return `🗑️ **Appointment Cancelled & Deleted!**\n\nCancelled appointment for **${pet?.name || 'Patient'}** with **${doc?.name || 'Doctor'}** on **${targetApt.date} at ${targetApt.time}**. Moved to Deleted Data / Trash.`;
}

function handleUpdateAppointment(args: any): string {
  const appointments = db.getAppointments();
  const pets = db.getPets();
  const doctors = db.getDoctors();

  let targetApt: Appointment | undefined;

  if (args.appointmentId) {
    targetApt = appointments.find(a => a.id === args.appointmentId);
  } else {
    const searchPet = String(args.petNameOrId || args.petName || '').toLowerCase();
    targetApt = appointments.find(a => {
      const pet = pets.find(p => p.id === a.petId);
      return searchPet && pet && (pet.name.toLowerCase().includes(searchPet) || searchPet.includes(pet.name.toLowerCase()));
    }) || appointments[0];
  }

  if (!targetApt) return `❌ Appointment record not found.`;

  const updates: Partial<Appointment> = {};
  if (args.date) updates.date = args.date;
  if (args.time) updates.time = args.time;
  if (args.reason) updates.reason = args.reason;
  if (args.status) updates.status = args.status;

  const updated = db.updateAppointment(targetApt.id, updates);
  if (!updated) return `❌ Could not update appointment.`;

  const pet = pets.find(p => p.id === updated.petId);
  const doc = doctors.find(d => d.id === updated.doctorId);

  return `✏️ **Appointment Rescheduled / Updated!**\n\nUpdated appointment details:\n• **Patient:** ${pet?.name || 'Pet'}\n• **Attending Doctor:** ${doc?.name || 'Doctor'}\n• **New Date & Time:** ${updated.date} at ${updated.time}\n• **Reason:** ${updated.reason}\n• **Status:** ${updated.status}`;
}

function simulateResponse(userText: string): string {
  const query = userText.toLowerCase();

  // 1. Delete Commands
  if (query.includes('delete') || query.includes('remove') || query.includes('trash')) {
    if (query.includes('doctor') || query.includes('vet') || query.includes('dr.')) {
      const nameMatch = userText.match(/(?:doctor|dr\.|vet)\s+([A-Za-z\s]+)/i) || userText.match(/(?:delete|remove|trash)\s+(?:doctor|dr\.|vet)?\s*([A-Za-z\s]+)/i);
      const targetName = nameMatch ? nameMatch[1].trim() : userText.replace(/delete|remove|trash|doctor|dr\.|vet/gi, '').trim();
      return handleDeleteDoctor(targetName);
    }
    
    if (query.includes('appointment') || query.includes('visit')) {
      const pets = db.getPets();
      let matchedPetName = '';
      for (const p of pets) {
        if (query.includes(p.name.toLowerCase())) {
          matchedPetName = p.name;
          break;
        }
      }
      const dateMatch = userText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      return handleCancelAppointment({
        petNameOrId: matchedPetName,
        date: dateMatch ? dateMatch[1] : undefined
      });
    }

    // Default delete target is Pet / Patient
    let species = '';
    if (/\bdog\b/i.test(query)) species = 'Dog';
    else if (/\bcat\b/i.test(query)) species = 'Cat';
    else if (/\bbird\b/i.test(query)) species = 'Bird';
    else if (/\brabbit\b/i.test(query)) species = 'Rabbit';

    const nameMatch = userText.match(/(?:pet|patient|dog|cat|bird|rabbit|named|name)\s+([A-Za-z0-9'-]+)/i) || userText.match(/(?:delete|remove|trash)\s+(?:pet|patient|dog|cat|bird|rabbit)?\s*([A-Za-z0-9'-]+)/i);
    const targetName = nameMatch ? nameMatch[1] : userText.replace(/delete|remove|trash|pet|patient|dog|cat|bird|rabbit/gi, '').trim();
    return handleDeletePet(targetName, species);
  }

  // 2. Update / Edit Commands
  if (query.includes('update') || query.includes('edit') || query.includes('change') || query.includes('reschedule')) {
    if (query.includes('doctor') || query.includes('vet') || query.includes('dr.')) {
      const doctors = db.getDoctors();
      let matchedDoc = doctors[0];
      for (const d of doctors) {
        if (query.includes(d.name.toLowerCase())) {
          matchedDoc = d;
          break;
        }
      }

      const specMatch = userText.match(/(?:specialty|specializing in)\s+([A-Za-z\s]+?)(?:,|\.|\s+email|$)/i);
      const emailMatch = userText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const phoneMatch = userText.match(/(?:phone|call|tel)\s*[:\s]*([0-9-]{7,15})/i);

      return handleUpdateDoctor({
        doctorNameOrId: matchedDoc.name,
        specialty: specMatch ? specMatch[1].trim() : undefined,
        email: emailMatch ? emailMatch[1] : undefined,
        phone: phoneMatch ? phoneMatch[1] : undefined
      });
    }

    if (query.includes('appointment') || query.includes('visit')) {
      const pets = db.getPets();
      let matchedPetName = '';
      for (const p of pets) {
        if (query.includes(p.name.toLowerCase())) {
          matchedPetName = p.name;
          break;
        }
      }

      const dateMatch = userText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      const timeMatch = userText.match(/\b(\d{1,2}:\d{2})\b/);

      return handleUpdateAppointment({
        petNameOrId: matchedPetName,
        date: dateMatch ? dateMatch[1] : undefined,
        time: timeMatch ? timeMatch[1] : undefined
      });
    }

    // Default update target is Pet / Patient
    const pets = db.getPets();
    let matchedPetName = '';
    for (const p of pets) {
      if (query.includes(p.name.toLowerCase())) {
        matchedPetName = p.name;
        break;
      }
    }

    let species = '';
    if (/\bdog\b/i.test(query)) species = 'Dog';
    else if (/\bcat\b/i.test(query)) species = 'Cat';
    else if (/\bbird\b/i.test(query)) species = 'Bird';
    else if (/\brabbit\b/i.test(query)) species = 'Rabbit';

    // Flexible age matching (e.g. age 3, age to 3, 3 yrs, 3 years old, 3yo)
    const ageMatch = userText.match(/\bage\s*(?:is|to|=|:)?\s*(\d+(?:\.\d+)?)\b/i) || userText.match(/\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y\/?o|yo|y)\b/i);

    // Flexible weight matching (e.g. weight 5, weight to 5, 5 kg, 5 kgs, 5 lbs)
    const weightMatch = userText.match(/\bweight\s*(?:is|to|=|:)?\s*(\d+(?:\.\d+)?)\b/i) || userText.match(/\b(\d+(?:\.\d+)?)\s*(?:kgs?|kilo|kilos|lbs?|pounds?)\b/i);

    // Breed matching (e.g. breed Persian, breed to Persian, is a Persian)
    const breedMatch = userText.match(/\bbreed\s*(?:is|to|=|:)?\s*([A-Za-z\s]+?)(?:,|\.|\s+age|\s+weight|\s+owner|\s+email|$)/i) || userText.match(/(?:breed|is a)\s+([A-Za-z\s]+?)(?:,|\.|\s+age|\s+weight|$)/i);

    // Email matching
    const emailMatch = userText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    // Owner name matching (e.g. owner John, owner to John, owner name John)
    const ownerNameMatch = userText.match(/\bowner(?:\s*name)?\s*(?:is|to|=|:)?\s*([A-Za-z\s]+?)(?:,|\.|\s+email|\s+phone|\s+age|\s+weight|$)/i);

    // Phone matching (e.g. phone 555-0199, call 555-0199)
    const phoneMatch = userText.match(/(?:phone|call|tel)\s*(?:is|to|=|:)?\s*([0-9-]{7,15})/i);

    // New name matching (e.g. rename to Lunita, new name Lunita)
    const newNameMatch = userText.match(/\b(?:new name|rename to|name to)\s*([A-Za-z0-9'-]+)\b/i);

    return handleUpdatePet({
      petNameOrId: matchedPetName || userText,
      species,
      breed: breedMatch ? breedMatch[1].trim() : undefined,
      age: ageMatch ? Number(ageMatch[1]) : undefined,
      weight: weightMatch ? Number(weightMatch[1]) : undefined,
      ownerEmail: emailMatch ? emailMatch[1] : undefined,
      ownerName: ownerNameMatch ? ownerNameMatch[1].trim() : undefined,
      ownerPhone: phoneMatch ? phoneMatch[1] : undefined,
      newName: newNameMatch ? newNameMatch[1].trim() : undefined
    });
  }

  // 7. Register Doctor
  if (
    query.includes('register doctor') || 
    query.includes('add doctor') || 
    query.includes('new doctor') || 
    query.includes('register vet') || 
    query.includes('add vet')
  ) {
    const nameMatch = userText.match(/(?:dr\.|doctor|named|name)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    const specialtyMatch = userText.match(/(?:specialty|speciality|specializes in|specializing in)\s+([A-Za-z\s]+?)(?:,|\.|\s+email|\s+phone|$)/i);
    const emailMatch = userText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = userText.match(/(?:phone|call|tel)\s*[:\s]*([0-9-]{7,15})/i);

    const docName = nameMatch ? (nameMatch[1].startsWith('Dr.') ? nameMatch[1] : `Dr. ${nameMatch[1]}`) : 'Dr. Alan Vance';
    const spec = specialtyMatch ? specialtyMatch[1].trim() : (query.includes('cardio') ? 'Cardiology' : query.includes('neuro') ? 'Neurology' : 'General Medicine');
    const email = emailMatch ? emailMatch[1] : `${docName.toLowerCase().replace(/[^a-z]/g, '')}@petclinic.com`;
    const phone = phoneMatch ? phoneMatch[1] : '555-0195';

    const registeredDoc = handleRegisterDoctor({
      name: docName,
      specialty: spec,
      email,
      phone,
      bio: `Board-certified specialist in ${spec}. Joined Pet Clinic Management team.`,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: { start: '09:00', end: '17:00' }
    });

    return `👨‍⚕️ **Veterinary Doctor Registered Successfully!**\n\nI have created and stored the doctor profile in the database:\n* **Doctor**: **${registeredDoc.name}**\n* **Specialty**: *${registeredDoc.specialty}*\n* **Email**: \`${registeredDoc.email}\` | **Phone**: ${registeredDoc.phone}\n* **Working Hours**: ${registeredDoc.workingDays.join(', ')} (${registeredDoc.workingHours.start} - ${registeredDoc.workingHours.end})\n\n✅ **Live Sync Complete**: The **Veterinary Staff** list has been updated in real-time!`;
  }

  // 2. Register Pet / Patient
  if (
    query.includes('register pet') || 
    query.includes('add pet') || 
    query.includes('add patient') || 
    query.includes('new pet') || 
    query.includes('new patient') || 
    query.includes('register patient')
  ) {
    const nameMatch = userText.match(/(?:named|name|pet|is)\s+([A-Z][a-z]+)/i);
    const breedMatch = userText.match(/(?:breed|is a)\s+([A-Z][a-z\s]+?)(?:,|\.|\s+age|\s+owned|\s+weight|$)/i);
    const ownerMatch = userText.match(/(?:owner|owned by|client)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
    const emailMatch = userText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    const name = nameMatch ? nameMatch[1] : 'Buddy';
    const breed = breedMatch ? breedMatch[1].trim() : (query.includes('cat') ? 'Persian Cat' : 'Labrador Retriever');
    const type = query.includes('cat') ? 'Cat' : query.includes('bird') ? 'Bird' : 'Dog';
    const ownerName = ownerMatch ? ownerMatch[1] : 'Sarah Jenkins';
    const ownerEmail = emailMatch ? emailMatch[1] : `${ownerName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

    const registeredPet = handleRegisterPet({
      name,
      type,
      breed,
      age: 2,
      weight: type === 'Cat' ? 4.5 : 22,
      ownerName,
      ownerEmail,
      ownerPhone: '555-0188'
    });

    return `🎉 **Pet / Patient Registered Successfully!**\n\nI have saved the new patient record to the clinic database:\n* **Pet Name**: **${registeredPet.name}** (${registeredPet.breed})\n* **Species**: ${registeredPet.type}\n* **Owner**: **${registeredPet.ownerName}** (\`${registeredPet.ownerEmail}\`)\n\n✅ **Live Sync Complete**: Saved to persistent storage and immediately visible in the **Pets** tab and **Patient Portal**!`;
  }

  // 3. Schedule Appointment
  if (
    query.includes('schedule') || 
    query.includes('book appointment') || 
    query.includes('appoint doctor') || 
    query.includes('make appointment') ||
    query.includes('book visit')
  ) {
    const pets = db.getPets();
    const doctors = db.getDoctors();

    // Extract names, dates, times
    const dateMatch = userText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const timeMatch = userText.match(/\b(\d{1,2}:\d{2})\b/);
    
    let selectedPet = pets[0];
    for (const p of pets) {
      if (query.includes(p.name.toLowerCase())) {
        selectedPet = p;
        break;
      }
    }

    let selectedDoc = doctors[0];
    for (const d of doctors) {
      if (query.includes(d.name.toLowerCase()) || query.includes(d.specialty.toLowerCase())) {
        selectedDoc = d;
        break;
      }
    }

    const date = dateMatch ? dateMatch[1] : '2026-08-15';
    const time = timeMatch ? timeMatch[1] : '10:00';
    const reason = 'Consultation booked via AI Assistant';

    const bookingResult = handleScheduleAppointment({
      petId: selectedPet.id,
      doctorId: selectedDoc.id,
      date,
      time,
      reason
    });

    if (bookingResult.success && bookingResult.appointment) {
      return `📅 **Appointment Booked Successfully!**\n\n* **Patient**: **${selectedPet.name}**\n* **Doctor**: **${selectedDoc.name}** (*${selectedDoc.specialty}*)\n* **Date & Time**: **${bookingResult.appointment.date}** at **${bookingResult.appointment.time}**\n* **Reason**: *${bookingResult.appointment.reason}*\n\n✅ **Live Sync Complete**: Saved to clinic database and updated in the **Visits & Scheduling** calendar view!`;
    } else {
      return `⚠️ **Booking Error**: ${bookingResult.error || 'Could not schedule appointment due to schedule constraints.'}\n\nPlease choose an available time slot or another doctor!`;
    }
  }

  // 4. Recommend Doctor based on patient symptoms / query
  if (
    query.includes('recommend') || 
    query.includes('which doctor') || 
    query.includes('symptom') || 
    query.includes('scratch') || 
    query.includes('itch') || 
    query.includes('vomit') || 
    query.includes('surgery') || 
    query.includes('teeth') || 
    query.includes('dental') || 
    query.includes('sick') || 
    query.includes('hurt') ||
    query.includes('doctor for')
  ) {
    return handleRecommendDoctor(userText);
  }

  // 5. Default General Assistance
  const doctors = db.getDoctors();
  const pets = db.getPets();
  const appointments = db.getAppointments().filter(a => a.status === 'Scheduled');

  return `👋 **Hello! I am your AI Practice Assistant.**\n\nI have live, full CRUD database access to our **${doctors.length} Doctors**, **${pets.length} Pets**, and **${appointments.length} Scheduled Visits**.\n\n* **How I can assist you today**:\n* 1. **Register a Doctor**: e.g., "Register doctor Dr. Alan Grant, Cardiology, email alan@petclinic.com"\n* 2. **Register a Pet**: e.g., "Register pet Milo, Cat, Persian owned by David"\n* 3. **Recommend a Doctor**: e.g., "My dog is itching and losing fur, which doctor should I see?"\n* 4. **Book an Appointment**: e.g., "Schedule appointment for Bella with Dr. Sarah Jenkins on 2026-08-15 at 10:00"`;
}

app.post('/api/gemini/co-pilot', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const lowerKey = geminiKey.toLowerCase();
  const isPlaceholderKey = 
    !geminiKey || 
    lowerKey.includes('your') || 
    lowerKey.includes('placeholder') || 
    lowerKey.includes('dummy') || 
    lowerKey.includes('sample') || 
    lowerKey.includes('aizasyyour') || 
    lowerKey.length < 20;

  if (isPlaceholderKey) {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const dynamicReply = simulateResponse(lastUserMessage);
    return res.json({
      role: 'assistant',
      content: dynamicReply
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const doctors = db.getDoctors();
    const pets = db.getPets();
    const appointments = db.getAppointments();

    const registerDoctorDeclaration = {
      name: 'register_doctor',
      description: 'Register a new veterinary doctor into the clinic database.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          name: { type: 'STRING' as any, description: 'Doctor full name (e.g. Dr. Sarah Jenkins)' },
          specialty: { type: 'STRING' as any, description: 'Medical specialty (e.g. General Medicine, Surgery, Dermatology, Dentistry, Cardiology)' },
          email: { type: 'STRING' as any, description: 'Doctor email address' },
          phone: { type: 'STRING' as any, description: 'Phone contact number' },
          bio: { type: 'STRING' as any, description: 'Brief professional bio or background' }
        },
        required: ['name', 'specialty']
      }
    };

    const registerPetDeclaration = {
      name: 'register_pet',
      description: 'Register a new pet / patient in the clinic database so it appears in the Pets list and Patient Portal.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          name: { type: 'STRING' as any, description: 'Pet name (e.g. Max, Bella, Luna)' },
          type: { type: 'STRING' as any, description: 'Species/Category (e.g. Dog, Cat, Bird, Rabbit)' },
          breed: { type: 'STRING' as any, description: 'Pet breed (e.g. Golden Retriever, Siamese, Mixed)' },
          age: { type: 'NUMBER' as any, description: 'Pet age in years' },
          weight: { type: 'NUMBER' as any, description: 'Pet weight in kg' },
          ownerName: { type: 'STRING' as any, description: 'Full name of owner' },
          ownerEmail: { type: 'STRING' as any, description: 'Email address of owner' },
          ownerPhone: { type: 'STRING' as any, description: 'Phone number of owner' }
        },
        required: ['name', 'type', 'ownerName']
      }
    };

    const scheduleAppointmentDeclaration = {
      name: 'schedule_appointment',
      description: 'Schedule an appointment for a registered pet with a doctor.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          petName: { type: 'STRING' as any, description: 'Name of the pet' },
          doctorName: { type: 'STRING' as any, description: 'Name of the doctor' },
          date: { type: 'STRING' as any, description: 'Appointment date YYYY-MM-DD' },
          time: { type: 'STRING' as any, description: 'Time in HH:MM format' },
          reason: { type: 'STRING' as any, description: 'Reason for visit' }
        },
        required: ['petName', 'doctorName', 'date', 'time']
      }
    };

    const recommendDoctorDeclaration = {
      name: 'recommend_doctor',
      description: 'Analyze patient symptoms or query to recommend the most suitable doctor specialist.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          query: { type: 'STRING' as any, description: 'Symptoms or patient query' }
        },
        required: ['query']
      }
    };

    const deletePetDeclaration = {
      name: 'delete_pet',
      description: 'Delete a pet record from the database and move it to trash. If multiple pets share the same name, specify the species or type (e.g. Dog, Cat).',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          petNameOrId: { type: 'STRING' as any, description: 'Pet name or ID to delete' },
          species: { type: 'STRING' as any, description: 'Species or pet category e.g. Dog, Cat, Bird, Rabbit' }
        },
        required: ['petNameOrId']
      }
    };

    const updatePetDeclaration = {
      name: 'update_pet',
      description: 'Update or edit details of an existing pet in the database.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          petNameOrId: { type: 'STRING' as any, description: 'Existing pet name or ID to update' },
          newName: { type: 'STRING' as any, description: 'New pet name' },
          type: { type: 'STRING' as any, description: 'Species e.g. Dog, Cat, Bird' },
          breed: { type: 'STRING' as any, description: 'Breed name' },
          age: { type: 'NUMBER' as any, description: 'Age in years' },
          weight: { type: 'NUMBER' as any, description: 'Weight in kg' },
          ownerName: { type: 'STRING' as any, description: 'Owner full name' },
          ownerEmail: { type: 'STRING' as any, description: 'Owner email address' },
          ownerPhone: { type: 'STRING' as any, description: 'Owner phone number' }
        },
        required: ['petNameOrId']
      }
    };

    const deleteDoctorDeclaration = {
      name: 'delete_doctor',
      description: 'Delete/remove a doctor from the clinic staff roster.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          doctorNameOrId: { type: 'STRING' as any, description: 'Doctor name or ID to delete' }
        },
        required: ['doctorNameOrId']
      }
    };

    const updateDoctorDeclaration = {
      name: 'update_doctor',
      description: 'Update or edit details of an existing doctor profile.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          doctorNameOrId: { type: 'STRING' as any, description: 'Doctor name or ID to update' },
          newName: { type: 'STRING' as any, description: 'Updated doctor name' },
          specialty: { type: 'STRING' as any, description: 'Updated specialty' },
          email: { type: 'STRING' as any, description: 'Updated email address' },
          phone: { type: 'STRING' as any, description: 'Updated phone number' }
        },
        required: ['doctorNameOrId']
      }
    };

    const cancelAppointmentDeclaration = {
      name: 'cancel_appointment',
      description: 'Cancel or delete a scheduled appointment.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          petNameOrId: { type: 'STRING' as any, description: 'Pet name or ID' },
          doctorNameOrId: { type: 'STRING' as any, description: 'Doctor name or ID' },
          date: { type: 'STRING' as any, description: 'Appointment date YYYY-MM-DD' },
          appointmentId: { type: 'STRING' as any, description: 'Specific appointment ID if known' }
        }
      }
    };

    const updateAppointmentDeclaration = {
      name: 'update_appointment',
      description: 'Reschedule or edit a scheduled appointment.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          appointmentId: { type: 'STRING' as any, description: 'Appointment ID' },
          petNameOrId: { type: 'STRING' as any, description: 'Pet name or ID' },
          date: { type: 'STRING' as any, description: 'New date YYYY-MM-DD' },
          time: { type: 'STRING' as any, description: 'New time HH:MM' },
          reason: { type: 'STRING' as any, description: 'New reason for visit' }
        }
      }
    };

    const context = `
You are the "AI Practice Assistant" for Pet Clinic Management.
You have direct tool access to perform real-time CRUD (Create, Read, Update, Delete) actions on the clinic database.

Current Clinic State:
Doctors Available:
${JSON.stringify(doctors.map(d => ({ id: d.id, name: d.name, specialty: d.specialty, days: d.workingDays, hours: d.workingHours })))}

Registered Pets:
${JSON.stringify(pets.map(p => ({ id: p.id, name: p.name, type: p.type, breed: p.breed, ownerName: p.ownerName, ownerEmail: p.ownerEmail })))}

Scheduled Appointments:
${JSON.stringify(appointments.filter(a => a.status === 'Scheduled').map(a => ({ id: a.id, doctor: doctors.find(d => d.id === a.doctorId)?.name, date: a.date, time: a.time, reason: a.reason })))}

Instructions:
1. When user requests to register a doctor, call "register_doctor".
2. When user requests to register a pet, call "register_pet".
3. When user requests to schedule/book an appointment, call "schedule_appointment".
4. When user asks to delete a pet, call "delete_pet".
5. When user asks to edit/update a pet, call "update_pet".
6. When user asks to delete a doctor, call "delete_doctor".
7. When user asks to edit/update a doctor, call "update_doctor".
8. When user asks to cancel/delete an appointment, call "cancel_appointment".
9. When user asks to reschedule/edit an appointment, call "update_appointment".
10. When user asks which doctor to visit for symptoms, call "recommend_doctor".
11. Provide clear, structured, friendly responses with Markdown formatting.
`;

    // Map conversation messages to Gemini contents format
    const mapped = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    // Squeeze consecutive messages with the same role
    const squeezed: typeof mapped = [];
    for (const msg of mapped) {
      if (squeezed.length === 0) {
        squeezed.push(msg);
      } else {
        const last = squeezed[squeezed.length - 1];
        if (last.role === msg.role) {
          last.parts[0].text += '\n' + msg.parts[0].text;
        } else {
          squeezed.push(msg);
        }
      }
    }

    let finalContents = squeezed;
    const firstUserIndex = finalContents.findIndex(c => c.role === 'user');
    if (firstUserIndex !== -1) {
      finalContents = finalContents.slice(firstUserIndex);
    } else {
      finalContents = [{ role: 'user', parts: [{ text: 'Hello' }] }];
    }

    if (finalContents.length > 0 && finalContents[finalContents.length - 1].role === 'model') {
      finalContents.pop();
    }

    if (finalContents.length === 0) {
      finalContents = [{ role: 'user', parts: [{ text: 'Hello' }] }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: finalContents,
      config: {
        systemInstruction: context,
        tools: [{
          functionDeclarations: [
            registerDoctorDeclaration,
            registerPetDeclaration,
            scheduleAppointmentDeclaration,
            recommendDoctorDeclaration,
            deletePetDeclaration,
            updatePetDeclaration,
            deleteDoctorDeclaration,
            updateDoctorDeclaration,
            cancelAppointmentDeclaration,
            updateAppointmentDeclaration
          ]
        }]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      let actionSummaries: string[] = [];

      for (const call of functionCalls) {
        if (call.name === 'register_doctor') {
          const doc = handleRegisterDoctor(call.args);
          actionSummaries.push(`👨‍⚕️ **Registered New Doctor**: **${doc.name}** (*${doc.specialty}*). Added to live clinic database!`);
        } else if (call.name === 'register_pet') {
          const registered = handleRegisterPet(call.args);
          actionSummaries.push(`🎉 **Registered New Pet**: **${registered.name}** (${registered.breed}, Owner: ${registered.ownerName}). Added to live database!`);
        } else if (call.name === 'schedule_appointment') {
          const result = handleScheduleAppointment(call.args);
          if (result.success && result.appointment) {
            actionSummaries.push(`📅 **Scheduled Appointment**: Date: **${result.appointment.date}** at **${result.appointment.time}** (Reason: *${result.appointment.reason}*).`);
          } else {
            actionSummaries.push(`⚠️ **Scheduling Issue**: ${result.error || 'Could not schedule appointment.'}`);
          }
        } else if (call.name === 'recommend_doctor') {
          const queryStr = String((call.args as any)?.query || '');
          const rec = handleRecommendDoctor(queryStr);
          actionSummaries.push(rec);
        } else if (call.name === 'delete_pet') {
          const petTarget = String((call.args as any)?.petNameOrId || '');
          const species = String((call.args as any)?.species || (call.args as any)?.type || '');
          actionSummaries.push(handleDeletePet(petTarget, species));
        } else if (call.name === 'update_pet') {
          actionSummaries.push(handleUpdatePet(call.args));
        } else if (call.name === 'delete_doctor') {
          const docTarget = String((call.args as any)?.doctorNameOrId || '');
          actionSummaries.push(handleDeleteDoctor(docTarget));
        } else if (call.name === 'update_doctor') {
          actionSummaries.push(handleUpdateDoctor(call.args));
        } else if (call.name === 'cancel_appointment') {
          actionSummaries.push(handleCancelAppointment(call.args));
        } else if (call.name === 'update_appointment') {
          actionSummaries.push(handleUpdateAppointment(call.args));
        }
      }

      const textOutput = response.text ? `\n\n${response.text}` : '';
      return res.json({
        role: 'assistant',
        content: `${actionSummaries.join('\n\n')}${textOutput}\n\n*Clinic database and viewing modules updated in real-time.*`
      });
    }

    res.json({
      role: 'assistant',
      content: response.text || 'I could not generate a response at this moment. Please try again.'
    });

  } catch (error: any) {
    const isApiKeyError = error?.status === 400 || 
      error?.message?.includes('API key not valid') || 
      error?.message?.includes('API_KEY_INVALID') ||
      JSON.stringify(error || {}).includes('API_KEY_INVALID');

    if (isApiKeyError) {
      console.warn('Gemini API Key is invalid or expired. Falling back seamlessly to built-in smart AI Co-Pilot simulator.');
    } else {
      console.error('Gemini API Error:', error?.message || error);
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const dynamicReply = simulateResponse(lastUserMessage);

    return res.json({
      role: 'assistant',
      content: dynamicReply
    });
  }
});

// ------------------------------------
// Front-end Server & Vite Middleware
// ------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
