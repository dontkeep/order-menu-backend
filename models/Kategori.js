const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Kategori = prisma.kategori;

module.exports = Kategori;
