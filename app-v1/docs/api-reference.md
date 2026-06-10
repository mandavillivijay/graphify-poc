# API Reference - ShopHub v1

## Base URL
`http://localhost:3001/api`

## Authentication
All protected endpoints require: `Authorization: Bearer <jwt_token>`

---

## Auth Endpoints

### POST /auth/register
Register a new user account.

**Request:**
```json
{ "name": "John Doe", "email": "john@example.com", "password": "password123" }
```
**Response:** `201`
```json
{ "token": "eyJ...", "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com", "role": "customer" } }
```

### POST /auth/login
Login with credentials.

**Request:**
```json
{ "email": "user@shop.com", "password": "user123" }
```
**Response:** `200`
```json
{ "token": "eyJ...", "user": { "id": "uuid", "name": "...", "email": "...", "role": "customer" } }
```

### GET /auth/profile *(auth required)*
Get current user profile.

**Response:** `200`
```json
{ "id": "uuid", "name": "...", "email": "...", "role": "customer", "phone": null, "addressLine1": null, ... }
```

### PUT /auth/profile *(auth required)*
Update profile fields.

**Request:** `{ "name"?, "phone"?, "addressLine1"?, "city"?, "state"?, "zip"?, "country"? }`

---

## Products Endpoints

### GET /products
List products with filtering, sorting, and pagination.

**Query Params:**
- `search` — full-text search
- `category` — filter by category
- `brand` — filter by brand
- `min_price`, `max_price` — price range
- `in_stock` — boolean
- `sort` — `price_asc|price_desc|rating|name|featured`
- `page` (default: 1), `limit` (default: 12)

**Response:** `200`
```json
{
  "products": [...],
  "pagination": { "page": 1, "limit": 12, "total": 45, "totalPages": 4 }
}
```

### GET /products/categories
Get list of unique product categories.

### GET /products/featured
Get featured products.

### GET /products/:id
Get single product by ID.

---

## Cart Endpoints *(all auth required)*

### GET /cart
Get current user's cart with items.

**Response:**
```json
{
  "id": "uuid",
  "items": [{ "id": "...", "productId": "...", "product": {...}, "quantity": 2, "priceAtAdd": 29.99 }]
}
```

### POST /cart/items
Add product to cart.

**Request:** `{ "productId": "uuid", "quantity": 1 }`

### PUT /cart/items/:itemId
Update cart item quantity.

**Request:** `{ "quantity": 3 }`

### DELETE /cart/items/:itemId
Remove item from cart.

### DELETE /cart
Clear entire cart.

---

## Orders Endpoints *(all auth required)*

### POST /orders
Create order from current cart.

**Request:**
```json
{
  "shippingName": "John Doe",
  "shippingEmail": "john@example.com",
  "shippingAddressLine1": "123 Main St",
  "shippingCity": "Springfield",
  "shippingState": "IL",
  "shippingZip": "62701",
  "shippingCountry": "US"
}
```

**Response:** `201` — Full order object with items and totals

### GET /orders
List current user's orders.

### GET /orders/:id
Get single order (must be current user's order).

---

## Admin Endpoints *(admin role required)*

### GET /admin/products
List all products including inactive.

### POST /admin/products
Create product.

**Request:** `{ name, description, price, category, brand, stockQuantity, imageUrl?, isFeatured? }`

### PUT /admin/products/:id
Update product fields.

### DELETE /admin/products/:id
Soft-delete product (sets is_active = false).

### GET /admin/orders
List all orders.

### PUT /admin/orders/:id/status
Update order status.

**Request:** `{ "status": "processing|shipped|delivered|cancelled" }`

### GET /admin/stats
Get dashboard statistics.

**Response:**
```json
{ "total_products": 20, "total_orders": 5, "total_users": 2, "revenue": 349.95 }
```
