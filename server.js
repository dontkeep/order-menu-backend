const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { tokenizer } = require('./controllers/payment_tokenizer');
const authRoutes = require('./routes/auth');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
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

// Function to create initial roles and admin user
const createInitialRolesAndAdmin = async () => {
  try {
    // Ensure roles exist
    const roles = [
      { id: 0, name: 'admin' },
      { id: 1, name: 'user' }
    ];

    for (const role of roles) {
      const existingRole = await prisma.role.findUnique({ where: { id: role.id } });
      if (!existingRole) {
        await prisma.role.create({ data: role });
        console.log(`Role created: ${role.name}`);
      }
    }

    // Create initial admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';

    const existingAdmin = await prisma.user.findFirst({
      where: { email: adminEmail }
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
          role_id: 0 // Admin role
        }
      });

      console.log(`Initial admin created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log('Admin user already exists.');
    }
  } catch (err) {
    console.error('Error creating initial roles or admin:', err);
  }
};

// Start server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  await createInitialRolesAndAdmin(); 
});