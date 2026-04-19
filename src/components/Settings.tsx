import { useState } from 'react';
import { Building, MapPin, Phone, Settings as SettingsIcon, Save, Loader2, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clinicName: 'Samarth Multispeciality Dental Clinic',
    doctorName: 'Dr. Rohan Hemke',
    phone: '9876543210',
    email: 'contact@samarthdental.com',
    address: 'Aurangabad, Maharashtra',
    upiId: 'samarthdental@upi',
    gstNumber: '27AAAAA0000A1Z5'
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate save
    setSaving(false);
    alert('Settings saved successfully!');
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const inputCls = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> Clinic Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your clinic profile and billing information.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">General Information</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Clinic Name</label>
            <input type="text" value={form.clinicName} onChange={e => set('clinicName', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Primary Doctor</label>
            <input type="text" value={form.doctorName} onChange={e => set('doctorName', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} className={cn(inputCls, "pl-10")} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} className={cn(inputCls, "pl-10 resize-none")} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Billing & Payment Integration</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">UPI ID (For QR generation)</label>
            <input type="text" value={form.upiId} onChange={e => set('upiId', e.target.value)} className={inputCls} placeholder="e.g. clinic@sbi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">GST Number</label>
            <input type="text" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

    </div>
  );
}
