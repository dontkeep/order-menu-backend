const midtransClient = require("midtrans-client");
const base64 = require("base-64");
const axios = require("axios");
const { jwt } = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
const { verifyUserFromToken } = require("./payment_token_verifier.js");

const MIDTRANS_API_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
// const MIDTRANS_API_URL = "https://app.midtrans.com/snap/v1/transactions";

// async function tokenizer(req, res)  {
//   const MIDTRANS_SERVER_KEY = process.env.SECRET;

//   try {
//     if (!MIDTRANS_SERVER_KEY) {
//       console.error("Midtrans server key is missing");
//       return res.status(500).json({ error: "Midtrans server key is missing" });
//     }

//     const authCred = `Basic ${base64.encode(`${MIDTRANS_SERVER_KEY}:`)}`;

//     let userId;
    
//     try {
//       userId = await verifyUserFromToken(req.headers.authorization);
//     } catch (err) {
//       console.log("Error verifying user from token:", err.message);
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     console.log("User ID:", userId);

//     const { transaction_details, item_details, customer_details } = req.body;

//     if (
//       !transaction_details?.order_id ||
//       !transaction_details?.gross_amount ||
//       !Array.isArray(item_details) ||
//       item_details.some(
//         (item) => !item.id || !item.price || !item.quantity || !item.name
//       ) ||
//       !customer_details?.first_name ||
//       !customer_details?.last_name ||
//       !customer_details?.email ||
//       !customer_details?.phone
//     ) {
//       return res.status(400).json({ error: "Invalid or missing required fields" });
//     }

//     console.log("Incoming Payment Request:", req.body);
    
//     let gross_amount = 0;
//     const detailedItems = [];
//     for (const item of item_details) {
//       const menu = await prisma.menu.findUnique({
//         where: { id: parseInt(item.id) },
//         select: { price: true, name: true }
//       });

//       if (!menu) {
//         return res.status(400).json({ error: `Menu item with ID ${item.id} not found` });
//       }

//       const itemTotal = menu.price * parseInt(item.quantity);
//       gross_amount += itemTotal;

//       detailedItems.push({
//         id: item.id,
//         price: menu.price,
//         quantity: parseInt(item.quantity),
//         name: menu.name
//       });
//     }
//     let delivery_charge = 5000;
//     // Add delivery charge to gross_amount
//     gross_amount += parseFloat(delivery_charge || 0);

//     const newTransaction = await prisma.transaksi.create({ 
//       data: {
//         user_id: userId, 
//         address: customer_details.address,
//         phone_number: customer_details.phone,
//         delivery_charge: parseFloat(0),
//         total: gross_amount,
//         status: "pending", // Default status
//         details: {
//           create: item_details.map((item) => ({
//             menu_id: parseInt(item.id),
//             quantity: parseInt(item.quantity),
//             price: parseFloat(item.price),
//           })),
//         },
//       },
//      })

//     const transactionPayload = {
//       transaction_details: {
//         order_id: `ORDER-${newTransaction.id}`,
//         gross_amount: gross_amount
//       },
//         item_details,
//         customer_details
//     };

//     const response = await axios.post(MIDTRANS_API_URL, transactionPayload, {
//       headers: {
//         Accept: "application/json",
//         "Content-Type": "application/json",
//         Authorization: authCred
//       }
//     });

//     res.json({ token: response.data.token, transaction_id: newTransaction.id });

//   } catch (error) {
//       console.error("Midtrans error:", error);
//       res.status(500).json({ error: "Failed to create transaction" });
//   }
// }
async function tokenizer(req, res) {
  const MIDTRANS_SERVER_KEY = process.env.SECRET;

  try {
    if (!MIDTRANS_SERVER_KEY) {
      console.error("Midtrans server key is missing");
      return res.status(500).json({ error: "Midtrans server key is missing" });
    }

    const authCred = `Basic ${base64.encode(`${MIDTRANS_SERVER_KEY}:`)}`;

    let userId;
    try {
      userId = await verifyUserFromToken(req.headers.authorization);
    } catch (err) {
      console.log("Error verifying user from token:", err.message);
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("User ID:", userId);

    const { transaction_details, item_details, customer_details } = req.body;
    console.log("Incoming Request Body:", req.body);

    // Validate required fields
    if (
      !transaction_details?.order_id ||
      !transaction_details?.gross_amount ||
      !Array.isArray(item_details) ||
      item_details.some((item) => !item.id || !item.quantity) ||
      !customer_details?.first_name ||
      !customer_details?.last_name ||
      !customer_details?.email ||
      !customer_details?.phone ||
      !customer_details?.address
    ) {
      console.error("Invalid or missing required fields:", {
        transaction_details,
        item_details,
        customer_details
      });
      return res.status(400).json({ error: "Invalid or missing required fields" });
    }

    console.log("Incoming Payment Request:", req.body);

    let gross_amount = 0;
    const detailedItems = [];
    for (const item of item_details) {
      const menu = await prisma.menu.findUnique({
        where: { id: parseInt(item.id) },
        select: { price: true, name: true }
      });

      if (!menu) {
        return res.status(400).json({ error: `Menu item with ID ${item.id} not found` });
      }

      const itemTotal = menu.price * parseInt(item.quantity);
      gross_amount += itemTotal;

      detailedItems.push({
        id: item.id,
        price: menu.price,
        quantity: parseInt(item.quantity),
        name: menu.name
      });
    }

    // Fetch the delivery charge item from the database
    const deliveryChargeItem = await prisma.menu.findFirst({
      where: { name: "Delivery Charge" },
      select: { id: true, price: true, name: true }
    });

    if (!deliveryChargeItem) {
      return res.status(500).json({ error: "Delivery charge item not found in the database" });
    }

    // Add delivery charge to item_details
    detailedItems.push({
      id: deliveryChargeItem.id,
      price: deliveryChargeItem.price,
      quantity: 1, // Always 1
      name: deliveryChargeItem.name
    });

    // Update gross_amount to include delivery charge
    gross_amount += deliveryChargeItem.price;

    // Save transaction to the database
    const newTransaction = await prisma.transaksi.create({
      data: {
        user_id: userId,
        address: customer_details.address,
        phone_number: customer_details.phone,
        delivery_charge: deliveryChargeItem.price,
        total: gross_amount,
        status: "pending", // Default status
        details: {
          create: detailedItems.map((item) => ({
            menu_id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        }
      }
    });

    console.log("Transaction saved to database:", newTransaction);

    // Prepare payload for Midtrans
    const transactionPayload = {
      transaction_details: {
        order_id: `ORDER-${newTransaction.id}`, // Use the transaction ID as the order ID
        gross_amount: gross_amount
      },
      item_details: detailedItems, // Include delivery charge in item_details
      customer_details: {
        first_name: customer_details.first_name,
        last_name: customer_details.last_name,
        email: customer_details.email,
        phone: customer_details.phone
      }
    };

    // Send request to Midtrans
    const response = await axios.post(MIDTRANS_API_URL, transactionPayload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authCred
      }
    });

    res.json({ token: response.data.token, transaction_id: newTransaction.id });
  } catch (error) {
    console.error("Midtrans error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
}

module.exports = { tokenizer };