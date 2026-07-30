import { useState, useEffect } from 'react';
import { Calendar, Heart, ShieldAlert, Terminal, Menu, Activity, ClipboardList, Layers, Bell, CheckCircle, X, Sun, Moon } from 'lucide-react';
import DoctorsManager from './components/DoctorsManager';
import PetsManager from './components/PetsManager';
import AppointmentsManager from './components/AppointmentsManager';
import PatientPortal from './components/PatientPortal';
import DevOpsHub from './components/DevOpsHub';
import NotificationsPage from './components/NotificationsPage';
import AICopilot from './components/AICopilot';
import { Doctor, Pet, Appointment } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'pets' | 'doctors' | 'portal' | 'devops' | 'notifications'>('appointments');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedBranch = 'Central London Clinic';
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [autoOpenDoctorForm, setAutoOpenDoctorForm] = useState(false);
  const [logsSuccess, setLogsSuccess] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('vetcore_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('vetcore_theme', theme);
  }, [theme]);

  const handleExportLogs = () => {
    const timestamp = new Date().toISOString();
    const logData = {
      app: "VetCore AI Clinic Hub",
      timestamp,
      branch: selectedBranch,
      telemetry: {
        activeDoctors: doctors.length,
        scheduledAppointments: appointments.length,
        totalPetsRegistered: pets.length,
        coveragePercent: 98.4
      },
      auditLogs: [
        { level: "INFO", timestamp, message: `System telemetry snapshot requested by operator.` },
        { level: "INFO", timestamp, message: `Database synchronization complete. Synced ${doctors.length} doctors, ${pets.length} pets, ${appointments.length} visits.` },
        { level: "INFO", timestamp, message: "AI Copilot sandbox loaded." },
        ...doctors.map(d => ({
          level: "DEBUG",
          timestamp,
          message: `Practitioner active: ${d.name} (${d.specialty})`
        })),
        ...appointments.slice(0, 5).map(a => ({
          level: "DEBUG",
          timestamp,
          message: `Appointment status checked: Apt ID ${a.id} on ${a.date} - ${a.time}`
        }))
      ]
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vetcore-telemetry-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLogsSuccess(`Successfully generated, exported, and downloaded vetcore-telemetry-logs.json!`);
    setActiveTab('devops');
    setTimeout(() => {
      setLogsSuccess(null);
    }, 6000);
  };

  // Load backend data on mount or change
  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial || (doctors.length === 0 && pets.length === 0)) {
        setLoading(true);
      }
      setError(null);

      const [docsRes, petsRes, aptsRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/pets'),
        fetch('/api/appointments')
      ]);

      if (!docsRes.ok || !petsRes.ok || !aptsRes.ok) {
        throw new Error('Failed to load clinic state data from backend endpoints.');
      }

      const docsData = await docsRes.json();
      const petsData = await petsRes.json();
      const aptsData = await aptsRes.json();

      setDoctors(docsData);
      setPets(petsData);
      setAppointments(aptsData);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const pendingAppointments = appointments.filter(apt => apt.status === 'Scheduled').length;
  const totalPets = pets.length;
  const activeDoctors = doctors.length;

  return (
    <div className={`min-h-screen font-sans flex overflow-hidden transition-colors ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/10">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100 font-display">VetCore AI</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 dark:text-teal-400 block -mt-1">Clinic Hub Console</span>
            </div>
          </div>

          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5 text-slate-600" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              activeTab === 'appointments'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4.5 h-4.5 shrink-0" />
            <span>Visits & Scheduling</span>
          </button>
          
          <button
            onClick={() => setActiveTab('pets')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              activeTab === 'pets'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Heart className="w-4.5 h-4.5 shrink-0" />
            <span>Pets & Patients</span>
          </button>
          
          <button
            onClick={() => setActiveTab('doctors')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              activeTab === 'doctors'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5 shrink-0" />
            <span>Veterinary Staff</span>
          </button>
          
          <button
            onClick={() => setActiveTab('portal')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              activeTab === 'portal'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Layers className="w-4.5 h-4.5 shrink-0" />
            <span>Patient Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              activeTab === 'notifications'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Bell className="w-4.5 h-4.5 shrink-0" />
            <span>Notifications</span>
          </button>
          
          <button
            onClick={() => setActiveTab('devops')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              activeTab === 'devops'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Terminal className="w-4.5 h-4.5 shrink-0" />
            <span>DevOps & Scale Hub</span>
          </button>
        </nav>

        {/* System Status Card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 text-white border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">System Status</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
            <div className="text-xs font-mono text-slate-300">Coverage: 98.4%</div>
            <div className="text-[11px] font-mono text-teal-400">Clinic ID: DC-NORTH-01</div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60 backdrop-blur-xs">
          <div className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-slate-900 h-full p-5 shadow-xl border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8 pt-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-md">
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 font-display">VetCore AI</h1>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {theme === 'light' ? <Moon className="w-4.5 h-4.5 text-slate-600" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
                </button>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <nav className="space-y-1.5 flex-1">
              {[
                { id: 'appointments', label: 'Visits & Scheduling', icon: Calendar },
                { id: 'pets', label: 'Pets & Patients', icon: Heart },
                { id: 'doctors', label: 'Veterinary Staff', icon: ClipboardList },
                { id: 'portal', label: 'Patient Portal', icon: Layers },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'devops', label: 'DevOps & Scale Hub', icon: Terminal },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                      activeTab === tab.id
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-3.5 text-white mt-auto border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Dev Status</span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <div className="text-[10px] font-mono text-slate-300">Port 3000 Ingress</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setActiveTab('notifications')}
              title="Open Notifications"
              className={`p-2 rounded-full border relative transition-colors cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </button>
            
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/60 border border-teal-200 dark:border-teal-700 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xs">
              JD
            </div>
          </div>
        </header>

        {/* Dashboard Dynamic Work Area */}
        <div className="p-4 sm:p-8 flex-1 space-y-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-semibold mb-1">Active Veterinary Doctors</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-800">{loading ? '--' : activeDoctors}</span>
                <span className="text-green-600 text-[10px] font-bold px-2 py-0.5 bg-green-50 rounded-full">STAFF STABLE</span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-semibold mb-1">Scheduled Appointments</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-800">{loading ? '--' : pendingAppointments}</span>
                <span className="text-teal-600 text-[10px] font-bold px-2 py-0.5 bg-teal-50 rounded-full">AUTO-SYNCED</span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-semibold mb-1">Patients Registered</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-800">{loading ? '--' : totalPets}</span>
                <span className="text-slate-400 text-[10px]">Across all practices</span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-semibold mb-1">AI Co-Pilot Diagnosis</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-teal-600 font-display">Active</span>
                <span className="text-blue-600 text-[10px] font-bold px-2 py-0.5 bg-blue-50 rounded-full">GEMINI-2.0</span>
              </div>
            </div>
          </div>

          {/* Connection Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-900 text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold">Clinic Connection Error:</strong>
                <p className="mt-1 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Telemetry Log Export Success Banner */}
          {logsSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-950 text-sm animate-fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold">Telemetry Logs Exported:</strong>
                <p className="mt-1 text-xs">{logsSuccess}</p>
              </div>
            </div>
          )}

          {/* Core Content Loading Indicator or Grid Board */}
          {loading ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-medium">Synchronizing secure clinical state, availability slots, and digital passport registers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Active Sub-module Container (Visits, Pets, Vets staff, or Portal/DevOps) */}
              <div className="xl:col-span-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs min-h-[500px]">
                {activeTab === 'appointments' && (
                  <AppointmentsManager
                    appointments={appointments}
                    pets={pets}
                    doctors={doctors}
                    onRefresh={fetchData}
                  />
                )}
                {activeTab === 'pets' && (
                  <PetsManager
                    pets={pets}
                    doctors={doctors}
                    onRefresh={fetchData}
                  />
                )}
                {activeTab === 'doctors' && (
                  <DoctorsManager
                    doctors={doctors}
                    onRefresh={fetchData}
                    autoOpenForm={autoOpenDoctorForm}
                    onFormOpened={() => setAutoOpenDoctorForm(false)}
                  />
                )}
                {activeTab === 'portal' && (
                  <PatientPortal
                    pets={pets}
                    appointments={appointments}
                    doctors={doctors}
                    onRefresh={fetchData}
                  />
                )}
                {activeTab === 'notifications' && (
                  <NotificationsPage
                    appointments={appointments}
                    pets={pets}
                    doctors={doctors}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {activeTab === 'devops' && (
                  <DevOpsHub />
                )}
              </div>

              {/* AI Assistant Right Wing Column */}
              <div className="xl:col-span-4 space-y-6">
                <AICopilot onRefreshData={fetchData} />
                
                {/* Sleek Short-cut Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Management Shortcuts</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('doctors');
                        setAutoOpenDoctorForm(true);
                      }}
                      className="flex flex-col items-center justify-center p-3.5 border border-slate-100 rounded-xl hover:bg-teal-50/50 hover:border-teal-200 group transition-all text-center cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold mb-1.5 group-hover:bg-teal-100 transition-colors">+</div>
                      <span className="text-[10px] font-bold text-slate-600">Add Doctor</span>
                    </button>
                    <button
                      onClick={handleExportLogs}
                      className="flex flex-col items-center justify-center p-3.5 border border-slate-100 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 group transition-all text-center cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:bg-blue-100 transition-colors">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">Export Logs</span>
                    </button>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>

        {/* Global Bottom Status Footer Bar */}
        <footer className="bg-teal-600 h-12 flex items-center px-4 sm:px-8 justify-between text-white text-[11px] font-medium shrink-0 mt-auto">
          <div className="flex items-center gap-3">
            <span className="opacity-90 font-bold hidden sm:inline">Secure Vet Patient Portal Active</span>
            <div className="flex -space-x-1.5">
              <div className="w-5 h-5 rounded-full border border-teal-600 bg-teal-200 text-[8px] text-teal-800 flex items-center justify-center font-bold">1</div>
              <div className="w-5 h-5 rounded-full border border-teal-600 bg-teal-300 text-[8px] text-teal-800 flex items-center justify-center font-bold">2</div>
              <div className="w-5 h-5 rounded-full border border-teal-600 bg-teal-400 text-[8px] text-teal-800 flex items-center justify-center font-bold">3</div>
            </div>
            <span className="opacity-80">14 staff & patients active</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="px-2 py-0.5 bg-white/15 rounded text-[10px] font-mono">FastAPI / Express v5.1.0</span>
            <span className="px-2 py-0.5 bg-white/15 rounded text-[10px] font-mono hidden md:inline">GCP-Deployment: STABLE</span>
          </div>
        </footer>

      </main>
    </div>
  );
}

