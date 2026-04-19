-- ============================================================
-- SAMARTH DENTAL CLINIC — PRODUCTION DATABASE SCHEMA
-- PostgreSQL 15+  |  Version: 1.0.0
-- ============================================================
-- HOW TO RUN:
--   psql -U postgres -c "CREATE DATABASE samarth_dental;"
--   psql -U postgres -d samarth_dental -f database/schema.sql
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram index for fuzzy name search
CREATE EXTENSION IF NOT EXISTS "btree_gist";   -- Required for EXCLUDE constraint on UUID + range

-- ============================================================
-- CLEANUP (safe re-run in development)
-- ============================================================
DROP VIEW  IF EXISTS patient_timeline CASCADE;
DROP TABLE IF EXISTS inventory         CASCADE;
DROP TABLE IF EXISTS payments          CASCADE;
DROP TABLE IF EXISTS invoice_lines     CASCADE;
DROP TABLE IF EXISTS invoices          CASCADE;
DROP TABLE IF EXISTS treatment_records CASCADE;
DROP TABLE IF EXISTS treatments        CASCADE;
DROP TABLE IF EXISTS appointments      CASCADE;
DROP TABLE IF EXISTS dentists          CASCADE;
DROP TABLE IF EXISTS patients          CASCADE;
DROP TABLE IF EXISTS users             CASCADE;
DROP TABLE IF EXISTS clinics           CASCADE;

DROP TYPE IF EXISTS user_role          CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS treatment_status   CASCADE;
DROP TYPE IF EXISTS invoice_status     CASCADE;
DROP TYPE IF EXISTS payment_method     CASCADE;

-- ============================================================
-- ENUMS  (fixed, validated set of values)
-- ============================================================
CREATE TYPE user_role AS ENUM (
    'super_admin',   -- Clinic owner / chief dentist
    'dentist',       -- Associate dentist
    'receptionist'   -- Front-desk staff
);

CREATE TYPE appointment_status AS ENUM (
    'scheduled',     -- Booked in advance
    'waiting',       -- Patient has arrived at clinic
    'in_chair',      -- Currently being treated
    'completed',     -- Treatment done for this visit
    'no_show',       -- Patient did not arrive
    'cancelled'      -- Cancelled by clinic or patient
);

CREATE TYPE treatment_status AS ENUM (
    'planned',       -- Added to treatment plan, not yet started
    'in_progress',   -- Work started (e.g. RCT Phase 1 done)
    'completed'      -- Fully done
);

CREATE TYPE invoice_status AS ENUM (
    'draft',         -- Not yet finalised
    'unpaid',        -- Finalised, no payments received
    'partial',       -- Some payment received, balance remaining
    'paid'           -- Fully settled
);

CREATE TYPE payment_method AS ENUM (
    'cash',
    'card',
    'upi',           -- Google Pay, PhonePe, Paytm (most common in India)
    'bank_transfer',
    'cheque'
);

