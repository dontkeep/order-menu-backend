const express = require('express');
const { verifyToken, checkRole } = require('../controllers/authController');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer'); // Import multer
const path = require('path'); // Import path for file handling
const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Generate a unique filename
  }
});
const upload = multer({ storage });

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
    const menus = await prisma.menu.findMany({
      include: {
        category: {
          select: {
            name: true // Include the category name
          }
        }
      }
    });

    // Map the response to include category_name
    const formattedMenus = menus.map(menu => ({
      id: menu.id,
      name: menu.name,
      price: menu.price,
      image: menu.image,
      category_id: menu.category_id,
      category_name: menu.category?.name || null, // Add category_name
      stock: menu.stock,
      description: menu.description // Include description if needed
    }));

    res.json(formattedMenus);
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
router.post('/menus', verifyToken, checkRole(1), upload.single('image'), async (req, res, next) => {
  const { name, price, category_id, stock } = req.body;

  try {
    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).send('Image file is required.');
    }

    const newMenu = await prisma.menu.create({
      data: {
        name,
        price: parseFloat(price),
        image: req.file.filename, // Save the filename of the uploaded image
        stock: stock ? parseInt(stock) : 0,
        description, // Default stock to 0 if not provided
        category: {
          connect: { id: parseInt(category_id) } // Use connect to link to an existing category
        }
      }
    });
    res.status(201).json(newMenu);
  } catch (err) {
    next(err);
  }
});

// Route to edit a menu (Admin only)
router.put('/menus/:id', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
  const { id } = req.params;
  const { name, price, category_id } = req.body;

  try {
    const updatedMenu = await prisma.menu.update({
      where: { id: parseInt(id) },
      data: {
        name,
        price: parseFloat(price),
        description,
        category: {
          connect: { id: parseInt(category_id) } // Use connect to link to an existing category
        }
      }
    });
    res.json(updatedMenu);
  } catch (err) {
    next(err);
  }
});

// Route to update the stock of a menu (Admin only)
router.put('/menus/:id/stock', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
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
router.delete('/menus/:id', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
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
router.post('/categories', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
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
router.put('/categories/:id', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
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
router.delete('/categories/:id', verifyToken, checkRole(1), async (req, res, next) => { // Use role_id 1 for admin
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

