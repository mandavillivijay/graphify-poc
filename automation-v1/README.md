# ShopHub Test Automation Framework v1

A comprehensive Playwright + TypeScript automation framework for the ShopHub e-commerce application.

## Quick Start

```bash
cd automation-v1
npm install
npx playwright install chromium

# Run all tests
npm test

# Run smoke tests only
npm run test:smoke

# Run regression tests
npm run test:regression

# Run with browser UI visible
npm run test:headed

# View HTML report
npm run report
```

## Prerequisites

- Node.js 18+
- ShopHub backend running: `cd ../app-v1/backend && npm start`
- ShopHub frontend running: `cd ../app-v1/frontend && npm start`

## Architecture

```
automation-v1/
├── src/
│   ├── config/
│   │   └── ConfigManager.ts          ← Singleton config, env vars, test data
│   ├── pages/                        ← Page Object Model
│   │   ├── BasePage.ts               ← Abstract base with shared utilities
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── ProductListingPage.ts     ← HIGH CENTRALITY
│   │   ├── ProductDetailPage.ts
│   │   ├── CartPage.ts               ← HIGH CENTRALITY
│   │   ├── CheckoutPage.ts           ← HIGH CENTRALITY
│   │   ├── OrderHistoryPage.ts
│   │   ├── OrderDetailPage.ts
│   │   ├── ProfilePage.ts
│   │   └── AdminDashboardPage.ts
│   ├── components/                   ← Reusable UI component abstractions
│   ├── services/                     ← Business-logic test services
│   │   ├── ApiService.ts             ← Direct HTTP API client
│   │   ├── AuthenticationService.ts  ← HIGH CENTRALITY
│   │   ├── CartService.ts
│   │   ├── OrderService.ts           ← HIGH CENTRALITY
│   │   └── ProductService.ts
│   ├── workflows/                    ← High-level scenario orchestration
│   │   ├── ShoppingJourneyWorkflow.ts ← HIGH CENTRALITY
│   │   ├── CheckoutWorkflow.ts        ← HIGH CENTRALITY
│   │   ├── AuthenticationWorkflow.ts
│   │   └── AdminWorkflow.ts
│   ├── validators/
│   │   ├── ProductValidator.ts
│   │   ├── OrderValidator.ts
│   │   └── CartValidator.ts
│   ├── models/
│   │   └── Product.ts               ← Shared TypeScript interfaces
│   ├── fixtures/
│   │   ├── fixtures.ts              ← Central Playwright fixture registry
│   │   └── globalSetup.ts           ← Pre-suite API health check
│   ├── reporting/
│   │   └── TestReporter.ts
│   └── utils/
│       ├── TestDataFactory.ts
│       ├── WaitHelper.ts
│       └── ScreenshotHelper.ts
│
└── tests/
    ├── smoke/
    │   └── critical.smoke.spec.ts    ← Critical path smoke tests
    ├── regression/
    │   └── full.regression.spec.ts   ← Cross-feature regression tests
    ├── authentication/
    │   ├── auth.smoke.spec.ts
    │   └── auth.regression.spec.ts
    ├── catalog/
    │   ├── products.smoke.spec.ts
    │   └── products.regression.spec.ts
    ├── cart/
    │   ├── cart.smoke.spec.ts
    │   └── cart.regression.spec.ts
    ├── checkout/
    │   ├── checkout.smoke.spec.ts
    │   └── checkout.regression.spec.ts
    ├── orders/
    │   ├── orders.smoke.spec.ts
    │   └── orders.regression.spec.ts
    └── admin/
        ├── admin.smoke.spec.ts
        └── admin.regression.spec.ts
```

## Test Suite Summary

| Suite | Tests | Tags |
|-------|-------|------|
| Critical Smoke | 3 | @smoke @critical |
| Authentication | 13 | @smoke @regression @auth |
| Product Catalog | 17 | @smoke @regression @catalog |
| Shopping Cart | 12 | @smoke @regression @cart |
| Checkout | 13 | @smoke @regression @checkout |
| Orders | 9 | @smoke @regression @orders |
| Admin | 9 | @smoke @regression @admin |
| Full Regression | 5 | @regression |
| **Total** | **81** | |

## Dependency Injection Architecture

All test fixtures are centrally defined in `src/fixtures/fixtures.ts`. Tests import `test` and `expect` from there:

```typescript
import { test, expect } from '../../src/fixtures/fixtures';

test('example', async ({ 
  productListingPage,   // ← injected page object
  authService,          // ← injected service
  shoppingJourney,      // ← injected workflow
  authenticatedPage     // ← injected stateful page (logged-in customer)
}) => {
  ...
});
```

## Configuration

Environment variables (all optional, defaults shown):

```bash
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
ADMIN_EMAIL=admin@shop.com
ADMIN_PASSWORD=admin123
CUSTOMER_EMAIL=user@shop.com
CUSTOMER_PASSWORD=user123
DEFAULT_TIMEOUT=30000
RETRIES=1
```

## High-Centrality Modules

These modules are imported by many other modules and are critical to maintain:

1. **ConfigManager** — 14 direct dependents (all services and pages)
2. **AuthenticationService** — 8 direct dependents (all stateful fixtures)
3. **OrderService** — Used by checkout workflow and 6 test files
4. **CheckoutWorkflow** — 11 test files depend on checkout behavior
5. **ShoppingJourneyWorkflow** — Used across smoke and regression suites

## Test Patterns

### Fast Setup via API
Tests that need pre-conditions (logged-in user, cart with items) use API-backed setup to avoid slow UI setup:

```typescript
// Fast: inject token, don't go through login UI
const token = await apiService.loginAsCustomer();
await authService.injectAuthToken(page, token);
await page.goto('/cart');
```

### Fixture-Based State
The `authenticatedPage`, `adminPage`, and `pageWithCart` fixtures provide pre-configured page states without repeating setup code in each test.