-- ============================================================
-- TABLE 1: CLINICS  (root tenant — all data scoped here)
-- ============================================================
CREATE TABLE clinics (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pin_code        VARCHAR(10),
    contact_phone   VARCHAR(20),
    contact_email   VARCHAR(255),
    upi_id          VARCHAR(100),              -- clinic's UPI ID for payment QR
    logo_url        TEXT,
    working_hours   JSONB DEFAULT '{}',        -- { "mon": "10:00-14:00,17:00-21:00" }
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE clinics IS 'Root tenant table. Every other record is scoped to a clinic.';

-- ============================================================
-- TABLE 2: USERS  (authentication + roles for all staff)
-- ============================================================
CREATE TABLE users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    role            user_role    NOT NULL DEFAULT 'receptionist',
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    password_hash   TEXT         NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_clinic   ON users(clinic_id);
CREATE INDEX idx_users_role     ON users(clinic_id, role);

COMMENT ON TABLE  users              IS 'All staff who can log in. One row per person.';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash — never store plain text.';

-- ============================================================
-- TABLE 3: DENTISTS  (extended clinical profile for dentist users)
-- ============================================================
CREATE TABLE dentists (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id       UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    specialization  VARCHAR(100),
    license_number  VARCHAR(100) NOT NULL,
    bio             TEXT,
    signature_url   TEXT,                      -- For PDF prescriptions
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT dentists_user_unique    UNIQUE (user_id),
    CONSTRAINT dentists_license_unique UNIQUE (license_number)
);

CREATE INDEX idx_dentists_clinic ON dentists(clinic_id);

COMMENT ON TABLE dentists IS 'Extended profile for users with role=dentist or super_admin who also treat patients.';

-- ============================================================
-- TABLE 4: PATIENTS  (core EHR entity)
-- ============================================================
CREATE TABLE patients (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id         UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    dob               DATE,
    gender            VARCHAR(20)  CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    phone             VARCHAR(20)  NOT NULL,
    email             VARCHAR(255),
    address           TEXT,
    city              VARCHAR(100),
    whatsapp_opt_in   BOOLEAN      NOT NULL DEFAULT true,
    -- JSONB for flexible medical history without schema migrations
    -- Example: { "diabetic": true, "hypertensive": false, "allergies": ["penicillin"], "cardiac": false }
    medical_history   JSONB        NOT NULL DEFAULT '{}',
    patient_notes     TEXT,                    -- Receptionist-visible general notes
    is_active         BOOLEAN      NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Phone must be unique within a clinic (same patient, different branch = OK)
    CONSTRAINT patients_phone_clinic_unique UNIQUE (clinic_id, phone)
);

-- Fast full-text search on name (receptionist types partial name)
CREATE INDEX idx_patients_name_fts   ON patients USING gin(to_tsvector('english', first_name || ' ' || last_name));
-- Trigram index for LIKE/ILIKE search
CREATE INDEX idx_patients_name_trgm  ON patients USING gin((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_patients_phone      ON patients(phone);
CREATE INDEX idx_patients_clinic     ON patients(clinic_id);
CREATE INDEX idx_patients_created    ON patients(clinic_id, created_at DESC);

COMMENT ON TABLE  patients                 IS 'Electronic Health Record (EHR) for every patient.';
COMMENT ON COLUMN patients.medical_history IS 'Flexible JSONB: { diabetic, hypertensive, allergies[], cardiac, bloodGroup, ... }';

-- ============================================================
-- TABLE 5: APPOINTMENTS  (scheduling + live queue)
-- ============================================================
CREATE TABLE appointments (
    id              UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID               NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id      UUID               NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id      UUID               NOT NULL REFERENCES dentists(id),
    start_time      TIMESTAMPTZ        NOT NULL,
    end_time        TIMESTAMPTZ        NOT NULL,
    status          appointment_status NOT NULL DEFAULT 'scheduled',
    token_number    VARCHAR(20),                -- Walk-in token: WI-001, APT-012
    notes           TEXT,                       -- Chief complaint / reason for visit
    booked_by       UUID               REFERENCES users(id) ON DELETE SET NULL,
    checked_in_at   TIMESTAMPTZ,               -- When patient arrived
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    -- Validation: end must be after start
    CONSTRAINT appt_time_order CHECK (end_time > start_time),

    -- CORE ANTI-DOUBLE-BOOKING: same dentist, overlapping time = rejected at DB level
    -- Exclusion is only enforced for active statuses (not cancelled/no_show)
    CONSTRAINT no_double_booking EXCLUDE USING gist (
        dentist_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

CREATE INDEX idx_appt_clinic_date   ON appointments(clinic_id, start_time);
CREATE INDEX idx_appt_patient       ON appointments(patient_id);
CREATE INDEX idx_appt_dentist_date  ON appointments(dentist_id, start_time);
CREATE INDEX idx_appt_status        ON appointments(clinic_id, status, start_time);

COMMENT ON TABLE appointments IS 'Central scheduling table. EXCLUDE constraint prevents double-booking at DB level.';

-- ============================================================
-- TABLE 6: TREATMENTS  (clinic service catalog)
-- ============================================================
CREATE TABLE treatments (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),              -- 'Endodontics', 'Orthodontics', 'Cosmetic'
    description     TEXT,
    base_cost       NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (base_cost >= 0),
    duration_mins   INTEGER      NOT NULL DEFAULT 30   CHECK (duration_mins > 0),
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT treatments_cost_positive CHECK (base_cost >= 0)
);

CREATE INDEX idx_treatments_clinic    ON treatments(clinic_id, is_active);
CREATE INDEX idx_treatments_category  ON treatments(clinic_id, category);

COMMENT ON TABLE treatments IS 'Master catalog of all services/procedures offered by the clinic.';

-- ============================================================
-- TABLE 7: TREATMENT RECORDS  (what was done to which tooth)
-- ============================================================
CREATE TABLE treatment_records (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID             NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id      UUID             NOT NULL REFERENCES dentists(id),
    clinic_id       UUID             NOT NULL REFERENCES clinics(id),
    appointment_id  UUID             REFERENCES appointments(id) ON DELETE SET NULL,
    treatment_id    UUID             NOT NULL REFERENCES treatments(id),
    tooth_number    VARCHAR(10),               -- FDI: '46', '21' or 'UL' or 'ALL'
    cost            NUMERIC(10,2)    NOT NULL  CHECK (cost >= 0),
    status          treatment_status NOT NULL DEFAULT 'planned',
    clinical_notes  TEXT,                      -- Doctor's session notes
    prescription    TEXT,                      -- Prescribed medicines
    next_visit_note TEXT,                      -- Instruction for next sitting
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_treatment_records_patient    ON treatment_records(patient_id, created_at DESC);
CREATE INDEX idx_treatment_records_dentist    ON treatment_records(dentist_id);
CREATE INDEX idx_treatment_records_appt       ON treatment_records(appointment_id);
CREATE INDEX idx_treatment_records_clinic     ON treatment_records(clinic_id, created_at DESC);

COMMENT ON TABLE treatment_records IS 'Each row = one treatment session. Links to tooth (FDI), appointment, dentist.';

-- ============================================================
-- TABLE 8: INVOICES  (billing documents)
-- ============================================================
CREATE TABLE invoices (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID           NOT NULL REFERENCES clinics(id),
    patient_id      UUID           NOT NULL REFERENCES patients(id),
    invoice_number  VARCHAR(50)    NOT NULL,               -- INV-2024-00001
    total_amount    NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    discount        NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    discount_reason VARCHAR(255),                          -- 'Senior citizen', 'Staff family'
    tax_amount      NUMERIC(10,2)  NOT NULL DEFAULT 0.00,  -- GST if applicable
    net_amount      NUMERIC(10,2)  NOT NULL DEFAULT 0.00,  -- Final payable
    status          invoice_status NOT NULL DEFAULT 'unpaid',
    due_date        DATE,
    notes           TEXT,
    created_by      UUID           REFERENCES users(id),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT invoices_number_unique    UNIQUE (invoice_number),
    CONSTRAINT invoices_discount_valid   CHECK (discount >= 0 AND discount <= total_amount),
    CONSTRAINT invoices_net_valid        CHECK (net_amount >= 0)
);

CREATE INDEX idx_invoices_patient   ON invoices(patient_id, created_at DESC);
CREATE INDEX idx_invoices_clinic    ON invoices(clinic_id, status, created_at DESC);
CREATE INDEX idx_invoices_number    ON invoices(invoice_number);

-- ============================================================
-- TABLE 8b: INVOICE LINES  (itemized line items on each invoice)
-- ============================================================
CREATE TABLE invoice_lines (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id           UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    treatment_record_id  UUID          REFERENCES treatment_records(id) ON DELETE SET NULL,
    description          VARCHAR(255)  NOT NULL,
    quantity             INTEGER       NOT NULL DEFAULT 1,
    unit_cost            NUMERIC(10,2) NOT NULL,
    total                NUMERIC(10,2) NOT NULL,

    CONSTRAINT invoice_lines_qty_positive  CHECK (quantity > 0),
    CONSTRAINT invoice_lines_cost_positive CHECK (unit_cost >= 0)
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);

COMMENT ON TABLE invoice_lines IS 'Itemized line items. Always link to an invoice. Optionally links to a treatment_record.';

-- ============================================================
-- TABLE 9: PAYMENTS  (payments against invoices — can be partial)
-- ============================================================
CREATE TABLE payments (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id      UUID           NOT NULL REFERENCES patients(id),
    clinic_id       UUID           NOT NULL REFERENCES clinics(id),
    amount          NUMERIC(10,2)  NOT NULL CHECK (amount > 0),
    payment_method  payment_method NOT NULL,
    reference_no    VARCHAR(255),              -- UPI UTR number, cheque number
    payment_date    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    received_by     UUID           REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice  ON payments(invoice_id);
CREATE INDEX idx_payments_patient  ON payments(patient_id, payment_date DESC);
CREATE INDEX idx_payments_clinic   ON payments(clinic_id, payment_date DESC);
CREATE INDEX idx_payments_date     ON payments(clinic_id, payment_date DESC);

-- ============================================================
-- TABLE 10: INVENTORY
-- ============================================================
CREATE TABLE inventory (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    item_name       VARCHAR(255) NOT NULL,
    category        VARCHAR(100),              -- 'Restorative', 'Disposable', 'Anesthetic'
    brand           VARCHAR(100),
    stock_level     INTEGER      NOT NULL DEFAULT 0  CHECK (stock_level >= 0),
    reorder_level   INTEGER      NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    unit            VARCHAR(50),               -- 'boxes', 'tubes', 'units'
    unit_cost       NUMERIC(10,2),
    supplier_name   VARCHAR(255),
    supplier_phone  VARCHAR(20),
    last_restocked  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_clinic        ON inventory(clinic_id);
CREATE INDEX idx_inventory_low_stock     ON inventory(clinic_id, stock_level) WHERE stock_level <= reorder_level;

COMMENT ON TABLE inventory IS 'Dental supplies stock. Partial index idx_inventory_low_stock allows fast low-stock alerts.';

-- ============================================================
-- TRIGGER: Auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinics_updated_at
    BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_treatment_records_updated_at
    BEFORE UPDATE ON treatment_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_dentists_updated_at
    BEFORE UPDATE ON dentists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_updated_at
    BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: Auto-update invoice status after payment
-- ============================================================
CREATE OR REPLACE FUNCTION sync_invoice_status_after_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid   NUMERIC(10,2);
    v_net_amount   NUMERIC(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id;

    SELECT net_amount
    INTO v_net_amount
    FROM invoices
    WHERE id = NEW.invoice_id;

    IF v_total_paid >= v_net_amount THEN
        UPDATE invoices SET status = 'paid',    updated_at = NOW() WHERE id = NEW.invoice_id;
    ELSIF v_total_paid > 0 THEN
        UPDATE invoices SET status = 'partial', updated_at = NOW() WHERE id = NEW.invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION sync_invoice_status_after_payment();

-- ============================================================
-- TRIGGER: Validate appointment time order
-- (belt-and-suspenders — constraint handles it but trigger gives a nice message)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_appointment_times()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time <= NEW.start_time THEN
        RAISE EXCEPTION 'Appointment end_time must be after start_time.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_appt_times
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_times();

-- ============================================================
-- VIEW: Patient Timeline  (unified feed across all events)
-- ============================================================
CREATE OR REPLACE VIEW patient_timeline AS
    SELECT
        a.id,
        a.patient_id,
        a.created_at AS event_date,
        'appointment'::TEXT AS event_type,
        CONCAT('Appointment — ', a.status, COALESCE(': ' || a.notes, '')) AS description,
        NULL::NUMERIC AS amount,
        a.status AS event_status
    FROM appointments a
    UNION ALL
    SELECT
        tr.id,
        tr.patient_id,
        tr.created_at AS event_date,
        'treatment'::TEXT AS event_type,
        CONCAT(t.name, COALESCE(' (Tooth ' || tr.tooth_number || ')', ''), COALESCE(': ' || tr.clinical_notes, '')) AS description,
        tr.cost AS amount,
        tr.status::TEXT AS event_status
    FROM treatment_records tr
    JOIN treatments t ON t.id = tr.treatment_id
    UNION ALL
    SELECT
        p.id,
        p.patient_id,
        p.payment_date AS event_date,
        'payment'::TEXT AS event_type,
        CONCAT('Payment received — ₹', p.amount, ' via ', p.payment_method, COALESCE(' (Ref: ' || p.reference_no || ')', '')) AS description,
        p.amount AS amount,
        'completed'::TEXT AS event_status
    FROM payments p;

COMMENT ON VIEW patient_timeline IS 'Unified chronological feed of appointments, treatments, and payments for a patient.';

-- ============================================================
-- VIEW: Invoice Summary with balance due
-- ============================================================
CREATE OR REPLACE VIEW invoice_summary AS
    SELECT
        i.*,
        COALESCE(SUM(p.amount), 0) AS total_paid,
        i.net_amount - COALESCE(SUM(p.amount), 0) AS balance_due,
        COUNT(p.id) AS payment_count
    FROM invoices i
    LEFT JOIN payments p ON p.invoice_id = i.id
    GROUP BY i.id;

COMMENT ON VIEW invoice_summary IS 'Invoice with computed total_paid and balance_due — use this in API queries.';

-- ============================================================
-- VIEW: Daily Revenue (for dashboard KPIs)
-- ============================================================
CREATE OR REPLACE VIEW daily_revenue AS
    SELECT
        clinic_id,
        DATE(payment_date AT TIME ZONE 'Asia/Kolkata') AS date,
        COUNT(*) AS payment_count,
        SUM(amount) AS total_revenue,
        SUM(CASE WHEN payment_method = 'upi'  THEN amount ELSE 0 END) AS upi_revenue,
        SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) AS cash_revenue
    FROM payments
    GROUP BY clinic_id, DATE(payment_date AT TIME ZONE 'Asia/Kolkata');

COMMENT ON VIEW daily_revenue IS 'Aggregated daily revenue per clinic. Used by the Analytics dashboard.';

-- ============================================================
-- TABLE 11: PATIENT DOCUMENTS (Cloud Storage Integration)
-- ============================================================
CREATE TYPE document_type AS ENUM (
    'xray',
    'report',
    'prescription',
    'other'
);

CREATE TABLE patient_documents (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID            NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id      UUID            NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title           VARCHAR(255)    NOT NULL,
    doc_type        document_type   NOT NULL DEFAULT 'other',
    file_url        TEXT            NOT NULL,          -- S3 / Cloud storage URL
    file_key        TEXT            NOT NULL,          -- S3 object key (for deletion)
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    uploaded_by     UUID            REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_documents_patient ON patient_documents(patient_id, created_at DESC);
CREATE INDEX idx_patient_documents_clinic  ON patient_documents(clinic_id, created_at DESC);

CREATE TRIGGER trg_patient_documents_updated_at
    BEFORE UPDATE ON patient_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
SELECT 'Schema applied successfully at ' || NOW() AS status;
