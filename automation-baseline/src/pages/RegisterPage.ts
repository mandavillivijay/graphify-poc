/**
 * RegisterPage — Page object for the ShopHub /register route.
 *
 * Covers the new-account registration form with name, email,
 * password, confirm-password fields and all validation states.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export class RegisterPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------

  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;
  private readonly loginLink: Locator;
  private readonly successMessage: Locator;
  private readonly errorMessages: Locator;
  private readonly fieldErrors: Locator;
  private readonly formHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator(
      'input[name="name"], input[id="name"], input[placeholder*="name" i]'
    );
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page
      .locator('input[type="password"]')
      .first();
    this.confirmPasswordInput = page
      .locator('input[name="confirmPassword"], input[id="confirmPassword"], input[placeholder*="confirm" i]')
      .or(page.locator('input[type="password"]').nth(1));
    this.submitButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a[href="/login"]');
    this.successMessage = page.locator(
      '[role="status"], .success-message, .success, [class*="success"]'
    );
    this.errorMessages = page.locator('[role="alert"], .error-message, .error, [class*="error"]');
    this.fieldErrors = page.locator('.field-error, .input-error, [class*="field-error"], .invalid-feedback');
    this.formHeading = page.locator('h1, h2').filter({ hasText: /register|create account|sign up/i }).first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/register';
  }

  // ---------------------------------------------------------------------------
  // Core actions
  // ---------------------------------------------------------------------------

  /**
   * Completes and submits the registration form.
   * confirmPassword defaults to password when omitted.
   */
  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.navigate();
    await this.fillName(name);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword ?? password);
    await this.submitForm();
  }

  /**
   * Convenience overload that accepts a single data object.
   */
  async registerWithData(data: RegistrationData): Promise<void> {
    await this.register(
      data.name,
      data.email,
      data.password,
      data.confirmPassword ?? data.password
    );
  }

  // ---------------------------------------------------------------------------
  // Field-level helpers
  // ---------------------------------------------------------------------------

  async fillName(name: string): Promise<void> {
    await this.fillInput(this.nameInput, name);
  }

  async fillEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  async fillConfirmPassword(confirmPassword: string): Promise<void> {
    await this.fillInput(this.confirmPasswordInput, confirmPassword);
  }

  async submitForm(): Promise<void> {
    await this.clickWithRetry(this.submitButton);
  }

  // ---------------------------------------------------------------------------
  // Current field values
  // ---------------------------------------------------------------------------

  async getNameValue(): Promise<string> {
    return this.getInputValue(this.nameInput);
  }

  async getEmailValue(): Promise<string> {
    return this.getInputValue(this.emailInput);
  }

  // ---------------------------------------------------------------------------
  // Feedback queries
  // ---------------------------------------------------------------------------

  /**
   * Returns all visible validation error messages as an array of strings.
   */
  async getValidationErrors(): Promise<string[]> {
    const allErrors = this.errorMessages.or(this.fieldErrors);
    try {
      await allErrors.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      return [];
    }
    return this.getAllTextContents(allErrors);
  }

  /**
   * Returns true when any error message is visible on the page.
   */
  async hasValidationErrors(): Promise<boolean> {
    return this.isVisible(this.errorMessages);
  }

  /**
   * Returns the text of the first error message.
   */
  async getFirstErrorMessage(): Promise<string> {
    await this.waitForElement(this.errorMessages, 5000);
    return this.getTextContent(this.errorMessages.first());
  }

  /**
   * Returns true once the success/confirmation message appears
   * (indicating the account was created).
   */
  async isRegistrationSuccessful(): Promise<boolean> {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the success message text after a completed registration.
   */
  async getSuccessMessage(): Promise<string> {
    await this.waitForElement(this.successMessage, 5000);
    return this.getTextContent(this.successMessage);
  }

  /**
   * Returns true if the submit button is currently enabled.
   */
  async isSubmitEnabled(): Promise<boolean> {
    return this.isEnabled(this.submitButton);
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  /**
   * Asserts that the page is fully rendered with all expected form fields.
   */
  async assertOnRegisterPage(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Asserts that an error containing the given text is visible.
   */
  async assertErrorContains(text: string): Promise<void> {
    await expect(this.errorMessages).toBeVisible();
    await expect(this.errorMessages).toContainText(text);
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Log in" / "Sign in" link to switch back to the login page.
   */
  async clickLoginLink(): Promise<void> {
    await this.clickWithRetry(this.loginLink);
    await this.page.waitForURL('/login', { timeout: this.config.getDefaultTimeout() });
  }

  async isLoginLinkVisible(): Promise<boolean> {
    return this.isVisible(this.loginLink);
  }
}
