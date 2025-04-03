const express = require('express');
const { register, login, logout, verifyToken } = require('../controllers/authController'); // Import verifyToken
const router = express.Router();

// Route to get user profile
router.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        address_detail: true,
        province: true,
        city: true,
        regency: true,
        district: true
      }
    });

    if (!user) return res.status(404).send('User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
