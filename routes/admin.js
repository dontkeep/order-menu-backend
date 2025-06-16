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

// Get daily transaction totals for last 30 days
router.get('/get-graphic-data', verifyToken, checkRole(1 || 2), async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaksi.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        },
        status: {
          in: ['Paid', 'OnProgress', 'Completed']  // Only count confirmed transactions
        }
      },
      select: {
        created_at: true,
        total: true
      }
    });

    // Create a map for all 30 days with 0 as default value
    const dailyTotals = new Map();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dailyTotals.set(date.toISOString().split('T')[0], 0);
    }

    // Sum up totals for each day
    transactions.forEach(transaction => {
      const dateStr = transaction.created_at.toISOString().split('T')[0];
      const currentTotal = dailyTotals.get(dateStr) || 0;
      dailyTotals.set(dateStr, currentTotal + transaction.total);
    });

    // Convert to required format
    const formattedData = Array.from(dailyTotals.entries())
      .map(([dateStr, value]) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        return {
          date: `${day} ${month}`,
          value: Math.round(value)  // Round to whole number
        };
      })
      .reverse();  // Most recent last

    res.json(formattedData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
