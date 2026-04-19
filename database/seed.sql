-- ============================================================
-- SAMARTH DENTAL CLINIC — SEED DATA
-- Run AFTER schema.sql
-- All demo passwords: demo1234
-- bcrypt($2a$12$) of 'demo1234'
-- ============================================================

-- ============================================================
-- 1. CLINIC
-- ============================================================
INSERT INTO clinics (id, name, address, city, state, pin_code, contact_phone, contact_email, upi_id, working_hours)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Samarth Multispeciality Dental Clinic',
    'Shop No. 5, Samarth Complex, Near CIDCO Bus Stand, N-6',
    'Chhatrapati Sambhajinagar',
    'Maharashtra',
    '431003',
    '9876543210',
    'dr.hemke@samarthdental.com',
    'samarth.hemke@hdfcbank',
    '{"mon":"10:00-14:00,17:00-21:00","tue":"10:00-14:00,17:00-21:00","wed":"10:00-14:00,17:00-21:00","thu":"10:00-14:00,17:00-21:00","fri":"10:00-14:00,17:00-21:00","sat":"10:00-14:00","sun":"Closed"}'::JSONB
);

-- ============================================================
-- 2. USERS (1 Admin + 2 Dentists + 1 Receptionist)
-- ============================================================
-- Password hash = bcrypt('demo1234', 12)
-- You can verify: SELECT crypt('demo1234', '$2a$12$LQv3c1yqBWVHxkd0LHAkCO') = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK9T5C3W6';

INSERT INTO users (id, clinic_id, role, first_name, last_name, email, phone, password_hash) VALUES

-- Super Admin (Owner / Chief Dentist)
(   '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'super_admin', 'Rohan', 'Hemke',
    'admin@samarth.com', '9876543210',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK9T5C3W6'
),

-- Dentist 1 (same person as admin — common in small clinics)
(   '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'dentist', 'Rohan', 'Hemke',
    'doctor@samarth.com', '9876543210',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK9T5C3W6'
),

-- Dentist 2 (Associate)
(   '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'dentist', 'Sneha', 'Joshi',
    'sneha@samarth.com', '9988776655',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK9T5C3W6'
),

-- Receptionist
(   '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'receptionist', 'Priya', 'Kulkarni',
    'reception@samarth.com', '9112233445',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK9T5C3W6'
);

-- ============================================================
-- 3. DENTIST PROFILES
-- ============================================================
INSERT INTO dentists (id, user_id, clinic_id, specialization, license_number, bio) VALUES

(   '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'General & Cosmetic Dentistry',
    'MH-DCI-2018-04521',
    'Dr. Rohan Hemke has 10+ years of experience in general and cosmetic dentistry. Specializes in Root Canal Treatments and smile makeovers.'
),

(   '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Orthodontics',
    'MH-DCI-2021-08833',
    'Dr. Sneha Joshi specializes in orthodontic treatments including metal braces and clear aligners.'
);

-- ============================================================
-- 4. PATIENTS (5 patients with varied profiles)
-- ============================================================
INSERT INTO patients (id, clinic_id, first_name, last_name, dob, gender, phone, email, address, city, whatsapp_opt_in, medical_history) VALUES

-- Patient 1: Aryan Sharma — diabetic, needs attention
(   '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Aryan', 'Sharma',
    '1989-03-15', 'Male',
    '9876001001', 'aryan.sharma@gmail.com',
    'Flat 203, Shivam Apartments, Hudco Colony',
    'Chhatrapati Sambhajinagar', true,
    '{"diabetic": true, "hypertensive": false, "cardiac": false, "allergies": ["penicillin"], "blood_group": "B+"}'::JSONB
),

-- Patient 2: Priya Das — healthy, regular checkup patient
(   '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Priya', 'Das',
    '1996-07-22', 'Female',
    '9876002002', 'priya.das@yahoo.com',
    '12, Gangapur Road, Cantonment Area',
    'Chhatrapati Sambhajinagar', true,
    '{"diabetic": false, "hypertensive": false, "cardiac": false, "allergies": [], "blood_group": "O+"}'::JSONB
),

