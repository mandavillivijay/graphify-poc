/**
 * AuthenticationService.ts — High-level authentication helper.
 *
 * HIGH-CENTRALITY SERVICE: consumed by fixtures (authenticatedPage, adminPage)
 * and by AuthenticationWorkflow. Provides both fast API-based token injection
 * and full UI-driven login flows.
 */

import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ApiService } from './ApiService';
import { ConfigManager, UserCredentials } from '../config/ConfigManager';

export class AuthenticationService {
  private loginPage: LoginPage;
  private apiService: ApiService;
  private config: ConfigManager;

  constructor(page: Page) {
    this.loginPage = new LoginPage(page);
    this.apiService = new ApiService();
    this.config = ConfigManager.getInstance();
  }

  // ── UI-driven login ────────────────────────────────────────────────────────

  /**
   * Navigates to /login, fills in the form with the provided credentials,
   * and submits it. Waits for the redirect away from /login.
   */
  async loginViaUI(credentials: UserCredentials): Promise<void> {
    await this.loginPage.login(credentials.email, credentials.password);
    await this.loginPage['page'].waitForURL(
      (url) => !url.pathname.includes('/login'),
      { timeout: this.config.getDefaultTimeout() },
    );
  }

  /**
   * Full UI login as the configured admin user.
   */
  async loginAsAdminViaUI(): Promise<void> {
    const creds = this.config.getUserCredentials('admin');
    await this.loginViaUI(creds);
  }

  /**
   * Full UI login as the configured customer user.
   */
  async loginAsCustomerViaUI(): Promise<void> {
    const creds = this.config.getUserCredentials('customer');
    await this.loginViaUI(creds);
  }

  // ── API-driven login (fast path) ───────────────────────────────────────────

  /**
   * Calls the auth API directly to obtain a JWT token without loading any page.
   * Returns the token string.
   */
  async loginViaApi(credentials: UserCredentials): Promise<string> {
    return this.apiService.login(credentials);
  }

  /**
   * Fast API login as the configured admin user. Returns the JWT token.
   */
  async loginAsAdminViaApi(): Promise<string> {
    const creds = this.config.getUserCredentials('admin');
    return this.apiService.login(creds);
  }

  /**
   * Fast API login as the configured customer user. Returns the JWT token.
   */
  async loginAsCustomerViaApi(): Promise<string> {
    const creds = this.config.getUserCredentials('customer');
    return this.apiService.login(creds);
  }

  // ── Token injection ────────────────────────────────────────────────────────

  /**
   * Injects a JWT token into the page's localStorage so the React app
   * treats the user as authenticated without navigating to /login.
   */
  async injectAuthToken(page: Page, token: string): Promise<void> {
    await page.evaluate((t: string) => {
      localStorage.setItem('token', t);
      // Some SPA frameworks also check sessionStorage
      sessionStorage.setItem('token', t);
    }, token);
  }

  /**
   * Removes the auth token from localStorage and sessionStorage,
   * effectively logging the user out from the browser's perspective.
   */
  async clearAuth(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    });
  }

  // ── Logout via UI ──────────────────────────────────────────────────────────

  /**
   * Logs out via the Navbar.
   * V2 CHANGE-6: Logout is now inside the user dropdown menu.
   * Must open [data-testid="user-menu-btn"] first, then click [data-testid="user-menu-logout"].
   */
  async logout(page: Page): Promise<void> {
    // V2: try user dropdown logout first
    const userMenuBtn = page.locator('[data-testid="user-menu-btn"]');
    const userMenuVisible = await userMenuBtn.isVisible().catch(() => false);
    if (userMenuVisible) {
      await userMenuBtn.click();
      const logoutMenuItem = page.locator('[data-testid="user-menu-logout"]');
      await logoutMenuItem.waitFor({ state: 'visible', timeout: 5000 });
      await logoutMenuItem.click();
      await page.waitForURL('**/login', { timeout: this.config.getDefaultTimeout() });
      return;
    }

    // Fallback for V1 (direct logout button in nav)
    const logoutButton = page.locator('button').filter({ hasText: /logout/i }).first();
    const isVisible = await logoutButton.isVisible().catch(() => false);
    if (isVisible) {
      await logoutButton.click();
      await page.waitForURL('**/login', { timeout: this.config.getDefaultTimeout() });
    } else {
      await this.clearAuth(page);
      await page.goto(this.config.buildUrl('/login'));
    }
  }

  // ── Authentication state checks ────────────────────────────────────────────

  /**
   * Returns true when the user appears authenticated.
   * V2 CHANGE-6: Logout is in the user dropdown — check for [data-testid="user-menu-btn"].
   */
  async isAuthenticated(page: Page): Promise<boolean> {
    try {
      const userMenuBtn = page.locator('[data-testid="user-menu-btn"]');
      const v2Visible = await userMenuBtn.isVisible({ timeout: 2000 });
      if (v2Visible) return true;
      // Fallback: V1-style direct logout button
      const logoutBtn = page.locator('button').filter({ hasText: /logout/i }).first();
      return await logoutBtn.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  /**
   * Checks whether a JWT token exists in localStorage.
   */
  async hasLocalStorageToken(page: Page): Promise<boolean> {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    return !!token;
  }

  // ── Fast session setup ─────────────────────────────────────────────────────

  /**
   * Fast-path customer session setup:
   *   1. Calls the API to get a token (no browser navigation).
   *   2. Injects the token into localStorage.
   *   3. Navigates to the app root so the React app picks up the token.
   *
   * Use this in fixtures that need a pre-authenticated page without spending
   * time on UI login.
   */
  async setupCustomerSession(page: Page): Promise<void> {
    const token = await this.loginAsCustomerViaApi();
    // Navigate to base URL first so localStorage is on the right origin
    const currentUrl = page.url();
    if (!currentUrl.startsWith(this.config.getBaseUrl())) {
      await page.goto(this.config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    }
    await this.injectAuthToken(page, token);
    // Reload so the app reads the token from localStorage
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Fast-path admin session setup:
   *   1. API login as admin.
   *   2. Token injection.
   *   3. Reload.
   */
  async setupAdminSession(page: Page): Promise<void> {
    const token = await this.loginAsAdminViaApi();
    const currentUrl = page.url();
    if (!currentUrl.startsWith(this.config.getBaseUrl())) {
      await page.goto(this.config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    }
    await this.injectAuthToken(page, token);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Returns the ApiService instance (useful when callers need to make
   * additional API calls after setting up a session).
   */
  getApiService(): ApiService {
    return this.apiService;
  }
}
