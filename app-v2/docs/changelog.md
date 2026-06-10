# Changelog

All notable changes to ShopHub are documented in this file.

---

## [2.0.0] - 2026-06-10

### Added

- **FilterPanel component** (`src/components/FilterPanel.tsx`): Extracted filter sidebar into a standalone reusable component with `data-testid` attributes for test targeting. Supports multi-select categories.

- **SortControls component** (`src/components/SortControls.tsx`): Extracted sort controls into a standalone component. Renders sort buttons (Featured, Price ↑, Price ↓, Rating, Name A-Z) instead of a select dropdown.

- **Multi-step Checkout wizard**: `CheckoutPage.tsx` reimplemented as a 3-step wizard (Shipping → Payment → Review) with a visual step indicator. Steps have isolated containers with `data-testid` attributes.

- **Payment step (mock)**: Step 2 of checkout collects card details (number, expiry, CVV, name) with input IDs `card-number`, `card-expiry`, `card-cvv`, `card-name`.

- **OrderSummary component** (`src/components/OrderSummary.tsx`): Shared order totals display component, now used in CartPage, CheckoutPage, and OrderDetailPage. Props: `items`, `subtotal`, `tax`, `shipping`, `total`, `title`.

- **Guest checkout**: Unauthenticated users can checkout as guest at `/checkout`. Includes email input and mode toggle. Backend: `POST /api/orders/guest` endpoint (no auth required).

- **`guest_email` column on orders table**: Stores email for guest orders. `user_id` is now nullable for guest orders. Migration applies automatically on first startup.

- **AccountCenterPage** (`src/pages/AccountCenterPage.tsx`): New multi-tab account management page with "Profile", "Addresses", and "Security" tabs. Security tab is a placeholder.

- **Catalog dropdown in Navbar**: Click-triggered dropdown showing category links (All Products, Electronics, Clothing, Books, Home & Garden, Sports). Each links to `/?category=CATEGORY`.

- **User dropdown in Navbar**: Replaces standalone nav links with a dropdown showing My Account, My Orders, Logout. Visible when authenticated.

- **OrderManagementService** (`src/services/orderManagementService.js`): Unified backend service combining order and cart lifecycle operations. Methods: `getCartWithProducts`, `validateCartForCheckout`, `calculateOrderTotals`, `createOrderFromCart`, `createGuestOrder`, `updateOrderStatus`, `getOrderHistory`, `getAllOrders`, `getOrderById`.

### Changed

- **ProductListingPage**: Now uses `<FilterPanel />` and `<SortControls />` components. Category filter is multi-select. Sort uses buttons instead of a select.

- **CartPage**: Replaced inline totals with `<OrderSummary />` component.

- **OrderDetailPage**: Replaced inline cost breakdown with `<OrderSummary />` component.

- **App.tsx routing**: `/account` → `AccountCenterPage`, `/profile` → redirect to `/account`, `/checkout` no longer wrapped in `ProtectedRoute` (supports guest checkout).

- **Navbar**: Removed standalone "Orders" link (now in user dropdown). Added Catalog dropdown. Profile link replaced by "My Account" in user dropdown.

- **`src/routes/orders.js`**: Now uses `orderManagementService` instead of `orderService` directly.

- **`src/routes/cart.js`**: GET `/api/cart` now uses `orderManagementService.getCartWithProducts()`.

- **`src/services/orderService.js`**: Now a thin wrapper delegating all logic to `orderManagementService`.

- **`src/services/api.ts`**: Added `ordersApi.createGuestOrder()`. Fixed `createOrder()` to correctly wrap shipping data in the nested `shipping` object.

### Removed

- Standalone "Orders" nav link (moved to user dropdown)
- Standalone "Profile" nav link (replaced by "My Account" in user dropdown)
- Inline filter/sort UI from `ProductListingPage`
- Inline totals sections from `CartPage` and `OrderDetailPage`
- `ProfilePage.tsx` component (replaced by `AccountCenterPage.tsx`)

---

## [1.0.0] - 2026-06-05

### Added

- Initial release of ShopHub e-commerce application
- Product listing with search, filter, and sort
- Shopping cart with quantity management
- Single-page checkout with shipping form
- Order history and order detail pages
- User profile page
- Admin dashboard (product and order management)
- JWT-based authentication
- SQLite database via better-sqlite3
