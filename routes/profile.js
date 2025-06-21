const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyUserFromToken } = require('../controllers/payment_token_verifier');

const prisma = new PrismaClient();
const router = express.Router();
const bcrypt = require('bcrypt');

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

    // Fetch the user data from the database, including district object
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
        district_id: true,
        district: {
          select: {
            id: true,
            district_name: true,
            district_post_kode: true,
            price: true
          }
        },
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

// PUT endpoint for updating profile (excluding email)
router.put('/', async (req, res) => {
  try {
    // Verify the user from the token
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authorization token is missing' });
    }

    const userId = await verifyUserFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Extract update data from request body
    const {
      first_name,
      last_name,
      phone_number,
      address_detail,
      province,
      city,
      regency,
      district_id,
      current_password,
      new_password,
      confirm_password
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Handle password change if requested
    let passwordUpdate = {};
    if (current_password || new_password || confirm_password) {
      if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({ error: 'All password fields are required for password change' });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({ error: 'New password and confirmation do not match' });
      }

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash the new password
      passwordUpdate.password = await bcrypt.hash(new_password, 10);
    }

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name,
        last_name,
        phone_number,
        address_detail,
        province,
        city,
        regency,
        district_id,
        ...passwordUpdate
      },
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
        district_id: true,
        district: {
          select: {
            id: true,
            district_name: true,
            district_post_kode: true,
            price: true
          }
        }
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

router.get('/districts', async (req, res) => {
  try {
    const districts = await prisma.ongkir.findMany({
      select: {
        id: true,
        district_name: true,
        district_post_kode: true,
        price: true,
      }
    });
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

module.exports = router;