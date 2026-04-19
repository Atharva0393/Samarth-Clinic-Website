const cron = require('node-cron');
const { sendMessage } = require('./whatsapp');

/**
 * Initialize all automated cron jobs
 * @param {import('pg').Pool} pool Database connection pool
 */
function initAutomation(pool) {
  console.log('[Automation] Initializing background schedulers...');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. APPOINTMENT REMINDERS
  // Runs every day at 09:00 AM.
  // Sends message for appointments scheduled for tomorrow.
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Running 24hr Appointment Reminders job...');
    try {
      const { rows } = await pool.query(
        `SELECT a.id, a.start_time, p.first_name || ' ' || p.last_name AS patient_name, p.phone, u.last_name as dentist_name
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         JOIN dentists d ON d.id = a.dentist_id
         JOIN users u ON u.id = d.user_id
         WHERE a.status = 'scheduled'
           AND a.start_time >= CURRENT_DATE + INTERVAL '1 day'
           AND a.start_time < CURRENT_DATE + INTERVAL '2 days'`
      );

      for (const apt of rows) {
        const time = new Date(apt.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        await sendMessage(apt.phone, 'APPOINTMENT_REMINDER', { 
          patient_name: apt.patient_name, 
          time: time, 
          dentist: `Dr. ${apt.dentist_name}` 
        });
      }
    } catch (err) {
      console.error('[Cron Error: Reminders]', err);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FOLLOW-UP MESSAGES
  // Runs every day at 06:00 PM.
  // Scans for treatments completed today and sends a wellness check check-in.
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 18 * * *', async () => {
    console.log('[Cron] Running Follow-up Messages job...');
    try {
      const { rows } = await pool.query(
        `SELECT p.first_name || ' ' || p.last_name AS patient_name, p.phone, tr.treatment_id
         FROM treatment_records tr
         JOIN patients p ON p.id = tr.patient_id
         WHERE tr.status = 'completed'
           AND DATE(tr.created_at) = CURRENT_DATE`
      );

      // Deduplicate by phone so a patient only gets one message even if multiple treatments were recorded
      const notifiedPhones = new Set();

      for (const rec of rows) {
        if (!notifiedPhones.has(rec.phone)) {
           await sendMessage(rec.phone, 'FOLLOW_UP_TREATMENT', { patient_name: rec.patient_name });
           notifiedPhones.add(rec.phone);
        }
      }
    } catch (err) {
      console.error('[Cron Error: Follow-ups]', err);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MISSED APPOINTMENT RE-ENGAGEMENT
  // Runs every day at 08:00 PM.
  // Scans for appointments today marked as 'no_show'.
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Running Missed Appointments job...');
    try {
      const { rows } = await pool.query(
        `SELECT p.first_name || ' ' || p.last_name AS patient_name, p.phone
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.status = 'no_show'
           AND DATE(a.start_time) = CURRENT_DATE`
      );

      for (const apt of rows) {
         await sendMessage(apt.phone, 'MISSED_APPOINTMENT', { patient_name: apt.patient_name });
      }
    } catch (err) {
      console.error('[Cron Error: Missed Appts]', err);
    }
  });
}

module.exports = initAutomation;
