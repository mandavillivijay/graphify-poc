/**
 * fixtures.ts — Central Playwright fixture hub for the ShopHub automation framework.
 *
 * ALL tests should import { test, expect } from '../fixtures/fixtures' instead of
 * from @playwright/test directly. This gives every test automatic access to:
 *
 *   Page fixtures   — pre-instantiated page objects
 *   Service fixtures — ApiService, AuthenticationService, CartService, OrderService
 *   Workflow fixtures — ShoppingJourneyWorkflow, CheckoutWorkflow
 *   State fixtures  — authenticatedPage, adminPage, pageWithCart
 *
 * High-level usage:
 *
 *   test('user can place an order', async ({ authenticatedPage, shoppingJourney }) => {
 *     const result = await shoppingJourney.completeShoppingJourney();
 *     expect(result.success).toBe(true);
 *   });
 */

import { test as base, expect, Page } from '@playwright/test';

// ── Page objects ──────────────────────────────────────────────────────────────
import { LoginPage } from '../pages/LoginPage';
import { ProductListingPage } from '../pages/ProductListingPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { RegisterPage } from '../pages/RegisterPage';

// ── Services ─────────────────────────────────────────────────────────────────
import { AuthenticationService } from '../services/AuthenticationService';
import { ApiService } from '../services/ApiService';
import { CartService } from '../services/CartService';
import { OrderService } from '../services/OrderService';
import { ProductService } from '../services/ProductService';

// ── Workflows ─────────────────────────────────────────────────────────────────
import { ShoppingJourneyWorkflow } from '../workflows/ShoppingJourneyWorkflow';
import { CheckoutWorkflow } from '../workflows/CheckoutWorkflow';
import { AuthenticationWorkflow } from '../workflows/AuthenticationWorkflow';
import { AdminWorkflow } from '../workflows/AdminWorkflow';

// ── Config ────────────────────────────────────────────────────────────────────
import { ConfigManager } from '../config/ConfigManager';

// ── Fixture type declarations ─────────────────────────────────────────────────

type PageFixtures = {
  /** Page object for /login */
  loginPage: LoginPage;
  /** Page object for /register */
  registerPage: RegisterPage;
  /** Page object for / (product listing) */
  productListingPage: ProductListingPage;
  /** Page object for /products/:id */
  productDetailPage: ProductDetailPage;
  /** Page object for /cart */
  cartPage: CartPage;
  /** Page object for /checkout */
  checkoutPage: CheckoutPage;
  /** Page object for /orders */
  orderHistoryPage: OrderHistoryPage;
  /** Page object for /orders/:id */
  orderDetailPage: OrderDetailPage;
  /** Page object for /profile */
  profilePage: ProfilePage;
  /** Page object for /admin */
  adminDashboardPage: AdminDashboardPage;
};

type ServiceFixtures = {
  /** Direct HTTP API client — use for fast setup/teardown without browser */
  apiService: ApiService;
  /** Handles UI and API-based login, logout, and token injection */
  authService: AuthenticationService;
  /** Manages cart via UI and API */
  cartService: CartService;
  /** Manages orders via UI and API */
  orderService: OrderService;
  /** Manages products via UI and API */
  productService: ProductService;
  /** Singleton application configuration */
  config: ConfigManager;
};

type WorkflowFixtures = {
  /** Full end-to-end shopping journey workflow */
  shoppingJourney: ShoppingJourneyWorkflow;
  /** Step-by-step checkout workflow with validation helpers */
  checkoutWorkflow: CheckoutWorkflow;
  /** Login, logout, registration, and protected-route workflows */
  authWorkflow: AuthenticationWorkflow;
  /** Admin product and order management workflows */
  adminWorkflow: AdminWorkflow;
};

type StateFixtures = {
  /** A Page pre-authenticated as the customer user (via fast token injection) */
  authenticatedPage: Page;
  /** A Page pre-authenticated as the admin user, opened at /admin */
  adminPage: Page;
  /** A Page authenticated as a customer with at least one product in the cart */
  pageWithCart: Page;
};

// ── Extended test with all fixture types ──────────────────────────────────────

export const test = base.extend<
  PageFixtures & ServiceFixtures & WorkflowFixtures & StateFixtures
