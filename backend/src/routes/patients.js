const express  = require('express');
const { body, query, param, validationResult } = require('express-validator');
const pool     = require('../config/db');
const { authenticate, sameClinic, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, sameClinic);

// ─── Helpers ───────────────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error:  'Validation failed.',
      fields: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patients
// List all patients — supports search, pagination
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requirePermission('patients:read'), [
  query('q').optional().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validate, async (req, res) => {
  const { q = '', page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const clinic_id = req.user.clinic_id;

  try {
    let rows, total;

    if (q) {
      // Full-text + trigram search
      const result = await pool.query(
        `SELECT
           p.id, p.first_name, p.last_name, p.phone, p.email,
           p.gender, p.dob, p.whatsapp_opt_in, p.medical_history,
           p.patient_notes, p.created_at, p.updated_at,
           -- Last appointment date
           (SELECT MAX(a.start_time) FROM appointments a WHERE a.patient_id = p.id) AS last_visit,
           -- Total balance (net_amount - paid)
           COALESCE((
             SELECT SUM(i.net_amount) - COALESCE(SUM(pay.amount), 0)
             FROM invoices i
             LEFT JOIN payments pay ON pay.invoice_id = i.id
             WHERE i.patient_id = p.id AND i.status != 'paid'
           ), 0) AS balance_due,
           COUNT(*) OVER() AS total_count
         FROM patients p
         WHERE p.clinic_id = $1
           AND p.is_active = true
           AND (
             to_tsvector('english', p.first_name || ' ' || p.last_name) @@ plainto_tsquery($2)
             OR (p.first_name || ' ' || p.last_name) ILIKE $3
             OR p.phone ILIKE $3
           )
         ORDER BY p.first_name, p.last_name
         LIMIT $4 OFFSET $5`,
        [clinic_id, q, `%${q}%`, limit, offset]
      );
      rows  = result.rows;
      total = rows[0]?.total_count || 0;
    } else {
      const result = await pool.query(
        `SELECT
           p.id, p.first_name, p.last_name, p.phone, p.email,
           p.gender, p.dob, p.whatsapp_opt_in, p.medical_history,
           p.patient_notes, p.created_at, p.updated_at,
           (SELECT MAX(a.start_time) FROM appointments a WHERE a.patient_id = p.id) AS last_visit,
           COALESCE((
             SELECT SUM(i.net_amount) - COALESCE(SUM(pay.amount), 0)
             FROM invoices i
             LEFT JOIN payments pay ON pay.invoice_id = i.id
             WHERE i.patient_id = p.id AND i.status != 'paid'
           ), 0) AS balance_due,
           COUNT(*) OVER() AS total_count
         FROM patients p
         WHERE p.clinic_id = $1 AND p.is_active = true
         ORDER BY p.updated_at DESC
         LIMIT $2 OFFSET $3`,
        [clinic_id, limit, offset]
      );
      rows  = result.rows;
      total = rows[0]?.total_count || 0;
    }

    res.json({
      patients:   rows.map(r => { delete r.total_count; return r; }),
      pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /patients]', err);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patients/:id
// Full patient details + treatment records + invoices
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requirePermission('patients:read'), [
  param('id').isUUID(),
], validate, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.user.clinic_id;

  try {
    // Patient profile
    const { rows: pRows } = await pool.query(
      `SELECT p.*, 
         COALESCE((
           SELECT SUM(i.net_amount) - COALESCE(SUM(pay.amount), 0)
           FROM invoices i
           LEFT JOIN payments pay ON pay.invoice_id = i.id
           WHERE i.patient_id = p.id AND i.status != 'paid'
         ), 0) AS balance_due
       FROM patients p
       WHERE p.id = $1 AND p.clinic_id = $2 AND p.is_active = true`,
      [id, clinic_id]
    );

    if (pRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Timeline: appointments
    const { rows: appointments } = await pool.query(
      `SELECT a.id, a.start_time, a.status, a.notes, a.token_number,
              u.first_name || ' ' || u.last_name AS dentist_name
       FROM appointments a
       JOIN dentists d ON d.id = a.dentist_id
       JOIN users u ON u.id = d.user_id
       WHERE a.patient_id = $1
       ORDER BY a.start_time DESC
       LIMIT 20`,
      [id]
    );

    // Timeline: treatment records
    const { rows: treatments } = await pool.query(
      `SELECT tr.id, tr.created_at, tr.tooth_number, tr.cost, tr.status,
              tr.clinical_notes, tr.prescription, tr.next_visit_note,
              t.name AS treatment_name,
              u.first_name || ' ' || u.last_name AS dentist_name
       FROM treatment_records tr
       JOIN treatments t ON t.id = tr.treatment_id
       JOIN dentists d ON d.id = tr.dentist_id
       JOIN users u ON u.id = d.user_id
       WHERE tr.patient_id = $1
       ORDER BY tr.created_at DESC`,
      [id]
    );

    // Invoices summary
    const { rows: invoices } = await pool.query(
      `SELECT i.id, i.invoice_number, i.net_amount, i.status, i.created_at,
              COALESCE(SUM(p.amount), 0) AS paid,
              i.net_amount - COALESCE(SUM(p.amount), 0) AS balance
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.patient_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [id]
    );

    res.json({
      patient:      pRows[0],
      appointments,
      treatments,
      invoices,
    });
  } catch (err) {
    console.error('[GET /patients/:id]', err);
    res.status(500).json({ error: 'Failed to fetch patient details.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/patients
// Create a new patient
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requirePermission('patients:create'), [
  body('first_name').trim().notEmpty().withMessage('First name is required.'),
  body('last_name').trim().notEmpty().withMessage('Last name is required.'),
  body('phone').trim().notEmpty().withMessage('Phone number is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter valid 10-digit Indian mobile number.'),
  body('gender').optional().isIn(['Male', 'Female', 'Other', 'Prefer not to say']),
  body('dob').optional().isISO8601().withMessage('Invalid date of birth.'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('whatsapp_opt_in').optional().isBoolean(),
  body('medical_history').optional().isObject(),
], validate, async (req, res) => {
  const {
    first_name, last_name, phone, email, gender, dob,
    address, city, whatsapp_opt_in = true, medical_history = {},
    patient_notes,
  } = req.body;

  const clinic_id = req.user.clinic_id;

  try {
    // Check duplicate phone within clinic
    const existing = await pool.query(
      'SELECT id FROM patients WHERE clinic_id = $1 AND phone = $2',
      [clinic_id, phone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `A patient with phone ${phone} already exists in this clinic.`,
        code:  'DUPLICATE_PHONE',
        existing_id: existing.rows[0].id,
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO patients
         (clinic_id, first_name, last_name, phone, email, gender, dob,
          address, city, whatsapp_opt_in, medical_history, patient_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        clinic_id, first_name, last_name, phone,
        email || null, gender || null, dob || null,
        address || null, city || null, whatsapp_opt_in,
        JSON.stringify(medical_history), patient_notes || null,
      ]
    );

    res.status(201).json({
      success: true,
      patient: rows[0],
      message: `${first_name} ${last_name} registered successfully.`,
    });
  } catch (err) {
    console.error('[POST /patients]', err);
    res.status(500).json({ error: 'Failed to create patient.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/patients/:id
// Update patient profile
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', requirePermission('patients:update'), [
  param('id').isUUID(),
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('phone').optional().matches(/^[6-9]\d{9}$/),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('gender').optional().isIn(['Male', 'Female', 'Other', 'Prefer not to say']),
  body('dob').optional().isISO8601(),
  body('medical_history').optional().isObject(),
], validate, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.user.clinic_id;

  // Only allow known fields to be updated
  const allowed = [
    'first_name','last_name','phone','email','gender','dob',
    'address','city','whatsapp_opt_in','medical_history','patient_notes',
  ];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update.' });
  }

  try {
    // Build dynamic SET clause
    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`);
    const values     = [id, clinic_id, ...Object.values(updates).map(v =>
      typeof v === 'object' ? JSON.stringify(v) : v
    )];

    const { rows } = await pool.query(
      `UPDATE patients
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND clinic_id = $2 AND is_active = true
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json({ success: true, patient: rows[0] });
  } catch (err) {
    console.error('[PATCH /patients/:id]', err);
    res.status(500).json({ error: 'Failed to update patient.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/patients/:id  (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requirePermission('patients:*'), [
  param('id').isUUID(),
], validate, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.user.clinic_id;

  try {
    const { rows } = await pool.query(
      `UPDATE patients SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND clinic_id = $2 AND is_active = true
       RETURNING id, first_name, last_name`,
      [id, clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json({ success: true, message: `${rows[0].first_name} ${rows[0].last_name} archived.` });
  } catch (err) {
    console.error('[DELETE /patients/:id]', err);
    res.status(500).json({ error: 'Failed to archive patient.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────
const { upload, generateSignedUrl, deleteFile } = require('../services/s3');

// POST /api/patients/:id/documents
router.post('/:id/documents', requirePermission('patients:update'), [
  param('id').isUUID(),
], validate, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.user.clinic_id;
  const { title, doc_type } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const file_key = req.file.key;
    const file_url = req.file.location; // S3 url
    const mime_type = req.file.mimetype;
    const file_size_bytes = req.file.size;

    const { rows } = await pool.query(
      `INSERT INTO patient_documents
         (clinic_id, patient_id, title, doc_type, file_url, file_key, file_size_bytes, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [clinic_id, id, title || req.file.originalname, doc_type || 'other', file_url, file_key, file_size_bytes, mime_type, req.user.id]
    );

    res.status(201).json({ success: true, document: rows[0] });
  } catch (err) {
    console.error('[POST /patients/:id/documents]', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// GET /api/patients/:id/documents
router.get('/:id/documents', requirePermission('patients:read'), [
  param('id').isUUID(),
], validate, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.user.clinic_id;

  try {
    const { rows } = await pool.query(
      `SELECT pd.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM patient_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.patient_id = $1 AND pd.clinic_id = $2
       ORDER BY pd.created_at DESC`,
      [id, clinic_id]
    );

    // Generate signed URLs if files are private
    for (let doc of rows) {
       doc.signed_url = await generateSignedUrl(doc.file_key).catch(() => doc.file_url);
    }

    res.json({ documents: rows });
  } catch (err) {
    console.error('[GET /patients/:id/documents]', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// DELETE /api/patients/:id/documents/:docId
router.delete('/:id/documents/:docId', requirePermission('patients:update'), [
  param('id').isUUID(),
  param('docId').isUUID(),
], validate, async (req, res) => {
  const { id, docId } = req.params;
  const clinic_id = req.user.clinic_id;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM patient_documents WHERE id = $1 AND patient_id = $2 AND clinic_id = $3`,
      [docId, id, clinic_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = rows[0];
    
    // Delete from S3
    await deleteFile(doc.file_key).catch(e => console.error('S3 Delete Error:', e));

    // Delete from DB
    await pool.query('DELETE FROM patient_documents WHERE id = $1', [docId]);

    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('[DELETE /patients/:id/documents/:docId]', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

module.exports = router;
