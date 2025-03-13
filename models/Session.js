const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Session = prisma.session;

module.exports = Session;
