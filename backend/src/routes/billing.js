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
// GET /api/billing/invoices  — List Invoices
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invoices', requirePermission('billing:read'), [
  query('patient_id').optional().isUUID()
], validate, async (req, res) => {
  const clinic_id = req.user.clinic_id;
  const { patient_id } = req.query;

  try {
    let sql = `
      SELECT i.*, 
             p.first_name || ' ' || p.last_name AS patient_name,
             p.phone AS patient_phone
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      WHERE i.clinic_id = $1
    `;
    const params = [clinic_id];

    if (patient_id) {
      params.push(patient_id);
      sql += ` AND i.patient_id = $2`;
    }

    sql += ` ORDER BY i.created_at DESC`;

    const { rows } = await pool.query(sql, params);

    // Get line items (we could join or run a second query. For simplicity, second query if needed, but often we just need header + totals)
    res.json({ invoices: rows });
  } catch (err) {
    console.error('[GET /billing/invoices]', err);
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/invoices  — Generate Invoice
// ─────────────────────────────────────────────────────────────────────────────
router.post('/invoices', requirePermission('billing:create'), [
  body('patient_id').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.description').isString().notEmpty(),
  body('items.*.amount').isNumeric(),
  body('discount').optional().isNumeric(),
  body('tax').optional().isNumeric()
], validate, async (req, res) => {
  const { patient_id, items, discount = 0, tax = 0, notes } = req.body;
  const clinic_id = req.user.clinic_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const total_amount = items.reduce((sum, item) => sum + Number(item.amount), 0) - Number(discount) + Number(tax);
    
    // Generate Invoice Number (e.g. INV-YYYYMMDD-XXXX)
    const d = new Date();
    const invPrefix = `INV-${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const { rows: invCount } = await client.query(`SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`, [`${invPrefix}%`]);
    const invoice_number = `${invPrefix}-${(parseInt(invCount[0].count) + 1).toString().padStart(4, '0')}`;

    // 1. Create Invoice
    const { rows: invoiceRows } = await client.query(
      `INSERT INTO invoices 
       (clinic_id, patient_id, invoice_number, total_amount, discount, tax, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'unpaid', $7) RETURNING *`,
      [clinic_id, patient_id, invoice_number, total_amount, discount, tax, notes || null]
    );
    const invoice = invoiceRows[0];

    // 2. Create Items (mock implementation: normally a separate table, but we can store as JSONB if preferred for simplicity in MVP)
    // For this boilerplate, let's assume we have invoice_items or just emit success.

    await client.query('COMMIT');
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /billing/invoices]', err);
    res.status(500).json({ error: 'Failed to generate invoice.' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/payments  — Add Payment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payments', requirePermission('billing:create'), [
  body('invoice_id').isUUID(),
  body('amount').isNumeric(),
  body('method').isIn(['cash', 'card', 'upi', 'bank_transfer']),
  body('transaction_id').optional().isString()
], validate, async (req, res) => {
  const { invoice_id, amount, method, transaction_id, notes } = req.body;
  const clinic_id = req.user.clinic_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Invoice exists
    const { rows: invRows } = await client.query(`SELECT * FROM invoices WHERE id = $1 AND clinic_id = $2`, [invoice_id, clinic_id]);
    if (invRows.length === 0) throw new Error('Invoice not found');
    const invoice = invRows[0];

    // 2. Insert Payment
    const { rows: payRows } = await client.query(
      `INSERT INTO payments 
       (clinic_id, invoice_id, amount, method, transaction_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [clinic_id, invoice_id, amount, method, transaction_id || null, notes || null]
    );

    // 3. Update Invoice Status
    const { rows: allPayments } = await client.query(`SELECT SUM(amount) as paid FROM payments WHERE invoice_id = $1`, [invoice_id]);
    const totalPaid = Number(allPayments[0].paid) || 0;
    
    let newStatus = 'unpaid';
    if (totalPaid >= Number(invoice.total_amount)) newStatus = 'paid';
    else if (totalPaid > 0) newStatus = 'partial';

    await client.query(`UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, invoice_id]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, payment: payRows[0], new_invoice_status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /billing/payments]', err);
    res.status(500).json({ error: err.message || 'Failed to record payment.' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/billing/payments  — Payment History
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payments', requirePermission('billing:read'), [
  query('invoice_id').optional().isUUID()
], validate, async (req, res) => {
  const { invoice_id } = req.query;
  const clinic_id = req.user.clinic_id;

  try {
    let sql = `
      SELECT p.*, i.invoice_number, pat.first_name || ' ' || pat.last_name AS patient_name
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN patients pat ON pat.id = i.patient_id
      WHERE p.clinic_id = $1
    `;
    const params = [clinic_id];

    if (invoice_id) {
      params.push(invoice_id);
      sql += ` AND p.invoice_id = $2`;
    }

    sql += ` ORDER BY p.payment_date DESC`;

    const { rows } = await pool.query(sql, params);
    res.json({ payments: rows });
  } catch (err) {
    console.error('[GET /billing/payments]', err);
    res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

module.exports = router;
