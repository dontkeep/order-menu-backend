const midtransClient = require("midtrans-client");
const base64 = require("base-64");
const axios = require("axios");

const MIDTRANS_API_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

async function tokenizer(req, res)  {
  const MIDTRANS_SERVER_KEY = process.env.SECRET;

  try {
    if (!MIDTRANS_SERVER_KEY) {
      return res.status(500).json({ error: "Midtrans server key is missing" });
    }

    const authCred = `Basic ${base64.encode(`${MIDTRANS_SERVER_KEY}:`)}`;

    const { transaction_details, item_details, customer_details } = req.body;

    if (!transaction_details || !item_details || !customer_details) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const transactionPayload = {
        transaction_details,
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

    res.json({ token: response.data.token });

  } catch (error) {
      console.error("Midtrans error:", error);
      res.status(500).json({ error: "Failed to create transaction" });
  }
}

module.exports = { tokenizer }