const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
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

// Route to get menus from a specified category
router.get('/menus', verifyToken, (req, res, next) => {
  const { category } = req.query;
  if (!category) return res.status(400).send('Category is required.');

  const sql = `SELECT * FROM Menu WHERE category_id = (SELECT id FROM Kategori WHERE name = ?)`;
  db.query(sql, [category], (err, results) => {
    if (err) return next(err);
    res.json({ category, menus: results });
  });
});

module.exports = router;
