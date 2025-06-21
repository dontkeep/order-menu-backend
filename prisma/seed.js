const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Remove all existing Ongkir data
  await prisma.ongkir.deleteMany();

  // Helper to add a range of postal codes for a district

  // Jatiluhur: 41152-41161, 7000
  await prisma.ongkir.create({data: {district_name: 'Jatiluhur', district_post_kode: "41152-41161", price: 7000}});
  // Purwakarta (kota): 41111-41119, 9000
  await prisma.ongkir.create({data: {district_name: 'Purwakarta (kota)', district_post_kode: "41111-41119", price: 7000}});
  // Babakancikao: 41151, 12000
  await prisma.ongkir.create({ data: { district_name: 'Babakancikao', district_post_kode: "41151", price: 12000 } });
  // Bungursari: 41181, 20000
  await prisma.ongkir.create({ data: { district_name: 'Bungursari', district_post_kode: "41181", price: 20000 } });
  // Pasawahan: 41171-41172, 12000
  await prisma.ongkir.create({data: {district_name: 'Pasawahan', district_post_kode: "41171-41172", price: 12000}});
  // Sukatani: 41167, 9000
  await prisma.ongkir.create({ data: { district_name: 'Sukatani', district_post_kode: "41167", price: 9000 } });

  console.log('Ongkir seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });