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
        role: true,
        state: true
      }
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Update user (including state)
router.put('/users/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { password, state } = req.body; // add state

  try {
    const data = {};
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (state) {
      data.state = state;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No data to update' });
    }
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data
    });
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// Route to "deactivate" a user (soft delete)
router.delete('/users/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { state: "Inactive" }
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
        state: "active"
      },
    });

    const totalProduk = await prisma.menu.count({
      where: {
        state: "active"
      }
    });

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

// Endpoint: Get all menus (no filter, admin only)
router.get('/all-menus', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const menus = await prisma.menu.findMany({
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    const formattedMenus = menus.map(menu => ({
      id: menu.id,
      name: menu.name,
      price: menu.price,
      image: menu.image,
      category_id: menu.category_id,
      category_name: menu.category?.name || null,
      stock: menu.stock,
      description: menu.description,
      state: menu.state
    }));

    res.json(formattedMenus);
  } catch (err) {
    next(err);
  }
});

// Route to "deactivate" a menu (soft delete)
router.delete('/menus/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.menu.update({
      where: { id: parseInt(id) },
      data: { state: "Inactive" }
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
      where: {
        state: "active"
      },
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
// Get daily transaction totals for last 30 days
router.get('/get-graphic-data', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaksi.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        },
        status: {
          in: ['Accepted', 'Accepted-User', 'completed-by-admin']  // Only count confirmed transactions
        }
      },
      select: {
        created_at: true,
        total: true
      }
    });

    // Create a map for all 30 days with 0 as default value (oldest to newest)
    const dailyTotals = new Map();
    for (let i = 29; i >= 0; i--) {
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

    // Convert to required format (no .reverse())
    const formattedData = Array.from(dailyTotals.entries())
      .map(([dateStr, value]) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        return {
          date: `${day} ${month}`,
          value: Math.round(value)  // Round to whole number
        };
      });

    res.json(formattedData);
  } catch (err) {
    next(err);
  }
});

// Route to "deactivate" a category (soft delete)
router.delete('/categories/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.kategori.update({
      where: { id: parseInt(id) },
      data: { state: "Inactive" }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route to "deactivate" a transaction (soft delete)
router.delete('/transactions/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { state: "Inactive" }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Update role (including state)
router.put('/roles/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { name, state } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (state) updateData.state = state;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No data to update' });
    }
    const updatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updatedRole);
  } catch (err) {
    next(err);
  }
});

// Update menu (including state) - already handled in menu.js

// Update category (including state) - already handled in menu.js

// Update transaction (including state)
router.put('/transactions/:id', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { status, state } = req.body;
  try {
    const updateData = {};
    if (status) updateData.status = status;
    if (state) updateData.state = state;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No data to update' });
    }
    const updatedTransaksi = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updatedTransaksi);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