-- Patient 3: Vikram Singh — hypertensive, orthodontics patient
(   '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Vikram', 'Singh',
    '1978-11-08', 'Male',
    '9876003003', NULL,
    'H.No 8, Vijayanagar Colony, Aurangabad Road',
    'Chhatrapati Sambhajinagar', true,
    '{"diabetic": false, "hypertensive": true, "cardiac": false, "allergies": [], "blood_group": "A-", "bp_medication": "Amlodipine 5mg"}'::JSONB
),

-- Patient 4: Meena Kulkarni — older patient, denture work
(   '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Meena', 'Kulkarni',
    '1955-04-30', 'Female',
    '9876004004', NULL,
    'Plot 34, MIDC Colony, Waluj',
    'Chhatrapati Sambhajinagar', false,
    '{"diabetic": true, "hypertensive": true, "cardiac": true, "allergies": ["aspirin", "ibuprofen"], "blood_group": "AB+", "cardiac_medication": "Atorvastatin"}'::JSONB
),

-- Patient 5: Raj Patil — young patient, braces query
(   '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'Raj', 'Patil',
    '2003-09-12', 'Male',
    '9876005005', 'raj.patil@gmail.com',
    '22, Saraswati Nagar, Osmanpura',
    'Chhatrapati Sambhajinagar', true,
    '{"diabetic": false, "hypertensive": false, "cardiac": false, "allergies": [], "blood_group": "O-"}'::JSONB
);

-- ============================================================
-- 5. TREATMENT CATALOG (12 standard dental services)
-- ============================================================
INSERT INTO treatments (id, clinic_id, name, category, description, base_cost, duration_mins) VALUES
(   '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
    'Consultation & Checkup', 'Preventive',
    'Initial or follow-up consultation with dental examination.', 200, 20),

(   '50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
    'Scaling & Polishing', 'Preventive',
    'Professional teeth cleaning, plaque and tartar removal.', 800, 45),

(   '50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
    'Tooth Extraction (Simple)', 'Oral Surgery',
    'Simple extraction of an erupted tooth.', 500, 30),

(   '50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
    'Tooth Extraction (Surgical)', 'Oral Surgery',
    'Surgical extraction including impacted wisdom teeth.', 1800, 60),

(   '50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
    'Composite Filling', 'Restorative',
    'Tooth-coloured resin filling for cavities.', 800, 45),

(   '50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
    'Root Canal Treatment (RCT)', 'Endodontics',
    'Multi-visit RCT including access, shaping, and obturation.', 3500, 90),

(   '50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001',
    'PFM Crown', 'Prosthodontics',
    'Porcelain fused to metal crown restoration.', 4500, 60),

(   '50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001',
    'Zirconia Crown', 'Prosthodontics',
    'High-strength, aesthetic all-ceramic zirconia crown.', 12000, 60),

(   '50000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001',
    'Metal Braces (Full Arch)', 'Orthodontics',
    'Complete orthodontic treatment with metal brackets. 12-18 months.', 25000, 60),

(   '50000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001',
    'Clear Aligners', 'Orthodontics',
    'Removable transparent aligner therapy.', 60000, 60),

(   '50000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
    'Teeth Whitening (In-office)', 'Cosmetic',
    'LED-activated professional whitening. 1 session = 2-3 shades lighter.', 3000, 60),

(   '50000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001',
    'RVG X-Ray', 'Diagnostic',
    'Digital intraoral radiograph (single tooth).', 300, 10);

-- ============================================================
-- 6. APPOINTMENTS (mix of statuses for today + upcoming)
-- ============================================================
INSERT INTO appointments (id, clinic_id, patient_id, dentist_id, start_time, end_time, status, token_number, notes) VALUES

-- Today: In-Chair
(   '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',    -- Aryan Sharma
    '30000000-0000-0000-0000-000000000001',    -- Dr. Hemke
    NOW()::date + TIME '10:00', NOW()::date + TIME '10:30',
    'in_chair', 'APT-001', 'Root Canal Phase 1 — Tooth 46. Patient says severe pain since 3 days.'),

