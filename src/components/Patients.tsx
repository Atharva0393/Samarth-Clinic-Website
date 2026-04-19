import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  Search, UserPlus, Phone, Mail, Calendar as CalendarIcon,
  Activity, IndianRupee, Edit2, X, Save, Loader2,
  AlertTriangle, ChevronRight, WholeWord, Heart, FileText,
  Stethoscope, CheckCircle2, Clock, XCircle, MessageCircle,
  Trash2, Plus, Upload, File, Image as ImageIcon, Download
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MedicalHistory {
  diabetic?: boolean;
  hypertensive?: boolean;
  cardiac?: boolean;
  allergies?: string[];
  blood_group?: string;
  [key: string]: any;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  city?: string;
  whatsapp_opt_in: boolean;
  medical_history: MedicalHistory;
  patient_notes?: string;
  balance_due?: number;
  last_visit?: string;
  tags?: string[];   // computed from medical_history for display
}

interface TimelineItem {
  id: string;
  date: string;
  type: 'appointment' | 'treatment' | 'payment';
  title: string;
  detail: string;
  status?: string;
  amount?: number;
}

// ─── Seed (demo data, replaces API when backend is offline) ──────────────────
const SEED_PATIENTS: Patient[] = [
  {
    id: '1', first_name: 'Aryan', last_name: 'Sharma', phone: '9876543210',
    email: 'aryan@gmail.com', gender: 'Male', dob: '1989-03-15',
    address: 'Flat 203, Shivam Apartments', city: 'Aurangabad',
    whatsapp_opt_in: true, balance_due: 1500, last_visit: '2024-11-12',
    medical_history: { diabetic: true, hypertensive: false, cardiac: false, allergies: ['Penicillin'], blood_group: 'B+' },
  },
  {
    id: '2', first_name: 'Priya', last_name: 'Das', phone: '9876002002',
    email: 'priya.das@yahoo.com', gender: 'Female', dob: '1996-07-22',
    address: '12, Gangapur Road', city: 'Aurangabad',
    whatsapp_opt_in: true, balance_due: 0, last_visit: '2024-10-18',
    medical_history: { diabetic: false, hypertensive: false, cardiac: false, allergies: [], blood_group: 'O+' },
  },
  {
    id: '3', first_name: 'Vikram', last_name: 'Singh', phone: '9876003003',
    gender: 'Male', dob: '1978-11-08', city: 'Aurangabad',
    whatsapp_opt_in: true, balance_due: 2500, last_visit: '2024-10-04',
    medical_history: { diabetic: false, hypertensive: true, cardiac: false, allergies: [], blood_group: 'A-' },
  },
  {
    id: '4', first_name: 'Meena', last_name: 'Kulkarni', phone: '9876004004',
    gender: 'Female', dob: '1955-04-30', city: 'Aurangabad',
    whatsapp_opt_in: false, balance_due: 200, last_visit: '2024-11-14',
    medical_history: { diabetic: true, hypertensive: true, cardiac: true, allergies: ['Aspirin', 'Ibuprofen'], blood_group: 'AB+' },
  },
  {
    id: '5', first_name: 'Raj', last_name: 'Patil', phone: '9876005005',
    email: 'raj.patil@gmail.com', gender: 'Male', dob: '2003-09-12',
    city: 'Aurangabad', whatsapp_opt_in: true, balance_due: 0,
    medical_history: { diabetic: false, hypertensive: false, cardiac: false, allergies: [], blood_group: 'O-' },
  },
];

