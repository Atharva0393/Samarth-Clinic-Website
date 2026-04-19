import React, { useState, Suspense, lazy } from 'react';
import {
  Users, Calendar, FileText, Activity, CreditCard,
  Settings as SettingsIcon, Bell, Search, Plus, TrendingUp, Clock, Zap, LogOut, Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import WalkInModal from './components/WalkInModal';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';

// Lazy loaded components for code splitting & performance
const Patients = lazy(() => import('./components/Patients'));
const Appointments = lazy(() => import('./components/Appointments'));
const Billing = lazy(() => import('./components/Billing'));
const Reports = lazy(() => import('./components/Reports'));
const Settings = lazy(() => import('./components/Settings'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-800 min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <pre className="bg-red-100 p-4 rounded-lg overflow-auto max-w-full text-xs">
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Root wrapper — provides auth context to everything
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </DataProvider>
    </AuthProvider>
  );
}

// Inner shell — reads auth context
function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  // Tracks demo-mode logins (where AuthContext won't re-render on localStorage write)
  const [localAuthed, setLocalAuthed] = useState(() => {
    try {
      const u = localStorage.getItem('clinic_user');
      return !!u;
    } catch { return false; }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !localAuthed) {
    return <LoginPage onSuccess={() => setLocalAuthed(true)} />;
  }

  return <Dashboard />;
}


function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout, isAdmin, isDentist, isReceptionist } = useAuth();
  const { patients, setPatients, setGlobalSelectedPatientId } = useData();
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInToken, setWalkInToken] = useState(1);
  const [liveQueue, setLiveQueue] = useState([
    { id: 'q1', name: 'Rahul Verma', time: '10:00 AM', treatment: 'Root Canal - Phase 1', status: 'in_chair' as const, doctor: 'Dr. Hemke', token: 'APT-001' },
    { id: 'q2', name: 'Sneha Patel', time: '10:45 AM', treatment: 'Orthodontic Consult', status: 'waiting' as const, doctor: 'Dr. Hemke', token: 'APT-002' },
    { id: 'q3', name: 'Priya Das', time: '09:15 AM', treatment: 'Checkup & Cleaning', status: 'completed' as const, doctor: 'Dr. Hemke', token: 'APT-003' },
  ]);

  const handleWalkInConfirm = (patient: { name: string; phone: string; complaint: string; token: string }) => {
    // 1. Create a formal patient profile in the global context
    const patientId = `walkin-${Date.now()}`;
    const parts = patient.name.split(' ');
    const newPt = {
      id: patientId,
      first_name: parts[0],
      last_name: parts.slice(1).join(' ') || '',
      phone: patient.phone,
      whatsapp_opt_in: true,
      medical_history: {},
      patient_notes: `Chief complaint: ${patient.complaint}`,
    };
    setPatients(prev => [newPt, ...prev]);

    // 2. Add to live queue
    const newEntry = {
      id: `queue-${Date.now()}`,
      name: patient.name,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      treatment: patient.complaint || 'Walk-In',
      status: 'waiting' as const,
      doctor: 'Dr. Hemke',
      token: patient.token,
    };
    setLiveQueue(prev => [newEntry, ...prev.filter(p => p.status !== 'completed')]);
    setWalkInToken(prev => prev + 1);
  };

  const filteredSearch = (patients || []).filter(p => 
    `${p?.first_name || ''} ${p?.last_name || ''} ${p?.phone || ''}`.toLowerCase().includes(globalSearch.toLowerCase())
  ).slice(0, 5);

  const handlePatientSelect = (id: string) => {
    setGlobalSelectedPatientId(id);
    setActiveTab('patients');
    setShowSearchDrop(false);
    setGlobalSearch('');
  };

  // Safe fallback if user bypasses UI in demo mode
  const canSeeBilling = isReceptionist || !user;
  const canSeeReports = isAdmin || !user;

  return (
    <div className="flex h-screen bg-gray-50/50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Activity className="w-6 h-6" />
            <span>Samarth Clinic</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavItem icon={<Activity />} label="Dashboard"   active={activeTab === 'dashboard'}   onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Calendar />} label="Appointments" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
          <NavItem icon={<Users />}    label="Patients"     active={activeTab === 'patients'}     onClick={() => setActiveTab('patients')} />

          
          {canSeeBilling && (
            <NavItem icon={<CreditCard />} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          )}
          
          {canSeeReports && (
            <NavItem icon={<TrendingUp />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <NavItem icon={<SettingsIcon />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <div
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-medium text-red-500 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search patients by name or phone..." 
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchDrop(true); }}
                onFocus={() => setShowSearchDrop(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {showSearchDrop && globalSearch.trim().length > 0 && (
                <div className="absolute z-50 top-full mt-2 w-full bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden">
                  {filteredSearch.length > 0 ? (
                    filteredSearch.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => handlePatientSelect(p.id)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {p?.first_name?.[0] || '?'}{p?.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-gray-500">{p.phone}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">No matching patients found.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {/* User badge */}
            <div className="flex items-center gap-2">
              {user && (
                <span className={cn(
                  'text-xs font-bold px-2 py-1 rounded-full',
                  user.role === 'super_admin'  ? 'bg-purple-100 text-purple-700' :
                  user.role === 'dentist'      ? 'bg-blue-100 text-blue-700' :
                                                'bg-emerald-100 text-emerald-700'
                )}>
                  {user.role === 'super_admin' ? 'Admin' : user.role === 'dentist' ? 'Dentist' : 'Reception'}
                </span>
              )}
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {user ? `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}` : 'DR'}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Samarth Clinic — Today</h1>
                <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveTab('appointments')}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  Book Appointment
                </button>
                <button 
                  onClick={() => setShowWalkIn(true)}
                  className="flex items-center gap-2 bg-primary text-black px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-bold">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  Walk-In Patient
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <KPICard title="Today's Patients" value={String(liveQueue.length)} icon={<Users className="w-5 h-5 text-blue-500" />} trend={`${liveQueue.filter(q => q.status === 'waiting' || q.status === 'in_chair').length} yet to be seen`} />
              <KPICard title="Waiting Room" value={String(liveQueue.filter(q => q.status === 'waiting').length)} icon={<Clock className="w-5 h-5 text-amber-500" />} trend="Current live queue" />
              {canSeeBilling && (
                <KPICard title="Revenue Today" value="₹24,500" icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} trend="3 pending UPI payments" />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Live Queue Panel */}
              <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]", canSeeBilling ? "lg:col-span-2" : "lg:col-span-3")}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Live Patient Queue</h3>
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">Live Updates</span>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {liveQueue.map(item => (
                    <QueueItem key={item.id} name={item.name} time={item.time} treatment={item.treatment} status={item.status} doctor={item.doctor} token={item.token} />
                  ))}
                </div>
              </div>

              {/* Quick Actions & Recent Activity */}
              {canSeeBilling && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                   <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="p-6 space-y-6 flex-1 overflow-auto">
                    <ActivityItem title="Payment Received" desc="₹5000 from Priya Das via UPI" time="10 mins ago" />
                    <ActivityItem title="New Booking" desc="Online booking for tomorrow 2PM" time="45 mins ago" />
                    <ActivityItem title="Treatment Saved" desc="Dr. Sharma completed RCT Phase 1" time="1 hour ago" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showWalkIn && (
          <WalkInModal 
            onClose={() => setShowWalkIn(false)} 
            onConfirm={handleWalkInConfirm}
            tokenNumber={walkInToken}
          />
        )}

        {/* Appointments Content */}
        {activeTab === 'appointments' && (
          <div className="flex-1 overflow-hidden p-4 bg-gray-50/50">
            <Suspense fallback={<LoadingFallback />}>
              <Appointments />
            </Suspense>
          </div>
        )}

        {/* Patients Content */}
        {activeTab === 'patients' && (
          <div className="flex-1 overflow-hidden p-6 relative bg-gray-50/50">
            <Suspense fallback={<LoadingFallback />}>
              <Patients />
            </Suspense>
          </div>
        )}



        {/* Billing Content */}
        {activeTab === 'billing' && canSeeBilling && (
          <div className="flex-1 overflow-hidden p-6 relative bg-gray-50/50">
            <Suspense fallback={<LoadingFallback />}>
              <Billing />
            </Suspense>
          </div>
        )}

        {/* Reports Content */}
        {activeTab === 'reports' && canSeeReports && (
          <div className="flex-1 overflow-hidden relative">
            <Suspense fallback={<LoadingFallback />}>
              <Reports />
            </Suspense>
          </div>
        )}

        {/* Settings Content */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-auto bg-gray-50/50">
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
            </Suspense>
          </div>
        )}

      </main>

    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-medium",
      active ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    )}>
      <div className={cn("w-5 h-5", active ? "text-primary" : "text-gray-400")}>{icon}</div>
      {label}
    </div>
  );
}