-- Today: Waiting
(   '60000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',    -- Priya Das
    '30000000-0000-0000-0000-000000000001',    -- Dr. Hemke
    NOW()::date + TIME '10:45', NOW()::date + TIME '11:15',
    'waiting', 'APT-002', 'Routine scaling and checkup.'),

-- Today: Scheduled (upcoming)
(   '60000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',    -- Raj Patil
    '30000000-0000-0000-0000-000000000002',    -- Dr. Sneha (Orthodontics)
    NOW()::date + TIME '11:30', NOW()::date + TIME '12:30',
    'scheduled', 'APT-003', 'Braces consultation — first visit.'),

-- Today: Completed
(   '60000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',    -- Vikram Singh
    '30000000-0000-0000-0000-000000000001',    -- Dr. Hemke
    NOW()::date + TIME '09:00', NOW()::date + TIME '09:30',
    'completed', 'APT-004', 'Scaling done.'),

-- Yesterday: Completed
(   '60000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',    -- Meena Kulkarni
    '30000000-0000-0000-0000-000000000001',
    (NOW() - INTERVAL '1 day')::date + TIME '17:00',
    (NOW() - INTERVAL '1 day')::date + TIME '18:00',
    'completed', NULL, 'Checkup after crown fitting.'),

-- No-show last week
(   '60000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',    -- Aryan Sharma
    '30000000-0000-0000-0000-000000000001',
    (NOW() - INTERVAL '7 days')::date + TIME '11:00',
    (NOW() - INTERVAL '7 days')::date + TIME '11:30',
    'no_show', NULL, 'Did not show up. Follow-up needed.');

-- ============================================================
-- 7. TREATMENT RECORDS
-- ============================================================
INSERT INTO treatment_records (id, patient_id, dentist_id, clinic_id, appointment_id, treatment_id, tooth_number, cost, status, clinical_notes, next_visit_note) VALUES

-- Aryan Sharma — RCT Phase 1 (ongoing)
(   '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000006',    -- RCT
    '46', 3500, 'in_progress',
    'Access opening done. Working length established: 21mm. Canals cleaned with K-files up to 25#. Irrigation with NaOCl. Temporary filling placed.',
    'Next visit: Obturation. Avoid chewing on right side. Take prescribed antibiotics.'
),

-- Vikram Singh — Scaling (completed yesterday)
(   '70000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000002',    -- Scaling
    'ALL', 800, 'completed',
    'Full mouth scaling and polishing done. Moderate calculus present. Advised proper brushing technique.',
    '6-month recall for scaling.'
),

-- Meena Kulkarni — Checkup (planned treatment identified)
(   '70000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000001',    -- Consultation
    NULL, 200, 'completed',
    'Complete oral examination done. Identified need for extraction of 17 (deeply carious). Patient to be scheduled for surgical extraction.',
    'Book next appointment for surgical extraction of 17.'
);

-- ============================================================
-- 8. INVOICES
-- ============================================================
INSERT INTO invoices (id, clinic_id, patient_id, invoice_number, total_amount, discount, net_amount, status, due_date) VALUES

-- Aryan Sharma — RCT partial payment pending
(   '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'INV-2024-0001', 3500, 0, 3500, 'partial',
    (NOW() + INTERVAL '30 days')::date
),

-- Vikram Singh — Scaling fully paid
(   '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'INV-2024-0002', 800, 0, 800, 'paid',
    (NOW() - INTERVAL '1 day')::date
),

-- Meena Kulkarni — Consultation unpaid
(   '80000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    'INV-2024-0003', 200, 0, 200, 'unpaid',
    (NOW() + INTERVAL '7 days')::date
);

-- ============================================================
-- 9. INVOICE LINES
-- ============================================================
INSERT INTO invoice_lines (invoice_id, treatment_record_id, description, quantity, unit_cost, total) VALUES

