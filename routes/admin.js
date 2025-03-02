const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const checkRole = require('../middleware/roleMiddleware');
const router = express.Router();

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).send('Access denied. No token provided.');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Invalid token.');
    req.user = decoded;
    next();
  });
};

// Admin-specific route
router.get('/admin-data', verifyToken, checkRole(0), (req, res, next) => {
  // Admin-specific logic here
  res.send('This is admin data');
});

module.exports = router;
