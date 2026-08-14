import fs from 'fs';
import path from 'path';
import { Doctor, Pet, Appointment, MedicalRecord, TrashItem } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'clinic_db.json');
const TRASH_FILE = path.join(DATA_DIR, 'trash.json');

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

export class DatabaseManager {
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
    let foundInDb = false;
    const initialLen = db.doctors.length;
    db.doctors = db.doctors.filter(d => d.id !== id);
    
    if (db.doctors.length !== initialLen) {
      foundInDb = true;
      // Cancel appointments associated with deleted doctor
      db.appointments = db.appointments.map(apt => 
        apt.doctorId === id ? { ...apt, status: 'Cancelled', notes: 'Doctor permanently deleted' } : apt
      );
      this.save(db);
    }

    // Always clean up from trash as well if present
    const trashItems = this.readTrash();
    const updatedTrash = trashItems.filter(t => !(t.itemType === 'doctor' && ((t.data as Doctor).id === id || t.id === id)));
    let foundInTrash = false;
    if (updatedTrash.length !== trashItems.length) {
      foundInTrash = true;
      this.saveTrash(updatedTrash);
    }

    return foundInDb || foundInTrash;
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
    let foundInDb = false;
    const initialLen = db.pets.length;
    db.pets = db.pets.filter(p => p.id !== id);
    
    if (db.pets.length !== initialLen) {
      foundInDb = true;
      db.appointments = db.appointments.filter(apt => apt.petId !== id);
      this.save(db);
    }

    // Always clean up from trash as well if present
    const trashItems = this.readTrash();
    const updatedTrash = trashItems.filter(t => !(t.itemType === 'pet' && ((t.data as Pet).id === id || t.id === id)));
    let foundInTrash = false;
    if (updatedTrash.length !== trashItems.length) {
      foundInTrash = true;
      this.saveTrash(updatedTrash);
    }

    return foundInDb || foundInTrash;
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
    let foundInDb = false;
    const initialLen = db.appointments.length;
    db.appointments = db.appointments.filter(a => a.id !== id);

    if (db.appointments.length !== initialLen) {
      foundInDb = true;
      this.save(db);
    }

    // Always clean up from trash as well if present
    const trashItems = this.readTrash();
    const updatedTrash = trashItems.filter(t => !(t.itemType === 'appointment' && ((t.data as Appointment).id === id || t.id === id)));
    let foundInTrash = false;
    if (updatedTrash.length !== trashItems.length) {
      foundInTrash = true;
      this.saveTrash(updatedTrash);
    }

    return foundInDb || foundInTrash;
  }

  // ------------------------------------
  // Trash / Deleted Data Storage Operations
  // ------------------------------------
  public readTrash(): TrashItem[] {
    try {
      if (!fs.existsSync(TRASH_FILE)) {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(TRASH_FILE, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const data = fs.readFileSync(TRASH_FILE, 'utf-8');
      return JSON.parse(data) as TrashItem[];
    } catch (err) {
      console.error('Failed to read trash file:', err);
      return [];
    }
  }

  public saveTrash(trashItems: TrashItem[]): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(TRASH_FILE, JSON.stringify(trashItems, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save trash file:', err);
    }
  }

  public trashDoctor(id: string): boolean {
    const db = this.read();
    const doc = db.doctors.find(d => d.id === id);
    if (!doc) return false;

    // Move to trash
    const trashItems = this.readTrash();
    trashItems.unshift({
      id: `trash-doc-${Date.now()}`,
      itemType: 'doctor',
      deletedAt: new Date().toISOString(),
      itemName: doc.name,
      data: doc
    });
    this.saveTrash(trashItems);

    // Delete from active doctors and cancel associated appointments
    db.doctors = db.doctors.filter(d => d.id !== id);
    db.appointments = db.appointments.map(apt =>
      apt.doctorId === id ? { ...apt, status: 'Cancelled', notes: 'Doctor moved to trash' } : apt
    );
    this.save(db);
    return true;
  }

  public trashPet(id: string): boolean {
    const db = this.read();
    const pet = db.pets.find(p => p.id === id);
    if (!pet) return false;

    const trashItems = this.readTrash();
    trashItems.unshift({
      id: `trash-pet-${Date.now()}`,
      itemType: 'pet',
      deletedAt: new Date().toISOString(),
      itemName: `${pet.name} (${pet.breed})`,
      data: pet
    });
    this.saveTrash(trashItems);

    db.pets = db.pets.filter(p => p.id !== id);
    db.appointments = db.appointments.filter(apt => apt.petId !== id);
    this.save(db);
    return true;
  }

  public trashAppointment(id: string): boolean {
    const db = this.read();
    const apt = db.appointments.find(a => a.id === id);
    if (!apt) return false;

    const pet = db.pets.find(p => p.id === apt.petId);
    const doc = db.doctors.find(d => d.id === apt.doctorId);
    const itemName = `Appointment on ${apt.date} at ${apt.time} (${pet ? pet.name : 'Pet'} with ${doc ? doc.name : 'Doctor'})`;

    const trashItems = this.readTrash();
    trashItems.unshift({
      id: `trash-apt-${Date.now()}`,
      itemType: 'appointment',
      deletedAt: new Date().toISOString(),
      itemName,
      data: apt
    });
    this.saveTrash(trashItems);

    db.appointments = db.appointments.filter(a => a.id !== id);
    this.save(db);
    return true;
  }

  public restoreFromTrash(trashId: string): { success: boolean; itemType?: string; error?: string } {
    const trashItems = this.readTrash();
    const idx = trashItems.findIndex(t => t.id === trashId);
    if (idx === -1) {
      return { success: false, error: 'Item not found in trash.' };
    }

    const item = trashItems[idx];
    const db = this.read();

    if (item.itemType === 'doctor') {
      const doc = item.data as Doctor;
      if (!db.doctors.some(d => d.id === doc.id)) {
        db.doctors.push(doc);
      }
    } else if (item.itemType === 'pet') {
      const pet = item.data as Pet;
      if (!db.pets.some(p => p.id === pet.id)) {
        db.pets.push(pet);
      }
    } else if (item.itemType === 'appointment') {
      const apt = item.data as Appointment;
      if (!db.appointments.some(a => a.id === apt.id)) {
        db.appointments.push(apt);
      }
    }

    this.save(db);
    trashItems.splice(idx, 1);
    this.saveTrash(trashItems);

    return { success: true, itemType: item.itemType };
  }

  public permanentlyDeleteFromTrash(trashId: string): boolean {
    const trashItems = this.readTrash();
    const item = trashItems.find(t => t.id === trashId);

    const updated = trashItems.filter(t => t.id !== trashId);
    let removedFromTrash = updated.length !== trashItems.length;
    if (removedFromTrash) {
      this.saveTrash(updated);
    }

    if (item) {
      if (item.itemType === 'doctor') {
        this.deleteDoctor((item.data as Doctor).id);
      } else if (item.itemType === 'pet') {
        this.deletePet((item.data as Pet).id);
      } else if (item.itemType === 'appointment') {
        this.deleteAppointment((item.data as Appointment).id);
      }
      return true;
    }

    return removedFromTrash;
  }

  public emptyTrash(): boolean {
    this.saveTrash([]);
    return true;
  }
}

export const db = new DatabaseManager();
