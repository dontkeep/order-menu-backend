const express = require('express');
const { verifyToken } = require('../controllers/authController');
const checkRole = require('../middleware/roleMiddleware');
const router = express.Router();

// Admin-specific route
router.get('/admin-data', verifyToken, checkRole(0), (req, res, next) => {
  const { user } = req;
  if (!user) return res.status(401).send('Unauthorized');
  
  // Admin-specific logic here
  res.send('This is admin data');
});

module.exports = router;
