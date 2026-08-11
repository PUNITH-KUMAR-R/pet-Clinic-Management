import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Bot, User, RefreshCw, RotateCcw, 
  UserPlus, Calendar, Mail, Phone, Stethoscope, 
  Check, CheckCircle2, ShieldCheck, XCircle, ChevronRight, HelpCircle
} from 'lucide-react';
import { CoPilotMessage, Pet, Doctor, Appointment } from '../types';

interface AICopilotProps {
  onRefreshData?: () => void;
  pets?: Pet[];
  doctors?: Doctor[];
  appointments?: Appointment[];
}

interface ActiveWizardState {
  type: 'doctor' | 'pet' | 'appointment' | 'patient-portal';
  step: number;
  data: Record<string, any>;
}

const DEFAULT_INITIAL_MESSAGE: CoPilotMessage = {
  id: 'init',
  role: 'assistant',
  content: '👋 Hi! I am your interactive AI Practice Assistant.\n\nI can register new doctors, enroll patients & pets, book appointments, or pull patient portal records through an **interactive step-by-step conversation**!\n\nClick a module below or type *"register doctor"*, *"add pet"*, *"book appointment"*, or *"patient portal"* to begin!',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

// Helpers for Appointment & Doctor matching
function findDoctor(userInput: string, doctorsList: Doctor[]): Doctor | undefined {
  if (!doctorsList || doctorsList.length === 0) return undefined;
  
  const rawInput = userInput.trim().toLowerCase();
  const cleanInput = rawInput.replace(/^(dr\.?\s*|doctor\s*)+/gi, '').trim();

  // 1. Direct match on ID
  let match = doctorsList.find(d => d.id.toLowerCase() === rawInput);
  if (match) return match;

  // 2. Direct match on full name or clean name
  match = doctorsList.find(d => {
    const docCleanName = d.name.toLowerCase().replace(/^(dr\.?\s*|doctor\s*)+/gi, '').trim();
    return d.name.toLowerCase() === rawInput || 
           docCleanName === cleanInput ||
           d.name.toLowerCase().includes(cleanInput) ||
           (cleanInput.length >= 2 && docCleanName.includes(cleanInput));
  });
  if (match) return match;

  // 3. Match individual name words
  const inputWords = cleanInput.split(/\s+/).filter(w => w.length >= 2);
  if (inputWords.length > 0) {
    match = doctorsList.find(d => {
      const docCleanName = d.name.toLowerCase().replace(/^(dr\.?\s*|doctor\s*)+/gi, '').trim();
      return inputWords.some(word => docCleanName.includes(word));
    });
    if (match) return match;
  }

  // 4. Match on specialty
  match = doctorsList.find(d => d.specialty.toLowerCase().includes(rawInput) || rawInput.includes(d.specialty.toLowerCase()));
  if (match) return match;

  // 5. Index matching (e.g., "1", "2")
  const num = parseInt(rawInput, 10);
  if (!isNaN(num) && num >= 1 && num <= doctorsList.length) {
    return doctorsList[num - 1];
  }

  return undefined;
}

function formatTime12h(time24: string): string {
  if (!time24) return '09:00 AM';
  const parts = time24.split(':');
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] ? parts[1].slice(0, 2) : '00';
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseRequestedDay(input: string): string | null {
  const lower = input.toLowerCase();

  // 1. Direct day name matching
  const dayMatch = lower.match(/\b(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i);
  if (dayMatch) {
    const key = dayMatch[1].toLowerCase();
    if (key.startsWith('sun')) return 'Sunday';
    if (key.startsWith('mon')) return 'Monday';
    if (key.startsWith('tue')) return 'Tuesday';
    if (key.startsWith('wed')) return 'Wednesday';
    if (key.startsWith('thu')) return 'Thursday';
    if (key.startsWith('fri')) return 'Friday';
    if (key.startsWith('sat')) return 'Saturday';
  }

  // 2. Relative date words: "today", "tomorrow"
  if (lower.includes('today')) {
    return FULL_DAYS[new Date().getDay()];
  }
  if (lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return FULL_DAYS[d.getDay()];
  }

  // 3. Date string matching e.g. "2026-08-15"
  const dateObj = new Date(input.replace(/at\s+\d+:\d+.*/i, '').trim());
  if (!isNaN(dateObj.getTime())) {
    return FULL_DAYS[dateObj.getDay()];
  }

  return null;
}

function normalizeDoctorDays(docDays: string[] = []): string[] {
  return docDays.map(d => {
    const lower = d.trim().toLowerCase();
    if (lower.startsWith('sun')) return 'Sunday';
    if (lower.startsWith('mon')) return 'Monday';
    if (lower.startsWith('tue')) return 'Tuesday';
    if (lower.startsWith('wed')) return 'Wednesday';
    if (lower.startsWith('thu')) return 'Thursday';
    if (lower.startsWith('fri')) return 'Friday';
    if (lower.startsWith('sat')) return 'Saturday';
    return d;
  });
}

function getNextDateForDay(dayName: string): string {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  if (targetDayIndex === -1) {
    return new Date().toISOString().split('T')[0];
  }

  const today = new Date();
  const currentDayIndex = today.getDay();
  let daysUntilTarget = targetDayIndex - currentDayIndex;

  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseWorkingDays(scheduleStr: string): string[] {
  const lower = scheduleStr.toLowerCase();
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDaysMap: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tues: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thur: 4, thurs: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6
  };

  if (lower.includes('everyday') || lower.includes('all days') || lower.includes('7 days') || lower.includes('daily')) {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }

  // Check for range e.g. "Monday to Friday" or "Mon - Fri" or "Mon-Fri"
  const rangeMatch = lower.match(/\b(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\s*(?:to|-|through|until)\s*(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/i);

  if (rangeMatch) {
    const startIdx = shortDaysMap[rangeMatch[1].toLowerCase()];
    const endIdx = shortDaysMap[rangeMatch[2].toLowerCase()];
    if (startIdx !== undefined && endIdx !== undefined) {
      const resultDays: string[] = [];
      let current = startIdx;
      while (true) {
        resultDays.push(allDays[current]);
        if (current === endIdx) break;
        current = (current + 1) % 7;
      }
      if (resultDays.length > 0) return resultDays;
    }
  }

  // Check for individual days explicitly mentioned
  const detectedIndices = new Set<number>();
  const dayTokens = lower.match(/\b(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi);
  if (dayTokens) {
    dayTokens.forEach(t => {
      const idx = shortDaysMap[t.toLowerCase()];
      if (idx !== undefined) detectedIndices.add(idx);
    });
  }

  if (detectedIndices.size > 0) {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const sorted = order.filter(i => detectedIndices.has(i)).map(i => allDays[i]);
    return sorted;
  }

  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
}

function parseWorkingHours(scheduleStr: string): { start: string; end: string } {
  const rangeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|until|–)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = scheduleStr.match(rangeRegex);

  if (match) {
    let startHour = parseInt(match[1], 10);
    const startMin = match[2] || '00';
    let startAmpm = match[3] ? match[3].toLowerCase() : null;

    let endHour = parseInt(match[4], 10);
    const endMin = match[5] || '00';
    let endAmpm = match[6] ? match[6].toLowerCase() : null;

    if (!startAmpm && !endAmpm) {
      if (endHour < startHour || (endHour < 12 && startHour >= 7)) {
        if (endHour < startHour) endAmpm = 'pm';
      }
    }
    if (!startAmpm && endAmpm === 'pm') {
      if (startHour <= 12 && startHour >= 7) startAmpm = 'am';
      else if (startHour < 7) startAmpm = 'pm';
    }
    if (startAmpm === 'am' && !endAmpm) {
      if (endHour < startHour || endHour <= 7) endAmpm = 'pm';
      else endAmpm = 'am';
    }

    if (startAmpm === 'pm' && startHour < 12) startHour += 12;
    if (startAmpm === 'am' && startHour === 12) startHour = 0;

    if (endAmpm === 'pm' && endHour < 12) endHour += 12;
    if (endAmpm === 'am' && endHour === 12) endHour = 0;

    const startFormatted = `${String(startHour).padStart(2, '0')}:${startMin}`;
    const endFormatted = `${String(endHour).padStart(2, '0')}:${endMin}`;

    return { start: startFormatted, end: endFormatted };
  }

  return { start: '09:00', end: '17:00' };
}

function parseTimeString(input: string): string {
  const match = input.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
  if (!match) return '10:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? match[2] : '00';
  const period = match[3] ? match[3].toUpperCase() : null;

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const hStr = String(hours).padStart(2, '0');
  return `${hStr}:${minutes}`;
}

export default function AICopilot({ onRefreshData, pets = [], doctors = [], appointments = [] }: AICopilotProps) {
  const [messages, setMessages] = useState<CoPilotMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vetcore_copilot_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    return [DEFAULT_INITIAL_MESSAGE];
  });

  const [activeWizard, setActiveWizard] = useState<ActiveWizardState | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('vetcore_copilot_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleClearChat = () => {
    setMessages([DEFAULT_INITIAL_MESSAGE]);
    setActiveWizard(null);
    localStorage.removeItem('vetcore_copilot_messages');
  };

  const cancelWizard = () => {
    setActiveWizard(null);
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '🚫 **Registration flow cancelled.** How else can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Helper to start any module wizard
  const startWizard = (type: 'doctor' | 'pet' | 'appointment' | 'patient-portal') => {
    let promptText = '';

    if (type === 'doctor') {
      promptText = '👨‍⚕️ **Doctor Registration Wizard Initialized**\n\nI will guide you step by step! First, what is the **doctor\'s full name**? *(e.g. Dr. Sarah Vance)*';
    } else if (type === 'pet') {
      promptText = '🐾 **Patient & Pet Registration Wizard Initialized**\n\nLet\'s register a new patient step by step! First, what is the **pet\'s name** and **species**? *(e.g. "Max, Dog" or "Luna, Cat")*';
    } else if (type === 'appointment') {
      const petListStr = pets.length > 0 ? pets.map(p => p.name).slice(0, 4).join(', ') : 'No pets registered yet';
      promptText = `📅 **Appointment Booking Assistant**\n\nFirst, which **pet name or owner email** is this appointment for?\n*(Registered pets: ${petListStr})*`;
    } else if (type === 'patient-portal') {
      promptText = '🔑 **Patient Portal Record Lookup**\n\nPlease enter the **registered owner email address** or **pet name** to pull clinical records & upcoming visits:';
    }

    setActiveWizard({ type, step: 0, data: {} });

    setMessages(prev => [...prev, {
      id: `wiz-start-${Date.now()}`,
      role: 'assistant',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Process Wizard Step Input
  const processWizardStep = async (userInput: string) => {
    if (!activeWizard) return;

    const trimmed = userInput.trim();
    if (trimmed.toLowerCase() === 'cancel' || trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'stop') {
      cancelWizard();
      return;
    }

    const { type, step, data } = activeWizard;

    // -------------------------------------------------------------
    // 1. DOCTOR REGISTRATION STEP BY STEP
    // -------------------------------------------------------------
    if (type === 'doctor') {
      if (step === 0) {
        // Step 0: Name -> Ask Gender
        const cleanRaw = trimmed.replace(/^(dr\.?\s*|doctor\s*)+/i, '').trim();
        const capitalized = cleanRaw ? cleanRaw.replace(/\b\w/g, c => c.toUpperCase()) : trimmed;
        const formattedName = `Dr. ${capitalized}`;
        const newData = { ...data, name: formattedName };
        setActiveWizard({ type, step: 1, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Great, **${formattedName}**!\n\nNext (Step 2/6): Is the doctor **Male** or **Female**?\n*(This helps select an appropriate profile photo for the doctor)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } 
      else if (step === 1) {
        // Step 1: Gender -> Ask Specialty & Assign Avatar Photo
        const lowerG = trimmed.toLowerCase();
        const isFemale = lowerG.includes('female') || lowerG.includes('woman') || lowerG.includes('she') || lowerG === 'f';
        const gender = isFemale ? 'Female' : 'Male';

        // Select high quality doctor photo based on gender
        const femaleAvatars = [
          'https://images.unsplash.com/photo-1594824813566-78a08c8e1e7f?auto=format&fit=crop&q=80&w=300',
          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
          'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=300'
        ];
        const maleAvatars = [
          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
          'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300'
        ];

        const avatarList = isFemale ? femaleAvatars : maleAvatars;
        const selectedAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];

        const newData = { ...data, gender, avatar: selectedAvatar };
        setActiveWizard({ type, step: 2, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Gender recorded: **${gender}** 👤 (assigned appropriate ${gender.toLowerCase()} doctor profile photo).\n\nNext (Step 3/6): What is **${data.name}**'s **medical specialty**?\n*(e.g., General Medicine, Surgery, Dermatology, Dentistry, Cardiology, Behavioral, Orthopedics)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 2) {
        // Step 2: Specialty -> Ask Email
        const newData = { ...data, specialty: trimmed };
        setActiveWizard({ type, step: 3, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Specialty recorded: **${trimmed}**.\n\nNext (Step 4/6): What is **${data.name}**'s professional **email address**?\n*(e.g. doctor@vetclinic.com)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 3) {
        // Step 3: Email -> Ask Phone
        const newData = { ...data, email: trimmed };
        setActiveWizard({ type, step: 4, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Email logged: **${trimmed}**.\n\nNext (Step 5/6): What is **${data.name}**'s **contact phone number**?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 4) {
        // Step 4: Phone -> Ask Working Days & Hours Grid
        const newData = { ...data, phone: trimmed };
        setActiveWizard({ type, step: 5, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Phone recorded: **${trimmed}**.\n\nFinal Question (Step 6/6): What are their **available working days and shift hours**?\n*(e.g. "Monday to Friday, 9:00 AM to 5:00 PM" or "Mon, Wed, Fri 10am - 4pm")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 5) {
        // Step 5: Schedule -> Finalize Doctor Registration
        setLoading(true);
        const scheduleStr = trimmed;
        
        const workingDays = parseWorkingDays(scheduleStr);
        const workingHours = parseWorkingHours(scheduleStr);

        const docPayload = {
          name: data.name,
          gender: data.gender || 'Male',
          specialty: data.specialty || 'General Medicine',
          email: data.email,
          phone: data.phone || '(555) 123-4567',
          bio: `${data.specialty} Specialist`,
          avatar: data.avatar,
          workingDays,
          workingHours
        };

        try {
          const res = await fetch('/api/doctors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docPayload)
          });
          const resData = await res.json();
          const registered = resData.doctor || resData;

          if (res.ok && registered && (registered.id || registered.name)) {
            const rawName = registered.name || data.name;
            const docDisplayName = rawName.toLowerCase().startsWith('dr.') ? rawName : `Dr. ${rawName}`;
            
            const startH = registered.workingHours?.start || workingHours.start;
            const endH = registered.workingHours?.end || workingHours.end;
            const formattedHours = `${formatTime12h(startH)} - ${formatTime12h(endH)}`;

            setMessages(prev => [...prev, {
              id: `complete-${Date.now()}`,
              role: 'assistant',
              content: `🎉 **DOCTOR REGISTRATION COMPLETED!**\n\n**${docDisplayName}** (${data.gender || 'Male'}) has been successfully registered in the clinic database with an appropriate profile photo!\n\n📋 **Doctor Summary Card:**\n• **Gender:** ${data.gender || 'Male'}\n• **Specialty:** ${registered.specialty}\n• **Email:** ${registered.email}\n• **Phone:** ${registered.phone}\n• **Available Grid:** ${Array.isArray(registered.workingDays) ? registered.workingDays.join(', ') : 'Mon - Fri'} (${formattedHours})\n\n*Live clinic schedule updated!*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            if (onRefreshData) onRefreshData();
          } else {
            throw new Error(resData.error || 'Registration failed');
          }
        } catch (e: any) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `❌ Could not complete doctor registration: ${e.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } finally {
          setLoading(false);
          setActiveWizard(null);
        }
      }
    }

    // -------------------------------------------------------------
    // 2. PET / PATIENT REGISTRATION STEP BY STEP
    // -------------------------------------------------------------
    else if (type === 'pet') {
      if (step === 0) {
        // Step 0: Name & Species -> Ask Breed, Age, Weight
        const lower = trimmed.toLowerCase();
        let species = 'Dog';
        if (lower.includes('cat') || lower.includes('feline') || lower.includes('kitten')) species = 'Cat';
        else if (lower.includes('bird') || lower.includes('parrot') || lower.includes('canary')) species = 'Bird';
        else if (lower.includes('rabbit') || lower.includes('bunny')) species = 'Rabbit';
        else if (lower.includes('dog') || lower.includes('canine') || lower.includes('puppy')) species = 'Dog';

        // Extract pet name
        let parts = trimmed.split(/[,-\/]+/);
        let rawName = parts[0]?.trim() || trimmed;

        // If user typed only species name (e.g. "Cat", "dog", "cat")
        if (['cat', 'dog', 'bird', 'rabbit', 'feline', 'canine', 'kitten', 'puppy'].includes(rawName.toLowerCase())) {
          rawName = species === 'Cat' ? 'Milo' : species === 'Dog' ? 'Buddy' : 'Pet';
        } else {
          // Clean species word out of name if user wrote e.g. "Luna Cat" or "Luna, Cat"
          const cleanName = rawName.replace(new RegExp(`\\b(${species}|cat|dog|bird|rabbit|feline|canine)\\b`, 'gi'), '').trim();
          if (cleanName) rawName = cleanName;
        }

        let breedExamples = '';
        let emoji = '🐾';
        if (species === 'Cat') {
          emoji = '🐱';
          breedExamples = 'Popular Cat breeds: Persian, Siamese, Maine Coon, Domestic Shorthair, Ragdoll, Bengal\n*(e.g., "Persian, 2 years, 4 kg")*';
        } else if (species === 'Dog') {
          emoji = '🐶';
          breedExamples = 'Popular Dog breeds: Golden Retriever, German Shepherd, Labrador, Poodle, Beagle, French Bulldog\n*(e.g., "Golden Retriever, 3 years, 15 kg")*';
        } else if (species === 'Bird') {
          emoji = '🦜';
          breedExamples = 'Popular Bird species: Cockatiel, Parakeet, Canary, Lovebird, Macaw\n*(e.g., "Cockatiel, 1 year, 0.1 kg")*';
        } else if (species === 'Rabbit') {
          emoji = '🐰';
          breedExamples = 'Popular Rabbit breeds: Holland Lop, Netherland Dwarf, Mini Rex, Lionhead\n*(e.g., "Holland Lop, 2 years, 2 kg")*';
        } else {
          breedExamples = '*(e.g., "Mixed Breed, 2 years, 5 kg")*';
        }

        const newData = { ...data, name: rawName, type: species };
        setActiveWizard({ type, step: 1, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Got it! Patient Name: **${rawName}** (${species}) ${emoji}\n\nNext (Step 2/5): What is **${rawName}**'s **breed**, **age (in years)**, and **weight (in kg)**?\n\n• ${breedExamples}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 1) {
        // Step 1: Breed/Age/Weight -> Ask Owner Name & Email
        const ageMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:year|yr|y)/i);
        const weightMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|pound|lb)/i);

        const breedParts = trimmed.split(/[,-\/]/);
        let extractedBreed = breedParts[0]?.trim() || trimmed;
        extractedBreed = extractedBreed.replace(/\d+.*$/, '').trim() || extractedBreed;

        const ageVal = ageMatch ? parseFloat(ageMatch[1]) : (data.type === 'Bird' ? 1 : 2);
        const defaultWeight = data.type === 'Cat' ? 4 : data.type === 'Bird' ? 0.1 : data.type === 'Rabbit' ? 2 : 12;
        const weightVal = weightMatch ? parseFloat(weightMatch[1]) : defaultWeight;
        const finalBreed = extractedBreed || (data.type === 'Cat' ? 'Domestic Shorthair' : 'Mixed Breed');

        const newData = { 
          ...data, 
          breed: finalBreed,
          breedInfo: trimmed,
          age: ageVal,
          weight: weightVal
        };
        setActiveWizard({ type, step: 2, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Recorded details for **${data.name}**: Breed: **${finalBreed}**, Age: **${ageVal} yrs**, Weight: **${weightVal} kg**.\n\nNext (Step 3/5): What is the **pet owner's full name** and **email address**?\n*(e.g., "John Doe, john.doe@gmail.com")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 2) {
        // Step 2: Owner Name/Email -> Ask Owner Phone
        const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0] : 'owner@example.com';
        const ownerName = trimmed.replace(email, '').replace(/[,]/g, '').trim() || 'Pet Owner';

        const newData = { ...data, ownerName, ownerEmail: email };
        setActiveWizard({ type, step: 3, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Owner set: **${ownerName}** (${email}).\n\nNext (Step 4/5): What is **${ownerName}**'s **phone number**?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 3) {
        // Step 3: Phone -> Ask Medical History
        const newData = { ...data, ownerPhone: trimmed };
        setActiveWizard({ type, step: 4, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Phone recorded: **${trimmed}**.\n\nFinal Question (Step 5/5): Are there any **initial medical notes, allergies, or vaccination details** to record?\n*(e.g., "Rabies vaccine updated, no known allergies")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 4) {
        // Step 4: Medical History -> Finalize Pet Registration
        setLoading(true);
        const notes = trimmed;

        const petPayload = {
          name: data.name,
          type: data.type || 'Dog',
          breed: data.breed || data.breedInfo || 'Mixed Breed',
          age: data.age || 2,
          weight: data.weight || 10,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          ownerPhone: data.ownerPhone || '(555) 000-1122',
          medicalRecords: [{
            id: `rec-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            diagnosis: 'Initial Interactive Registration',
            treatment: 'Routine Intake Completed',
            notes,
            vetName: 'AI Practice Intake'
          }]
        };

        try {
          const res = await fetch('/api/pets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(petPayload)
          });
          const resData = await res.json();
          const registered = resData.pet || resData;

          if (res.ok && registered && (registered.id || registered.name)) {
            setMessages(prev => [...prev, {
              id: `complete-${Date.now()}`,
              role: 'assistant',
              content: `🐾 **PATIENT REGISTRATION COMPLETED!**\n\nPatient **${registered.name}** (${registered.type}) is now registered!\n\n📋 **Patient Passport:**\n• **Breed:** ${registered.breed}\n• **Owner Name:** ${registered.ownerName}\n• **Owner Email:** ${registered.ownerEmail}\n• **Contact:** ${registered.ownerPhone}\n• **Medical History:** ${notes}\n\n*Added to active patient database!*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            if (onRefreshData) onRefreshData();
          } else {
            throw new Error(resData.error || 'Pet registration failed');
          }
        } catch (e: any) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `❌ Could not complete pet registration: ${e.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } finally {
          setLoading(false);
          setActiveWizard(null);
        }
      }
    }

    // -------------------------------------------------------------
    // 3. APPOINTMENT BOOKING STEP BY STEP
    // -------------------------------------------------------------
    else if (type === 'appointment') {
      if (step === 0) {
        // Step 0: Pet lookup -> Ask Doctor
        const matchedPet = pets.find(p => 
          p.name.toLowerCase().includes(trimmed.toLowerCase()) || 
          p.ownerEmail.toLowerCase().includes(trimmed.toLowerCase())
        );

        const selectedPet = matchedPet || pets[0];
        const newData = { ...data, petId: selectedPet?.id, petName: selectedPet?.name || trimmed };
        setActiveWizard({ type, step: 1, data: newData });

        const docListStr = doctors.length > 0 
          ? doctors.map(d => `${d.name} (${d.specialty})`).join('\n• ') 
          : 'General Vet';

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Selected Patient: **${newData.petName}** 🐾\n\nNext (Step 2/4): Which **doctor or specialty** would you like to visit?\n\n• ${docListStr}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 1) {
        // Step 1: Doctor -> Ask Date & Time
        const selectedDoc = findDoctor(trimmed, doctors) || doctors[0];
        const docName = selectedDoc ? selectedDoc.name : (trimmed.toLowerCase().startsWith('dr.') ? trimmed : `Dr. ${trimmed}`);

        const docWorkingDays = selectedDoc?.workingDays && selectedDoc.workingDays.length > 0
          ? selectedDoc.workingDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        const daysFormatted = docWorkingDays.join(', ');

        let hoursFormatted = '09:00 AM - 05:00 PM';
        if (selectedDoc?.workingHours?.start && selectedDoc?.workingHours?.end) {
          hoursFormatted = `${formatTime12h(selectedDoc.workingHours.start)} - ${formatTime12h(selectedDoc.workingHours.end)}`;
        }

        const newData = { 
          ...data, 
          doctorId: selectedDoc?.id || 'doc-1', 
          doctorName: docName,
          doctorObj: selectedDoc 
        };
        setActiveWizard({ type, step: 2, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Selected Doctor: **${docName}** (${selectedDoc?.specialty || 'General Vet'}) 👨‍⚕️\n\n📅 **Doctor Availability:**\n• **Available Days:** ${daysFormatted}\n• **Working Hours:** ${hoursFormatted}\n\nNext (Step 3/4): What **day and time** would you like to schedule your appointment?\n*(e.g., "Monday at 10:00 AM" or "Friday at 2:00 PM")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 2) {
        // Step 2: Date & Time -> Validate Availability & Ask Reason
        const docObj: Doctor | undefined = data.doctorObj || doctors.find(d => d.id === data.doctorId) || doctors[0];
        const docWorkingDays = docObj?.workingDays && docObj.workingDays.length > 0
          ? docObj.workingDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        const requestedDay = parseRequestedDay(trimmed);

        if (requestedDay) {
          const normDocDays = normalizeDoctorDays(docWorkingDays);
          const isAvailable = normDocDays.includes(requestedDay);

          if (!isAvailable) {
            // DO NOT advance step! Stay on step 2 so user can choose a valid day and time.
            const daysFormatted = docWorkingDays.join(', ');
            let hoursFormatted = '09:00 AM - 05:00 PM';
            if (docObj?.workingHours?.start && docObj?.workingHours?.end) {
              hoursFormatted = `${formatTime12h(docObj.workingHours.start)} - ${formatTime12h(docObj.workingHours.end)}`;
            }

            setMessages(prev => [...prev, {
              id: `unavail-${Date.now()}`,
              role: 'assistant',
              content: `The chosen doctor is unavailable on the given day and time; please pick another day and time for your appointment.\n\n📋 **${data.doctorName}'s Available Schedule:**\n• **Available Days:** ${daysFormatted}\n• **Working Hours:** ${hoursFormatted}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            return; // Remain on Step 2
          }
        }

        let dateStr = new Date().toISOString().split('T')[0];
        if (requestedDay) {
          dateStr = getNextDateForDay(requestedDay);
        }

        const ymdMatch = trimmed.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
        if (ymdMatch) {
          dateStr = `${ymdMatch[1]}-${String(ymdMatch[2]).padStart(2, '0')}-${String(ymdMatch[3]).padStart(2, '0')}`;
        }

        const timeStr = parseTimeString(trimmed);

        const newData = { ...data, date: dateStr, time: timeStr, rawDateTime: trimmed };
        setActiveWizard({ type, step: 3, data: newData });

        setMessages(prev => [...prev, {
          id: `step-${Date.now()}`,
          role: 'assistant',
          content: `Requested Slot: **${trimmed}** ✅\n\nFinal Question (Step 4/4): What is the **primary reason** for this visit?\n*(e.g., "Annual checkup & vaccines", "Lethargy", "Skin consultation")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      else if (step === 3) {
        // Step 3: Reason -> Finalize Appointment
        setLoading(true);
        const reason = trimmed;

        const aptPayload = {
          petId: data.petId || pets[0]?.id || 'pet-1',
          doctorId: data.doctorId || doctors[0]?.id || 'doc-1',
          date: data.date || new Date().toISOString().split('T')[0],
          time: data.time || '10:00',
          reason: reason || 'Routine Clinical Consultation',
          status: 'Scheduled'
        };

        try {
          const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aptPayload)
          });
          const resData = await res.json();
          const apt = resData.appointment || resData;

          if (res.ok && apt && (apt.id || apt.date)) {
            const dayName = parseRequestedDay(apt.date) || '';
            const slotDisplay = `${apt.date}${dayName ? ` (${dayName})` : ''} at ${formatTime12h(apt.time)}`;

            setMessages(prev => [...prev, {
              id: `complete-${Date.now()}`,
              role: 'assistant',
              content: `📅 **APPOINTMENT CONFIRMED & BOOKED!**\n\n• **Patient:** ${data.petName}\n• **Attending Doctor:** ${data.doctorName}\n• **Date & Slot:** ${slotDisplay}\n• **Reason:** ${apt.reason}\n• **Status:** Scheduled\n\n*Added to the clinic calendar!*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            if (onRefreshData) onRefreshData();
          } else {
            throw new Error(resData.error || 'Appointment booking failed');
          }
        } catch (e: any) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `❌ Could not book appointment: ${e.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } finally {
          setLoading(false);
          setActiveWizard(null);
        }
      }
    }

    // -------------------------------------------------------------
    // 4. PATIENT PORTAL LOOKUP STEP BY STEP
    // -------------------------------------------------------------
    else if (type === 'patient-portal') {
      setLoading(true);
      const query = trimmed.toLowerCase();

      const matchedPet = pets.find(p => 
        p.ownerEmail.toLowerCase().includes(query) || 
        p.name.toLowerCase().includes(query) ||
        p.ownerName.toLowerCase().includes(query)
      );

      if (matchedPet) {
        const petApts = appointments.filter(a => a.petId === matchedPet.id);
        const aptsFormatted = petApts.length > 0 
          ? petApts.map(a => `• **${a.date} at ${a.time}** - ${a.reason} (${a.status})`).join('\n')
          : '• No upcoming appointments found.';

        const historyFormatted = matchedPet.medicalRecords && matchedPet.medicalRecords.length > 0
          ? matchedPet.medicalRecords.map(r => `• **${r.date}:** ${r.diagnosis} - ${r.notes}`).join('\n')
          : '• Initial intake recorded. No recent hospitalizations.';

        setMessages(prev => [...prev, {
          id: `complete-${Date.now()}`,
          role: 'assistant',
          content: `🔑 **PATIENT PORTAL DOSSIER RETRIEVED**\n\n🐾 **Patient Profile:**\n• **Name:** ${matchedPet.name} (${matchedPet.type} - ${matchedPet.breed})\n• **Age & Weight:** ${matchedPet.age} yrs | ${matchedPet.weight} kg\n• **Owner:** ${matchedPet.ownerName} (${matchedPet.ownerEmail})\n• **Contact Phone:** ${matchedPet.ownerPhone}\n\n📋 **Medical Records:**\n${historyFormatted}\n\n📅 **Scheduled Appointments:**\n${aptsFormatted}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `complete-${Date.now()}`,
          role: 'assistant',
          content: `🔍 **Lookup Result:** No patient record found matching **"${trimmed}"**.\n\nYou can register this patient right now by clicking **+ Pet / Patient** above or typing *"register pet"*!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }

      setLoading(false);
      setActiveWizard(null);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: CoPilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // If active wizard exists, handle input via wizard step processor
    if (activeWizard) {
      await processWizardStep(text);
      return;
    }

    const textLower = text.toLowerCase();

    // Check for trigger phrases to launch wizard flows
    if (textLower.includes('doctor') && (textLower.includes('register') || textLower.includes('add') || textLower.includes('new') || textLower.includes('create'))) {
      startWizard('doctor');
      return;
    }
    if ((textLower.includes('pet') || textLower.includes('patient')) && (textLower.includes('register') || textLower.includes('add') || textLower.includes('new') || textLower.includes('create'))) {
      startWizard('pet');
      return;
    }
    if ((textLower.includes('appointment') || textLower.includes('book') || textLower.includes('schedule') || textLower.includes('visit')) && (textLower.includes('register') || textLower.includes('add') || textLower.includes('new') || textLower.includes('make'))) {
      startWizard('appointment');
      return;
    }
    if (textLower.includes('portal') || textLower.includes('lookup') || textLower.includes('dossier') || textLower.includes('record')) {
      startWizard('patient-portal');
      return;
    }

    // Otherwise send general chat query to server API
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/co-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });

      const data = await response.json();
      if (response.ok && data.content) {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        if (onRefreshData) onRefreshData();
      } else {
        throw new Error(data.error || 'Server temporary issue');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I am ready! You can register doctors, pets, book visits, or lookup records interactively by clicking the buttons above!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden h-[680px] flex flex-col" id="ai-copilot-container">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
            <Sparkles className="w-5 h-5 text-teal-100 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide">Interactive AI Practice Portal</h3>
            <p className="text-[11px] text-teal-100/90">Conversational Step-by-Step Registration & Booking</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {activeWizard && (
            <button
              onClick={cancelWizard}
              title="Cancel Current Wizard"
              className="p-1.5 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-white transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Cancel</span>
            </button>
          )}
          <button
            onClick={handleClearChat}
            title="Reset Chat History"
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-teal-100 transition-colors text-xs flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
        </div>
      </div>

      {/* Interactive Quick Launch Bar */}
      <div className="p-2.5 bg-teal-50/80 dark:bg-slate-800/80 border-b border-teal-100/80 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 px-1 shrink-0">Start Wizard:</span>
        <button
          onClick={() => startWizard('doctor')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer transition-all shadow-2xs ${
            activeWizard?.type === 'doctor'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-slate-700 hover:bg-teal-600 hover:text-white'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>+ Register Doctor</span>
        </button>
        <button
          onClick={() => startWizard('pet')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer transition-all shadow-2xs ${
            activeWizard?.type === 'pet'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-slate-700 hover:bg-teal-600 hover:text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Register Pet</span>
        </button>
        <button
          onClick={() => startWizard('appointment')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer transition-all shadow-2xs ${
            activeWizard?.type === 'appointment'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-slate-700 hover:bg-teal-600 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>+ Book Visit</span>
        </button>
        <button
          onClick={() => startWizard('patient-portal')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer transition-all shadow-2xs ${
            activeWizard?.type === 'patient-portal'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-slate-700 hover:bg-teal-600 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>+ Patient Portal</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2 max-w-[95%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              msg.role === 'user' 
                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' 
                : 'bg-white border border-slate-200 text-slate-800 shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-none font-medium'
                  : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-none shadow-xs dark:bg-slate-800 dark:border-slate-700/80 dark:text-slate-200'
              }`}>
                {msg.content.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-1.5" />;

                  if (trimmed.startsWith('### ')) {
                    return <h4 key={idx} className="font-bold text-teal-900 dark:text-teal-200 text-sm mb-1">{trimmed.replace('### ', '')}</h4>;
                  }

                  if (trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                    return (
                      <div key={idx} className="flex items-start space-x-1.5 my-0.5">
                        <span className="text-teal-500 font-bold">•</span>
                        <span>{trimmed.replace(/^[•\*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                      </div>
                    );
                  }

                  const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
                  return <p key={idx} className="mb-1 last:mb-0">{formattedText}</p>;
                })}
              </div>
              <span className="text-[10px] text-slate-400 px-1 block text-right">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 text-xs pl-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>AI Practice Co-pilot updating live clinic database...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Active Step Status Banner */}
      {activeWizard && (
        <div className="px-3 py-1.5 bg-teal-100/90 dark:bg-teal-950/80 border-t border-teal-200 dark:border-teal-800 text-[11px] font-bold text-teal-800 dark:text-teal-200 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
            <span>Interactive {activeWizard.type.toUpperCase()} Wizard active (Step {activeWizard.step + 1})</span>
          </span>
          <button 
            onClick={cancelWizard}
            className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-normal text-[10px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            activeWizard 
              ? `Answer step ${activeWizard.step + 1} or type 'cancel'...` 
              : "Type 'register doctor', 'add pet', 'book appointment'..."
          }
          disabled={loading}
          className="flex-1 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 rounded-xl px-3.5 py-2.5 outline-none transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
