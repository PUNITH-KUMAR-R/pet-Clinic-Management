import fs from 'fs';
import path from 'path';
import { Doctor, Pet, Appointment, MedicalRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'clinic_db.json');

export interface ClinicDatabase {
  doctors: Doctor[];
  pets: Pet[];
  appointments: Appointment[];
}

const INITIAL_DOCTORS: Doctor[] = [
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

const INITIAL_PETS: Pet[] = [
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

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    petId: 'pet-1',
    doctorId: 'doc-1',
    date: '2026-08-10',
    time: '10:00',
    reason: 'Follow-up on skin dermatitis',
    status: 'Scheduled',
    notes: 'Owner reports redness is subsiding'
  },
  {
    id: 'apt-2',
    petId: 'pet-2',
    doctorId: 'doc-2',
    date: '2026-08-12',
    time: '09:30',
    reason: 'Suture check post-surgery',
    status: 'Scheduled',
    notes: 'Checking healing of incision'
  },
  {
    id: 'apt-3',
    petId: 'pet-3',
    doctorId: 'doc-4',
    date: '2026-08-11',
    time: '14:00',
    reason: 'Routine beak trimming',
    status: 'Scheduled',
    notes: 'Rocky is a bit anxious during handling'
  }
];

class DatabaseManager {
  private cache: ClinicDatabase | null = null;

  constructor() {
    this.ensureDatabaseFile();
  }

  private ensureDatabaseFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (!fs.existsSync(DB_FILE)) {
        const seedData: ClinicDatabase = {
          doctors: INITIAL_DOCTORS,
          pets: INITIAL_PETS,
          appointments: INITIAL_APPOINTMENTS
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
        this.cache = seedData;
      }
    } catch (err) {
      console.error('Error initializing database file:', err);
    }
  }

  public read(): ClinicDatabase {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.ensureDatabaseFile();
      }
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(fileData) as ClinicDatabase;
      this.cache = parsed;
      return parsed;
    } catch (err) {
      console.error('Failed to read database file, falling back to cache/seed:', err);
      if (this.cache) return this.cache;
      return {
        doctors: INITIAL_DOCTORS,
        pets: INITIAL_PETS,
        appointments: INITIAL_APPOINTMENTS
      };
    }
  }

  public save(db: ClinicDatabase): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
      this.cache = db;
    } catch (err) {
      console.error('Failed to save to database file:', err);
    }
  }

  // Doctors
  public getDoctors(): Doctor[] {
    return this.read().doctors;
  }

  public addDoctor(doctorData: Omit<Doctor, 'id'>): Doctor {
    const db = this.read();
    const newDoc: Doctor = {
      id: `doc-${Date.now()}`,
      ...doctorData
    };
    db.doctors.push(newDoc);
    this.save(db);
    return newDoc;
  }

  public updateDoctor(id: string, doctorData: Partial<Doctor>): Doctor | null {
    const db = this.read();
    const idx = db.doctors.findIndex(d => d.id === id);
    if (idx === -1) return null;

    db.doctors[idx] = { ...db.doctors[idx], ...doctorData };
    this.save(db);
    return db.doctors[idx];
  }

  public deleteDoctor(id: string): boolean {
    const db = this.read();
    const initialLen = db.doctors.length;
    db.doctors = db.doctors.filter(d => d.id !== id);
    
    if (db.doctors.length !== initialLen) {
      // Cancel appointments associated with deleted doctor
      db.appointments = db.appointments.map(apt => 
        apt.doctorId === id ? { ...apt, status: 'Cancelled', notes: 'Doctor no longer with clinic' } : apt
      );
      this.save(db);
      return true;
    }
    return false;
  }

  // Pets
  public getPets(): Pet[] {
    return this.read().pets;
  }

  public addPet(petData: Omit<Pet, 'id'>): Pet {
    const db = this.read();
    const newPet: Pet = {
      id: `pet-${Date.now()}`,
      ...petData,
      medicalRecords: petData.medicalRecords || []
    };
    db.pets.push(newPet);
    this.save(db);
    return newPet;
  }

  public updatePet(id: string, petData: Partial<Pet>): Pet | null {
    const db = this.read();
    const idx = db.pets.findIndex(p => p.id === id);
    if (idx === -1) return null;

    db.pets[idx] = { ...db.pets[idx], ...petData };
    this.save(db);
    return db.pets[idx];
  }

  public deletePet(id: string): boolean {
    const db = this.read();
    const initialLen = db.pets.length;
    db.pets = db.pets.filter(p => p.id !== id);
    
    if (db.pets.length !== initialLen) {
      db.appointments = db.appointments.filter(apt => apt.petId !== id);
      this.save(db);
      return true;
    }
    return false;
  }

  public addMedicalRecord(petId: string, recordData: Omit<MedicalRecord, 'id' | 'date'>): MedicalRecord | null {
    const db = this.read();
    const pet = db.pets.find(p => p.id === petId);
    if (!pet) return null;

    const record: MedicalRecord = {
      id: `rec-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...recordData
    };
    if (!pet.medicalRecords) pet.medicalRecords = [];
    pet.medicalRecords.unshift(record);
    this.save(db);
    return record;
  }

  // Appointments
  public getAppointments(): Appointment[] {
    return this.read().appointments;
  }

  public addAppointment(aptData: Omit<Appointment, 'id'>): Appointment {
    const db = this.read();
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      ...aptData
    };
    db.appointments.push(newApt);
    this.save(db);
    return newApt;
  }

  public updateAppointment(id: string, aptData: Partial<Appointment>): Appointment | null {
    const db = this.read();
    const idx = db.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;

    db.appointments[idx] = { ...db.appointments[idx], ...aptData };
    this.save(db);
    return db.appointments[idx];
  }

  public deleteAppointment(id: string): boolean {
    const db = this.read();
    const initialLen = db.appointments.length;
    db.appointments = db.appointments.filter(a => a.id !== id);

    if (db.appointments.length !== initialLen) {
      this.save(db);
      return true;
    }
    return false;
  }
}

export const db = new DatabaseManager();
