const express = require('express');
const { verifyToken, checkRole } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client'); // Import Prisma Client
const prisma = new PrismaClient(); // Initialize Prisma Client
const router = express.Router();

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

// Route for admins to view all transaction histories
router.get('/transactions/all', verifyToken, checkRole(1), async (req, res, next) => {
  try {
    const transactions = await prisma.transaksi.findMany({
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
      include: { details: true, user: true }
    });

    if (!transaction) return res.status(404).send('Transaction not found');
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

    switch (transaction_status) {
      case 'settlement':
        status = 'paid';
        // Also update delivery_status to 'On Process' when paid
        await prisma.transaksi.update({
          where: { id: transactionId },
          data: { delivery_status: 'On Process' }
        });
        break;
      case 'cancel':
      case 'deny':
      case 'expire':
        status = 'cancelled';
        break;
      case 'pending':
        status = 'pending';
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

module.exports = router;
