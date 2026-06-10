# Automation Framework Architecture

## Architectural Philosophy

The framework follows a layered dependency model where each layer depends only on layers below it:

```
Tests (top layer — consumes everything)
    ↓
Workflows (orchestrate multi-page scenarios)
    ↓
Services (domain business logic)
    ↓
Pages (UI interaction encapsulation)
    ↓
BasePage (shared utilities)
    ↓
Playwright API (bottom layer)
```

### ConfigManager sits outside this hierarchy and is a cross-cutting dependency:
```
ConfigManager ←── consumed by all layers
```

## Layer Descriptions

### Layer 1: BasePage
Abstract base class providing shared utilities:
- `navigate()` — go to page URL
- `waitForPageLoad()` — wait for network idle
- `clickWithRetry(locator, retries)` — resilient clicking
- `waitForElement(locator, timeout)` — explicit waits
- `takeScreenshot(name)` — capture evidence

All page objects extend BasePage.

### Layer 2: Page Objects
Thin wrappers around individual application pages. Each page object:
- Owns all locators for that page
- Exposes semantic action methods (`login()`, `addToCart()`, etc.)
- Does NOT contain test assertions (assertions live in tests)
- Does NOT chain across page boundaries

Page objects that are imported by many components are **high-centrality** nodes:

```
ProductListingPage → imported by: ProductService, ShoppingJourneyWorkflow, 
                                   catalog tests (12 tests)

CartPage           → imported by: CartService, ShoppingJourneyWorkflow,
                                   CheckoutWorkflow, cart tests (12 tests)

CheckoutPage       → imported by: CheckoutWorkflow, OrderService,
                                   checkout tests (13 tests), order tests (9 tests)
```

### Layer 3: Services
Business-logic test services that operate at domain level:

**ApiService** — Direct HTTP client for test setup/teardown:
```typescript
// Fast pre-condition setup
const token = await apiService.loginAsCustomer();
apiService.setToken(token);
await apiService.addToCart(productId, 2);
// Now run test, then teardown
await apiService.clearCart();
```

**AuthenticationService** — Manages auth state:
```typescript
// UI-based login (slow, tests the login flow)
await authService.loginViaUI(credentials);

// Token injection (fast, for tests that need auth but don't test login)
await authService.injectAuthToken(page, token);
```

**CartService**, **OrderService**, **ProductService** — Domain-specific operations.

### Layer 4: Workflows
High-level test scenario orchestration. Workflows compose pages and services:

```typescript
// ShoppingJourneyWorkflow orchestrates:
//   ProductListingPage → ProductDetailPage → CartPage → CheckoutPage → OrderHistoryPage
async completeShoppingJourney(options) {
  await this.productListingPage.search(options.searchTerm);
  await this.productListingPage.clickProductByName(matchedName);
  await this.productDetailPage.setQuantity(options.quantity);
  await this.productDetailPage.addToCart();
  await this.cartPage.navigate();
  return await this.checkoutWorkflow.completeCheckout(options.shipping);
}
```

### Layer 5: Tests
Test files use the fixture system for dependency injection. Tests should:
- Be declarative and readable
- Focus on assertions
- Delegate all setup to fixtures and workflows
- Use API-backed setup for speed where the setup itself is not under test

## Fixture Architecture

```
Playwright base test
        ↓
fixtures.ts (extends base test)
        ↓ provides:
        
Page Fixtures          Service Fixtures       Workflow Fixtures    State Fixtures
─────────────          ────────────────       ─────────────────    ──────────────
loginPage              apiService             shoppingJourney      authenticatedPage
productListingPage     authService            checkoutWorkflow     adminPage
productDetailPage      cartService            authWorkflow         pageWithCart
cartPage               orderService           adminWorkflow
checkoutPage           productService
orderHistoryPage       config
orderDetailPage
profilePage
adminDashboardPage
```

## Dependency Graph (Critical Paths)

```
ConfigManager
├── ApiService
│   ├── AuthenticationService (uses ApiService for loginViaApi)
│   ├── CartService (uses ApiService.setupCartViaApi)
│   ├── OrderService (uses ApiService.createOrderViaApi)
│   └── ProductService (uses ApiService.createTestProduct)
│
├── All Page Objects (BasePage reads config for baseUrl/timeout)
│
└── All Workflows (read config for test data/shipping defaults)

AuthenticationService
├── fixtures.ts (authenticatedPage, adminPage fixtures)
├── ShoppingJourneyWorkflow
├── CheckoutWorkflow
└── 22 test files (directly or via workflow)

CheckoutWorkflow
├── ShoppingJourneyWorkflow (delegates checkout step)
├── checkout.smoke.spec.ts
├── checkout.regression.spec.ts
├── orders.smoke.spec.ts
├── orders.regression.spec.ts
└── full.regression.spec.ts

OrderService
├── CheckoutWorkflow
├── ShoppingJourneyWorkflow
├── orders tests (6 files)
└── full.regression.spec.ts
```

## State Management in Tests

Tests are isolated via Playwright's browser context isolation. Each test gets a fresh browser context. State setup patterns:

### Pattern 1: Fixture-provided state
```typescript
test('cart test', async ({ pageWithCart }) => {
  // pageWithCart = fresh context + customer logged in + product in cart
  // No setup needed in the test
});
```

### Pattern 2: API pre-condition setup  
```typescript
test('order history test', async ({ page, apiService, authService }) => {
  const token = await apiService.loginAsCustomer();
  apiService.setToken(token);
  await apiService.createOrder(shippingData);  // fast API order creation
  await authService.injectAuthToken(page, token);
  await page.goto('/orders');
  // now test can verify order history
});
```

### Pattern 3: UI-based (for testing the flow itself)
```typescript
test('checkout creates order', async ({ pageWithCart, checkoutWorkflow }) => {
  const result = await checkoutWorkflow.completeCheckout();
  expect(result.success).toBe(true);
});
```

## High-Centrality Nodes

Based on import analysis, these are the most-imported modules. Changes to these files propagate widely:

| Module | Import Count | Propagation Risk |
|--------|-------------|-----------------|
| ConfigManager | 14 | HIGH |
| AuthenticationService | 12 | HIGH |  
| ApiService | 10 | HIGH |
| OrderService | 8 | HIGH |
| CheckoutWorkflow | 8 | HIGH |
| ShoppingJourneyWorkflow | 7 | HIGH |
| CartPage | 11 | HIGH |
| CheckoutPage | 11 | HIGH |
| ProductListingPage | 12 | HIGH |
| fixtures.ts | 14 | CRITICAL |

## Coupling Analysis

```
High coupling (by design):
- fixtures.ts → all pages, services, workflows (intentional DI hub)
- ShoppingJourneyWorkflow → all user-facing pages (intentional orchestrator)

Acceptable coupling:
- Services → ApiService (shared HTTP client)
- All → ConfigManager (shared config singleton)

Potential coupling risk:
- CheckoutPage is a dependency of 4 workflows + 5 test suites
  A checkout UI change will cascade through all of these
```
