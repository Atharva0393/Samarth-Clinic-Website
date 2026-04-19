// Placeholder route factory for unimplemented API modules
// Returns a router that responds with a "coming soon" message
const { Router } = require('express');
const { authenticate } = require('../middleware/auth');

module.exports = function placeholder(moduleName) {
  const router = Router();
  router.use(authenticate); // still protected — must be logged in
  router.all('*', (req, res) => {
    res.status(200).json({
      message: `${moduleName} API — implementation coming in Step ${getStep(moduleName)}.`,
      authenticated_as: req.user?.email,
      role: req.user?.role,
    });
  });
  return router;
};

function getStep(m) {
  const map = { patients: 3, appointments: 4, treatments: 4, billing: 5, inventory: 6 };
  return map[m] || '?';
}
