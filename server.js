const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { tokenizer } = require('./controllers/payment_tokenizer');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/auth', authRoutes);
app.use('/menus', menuRoutes);
app.use('/cart', cartRoutes);
app.use('/transactions', transactionRoutes);
app.use('/admin', adminRoutes);
app.post('/payment', tokenizer);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server error');
});

// Catch-all route for undefined routes
app.use((req, res, next) => {
  res.status(404).send('Route not found');
});

// Function to create initial admin user
const createInitialAccounts = async () => {
  try {
    // Admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';

    const userEmail = 'user@example.com';
    const userPassword = 'user123';

    const existingAdmin = await prisma.user.findFirst({
      where: { email: adminEmail }
    });

    const existingUser = await prisma.user.findFirst({
      where: { email: userEmail }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await prisma.user.create({
        data: {
          first_name: 'Admin',
          last_name: 'User',
          email: adminEmail,
          password: hashedPassword,
          phone_number: '1234567890',
          address_detail: 'Admin Address',
          province: 'Admin Province',
          city: 'Admin City',
          regency: 'Admin Regency',
          district: 'Admin District',
          role_id: 1 // Admin
        }
      });

      console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log('Admin user already exists.');
    }

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userPassword, 10);

      await prisma.user.create({
        data: {
          first_name: 'User',
          last_name: 'Sample',
          email: userEmail,
          password: hashedPassword,
          phone_number: '0987654321',
          address_detail: 'User Address',
          province: 'User Province',
          city: 'User City',
          regency: 'User Regency',
          district: 'User District',
          role_id: 3 // Pelanggan
        }
      });

      console.log(`✅ User created: ${userEmail} / ${userPassword}`);
    } else {
      console.log('User already exists.');
    }

  } catch (err) {
    console.error('❌ Error creating initial accounts:', err);
  }
};


// Start server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  await createInitialAccounts(); 
});