const SEED_TIMELINE: Record<string, TimelineItem[]> = {
  '1': [
    { id: 't1', date: '2024-11-12T10:30:00', type: 'treatment', title: 'Root Canal Treatment — Tooth 46 (Phase 1)', detail: 'Access opening done. Canals cleaned to 25#. Temp filling placed.', status: 'in_progress', amount: 3500 },
    { id: 't2', date: '2024-11-12T11:15:00', type: 'payment',   title: 'Payment Received (Partial)', detail: '₹2,000 paid via UPI — Ref: UTR423819734612', amount: 2000 },
    { id: 't3', date: '2024-10-05T09:00:00', type: 'appointment', title: 'Consultation', detail: 'Chief complaint: Pain in lower right. X-ray taken. RCT advised.', status: 'completed' },
  ],
  '2': [
    { id: 't1', date: '2024-10-18T10:00:00', type: 'treatment', title: 'Scaling & Polishing', detail: 'Full mouth scaling done. Mild calculus.', status: 'completed', amount: 800 },
    { id: 't2', date: '2024-10-18T10:45:00', type: 'payment',   title: 'Payment Received', detail: '₹800 paid via cash', amount: 800 },
  ],
  '3': [
    { id: 't1', date: '2024-10-04T17:00:00', type: 'treatment', title: 'Scaling & Polishing', detail: 'Full mouth scaling. Moderate calculus. Advised proper brushing.', status: 'completed', amount: 800 },
    { id: 't2', date: '2024-10-04T17:30:00', type: 'payment',   title: 'Payment Received', detail: '₹800 paid via cash', amount: 800 },
  ],
  '4': [
    { id: 't1', date: '2024-11-14T17:00:00', type: 'appointment', title: 'Check-up Post Crown', detail: 'Zirconia crown on 17 checked. Patient comfortable.', status: 'completed' },
    { id: 't2', date: '2024-10-01T10:00:00', type: 'treatment', title: 'Zirconia Crown — Tooth 17', detail: 'Crown cemented. Final bite check done.', status: 'completed', amount: 12000 },
  ],
  '5': [
    { id: 't1', date: '2024-09-20T11:00:00', type: 'appointment', title: 'Orthodontics Consultation', detail: 'OPG taken. Mild crowding. Metal braces recommended. Cost shared.', status: 'completed' },
  ],
};

const SEED_DOCUMENTS: Record<string, any[]> = {
  '1': [
    { id: 'd1', title: 'OPG X-Ray', type: 'xray', date: '2024-10-05T09:15:00', size: '2.4 MB', url: '#' },
    { id: 'd2', title: 'Blood Test Report', type: 'report', date: '2024-10-06T11:00:00', size: '1.1 MB', url: '#' },
  ]
};

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '', gender: '',
  dob: '', address: '', city: '', whatsapp_opt_in: true, patient_notes: '',
  diabetic: false, hypertensive: false, cardiac: false,
  allergies: '', blood_group: '',
};

type FormState = typeof EMPTY_FORM;

// ─── Utility ──────────────────────────────────────────────────────────────────
function getAge(dob?: string): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
}

