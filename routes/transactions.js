const express = require('express');
const { verifyToken, checkRole, checkRoles } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();
const router = express.Router();

// Configure multer storage for payment proof
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create directory if it doesn't exist
    const dir = 'uploads/payment_proofs/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    cb(null, `payment_proof_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Route for users to view their transaction history
router.get('/transactions', verifyToken, async (req, res, next) => {
  try {
    const transactions = await prisma.transaksi.findMany({
      where: { user_id: req.user.id },
      include: { 
        details: { 
          include: { 
            menu: { 
              select: { 
                name: true 
              } 
            } 
          } 
        }, 
        user: { 
          select: { 
            first_name: true,
            last_name: true,
            email: true,
            address_detail: true, 
            province: true, 
            city: true, 
            regency: true, 
            district: true 
          } 
        } 
      },
      orderBy: { created_at: 'desc' }
    });

    // Fix address in response and include user info
    const result = transactions.map(trx => {
      const user = trx.user;
      let districtName = '';
      if (user && user.district && typeof user.district === 'object') {
        districtName = user.district.district_name;
      } else if (user && user.district) {
        districtName = user.district;
      }
      return {
        ...trx,
        address: user
          ? `${user.address_detail}, ${districtName}, ${user.regency}, ${user.city}, ${user.province}`
          : trx.address,
        first_name: user ? user.first_name : undefined,
        last_name: user ? user.last_name : undefined,
        email: user ? user.email : undefined,
        details: trx.details.map(detail => ({
          ...detail,
          menu_name: detail.menu.name // Tambahkan nama menu ke detail
        })),
        user: undefined // remove user object from response for consistency
      };
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Route for admins to view all transaction histories by status, with optional month, year, and day filter
router.get('/transactions/all', verifyToken, checkRoles([1, 2]), async (req, res, next) => {
  try {
    const { month, year, day, status } = req.query;
    let where = {};
    // Allow filtering by multiple statuses (comma separated)
    if (status) {
      const statusArr = status.split(',');
      where.status = { in: statusArr };
    } else {
      where.status = { not: '*' };
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
      include: { 
        details: true, 
        user: { 
          select: { 
            first_name: true,
            last_name: true,
            email: true,
            address_detail: true, 
            province: true, 
            city: true, 
            regency: true, 
            district: true 
          } 
        } 
      },
      orderBy: { created_at: 'desc' }
    });
    // Fix address in response and include user info
    const result = transactions.map(trx => {
      const user = trx.user;
      let districtName = '';
      if (user && user.district && typeof user.district === 'object') {
        districtName = user.district.district_name;
      } else if (user && user.district) {
        districtName = user.district;
      }
      return {
        ...trx,
        address: user
          ? `${user.address_detail}, ${districtName}, ${user.regency}, ${user.city}, ${user.province}`
          : trx.address,
        first_name: user ? user.first_name : undefined,
        last_name: user ? user.last_name : undefined,
        email: user ? user.email : undefined,
        user: undefined
      };
    });
    res.json(result);
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
        user: { 
          select: { 
            first_name: true,
            last_name: true,
            email: true,
            address_detail: true, 
            province: true, 
            city: true, 
            regency: true, 
            district: true 
          } 
        }
      }
    });

    if (!transaction) return res.status(404).send('Transaction not found');

    // Only allow if admin or the transaction belongs to the user
    if (req.user.role_id !== 1 && req.user.role_id !== 2 && transaction.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fix address in response and include user info
    const user = transaction.user;
    let districtName = '';
    if (user && user.district && typeof user.district === 'object') {
      districtName = user.district.district_name;
    } else if (user && user.district) {
      districtName = user.district;
    }
    const result = {
      ...transaction,
      address: user
        ? `${user.address_detail}, ${districtName}, ${user.regency}, ${user.city}, ${user.province}`
        : transaction.address,
      first_name: user ? user.first_name : undefined,
      last_name: user ? user.last_name : undefined,
      email: user ? user.email : undefined,
      user: undefined
    };

    res.json(result);
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
      include: { 
        details: true, 
        user: { 
          select: { 
            first_name: true,
            last_name: true,
            email: true,
            address_detail: true, 
            province: true, 
            city: true, 
            regency: true, 
            district: true 
          } 
        } 
      }
    });
    // Fix address in response and include user info
    const result = transactions.map(trx => {
      const user = trx.user;
      let districtName = '';
      if (user && user.district && typeof user.district === 'object') {
        districtName = user.district.district_name;
      } else if (user && user.district) {
        districtName = user.district;
      }
      return {
        ...trx,
        address: user
          ? `${user.address_detail}, ${districtName}, ${user.regency}, ${user.city}, ${user.province}`
          : trx.address,
        first_name: user ? user.first_name : undefined,
        last_name: user ? user.last_name : undefined,
        email: user ? user.email : undefined,
        user: undefined
      };
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin endpoint to auto-complete transactions stuck in 'On Process' for 2+ days
router.put('/transactions/auto-complete', verifyToken, checkRoles([1,2]), async (req, res, next) => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const toUpdate = await prisma.transaksi.findMany({
      where: {
        status: 'Accepted',
        created_at: { lte: twoDaysAgo },
      },
    });
    const updated = [];
    for (const trx of toUpdate) {
      const result = await prisma.transaksi.update({
        where: { id: trx.id },
        data: { status: 'completed-by-admin' },
      });
      updated.push(result);
    }
    res.json({ message: `${updated.length} transaction(s) auto-completed.`, transactions: updated });
  } catch (err) {
    next(err);
  }
});

// Create transaction with payment proof
router.post('/transactions/bukti-pembayaran', verifyToken, upload.single('bukti_pembayaran'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Payment proof image is required' });

  // Parse items and district_id from form-data (items should be sent as JSON string)
  let items = req.body.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Menu items array is invalid JSON' });
    }
  }
  if (!items || !Array.isArray(items)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Menu items array is required' });
  }

  const district_id = parseInt(req.body.district_id);
  if (!district_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'district_id is required' });
  }

  try {
    // Get user details from token
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        address_detail: true,
        phone_number: true,
        province: true,
        city: true,
        regency: true,
        district: true
      }
    });

    // Fix: Use district.district_name if district is an object
    const districtName = user.district && typeof user.district === 'object'
      ? user.district.district_name
      : user.district || '';

    // Calculate total and validate items
    let total = 0;
    const itemDetails = [];
    for (const item of items) {
      const menu = await prisma.menu.findUnique({
        where: { id: parseInt(item.menu_id) },
        select: { price: true }
      });

      if (!menu) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Menu with ID ${item.menu_id} not found` });
      }

      itemDetails.push({
        menu_id: parseInt(item.menu_id),
        quantity: parseInt(item.quantity),
        price: menu.price
      });
      total += menu.price * parseInt(item.quantity);
    }

    // Get delivery charge from Ongkir table using district_id
    const ongkir = await prisma.ongkir.findUnique({
      where: { id: district_id },
      select: { price: true }
    });

    if (!ongkir) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'District/ongkir not found' });
    }

    // Add delivery charge to total
    total += ongkir.price;

    // Create transaction with details
    const transaction = await prisma.transaksi.create({
      data: {
        user_id: req.user.id,
        address: `${user.address_detail}, ${districtName}, ${user.regency}, ${user.city}, ${user.province}`,
        phone_number: user.phone_number,
        delivery_charge: ongkir.price,
        total: total,
        status: 'OnProcess',
        payment_proof: req.file.filename,
        details: {
          create: itemDetails
        }
      },
      include: {
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
      }
    });

    res.status(201).json(transaction);
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
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
      include: { 
        details: true, 
        user: { 
          select: { 
            first_name: true,
            last_name: true,
            email: true,
            address_detail: true, 
            province: true, 
            city: true, 
            regency: true, 
            district: true 
          } 
        } 
      }
    });
    // Fix address in response and include user info
    const result = transactions.map(trx => {
      const user = trx.user;
      let districtName = '';
      if (user && user.district && typeof user.district === 'object') {
        districtName = user.district.district_name;
      } else if (user && user.district) {
        districtName = user.district;
      }
      return {
        ...trx,
        address: user
          ? `${user.address_detail}, ${districtName}, ${user.regency}, ${user.city}, ${user.province}`
          : trx.address,
        first_name: user ? user.first_name : undefined,
        last_name: user ? user.last_name : undefined,
        email: user ? user.email : undefined,
        user: undefined
      };
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /transactions/:id/admin-accept (admin sets status to OnProgress)
router.put('/transactions/:id/admin-accept', verifyToken, checkRoles([1,2]), async (req, res, next) => {
  const { id } = req.params;
  try {
    // Get transaction details
    const transaksi = await prisma.transaksi.findUnique({
      where: { id: parseInt(id) },
      include: { details: true }
    });
    if (!transaksi) return res.status(404).json({ error: 'Transaction not found' });

    // Update stock for each menu item
    for (const detail of transaksi.details) {
      await prisma.menu.update({
        where: { id: detail.menu_id },
        data: { stock: { decrement: detail.quantity } }
      });
    }

    // Update transaction status
    const updated = await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { status: 'Accepted' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /transactions/:id/admin-reject (admin sets status to Rejected)
router.put('/transactions/:id/admin-reject', verifyToken, checkRoles([1,2]), async (req, res, next) => {
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
      data: { status: 'Accepted-User' }
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
      data: { status: 'Rejected-User' }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Soft delete a transaction (set state to Inactive)
router.delete('/transactions/:id', verifyToken, async (req, res, next) => {
  const { id } = req.params;
  try {
    // Only allow if admin or the transaction belongs to the user
    const trx = await prisma.transaksi.findUnique({ where: { id: parseInt(id) } });
    if (!trx) return res.status(404).json({ error: 'Transaction not found' });
    if (req.user.role_id !== 1 && req.user.role_id !== 2 && trx.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await prisma.transaksi.update({
      where: { id: parseInt(id) },
      data: { state: "Inactive" }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
