# ShopHub v2 — Migration Notes

This document describes all 7 architectural changes introduced in app-v2 relative to app-v1.

---

## CHANGE-1: ProductListingPage — Extract FilterPanel and SortControls Components

### What Changed
- Extracted inline filter sidebar into `src/components/FilterPanel.tsx`
- Extracted inline sort dropdown into `src/components/SortControls.tsx`
- `ProductListingPage.tsx` now composes `<FilterPanel />` and `<SortControls />` instead of rendering filter/sort UI inline
- Categories now support multi-select (array) rather than single-select
- Sort controls changed from a `<select>` dropdown to a group of `<button>` elements

### Why It Changed
Separation of concerns: FilterPanel and SortControls are independently testable, reusable components. The multi-select category model enables future AND/OR filter combinations.

### Impact on Automation Framework
- `[data-testid="filter-panel"]` — wrapper for the entire filter sidebar
- `[data-testid="sort-controls"]` — wrapper for sort buttons
- `[data-testid="sort-btn-{value}"]` — individual sort buttons (`featured`, `price_asc`, `price_desc`, `rating`, `name`)
- `[data-testid="clear-filters-btn"]` — appears only when filters are active
- Category checkboxes: `[data-testid="category-checkbox-{slug}"]`
- **Breaking**: Sort is no longer a `<select>` element — tests must click buttons not use `selectOption()`
- **Breaking**: The category filter is now multi-select checkboxes — tests must check/uncheck, not set a single value

---

## CHANGE-2: Multi-Step Checkout Wizard

### What Changed
- `CheckoutPage.tsx` replaced with a 3-step wizard at the same `/checkout` URL
- Step 1: Shipping form
- Step 2: Payment form (mock)
- Step 3: Review + Place Order
- Step indicator at top with labels "Shipping", "Payment", "Review"
- State managed with `useState<Step>(1)` and separate form state objects

### Why It Changed
Multi-step checkout reduces cognitive load and allows for form validation at each stage before proceeding. It also mirrors industry-standard e-commerce patterns.

### Impact on Automation Framework
- `[data-testid="checkout-step-indicator"]` — the 3-step progress indicator
- `[data-testid="step-indicator-{n}"]` — individual step circles
- `[data-testid="checkout-step-1"]` / `checkout-step-2` / `checkout-step-3` — step containers
- `[data-testid="step1-continue-btn"]` — advance to Step 2
- `[data-testid="step2-back-btn"]` / `step2-continue-btn` — Step 2 navigation
- `[data-testid="step3-back-btn"]` / `place-order-btn` — Step 3 navigation
- Payment fields: `id="card-number"`, `id="card-expiry"`, `id="card-cvv"`, `id="card-name"`
- **Breaking**: There is no longer a single-page form with a submit button — tests must navigate through 3 steps
- **Breaking**: The "Place Order" button is on Step 3, not Step 1

---

## CHANGE-3: Shared OrderSummary Component

### What Changed
- Created `src/components/OrderSummary.tsx` — reusable order totals component
- Props: `{ items, subtotal, tax, shipping, total, title? }`
- Used in: `CheckoutPage` (Step 3), `CartPage`, `OrderDetailPage`
- Removed duplicated totals rendering from CartPage and OrderDetailPage

### Why It Changed
DRY principle — three pages were rendering near-identical totals HTML. A shared component ensures consistent display and reduces maintenance burden.

### Impact on Automation Framework
- `[data-testid="order-summary"]` — shared component wrapper (appears in Cart, Checkout, Order Detail)
- `[data-testid="order-summary-items"]` — line items list
- `[data-testid="order-summary-totals"]` — totals section
- `[data-testid="summary-subtotal"]` / `summary-tax` / `summary-shipping` / `summary-total`
- Tests can now target `[data-testid="order-summary"]` consistently across all three pages
- **Breaking**: The exact HTML structure of the totals section changed in CartPage and OrderDetailPage

---

## CHANGE-4: Guest Checkout Support

### What Changed
- `CheckoutPage` Step 1 includes a "Checkout as guest / Sign In" toggle when user is not authenticated
- Guest email input (`[data-testid="guest-email-input"]`) visible when guest mode is selected
- New backend endpoint: `POST /api/orders/guest` (no authentication required)
  - Request: `{ guestEmail, cartItems: [{productId, quantity}], shipping: {...} }`
  - Creates order with `user_id = NULL`, stores `guest_email`
- `guest_email` column added to `orders` table in `db.js`
- Migration code auto-adds column to existing databases on startup

