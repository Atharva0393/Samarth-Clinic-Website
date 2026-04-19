const twilio = require('twilio');

// Initialize Twilio client (use env variables in production)
// Note: If no env vars are set, we will use mock credentials to ensure it doesn't crash on boot.
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || 'AC_MOCK_SID_xxxxxxxxxxxxxxxxxxxxxxxx';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'MOCK_TOKEN_xxxxxxxxxxxxxxxxx';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number
const TWILIO_SMS_NUMBER = process.env.TWILIO_SMS_NUMBER || '+1234567890';

// Using a lazy init or mock if SID is a mock to prevent actual API calls failing aggressively
const isMock = TWILIO_SID.startsWith('AC_MOCK_SID');
const client = isMock ? null : twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

// ─────────────────────────────────────────────────────────────────────────────
// Message Templates
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLATES = {
  APPOINTMENT_REMINDER: (data) => 
    `Hello ${data.patient_name}, this is a gentle reminder from Samarth Dental Clinic about your appointment tomorrow at ${data.time} with ${data.dentist}. Please reply with YES to confirm.`,
  
  FOLLOW_UP_TREATMENT: (data) => 
    `Hi ${data.patient_name}, hope you are feeling well after your treatment at Samarth Clinic. If you have any discomfort or questions, please don't hesitate to reach out. Take care!`,
  
  MISSED_APPOINTMENT: (data) => 
    `Dear ${data.patient_name}, we missed you today at Samarth Clinic. Your oral health is important to us. Please contact us or reply to this message to reschedule your appointment.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Send Message Controller (WhatsApp Primary, SMS Fallback)
// ─────────────────────────────────────────────────────────────────────────────
async function sendMessage(to, templateKey, templateData) {
  const content = TEMPLATES[templateKey](templateData);
  const formattedTo = to.startsWith('+') ? to : `+91${to}`; // Assume India format if no code

  try {
    if (isMock) {
      console.log(`\n[MOCK WHATSAPP] 👉 To: ${formattedTo}\n[MOCK WHATSAPP] ✉️ Content: ${content}\n`);
      return { success: true, method: 'mock', messageId: `msg_${Date.now()}` };
    }

    // Try WhatsApp first
    const message = await client.messages.create({
      body: content,
      from: TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${formattedTo}`
    });
    console.log(`[WHATSAPP] Sent to ${formattedTo}. SID: ${message.sid}`);
    return { success: true, method: 'whatsapp', messageId: message.sid };

  } catch (err) {
    console.warn(`[WHATSAPP] Failed for ${formattedTo}, falling back to SMS. Error: ${err.message}`);
    
    // SMS Fallback
    try {
      if (isMock) return { success: true, method: 'mock_sms' };
      
      const sms = await client.messages.create({
        body: content,
        from: TWILIO_SMS_NUMBER,
        to: formattedTo
      });
      console.log(`[SMS] Sent to ${formattedTo}. SID: ${sms.sid}`);
      return { success: true, method: 'sms', messageId: sms.sid };

    } catch (fallbackErr) {
      console.error(`[SMS] Fallback failed for ${formattedTo}: ${fallbackErr.message}`);
      return { success: false, error: fallbackErr.message };
    }
  }
}

module.exports = {
  sendMessage,
  TEMPLATES
};
