const express = require('express');
const { verifyToken } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client'); // Import Prisma Client
const prisma = new PrismaClient(); // Initialize Prisma Client
const { tokenizer } = require('../controllers/payment_tokenizer');
const router = express.Router();

// Middleware to validate menu_id, quantity, and stock availability
const validateCartInput = async (req, res, next) => {
  const { menu_id, quantity } = req.body;

  if (!menu_id || !quantity || quantity <= 0) {
    return res.status(400).send('Invalid menu_id or quantity.');
  }

  const menu = await prisma.menu.findUnique({ where: { id: menu_id } });
  if (!menu) {
    return res.status(404).send('Menu item not found.');
  }

  if (menu.stock < quantity) {
    return res.status(400).send('Insufficient stock.');
  }

  next();
};

// Route to get the user's cart
router.get('/cart', verifyToken, async (req, res, next) => {
  try {
    const cart = await prisma.cart.findMany({
      where: { user_id: req.user.id },
      include: { menu: true } // Include menu details
    });
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// Route to add an item to the cart
router.post('/cart', verifyToken, validateCartInput, async (req, res, next) => {
  const { menu_id, quantity } = req.body;

  try {
    const existingItem = await prisma.cart.findUnique({
      where: {
        user_id_menu_id: {
          user_id: req.user.id,
          menu_id
        }
      }
    });

    if (existingItem) {
      // Update quantity if item already exists
      const updatedItem = await prisma.cart.update({
        where: {
          user_id_menu_id: {
            user_id: req.user.id,
            menu_id
          }
        },
        data: {
          quantity: existingItem.quantity + quantity
        }
      });
      return res.json(updatedItem);
    }

    // Add new item to the cart
    const newItem = await prisma.cart.create({
      data: {
        user_id: req.user.id,
        menu_id,
        quantity
      }
    });
    res.status(201).json(newItem);
  } catch (err) {
    next(err);
  }
});

// Route to update the quantity of an item in the cart
router.put('/cart/:menu_id', verifyToken, validateCartInput, async (req, res, next) => {
  const { menu_id } = req.params;
  const { quantity } = req.body;

  try {
    const updatedItem = await prisma.cart.update({
      where: {
        user_id_menu_id: {
          user_id: req.user.id,
          menu_id: parseInt(menu_id)
        }
      },
      data: { quantity }
    });
    res.json(updatedItem);
  } catch (err) {
    next(err);
  }
});

// Route to remove an item from the cart
router.delete('/cart/:menu_id', verifyToken, async (req, res, next) => {
  const { menu_id } = req.params;

  try {
    await prisma.cart.delete({
      where: {
        user_id_menu_id: {
          user_id: req.user.id,
          menu_id: parseInt(menu_id)
        }
      }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route to calculate the total price of the cart
router.get('/cart/total', verifyToken, async (req, res, next) => {
  try {
    const cartItems = await prisma.cart.findMany({
      where: { user_id: req.user.id },
      include: { menu: true } // Include menu details for price calculation
    });

    const total = cartItems.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
    res.json({ total });
  } catch (err) {
    next(err);
  }
});

// Route to clear the cart
router.delete('/cart', verifyToken, async (req, res, next) => {
  try {
    await prisma.cart.deleteMany({
      where: { user_id: req.user.id }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route to place an order
router.post('/cart/checkout', verifyToken, async (req, res, next) => {
  try {
    // Fetch cart items
    const cartItems = await prisma.cart.findMany({
      where: { user_id: req.user.id },
      include: { menu: true }
    });

    if (cartItems.length === 0) {
      return res.status(400).send('Cart is empty.');
    }

    // Check stock availability for all items
    for (const item of cartItems) {
      if (item.menu.stock < item.quantity) {
        return res.status(400).send(`Insufficient stock for item: ${item.menu.name}`);
      }
    }

    // Deduct stock for all items
    for (const item of cartItems) {
      await prisma.menu.update({
        where: { id: item.menu_id },
        data: { stock: item.menu.stock - item.quantity }
      });
    }

    // Calculate total price
    const total = cartItems.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);

    // Create transaction
    const transaction = await prisma.transaksi.create({
      data: {
        user_id: req.user.id,
        address: req.body.address,
        phone_number: req.body.phone_number,
        delivery_charge: req.body.delivery_charge || 0,
        total,
        status: 'pending'
      }
    });

    // Create transaction details
    for (const item of cartItems) {
      await prisma.transaksi_Detail.create({
        data: {
          transaksi_id: transaction.id,
          menu_id: item.menu_id,
          quantity: item.quantity,
          price: item.menu.price
        }
      });
    }

    // Clear the cart
    await prisma.cart.deleteMany({
      where: { user_id: req.user.id }
    });

    // Generate payment token using payment_tokenizer
    const paymentPayload = {
      transaction_details: {
        order_id: `ORDER-${transaction.id}`,
        gross_amount: total
      },
      item_details: cartItems.map(item => ({
        id: item.menu_id,
        price: item.menu.price,
        quantity: item.quantity,
        name: item.menu.name
      })),
      customer_details: {
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email,
        phone: req.body.phone_number
      }
    };

    const paymentResponse = await tokenizer({ body: paymentPayload }, res);

    res.json({
      message: 'Order placed successfully',
      transaction,
      payment_token: paymentResponse.token
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
