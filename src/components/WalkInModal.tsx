import { useState } from 'react';
import { UserPlus, X, MessageCircle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

const COMPLAINTS = [
  'Toothache', 'Sensitivity', 'Broken Tooth', 'Cavity', 
  'Bleeding Gums', 'Root Canal Follow-up', 'Routine Checkup', 'Denture Issue', 'Swelling / Abscess'
];

interface WalkInModalProps {
  onClose: () => void;
  onConfirm: (patient: { name: string; phone: string; complaint: string; token: string }) => void;
  tokenNumber: number;
}

export default function WalkInModal({ onClose, onConfirm, tokenNumber }: WalkInModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [step, setStep] = useState(1); // Step 1: Form, Step 2: Confirmation

  const isValid = name.trim().length > 1 && phone.replace(/\D/g, '').length === 10;
  const finalComplaint = complaint;
  const token = `WI-${String(tokenNumber).padStart(3, '0')}`;

  const handleConfirm = () => {
    setStep(2);
  };

  const handleDone = () => {
    onConfirm({ name, phone, complaint: finalComplaint, token });
    onClose();
  };

  const whatsappMessage = encodeURIComponent(
    `Namaskar ${name}! 🙏\n\nYour token at Samarth Dental Clinic is *${token}*.\nDr. Hemke will see you shortly.\n\nAddress: Samarth Multispeciality Dental Clinic, Aurangabad.`
  );
  const whatsappUrl = `https://wa.me/91${phone.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-lg">Quick Walk-In</span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-100 text-sm">Register in 15 seconds. Token: <span className="font-bold text-white">{token}</span></p>
        </div>

        {step === 1 ? (
          <div className="p-6 space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter full name"
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-gray-500 text-sm font-medium">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  maxLength={10}
                  className="flex-1 border border-gray-200 rounded-r-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Complaint - Quick Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Chief Complaint
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPLAINTS.map(c => (
                  <button
                    key={c}
                    onClick={() => setComplaint(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      complaint === c
                        ? "bg-primary text-white border-primary"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid}
                className={cn(
                  "flex-1 py-3 font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2",
                  isValid
                    ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                <UserPlus className="w-4 h-4" />
                Add to Queue
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Confirmation + WhatsApp trigger */
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl font-black text-green-600">{token.split('-')[1]}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{name}</h3>
              <p className="text-gray-500 text-sm mt-1">{finalComplaint || 'No complaint specified'}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                ⏳ Added to Waiting Queue
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-3 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <MessageCircle className="w-5 h-5" />
              Send Token via WhatsApp
            </a>

            <button
              onClick={handleDone}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
            >
              Done — Show Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
