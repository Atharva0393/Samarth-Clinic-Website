require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');

const authRoutes = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// SECURITY HEADERS
// ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: Origin ${origin} not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─────────────────────────────────────────────
// BODY PARSING
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// REQUEST LOGGING (dev only)
// ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────
// General API limiter
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

// Strict limiter for auth endpoints (brute-force protection)
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,  // 15 login attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true, // Don't count successful logins
}));

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    service:     'Samarth Dental Clinic API',
    version:     '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/patients',     require('./routes/patients'));

app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/treatments',   require('./routes/treatments'));
app.use('/api/billing',      require('./routes/billing'));
app.use('/api/inventory',    require('./routes/placeholder')('inventory'));

// ─────────────────────────────────────────────
// 404 & ERROR HANDLERS
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[${status}] ${err.message}`);
  res.status(status).json({
    error:  err.message || 'Internal server error.',
    detail: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ─────────────────────────────────────────────
// START & AUTOMATION
// ─────────────────────────────────────────────
const pool = require('./config/db');
require('./services/automation')(pool);

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  🦷  Samarth Dental Clinic — API Server      ║
║  🚀  http://localhost:${PORT}                   ║
║  🔐  Auth: JWT + bcrypt(12)                  ║
║  🛡️   Security: Helmet + Rate Limiting        ║
╚══════════════════════════════════════════════╝`);
});

module.exports = app;
