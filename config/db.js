const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
  createTables();
});

function createTables() {
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS User (
      id INT PRIMARY KEY AUTO_INCREMENT,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone_number VARCHAR(15) NOT NULL,
      address_detail TEXT NOT NULL,
      province VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      regency VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      role_id INT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES Role(id)
    );
  `;

  const createRoleTable = `
    CREATE TABLE IF NOT EXISTS Role (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL UNIQUE
    );
  `;

  const createCategoryTable = `
    CREATE TABLE IF NOT EXISTS Kategori (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL
    );
  `;

  const createMenuTable = `
    CREATE TABLE IF NOT EXISTS Menu (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      image VARCHAR(255) NOT NULL,
      category_id INT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES Kategori(id) ON DELETE CASCADE
    );
  `;

  const createTransactionTable = `
    CREATE TABLE IF NOT EXISTS Transaksi (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      address TEXT NOT NULL,
      phone_number VARCHAR(15) NOT NULL,
      delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'processed', 'delivered', 'canceled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
    );
  `;

  const createTransactionDetailsTable = `
    CREATE TABLE IF NOT EXISTS Transaksi_Detail (
      id INT PRIMARY KEY AUTO_INCREMENT,
      transaksi_id INT NOT NULL,
      menu_id INT NOT NULL,
      quantity INT NOT NULL CHECK (quantity > 0),
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (transaksi_id) REFERENCES Transaksi(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES Menu(id) ON DELETE CASCADE
    );
  `;

  const createCartTable = `
    CREATE TABLE IF NOT EXISTS Cart (
      id_user INT NOT NULL,
      id_menu INT NOT NULL,
      quantity INT NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_user, id_menu),
      FOREIGN KEY (id_user) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (id_menu) REFERENCES Menu(id) ON DELETE CASCADE
    );
  `;

  const createSessionTable = `
    CREATE TABLE IF NOT EXISTS Session (
      session_id VARCHAR(255) PRIMARY KEY,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
    );
  `;

  db.query(createRoleTable, (err) => {
    if (err) {
      console.error('Error creating Role table:', err);
      return;
    }
    console.log('Role table created or already exists');
    // Insert default roles
    const insertRoles = `
      INSERT INTO Role (name) VALUES ('admin'), ('customer')
      ON DUPLICATE KEY UPDATE name=name;
    `;
    db.query(insertRoles, (err) => {
      if (err) {
        console.error('Error inserting default roles:', err);
        return;
      }
      console.log('Default roles inserted or already exist');
    });
  });

  db.query(createUserTable, (err) => {
    if (err) {
      console.error('Error creating User table:', err);
      return;
    }
    console.log('User table created or already exists');
  });

  db.query(createCategoryTable, (err) => {
    if (err) {
      console.error('Error creating Category table:', err);
      return;
    }
    console.log('Category table created or already exists');
  });

  db.query(createMenuTable, (err) => {
    if (err) {
      console.error('Error creating Menu table:', err);
      return;
    }
    console.log('Menu table created or already exists');
  });

  db.query(createTransactionTable, (err) => {
    if (err) {
      console.error('Error creating Transaction table:', err);
      return;
    }
    console.log('Transaction table created or already exists');
  });

  db.query(createTransactionDetailsTable, (err) => {
    if (err) {
      console.error('Error creating Transaction Details table:', err);
      return;
    }
    console.log('Transaction Details table created or already exists');
  });

  db.query(createCartTable, (err) => {
    if (err) {
      console.error('Error creating Cart table:', err);
      return;
    }
    console.log('Cart table created or already exists');
  });

  db.query(createSessionTable, (err) => {
    if (err) {
      console.error('Error creating Session table:', err);
      return;
    }
    console.log('Session table created or already exists');
  });
}

module.exports = db;
