const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { tokenizer } = require('./controllers/payment_tokenizer');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/payment', tokenizer);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server error');
});

// Catch-all route for undefined routes
app.use((req, res, next) => {
  res.status(404).send('Route not found');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});