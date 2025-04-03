# Order Menu Backend API Documentation

This document provides an overview of how to use the backend API for the Order Menu system. It includes endpoints for authentication, menu management, cart operations, transactions, and more.

---

## Base URL
```
http://localhost:3000
```

---

## Authentication

### 1. Register
**Endpoint**: `POST /auth/register`  
**Description**: Register a new user.  
**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "phone_number": "1234567890",
  "address_detail": "123 Main St",
  "province": "Province",
  "city": "City",
  "regency": "Regency",
  "district": "District",
  "role_id": 1
}
```

### 2. Login
**Endpoint**: `POST /auth/login`  
**Description**: Log in to the system.  
**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```
**Response**:
```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN"
}
```

### 3. Logout
**Endpoint**: `POST /auth/logout`  
**Description**: Log out of the system.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 4. Get User Profile
**Endpoint**: `GET /auth/profile`  
**Description**: Fetch the logged-in user's profile.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Response**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone_number": "1234567890",
  "address_detail": "123 Main St",
  "province": "Province",
  "city": "City",
  "regency": "Regency",
  "district": "District"
}
```

---

## Admin Operations

### 1. Admin Dashboard
**Endpoint**: `GET /admin/dashboard`  
**Description**: Fetch admin dashboard data, including total sales, total users, and total transactions.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 2. View All Users
**Endpoint**: `GET /admin/users`  
**Description**: Fetch all users.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 3. Update User Role
**Endpoint**: `PUT /admin/users/:id/role`  
**Description**: Update the role of a user.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "role_id": 2
}
```

### 4. Deactivate User
**Endpoint**: `DELETE /admin/users/:id`  
**Description**: Deactivate a user.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 5. View Sales Report
**Endpoint**: `GET /admin/sales-report`  
**Description**: Fetch a detailed sales report, including total sales, sales by category, and top-selling items.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

---

## Menu Management (Admin Only)

### 1. Add Menu
**Endpoint**: `POST /menus`  
**Description**: Add a new menu item.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "name": "Pizza",
  "price": 10.99,
  "category_id": 1
}
```

### 2. Edit Menu
**Endpoint**: `PUT /menus/:id`  
**Description**: Edit an existing menu item.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "name": "Updated Pizza",
  "price": 12.99,
  "category_id": 1
}
```

### 3. Update Stock
**Endpoint**: `PUT /menus/:id/stock`  
**Description**: Update the stock of a menu item.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "stock": 50
}
```

### 4. Delete Menu
**Endpoint**: `DELETE /menus/:id`  
**Description**: Delete a menu item.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 5. Get All Menus
**Endpoint**: `GET /menus/all`  
**Description**: Fetch all menu items.  

### 6. Get Menu Details
**Endpoint**: `GET /menus/:id`  
**Description**: Fetch details of a specific menu item by its ID.  

### 7. Get All Categories
**Endpoint**: `GET /categories`  
**Description**: Fetch all categories.  

---

## Cart Operations

### 1. View Cart
**Endpoint**: `GET /cart`  
**Description**: View the user's cart.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 2. Add to Cart
**Endpoint**: `POST /cart`  
**Description**: Add an item to the cart.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "menu_id": 1,
  "quantity": 2
}
```

### 3. Update Cart Item
**Endpoint**: `PUT /cart/:menu_id`  
**Description**: Update the quantity of an item in the cart.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "quantity": 3
}
```

### 4. Remove from Cart
**Endpoint**: `DELETE /cart/:menu_id`  
**Description**: Remove an item from the cart.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 5. Checkout
**Endpoint**: `POST /cart/checkout`  
**Description**: Place an order and generate a payment token.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "address": "123 Main St",
  "phone_number": "1234567890",
  "delivery_charge": 5.00
}
```

---

## Transactions

### 1. View User Transaction History
**Endpoint**: `GET /transactions`  
**Description**: View the logged-in user's transaction history.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 2. View All Transactions (Admin Only)
**Endpoint**: `GET /transactions/all`  
**Description**: View all transactions (admin only).  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 3. Get Transaction Details
**Endpoint**: `GET /transactions/:id`  
**Description**: Fetch details of a specific transaction by its ID.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

### 4. Update Transaction Status (Admin Only)
**Endpoint**: `PUT /transactions/:id/status`  
**Description**: Update the status of a transaction.  
**Headers**:
```
Authorization: Bearer JWT_TOKEN
```
**Request Body**:
```json
{
  "status": "shipped"
}
```

---

## Payment Integration

### 1. Generate Payment Token
**Endpoint**: `POST /payment`  
**Description**: Generate a payment token using Midtrans.  
**Request Body**:
```json
{
  "transaction_details": {
    "order_id": "ORDER-123",
    "gross_amount": 100.00
  },
  "item_details": [
    {
      "id": 1,
      "price": 50.00,
      "quantity": 2,
      "name": "Pizza"
    }
  ],
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890"
  }
}
```
**Response**:
```json
{
  "token": "MIDTRANS_PAYMENT_TOKEN"
}
```

---

## Notes
- Replace `JWT_TOKEN` with the token received after logging in.
- Ensure you have the required admin privileges for admin-only routes.
- Use appropriate HTTP clients (e.g., Axios, Fetch) in your frontend to make these requests.