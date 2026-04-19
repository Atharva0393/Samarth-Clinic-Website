const express   = require('express');
const bcrypt    = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool      = require('../config/db');
const {
  signToken,
  authenticate,
  authorize,
  getPermissionsForRole,
} = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .isEmail().normalizeEmail()
      .withMessage('A valid email is required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
  ],
  async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error:  'Validation failed.',
        fields: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    try {
      // Fetch user + clinic in one join (avoid N+1)
      const { rows } = await pool.query(
        `SELECT
           u.id, u.email, u.password_hash, u.role,
           u.first_name, u.last_name, u.phone, u.is_active,
           u.clinic_id,
           c.name   AS clinic_name,
           c.upi_id AS clinic_upi_id
         FROM users u
         JOIN clinics c ON c.id = u.clinic_id
         WHERE u.email = $1
         LIMIT 1`,
        [email]
      );

      // Use the same generic error for both "not found" AND "wrong password"
      // This prevents email-enumeration attacks
      const INVALID_MSG = 'Invalid email or password.';

      if (rows.length === 0) {
        return res.status(401).json({ error: INVALID_MSG, code: 'INVALID_CREDENTIALS' });
      }

      const user = rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          error: 'Your account has been deactivated. Contact the clinic admin.',
          code:  'ACCOUNT_DEACTIVATED',
        });
      }

      // Constant-time password comparison (bcrypt prevents timing attacks)
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: INVALID_MSG, code: 'INVALID_CREDENTIALS' });
      }

      // Update last_login_at (non-blocking — fire and forget)
      pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});

      // Sign JWT with minimal, non-sensitive payload
      const token = signToken({
        id:           user.id,
        email:        user.email,
        role:         user.role,
        clinic_id:    user.clinic_id,
        clinic_name:  user.clinic_name,
        first_name:   user.first_name,
        last_name:    user.last_name,
      });

      // Return token + user profile (never return password_hash)
      res.json({
        token,
        user: {
          id:           user.id,
          email:        user.email,
          role:         user.role,
          first_name:   user.first_name,
          last_name:    user.last_name,
          phone:        user.phone,
          clinic_id:    user.clinic_id,
          clinic_name:  user.clinic_name,
          clinic_upi_id: user.clinic_upi_id,
          permissions:  getPermissionsForRole(user.role),
        },
      });
    } catch (err) {
      console.error('[POST /login]', err);
      res.status(500).json({ error: 'Server error during login. Please try again.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns full profile of authenticated user
// ─────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.email, u.role, u.first_name, u.last_name,
         u.phone, u.clinic_id, u.last_login_at,
         c.name    AS clinic_name,
         c.address AS clinic_address,
         c.city    AS clinic_city,
         c.contact_phone AS clinic_phone,
         c.upi_id  AS clinic_upi_id,
         c.working_hours
       FROM users u
       JOIN clinics c ON c.id = u.clinic_id
       WHERE u.id = $1 AND u.is_active = true`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];
    res.json({
      ...user,
      permissions: getPermissionsForRole(user.role),
    });
  } catch (err) {
    console.error('[GET /me]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Create new staff member — super_admin only
// ─────────────────────────────────────────────────────────────────
router.post(
  '/register',
  authenticate,
  authorize('super_admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Minimum 8 characters.'),
    body('role').isIn(['super_admin', 'dentist', 'receptionist']),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed.', fields: errors.array() });
    }

    const { email, password, role, first_name, last_name, phone } = req.body;

    try {
      // Check uniqueness
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'This email is already registered.', code: 'EMAIL_EXISTS' });
      }

      // Hash with cost factor 12 (secure for 2024+ hardware)
      const password_hash = await bcrypt.hash(password, 12);

      const { rows } = await pool.query(
        `INSERT INTO users (clinic_id, role, first_name, last_name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, role, first_name, last_name, created_at`,
        [req.user.clinic_id, role, first_name, last_name, email, phone || null, password_hash]
      );

      res.status(201).json({
        success: true,
        user:    rows[0],
        message: `${first_name} ${last_name} registered as ${role}.`,
      });
    } catch (err) {
      console.error('[POST /register]', err);
      res.status(500).json({ error: 'Server error during registration.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────────────────────
router.post(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be 8+ characters.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed.', fields: errors.array() });
    }

    const { current_password, new_password } = req.body;

    try {
      const { rows } = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

      const match = await bcrypt.compare(current_password, rows[0].password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' });
      }

      const new_hash = await bcrypt.hash(new_password, 12);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_hash, req.user.id]);

      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      console.error('[POST /change-password]', err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/permissions
// Returns the permission map for the current user's role
// ─────────────────────────────────────────────────────────────────
router.get('/permissions', authenticate, (req, res) => {
  res.json({
    role:        req.user.role,
    permissions: getPermissionsForRole(req.user.role),
  });
});

module.exports = router;
