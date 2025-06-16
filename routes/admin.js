const express = require('express');
const { verifyToken, checkRole } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client'); // Correct Prisma Client import
const prisma = new PrismaClient(); // Initialize Prisma Client
const bcrypt = require('bcrypt');
const router = express.Router();

// Route to get admin dashboard data
router.get('/dashboard', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
  try {
    const totalSales = await prisma.transaksi.aggregate({
      _sum: { total: true }
    });

    const totalUsers = await prisma.user.count();
    const totalTransactions = await prisma.transaksi.count();

    res.json({
      totalSales: totalSales._sum.total || 0,
      totalUsers,
      totalTransactions
    });
  } catch (err) {
    next(err);
  }
});

// Route to view all users
router.get('/users', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true, 
        email: true,
        role: true
      }
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// route to update a user's password
router.put('/users/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password before saving
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { hashedPassword } // Assuming password is hashed before this
    });
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// route to delete a user
router.delete('/users/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route to get dashboard statistics
router.get("/statistik", verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const stockKosong = await prisma.menu.count({
      where: {
        stock: 0,
      },
    });

    const totalProduk = await prisma.menu.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const besok = new Date(today);
    besok.setDate(today.getDate() + 1);

    const transaksiHariIni = await prisma.transaksi.count({
      where: {
        created_at: {
          gte: today,
          lt: besok,
        },
      },
    });

    res.json({
      stockKosong,
      totalProduk,
      transaksiHariIni,
    });
  } catch (err) {
    next(err);
  }
});


// Route to update a user's role
router.put('/users/:id/role', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { role_id } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role_id }
    });
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// Route to deactivate a user
router.delete('/users/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route to get all transactions
router.get('/transactions', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const transactions = await prisma.transaksi.findMany({
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        },
        details: {
          include: {
            menu: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

router.get("/stock-statistics", verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const stockStatistics = await prisma.menu.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    res.json(stockStatistics);
  } catch (err) {
    next(err);
  }
});

router.post('/add-user', verifyToken, checkRole(1), async (req, res, next) => {
  const { first_name, last_name, email, password, phone_number, address_detail, province, city, regency, district, role_id } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).send('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        phone_number,
        address_detail,
        province,
        city,
        regency,
        district,
        role_id
      }
    });
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

router.get('/get-employees', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role_id: 2 }, // Assuming role_id 2 is for employees
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true
      }
    });
    res.json(employees);
  } catch (err) {
    next(err);
  }
}); 

router.put('/users/:id/password', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true
      }
    });
    res.json({ message: 'Password updated successfully', user: updatedUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
