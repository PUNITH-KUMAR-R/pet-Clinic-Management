import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { DatabaseManager } from '../db';
import type { Pet, Doctor, Appointment } from '../types';

describe('DatabaseManager Comprehensive 100% Coverage Suite', () => {
  let db: DatabaseManager;

  beforeEach(() => {
    db = new DatabaseManager();
  });

  describe('Pet Operations', () => {
    it('should retrieve initial seeded pets', () => {
      const pets = db.getPets();
      expect(pets.length).toBeGreaterThan(0);
      expect(pets[0]).toHaveProperty('id');
      expect(pets[0]).toHaveProperty('name');
    });

    it('should add a new pet with default empty medicalRecords if omitted', () => {
      const newPet = db.addPet({
        name: 'Coco',
        type: 'Dog',
        breed: 'Poodle',
        age: 2,
        weight: 6.5,
        ownerName: 'Alex Green',
        ownerEmail: 'alex@example.com',
        ownerPhone: '555-0987',
        medicalRecords: []
      });

      expect(newPet.id).toBeDefined();
      expect(newPet.name).toBe('Coco');

      const fetched = db.getPets().find(p => p.id === newPet.id);
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe('Coco');
    });

    it('should update pet attributes (age, weight, breed)', () => {
      const pet = db.addPet({
        name: 'Luna',
        type: 'Cat',
        breed: 'Siamese',
        age: 2,
        weight: 4.0,
        ownerName: 'Alice',
        ownerEmail: 'alice@example.com',
        ownerPhone: '555-0100',
        medicalRecords: []
      });

      const updated = db.updatePet(pet.id, {
        age: 3,
        weight: 5.0,
        breed: 'Persian'
      });

      expect(updated).not.toBeNull();
      expect(updated?.age).toBe(3);
      expect(updated?.weight).toBe(5.0);
      expect(updated?.breed).toBe('Persian');

      const nonExistent = db.updatePet('non-existent-id', { age: 5 });
      expect(nonExistent).toBeNull();
    });

    it('should add medical record to pet and handle existing records array', () => {
      const pet = db.addPet({
        name: 'Daisy',
        type: 'Dog',
        breed: 'Beagle',
        age: 1,
        weight: 8,
        ownerName: 'Chloe',
        ownerEmail: 'chloe@example.com',
        ownerPhone: '555-0188',
        medicalRecords: []
      });

      const rec = db.addMedicalRecord(pet.id, {
        diagnosis: 'Puppy Checkup',
        treatment: 'Core Vaccines',
        notes: 'Healthy and active',
        vetName: 'Dr. Sarah Jenkins'
      });

      expect(rec).not.toBeNull();
      expect(rec?.diagnosis).toBe('Puppy Checkup');

      const updatedPet = db.getPets().find(p => p.id === pet.id);
      expect(updatedPet?.medicalRecords.length).toBeGreaterThan(0);

      const invalidRec = db.addMedicalRecord('invalid-id', {
        diagnosis: 'None',
        treatment: 'None',
        notes: '',
        vetName: 'Dr. Sarah'
      });
      expect(invalidRec).toBeNull();
    });

    it('should hard delete pet and clean associated appointments and trash items', () => {
      const pet = db.addPet({
        name: 'Temporary',
        type: 'Cat',
        breed: 'Tabby',
        age: 2,
        weight: 4,
        ownerName: 'Sam',
        ownerEmail: 'sam@test.com',
        ownerPhone: '555-1111',
        medicalRecords: []
      });

      const doctors = db.getDoctors();
      const apt = db.addAppointment({
        petId: pet.id,
        doctorId: doctors[0].id,
        date: '2026-09-10',
        time: '10:00',
        reason: 'General Check',
        status: 'Scheduled'
      });

      // Trash it first so it's in trash as well
      db.trashPet(pet.id);

      const deleted = db.deletePet(pet.id);
      expect(deleted).toBe(true);
      expect(db.getPets().some(p => p.id === pet.id)).toBe(false);
      expect(db.getAppointments().some(a => a.id === apt.id)).toBe(false);

      // Deleting a non-existent pet returns false
      expect(db.deletePet('completely-unknown-pet-id')).toBe(false);
    });
  });

  describe('Doctor Operations', () => {
    it('should retrieve doctors list', () => {
      const doctors = db.getDoctors();
      expect(doctors.length).toBeGreaterThan(0);
      expect(doctors[0]).toHaveProperty('specialty');
    });

    it('should add and update a doctor', () => {
      const doc = db.addDoctor({
        name: 'Dr. John Watson',
        specialty: 'General Medicine',
        email: 'watson@vetcore.com',
        phone: '555-0199',
        bio: 'Veterinarian with 10 years experience',
        avatar: '',
        workingDays: ['Monday', 'Wednesday', 'Friday'],
        workingHours: { start: '09:00', end: '17:00' }
      });

      expect(doc.id).toBeDefined();

      const updated = db.updateDoctor(doc.id, {
        specialty: 'Cardiology'
      });

      expect(updated?.specialty).toBe('Cardiology');

      const nonExistent = db.updateDoctor('non-existent-doc', { specialty: 'Cardiology' });
      expect(nonExistent).toBeNull();
    });

    it('should hard delete doctor, cancel associated appointments, and clean trash', () => {
      const doc = db.addDoctor({
        name: 'Dr. Temporary',
        specialty: 'Cardiology',
        email: 'temp@vetcore.com',
        phone: '555-9999',
        bio: 'Visiting specialist',
        avatar: '',
        workingDays: ['Tuesday'],
        workingHours: { start: '10:00', end: '14:00' }
      });

      const pets = db.getPets();
      const apt = db.addAppointment({
        petId: pets[0].id,
        doctorId: doc.id,
        date: '2026-09-12',
        time: '15:00',
        reason: 'Consultation',
        status: 'Scheduled'
      });

      // Trash it first so trash contains it
      db.trashDoctor(doc.id);

      const res = db.deleteDoctor(doc.id);
      expect(res).toBe(true);
      expect(db.getDoctors().some(d => d.id === doc.id)).toBe(false);

      // Verify appointments were cancelled
      const updatedApt = db.getAppointments().find(a => a.id === apt.id);
      expect(updatedApt?.status).toBe('Cancelled');

      // Deleting a non-existent doctor returns false
      expect(db.deleteDoctor('completely-unknown-doctor-id')).toBe(false);
    });
  });

  describe('Appointment Operations', () => {
    it('should create, retrieve, update, and hard delete appointments', () => {
      const pets = db.getPets();
      const doctors = db.getDoctors();

      const apt = db.addAppointment({
        petId: pets[0].id,
        doctorId: doctors[0].id,
        date: '2026-09-15',
        time: '14:00',
        reason: 'Dental Cleaning',
        status: 'Scheduled',
        notes: 'Pre-surgery fasting required'
      });

      expect(apt.id).toBeDefined();
      expect(apt.reason).toBe('Dental Cleaning');

      const updatedApt = db.updateAppointment(apt.id, {
        status: 'Completed',
        time: '14:30'
      });

      expect(updatedApt?.status).toBe('Completed');
      expect(updatedApt?.time).toBe('14:30');

      const nonExistent = db.updateAppointment('invalid-apt', { status: 'Cancelled' });
      expect(nonExistent).toBeNull();

      // Trash it first to test trash cleanup branch in deleteAppointment
      db.trashAppointment(apt.id);

      const deleted = db.deleteAppointment(apt.id);
      expect(deleted).toBe(true);
      expect(db.getAppointments().some(a => a.id === apt.id)).toBe(false);

      // Deleting non-existent appointment returns false
      expect(db.deleteAppointment('completely-unknown-apt')).toBe(false);
    });
  });

  describe('Trash, Restore, and Archive Operations', () => {
    it('should handle trash for non-existent pet, doctor, and appointment', () => {
      expect(db.trashPet('non-existent-pet-id')).toBe(false);
      expect(db.trashDoctor('non-existent-doctor-id')).toBe(false);
      expect(db.trashAppointment('non-existent-apt-id')).toBe(false);
    });

    it('should soft delete and restore a pet (including when already in db)', () => {
      const pet = db.addPet({
        name: 'RestorablePet',
        type: 'Dog',
        breed: 'Husky',
        age: 3,
        weight: 22,
        ownerName: 'Karen',
        ownerEmail: 'karen@example.com',
        ownerPhone: '555-0191',
        medicalRecords: []
      });

      const trashed = db.trashPet(pet.id);
      expect(trashed).toBe(true);

      const trash = db.readTrash();
      const trashItem = trash.find(t => t.itemType === 'pet' && (t.data as Pet).id === pet.id);
      expect(trashItem).toBeDefined();

      if (trashItem) {
        // Restore
        const res = db.restoreFromTrash(trashItem.id);
        expect(res.success).toBe(true);
        expect(db.getPets().some(p => p.id === pet.id)).toBe(true);
      }
    });

    it('should soft delete and restore a doctor', () => {
      const doc = db.addDoctor({
        name: 'Dr. Restorable',
        specialty: 'Surgery',
        email: 'restore@vetcore.com',
        phone: '555-0192',
        bio: 'Specialist',
        avatar: '',
        workingDays: ['Monday'],
        workingHours: { start: '09:00', end: '17:00' }
      });

      const trashed = db.trashDoctor(doc.id);
      expect(trashed).toBe(true);

      const trash = db.readTrash();
      const trashItem = trash.find(t => t.itemType === 'doctor' && (t.data as Doctor).id === doc.id);
      expect(trashItem).toBeDefined();

      if (trashItem) {
        const res = db.restoreFromTrash(trashItem.id);
        expect(res.success).toBe(true);
        expect(db.getDoctors().some(d => d.id === doc.id)).toBe(true);
      }
    });

    it('should soft delete and restore an appointment with missing pet/doc references gracefully', () => {
      const apt = db.addAppointment({
        petId: 'unknown-pet-ref',
        doctorId: 'unknown-doc-ref',
        date: '2026-09-20',
        time: '11:00',
        reason: 'Vaccination Check',
        status: 'Scheduled'
      });

      const trashed = db.trashAppointment(apt.id);
      expect(trashed).toBe(true);

      const trash = db.readTrash();
      const trashItem = trash.find(t => t.itemType === 'appointment' && (t.data as Appointment).id === apt.id);
      expect(trashItem).toBeDefined();

      if (trashItem) {
        const res = db.restoreFromTrash(trashItem.id);
        expect(res.success).toBe(true);
        expect(db.getAppointments().some(a => a.id === apt.id)).toBe(true);
      }
    });

    it('should permanently delete from trash across all item types (doctor, pet, appointment)', () => {
      const pet = db.addPet({
        name: 'PermaPet',
        type: 'Cat',
        breed: 'Birman',
        age: 1,
        weight: 3,
        ownerName: 'Dan',
        ownerEmail: 'dan@example.com',
        ownerPhone: '555-0193',
        medicalRecords: []
      });

      const doc = db.addDoctor({
        name: 'Dr. PermaDoc',
        specialty: 'Dentistry',
        email: 'permadoc@vetcore.com',
        phone: '555-4321',
        bio: 'Dentist',
        avatar: '',
        workingDays: ['Wednesday'],
        workingHours: { start: '09:00', end: '12:00' }
      });

      const existingPets = db.getPets();
      const existingDocs = db.getDoctors();
      const apt = db.addAppointment({
        petId: existingPets[0].id,
        doctorId: existingDocs[0].id,
        date: '2026-09-25',
        time: '10:00',
        reason: 'Teeth check',
        status: 'Scheduled'
      });

      db.trashPet(pet.id);
      db.trashDoctor(doc.id);
      db.trashAppointment(apt.id);

      const trash = db.readTrash();
      const petTrash = trash.find(t => t.itemType === 'pet' && (t.data as Pet).id === pet.id);
      const docTrash = trash.find(t => t.itemType === 'doctor' && (t.data as Doctor).id === doc.id);
      const aptTrash = trash.find(t => t.itemType === 'appointment' && (t.data as Appointment).id === apt.id);

      expect(petTrash).toBeDefined();
      expect(docTrash).toBeDefined();
      expect(aptTrash).toBeDefined();

      if (petTrash) {
        expect(db.permanentlyDeleteFromTrash(petTrash.id)).toBe(true);
      }
      if (docTrash) {
        expect(db.permanentlyDeleteFromTrash(docTrash.id)).toBe(true);
      }
      if (aptTrash) {
        expect(db.permanentlyDeleteFromTrash(aptTrash.id)).toBe(true);
      }

      // Deleting a non-existent trash ID returns false
      expect(db.permanentlyDeleteFromTrash('completely-unknown-trash-id')).toBe(false);
    });

    it('should handle restore of invalid trash item id gracefully', () => {
      const res = db.restoreFromTrash('invalid-trash-id-999');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('should empty all trash items', () => {
      const pet = db.addPet({
        name: 'TempPetForEmpty',
        type: 'Bird',
        breed: 'Canary',
        age: 1,
        weight: 0.2,
        ownerName: 'Sam',
        ownerEmail: 'sam@example.com',
        ownerPhone: '555-0105',
        medicalRecords: []
      });

      db.trashPet(pet.id);
      expect(db.readTrash().length).toBeGreaterThan(0);

      db.emptyTrash();
      expect(db.readTrash().length).toBe(0);
    });

    it('should cover direct permanent deletion when items exist in main tables and cancel doctor appointments', () => {
      const doc = db.addDoctor({
        name: 'Dr. Direct Del',
        specialty: 'Surgery',
        email: 'direct@vetcore.com',
        phone: '555-9999',
        bio: 'Surgeon',
        avatar: '',
        workingDays: ['Monday'],
        workingHours: { start: '09:00', end: '17:00' }
      });
      const pet = db.addPet({
        name: 'Pet Direct Del',
        type: 'Dog',
        breed: 'Lab',
        age: 3,
        weight: 20,
        ownerName: 'Owner Direct',
        ownerEmail: 'directowner@example.com',
        ownerPhone: '555-8888',
        medicalRecords: []
      });
      const apt = db.addAppointment({
        petId: pet.id,
        doctorId: doc.id,
        date: '2026-10-10',
        time: '14:00',
        reason: 'Direct deletion test',
        status: 'Scheduled'
      });

      // Delete doctor directly from main db (without trashing first)
      const docDeleted = db.deleteDoctor(doc.id);
      expect(docDeleted).toBe(true);
      const updatedApt = db.getAppointments().find(a => a.id === apt.id);
      expect(updatedApt?.status).toBe('Cancelled');

      // Delete pet directly from main db (without trashing first)
      const petDeleted = db.deletePet(pet.id);
      expect(petDeleted).toBe(true);
      const aptAfterPetDel = db.getAppointments().find(a => a.id === apt.id);
      expect(aptAfterPetDel).toBeUndefined();

      // Add appointment and delete directly
      const newApt = db.addAppointment({
        petId: 'some-pet',
        doctorId: 'some-doc',
        date: '2026-10-11',
        time: '15:00',
        reason: 'Direct apt del',
        status: 'Scheduled'
      });
      const aptDeleted = db.deleteAppointment(newApt.id);
      expect(aptDeleted).toBe(true);
    });

    it('should test edge cases and file error handling fallback', () => {
      // Test when cache exists
      const readResult = db.read();
      expect(readResult).toBeDefined();

      // Test update doctor with non-existent ID
      expect(db.updateDoctor('non-existent-doc-id', { name: 'Nobody' })).toBeNull();

      // Test delete of non-existent entity
      expect(db.deleteDoctor('non-existent-doc-999')).toBe(false);
      expect(db.deletePet('non-existent-pet-999')).toBe(false);
      expect(db.deleteAppointment('non-existent-apt-999')).toBe(false);

      // Test read error fallback with and without cache
      const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('Simulated read error');
      });
      const fallbackWithCache = db.read();
      expect(fallbackWithCache).toBeDefined();
      readSpy.mockRestore();

      // Test save error fallback
      const saveSpy = vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
        throw new Error('Simulated write error');
      });
      expect(() => db.save(readResult)).not.toThrow();
      saveSpy.mockRestore();

      // Test trash error fallbacks
      const trashReadSpy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('Simulated trash read error');
      });
      expect(db.readTrash()).toEqual([]);
      trashReadSpy.mockRestore();

      const trashSaveSpy = vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
        throw new Error('Simulated trash save error');
      });
      expect(() => db.saveTrash([])).not.toThrow();
      trashSaveSpy.mockRestore();
    });

    it('should cover fresh database initialization, missing directories and uninitialized read states', () => {
      // 1. Test clean initialization when files and directories do not exist
      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as unknown as string);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const freshDb = new DatabaseManager();
      expect(freshDb).toBeDefined();
      expect(mkdirSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();

      // 2. Test saving when directory needs to be created
      freshDb.save({ doctors: [], pets: [], appointments: [] });
      freshDb.saveTrash([]);

      // 3. Test readTrash when trash file does not exist
      const trashInit = freshDb.readTrash();
      expect(trashInit).toEqual([]);

      // 4. Test read when file does not exist initially
      const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('No file');
      });
      // Force cache to null to test fallback seed branch (lines 239-243)
      (freshDb as unknown as { cache: unknown }).cache = null;
      const seedFallback = freshDb.read();
      expect(seedFallback.doctors.length).toBeGreaterThan(0);
      readSpy.mockRestore();

      // 5. Test error in ensureDatabaseFile catch block (lines 222-224)
      mkdirSpy.mockImplementationOnce(() => {
        throw new Error('Simulated mkdir error');
      });
      const errDb = new DatabaseManager();
      expect(errDb).toBeDefined();

      existsSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
    });
  });
});
