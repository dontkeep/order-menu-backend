const express = require('express');
const bcrypt = require('bcrypt');
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

module.exports = router;
