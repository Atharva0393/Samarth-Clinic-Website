const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const pool    = require('../config/db');
const { authenticate, sameClinic, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, sameClinic);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ error: 'Validation failed.', fields: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  next();
};

const VALID_STATUSES = ['scheduled', 'confirmed', 'in_chair', 'completed', 'cancelled', 'no_show'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/appointments
// Supports: ?date=2025-01-15  ?from=&to=  ?status=  ?dentist_id=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requirePermission('appointments:read'), async (req, res) => {
  const { date, from, to, status, dentist_id } = req.query;
  const clinic_id = req.user.clinic_id;

  try {
    let dateFilter = '';
    const params   = [clinic_id];

    if (date) {
      // Single day
      params.push(date);
      dateFilter = `AND a.start_time::date = $${params.length}`;
    } else if (from && to) {
      params.push(from, to);
      dateFilter = `AND a.start_time >= $${params.length - 1} AND a.start_time < $${params.length}`;
    } else {
      // Default: today
      dateFilter = `AND a.start_time::date = CURRENT_DATE`;
    }

    const statusFilter   = status    ? `AND a.status = '${status}'`       : '';
    const dentistFilter  = dentist_id ? `AND a.dentist_id = '${dentist_id}'` : '';

    const { rows } = await pool.query(
      `SELECT
         a.id, a.start_time, a.end_time, a.duration_mins,
         a.status, a.notes, a.token_number, a.type,
         p.id AS patient_id,
         p.first_name || ' ' || p.last_name AS patient_name,
         p.phone AS patient_phone,
         p.medical_history AS patient_medical_history,
         d.id AS dentist_id,
         u.first_name || ' ' || u.last_name AS dentist_name,
         t.id AS treatment_id,
         t.name AS treatment_name,
         t.color AS treatment_color
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN dentists d ON d.id = a.dentist_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN treatments t ON t.id = a.treatment_id
       WHERE a.clinic_id = $1
         ${dateFilter} ${statusFilter} ${dentistFilter}
       ORDER BY a.start_time ASC`,
      params
    );

    res.json({ appointments: rows, count: rows.length });
  } catch (err) {
    console.error('[GET /appointments]', err);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/appointments  — Create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requirePermission('appointments:create'), [
  body('patient_id').isUUID().withMessage('Valid patient ID required.'),
  body('dentist_id').isUUID().withMessage('Valid dentist ID required.'),
  body('start_time').isISO8601().withMessage('Valid start_time (ISO 8601) required.'),
  body('duration_mins').optional().isInt({ min: 10, max: 240 }),
  body('treatment_id').optional().isUUID(),
  body('type').optional().isIn(['consultation', 'treatment', 'followup', 'emergency', 'walkin']),
  body('notes').optional().trim(),
], validate, async (req, res) => {
  const {
    patient_id, dentist_id, start_time, duration_mins = 30,
    treatment_id, type = 'consultation', notes,
  } = req.body;
  const clinic_id = req.user.clinic_id;

  try {
    const start = new Date(start_time);
    const end   = new Date(start.getTime() + duration_mins * 60000);

    // ── Double-booking check (the core business rule) ─────────────────────
    const { rows: conflicts } = await pool.query(
      `SELECT id, start_time, end_time
       FROM appointments
       WHERE dentist_id = $1
         AND status NOT IN ('cancelled', 'no_show')
         AND tsrange(start_time, end_time) && tsrange($2::timestamptz, $3::timestamptz)`,
      [dentist_id, start.toISOString(), end.toISOString()]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error:    'This time slot is already booked for the selected dentist.',
        code:     'DOUBLE_BOOKING',
        conflict: conflicts[0],
      });
    }

    // ── Assign token number (sequential for the day) ───────────────────────
    const { rows: tokenRow } = await pool.query(
      `SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
       FROM appointments
       WHERE clinic_id = $1 AND start_time::date = $2::date`,
      [clinic_id, start.toISOString()]
    );
    const token_number = tokenRow[0].next_token;

    const { rows } = await pool.query(
      `INSERT INTO appointments
         (clinic_id, patient_id, dentist_id, treatment_id, start_time, end_time,
          duration_mins, status, type, notes, token_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled',$8,$9,$10)
       RETURNING *`,
      [
        clinic_id, patient_id, dentist_id,
        treatment_id || null,
        start.toISOString(), end.toISOString(), duration_mins,
        type, notes || null, token_number,
      ]
    );

    res.status(201).json({ success: true, appointment: rows[0] });
  } catch (err) {
    console.error('[POST /appointments]', err);
    res.status(500).json({ error: 'Failed to create appointment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/status  — Update status
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', requirePermission('appointments:update'), [
  param('id').isUUID(),
  body('status').isIn(VALID_STATUSES),
], validate, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const clinic_id = req.user.clinic_id;

  try {
    const { rows } = await pool.query(
      `UPDATE appointments
       SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3 AND clinic_id = $4
       RETURNING *`,
      [status, notes || null, id, clinic_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });
    res.json({ success: true, appointment: rows[0] });
  } catch (err) {
    console.error('[PATCH /:id/status]', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/reschedule
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/reschedule', requirePermission('appointments:update'), [
  param('id').isUUID(),
  body('start_time').isISO8601(),
  body('duration_mins').optional().isInt({ min: 10, max: 240 }),
], validate, async (req, res) => {
  const { id } = req.params;
  const { start_time, duration_mins } = req.body;
  const clinic_id = req.user.clinic_id;

  try {
    // Get existing appointment
    const { rows: existing } = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2',
      [id, clinic_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Appointment not found.' });
    const appt = existing[0];

    const start = new Date(start_time);
    const end   = new Date(start.getTime() + (duration_mins || appt.duration_mins) * 60000);

    // Double-booking check (excluding this appointment itself)
    const { rows: conflicts } = await pool.query(
      `SELECT id FROM appointments
       WHERE dentist_id = $1 AND id != $2
         AND status NOT IN ('cancelled','no_show')
         AND tsrange(start_time, end_time) && tsrange($3::timestamptz, $4::timestamptz)`,
      [appt.dentist_id, id, start.toISOString(), end.toISOString()]
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'New time slot conflicts with an existing appointment.', code: 'DOUBLE_BOOKING' });
    }

    const { rows } = await pool.query(
      `UPDATE appointments
       SET start_time = $1, end_time = $2,
           duration_mins = COALESCE($3, duration_mins),
           status = 'scheduled', updated_at = NOW()
       WHERE id = $4 AND clinic_id = $5 RETURNING *`,
      [start.toISOString(), end.toISOString(), duration_mins || null, id, clinic_id]
    );
    res.json({ success: true, appointment: rows[0] });
  } catch (err) {
    console.error('[PATCH /:id/reschedule]', err);
    res.status(500).json({ error: 'Failed to reschedule.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/appointments/:id  — Cancel
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requirePermission('appointments:update'), [
  param('id').isUUID(),
], validate, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.user.clinic_id;
  const reason = req.body.reason || 'Cancelled';

  try {
    const { rows } = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', notes = $1, updated_at = NOW()
       WHERE id = $2 AND clinic_id = $3 AND status NOT IN ('completed','cancelled')
       RETURNING id`,
      [reason, id, clinic_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found or already completed.' });
    res.json({ success: true, message: 'Appointment cancelled.' });
  } catch (err) {
    console.error('[DELETE /:id]', err);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

module.exports = router;
