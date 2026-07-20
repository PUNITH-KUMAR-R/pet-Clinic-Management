import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Doctor, Pet, Appointment, MedicalRecord } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Data Store (Initialized with high-quality seed data)
let doctors: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Jenkins',
    specialty: 'General Medicine',
    email: 'sarah.jenkins@petclinic.com',
    phone: '555-0101',
    bio: 'Over 12 years of experience in small animal medicine. Passionate about preventative care and wellness.',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: { start: '09:00', end: '17:00' }
  },
  {
    id: 'doc-2',
    name: 'Dr. Robert Chen',
    specialty: 'Surgery',
    email: 'robert.chen@petclinic.com',
    phone: '555-0102',
    bio: 'Board-certified veterinary surgeon specializing in orthopedic and soft tissue reconstruction procedures.',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    workingDays: ['Monday', 'Wednesday', 'Friday'],
    workingHours: { start: '08:00', end: '16:00' }
  },
  {
    id: 'doc-3',
    name: 'Dr. Emily Ross',
    specialty: 'Dermatology',
    email: 'emily.ross@petclinic.com',
    phone: '555-0103',
    bio: 'Expert in managing chronic allergies, ear infections, and autoimmune skin disorders in cats and dogs.',
    avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300',
    workingDays: ['Tuesday', 'Thursday'],
    workingHours: { start: '09:00', end: '17:00' }
  },
  {
    id: 'doc-4',
    name: 'Dr. Marcus Vance',
    specialty: 'Dentistry',
    email: 'marcus.vance@petclinic.com',
    phone: '555-0104',
    bio: 'Specializes in veterinary periodontology, endodontics, and oral surgery with a focus on pain-free treatments.',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
    workingDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
    workingHours: { start: '10:00', end: '18:00' }
  }
];

let pets: Pet[] = [
  {
    id: 'pet-1',
    name: 'Bella',
    type: 'Dog',
    breed: 'Golden Retriever',
    age: 3,
    weight: 28.5,
    ownerName: 'John Doe',
    ownerEmail: 'john.doe@gmail.com',
    ownerPhone: '555-0201',
    medicalRecords: [
      {
        id: 'rec-1',
        date: '2026-02-15',
        diagnosis: 'Annual Checkup & DHPP Booster',
        treatment: 'Administered DHPP vaccine, flea/tick preventative prescription renewed.',
        notes: 'Heart rate and respiration normal. Coat is healthy. Teeth show mild tartar.',
        vetName: 'Dr. Sarah Jenkins'
      },
      {
        id: 'rec-2',
        date: '2026-05-10',
        diagnosis: 'Mild Dermatitis',
        treatment: 'Prescribed Apoquel (16mg) and topical chlorhexidine wipes.',
        notes: 'Flea-free allergy suspected. Monitor for redness around paws and belly.',
        vetName: 'Dr. Emily Ross'
      }
    ]
  },
  {
    id: 'pet-2',
    name: 'Luna',
    type: 'Cat',
    breed: 'Siamese',
    age: 2,
    weight: 4.2,
    ownerName: 'Alice Smith',
    ownerEmail: 'alice.smith@yahoo.com',
    ownerPhone: '555-0202',
    medicalRecords: [
      {
        id: 'rec-3',
        date: '2026-04-01',
        diagnosis: 'Spay & Microchipping',
        treatment: 'Surgical ovariohysterectomy under general anesthesia. HomeAgain microchip inserted.',
        notes: 'Recovery was uneventful. Sutures are intact, no swelling or discharge.',
        vetName: 'Dr. Robert Chen'
      }
    ]
  },
  {
    id: 'pet-3',
    name: 'Rocky',
    type: 'Bird',
    breed: 'African Grey Parrot',
    age: 5,
    weight: 0.45,
    ownerName: 'Bob Johnson',
    ownerEmail: 'bob.johnson@outlook.com',
    ownerPhone: '555-0203',
    medicalRecords: [
      {
        id: 'rec-4',
        date: '2026-01-20',
        diagnosis: 'Beak and Feather Quality Assessment',
        treatment: 'Dietary counseling, added calcium and vitamin D3 supplements.',
        notes: 'Slight stress bars on feathers. Recommended increasing foraging toys and sunlight exposure.',
        vetName: 'Dr. Sarah Jenkins'
      }
    ]
  }
];

