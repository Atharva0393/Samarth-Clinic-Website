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
