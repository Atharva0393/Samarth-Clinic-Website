import { createContext, useContext, useState, type ReactNode } from 'react';

// Common types that were duplicated across components
export interface Patient {
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
  medical_history: any;
  patient_notes?: string;
  balance_due?: number;
  last_visit?: string;
}

export interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  duration_mins: number;
  status: any;
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

interface DataContextType {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  invoices: any[];
  setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
  globalSelectedPatientId: string | null;
  setGlobalSelectedPatientId: React.Dispatch<React.SetStateAction<string | null>>;
}

const DataContext = createContext<DataContextType | null>(null);

const SEED_PATIENTS: Patient[] = [
  {
    id: 'p1', first_name: 'Aryan', last_name: 'Sharma', phone: '9876543210',
    email: 'aryan@gmail.com', gender: 'Male', dob: '1989-03-15',
    address: 'Flat 203, Shivam Apartments', city: 'Aurangabad',
    whatsapp_opt_in: true, balance_due: 1500, last_visit: '2024-11-12',
    medical_history: { diabetic: true, hypertensive: false, cardiac: false, allergies: ['Penicillin'], blood_group: 'B+' },
  },
  {
    id: 'p2', first_name: 'Priya', last_name: 'Das', phone: '9876002002',
    email: 'priya.das@yahoo.com', gender: 'Female', dob: '1996-07-22',
    address: '12, Gangapur Road', city: 'Aurangabad',
    whatsapp_opt_in: true, balance_due: 0, last_visit: '2024-10-18',
    medical_history: { diabetic: false, hypertensive: false, cardiac: false, allergies: [], blood_group: 'O+' },
  },
  {
    id: 'p3', first_name: 'Vikram', last_name: 'Singh', phone: '9876003003',
    gender: 'Male', dob: '1978-11-08', city: 'Aurangabad',
    whatsapp_opt_in: true, balance_due: 2500, last_visit: '2024-10-04',
    medical_history: { diabetic: false, hypertensive: true, cardiac: false, allergies: [], blood_group: 'A-' },
  },
  {
    id: 'p4', first_name: 'Meena', last_name: 'Kulkarni', phone: '9876004004',
    gender: 'Female', dob: '1955-04-30', city: 'Aurangabad',
    whatsapp_opt_in: false, balance_due: 200, last_visit: '2024-11-14',
    medical_history: { diabetic: true, hypertensive: true, cardiac: true, allergies: ['Aspirin', 'Ibuprofen'], blood_group: 'AB+' },
  },
  {
    id: 'p5', first_name: 'Raj', last_name: 'Patil', phone: '9876005005',
    email: 'raj.patil@gmail.com', gender: 'Male', dob: '2003-09-12',
    city: 'Aurangabad', whatsapp_opt_in: true, balance_due: 0,
    medical_history: { diabetic: false, hypertensive: false, cardiac: false, allergies: [], blood_group: 'O-' },
  },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(SEED_PATIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([
    { id: 'inv1', invoice_number: 'INV-20240417-0001', patient_id: 'p1', patient_name: 'Rahul Sharma', total_amount: 4500, paid_amount: 4500, status: 'paid', date: '2026-04-10', items: [{ id: 'i1', description: 'Root Canal Treatment', amount: 4500 }] }
  ]);
  const [globalSelectedPatientId, setGlobalSelectedPatientId] = useState<string | null>(null);

  return (
    <DataContext.Provider value={{ 
      patients, setPatients, 
      appointments, setAppointments,
      invoices, setInvoices,
      globalSelectedPatientId, setGlobalSelectedPatientId 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
