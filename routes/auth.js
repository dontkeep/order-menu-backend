const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone_number, address_detail, province, city, regency, district, role_id } = req.body;

    // Check if user already exists
    db.query('SELECT * FROM User WHERE email = ?', [email], async (err, results) => {
      if (err) return next(err);
      if (results.length > 0) return res.status(400).send('User already exists');

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const sql = 'INSERT INTO User (first_name, last_name, email, password, phone_number, address_detail, province, city, regency, district, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(sql, [first_name, last_name, email, hashedPassword, phone_number, address_detail, province, city, regency, district, role_id], (err, result) => {
        if (err) return next(err);
        res.status(201).send('User registered');
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists
  db.query('SELECT * FROM User WHERE email = ?', [email], async (err, results) => {
    if (err) return next(err);
    if (results.length === 0) return res.status(400).send('Invalid email or password');

    const user = results[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid email or password');

    // Create session
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    const sql = 'INSERT INTO Session (session_id, user_id, expires_at) VALUES (?, ?, ?)';
    db.query(sql, [sessionId, user.id, expiresAt], (err, result) => {
      if (err) return next(err);
      const token = jwt.sign({ sessionId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login successful', token });
    });
  });
});

router.post('/logout', (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).send('Invalid token');

      const sql = 'DELETE FROM Session WHERE session_id = ?';
      db.query(sql, [decoded.sessionId], (err, result) => {
        if (err) return next(err);
        res.status(200).send('Logout successful');
      });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
