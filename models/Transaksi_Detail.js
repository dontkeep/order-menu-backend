const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Transaksi_Detail = prisma.transaksi_Detail;

module.exports = Transaksi_Detail;
