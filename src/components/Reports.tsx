import { useState } from 'react';
import { TrendingUp, Users, IndianRupee, PieChart, ChevronDown, UserX, Stethoscope, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Dummy Data sets ────────────────────────────────────────────────────────
const kpiData = [
  { label: 'Daily Revenue', value: '₹24,500', trend: '+12.5%', isUp: true, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'Monthly Revenue', value: '₹5,42,000', trend: '+4.2%', isUp: true, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Patients (MTD)', value: '342', trend: '+18', isUp: true, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Missed Appts', value: '14', trend: '-2', isUp: true, icon: UserX, color: 'text-amber-600', bg: 'bg-amber-100' },
];

const revenueByDay = [
  { day: 'Mon', revenue: 15000, max: 40000 },
  { day: 'Tue', revenue: 22000, max: 40000 },
  { day: 'Wed', revenue: 18000, max: 40000 },
  { day: 'Thu', revenue: 35000, max: 40000 },
  { day: 'Fri', revenue: 28000, max: 40000 },
  { day: 'Sat', revenue: 38000, max: 40000 },
  { day: 'Sun', revenue: 12000, max: 40000 },
];

const dentistPerformance = [
  { id: 'd1', name: 'Dr. Rohan Hemke',   patients: 145, revenue: 250000, rating: 4.8, max: 250000 },
  { id: 'd2', name: 'Dr. Sneha Patil',   patients: 112, revenue: 180000, rating: 4.9, max: 250000 },
  { id: 'd3', name: 'Dr. Amit Deshmukh', patients: 85,  revenue: 112000, rating: 4.7, max: 250000 },
];

const missedAppointments = [
  { patient: 'Kiran Desai',     phone: '9876543110', date: '16 Apr, 10:00 AM', reason: 'No Show',   contacted: false },
  { patient: 'Suresh Kumar',    phone: '9876543111', date: '15 Apr, 04:30 PM', reason: 'Cancelled', contacted: true },
  { patient: 'Pooja Verma',     phone: '9876543112', date: '15 Apr, 11:00 AM', reason: 'No Show',   contacted: true },
  { patient: 'Ramesh Kulkarni', phone: '9876543113', date: '14 Apr, 02:00 PM', reason: 'No Show',   contacted: false },
];

export default function Reports() {
  const [timeRange] = useState('This Month');

  return (
    <div className="flex flex-col h-full bg-gray-50/50 overflow-y-auto w-full">
      
      {/* ── Header ── */}
      <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-gray-50/90 backdrop-blur-md z-10 border-b border-gray-200/50">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-primary" /> Reports & Analytics
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Track clinic performance, revenue, and patient statistics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-colors">
            {timeRange} <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-black transition-colors">
            Export PDF
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8 flex-1 w-full max-w-7xl mx-auto">
        
        {/* ── Top KPIs ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 ml:grid-cols-4 gap-6">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
               <div className="flex items-center justify-between">
                 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.bg, kpi.color)}>
                   <kpi.icon className="w-5 h-5" />
                 </div>
                 <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full", kpi.isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                   {kpi.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {kpi.trend}
                 </div>
               </div>
               <div>
                 <p className="text-3xl font-black text-gray-900">{kpi.value}</p>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{kpi.label}</p>
               </div>
            </div>
          ))}
        </div>

        {/* ── Middle Row: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Revenue Trends</h2>
                <p className="text-xs font-medium text-gray-400 mt-0.5">Collections over the last 7 days</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900">₹1,68,000</p>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Total this week</p>
              </div>
            </div>
            
            <div className="flex-1 flex items-end gap-2 sm:gap-4 h-64 mt-auto">
              {revenueByDay.map((d, i) => {
                const heightPct = (d.revenue / d.max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 relative group">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap">
                      ₹{d.revenue.toLocaleString('en-IN')}
                    </div>
                    {/* Bar */}
                    <div className="w-full bg-gray-100 rounded-t-xl overflow-hidden relative flex items-end h-full">
                       <div 
                         className="w-full bg-blue-500 rounded-t-xl transition-all duration-1000 ease-out" 
                         style={{ height: `${heightPct}%` }}
                       />
                    </div>
                    {/* Label */}
                    <span className="text-xs font-bold text-gray-400 uppercase">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointment Breakdown Donut (Simulated Layout) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Appointment Stats</h2>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-48 h-48 rounded-full border-[16px] border-gray-50 flex items-center justify-center shadow-inner">
                 <div className="absolute inset-0 rounded-full border-[16px] border-emerald-500" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 50%)' }} />
                 <div className="absolute inset-0 rounded-full border-[16px] border-amber-400" style={{ clipPath: 'polygon(50% 50%, 0 50%, 0 0, 50% 0)' }} />
                 <div className="absolute inset-0 rounded-full border-[16px] border-red-500" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0)' }} />
                 <div className="text-center z-10 bg-white w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-sm border border-gray-100">
                    <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Total</p>
                    <p className="text-3xl font-black text-gray-900">420</p>
                 </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
               <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Completed (65%)</div>
                 <span>273</span>
               </div>
               <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /> Cancelled (25%)</div>
                 <span>105</span>
               </div>
               <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> No Shows (10%)</div>
                 <span>42</span>
               </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Performance & Missed Appts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Dentist Performance */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Dentist Performance</h2>
            <p className="text-xs font-medium text-gray-400 mb-6">Revenue and patient load by practitioner</p>
            
            <div className="space-y-6">
              {dentistPerformance.map(d => (
                <div key={d.id}>
                  <div className="flex items-center justify-between text-sm font-bold mb-2">
                    <span className="flex items-center gap-2 text-gray-900">
                      <Stethoscope className="w-4 h-4 text-blue-500" /> {d.name}
                    </span>
                    <span className="text-gray-600">₹{d.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(d.revenue / d.max) * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mt-2">
                     <span>{d.patients} Patients Handled</span>
                     <span>⭐ {d.rating} Rating</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missed Appointments Engagement */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Missed Appointments</h2>
                <p className="text-xs font-medium text-gray-400">Needs Re-engagement</p>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 divide-y divide-gray-100">
              {missedAppointments.map((m, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{m.patient}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{m.date} • {m.reason}</p>
                  </div>
                  {m.contacted ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-widest border border-green-200">
                       Contacted
                    </span>
                  ) : (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`tel:${m.phone}`} className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors">
                        📞
                      </a>
                      <a href={`https://wa.me/91${m.phone}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-green-500 hover:bg-green-600 shadow-sm text-white text-xs font-bold rounded-lg transition-colors flex items-center">
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
