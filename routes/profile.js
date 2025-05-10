const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyUserFromToken } = require('../controllers/payment_token_verifier');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Verify the user from the token in the Authorization header
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authorization token is missing' });
    }

    const userId = await verifyUserFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch the user data from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        address_detail: true,
        province: true,
        city: true,
        regency: true,
        district: true,
        role_id: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the user data
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;