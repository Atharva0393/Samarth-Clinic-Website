const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, sameClinic, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, sameClinic);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ error: 'Validation failed.', fields: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/treatments  — List Treatment Master/Types
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requirePermission('treatments:read'), async (req, res) => {
  const clinic_id = req.user.clinic_id;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM treatments WHERE clinic_id = $1 AND is_active = true ORDER BY name`,
      [clinic_id]
    );
    res.json({ treatments: rows });
  } catch (err) {
    console.error('[GET /treatments]', err);
    res.status(500).json({ error: 'Failed to fetch treatments.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/treatments  — Create Treatment Type
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requirePermission('treatments:create'), [
  body('name').trim().notEmpty(),
  body('duration_mins').optional().isInt(),
  body('cost').optional().isNumeric(),
  body('category').optional().isString(),
  body('color').optional().isString()
], validate, async (req, res) => {
  const { name, duration_mins = 30, cost = 0, category = 'General', color = '#3b82f6' } = req.body;
  const clinic_id = req.user.clinic_id;

  try {
    const { rows } = await pool.query(
      `INSERT INTO treatments (clinic_id, name, duration_mins, cost, category, color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [clinic_id, name, duration_mins, cost, category, color]
    );
    res.status(201).json({ success: true, treatment: rows[0] });
  } catch (err) {
    console.error('[POST /treatments]', err);
    res.status(500).json({ error: 'Failed to create treatment type.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/treatments/records  — Get Treatment Records
// ─────────────────────────────────────────────────────────────────────────────
router.get('/records', requirePermission('treatments:read'), [
  query('patient_id').optional().isUUID()
], validate, async (req, res) => {
  const clinic_id = req.user.clinic_id;
  const { patient_id } = req.query;

  try {
    let sql = `
      SELECT tr.*, 
             t.name AS treatment_name, t.color AS treatment_color,
             p.first_name || ' ' || p.last_name AS patient_name,
             u.first_name || ' ' || u.last_name AS dentist_name
      FROM treatment_records tr
      JOIN treatments t ON t.id = tr.treatment_id
      JOIN patients p ON p.id = tr.patient_id
      JOIN dentists d ON d.id = tr.dentist_id
      JOIN users u ON u.id = d.user_id
      WHERE tr.clinic_id = $1
    `;
    const params = [clinic_id];

    if (patient_id) {
      params.push(patient_id);
      sql += ` AND tr.patient_id = $2`;
    }

    sql += ` ORDER BY tr.created_at DESC`;

    const { rows } = await pool.query(sql, params);
    res.json({ records: rows });
  } catch (err) {
    console.error('[GET /treatments/records]', err);
    res.status(500).json({ error: 'Failed to fetch treatment records.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/treatments/records  — Add Treatment Record
// ─────────────────────────────────────────────────────────────────────────────
router.post('/records', requirePermission('treatments:create'), [
  body('patient_id').isUUID(),
  body('treatment_id').isUUID(),
  body('dentist_id').isUUID(),
  body('appointment_id').optional().isUUID(),
  body('tooth_number').optional().isString(),
  body('clinical_notes').optional().isString(),
  body('prescription').optional().isString(),
  body('cost').optional().isNumeric(),
  body('status').optional().isIn(['planned', 'in_progress', 'completed', 'cancelled'])
], validate, async (req, res) => {
  const {
    patient_id, treatment_id, dentist_id, appointment_id,
    tooth_number, clinical_notes, prescription, cost, status = 'completed'
  } = req.body;
  const clinic_id = req.user.clinic_id;

  try {
    const { rows } = await pool.query(
      `INSERT INTO treatment_records 
       (clinic_id, patient_id, appointment_id, dentist_id, treatment_id, tooth_number, cost, status, clinical_notes, prescription)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [clinic_id, patient_id, appointment_id || null, dentist_id, treatment_id, tooth_number || null, cost || 0, status, clinical_notes || null, prescription || null]
    );

    // If an appointment is provided and status is completed, update appointment status (optional business logic)
    if (appointment_id && status === 'completed') {
       await pool.query(`UPDATE appointments SET status = 'completed' WHERE id = $1 AND clinic_id = $2`, [appointment_id, clinic_id]);
    }

    res.status(201).json({ success: true, record: rows[0] });
  } catch (err) {
    console.error('[POST /treatments/records]', err);
    res.status(500).json({ error: 'Failed to add treatment record.' });
  }
});

module.exports = router;
