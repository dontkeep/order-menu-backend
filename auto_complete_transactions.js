// This script should be scheduled (e.g. with node-cron or OS scheduler)
// It will auto-complete transactions stuck in 'On Process' for 2+ days
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function autoCompleteTransactions() {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const toUpdate = await prisma.transaksi.findMany({
    where: {
      delivery_status: 'On Process',
      created_at: { lte: twoDaysAgo },
    },
  });
  for (const trx of toUpdate) {
    await prisma.transaksi.update({
      where: { id: trx.id },
      data: { delivery_status: 'Selesai', status: 'completed' },
    });
    console.log(`Transaction ${trx.id} auto-completed.`);
  }
  await prisma.$disconnect();
}

autoCompleteTransactions().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
