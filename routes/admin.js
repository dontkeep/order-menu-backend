const express = require('express');
const { verifyToken, checkRole } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client'); // Correct Prisma Client import
const prisma = new PrismaClient(); // Initialize Prisma Client
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

// Route to get sales report
router.get('/sales-report', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const totalSales = await prisma.transaksi.aggregate({
      _sum: { total: true }
    });

    const salesByCategory = await prisma.kategori.findMany({
      include: {
        menus: {
          include: {
            details: {
              select: {
                quantity: true,
                price: true
              }
            }
          }
        }
      }
    });

    const topSellingItems = await prisma.menu.findMany({
      include: {
        details: {
          select: {
            quantity: true
          }
        }
      },
      orderBy: {
        details: {
          _sum: {
            quantity: 'desc'
          }
        }
      },
      take: 5
    });

    res.json({
      totalSales: totalSales._sum.total || 0,
      salesByCategory,
      topSellingItems
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
