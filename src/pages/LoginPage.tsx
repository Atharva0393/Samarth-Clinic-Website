import { useState, type FormEvent } from 'react';
import { Activity, Eye, EyeOff, Loader2, AlertCircle, Zap, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../lib/api';

// ─── Demo users (used when backend is offline) ─────────────────
const DEMO_USERS: Record<string, AuthUser> = {
  'admin@samarth.com': {
    id: 'demo-admin', email: 'admin@samarth.com', role: 'super_admin',
    first_name: 'Rohan', last_name: 'Hemke',
    clinic_id: 'demo-clinic', clinic_name: 'Samarth Multispeciality Dental Clinic',
    clinic_upi_id: 'samarth.hemke@hdfcbank',
    permissions: ['patients:*','appointments:*','treatments:*','billing:*','inventory:*','users:*','reports:*','settings:*'],
  },
  'doctor@samarth.com': {
    id: 'demo-dentist', email: 'doctor@samarth.com', role: 'dentist',
    first_name: 'Rohan', last_name: 'Hemke',
    clinic_id: 'demo-clinic', clinic_name: 'Samarth Multispeciality Dental Clinic',
    permissions: ['patients:read','patients:update','appointments:read','appointments:update','treatments:read','treatments:create','billing:read'],
  },
  'reception@samarth.com': {
    id: 'demo-reception', email: 'reception@samarth.com', role: 'receptionist',
    first_name: 'Priya', last_name: 'Kulkarni',
    clinic_id: 'demo-clinic', clinic_name: 'Samarth Multispeciality Dental Clinic',
    permissions: ['patients:read','patients:create','appointments:read','appointments:create','billing:create','billing:payments:create'],
  },
};

const DEMO_ACCOUNTS = [
  { label: 'Admin',        role: 'Full access',        email: 'admin@samarth.com',     color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { label: 'Dentist',      role: 'Clinical access',    email: 'doctor@samarth.com',    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10'       },
  { label: 'Receptionist', role: 'Operational access', email: 'reception@samarth.com', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
];

export default function LoginPage({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const { login } = useAuth();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('demo1234');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [demoMode,    setDemoMode]    = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try real backend first
      const user = await login(email, password);
      onSuccess(user);
    } catch (err: any) {
      // If backend is unreachable (network error), try demo mode
      const isNetworkError = !err.response;
      if (isNetworkError && password === 'demo1234') {
        const demoUser = DEMO_USERS[email.toLowerCase()];
        if (demoUser) {
          // Store mock token so AuthContext reads it correctly
          const fakePayload  = btoa(JSON.stringify({ sub: demoUser.id }));
          const fakeExpiry   = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 }));
          const fakeToken    = `demo.${fakePayload}.${fakeExpiry}`;
          localStorage.setItem('clinic_jwt', fakeToken);
          localStorage.setItem('clinic_user', JSON.stringify(demoUser));
          setDemoMode(true);
          onSuccess(demoUser);
          return;
        }
        setError('No demo account found for this email. Try one of the buttons below.');
      } else {
        const msg = err.response?.data?.error || 'Invalid email or password.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-5 ring-1 ring-blue-400/30">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Samarth Dental</h1>
          <p className="text-slate-400 text-sm mt-1">Clinic Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">

          <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-7">Sign in to access the clinic dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@samarthdental.com"
                className="w-full bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Offline banner */}
            {demoMode && (
              <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <WifiOff className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-sm">Running in demo mode (backend offline)</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                : 'Sign In →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Demo accounts — click to fill
              </p>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => setEmail(acc.email)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${acc.color}`}
                >
                  <span className="font-semibold text-sm">{acc.label}</span>
                  <span className="text-xs opacity-70">{acc.role}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-slate-600 text-xs mt-3">Password: <span className="text-slate-500 font-mono">demo1234</span></p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Samarth Multispeciality Dental Clinic · Aurangabad
        </p>
      </div>
    </div>
  );
}
