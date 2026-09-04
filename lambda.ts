import serverless from 'serverless-http';
import express from 'express';
import dotenv from 'dotenv';
import { Doctor, Pet, Appointment } from './src/types';
import { db } from './src/db';

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

// 1. Strip API Gateway Stage/Function prefix
app.use((req, res, next) => {
  if (req.url.startsWith('/default/vetcore-api-lambda')) {
    req.url = req.url.replace('/default/vetcore-api-lambda', '') || '/';
  } else if (req.url.startsWith('/default')) {
    req.url = req.url.replace('/default', '') || '/';
  }
  next();
});

// 2. Full CORS Support for All HTTP Methods (GET, POST, PUT, DELETE, OPTIONS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper functions for doctor availability scheduling
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
// Health Checks
// ------------------------------------
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'VetCore API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', runtime: 'AWS Lambda' });
});

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

  const petExists = pets.some(p => p.id === petId);
  if (!petExists) {
    return res.status(400).json({ error: 'Selected pet does not exist.' });
  }

  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) {
    return res.status(400).json({ error: 'Selected doctor does not exist.' });
  }

  const dayName = getDayName(date);
  const isWorkingDay = doctor.workingDays.includes(dayName);
  if (!isWorkingDay) {
    return res.status(400).json({ 
      error: `${doctor.name} does not work on ${dayName}s. Available days: ${doctor.workingDays.join(', ')}` 
    });
  }

  const apptMins = timeToMinutes(time);
  const startMins = timeToMinutes(doctor.workingHours.start);
  const endMins = timeToMinutes(doctor.workingHours.end);
  if (apptMins < startMins || apptMins > endMins) {
    return res.status(400).json({ 
      error: `Time slot ${time} is outside of ${doctor.name}'s working hours (${doctor.workingHours.start} - ${doctor.workingHours.end}).` 
    });
  }

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

export { db };
export const handler = serverless(app);
