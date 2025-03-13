const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Menu = prisma.menu;

module.exports = Menu;
