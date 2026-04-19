import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User, Stethoscope,
  Calendar, LayoutGrid, List, X, Save, Loader2, AlertCircle,
  CheckCircle2, XCircle, UserX, Phone, MessageCircle, Edit2, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type AptStatus = 'scheduled' | 'confirmed' | 'in_chair' | 'completed' | 'cancelled' | 'no_show';
type ViewMode  = 'day' | 'week' | 'month';

interface Appointment {
  id: string;
  start_time: string;   // ISO
  end_time:   string;
  duration_mins: number;
  status: AptStatus;
  type: string;
  notes?: string;
  token_number: number;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  dentist_id: string;
  dentist_name: string;
  treatment_name?: string;
  color?: string;
}

// ─── Seed data (relative to today so calendar always shows something) ─────────
function makeSeed(): Appointment[] {
  const today = new Date();
  const d = (offset: number, h: number, m = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  };

  return [
    {
      id: 'a1', token_number: 1, status: 'in_chair', type: 'treatment', duration_mins: 60,
      start_time: d(0, 10, 0),  end_time: d(0, 11, 0),
      patient_id: 'p1', patient_name: 'Aryan Sharma',    patient_phone: '9876543210',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Root Canal — Tooth 46',
      color: '#3b82f6',
    },
    {
      id: 'a2', token_number: 2, status: 'scheduled', type: 'consultation', duration_mins: 30,
      start_time: d(0, 11, 30), end_time: d(0, 12, 0),
      patient_id: 'p2', patient_name: 'Priya Das',        patient_phone: '9876002002',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Scaling & Polishing',
      color: '#10b981',
    },
    {
      id: 'a3', token_number: 3, status: 'scheduled', type: 'treatment', duration_mins: 45,
      start_time: d(0, 13, 0),  end_time: d(0, 13, 45),
      patient_id: 'p3', patient_name: 'Vikram Singh',     patient_phone: '9876003003',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Orthodontic Consult',
      color: '#8b5cf6',
    },
    {
      id: 'a4', token_number: 4, status: 'completed', type: 'treatment', duration_mins: 30,
      start_time: d(0, 9, 0),   end_time: d(0, 9, 30),
      patient_id: 'p4', patient_name: 'Meena Kulkarni',   patient_phone: '9876004004',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Checkup & Cleaning',
      color: '#10b981',
    },
    {
      id: 'a5', token_number: 1, status: 'scheduled', type: 'consultation', duration_mins: 30,
      start_time: d(1, 10, 0),  end_time: d(1, 10, 30),
      patient_id: 'p5', patient_name: 'Raj Patil',        patient_phone: '9876005005',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Braces Consultation',
      color: '#f59e0b',
    },
    {
      id: 'a6', token_number: 2, status: 'scheduled', type: 'followup', duration_mins: 20,
      start_time: d(1, 14, 0),  end_time: d(1, 14, 20),
      patient_id: 'p1', patient_name: 'Aryan Sharma',    patient_phone: '9876543210',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'RCT Phase 2 — Tooth 46',
      color: '#3b82f6',
    },
    {
      id: 'a7', token_number: 1, status: 'scheduled', type: 'emergency', duration_mins: 45,
      start_time: d(3, 9, 30),  end_time: d(3, 10, 15),
      patient_id: 'p2', patient_name: 'Priya Das',        patient_phone: '9876002002',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Tooth Extraction',
      color: '#ef4444',
    },
    {
      id: 'a8', token_number: 1, status: 'no_show', type: 'consultation', duration_mins: 30,
      start_time: d(-1, 11, 0), end_time: d(-1, 11, 30),
      patient_id: 'p3', patient_name: 'Vikram Singh',     patient_phone: '9876003003',
      dentist_id: 'd1', dentist_name: 'Dr. Rohan Hemke', treatment_name: 'Consultation',
      color: '#6b7280',
    },
  ];
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AptStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  scheduled:  { label: 'Scheduled', bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
  confirmed:  { label: 'Confirmed', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  in_chair:   { label: 'In Chair',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200' },
  completed:  { label: 'Completed', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  cancelled:  { label: 'Cancelled', bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400',   border: 'border-gray-200' },
  no_show:    { label: 'No Show',   bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    border: 'border-red-200' },
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const fmtDate  = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime  = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function startOfWeek(d: Date) {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay()); // Sun start
  s.setHours(0, 0, 0, 0);
  return s;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ─── Appointment Card (used in Day/Week views) ───────────────────────────────
function AptCard({ apt, onClick, compact = false }: { apt: Appointment; onClick: (a: Appointment) => void; compact?: boolean }) {
  const s = STATUS_CONFIG[apt.status];
  return (
    <div
      onClick={() => onClick(apt)}
      className={cn(
        'rounded-lg border px-2 py-1.5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] select-none overflow-hidden',
        s.bg, s.border, apt.status === 'cancelled' || apt.status === 'no_show' ? 'opacity-60' : ''
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: apt.color || '#3b82f6' }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={cn('text-xs font-bold truncate', s.text)}>
          #{apt.token_number} {apt.patient_name}
        </span>
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', s.bg, s.text, 'border', s.border)}>
          {s.label}
        </span>
      </div>
      {!compact && (
        <>
          <p className="text-[11px] text-gray-600 truncate mt-0.5">{apt.treatment_name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{fmtTime(apt.start_time)} — {fmtTime(apt.end_time)}</p>
        </>
      )}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ date, appointments, onAptClick, onSlotClick }: {
  date: Date;
  appointments: Appointment[];
  onAptClick: (a: Appointment) => void;
  onSlotClick: (hour: number) => void;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am-7pm
  const dayApts = appointments.filter(a => isSameDay(new Date(a.start_time), date));

  const getSlotApts = (h: number) =>
    dayApts.filter(a => new Date(a.start_time).getHours() === h);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Day header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 py-2 flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl',
          isSameDay(date, new Date()) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
        )}>
          {date.getDate()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {date.toLocaleDateString('en-IN', { weekday: 'long' })}
          </p>
          <p className="text-xs text-gray-400">
            {date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            &nbsp;·&nbsp;{dayApts.length} appointment{dayApts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Time slots */}
      <div className="divide-y divide-gray-50">
        {hours.map(h => {
          const slotApts = getSlotApts(h);
          const label    = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
          return (
            <div
              key={h}
              className="flex gap-3 px-4 py-2 min-h-[64px] hover:bg-gray-50/50 transition-colors group"
            >
              <div className="w-16 shrink-0 pt-1">
                <span className="text-xs text-gray-400 font-medium">{label}</span>
              </div>
              <div className="flex-1 space-y-1.5">
                {slotApts.map(a => (
                  <AptCard key={a.id} apt={a} onClick={onAptClick} />
                ))}
                {slotApts.length === 0 && (
                  <button
                    onClick={() => onSlotClick(h)}
                    className="w-full h-8 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-300 hover:border-blue-300 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    + book slot
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ weekStart, appointments, onAptClick, onSlotClick }: {
  weekStart: Date;
  appointments: Appointment[];
  onAptClick: (a: Appointment) => void;
  onSlotClick: (d: Date, h: number) => void;
}) {
  const days  = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);
  const today = new Date();

  const getApts = (day: Date, h: number) =>
    appointments.filter(a => isSameDay(new Date(a.start_time), day) && new Date(a.start_time).getHours() === h);

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="sticky top-0 z-10 bg-white grid border-b border-gray-200" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
        <div className="border-r border-gray-100" />
        {days.map(day => (
          <div key={day.toISOString()} className={cn(
            'py-3 text-center border-r border-gray-100 last:border-r-0',
            isSameDay(day, today) ? 'bg-blue-50' : ''
          )}>
            <p className="text-xs text-gray-400 uppercase font-semibold">
              {day.toLocaleDateString('en-IN', { weekday: 'short' })}
            </p>
            <div className={cn(
              'w-7 h-7 mx-auto mt-1 rounded-full flex items-center justify-center text-sm font-bold',
              isSameDay(day, today) ? 'bg-blue-600 text-white' : 'text-gray-700'
            )}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div>
        {hours.map(h => (
          <div key={h} className="grid border-b border-gray-50" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
            <div className="border-r border-gray-100 px-2 py-2">
              <span className="text-[11px] text-gray-400 font-medium">
                {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
              </span>
            </div>
            {days.map(day => {
              const apts = getApts(day, h);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r border-gray-100 last:border-r-0 p-1 min-h-[52px] group',
                    isSameDay(day, today) ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'
                  )}
                >
                  {apts.map(a => (
                    <AptCard key={a.id} apt={a} onClick={onAptClick} compact />
                  ))}
                  {apts.length === 0 && (
                    <button
                      onClick={() => onSlotClick(day, h)}
                      className="w-full h-full min-h-[44px] rounded border-2 border-dashed border-transparent hover:border-blue-200 text-[10px] text-transparent hover:text-blue-300 transition-all"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ monthStart, appointments, onAptClick, onDayClick }: {
  monthStart: Date;
  appointments: Appointment[];
  onAptClick: (a: Appointment) => void;
  onDayClick: (d: Date) => void;
}) {
  const today = new Date();
  const year  = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // Day of week for 1st
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getApts = (d: Date) => appointments.filter(a => isSameDay(new Date(a.start_time), d));

  return (
    <div className="flex-1 overflow-auto p-0">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 h-full">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="border-b border-r border-gray-100 bg-gray-50/50 min-h-[100px]" />;
          const apts    = getApts(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                'border-b border-r border-gray-100 p-2 min-h-[100px] cursor-pointer transition-colors',
                isToday ? 'bg-blue-50/60' : 'hover:bg-gray-50'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1.5',
                isToday ? 'bg-blue-600 text-white' : 'text-gray-600'
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {apts.slice(0, 3).map(a => (
                  <div
                    key={a.id}
                    onClick={e => { e.stopPropagation(); onAptClick(a); }}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{ background: (a.color || '#3b82f6') + '22', color: a.color || '#3b82f6', borderLeft: `2px solid ${a.color || '#3b82f6'}` }}
                  >
                    {fmtTime(a.start_time)} {a.patient_name.split(' ')[0]}
                  </div>
                ))}
                {apts.length > 3 && (
                  <p className="text-[10px] text-gray-400 font-medium">+{apts.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Booking Modal ─────────────────────────────────────────────────────────────
// Removed static PATIENTS_LIST

const TREATMENTS_LIST = [
  'Consultation', 'Scaling & Polishing', 'Root Canal Treatment',
  'Tooth Extraction', 'Composite Filling', 'Zirconia Crown',
  'Orthodontic Consultation', 'Teeth Whitening', 'Dental X-Ray',
  'Post & Core', 'Denture Fitting', 'Implant Consultation',
];

const DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hours', value: 120 },
];

function BookingModal({
  defaultDate, defaultHour, onClose, onSave,
}: {
  defaultDate: Date;
  defaultHour?: number;
  onClose: () => void;
  onSave: (apt: Appointment) => void;
}) {
  const { patients, setPatients } = useData();

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [form, setForm] = useState({
    patient_id:    '',
    patient_name:  '',
    patient_phone: '',
    date:     toLocalDateStr(defaultDate),
    time:     `${String(defaultHour ?? 10).padStart(2, '0')}:00`,
    duration: 30,
    treatment: '',
    type:      'consultation',
    notes:     '',
    dentist_name: 'Dr. Rohan Hemke',
  });
  const [ptSearch, setPtSearch]     = useState('');
  const [saving,   setSaving]       = useState(false);
  const [error,    setError]        = useState('');
  const [showDrop, setShowDrop]     = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const filtPts = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.phone}`.toLowerCase().includes(ptSearch.toLowerCase())
  );

  const selectPatient = (p: any) => {
    const fullName = `${p.first_name} ${p.last_name}`;
    set('patient_id',    p.id);
    set('patient_name',  fullName);
    set('patient_phone', p.phone);
    setPtSearch(fullName);
    setShowDrop(false);
  };

  const handleSave = async () => {
    let finalPatientId = form.patient_id;
    let finalPatientName = form.patient_name;
    let finalPhone = form.patient_phone;

    if (!finalPatientId && ptSearch.trim()) {
      // Direct booking: create a patient automatically
      finalPatientId = `walkin-${Date.now()}`;
      finalPatientName = ptSearch.trim();
      finalPhone = ''; // Or we could add a phone field

      const parts = finalPatientName.split(' ');
      const fn = parts[0];
      const ln = parts.slice(1).join(' ') || '';

      setPatients(prev => [{
        id: finalPatientId,
        first_name: fn,
        last_name: ln,
        phone: '',
        whatsapp_opt_in: false,
        medical_history: {}
      }, ...prev]);
    } else if (!finalPatientId) {
      setError('Please select or type a patient name.');
      return;
    }

    if (!form.date)        { setError('Please pick a date.');       return; }
    if (!form.treatment)   { setError('Please select a treatment.'); return; }

    setSaving(true);
    setError('');

    const start = new Date(`${form.date}T${form.time}:00`);
    const end   = new Date(start.getTime() + form.duration * 60000);

    await new Promise(r => setTimeout(r, 500)); // simulate save

    const newApt: Appointment = {
      id:          `new-${Date.now()}`,
      token_number: Math.floor(Math.random() * 10) + 1,
      start_time:  start.toISOString(),
      end_time:    end.toISOString(),
      duration_mins: form.duration,
      status:      'scheduled',
      type:        form.type,
      notes:       form.notes,
      patient_id:  finalPatientId,
      patient_name:  finalPatientName,
      patient_phone: finalPhone,
      dentist_id:  'd1',
      dentist_name: form.dentist_name,
      treatment_name: form.treatment,
      color: form.type === 'emergency' ? '#ef4444' : form.type === 'followup' ? '#8b5cf6' : '#3b82f6',
    };

    setSaving(false);
    onSave(newApt);
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Book Appointment</h2>
            <p className="text-sm text-gray-400 mt-0.5">Schedule a new clinic visit</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Patient search */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Patient *</label>
            <div className="relative">
              <input
                className={inputCls}
                placeholder="Search patient name or phone..."
                value={ptSearch}
                onChange={e => { setPtSearch(e.target.value); setShowDrop(true); set('patient_id', ''); }}
                onFocus={() => setShowDrop(true)}
                autoComplete="off"
              />
              {showDrop && ptSearch && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {filtPts.length === 0
                    ? <div className="px-4 py-3 text-sm text-gray-400">No patient found</div>
                    : filtPts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPatient(p)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {p.first_name[0]}{p.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-gray-400">{p.phone}</p>
                          </div>
                        </button>
                      ))
                  }
                  <button
                    onClick={() => { setShowDrop(false); }}
                    className="w-full px-4 py-2 border-t border-gray-100 text-xs text-blue-600 hover:bg-blue-50 font-medium text-left transition-colors flex items-center justify-between"
                  >
                    <span>+ Book "{ptSearch}" directly</span>
                    <span className="text-gray-400 font-normal">Creates a new record</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date *</label>
              <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Time *</label>
              <input type="time" className={inputCls} value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Duration</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set('duration', d.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    form.duration === d.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Treatment */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Treatment *</label>
            <select className={inputCls} value={form.treatment} onChange={e => set('treatment', e.target.value)}>
              <option value="">Select treatment...</option>
              {TREATMENTS_LIST.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visit Type</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'consultation', label: '🔍 Consult',  color: 'blue'   },
                { key: 'treatment',    label: '🦷 Treatment', color: 'green'  },
                { key: 'followup',     label: '↩ Follow-up', color: 'purple' },
                { key: 'emergency',    label: '🚨 Emergency', color: 'red'    },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('type', key)}
                  className={cn(
                    'px-2 py-2 rounded-lg text-xs font-semibold border text-center transition-all',
                    form.type === key
                      ? `bg-${color}-100 border-${color}-300 text-${color}-700`
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dentist */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Dentist</label>
            <select className={inputCls} value={form.dentist_name} onChange={e => set('dentist_name', e.target.value)}>
              <option>Dr. Rohan Hemke</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any special notes for this appointment..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Book Appointment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Sheet (click on appointment) ─────────────────────────────────────
function AptDetailModal({ apt, onClose, onStatusChange, onDelete }: {
  apt: Appointment;
  onClose: () => void;
  onStatusChange: (id: string, s: AptStatus) => void;
  onDelete: (id: string) => void;
}) {
  const s = STATUS_CONFIG[apt.status];
  const nextStatuses: AptStatus[] = ['scheduled', 'confirmed', 'in_chair', 'completed', 'no_show', 'cancelled'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: apt.color || '#3b82f6' }}>
              #{apt.token_number}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{apt.patient_name}</h3>
              <p className="text-sm text-gray-400">{apt.treatment_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Date & Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(apt.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
              <p className="text-xs text-gray-600">{fmtTime(apt.start_time)} – {fmtTime(apt.end_time)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Dentist</p>
              <p className="text-sm font-semibold text-gray-900">{apt.dentist_name}</p>
              <p className="text-xs text-gray-600">{apt.duration_mins} min</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Update Status</p>
            <div className="grid grid-cols-3 gap-2">
              {nextStatuses.map(st => {
                const cfg = STATUS_CONFIG[st];
                return (
                  <button
                    key={st}
                    onClick={() => { onStatusChange(apt.id, st); onClose(); }}
                    className={cn(
                      'py-2 px-2 rounded-lg text-xs font-semibold border transition-all',
                      apt.status === st
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1`
                        : `bg-gray-50 text-gray-600 border-gray-200 hover:${cfg.bg} hover:${cfg.text}`
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <a
              href={`https://wa.me/91${apt.patient_phone}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button
              onClick={() => { if (confirm('Cancel this appointment?')) { onDelete(apt.id); onClose(); } }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Appointments() {
  const { appointments: apts, setAppointments: setApts } = useData();
  const [view,   setView]   = useState<ViewMode>('week');
  const [cursor, setCursor] = useState(new Date()); // current nav date
  const [showBook,  setShowBook]  = useState(false);
  const [bookDate,  setBookDate]  = useState(new Date());
  const [bookHour,  setBookHour]  = useState<number | undefined>(undefined);
  const [selected,  setSelected]  = useState<Appointment | null>(null);

  // Seed appointments on first load if empty
  React.useEffect(() => {
    if (apts.length === 0) setApts(makeSeed());
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = (dir: -1 | 1) => {
    const d = new Date(cursor);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const weekStart  = useMemo(() => startOfWeek(cursor), [cursor]);
  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);

  const headerLabel = useMemo(() => {
    if (view === 'day')
      return cursor.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    if (view === 'week') {
      const ws = startOfWeek(cursor);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [view, cursor]);

  // ── Stats for header ────────────────────────────────────────────────────────
  const todayApts = apts.filter(a => isSameDay(new Date(a.start_time), new Date()));
  const statusCounts = todayApts.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1; return acc;
  }, {} as Record<string, number>);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openBook = (d?: Date, h?: number) => {
    setBookDate(d || cursor);
    setBookHour(h);
    setShowBook(true);
  };

  const handleSave = (apt: Appointment) => {
    setApts(prev => [...prev, apt]);
    setShowBook(false);
  };

  const handleStatusChange = (id: string, status: AptStatus) => {
    setApts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleDelete = (id: string) => {
    setApts(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  // Switch to day view when month cell clicked
  const handleDayClick = (d: Date) => { setCursor(d); setView('day'); };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-4 shrink-0">
          {/* Left : nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setCursor(new Date()); }}
              className="px-3 py-1.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700">
              Today
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => navigate(1)}  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="font-bold text-gray-900 text-base min-w-0 truncate">{headerLabel}</h2>
          </div>

          {/* Center: quick stats */}
          <div className="hidden lg:flex items-center gap-3">
            {[
              { key: 'in_chair',  label: 'In Chair' },
              { key: 'scheduled', label: 'Upcoming' },
              { key: 'completed', label: 'Done' },
            ].map(({ key, label }) => (
              <div key={key} className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
                STATUS_CONFIG[key as AptStatus].bg,
                STATUS_CONFIG[key as AptStatus].text,
                STATUS_CONFIG[key as AptStatus].border,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[key as AptStatus].dot)} />
                {statusCounts[key] || 0} {label}
              </div>
            ))}
          </div>

          {/* Right: view toggle + new */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {(['day','week','month'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all',
                    view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => openBook()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Book
            </button>
          </div>
        </div>

        {/* ── Calendar Body ──────────────────────────────────────────────── */}
        {view === 'day' && (
          <DayView
            date={cursor}
            appointments={apts}
            onAptClick={a => setSelected(a)}
            onSlotClick={h => openBook(cursor, h)}
          />
        )}
        {view === 'week' && (
          <WeekView
            weekStart={weekStart}
            appointments={apts}
            onAptClick={a => setSelected(a)}
            onSlotClick={(d, h) => openBook(d, h)}
          />
        )}
        {view === 'month' && (
          <MonthView
            monthStart={monthStart}
            appointments={apts}
            onAptClick={a => setSelected(a)}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Modals */}
      {showBook && (
        <BookingModal
          defaultDate={bookDate}
          defaultHour={bookHour}
          onClose={() => setShowBook(false)}
          onSave={handleSave}
        />
      )}
      {selected && (
        <AptDetailModal
          apt={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