function getMedicalTags(mh: MedicalHistory): string[] {
  const tags: string[] = [];
  if (mh.diabetic)     tags.push('Diabetic');
  if (mh.hypertensive) tags.push('Hypertension');
  if (mh.cardiac)      tags.push('Cardiac');
  if (mh.allergies?.length) tags.push(...mh.allergies.map(a => `${a} Allergy`));
  return tags;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Add/Edit Patient Modal ──────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

function PatientFormModal({
  patient,
  onClose,
  onSave,
}: {
  patient?: Patient;
  onClose: () => void;
  onSave: (p: Patient) => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (patient) {
      const mh = patient.medical_history || {};
      return {
        first_name: patient.first_name,
        last_name:  patient.last_name,
        phone:      patient.phone,
        email:      patient.email || '',
        gender:     patient.gender || '',
        dob:        patient.dob || '',
        address:    patient.address || '',
        city:       patient.city || '',
        whatsapp_opt_in: patient.whatsapp_opt_in,
        patient_notes:   patient.patient_notes || '',
        diabetic:        !!mh.diabetic,
        hypertensive:    !!mh.hypertensive,
        cardiac:         !!mh.cardiac,
        allergies:       (mh.allergies || []).join(', '),
        blood_group:     mh.blood_group || '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      setError('First name, last name, and phone are required.');
      return;
    }

    setSaving(true);
    setError('');

    // Build patient object (in real app, this would call the API)
    const saved: Patient = {
      id: patient?.id || `new-${Date.now()}`,
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      phone:      form.phone.trim(),
      email:      form.email || undefined,
      gender:     form.gender || undefined,
      dob:        form.dob || undefined,
      address:    form.address || undefined,
      city:       form.city || undefined,
      whatsapp_opt_in: form.whatsapp_opt_in,
      patient_notes:   form.patient_notes || undefined,
      balance_due:     patient?.balance_due || 0,
      last_visit:      patient?.last_visit,
      medical_history: {
        diabetic:     form.diabetic,
        hypertensive: form.hypertensive,
        cardiac:      form.cardiac,
        allergies:    form.allergies ? form.allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
        blood_group:  form.blood_group || undefined,
      },
    };

    // Simulate save delay
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onSave(saved);
  };



  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {patient ? 'Edit Patient' : 'Add New Patient'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {patient ? `Editing ${patient.first_name} ${patient.last_name}` : 'Register a new patient to the clinic'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *">
                <input className={inputCls} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Rohan" />
              </Field>
              <Field label="Last Name *">
                <input className={inputCls} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Sharma" />
              </Field>
              <Field label="Mobile Number *">
                <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" maxLength={10} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
              </Field>
              <Field label="Gender">
                <select className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input className={inputCls} type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street / Locality" />
              </Field>
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Aurangabad" />
              </Field>
            </div>

            {/* WhatsApp */}
            <label className="flex items-center gap-3 mt-4 cursor-pointer group">
              <div
                onClick={() => set('whatsapp_opt_in', !form.whatsapp_opt_in)}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  form.whatsapp_opt_in ? 'bg-green-500' : 'bg-gray-200'
                )}
              >
                <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', form.whatsapp_opt_in ? 'left-5' : 'left-1')} />
              </div>
              <span className="text-sm font-medium text-gray-700">WhatsApp notifications enabled</span>
            </label>
          </div>

          {/* Medical History */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Medical History</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { key: 'diabetic',     label: 'Diabetic' },
                { key: 'hypertensive', label: 'Hypertension' },
                { key: 'cardiac',      label: 'Cardiac' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set(key as keyof FormState, !(form as any)[key])}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    (form as any)[key]
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <AlertTriangle className={cn('w-4 h-4', (form as any)[key] ? 'text-red-500' : 'text-gray-400')} />
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Allergies (comma-separated)">
                <input className={inputCls} value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Penicillin, Aspirin" />
              </Field>
              <Field label="Blood Group">
                <select className={inputCls} value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                  <option value="">Unknown</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-100 pt-6">
            <Field label="Receptionist Notes">
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                value={form.patient_notes}
                onChange={e => set('patient_notes', e.target.value)}
                placeholder="Any special instructions, preferred appointment times, etc."
              />
            </Field>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Patient</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────
function TimelineCard({ item }: { item: TimelineItem }) {
  const icons: Record<string, React.ReactNode> = {
    treatment:   <Stethoscope className="w-4 h-4" />,
    payment:     <IndianRupee className="w-4 h-4" />,
    appointment: <CalendarIcon className="w-4 h-4" />,
  };
  const colors: Record<string, string> = {
    treatment:   'bg-blue-100 text-blue-600',
    payment:     'bg-green-100 text-green-600',
    appointment: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', colors[item.type])}>
          {icons[item.type]}
        </div>
        <div className="w-px flex-1 bg-gray-100 my-1" />
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
          {item.amount && (
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
              item.type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'
            )}>₹{item.amount.toLocaleString('en-IN')}</span>
          )}
          {item.status && item.type !== 'payment' && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              item.status === 'completed' ? 'bg-green-100 text-green-700' :
              item.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            )}>
              {item.status === 'in_progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{item.detail}</p>
        <p className="text-xs text-gray-400 mt-1">{formatDateTime(item.date)}</p>
      </div>
    </div>
  );
}

export default function Patients() {
  const { patients, setPatients, globalSelectedPatientId, setGlobalSelectedPatientId, invoices } = useData();
  const [selected, setSelected] = useState<any>(patients[0] || {});

  // Sync global selection
  React.useEffect(() => {
    if (globalSelectedPatientId) {
      const p = patients.find(p => p.id === globalSelectedPatientId);
      if (p) setSelected(p);
      setGlobalSelectedPatientId(null); // Reset after selecting
    }
  }, [globalSelectedPatientId, patients, setGlobalSelectedPatientId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab,   setActiveTab]   = useState<'overview' | 'medical' | 'treatments' | 'billing' | 'documents'>('overview');
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<Patient | undefined>(undefined);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const tags      = getMedicalTags(selected.medical_history || {});
  const timeline  = SEED_TIMELINE[selected.id] || [];
  const treatments = timeline.filter(t => t.type === 'treatment');
  
  // Real invoices from global context
  const patientInvoices = invoices.filter(inv => inv.patient_id === selected.id);
  const balanceDue = patientInvoices.reduce((acc, inv) => acc + (inv.total_amount - inv.paid_amount), 0);

  const documents  = SEED_DOCUMENTS[selected.id] || [];

  const openAdd  = () => { setEditTarget(undefined); setShowForm(true); };
  const openEdit = () => { setEditTarget(selected);   setShowForm(true); };

  const handleSave = (p: Patient) => {
    if (editTarget) {
      setPatients(prev => prev.map(x => x.id === p.id ? p : x));
      setSelected(p);
    } else {
      setPatients(prev => [p, ...prev]);
      setSelected(p);
    }
    setShowForm(false);
  };

  const TABS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'medical',    label: 'Medical History' },
    { key: 'treatments', label: `Treatments (${treatments.length})` },
    { key: 'billing',    label: `Invoices (${patientInvoices.length})` },
    { key: 'documents',  label: `Documents (${documents.length})` },
  ];

  return (
    <>
      <div className="flex h-full bg-white rounded-xl overflow-hidden border border-gray-200">

        {/* ── Left: Patient List ─────────────────────────────────────────── */}
        <div className="w-80 flex flex-col border-r border-gray-200 bg-gray-50/50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                Patients
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {patients.length}
                </span>
              </h2>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> New
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No patients found.
                <button onClick={openAdd} className="block mx-auto mt-2 text-blue-600 hover:underline text-xs">
                  + Add patient
                </button>
              </div>
            ) : filtered.map(p => {
              const ptags = getMedicalTags(p.medical_history || {});
              return (
                <div
                  key={p.id}
                  onClick={() => { setSelected(p); setActiveTab('overview'); }}
                  className={cn(
                    'p-4 border-b border-gray-100 cursor-pointer transition-colors relative hover:bg-white',
                    selected.id === p.id ? 'bg-white' : ''
                  )}
                >
                  {selected.id === p.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 rounded-r" />
                  )}
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {p.first_name} {p.last_name}
                    </h4>
                    {(p.balance_due || 0) > 0 && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        ₹{(p.balance_due || 0).toLocaleString('en-IN')} Due
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Phone className="w-3 h-3" /> {p.phone}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {ptags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {ptags.length > 2 && (
                      <span className="text-[9px] text-gray-400">+{ptags.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Patient Profile ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Profile header */}
          <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-2xl font-bold text-blue-600 border border-blue-100">
                {selected.first_name[0]}{selected.last_name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selected.first_name} {selected.last_name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selected.phone}</span>
                  {selected.email && <><span className="w-1 h-1 rounded-full bg-gray-300"/><span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selected.email}</span></>}
                  {selected.gender && <><span className="w-1 h-1 rounded-full bg-gray-300"/><span>{selected.gender}, {getAge(selected.dob)}</span></>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selected.whatsapp_opt_in && (
                <a
                  href={`https://wa.me/91${selected.phone}?text=Hello ${selected.first_name}, this is Samarth Dental Clinic.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                <CalendarIcon className="w-4 h-4" /> Book
              </button>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="px-8 py-3 bg-gray-50/60 border-b border-gray-100 flex gap-8">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Medical Alerts</p>
              <div className="flex gap-1.5 flex-wrap">
                {tags.length > 0
                  ? tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> {tag}
                      </span>
                    ))
                  : <span className="text-sm text-gray-400">None logged</span>
                }
              </div>
            </div>
            <div className="pl-8 border-l border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Last Visit</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(selected.last_visit)}</p>
            </div>
            <div className="pl-8 border-l border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Outstanding</p>
              <p className={cn('text-sm font-bold', balanceDue > 0 ? 'text-red-600' : 'text-green-600')}>
                ₹{balanceDue.toLocaleString('en-IN')}
              </p>
            </div>
            {selected.medical_history?.blood_group && (
              <div className="pl-8 border-l border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Blood Group</p>
                <p className="text-sm font-bold text-gray-900">{selected.medical_history.blood_group}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-8 border-b border-gray-100 flex gap-6">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-8">

            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
              <div className="max-w-2xl space-y-6">
                {/* Contact Info */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{selected.phone}</p>
                        <a href={`https://wa.me/91${(selected?.phone || '').replace(/\\D/g, '')}?text=Namaskar ${selected?.first_name || ''},`} target="_blank" rel="noreferrer" className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold hover:bg-green-200 transition-colors">
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    <div><p className="text-xs text-gray-400 mb-1">Email</p><p className="text-sm font-medium text-gray-900">{selected.email || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-1">Address</p><p className="text-sm font-medium text-gray-900">{selected.address || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-1">City</p><p className="text-sm font-medium text-gray-900">{selected.city || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-1">Date of Birth</p><p className="text-sm font-medium text-gray-900">{selected.dob ? `${formatDate(selected.dob)} (${getAge(selected.dob)})` : '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-1">WhatsApp</p><p className="text-sm font-medium">{selected.whatsapp_opt_in ? <span className="text-green-600">Opted In ✓</span> : <span className="text-gray-400">Opted Out</span>}</p></div>
                  </div>
                  {selected.patient_notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{selected.patient_notes}</p>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-5">Recent Activity</h3>
                  {timeline.length > 0
                    ? timeline.map(item => <TimelineCard key={item.id} item={item} />)
                    : <p className="text-sm text-gray-400">No activity recorded yet.</p>
                  }
                </div>
              </div>
            )}

            {/* ── Medical History Tab ── */}
            {activeTab === 'medical' && (
              <div className="max-w-lg space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'diabetic',     label: 'Diabetic',      value: selected.medical_history?.diabetic },
                    { key: 'hypertensive', label: 'Hypertension',  value: selected.medical_history?.hypertensive },
                    { key: 'cardiac',      label: 'Cardiac',        value: selected.medical_history?.cardiac },
                  ].map(({ label, value }) => (
                    <div key={label} className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border',
                      value ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    )}>
                      {value
                        ? <AlertTriangle className="w-5 h-5 text-red-500" />
                        : <CheckCircle2 className="w-5 h-5 text-green-500" />
                      }
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className={cn('text-xs font-medium', value ? 'text-red-600' : 'text-green-600')}>
                          {value ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">Blood Group</p>
                    <p className="text-2xl font-bold text-gray-900">{selected.medical_history?.blood_group || '—'}</p>
                  </div>
                </div>

                {/* Allergies */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Allergies & Contraindications
                  </h4>
                  {(selected.medical_history?.allergies || []).length > 0
                    ? <div className="flex gap-2 flex-wrap">
                        {(selected.medical_history?.allergies || []).map((a: string) => (
                          <span key={a} className="text-sm font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                            ⚠ {a}
                          </span>
                        ))}
                      </div>
                    : <p className="text-sm text-amber-700">No known allergies.</p>
                  }
                </div>

                <button onClick={openEdit} className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium">
                  <Edit2 className="w-4 h-4" /> Update medical history
                </button>
              </div>
            )}

            {/* ── Treatment Records Tab ── */}
            {activeTab === 'treatments' && (
              <div className="max-w-2xl">
                {treatments.length === 0
                  ? <p className="text-sm text-gray-400">No treatment records found.</p>
                  : <div className="space-y-3">
                      {treatments.map(t => (
                        <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(t.date)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {t?.amount && <span className="text-sm font-bold text-blue-700">₹{(t.amount || 0).toLocaleString('en-IN')}</span>}
                              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                                t.status === 'completed'   ? 'bg-green-100 text-green-700' :
                                t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              )}>
                                {t.status === 'in_progress' ? 'In Progress' : (t.status || 'Planned')}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">{t.detail}</p>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}

            {/* ── Billing Tab ── */}
            {activeTab === 'billing' && (
              <div className="max-w-2xl">
                {/* Balance summary */}
                <div className={cn(
                  'rounded-xl p-5 mb-6 border',
                  balanceDue > 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                )}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Total Outstanding</p>
                  <p className={cn('text-3xl font-bold', balanceDue > 0 ? 'text-red-600' : 'text-green-600')}>
                    ₹{(balanceDue || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Invoices List */}
                <h3 className="font-bold text-gray-900 mb-4">Patient Invoices</h3>
                {patientInvoices.length === 0
                  ? <p className="text-sm text-gray-400">No invoices recorded.</p>
                  : patientInvoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{inv.date} • {inv.items.length} items</p>
                          <p className="text-xs mt-1">
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", 
                              inv.status === 'paid' ? 'bg-green-100 text-green-700' : 
                              inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            )}>{inv.status}</span>
                          </p>
                        </div>
                        <div className="text-right">
                           <span className="text-base font-bold text-gray-900">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</span>
                           {(inv.paid_amount || 0) > 0 && <p className="text-xs font-semibold text-green-600">Paid: ₹{(inv.paid_amount || 0).toLocaleString('en-IN')}</p>}
                        </div>
                      </div>
                    ))
                }
              </div>
            )}

            {/* ── Documents Tab ── */}
            {activeTab === 'documents' && (
              <div className="max-w-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-900">Patient Documents</h3>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm rounded-lg transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" /> Upload Document
                  </button>
                </div>
                
                {documents.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                      <File className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">No documents yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">Upload X-rays, blood reports, prescriptions, or any other medical records for this patient.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors group bg-white">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          doc.type === 'xray' ? 'bg-purple-100 text-purple-600' :
                          doc.type === 'report' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        )}>
                          {doc.type === 'xray' ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span>{formatDate(doc.date)}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <PatientFormModal
          patient={editTarget}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
