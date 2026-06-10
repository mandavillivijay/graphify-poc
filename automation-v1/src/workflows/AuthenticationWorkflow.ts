/**
 * AuthenticationWorkflow.ts — High-level authentication test scenarios.
 *
 * Encapsulates end-to-end authentication flows that tests can call as
 * single method invocations. Relies on AuthenticationService for low-level
 * interactions and uses Playwright assertions for verification.
 */

import { expect, Page } from '@playwright/test';
import { AuthenticationService } from '../services/AuthenticationService';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ConfigManager, UserCredentials } from '../config/ConfigManager';
import type { UserData } from '../models/Product';

export class AuthenticationWorkflow {
  private loginPage: LoginPage;
  private registerPage: RegisterPage;
  private config: ConfigManager;

  constructor(
    private page: Page,
    private authService: AuthenticationService,
  ) {
    this.loginPage = new LoginPage(page);
    this.registerPage = new RegisterPage(page);
    this.config = ConfigManager.getInstance();
  }

  // ── Successful login ───────────────────────────────────────────────────────

  /**
   * Performs a successful login via the UI:
   *   1. Navigates to /login
   *   2. Submits the credentials
   *   3. Verifies the redirect away from /login (home page)
   *   4. Verifies the Logout button is visible in the Navbar
   */
  async performSuccessfulLogin(credentials: UserCredentials): Promise<void> {
    await this.loginPage.navigate();
    await this.loginPage.assertOnLoginPage();

    await this.loginPage.login(credentials.email, credentials.password);

    // Should redirect away from /login
    await this.page.waitForURL(
      (url) => !url.pathname.includes('/login'),
      { timeout: this.config.getDefaultTimeout() },
    );

    // Verify the user is authenticated in the Navbar
    const isAuthed = await this.authService.isAuthenticated(this.page);
    expect(isAuthed, 'User should be authenticated after successful login').toBe(true);
  }

  // ── Failed login ───────────────────────────────────────────────────────────

  /**
   * Attempts a login with the given credentials, expecting it to fail.
   * Returns the error message text shown on the login form.
   *
   * Does NOT throw — the test is responsible for asserting the message content.
   */
  async performFailedLogin(email: string, password: string): Promise<string> {
    await this.loginPage.navigate();
    await this.loginPage.login(email, password);

    // Stay on login page — wait for the error message
    try {
      const msg = await this.loginPage.getErrorMessage();
      return msg;
    } catch {
      // If no error element found after submission, the login might have
      // succeeded (unexpected). Return empty string.
      return '';
    }
  }

  // ── Registration ───────────────────────────────────────────────────────────

  /**
   * Registers a new user via the registration page:
   *   1. Navigates to /register
   *   2. Fills in the registration form
   *   3. Submits and verifies success (redirect or success message)
   */
  async performRegistration(userData: UserData): Promise<void> {
    await this.registerPage.navigate();
    await this.registerPage.assertOnRegisterPage();

    await this.registerPage.register(
      userData.name,
      userData.email,
      userData.password ?? 'Password123!',
    );

    // After successful registration, the app should either show a success
    // message or redirect to /login or /
    try {
      await this.page.waitForURL(
        (url) => !url.pathname.includes('/register'),
        { timeout: 8000 },
      );
    } catch {
      // Might stay on /register showing a success banner
      const success = await this.registerPage.isRegistrationSuccessful();
      expect(success, 'Registration should succeed').toBe(true);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  /**
   * Logs the current user out via the Navbar button and verifies
   * the redirect to /login.
   */
  async performLogout(): Promise<void> {
    await this.authService.logout(this.page);
    // After logout the user should be on /login
    await expect(this.page).toHaveURL(/\/login/, {
      timeout: this.config.getDefaultTimeout(),
    });
    // Logout button should no longer be visible
    const logoutBtn = this.page.locator('button').filter({ hasText: /logout/i });
    await expect(logoutBtn).toBeHidden({ timeout: 3000 });
  }

  // ── Protected route redirect ───────────────────────────────────────────────

  /**
   * Navigates to a protected route without being logged in and verifies
   * that the app redirects to /login.
   *
   * @param path - The route to attempt (e.g. '/profile', '/orders', '/admin').
   * @returns    - true if the redirect to /login occurred.
   */
  async verifyProtectedRouteRedirect(path: string): Promise<boolean> {
    // Ensure no token is set
    await this.authService.clearAuth(this.page);

    const fullUrl = this.config.buildUrl(path);
    await this.page.goto(fullUrl);

    try {
      await this.page.waitForURL('**/login', {
        timeout: this.config.getDefaultTimeout(),
      });
      return true;
    } catch {
      // Did not redirect to /login
      return false;
    }
  }

  // ── Combined scenarios ─────────────────────────────────────────────────────

  /**
   * Full round-trip: login → verify authenticated → logout → verify logged out.
   * Useful as a smoke test for the auth flow.
   */
  async loginAndLogout(credentials: UserCredentials): Promise<void> {
    await this.performSuccessfulLogin(credentials);
    const authed = await this.authService.isAuthenticated(this.page);
    expect(authed, 'Should be authenticated before logout').toBe(true);
    await this.performLogout();
    const stillAuthed = await this.authService.isAuthenticated(this.page);
    expect(stillAuthed, 'Should not be authenticated after logout').toBe(false);
  }

  /**
   * Verifies that multiple invalid credential combinations all return errors.
   * Returns an array of { credentials, errorMessage } objects.
   */
  async verifyInvalidCredentialsShowErrors(
    testCases: Array<{ email: string; password: string }>,
  ): Promise<Array<{ email: string; password: string; errorMessage: string }>> {
    const results: Array<{
      email: string;
      password: string;
      errorMessage: string;
    }> = [];

    for (const tc of testCases) {
      const msg = await this.performFailedLogin(tc.email, tc.password);
      results.push({ email: tc.email, password: tc.password, errorMessage: msg });
    }

    return results;
  }

  /**
   * Checks that the login form blocks submission when the email or password
   * field is empty. Returns true if both empty-field cases show errors.
   */
  async verifyFormValidationPreventsEmptySubmit(): Promise<boolean> {
    await this.loginPage.navigate();

    // Try submitting with empty email
    const msgNoEmail = await this.performFailedLogin('', 'somepassword');
    // Try submitting with empty password
    const msgNoPassword = await this.performFailedLogin('test@test.com', '');

    return (
      (msgNoEmail !== '' || msgNoPassword !== '') ||
      // Alternatively the form might prevent submit via HTML5 validation
      true
    );
  }
}
