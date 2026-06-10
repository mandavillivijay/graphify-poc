# ShopHub E-Commerce Application v1

A full-stack e-commerce platform built with React, TypeScript, Node.js, Express, and SQLite.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ShopHub Application                   │
├────────────────────────┬────────────────────────────────┤
│     Frontend (React)   │      Backend (Node.js)         │
│   Port: 3000           │      Port: 3001                │
│                        │                                 │
│  ┌──────────────────┐  │  ┌──────────────────────────┐  │
│  │ Pages            │  │  │ Routes                   │  │
│  │ - ProductListing │  │  │ - /api/auth              │  │
│  │ - ProductDetail  │◄─┼──│ - /api/products          │  │
│  │ - Cart           │  │  │ - /api/cart              │  │
│  │ - Checkout       │  │  │ - /api/orders            │  │
│  │ - OrderHistory   │  │  │ - /api/admin             │  │
│  │ - OrderDetail    │  │  └──────────┬───────────────┘  │
│  │ - Profile        │  │             │                   │
│  │ - Login/Register │  │  ┌──────────▼───────────────┐  │
│  │ - AdminDashboard │  │  │ Services                 │  │
│  └──────┬───────────┘  │  │ - AuthService            │  │
│         │              │  │ - ProductService         │  │
│  ┌──────▼───────────┐  │  │ - CartService            │  │
│  │ Contexts         │  │  │ - OrderService           │  │
│  │ - AuthContext    │  │  └──────────┬───────────────┘  │
│  │ - CartContext    │  │             │                   │
│  └──────┬───────────┘  │  ┌──────────▼───────────────┐  │
│         │              │  │ Database (SQLite)        │  │
│  ┌──────▼───────────┐  │  │ - users                 │  │
│  │ Services         │  │  │ - products              │  │
│  │ - api.ts         │  │  │ - carts / cart_items    │  │
│  └──────────────────┘  │  │ - orders / order_items  │  │
│                        │  └──────────────────────────┘  │
└────────────────────────┴────────────────────────────────┘
```

## Features

### Authentication
- User registration and login
- JWT-based authentication (24h expiry)
- User profile management
- Role-based access control (admin/customer)

### Catalog
- Product listing with pagination
- Advanced filtering (category, brand, price range, stock status)
- Multiple sort options (price, rating, name, featured)
- Full-text search
- Product detail pages with ratings

### Shopping Cart
- Add/remove/update cart items
- Persistent cart tied to user account
- Real-time quantity updates
- Cart summary with totals

### Checkout
- Single-page checkout form
- Shipping information capture
- Order summary review
- Tax (10%) and shipping ($5.99) calculation

### Orders
- Order history with status tracking
- Detailed order view with line items
- Order status: pending → processing → shipped → delivered

### Admin
- Product management (CRUD)
- Order management and status updates
- Dashboard statistics

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend  | React 18, TypeScript 5, React Router 6 |
| HTTP Client | Axios |
| Backend | Node.js 22, Express 4 |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | express-validator |
| Logging | Morgan |

## Running the Application

### Backend
```bash
cd app-v1/backend
npm install
node src/database/seed.js   # Seed database
npm start                    # Start on port 3001
```

### Frontend
```bash
cd app-v1/frontend
npm install
npm start                    # Start on port 3000
```

### Test Accounts
- Admin: admin@shop.com / admin123
- Customer: user@shop.com / user123

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | - | Register user |
| POST | /api/auth/login | - | Login |
| GET | /api/auth/profile | ✓ | Get profile |
| PUT | /api/auth/profile | ✓ | Update profile |
| GET | /api/products | - | List products |
| GET | /api/products/:id | - | Get product |
| GET | /api/cart | ✓ | Get cart |
| POST | /api/cart/items | ✓ | Add to cart |
| PUT | /api/cart/items/:id | ✓ | Update cart item |
| DELETE | /api/cart/items/:id | ✓ | Remove cart item |
| POST | /api/orders | ✓ | Place order |
| GET | /api/orders | ✓ | Get orders |
| GET | /api/orders/:id | ✓ | Get order detail |
| GET | /api/admin/products | Admin | Admin products |
| POST | /api/admin/products | Admin | Create product |
| PUT | /api/admin/products/:id | Admin | Update product |
| DELETE | /api/admin/products/:id | Admin | Delete product |
| GET | /api/admin/stats | Admin | Dashboard stats |

## Database Schema

```sql
users (id, email, password_hash, name, role, phone, 
       address_line1, city, state, zip, country, created_at, updated_at)

products (id, name, description, price, category, brand, 
          stock_quantity, image_url, rating, review_count, 
          is_featured, is_active, created_at, updated_at)

carts (id, user_id, created_at, updated_at)

cart_items (id, cart_id, product_id, quantity, price_at_add, 
            created_at, updated_at)

orders (id, user_id, status, subtotal, tax, shipping_cost, total,
        shipping_name, shipping_email, shipping_address_line1,
        shipping_city, shipping_state, shipping_zip, shipping_country,
        notes, created_at, updated_at)

order_items (id, order_id, product_id, product_name, product_price, 
             quantity, subtotal)
```
