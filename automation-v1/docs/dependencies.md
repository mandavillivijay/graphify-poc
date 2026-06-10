# Dependency Map — ShopHub Automation Framework v1

## Module Import Graph

### ConfigManager
**Imported by:** BasePage, ApiService, AuthenticationService, CartService, OrderService, ProductService, ShoppingJourneyWorkflow, CheckoutWorkflow, AuthenticationWorkflow, AdminWorkflow, fixtures.ts, globalSetup.ts, TestDataFactory
- **Fan-in (dependents): 13**
- **Fan-out (dependencies): 0** (leaf node / singleton)
- **Centrality: CRITICAL**

### ApiService  
**Imports:** ConfigManager
**Imported by:** AuthenticationService, CartService, OrderService, ProductService, fixtures.ts, orders tests, admin tests, full.regression.spec.ts
- **Fan-in: 9**
- **Fan-out: 1**
- **Centrality: HIGH**

### AuthenticationService
**Imports:** LoginPage, ApiService, ConfigManager
**Imported by:** fixtures.ts (authenticatedPage, adminPage fixtures), ShoppingJourneyWorkflow, CheckoutWorkflow, auth tests (13), checkout tests, regression tests
- **Fan-in: 12**
- **Fan-out: 3**
- **Centrality: HIGH**

### BasePage
**Imports:** ConfigManager
**Imported by:** LoginPage, RegisterPage, ProductListingPage, ProductDetailPage, CartPage, CheckoutPage, OrderHistoryPage, OrderDetailPage, ProfilePage, AdminDashboardPage
- **Fan-in: 10**
- **Fan-out: 1**
- **Centrality: HIGH (structural)**

### ProductListingPage
**Imports:** BasePage, ConfigManager
**Imported by:** ProductService, ShoppingJourneyWorkflow, fixtures.ts, catalog tests (12 tests)
- **Fan-in: 12**
- **Fan-out: 2**
- **Centrality: HIGH**

### CartPage
**Imports:** BasePage, ConfigManager
**Imported by:** CartService, ShoppingJourneyWorkflow, CheckoutWorkflow, fixtures.ts, cart tests (12), checkout tests (6), full.regression
- **Fan-in: 11**
- **Fan-out: 2**
- **Centrality: HIGH**

### CheckoutPage
**Imports:** BasePage, ConfigManager, ShippingData (models)
**Imported by:** CheckoutWorkflow, OrderService, fixtures.ts, checkout tests (13), order tests (9), full.regression
- **Fan-in: 11**
- **Fan-out: 3**
- **Centrality: HIGH**

### CheckoutWorkflow
**Imports:** CartPage, CheckoutPage, OrderHistoryPage, ConfigManager
**Imported by:** ShoppingJourneyWorkflow, fixtures.ts, checkout tests, orders tests, full.regression
- **Fan-in: 8**
- **Fan-out: 4**
- **Centrality: HIGH**

### ShoppingJourneyWorkflow
**Imports:** ProductListingPage, ProductDetailPage, CartPage, CheckoutWorkflow, OrderHistoryPage, OrderDetailPage, AuthenticationService, CartService, OrderService, ConfigManager
- **Fan-in: 7**
- **Fan-out: 10**
- **Centrality: HIGH (orchestrator)**

### OrderService
**Imports:** CartPage, CheckoutPage, CheckoutWorkflow, OrderHistoryPage, OrderDetailPage, ApiService, ConfigManager
**Imported by:** ShoppingJourneyWorkflow, fixtures.ts, order tests (6 files), full.regression
- **Fan-in: 8**
- **Fan-out: 7**
- **Centrality: HIGH**

### fixtures.ts
**Imports:** ALL pages, ALL services, ALL workflows
**Imported by:** ALL test files (14 files)
- **Fan-in: 14**
- **Fan-out: 18**
- **Centrality: CRITICAL**

---

## Subsystem Boundaries

### Authentication Subsystem
```
AuthenticationService
├── LoginPage
├── RegisterPage
└── ApiService (for loginViaApi)
```
Tests: auth.smoke.spec.ts, auth.regression.spec.ts (13 tests)

### Catalog Subsystem
```
ProductService
├── ProductListingPage
└── ProductDetailPage
└── ApiService (for createTestProduct)
```
Tests: products.smoke.spec.ts, products.regression.spec.ts (17 tests)

### Cart Subsystem
```
CartService
├── CartPage
└── ApiService (for setupCartViaApi)
```
Tests: cart.smoke.spec.ts, cart.regression.spec.ts (12 tests)

### Checkout Subsystem
```
CheckoutWorkflow
├── CartPage
├── CheckoutPage
└── OrderHistoryPage
```
Tests: checkout.smoke.spec.ts, checkout.regression.spec.ts (13 tests)

### Orders Subsystem
```
OrderService
├── CheckoutWorkflow
├── OrderHistoryPage
└── OrderDetailPage
```
Tests: orders.smoke.spec.ts, orders.regression.spec.ts (9 tests)

### Admin Subsystem
```
AdminWorkflow
├── AdminDashboardPage
└── ApiService
```
Tests: admin.smoke.spec.ts, admin.regression.spec.ts (9 tests)

---

## Change Impact Analysis

If a specific module changes, these other modules are affected:

| Changed Module | Directly Impacted | Transitively Impacted |
|---|---|---|
| ConfigManager | All (13) | All |
| CheckoutPage | CheckoutWorkflow, OrderService | ShoppingJourneyWorkflow, 13 test files |
| CartPage | CartService, CheckoutWorkflow | ShoppingJourneyWorkflow, 11 test files |
| ProductListingPage | ProductService | ShoppingJourneyWorkflow, 12 test files |
| CheckoutWorkflow | ShoppingJourneyWorkflow, OrderService | 8 test files |
| AuthenticationService | fixtures.ts | All 14 test files |
| fixtures.ts | — | All 14 test files |
| ApiService | AuthenticationService, CartService, OrderService | All stateful fixtures |

---

## Coupling Hotspots

### 1. CheckoutPage (Score: 22)
Appears in dependency chains: CartPage→CheckoutPage, CheckoutWorkflow→CheckoutPage, OrderService→CheckoutPage
**Risk:** Any checkout UI change (URL, form fields, submit button, confirmation) breaks CheckoutWorkflow, which breaks ShoppingJourneyWorkflow, which breaks all end-to-end tests.

### 2. fixtures.ts (Score: 32)
Central import point for all tests. 
**Risk:** Low (it's a composition root — it delegates, doesn't implement). Adding a new fixture is additive.

### 3. ShoppingJourneyWorkflow (Score: 17)
10 outgoing imports + 7 incoming.
**Risk:** HIGH. This workflow encodes the full shopping journey. If the cart → checkout → order flow changes, this workflow must be updated first before any of the 7 test suites that use it can pass.

### 4. AuthenticationService (Score: 15)
**Risk:** HIGH. Fast token injection (`injectAuthToken`) is used by all stateful test fixtures. If the app changes its auth token storage (localStorage key, format), every test with pre-auth breaks.