-- Invoice 1: Aryan — RCT
(   '80000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'Root Canal Treatment — Tooth 46 (Phase 1)', 1, 3500, 3500),

-- Invoice 2: Vikram — Scaling
(   '80000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    'Full Mouth Scaling & Polishing', 1, 800, 800),

-- Invoice 3: Meena — Consultation
(   '80000000-0000-0000-0000-000000000003',
    '70000000-0000-0000-0000-000000000003',
    'Dental Consultation & Examination', 1, 200, 200);

-- ============================================================
-- 10. PAYMENTS
-- ============================================================
INSERT INTO payments (invoice_id, patient_id, clinic_id, amount, payment_method, reference_no, payment_date) VALUES

-- Aryan — paid ₹2,000 advance via UPI (partial)
(   '80000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    2000, 'upi', 'UTR423819734612',
    NOW() - INTERVAL '2 hours'),

-- Vikram — paid ₹800 cash (full)
(   '80000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    800, 'cash', NULL,
    NOW() - INTERVAL '1 day');

-- ============================================================
-- 11. INVENTORY (starter stock)
-- ============================================================
INSERT INTO inventory (clinic_id, item_name, category, brand, stock_level, reorder_level, unit, unit_cost) VALUES
('10000000-0000-0000-0000-000000000001', 'Gloves (Medium)',              'Disposable',   '3M Nexcare',   8,  5, 'boxes',   180),
('10000000-0000-0000-0000-000000000001', 'Gloves (Large)',               'Disposable',   '3M Nexcare',   6,  5, 'boxes',   180),
('10000000-0000-0000-0000-000000000001', 'Surgical Masks',               'Disposable',   'Kimberly-Clark',14,10, 'boxes',   220),
('10000000-0000-0000-0000-000000000001', 'Composite Resin A2',           'Restorative',  'GC Gradia',     3,  3, 'syringes',850),
('10000000-0000-0000-0000-000000000001', 'Composite Resin A3',           'Restorative',  'GC Gradia',     2,  3, 'syringes',850),
('10000000-0000-0000-0000-000000000001', 'Lidocaine 2% (Injection)',     'Anesthetic',   'Lignocraft',   18, 10, 'cartridges',45),
('10000000-0000-0000-0000-000000000001', 'Suture Thread 3-0',            'Surgical',     'Ethicon',       4,  5, 'packets', 320),
('10000000-0000-0000-0000-000000000001', 'NaOCl 5.25% (Irrigant)',      'Endodontics',  'RC-Dent',       2,  3, 'bottles',  90),
('10000000-0000-0000-0000-000000000001', 'Gutta Percha Points (Std)',    'Endodontics',  'Dentsply',      5,  2, 'boxes',   280),
('10000000-0000-0000-0000-000000000001', 'GIC Cement (Type I)',          'Restorative',  'GC Fuji',       1,  2, 'packs',   950);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
DO $$
DECLARE
    v_patients    INTEGER;
    v_dentists    INTEGER;
    v_appts       INTEGER;
    v_treatments  INTEGER;
    v_invoices    INTEGER;
    v_payments    INTEGER;
    v_inventory   INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_patients   FROM patients;
    SELECT COUNT(*) INTO v_dentists   FROM dentists;
    SELECT COUNT(*) INTO v_appts      FROM appointments;
    SELECT COUNT(*) INTO v_treatments FROM treatments;
    SELECT COUNT(*) INTO v_invoices   FROM invoices;
    SELECT COUNT(*) INTO v_payments   FROM payments;
    SELECT COUNT(*) INTO v_inventory  FROM inventory;

    RAISE NOTICE '--- Seed Data Summary ---';
    RAISE NOTICE 'Patients:     %', v_patients;
    RAISE NOTICE 'Dentists:     %', v_dentists;
    RAISE NOTICE 'Appointments: %', v_appts;
    RAISE NOTICE 'Treatments:   %', v_treatments;
    RAISE NOTICE 'Invoices:     %', v_invoices;
    RAISE NOTICE 'Payments:     %', v_payments;
    RAISE NOTICE 'Inventory:    %', v_inventory;
    RAISE NOTICE '-------------------------';
    RAISE NOTICE 'Seed data applied successfully!';
END $$;
