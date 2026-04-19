const jwt  = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET     || 'dev_secret_change_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ─────────────────────────────────────────────────────────────────
// Role hierarchy  (higher index = more access)
// ─────────────────────────────────────────────────────────────────
const ROLE_HIERARCHY = {
  receptionist: 1,
  dentist:      2,
  super_admin:  3,
};

// ─────────────────────────────────────────────────────────────────
// RBAC permission map
// Defines exactly what each role can do
// ─────────────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  super_admin: [
    'patients:*',
    'appointments:*',
    'treatments:*',
    'billing:*',
    'inventory:*',
    'users:*',
    'reports:*',
    'settings:*',
  ],
  dentist: [
    'patients:read',
    'patients:update',          // update clinical notes only
    'appointments:read',
    'appointments:update',      // mark in-chair, completed
    'treatments:read',
    'treatments:create',
    'treatments:update',
    'billing:read',             // view only
  ],
  receptionist: [
    'patients:read',
    'patients:create',
    'patients:update',          // basic profile, not medical
    'appointments:read',
    'appointments:create',
    'appointments:update',      // check-in, cancel
    'billing:read',
    'billing:create',           // generate invoices
    'billing:payments:create',  // log payments
    'treatments:read',          // view catalog only
  ],
};

// ─────────────────────────────────────────────────────────────────
// Sign a JWT
// ─────────────────────────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn:  JWT_EXPIRES_IN,
    algorithm:  'HS256',
    issuer:     'samarth-dental',
    audience:   'samarth-clinic-app',
  });
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE: Verify JWT on every protected route
// ─────────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No token provided.',
      code:  'MISSING_TOKEN',
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer:     'samarth-dental',
      audience:   'samarth-clinic-app',
    });

    req.user = decoded;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'   ? 'Token has expired. Please log in again.'
      : err.name === 'JsonWebTokenError' ? 'Invalid token.'
      : 'Token verification failed.';

    return res.status(401).json({
      error: message,
      code:  err.name.toUpperCase(),
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE FACTORY: Role-based access control
// Usage: authorize('super_admin')
//        authorize('super_admin', 'dentist')   ← any of these roles
// ─────────────────────────────────────────────────────────────────
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.', code: 'NOT_AUTHENTICATED' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error:    `Access denied. Required: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
        code:     'FORBIDDEN',
        your_role: req.user.role,
        required:  allowedRoles,
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE FACTORY: Permission-level check
// More granular than role — checks the ROLE_PERMISSIONS map
// Usage: requirePermission('billing:*')
//        requirePermission('patients:create')
// ─────────────────────────────────────────────────────────────────
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.', code: 'NOT_AUTHENTICATED' });
    }

    const rolePerms = ROLE_PERMISSIONS[req.user.role] || [];
    const [resource, action] = permission.split(':');

    const hasPermission = rolePerms.some(p => {
      if (p === `${resource}:*`) return true;  // wildcard match
      if (p === permission)      return true;  // exact match
      return false;
    });

    if (!hasPermission) {
      return res.status(403).json({
        error:       `Forbidden. You lack permission: ${permission}`,
        code:        'PERMISSION_DENIED',
        permission_required: permission,
        your_role:   req.user.role,
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE: Ensure request targets user's own clinic only
// Prevents cross-tenant data access
// ─────────────────────────────────────────────────────────────────
function sameClinic(req, res, next) {
  const requestedClinic = req.params.clinic_id || req.body?.clinic_id || req.query?.clinic_id;

  if (requestedClinic && requestedClinic !== req.user.clinic_id) {
    return res.status(403).json({
      error: 'Cross-clinic access denied.',
      code:  'CROSS_TENANT_DENIED',
    });
  }

  // Automatically inject clinic_id from token into body for POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.body.clinic_id = req.user.clinic_id;
  }

  next();
}

// ─────────────────────────────────────────────────────────────────
// Helper: Get permissions for a role (used by /me endpoint)
// ─────────────────────────────────────────────────────────────────
function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = {
  signToken,
  authenticate,
  authorize,
  requirePermission,
  sameClinic,
  getPermissionsForRole,
  ROLE_PERMISSIONS,
};
