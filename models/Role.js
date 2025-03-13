const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Role = prisma.role;

module.exports = Role;
