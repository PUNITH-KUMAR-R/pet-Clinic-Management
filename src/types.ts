export interface MedicalRecord {
  id: string;
  date: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  vetName: string;
}

export interface Pet {
  id: string;
  name: string;
  type: 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Reptile' | 'Other';
  breed: string;
  age: number; // in years
  weight: number; // in kg
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  medicalRecords: MedicalRecord[];
}

export interface Doctor {
  id: string;
  name: string;
  specialty: 'General Medicine' | 'Surgery' | 'Dermatology' | 'Dentistry' | 'Cardiology' | 'Behavioral';
  email: string;
  phone: string;
  bio: string;
  avatar: string;
  workingDays: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  workingHours: {
    start: string; // e.g. "09:00"
    end: string; // e.g. "17:00"
  };
}

export interface Appointment {
  id: string;
  petId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reason: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
  clinicId?: string; // Multi-clinic tenant ID simulation
}

export interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface CoPilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TrashItem {
  id: string;
  itemType: 'doctor' | 'pet' | 'appointment';
  deletedAt: string;
  itemName: string;
  data: Doctor | Pet | Appointment;
}

