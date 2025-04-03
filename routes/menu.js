const express = require('express');
const { verifyToken, checkRole } = require('../controllers/authController'); // Import checkRole
const { PrismaClient } = require('@prisma/client'); // Import Prisma Client
const prisma = new PrismaClient(); // Initialize Prisma Client
const router = express.Router();

// Route to get menus from a specified category
router.get('/menus', async (req, res, next) => {
  const { category } = req.query;
  if (!category) return res.status(400).send('Category is required.');

  try {
    const menus = await prisma.menu.findMany({
      where: {
        category: {
          name: category
        }
      }
    });
    res.json({ category, menus });
  } catch (err) {
    next(err);
  }
});

// Route to get all menus
router.get('/menus/all', async (req, res, next) => {
  console.log('GET /menus/all route hit'); // Debug log
  try {
    const menus = await prisma.menu.findMany();
    res.json(menus);
  } catch (err) {
    next(err);
  }
});

// Route to get menu details by ID
router.get('/menus/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const menu = await prisma.menu.findUnique({
      where: { id: parseInt(id) }
    });

    if (!menu) return res.status(404).send('Menu not found');
    res.json(menu);
  } catch (err) {
    next(err);
  }
});

// Route to add a new menu (Admin only)
router.post('/menus', verifyToken, checkRole(1), async (req, res, next) => { // Ensure checkRole is used correctly
  const { name, price, category_id } = req.body;

  try {
    const newMenu = await prisma.menu.create({
      data: {
        name,
        price,
        category_id
      }
    });
    res.status(201).json(newMenu);
  } catch (err) {
    next(err);
  }
});

// Route to edit a menu (Admin only)
router.put('/menus/:id', verifyToken, checkRole('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { name, price, category_id } = req.body;

  try {
    const updatedMenu = await prisma.menu.update({
      where: { id: parseInt(id) },
      data: {
        name,
        price,
        category_id
      }
    });
    res.json(updatedMenu);
  } catch (err) {
    next(err);
  }
});

// Route to update the stock of a menu (Admin only)
router.put('/menus/:id/stock', verifyToken, checkRole('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock == null || stock < 0) {
    return res.status(400).send('Invalid stock value.');
  }

  try {
    const updatedMenu = await prisma.menu.update({
      where: { id: parseInt(id) },
      data: { stock }
    });
    res.json(updatedMenu);
  } catch (err) {
    next(err);
  }
});

// Route to delete a menu (Admin only)
router.delete('/menus/:id', verifyToken, checkRole('admin'), async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.menu.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route to get all categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.kategori.findMany();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// Route to add a new category (Admin only)
router.post('/categories', verifyToken, checkRole('admin'), async (req, res, next) => {
  const { name } = req.body;

  try {
    const newCategory = await prisma.kategori.create({
      data: { name }
    });
    res.status(201).json(newCategory);
  } catch (err) {
    next(err);
  }
});

// Route to edit a category (Admin only)
router.put('/categories/:id', verifyToken, checkRole('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedCategory = await prisma.kategori.update({
      where: { id: parseInt(id) },
      data: { name }
    });
    res.json(updatedCategory);
  } catch (err) {
    next(err);
  }
});

// Route to delete a category (Admin only)
router.delete('/categories/:id', verifyToken, checkRole('admin'), async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.kategori.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
