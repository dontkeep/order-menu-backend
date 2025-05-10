const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    const existingCategory = await prisma.kategori.findUnique({
      where: { id: 2 }
    });

    if (!existingCategory) {
      console.error("❌ Error: Category with id: 2 does not exist. Please create it first.");
      return;
    }
    
    // Check if the delivery charge item already exists
    const existingItem = await prisma.menu.findUnique({
      where: { id: 0 }
    });

    if (!existingItem) {
      // Create the delivery charge item
      await prisma.menu.create({
        data: {
          name: "Delivery Charge",
          price: 5000, // Fixed delivery charge
          image: "delivery_charge.png", // Placeholder image
          category_id: 2, // Link to the existing "Burger" category
          stock: 1, // Stock is not relevant but required
          description: "Fixed delivery charge for all orders"
        }
      });

      console.log("✅ Delivery charge item created successfully.");
    } else {
      console.log("Delivery charge item already exists.");
    }
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();