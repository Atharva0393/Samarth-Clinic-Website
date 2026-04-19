const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Dental Clinic API is running.' });
});

// ============================================
// 1. Authentication APIs
// ============================================
app.post('/api/auth/login', (req, res) => {
    // Logic to authenticate user
    res.json({ token: 'sample-jwt-token', user: { role: 'super_admin' }});
});

app.post('/api/auth/register', (req, res) => {
    // Register staff (super admin only)
    res.status(201).json({ success: true, message: 'Invite sent' });
});

// ============================================
// 2. Patient APIs
// ============================================
app.get('/api/patients', (req, res) => {
    res.json([{ id: 1, name: 'Aryan Sharma' }]); // Placeholder
});

app.post('/api/patients', (req, res) => {
    res.status(201).json({ patient_id: 'uuid', message: 'Patient added successfully.' });
});

// ============================================
// 3. Appointment APIs
// ============================================
app.get('/api/appointments', (req, res) => {
    res.json([{ id: 1, status: 'waiting', patient_name: 'Aryan Sharma' }]);
});

app.post('/api/appointments', (req, res) => {
    res.status(201).json({ success: true, message: 'Appointment created' });
});

app.patch('/api/appointments/:id/status', (req, res) => {
    res.json({ success: true, message: 'Status updated' });
});

// ============================================
// 4. Treatment APIs
// ============================================
app.get('/api/treatments/catalog', (req, res) => {
    res.json([{ id: 1, name: 'Root Canal', base_cost: 1500.00 }]);
});

app.post('/api/treatments/record', (req, res) => {
    res.status(201).json({ record_id: 'uuid' });
});

// ============================================
// 5. Billing & Payment APIs
// ============================================
app.post('/api/billing/invoices', (req, res) => {
    res.status(201).json({ invoice_id: 'uuid', status: 'unpaid' });
});

app.post('/api/billing/payments', (req, res) => {
    res.json({ payment_id: 'uuid', remaining_balance: 1000.00, invoice_status: 'partial' });
});

// ============================================
// 6. Notification APIs
// ============================================
app.post('/api/notifications/whatsapp/remind', (req, res) => {
    res.json({ success: true, provider_status: 'queued' });
});

app.post('/api/notifications/whatsapp/receipt', (req, res) => {
    res.json({ success: true, provider_status: 'queued' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Dental Clinic Backend API listening at http://localhost:${PORT}`);
});