### Why It Changed
Reduces checkout friction — users should not be forced to create an account to make a purchase.

### Impact on Automation Framework
- `/checkout` is no longer a `ProtectedRoute` — tests can navigate to it without auth
- `[data-testid="checkout-mode-toggle"]` — the guest/member toggle UI
- `[data-testid="checkout-as-guest-btn"]` / `checkout-as-member-btn`
- `[data-testid="guest-email-input"]` — guest email field
- New API endpoint testable: `POST /api/orders/guest`
- **Breaking**: `/checkout` no longer redirects to `/login` when unauthenticated

---

## CHANGE-5: Profile → Account Center

### What Changed
- New page: `src/pages/AccountCenterPage.tsx` (component name `AccountCenterPage`)
- Route changed from `/profile` to `/account`
- `/profile` now redirects to `/account` (backwards compatible)
- Account Center has 3 tabs: "Profile", "Addresses", "Security"
- "Security" tab is a placeholder showing "Change password coming soon"
- Navbar links to `/account` instead of `/profile`

### Why It Changed
The single profile form was insufficient for an e-commerce account management page. Tabs provide space for multiple account management concerns (profile, addresses, security) without clutter.

### Impact on Automation Framework
- URL changed: `/profile` → `/account` (redirect exists for old URL)
- `[data-testid="account-center-tabs"]` — the tab bar
- `[data-testid="tab-profile"]` / `tab-addresses` / `tab-security` — individual tabs
- `[data-testid="security-placeholder"]` — security tab content
- Navbar: user dropdown `[data-testid="user-menu-account"]` links to `/account`
- **Breaking**: The component file name and exported name changed
- **Breaking**: Tests targeting `/profile` directly will work via redirect, but DOM selectors changed

---

## CHANGE-6: Navigation Structure Update

### What Changed
- `Navbar.tsx` now includes:
  1. **Catalog dropdown** (`[data-testid="catalog-dropdown-btn"]`) — on click, shows category links
  2. **User dropdown** (`[data-testid="user-menu-btn"]`) — when logged in, shows: My Account, My Orders, Logout
  3. Standalone "Orders" link removed (moved into user dropdown)
  4. Cart icon remains as standalone link with badge

### Why It Changed
Navigation at scale requires grouping. The Catalog dropdown supports the new URL-based category filtering (`/?category=Electronics`). The user dropdown reduces the number of top-level nav items.

### Impact on Automation Framework
- `[data-testid="catalog-dropdown-btn"]` — must be clicked to reveal catalog menu
- `[data-testid="catalog-dropdown-menu"]` — the dropdown panel
- `[data-testid="catalog-link-{slug}"]` — individual category links
- `[data-testid="user-menu-btn"]` — must be clicked to reveal user menu
- `[data-testid="user-dropdown-menu"]` — the user menu panel
- `[data-testid="user-menu-account"]` / `user-menu-orders` / `user-menu-logout`
- `[data-testid="nav-cart-link"]` — cart icon link
- **Breaking**: There is no standalone "Orders" link in the nav bar — tests must open the user dropdown first
- **Breaking**: There is no standalone "Profile" link — replaced by "My Account" in user dropdown

---

## CHANGE-7: Order Management API Refactoring

### What Changed
- New file: `src/services/orderManagementService.js` — a class-based unified service
  - Methods: `getCartWithProducts`, `validateCartForCheckout`, `calculateOrderTotals`, `createOrderFromCart`, `createGuestOrder`, `updateOrderStatus`, `getOrderHistory`, `getOrderById`, `getAllOrders`
- `src/routes/orders.js` now imports `orderManagementService` instead of `orderService`
- `src/routes/cart.js` GET handler now calls `orderManagementService.getCartWithProducts()` instead of `cartService.getCart()`
- `src/services/orderService.js` is now a thin facade delegating to `orderManagementService`
- Admin route (`src/routes/admin.js`) unchanged — uses `orderService` which delegates automatically

### Why It Changed
Consolidating order and cart lifecycle operations in one place improves testability, reduces duplication, and makes the system easier to extend (e.g., adding cart-to-order validation logic without touching multiple files).

### Impact on Automation Framework
- API surface is unchanged — same endpoints, same request/response shapes
- The guest order endpoint (`POST /api/orders/guest`) is powered by `orderManagementService.createGuestOrder`
- No breaking changes for API-level tests
- **Note**: `orderManagementService` is a singleton instance (module-level `new OrderManagementService()`)