>({
  // ── Page fixtures ────────────────────────────────────────────────────────────

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  productListingPage: async ({ page }, use) => {
    await use(new ProductListingPage(page));
  },

  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  orderHistoryPage: async ({ page }, use) => {
    await use(new OrderHistoryPage(page));
  },

  orderDetailPage: async ({ page }, use) => {
    await use(new OrderDetailPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  adminDashboardPage: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },

  // ── Service fixtures ──────────────────────────────────────────────────────────

  apiService: async ({}, use) => {
    const service = new ApiService();
    await use(service);
    // Teardown: clear any token that was set during the test
    service.clearToken();
  },

  authService: async ({ page }, use) => {
    await use(new AuthenticationService(page));
  },

  cartService: async ({}, use) => {
    await use(new CartService());
  },

  orderService: async ({}, use) => {
    await use(new OrderService());
  },

  productService: async ({ page, apiService }, use) => {
    await use(new ProductService(page, apiService));
  },

  config: async ({}, use) => {
    await use(ConfigManager.getInstance());
  },

  // ── Workflow fixtures ──────────────────────────────────────────────────────────

  shoppingJourney: async ({ page, config }, use) => {
    await use(new ShoppingJourneyWorkflow(page, config));
  },

  checkoutWorkflow: async ({ page, config }, use) => {
    await use(new CheckoutWorkflow(page, config));
  },

  authWorkflow: async ({ page, authService }, use) => {
    await use(new AuthenticationWorkflow(page, authService));
  },

  adminWorkflow: async ({ page }, use) => {
    await use(new AdminWorkflow(page));
  },

  // ── State fixtures ────────────────────────────────────────────────────────────

  /**
   * authenticatedPage:
   *   Provides a Page that is pre-authenticated as the customer user.
   *
   *   Setup:
   *     1. API login (no browser page load for login form)
   *     2. Token injected into localStorage
   *     3. Page navigated to the app root ('/')
   *
   *   Teardown:
   *     - Token cleared from localStorage
   */
  authenticatedPage: async ({ page, authService }, use) => {
    const config = ConfigManager.getInstance();

    // Navigate to base URL first so localStorage is scoped to the right origin
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });

    // Fast token-based authentication
    await authService.setupCustomerSession(page);

    // Navigate to home after auth
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });

    await use(page);

    // Teardown: clear auth state
    await authService.clearAuth(page).catch(() => {});
  },

  /**
   * adminPage:
   *   Provides a Page pre-authenticated as the admin user, opened at /admin.
   *
   *   Setup:
   *     1. API login as admin
   *     2. Token injected into localStorage
   *     3. Page navigated to /admin
   *
   *   Teardown:
   *     - Token cleared from localStorage
   */
  adminPage: async ({ page, authService }, use) => {
    const config = ConfigManager.getInstance();

    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.setupAdminSession(page);
    await page.goto(config.buildUrl('/admin'), { waitUntil: 'domcontentloaded' });

    await use(page);

    await authService.clearAuth(page).catch(() => {});
  },

  /**
   * pageWithCart:
   *   Provides a Page that is authenticated as a customer with at least one
   *   product already in the cart.
   *
   *   Setup:
   *     1. API login as customer → get token
   *     2. Fetch the first in-stock product via API
   *     3. Add it to cart via API (no browser interaction)
   *     4. Inject token into browser localStorage
   *     5. Navigate to /cart
   *
   *   Teardown:
   *     - Cart is cleared via API
   *     - Token cleared from localStorage
   */
  pageWithCart: async ({ page, apiService, authService }, use) => {
    const config = ConfigManager.getInstance();

    // Fast API setup — no browser page loads until we're ready
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    // Ensure cart is clean
    await apiService.clearCart().catch(() => {});

    // Find a product to add
    const products = await apiService.getProducts({
      in_stock: 'true',
      limit: '3',
    });

    if (products.length === 0) {
      throw new Error(
        'pageWithCart fixture: no in-stock products available. ' +
          'Ensure the backend is seeded.',
      );
    }

    // Add the first available product
    const product = products[0];
    await apiService.addToCart(product.id!, 1);

    // Inject auth into browser
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);

    // Navigate to cart
    await page.goto(config.buildUrl('/cart'), { waitUntil: 'domcontentloaded' });

    await use(page);

    // Teardown
    await apiService.clearCart().catch(() => {});
    await authService.clearAuth(page).catch(() => {});
    apiService.clearToken();
  },
});

// Re-export expect so tests only need a single import
export { expect };
