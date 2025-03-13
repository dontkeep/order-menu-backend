const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Cart = prisma.cart;

module.exports = Cart;
