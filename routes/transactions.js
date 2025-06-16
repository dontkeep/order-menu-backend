const express = require('express');
const { verifyToken, checkRole } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client'); // Import Prisma Client
const prisma = new PrismaClient(); // Initialize Prisma Client
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Route for users to view their transaction history
router.get('/transactions', verifyToken, async (req, res, next) => {
  try {
    const transactions = await prisma.transaksi.findMany({
      where: { user_id: req.user.id },
      include: { details: true }
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// Route for admins to view all transaction histories by status, with optional month, year, and day filter
router.get('/transactions/all', verifyToken, checkRole(1 || 2), async (req, res, next) => {
  try {
    const { month, year, day, status } = req.query;
    let where = {};
    // Allow filtering by multiple statuses (comma separated)
    if (status) {
      const statusArr = status.split(',');
      where.status = { in: statusArr };
    } else {
      // Default: show all statuses
      where.status = { in: ['Paid', 'OnProgress', 'Rejected', 'Accepted', 'Completed'] };
    }
    if (month && year && day) {
      const start = new Date(year, month - 1, day);
      const end = new Date(year, month - 1, parseInt(day) + 1);
      where.created_at = { gte: start, lt: end };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.created_at = { gte: start, lt: end };
    }
    const transactions = await prisma.transaksi.findMany({
      where,
      include: { details: true, user: true }
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// Route to get transaction details by ID
router.get('/transactions/:id', verifyToken, async (req, res, next) => {
  const { id } = req.params;

  try {
    const transaction = await prisma.transaksi.findUnique({
      where: { id: parseInt(id) },
      include: {
        details: {
          include: {
            menu: {
              select: { name: true }
            }
          }
        },
        user: true
      }
    });

    if (!transaction) return res.status(404).send('Transaction not found');

    // Only allow if admin or the transaction belongs to the user
    if (req.user.role_id !== 1 && req.user.role_id !== 2 && transaction.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

// Route for admins to update the status of an order
router.put('/transactions/:id/status', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send('Invalid status.');
    }

    const updatedTransaction = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json(updatedTransaction);
  } catch (err) {
    next(err);
  }
});

// Webhook to handle payment confirmation from Midtrans
router.post('/transactions/payment-confirmation', async (req, res, next) => {
  try {
    const { order_id, transaction_status } = req.body;
    console.log('Payment confirmation received:', req.body);
    if (!order_id || !transaction_status) {
      return res.status(400).send('Invalid payload.');
    }

    const transactionId = parseInt(order_id.replace('ORDER-', ''));
    let status;
    console.log(`Processing transaction ID: ${transactionId}, Status: ${transaction_status}`);
    switch (transaction_status) {
      case 'Settlement':
        status = 'Paid';
        // Also update delivery_status to 'On Process' when paid
        await prisma.transaksi.update({
          where: { id: transactionId },
          data: { delivery_status: 'On Process' }
        });
        break;
      case 'Cancel':
      case 'Deny':
      case 'Expire':
        status = 'Cancelled';
        break;
      case 'Pending':
        status = 'Pending';
        break;
      default:
        return res.status(400).send('Unknown transaction status.');
    }

    const updatedTransaction = await prisma.transaksi.update({
      where: { id: transactionId },
      data: { status }
    });

    res.json({ message: 'Transaction status updated', transaction: updatedTransaction });
  } catch (err) {
    next(err);
  }
});

// User marks order as completed
router.put('/transactions/:id/complete', verifyToken, async (req, res, next) => {
  const { id } = req.params;
  try {
    // Only allow if the transaction belongs to the user
    const transaksi = await prisma.transaksi.findUnique({ where: { id: parseInt(id) } });
    if (!transaksi || transaksi.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { delivery_status: 'Selesai', status: 'completed' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// User rejects order
router.put('/transactions/:id/reject', verifyToken, async (req, res, next) => {
  const { id } = req.params;
  try {
    // Only allow if the transaction belongs to the user
    const transaksi = await prisma.transaksi.findUnique({ where: { id: parseInt(id) } });
    if (!transaksi || transaksi.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { delivery_status: 'Ditolak', status: 'cancelled' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Get all transactions for the authenticated user
router.get('/my-transactions', verifyToken, async (req, res, next) => {
  try {
    const transactions = await prisma.transaksi.findMany({
      where: { user_id: req.user.id },
      include: { details: true, user: true }
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// Admin endpoint to auto-complete transactions stuck in 'On Process' for 2+ days
router.put('/transactions/auto-complete', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const toUpdate = await prisma.transaksi.findMany({
      where: {
        delivery_status: 'On Process',
        created_at: { lte: twoDaysAgo },
      },
    });
    const updated = [];
    for (const trx of toUpdate) {
      const result = await prisma.transaksi.update({
        where: { id: trx.id },
        data: { delivery_status: 'Selesai', status: 'completed' },
      });
      updated.push(result);
    }
    res.json({ message: `${updated.length} transaction(s) auto-completed.`, transactions: updated });
  } catch (err) {
    next(err);
  }
});

// POST /transactions/:id/bukti-pembayaran (upload payment proof image)
router.post('/transactions/:id/bukti-pembayaran', verifyToken, multer({ dest: 'uploads/' }).single('bukti_pembayaran'), async (req, res, next) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'Image is required' });
  try {
    // Only allow if the transaction belongs to the user
    const transaksi = await prisma.transaksi.findUnique({ where: { id: parseInt(id) } });
    if (!transaksi || transaksi.user_id !== req.user.id) {
      // Optionally, delete the uploaded file if not authorized
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { 'payment_proof': req.file.filename, status: 'Paid' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /paid-transactions (all except Pending)
router.get('/paid-transactions', verifyToken, async (req, res, next) => {
  try {
    const transactions = await prisma.transaksi.findMany({
      where: {
        user_id: req.user.id,
        NOT: { status: 'Pending' }
      },
      include: { details: true }
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// PUT /transactions/:id/admin-accept (admin sets status to OnProgress)
router.put('/transactions/:id/admin-accept', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { status: 'OnProgress' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /transactions/:id/admin-reject (admin sets status to Rejected)
router.put('/transactions/:id/admin-reject', verifyToken, checkRole(1), async (req, res, next) => {
  const { id } = req.params;
  try {
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { status: 'Rejected' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /transactions/:id/user-accept (user sets status to Completed)
router.put('/transactions/:id/user-accept', verifyToken, async (req, res, next) => {
  const { id } = req.params;
  try {
    const transaksi = await prisma.transaksi.findUnique({ where: { id: parseInt(id) } });
    if (!transaksi || transaksi.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { status: 'Completed' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /transactions/:id/user-reject (user sets status to User-Rejected)
router.put('/transactions/:id/user-reject', verifyToken, async (req, res, next) => {
  const { id } = req.params;
  try {
    const transaksi = await prisma.transaksi.findUnique({ where: { id: parseInt(id) } });
    if (!transaksi || transaksi.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { status: 'User-Rejected' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /qris-image (serve static QRIS image)
router.get('/qris-image', (req, res) => {
  const qrisPath = path.join(__dirname, '../uploads/qris.png');
  if (fs.existsSync(qrisPath)) {
    res.sendFile(qrisPath);
  } else {
    res.status(404).json({ error: 'QRIS image not found' });
  }
});

module.exports = router;
