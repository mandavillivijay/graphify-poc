/**
 * LoginPage — Page object for the ShopHub /login route.
 *
 * Covers the email/password login form, error feedback,
 * and the link to the registration page.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------

  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;
  private readonly registerLink: Locator;
  private readonly formHeading: Locator;
  private readonly rememberMeCheckbox: Locator;
  private readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"], .error-message, .error');
    this.registerLink = page.locator('a[href="/register"]');
    this.formHeading = page.locator('h1, h2').filter({ hasText: /login|sign in/i }).first();
    this.rememberMeCheckbox = page.locator('input[type="checkbox"][name="rememberMe"], input[type="checkbox"]#rememberMe');
    this.forgotPasswordLink = page.locator('a[href*="forgot"], a').filter({ hasText: /forgot/i }).first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/login';
  }

  // ---------------------------------------------------------------------------
  // Core actions
  // ---------------------------------------------------------------------------

  /**
   * Fills the login form and submits it.
   * @param email    - User email address.
   * @param password - User password.
   */
  async login(email: string, password: string): Promise<void> {
    await this.navigate();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitForm();
  }

  /**
   * Logs in with the configured admin credentials and waits for redirect.
   */
  async loginAsAdmin(): Promise<void> {
    const creds = this.config.getUserCredentials('admin');
    await this.login(creds.email, creds.password);
    await this.page.waitForURL(/\/(admin|$)/, { timeout: this.config.getDefaultTimeout() });
  }

  /**
   * Logs in with the configured customer credentials and waits for redirect.
   */
  async loginAsCustomer(): Promise<void> {
    const creds = this.config.getUserCredentials('customer');
    await this.login(creds.email, creds.password);
    // After login, most SPAs redirect to '/' or '/products'
    await this.page.waitForURL(/\/(?!login)/, { timeout: this.config.getDefaultTimeout() });
  }

  // ---------------------------------------------------------------------------
  // Field-level helpers
  // ---------------------------------------------------------------------------

  /**
   * Types into the email field.
   */
  async fillEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  /**
   * Types into the password field.
   */
  async fillPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Clicks the submit / "Sign In" button.
   */
  async submitForm(): Promise<void> {
    await this.clickWithRetry(this.submitButton);
  }

  // ---------------------------------------------------------------------------
  // Feedback / state queries
  // ---------------------------------------------------------------------------

  /**
   * Returns the text of the first visible error/alert message.
   * Throws if no error element is present.
   */
  async getErrorMessage(): Promise<string> {
    await this.waitForElement(this.errorMessage, 5000);
    return this.getTextContent(this.errorMessage);
  }

  /**
   * Returns true if an error/alert message is currently visible.
   */
  async isErrorDisplayed(): Promise<boolean> {
    return this.isVisible(this.errorMessage);
  }

  /**
   * Asserts that an error message containing the given text is shown.
   */
  async assertErrorContains(expectedText: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedText);
  }

  /**
   * Returns true if the submit button is enabled (i.e. the form can be submitted).
   */
  async isSubmitEnabled(): Promise<boolean> {
    return this.isEnabled(this.submitButton);
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Register" / "Create account" link.
   */
  async clickRegisterLink(): Promise<void> {
    await this.clickWithRetry(this.registerLink);
    await this.page.waitForURL('/register', { timeout: this.config.getDefaultTimeout() });
  }

  /**
   * Returns true if the register link is visible in the form footer.
   */
  async isRegisterLinkVisible(): Promise<boolean> {
    return this.isVisible(this.registerLink);
  }

  /**
   * Clicks the "Forgot password" link if it is available.
   */
  async clickForgotPasswordLink(): Promise<void> {
    await this.clickWithRetry(this.forgotPasswordLink);
  }

  // ---------------------------------------------------------------------------
  // Visibility assertions
  // ---------------------------------------------------------------------------

  /**
   * Asserts that the login page heading is visible — confirms we are on /login.
   */
  async assertOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