let appointments: Appointment[] = [
  {
    id: 'apt-1',
    petId: 'pet-1',
    doctorId: 'doc-1',
    date: '2026-07-22',
    time: '10:00',
    reason: 'Follow-up on skin dermatitis',
    status: 'Scheduled',
    notes: 'Owner reports redness is subsiding'
  },
  {
    id: 'apt-2',
    petId: 'pet-2',
    doctorId: 'doc-2',
    date: '2026-07-24',
    time: '09:30',
    reason: 'Suture check post-surgery',
    status: 'Scheduled',
    notes: 'Checking healing of incision'
  },
  {
    id: 'apt-3',
    petId: 'pet-3',
    doctorId: 'doc-4',
    date: '2026-07-23',
    time: '14:00',
    reason: 'Routine beak trimming',
    status: 'Scheduled',
    notes: 'Rocky is a bit anxious during handling'
  }
];

// Helper to determine day of week from YYYY-MM-DD
function getDayName(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// ------------------------------------
// Doctors Endpoints
// ------------------------------------
app.get('/api/doctors', (req, res) => {
  res.json(doctors);
});

app.post('/api/doctors', (req, res) => {
  const newDoc: Doctor = {
    id: `doc-${Date.now()}`,
    ...req.body
  };
  doctors.push(newDoc);
  res.status(201).json(newDoc);
});

app.put('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const index = doctors.findIndex(d => d.id === id);
  if (index !== -1) {
    doctors[index] = { ...doctors[index], ...req.body };
    res.json(doctors[index]);
  } else {
    res.status(404).json({ error: 'Doctor not found' });
  }
});

app.delete('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  doctors = doctors.filter(d => d.id !== id);
  // Also clean up or cancel appointments for this doctor
  appointments = appointments.map(apt => 
    apt.doctorId === id ? { ...apt, status: 'Cancelled', notes: 'Doctor is no longer with the clinic' } : apt
  );
  res.json({ success: true, message: 'Doctor deleted and associated appointments cancelled.' });
});


// ------------------------------------
// Pets Endpoints
// ------------------------------------
app.get('/api/pets', (req, res) => {
  res.json(pets);
});

app.post('/api/pets', (req, res) => {
  const newPet: Pet = {
    id: `pet-${Date.now()}`,
    name: req.body.name,
    type: req.body.type,
    breed: req.body.breed,
    age: Number(req.body.age),
    weight: Number(req.body.weight),
    ownerName: req.body.ownerName,
    ownerEmail: req.body.ownerEmail,
    ownerPhone: req.body.ownerPhone,
    medicalRecords: req.body.medicalRecords || []
  };
  pets.push(newPet);
  res.status(201).json(newPet);
});

app.put('/api/pets/:id', (req, res) => {
  const { id } = req.params;
  const index = pets.findIndex(p => p.id === id);
  if (index !== -1) {
    pets[index] = { 
      ...pets[index], 
      ...req.body,
      age: req.body.age !== undefined ? Number(req.body.age) : pets[index].age,
      weight: req.body.weight !== undefined ? Number(req.body.weight) : pets[index].weight
    };
    res.json(pets[index]);
  } else {
    res.status(404).json({ error: 'Pet not found' });
  }
});

app.delete('/api/pets/:id', (req, res) => {
  const { id } = req.params;
  pets = pets.filter(p => p.id !== id);
  // Remove or cancel appointments for this pet
  appointments = appointments.filter(apt => apt.petId !== id);
  res.json({ success: true, message: 'Pet and associated appointments removed.' });
});

