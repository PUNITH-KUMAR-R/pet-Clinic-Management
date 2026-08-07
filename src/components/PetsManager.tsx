import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, FileText, Search, User, Mail, Phone, Calendar, Heart, ShieldPlus, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Pet, MedicalRecord, Doctor } from '../types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface PetsManagerProps {
  pets: Pet[];
  doctors: Doctor[];
  onRefresh: () => void;
}

export default function PetsManager({ pets, doctors, onRefresh }: PetsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);

  // New Medical Record Form states
  const [selectedPetForRecord, setSelectedPetForRecord] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [vetName, setVetName] = useState('');
  const [notes, setNotes] = useState('');

  // Pet form state
  const [name, setName] = useState('');
  const [type, setType] = useState<Pet['type']>('Dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setType('Dog');
    setBreed('');
    setAge('');
    setWeight('');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPhone('');
    setError(null);
  };

  const startEdit = (pet: Pet) => {
    setEditingPet(pet);
    setName(pet.name);
    setType(pet.type);
    setBreed(pet.breed);
    setAge(pet.age.toString());
    setWeight(pet.weight.toString());
    setOwnerName(pet.ownerName);
    setOwnerEmail(pet.ownerEmail);
    setOwnerPhone(pet.ownerPhone);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !breed.trim() || !age || !weight || !ownerName.trim() || !ownerEmail.trim() || !ownerPhone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      name,
      type,
      breed,
      age: Number(age),
      weight: Number(weight),
      ownerName,
      ownerEmail,
      ownerPhone,
      medicalRecords: editingPet ? editingPet.medicalRecords : []
    };

    try {
      const url = editingPet ? `/api/pets/${editingPet.id}` : '/api/pets';
      const method = editingPet ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingPet ? 'Pet profile updated successfully!' : 'New pet profile registered!');
        resetForm();
        setShowAddForm(false);
        setEditingPet(null);
        onRefresh();
      } else {
        setError(data.error || 'Failed to save pet profile.');
      }
    } catch (err) {
      setError('Connection failure. Try again.');
    }
  };

  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmPermanentDelete = async () => {
    if (!deletingPet) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pets/${deletingPet.id}?permanent=true`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Pet profile "${deletingPet.name}" permanently deleted.`);
        onRefresh();
      } else {
        setError(data.error || 'Failed to delete pet profile.');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setIsDeleting(false);
      setDeletingPet(null);
    }
  };

  const handleConfirmMoveToTrash = async () => {
    if (!deletingPet) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pets/${deletingPet.id}?permanent=false`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Pet profile "${deletingPet.name}" moved to Trash / Deleted Data (trash.json).`);
        onRefresh();
      } else {
        setError(data.error || 'Failed to move pet profile to trash.');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setIsDeleting(false);
      setDeletingPet(null);
    }
  };

  const handleAddMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim() || !treatment.trim() || !vetName.trim()) {
      setError('Diagnosis, Treatment, and Veterinarian are required.');
      return;
    }

    try {
      const response = await fetch(`/api/pets/${selectedPetForRecord}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis, treatment, notes, vetName })
      });

      if (response.ok) {
        setSuccess('Medical record logged successfully!');
        setDiagnosis('');
        setTreatment('');
        setVetName('');
        setNotes('');
        setSelectedPetForRecord(null);
        onRefresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save medical record.');
      }
    } catch (err) {
      setError('Connection failure.');
    }
  };

  const filteredPets = pets.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="pets-manager">
      {/* Upper bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Registered Pets & Patients</h3>
          <p className="text-xs text-slate-500">Manage patient medical records, vaccinations, and owner contact details.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by pet, breed or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border border-slate-200 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 outline-none bg-white transition-all duration-150"
            />
          </div>
          <button
            onClick={() => {
              if (showAddForm) {
                resetForm();
                setEditingPet(null);
                setShowAddForm(false);
              } else {
                resetForm();
                setShowAddForm(true);
              }
            }}
            className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors duration-150 shadow-sm whitespace-nowrap"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddForm ? 'Cancel' : 'Register Pet'}</span>
          </button>
        </div>
      </div>

      {/* Message logs */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{success}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
            {editingPet ? `Edit Pet Profile: ${editingPet.name}` : 'Register New Pet Profile'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pet Info */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Patient Information</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Pet Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Buddy"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Pet Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Pet['type'])}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Reptile">Reptile</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Breed *</label>
                  <input
                    type="text"
                    required
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="e.g. Beagle"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="2.5"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="12.4"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Owner Contact Information</h5>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Owner Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Owner Phone *</label>
                  <input
                    type="text"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="555-0201"
                    className="w-full text-xs border border-slate-200 bg-white focus:border-teal-500 rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingPet(null);
                setShowAddForm(false);
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingPet ? 'Save Profile' : 'Register Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Append Medical Record Form overlay/in-line */}
      {selectedPetForRecord && (
        <form onSubmit={handleAddMedicalRecord} className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <h4 className="text-sm font-bold text-amber-900 flex items-center space-x-1.5">
              <ShieldPlus className="w-4 h-4 text-amber-700" />
              <span>Log Medical History / Immunization for {pets.find(p => p.id === selectedPetForRecord)?.name}</span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedPetForRecord(null)}
              className="text-amber-700 hover:text-amber-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Diagnosis or Vaccine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Rabies Vaccine / Feline Leukemia treatment"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full text-xs border border-amber-200 bg-white focus:border-amber-500 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Treatment / Medicine Prescribed *</label>
                <input
                  type="text"
                  required
                  placeholder="Administered booster shot / prescribed tablet treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  className="w-full text-xs border border-amber-200 bg-white focus:border-amber-500 rounded-xl p-2.5 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Attending Veterinarian *</label>
                <select
                  required
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                  className="w-full text-xs border border-amber-200 bg-white focus:border-amber-500 rounded-xl p-2.5 outline-none"
                >
                  <option value="">-- Select Veterinarian --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.name}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Clinical Case Notes</label>
                <input
                  type="text"
                  placeholder="Sutures clean, normal respiration levels, next booster in 1 year"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-amber-200 bg-white focus:border-amber-500 rounded-xl p-2.5 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={() => setSelectedPetForRecord(null)}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log Records</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid List of Pets */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPets.map((pet) => {
          const isExpanded = expandedPetId === pet.id;
          return (
            <div
              key={pet.id}
              className="bg-white border border-slate-200/80 rounded-2xl hover:shadow-sm hover:border-slate-300 transition-all duration-150 overflow-hidden"
            >
              {/* Profile Bar */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 border border-teal-100 font-bold text-lg">
                    {pet.name.substring(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-800 text-sm leading-snug">{pet.name}</h4>
                      <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {pet.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{pet.breed} • {pet.age} Years Old • {pet.weight} kg</p>
                  </div>
                </div>

                {/* Owner details */}
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 text-xs text-slate-500 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{pet.ownerName}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pet.ownerEmail}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pet.ownerPhone}</span>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5 md:self-center self-end pt-2 md:pt-0">
                  <button
                    onClick={() => setSelectedPetForRecord(pet.id)}
                    className="flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-150"
                  >
                    <ShieldPlus className="w-3.5 h-3.5" />
                    <span>Log History</span>
                  </button>
                  <button
                    onClick={() => startEdit(pet)}
                    className="p-1.5 border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 hover:border-teal-500 transition-all duration-150 cursor-pointer bg-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingPet(pet)}
                    className="p-1.5 border border-slate-200 rounded-xl text-slate-600 hover:text-rose-600 hover:border-rose-500 transition-all duration-150 cursor-pointer bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedPetId(isExpanded ? null : pet.id)}
                    className="p-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all duration-150 cursor-pointer bg-white flex items-center justify-center"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible medical history records */}
              {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-150 p-5 space-y-4">
                  <h5 className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Clinical Case Records & Vaccines ({pet.medicalRecords.length})</span>
                  </h5>

                  {pet.medicalRecords.length > 0 ? (
                    <div className="space-y-3">
                      {pet.medicalRecords.map((rec) => (
                        <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 relative shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                              {rec.diagnosis}
                            </span>
                            <span className="text-slate-400 font-medium flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{rec.date}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold mt-1">
                            Treatment: <span className="font-normal text-slate-600">{rec.treatment}</span>
                          </p>
                          {rec.notes && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                              "{rec.notes}"
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 text-right pt-1 border-t border-slate-100">
                            Attending Vet: <strong className="text-slate-600">{rec.vetName}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                      <Heart className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                      <span>No clinical logs found. Click "Log History" above to add immunization records.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredPets.length === 0 && (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed text-slate-500">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs">No pet profiles matched your query or are currently registered.</p>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deletingPet)}
        itemType="pet"
        itemName={deletingPet ? `${deletingPet.name} (${deletingPet.breed})` : ''}
        onConfirmPermanent={handleConfirmPermanentDelete}
        onConfirmMoveToTrash={handleConfirmMoveToTrash}
        onCancel={() => setDeletingPet(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
