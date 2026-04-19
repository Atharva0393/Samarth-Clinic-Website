import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Activity, XCircle, PlusCircle, User, Calendar, FileText, Camera, CheckCircle2, ChevronDown, List, Beaker, Pill, IndianRupee } from 'lucide-react';

// ─── Dummy Data ─────────────────────────────────────────────────────────────
const PATIENTS = [
  { id: 'p1', name: 'Aryan Sharma', phone: '9876543210' },
  { id: 'p2', name: 'Priya Das', phone: '9876002002' },
  { id: 'p3', name: 'Vikram Singh', phone: '9876003003' },
];

const TREATMENTS_LIST = [
  { id: 't1', name: 'Scaling & Polishing', cost: 1000, category: 'Prevention' },
  { id: 't2', name: 'Root Canal Treatment', cost: 4500, category: 'Endodontics' },
  { id: 't3', name: 'Tooth Extraction', cost: 1500, category: 'Surgery' },
  { id: 't4', name: 'Composite Filling', cost: 1200, category: 'Restorative' },
];

const APPOINTMENTS = [
  { id: 'a1', title: '16 Apr — 10:00 AM (Scheduled)' },
  { id: 'a2', title: '10 Apr — 11:30 AM (Completed)' },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type ToothCondition = 'healthy' | 'caries' | 'missing' | 'rct' | 'implant';

interface ToothState {
  id: string;
  condition: ToothCondition;
}

interface TreatmentRecord {
  id: string;
  patient_id: string;
  tooth_number?: string;
  treatment_name: string;
  status: 'planned' | 'in_progress' | 'completed';
  date: string;
  cost: number;
}

const INITIAL_TEETH_UPPER = ['18','17','16','15','14','13','12','11', '21','22','23','24','25','26','27','28'];
const INITIAL_TEETH_LOWER = ['48','47','46','45','44','43','42','41', '31','32','33','34','35','36','37','38'];

export default function Odontogram() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('p1');
  
  // Odontogram State
  const [teeth, setTeeth] = useState<Record<string, ToothState>>({
    '46': { id: '46', condition: 'caries' },
    '11': { id: '11', condition: 'rct' }
  });
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    treatment_id: '',
    appointment_id: '',
    status: 'completed',
    cost: '',
    clinical_notes: '',
    prescription: ''
  });

  // History State
  const [history, setHistory] = useState<TreatmentRecord[]>([
    { id: 'rec1', patient_id: 'p1', tooth_number: '11', treatment_name: 'Root Canal Treatment', status: 'completed', date: '2026-04-10', cost: 4500 },
    { id: 'rec2', patient_id: 'p1', tooth_number: '46', treatment_name: 'Composite Filling', status: 'planned', date: '2026-04-16', cost: 1200 },
  ]);

  const activePatient = PATIENTS.find(p => p.id === selectedPatientId);
  const patientHistory = history.filter(h => h.patient_id === selectedPatientId);
  
  const handleToothClick = (id: string) => {
    setSelectedTooth(id);
    setShowForm(false);
    if (!teeth[id]) {
      setTeeth(prev => ({ ...prev, [id]: { id, condition: 'healthy' } }));
    }
  };

  const updateCondition = (condition: ToothCondition) => {
    if (!selectedTooth) return;
    setTeeth(prev => ({
      ...prev,
      [selectedTooth]: { ...prev[selectedTooth], condition }
    }));
  };

  const handleSaveTreatment = () => {
    const trm = TREATMENTS_LIST.find(t => t.id === form.treatment_id);
    if (!trm) return alert('Select treatment type');

    const newRecord: TreatmentRecord = {
      id: `rec-${Date.now()}`,
      patient_id: selectedPatientId,
      tooth_number: selectedTooth || undefined, // undefined means general mouth
      treatment_name: trm.name,
      status: form.status as any,
      date: new Date().toISOString().split('T')[0],
      cost: Number(form.cost) || trm.cost
    };

    setHistory([newRecord, ...history]);
    setShowForm(false);
    setForm({ treatment_id: '', appointment_id: '', status: 'completed', cost: '', clinical_notes: '', prescription: '' });
  };

  const getToothColor = (condition?: ToothCondition) => {
    switch (condition) {
      case 'caries': return 'bg-red-500 border-red-700 text-white';
      case 'missing': return 'bg-gray-800 border-gray-900 text-gray-400 opacity-30';
      case 'rct': return 'bg-blue-500 border-blue-700 text-white';
      case 'implant': return 'bg-purple-500 border-purple-700 text-white';
      default: return 'bg-white border-gray-300 text-gray-700 hover:bg-primary/10 hover:border-primary';
    }
  };

  return (
    <div className="flex h-full bg-white rounded-xl overflow-hidden border border-gray-200">
      
      {/* ─── Left & Center: Chart Area ────────────────────────────────────────── */}
      <div className="flex-[2] flex flex-col relative bg-gray-50/30">
        
        {/* Top Header */}
        <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <select 
              value={selectedPatientId} 
              onChange={e => { setSelectedPatientId(e.target.value); setSelectedTooth(null); setShowForm(false); }}
              className="text-lg font-bold text-gray-900 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
            >
              {PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
            </select>
          </div>
          <button 
           onClick={() => { setSelectedTooth(null); setShowForm(true); }}
           className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors">
            <PlusCircle className="w-4 h-4" /> Gen. Treatment
          </button>
        </div>

        {/* Odontogram Chart */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          <div className="space-y-12 max-w-3xl w-full">
            {/* Upper Jaw */}
            <div className="flex flex-col items-center">
              <div className="text-sm font-semibold text-gray-400 mb-4 tracking-widest uppercase">Maxillary (Upper)</div>
              <div className="flex items-center gap-1">
                {INITIAL_TEETH_UPPER.map((tooth, idx) => (
                  <React.Fragment key={tooth}>
                    <div 
                      onClick={() => handleToothClick(tooth)}
                      className={cn(
                        "w-9 h-12 sm:w-11 sm:h-16 rounded-b-xl border-2 flex flex-col items-center justify-between py-1 cursor-pointer transition-all duration-200 group relative",
                        getToothColor(teeth[tooth]?.condition),
                        selectedTooth === tooth ? "ring-4 ring-primary/30 scale-110 z-10" : "shadow-sm"
                      )}
                    >
                      <span className={cn("text-[10px] sm:text-xs font-bold", teeth[tooth]?.condition && teeth[tooth]?.condition !== 'healthy' ? "text-white/80" : "text-gray-400")}>{tooth}</span>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-t-md border border-black/10 bg-black/5 group-hover:bg-black/20" />
                    </div>
                    {idx === 7 && <div className="w-3 sm:w-4 border-r-2 border-dashed border-gray-200 h-14 sm:h-16 mx-1 sm:mx-2" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="w-full border-t border-gray-100" />

            {/* Lower Jaw */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                {INITIAL_TEETH_LOWER.map((tooth, idx) => (
                  <React.Fragment key={tooth}>
                    <div 
                      onClick={() => handleToothClick(tooth)}
                      className={cn(
                        "w-9 h-12 sm:w-11 sm:h-16 rounded-t-xl border-2 flex flex-col-reverse items-center justify-between py-1 cursor-pointer transition-all duration-200 group relative",
                        getToothColor(teeth[tooth]?.condition),
                        selectedTooth === tooth ? "ring-4 ring-primary/30 scale-110 z-10" : "shadow-sm"
                      )}
                    >
                      <span className={cn("text-[10px] sm:text-xs font-bold", teeth[tooth]?.condition && teeth[tooth]?.condition !== 'healthy' ? "text-white/80" : "text-gray-400")}>{tooth}</span>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-b-md border border-black/10 bg-black/5 group-hover:bg-black/20" />
                    </div>
                    {idx === 7 && <div className="w-3 sm:w-4 border-r-2 border-dashed border-gray-200 h-14 sm:h-16 mx-1 sm:mx-2" />}
                  </React.Fragment>
                ))}
              </div>
              <div className="text-sm font-semibold text-gray-400 mt-4 tracking-widest uppercase">Mandibular (Lower)</div>
            </div>
          </div>
        </div>

        {/* History Bottom Panel */}
        <div className="h-64 border-t border-gray-200 bg-white p-4 scrollbar-thin overflow-y-auto">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <List className="w-4 h-4 text-gray-400" />
            Treatment History for {activePatient?.name}
          </h3>
          {patientHistory.length === 0 ? (
             <p className="text-sm text-gray-400">No treatments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {patientHistory.map(rec => (
                <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white",
                      rec.status === 'completed' ? 'bg-green-500' : 
                      rec.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-400'
                    )}>
                      {rec.tooth_number || 'All'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        {rec.treatment_name}
                        <span className={cn(
                           "text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                           rec.status === 'completed' ? 'bg-green-50 text-green-700' : 
                           rec.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        )}>{rec.status.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{rec.date} • ₹{rec.cost}</p>
                    </div>
                  </div>
                  <button className="hidden sm:block mt-2 sm:mt-0 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Sidebar: Inspector & Form ──────────────────────────────────── */}
      <div className="w-80 md:w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
        
        {showForm ? (
          <div className="p-6 flex flex-col min-h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Beaker className="w-5 h-5 text-primary" /> Record Treatment
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5 border border-gray-100 flex items-center gap-3">
               <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-bold text-primary shadow-sm">
                 {selectedTooth || 'Gen'}
               </div>
               <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Target</p>
                  <p className="text-sm font-bold text-gray-900">{selectedTooth ? `Tooth ${selectedTooth}` : 'General Mouth'}</p>
               </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Treatment Type *</label>
                <select 
                  value={form.treatment_id} 
                  onChange={e => {
                    const t = TREATMENTS_LIST.find(x => x.id === e.target.value);
                    setForm(prev => ({ ...prev, treatment_id: e.target.value, cost: t ? String(t.cost) : prev.cost }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Select Treatment...</option>
                  {TREATMENTS_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Link Appointment</label>
                <select 
                  value={form.appointment_id} 
                  onChange={e => setForm(prev => ({ ...prev, appointment_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">None (Ad-hoc treatment)</option>
                  {APPOINTMENTS.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cost (₹)</label>
                  <input 
                    type="number" 
                    value={form.cost} 
                    onChange={e => setForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none"
                    placeholder="Auto" 
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 block text-xs font-semibold text-gray-500 mb-1.5"><FileText className="w-3 h-3"/> Clinical Notes</label>
                <textarea 
                  rows={3} 
                  value={form.clinical_notes}
                  onChange={e => setForm(prev => ({ ...prev, clinical_notes: e.target.value }))}
                  className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Procedure details, complaints, observations..."
                />
              </div>

              <div>
                <label className="flex items-center gap-1 block text-xs font-semibold text-gray-500 mb-1.5"><Pill className="w-3 h-3"/> Prescription & Advise</label>
                <textarea 
                  rows={2} 
                  value={form.prescription}
                  onChange={e => setForm(prev => ({ ...prev, prescription: e.target.value }))}
                  className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Medications, post-op instructions..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Attachments</label>
                <button className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-colors bg-gray-50/50">
                  <Camera className="w-4 h-4" /> Upload X-Ray / Photos
                </button>
              </div>

            </div>
            
            <div className="pt-6 mt-4 border-t border-gray-100">
              <button 
                onClick={handleSaveTreatment}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                Save Record
              </button>
            </div>
          </div>
        ) : selectedTooth ? (
          <div className="p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-6">Tooth Inspector</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-black text-primary shadow-inner">
                    {selectedTooth}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Selected</p>
                    <p className="font-bold text-gray-900 text-lg capitalize flex items-center gap-2">
                       {teeth[selectedTooth]?.condition || 'Healthy'}
                       {(teeth[selectedTooth]?.condition === 'caries') && <XCircle className="w-4 h-4 text-red-500" />}
                       {(teeth[selectedTooth]?.condition === 'healthy' || !teeth[selectedTooth]) && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tooth Condition</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => updateCondition('healthy')} className={cn("px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left", teeth[selectedTooth]?.condition === 'healthy' || !teeth[selectedTooth]?.condition ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>✅ Healthy</button>
                  <button onClick={() => updateCondition('caries')} className={cn("px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left", teeth[selectedTooth]?.condition === 'caries' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>⚠️ Caries</button>
                  <button onClick={() => updateCondition('rct')} className={cn("px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left", teeth[selectedTooth]?.condition === 'rct' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>⚡ RCT done</button>
                  <button onClick={() => updateCondition('missing')} className={cn("px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left", teeth[selectedTooth]?.condition === 'missing' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>❌ Extracted</button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button 
                  onClick={() => setShowForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/30">
                  <Activity className="w-5 h-5" /> Add Treatment Record
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
               <Activity className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-700 mb-2">No Tooth Selected</h3>
            <p className="text-gray-500 text-sm max-w-[220px]">Click a tooth from the Odontogram to inspect it or add a clinical record.</p>
            <button 
               onClick={() => setShowForm(true)}
               className="mt-6 px-5 py-2 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold rounded-lg text-sm transition-colors">
               Add General Procedure
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
