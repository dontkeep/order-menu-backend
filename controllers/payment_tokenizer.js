const midtransClient = require("midtrans-client");
const base64 = require("base-64");
const axios = require("axios");
const { jwt } = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
const { verifyUserFromToken } = require("./payment_token_verifier");

const MIDTRANS_API_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

async function tokenizer(req, res)  {
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

    if (
      !transaction_details?.order_id ||
      !transaction_details?.gross_amount ||
      !Array.isArray(item_details) ||
      item_details.some(
        (item) => !item.id || !item.price || !item.quantity || !item.name
      ) ||
      !customer_details?.first_name ||
      !customer_details?.last_name ||
      !customer_details?.email ||
      !customer_details?.phone
    ) {
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

    // Add delivery charge to gross_amount
    gross_amount += parseFloat(delivery_charge || 0);

    const newTransaction = await prisma.transaksi.create({ 
      data: {
        user_id: userId, 
        address,
        phone_number,
        delivery_charge: parseFloat(0),
        total: gross_amount,
        status: "pending", // Default status
        details: {
          create: item_details.map((item) => ({
            menu_id: parseInt(item.id),
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
          })),
        },
      },
     })

    const transactionPayload = {
      transaction_details: {
        order_id: `ORDER-${newTransaction.id}`,
        gross_amount: gross_amount
      },
        item_details,
        customer_details
    };

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