function KPICard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">{trend}</p>
      </div>
    </div>
  );
}

function QueueItem({ name, time, treatment, status, doctor, token }: { name: string, time: string, treatment: string, status: 'waiting' | 'in_chair' | 'completed', doctor: string, token: string }) {
  const statusStyles = {
    waiting: "bg-amber-50 text-amber-600 border-amber-200",
    in_chair: "bg-blue-50 text-blue-600 border-blue-200",
    completed: "bg-green-50 text-green-600 border-green-200"
  };

  const statusLabels = {
    waiting: "Waiting",
    in_chair: "In Chair",
    completed: "Done"
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-transparent hover:border-gray-100 hover:shadow-sm rounded-lg cursor-pointer transition-all mb-2 group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 group-hover:bg-primary/5 group-hover:text-primary transition-colors text-sm">
          {(name || '').split(' ').map(n => n[0] || '').join('')}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{name} <span className="text-xs font-normal text-gray-400 ml-1">{token}</span></h4>
          <p className="text-xs text-gray-500 mt-0.5">{treatment}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{time}</span>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border", (statusStyles as any)[status] || "bg-gray-50 text-gray-500 border-gray-200")}>
          {(statusLabels as any)[status] || status}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ title, desc, time }: { title: string, desc: string, time: string }) {
  return (
    <div className="relative pl-6 border-l border-gray-200 last:border-0 pb-6 last:pb-0">
      <div className="absolute left-0 top-0 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white"></div>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
      <span className="text-xs font-medium text-gray-400 mt-2 block">{time}</span>
    </div>
  );
}
