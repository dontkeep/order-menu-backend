const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

// Function to generate signature
const generateSignature = (data, key) => {
  return crypto.createHmac('sha1', key).update(data).digest('hex');
};

// Route to initiate a ShopeePay QRIS payment
router.post('/pay/shopeepay', verifyToken, async (req, res, next) => {
  const { amount, description, items } = req.body;

  const payload = {
    request: "Purchased Info Detail Transmission",
    merchant_id: process.env.FASPAY_MERCHANT_ID,
    merchant: "FASPAY STORE",
    bill_no: Date.now().toString(),
    bill_reff: "Payment item",
    bill_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    bill_expired: new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '), // 1 hour from now
    bill_desc: description,
    bill_currency: "IDR",
    bill_gross: 0,
    bill_tax: 0,
    bill_miscfee: 0,
    bill_total: amount,
    cust_no: req.user.id,
    cust_name: req.user.first_name,
    cust_lastname: req.user.last_name || "",
    payment_channel: 711,
    pay_type: 1,
    bank_userid: "",
    msisdn: req.user.phone_number,
    email: req.user.email,
    terminal: 10,
    billing_name: req.user.first_name,
    billing_lastname: req.user.last_name || "",
    billing_address: req.user.address_detail,
    billing_address_city: req.user.city,
    billing_address_region: req.user.regency,
    billing_address_state: req.user.province,
    billing_address_poscode: req.user.postcode || "",
    billing_msisdn: req.user.phone_number,
    billing_address_country_code: "ID",
    receiver_name_for_shipping: req.user.first_name,
    shipping_lastname: req.user.last_name || "",
    shipping_address: req.user.address_detail,
    shipping_address_city: req.user.city,
    shipping_address_region: req.user.regency,
    shipping_address_state: req.user.province,
    shipping_address_poscode: req.user.postcode || "",
    shipping_msisdn: req.user.phone_number,
    shipping_address_country_code: "ID",
    item: items,
    reserve1: 0,
    reserve2: "",
  };

  // Generate signature
  const signatureData = `${payload.merchant_id}${payload.bill_no}${payload.bill_total}${process.env.FASPAY_MERCHANT_KEY}`;
  payload.signature = generateSignature(signatureData, process.env.FASPAY_MERCHANT_KEY);

  try {
    const response = await axios.post('https://api.faspay.co.id/payment', payload);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

// Route to initiate a Paydia QRIS payment
router.post('/pay/paydia', verifyToken, async (req, res, next) => {
  const { amount, description, items } = req.body;

  const payload = {
    request: "Transmisi Info Detil Pembelian",
    merchant_id: process.env.FASPAY_MERCHANT_ID,
    merchant: "FASPAY STORE",
    bill_no: Date.now().toString(),
    bill_reff: "StagingTest",
    bill_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    bill_expired: new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '), // 1 hour from now
    bill_desc: description,
    bill_currency: "IDR",
    bill_gross: "",
    bill_tax: "0",
    bill_miscfee: "0",
    bill_total: amount,
    cust_no: req.user.id,
    cust_name: req.user.first_name,
    cust_lastname: req.user.last_name || "",
    payment_channel: "836",
    pay_type: "1",
    bank_userid: "",
    msisdn: req.user.phone_number,
    email: req.user.email,
    terminal: "10",
    billing_name: req.user.first_name,
    billing_lastname: req.user.last_name || "",
    billing_address: req.user.address_detail,
    billing_address_city: req.user.city,
    billing_address_region: req.user.regency,
    billing_address_state: req.user.province,
    billing_address_poscode: req.user.postcode || "",
    billing_msisdn: req.user.phone_number,
    billing_address_country_code: "ID",
    receiver_name_for_shipping: req.user.first_name,
    shipping_lastname: req.user.last_name || "",
    shipping_address: req.user.address_detail,
    shipping_address_city: req.user.city,
    shipping_address_region: req.user.regency,
    shipping_address_state: req.user.province,
    shipping_address_poscode: req.user.postcode || "",
    shipping_msisdn: req.user.phone_number,
    shipping_address_country_code: "ID",
    item: items,
    reserve1: "0",
    reserve2: "",
  };

  // Generate signature
  const signatureData = `${payload.merchant_id}${payload.bill_no}${payload.bill_total}${process.env.FASPAY_MERCHANT_KEY}`;
  payload.signature = generateSignature(signatureData, process.env.FASPAY_MERCHANT_KEY);

  try {
    const response = await axios.post('https://api.faspay.co.id/payment', payload);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
