import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { CreditCard, IndianRupee, FileText, CheckCircle2, ChevronDown, PlusCircle, Search, Smartphone, Banknote, History, Printer, Upload } from 'lucide-react';

import { useData } from '../context/DataContext';

const TREATMENTS_LIST = [
  { id: 't1', name: 'Scaling & Polishing', cost: 1000 },
  { id: 't2', name: 'Root Canal Treatment', cost: 4500 },
  { id: 't3', name: 'Tooth Extraction', cost: 1500 },
  { id: 't4', name: 'Composite Filling', cost: 1200 },
];

interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  total_amount: number;
  paid_amount: number;
  status: 'paid' | 'unpaid' | 'partial';
  date: string;
  items: InvoiceItem[];
}



export default function Billing() {
  const { patients, invoices, setInvoices } = useData();
  const [activeTab, setActiveTab] = useState<'invoices' | 'new_invoice' | 'payments'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // New Invoice State
  const [newInvForm, setNewInvForm] = useState({
    patient_id: '',
    discount: 0,
    tax_perc: 0,
    notes: ''
  });
  const [newInvItems, setNewInvItems] = useState<InvoiceItem[]>([]);
  const [searchPt, setSearchPt] = useState('');

  // Payment State
  const [payForm, setPayForm] = useState({
    amount: 0,
    method: 'upi',
    ref: ''
  });

  // Derived values for New Invoice
  const subtotal = newInvItems.reduce((acc, i) => acc + i.amount, 0);
  const taxAmount = subtotal * (newInvForm.tax_perc / 100);
  const finalTotal = subtotal + taxAmount - newInvForm.discount;

  const handleCreateInvoice = () => {
    if (!newInvForm.patient_id || newInvItems.length === 0) return alert('Select patient and add items.');
    const patient = patients.find(p => p.id === newInvForm.patient_id)!;
    
    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoice_number: `INV-20260417-000${invoices.length + 1}`,
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      total_amount: finalTotal,
      paid_amount: 0,
      status: 'unpaid',
      date: new Date().toISOString().split('T')[0],
      items: newInvItems
    };

    setInvoices([newInv, ...invoices]);
    setActiveTab('invoices');
    setNewInvItems([]);
    setNewInvForm({ patient_id: '', discount: 0, tax_perc: 0, notes: '' });
  };

  const processPayment = () => {
    if (!selectedInvoice) return;
    const amountToPay = Number(payForm.amount);
    if (amountToPay <= 0) return;

    setInvoices(prev => prev.map(inv => {
      if (inv.id === selectedInvoice.id) {
        const newPaid = inv.paid_amount + amountToPay;
        return {
          ...inv,
          paid_amount: newPaid,
          status: newPaid >= inv.total_amount ? 'paid' : 'partial'
        };
      }
      return inv;
    }));

    setShowPaymentModal(false);
    setPayForm({ amount: 0, method: 'upi', ref: '' });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
             <IndianRupee className="w-5 h-5" />
           </div>
           <div>
             <h2 className="text-lg font-bold text-gray-900 leading-tight">Billing & Payments</h2>
             <p className="text-xs text-gray-500 font-medium tracking-wide">Manage invoices and collections</p>
           </div>
        </div>
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          {(['invoices', 'new_invoice', 'payments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all",
                activeTab === tab ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 relative p-6">
        
        {/* INVOICES LIST */}
        {activeTab === 'invoices' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-800">Recent Invoices</h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input type="text" placeholder="Search by patient or ID..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" />
              </div>
            </div>

            <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr className="text-gray-500 text-xs tracking-wider uppercase">
                    <th className="px-6 py-3 font-semibold text-left">Invoice No</th>
                    <th className="px-6 py-3 font-semibold text-left">Patient</th>
                    <th className="px-6 py-3 font-semibold text-left">Date</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                    <th className="px-6 py-3 font-semibold text-left">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-gray-600">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{inv.patient_name}</td>
                      <td className="px-6 py-4 text-gray-500">{inv.date}</td>
                      <td className="px-6 py-4 font-semibold text-right text-gray-900">₹{inv.total_amount}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                          inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Printer className="w-4 h-4"/></button>
                           {inv.status !== 'paid' && (
                             <button 
                               onClick={() => { setSelectedInvoice(inv); setPayForm(f => ({ ...f, amount: inv.total_amount - inv.paid_amount })); setShowPaymentModal(true); }}
                               className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg transition-colors">
                               Record Pay
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NEW INVOICE */}
        {activeTab === 'new_invoice' && (
          <div className="max-w-4xl mx-auto flex gap-6 items-start">
            
            {/* Left side: Form */}
            <div className="flex-[2] bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-400"/> Create New Invoice</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patient</label>
                   <select 
                     value={newInvForm.patient_id} 
                     onChange={e => setNewInvForm(p => ({ ...p, patient_id: e.target.value }))}
                     className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 outline-none"
                   >
                     <option value="">Select Patient...</option>
                     {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} - {p.phone}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                   <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                 </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                 <div className="flex items-center justify-between mb-2">
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Items</label>
                 </div>
                 <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50/80 border-b border-gray-100">
                        <tr className="text-gray-500 text-xs font-semibold">
                          <th className="px-4 py-2 text-left w-2/3">Procedure / Item</th>
                          <th className="px-4 py-2 text-right">Amount (₹)</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {newInvItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2"><input type="text" className="w-full bg-transparent border-none outline-none font-medium text-gray-900" value={item.description} onChange={(e) => { const n = [...newInvItems]; n[idx].description = e.target.value; setNewInvItems(n); }} /></td>
                            <td className="px-4 py-2"><input type="number" className="w-full bg-transparent border-none outline-none text-right font-medium text-gray-900" value={item.amount} onChange={(e) => { const n = [...newInvItems]; n[idx].amount = Number(e.target.value); setNewInvItems(n); }} /></td>
                            <td className="px-4 py-2 text-right"><button onClick={() => setNewInvItems(newInvItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="p-3 bg-gray-50/50 flex items-center gap-3">
                       <select 
                         className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
                         onChange={e => {
                           if (!e.target.value) return;
                           const t = TREATMENTS_LIST.find(x => x.id === e.target.value);
                           if(t) setNewInvItems([...newInvItems, { id: `new_${Date.now()}`, description: t.name, amount: t.cost }]);
                           e.target.value = '';
                         }}
                       >
                         <option value="">Quick add treatment...</option>
                         {TREATMENTS_LIST.map(t => <option key={t.id} value={t.id}>{t.name} (₹{t.cost})</option>)}
                       </select>
                       <span className="text-sm text-gray-400">or</span>
                       <button onClick={() => setNewInvItems([...newInvItems, { id: `new_${Date.now()}`, description: 'Misc Item', amount: 0 }])} className="px-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                         + Custom Item
                       </button>
                    </div>
                 </div>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Discount (₹)</label>
                   <input type="number" value={newInvForm.discount} onChange={e => setNewInvForm(p => ({ ...p, discount: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 outline-none" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tax (%)</label>
                   <input type="number" value={newInvForm.tax_perc} onChange={e => setNewInvForm(p => ({ ...p, tax_perc: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500/20 outline-none" />
                 </div>
              </div>
            </div>

            {/* Right side: Summary Block */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm sticky top-6">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                 <h3 className="font-bold text-gray-800 text-sm tracking-wider uppercase mb-1">Invoice Summary</h3>
                 <p className="text-xs text-gray-400">Review final amounts before issuing</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {newInvForm.discount > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium text-green-600">
                    <span>Discount</span>
                    <span>- ₹{newInvForm.discount.toFixed(2)}</span>
                  </div>
                )}
                {newInvForm.tax_perc > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                     <span>Tax ({newInvForm.tax_perc}%)</span>
                     <span>+ ₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-center text-lg font-black text-gray-900">
                    <span>Total Due</span>
                    <span>₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <button onClick={handleCreateInvoice} className="w-full bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/30 text-white font-bold py-3 rounded-xl transition-all">
                  Generate Invoice
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
               <div>
                  <h3 className="font-bold text-gray-900">Record Payment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">for {selectedInvoice.invoice_number}</p>
               </div>
               <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-700">×</button>
            </div>
            <div className="p-6 space-y-5">
               <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                 <div className="text-sm font-medium text-blue-800">Total Pending:</div>
                 <div className="text-lg font-black text-blue-900">₹{selectedInvoice.total_amount - selectedInvoice.paid_amount}</div>
               </div>

               <div>
                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Method</label>
                 <div className="grid grid-cols-3 gap-2">
                   {[
                     { id: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4 mx-auto mb-1"/> },
                     { id: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4 mx-auto mb-1"/> },
                     { id: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4 mx-auto mb-1"/> },
                   ].map(m => (
                     <button
                       key={m.id}
                       onClick={() => setPayForm(p => ({ ...p, method: m.id }))}
                       className={cn(
                         "py-3 border rounded-xl text-center transition-all",
                         payForm.method === m.id ? "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500 font-bold" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                       )}
                     >
                       {m.icon}
                       <span className="text-xs">{m.label}</span>
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount Received (₹)</label>
                 <input 
                    type="number" 
                    value={payForm.amount} 
                    onChange={e => setPayForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full text-2xl font-black text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500/20 outline-none" 
                 />
               </div>

               {payForm.method !== 'cash' && (
                 <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Transaction Ref / UTR (Optional)</label>
                   <input type="text" value={payForm.ref} onChange={e => setPayForm(p => ({...p, ref: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                 </div>
               )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
               <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
               <button onClick={processPayment} className="flex-[2] py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/30 rounded-xl flex items-center justify-center gap-2">
                 <CheckCircle2 className="w-5 h-5"/> Confirm Payment
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
