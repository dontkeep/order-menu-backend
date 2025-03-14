const express = require('express');
const { verifyToken } = require('../controllers/authController');
const Menu = require('../models/Menu');
const router = express.Router();

// Route to get menus from a specified category
router.get('/menus', verifyToken, async (req, res, next) => {
  const { category } = req.query;
  if (!category) return res.status(400).send('Category is required.');

  try {
    const menus = await Menu.findMany({
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

module.exports = router;
