import { describe, it, expect } from 'vitest';
import { Pet, Doctor, Appointment } from '../types';

describe('Pet Clinic Core Data Types & Logic', () => {
  it('should create and validate a Pet object', () => {
    const pet: Pet = {
      id: 'pet-1',
      name: 'Buddy',
      type: 'Dog',
      breed: 'Golden Retriever',
      age: 3,
      weight: 25,
      ownerName: 'Sarah Jenkins',
      ownerEmail: 'sarah@example.com',
      ownerPhone: '555-0199',
      medicalRecords: [
        {
          id: 'rec-1',
          date: '2026-07-30',
          diagnosis: 'Annual Wellness Checkup',
          treatment: 'Vaccinations updated',
          notes: 'Pet is in great health.',
          vetName: 'Dr. Sarah Jenkins'
        }
      ]
    };

    expect(pet.id).toBe('pet-1');
    expect(pet.name).toBe('Buddy');
    expect(pet.medicalRecords.length).toBe(1);
    expect(pet.medicalRecords[0].diagnosis).toContain('Annual');
  });

  it('should create and validate a Doctor object', () => {
    const doctor: Doctor = {
      id: 'doc-1',
      name: 'Dr. Sarah Jenkins',
      specialty: 'Surgery',
      email: 's.jenkins@vetcore.com',
      phone: '555-0101',
      bio: 'Lead Veterinary Surgeon',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: {
        start: '08:00',
        end: '17:00'
      }
    };

    expect(doctor.name).toBe('Dr. Sarah Jenkins');
    expect(doctor.workingDays).toContain('Monday');
    expect(doctor.workingHours.start).toBe('08:00');
  });

  it('should validate appointment structure', () => {
    const appointment: Appointment = {
      id: 'apt-101',
      petId: 'pet-1',
      doctorId: 'doc-1',
      date: '2026-08-05',
      time: '10:00',
      reason: 'Routine Vaccination',
      status: 'Scheduled',
      notes: 'First appointment of the month'
    };

    expect(appointment.status).toBe('Scheduled');
    expect(appointment.petId).toBe('pet-1');
    expect(appointment.doctorId).toBe('doc-1');
  });
});