// Add medical record to pet
app.post('/api/pets/:id/records', (req, res) => {
  const { id } = req.params;
  const pet = pets.find(p => p.id === id);
  if (pet) {
    const record: MedicalRecord = {
      id: `rec-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      diagnosis: req.body.diagnosis,
      treatment: req.body.treatment,
      notes: req.body.notes || '',
      vetName: req.body.vetName
    };
    pet.medicalRecords.unshift(record); // Add to beginning
    res.status(201).json(record);
  } else {
    res.status(404).json({ error: 'Pet not found' });
  }
});


// ------------------------------------
// Appointments Endpoints & Availability Engine
// ------------------------------------
app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const { petId, doctorId, date, time, reason, notes } = req.body;

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

  // 4. Validate working hours (basic HH:MM boundaries)
  if (time < doctor.workingHours.start || time > doctor.workingHours.end) {
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

  const newApt: Appointment = {
    id: `apt-${Date.now()}`,
    petId,
    doctorId,
    date,
    time,
    reason,
    status: 'Scheduled',
    notes: notes || ''
  };

  appointments.push(newApt);
  res.status(201).json(newApt);
});

app.put('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const index = appointments.findIndex(apt => apt.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const currentApt = appointments[index];
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

  appointments[index] = updatedData;
  res.json(appointments[index]);
});

app.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const index = appointments.findIndex(apt => apt.id === id);
  if (index !== -1) {
    // Soft-delete: cancel it, or hard-delete. Let's do a hard delete to demonstrate deleting
    appointments.splice(index, 1);
    res.json({ success: true, message: 'Appointment deleted.' });
  } else {
    res.status(404).json({ error: 'Appointment not found.' });
  }
});


// ------------------------------------
// Gemini Co-Pilot AI Advisor Endpoint
// ------------------------------------
app.post('/api/gemini/co-pilot', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.json({
      role: 'assistant',
      content: `⚠️ **AI Co-pilot Sandbox Notice**:\n\nThe **GEMINI_API_KEY** is not configured. To enable this live AI Co-pilot assistant for booking conflict resolution and symptomatic care guidelines, please open the **Secrets panel** via **Settings > Secrets** in the top-right AI Studio interface and paste your API key with the name \`GEMINI_API_KEY\`.\n\n*Simulation Response*: Let's pretend I can see your scheduled data! Dr. Sarah Jenkins is fully booked at 10:00 on July 22, but Dr. Marcus Vance is available. For basic symptomatic skin irritation in dogs (Bella's case), a temporary oatmeal bath may soothe scratching until an appointment is confirmed.`
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

    // Provide context of current doctors, pets, and appointments
    const context = `
You are the "AI Clinic Co-Pilot" for a premium veterinary practice, Pet Clinic Management.
You help clinic administrators and patients resolve booking conflicts, suggest schedule adjustments, and offer preliminary, highly professional symptomatic treatment guidance.

Current Clinic Data State:
Doctors Available:
${JSON.stringify(doctors.map(d => ({ id: d.id, name: d.name, specialty: d.specialty, days: d.workingDays, hours: d.workingHours })))}

Registered Pets:
${JSON.stringify(pets.map(p => ({ id: p.id, name: p.name, type: p.type, breed: p.breed, age: p.age })))}

Current Appointments scheduled:
${JSON.stringify(appointments.filter(a => a.status === 'Scheduled').map(a => ({ id: a.id, doctor: doctors.find(d => d.id === a.doctorId)?.name, date: a.date, time: a.time, reason: a.reason })))}

Rules:
1. For scheduling issues: If there's a conflict or booking query, analyze working days/hours and booked slots. Suggest realistic alternative slots (e.g. "Dr. Robert is free on Monday mornings, let's look at 11:00 AM on Monday, July 27").
2. For symptomatic advice: Offer clear, comforting, and safe preliminary care suggestions (e.g., proper hydration, gentle cooling, wound cleaning, temporary diets) but **ALWAYS** include a professional, prominent veterinary disclaimer emphasizing that the AI is not a doctor and the animal should be examined.
3. Be friendly, structured (use bold text, lists, clear formatting), and professional. Keep answers focused and concise.
`;

    // Map conversation messages to Gemini contents format
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Generate content
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: context
      }
    });

    res.json({
      role: 'assistant',
      content: response.text || 'I could not generate a response at this moment. Please try again.'
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with AI Co-pilot: ' + error.message });
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
