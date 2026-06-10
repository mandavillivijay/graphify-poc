# ShopHub Architecture Documentation

## System Architecture

### Overview

ShopHub follows a classic three-tier architecture:

1. **Presentation Layer** — React TypeScript SPA
2. **Application Layer** — Express REST API
3. **Data Layer** — SQLite Database

### Component Interaction Diagram

```
Browser
  │
  ├── React SPA (localhost:3000)
  │     │
  │     ├── AuthContext ──────────────────────────────────────┐
  │     │     └── Manages: user state, JWT token              │
  │     │                                                     │
  │     ├── CartContext ──────────────────────────────────────┤
  │     │     └── Manages: cart state, item operations        │
  │     │                                                     │
  │     └── Pages / Components                               │
  │           │                                              │
  │           └── api.ts (axios) ─── HTTP/JSON ──────────────▼
  │                                                          │
  └── Express API (localhost:3001)                           │
        │                                                    │
        ├── Middleware                                       │
        │     ├── CORS                                       │
        │     ├── JSON body parser                           │
        │     ├── Morgan (logging)                           │
        │     └── JWT auth middleware                        │
        │                                                    │
        ├── Routes                                           │
        │     ├── /api/auth     → authService               │
        │     ├── /api/products → productService            │
        │     ├── /api/cart     → cartService               │
        │     ├── /api/orders   → orderService              │
        │     └── /api/admin    → admin handlers             │
        │                                                    │
        ├── Services                                         │
        │     ├── AuthService                               │
        │     ├── ProductService                            │
        │     ├── CartService                               │
        │     └── OrderService                              │
        │                                                    │
        └── SQLite Database (ecommerce.db)
```

### Backend Architecture

#### Layered Design

```
Request
  ↓
Router (routes/*.js)          ← HTTP method + path matching
  ↓
Middleware (middleware/*.js)   ← Auth, validation, logging
  ↓
Service (services/*.js)        ← Business logic
  ↓
Database (database/db.js)      ← SQLite queries
  ↓
Response
```

#### Key Design Decisions

**Services as Business Logic Containers:**
Each service owns a domain:
- `AuthService` — user registration, login, JWT management
- `ProductService` — catalog search, filtering, sorting, pagination
- `CartService` — cart lifecycle, item management, totals
- `OrderService` — order creation, status management, fulfillment

**Synchronous SQLite:**
`better-sqlite3` uses synchronous API, which is appropriate for a single-server SQLite setup and simplifies error handling. Prepared statements prevent SQL injection.

**JWT Authentication Flow:**
```
Login → Generate JWT (24h) → Store in client localStorage
       ↓
Every request → Authorization: Bearer <token>
       ↓
Middleware → Verify JWT → Attach req.user → Continue
```

### Frontend Architecture

#### Component Hierarchy

```
App.tsx (Router)
├── Navbar
│
├── Public Routes
│   ├── ProductListingPage
│   │   └── ProductCard (x N)
│   ├── ProductDetailPage
│   ├── LoginPage
│   └── RegisterPage
│
└── Protected Routes (ProtectedRoute HOC)
    ├── CartPage
    ├── CheckoutPage
    ├── OrderHistoryPage
    ├── OrderDetailPage
    ├── ProfilePage
    └── AdminDashboardPage
```

#### Context Architecture

```
AuthContext
├── state: { user, token, isLoading }
├── login(email, password) → calls POST /api/auth/login
├── logout() → clears token
├── register(data) → calls POST /api/auth/register
└── updateProfile(data) → calls PUT /api/auth/profile

CartContext (depends on AuthContext)
├── state: { cart, isLoading }
├── addToCart(productId, qty) → calls POST /api/cart/items
├── updateItem(itemId, qty) → calls PUT /api/cart/items/:id
├── removeItem(itemId) → calls DELETE /api/cart/items/:id
└── clearCart() → calls DELETE /api/cart
```

#### API Service Layer

The `api.ts` service creates an axios instance with:
1. Base URL `http://localhost:3001/api`
2. Request interceptor: injects `Authorization: Bearer <token>` from localStorage
3. Response interceptor: clears token and redirects on 401

### Data Flow Examples

#### Add to Cart Flow
```
User clicks "Add to Cart"
  → ProductCard component calls cartContext.addToCart(productId, 1)
  → CartContext calls api.cart.addItem({ productId, quantity: 1 })
  → axios POST /api/cart/items (with JWT)
  → auth middleware verifies token, attaches req.user
  → cart route calls cartService.addItem(userId, productId, qty)
  → cartService validates product exists + has stock
  → cartService gets or creates user's cart
  → cartService inserts cart_item row
  → returns updated cart
  → CartContext updates cart state
  → Navbar badge updates to show item count
```

#### Checkout Flow
```
User submits checkout form
  → CheckoutPage calls api.orders.createOrder(shippingData)
  → POST /api/orders (with JWT)
  → orderService.createFromCart(userId, shippingData)
    → validates cart has items
    → validates all items in stock
    → calculates subtotal, 10% tax, $5.99 shipping
    → creates order row
    → creates order_item rows (copies product data snapshot)
    → decrements product stock_quantity
    → clears user's cart
  → returns created order
  → CartContext refreshes (empty cart)
  → User sees success screen with order ID
```

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| SQL Injection | Prepared statements via better-sqlite3 |
| Password storage | bcrypt with cost factor 12 |
| Auth bypass | JWT verification on all protected routes |
| Privilege escalation | requireAdmin middleware on all admin routes |
| Input validation | express-validator on mutation endpoints |
| CORS | Configured for localhost:3000 in development |

### Scalability Notes

The current architecture is intentionally simple (SQLite, single server). In production:
- SQLite → PostgreSQL for concurrent access
- Sessions/JWT blacklist for logout invalidation
- Redis for cart session caching
- Image uploads → S3/CDN
- Separate worker for order processing emails
