/**
 * ProfilePage — Page object for the ShopHub /profile route.
 *
 * Covers the user profile form: name, email display, phone,
 * address fields, save action, and success/error feedback.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { ShippingData, UserData } from '../models/Product';

export class ProfilePage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Identity
  // ---------------------------------------------------------------------------

  readonly nameInput: Locator;
  readonly emailDisplay: Locator;
  readonly phoneInput: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Address
  // ---------------------------------------------------------------------------

  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipInput: Locator;
  readonly countryInput: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Actions & feedback
  // ---------------------------------------------------------------------------

  readonly saveButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    super(page);

    // Identity
    this.nameInput = page.locator('input[name="name"], #name').first();
    this.emailDisplay = page.locator('input[name="email"], #email, [aria-label*="email" i]').first();
    this.phoneInput = page.locator('input[name="phone"], #phone, input[placeholder*="phone" i]').first();

    // Address
    this.addressInput = page.locator('input[name="address_line1"], input[name="addressLine1"], #address').first();
    this.cityInput = page.locator('input[name="city"], #city, input[placeholder*="city" i]').first();
    this.stateInput = page.locator('input[name="state"], #state, input[placeholder*="state" i]').first();
    this.zipInput = page.locator('input[name="zip"], #zip, input[placeholder*="zip" i]').first();
    this.countryInput = page.locator('input[name="country"], #country, input[placeholder*="country" i]').first();

    // Actions & feedback
    this.saveButton = page.locator('button[type="submit"], button').filter({ hasText: /save|update/i }).first();
    this.successMessage = page.locator('[style*="f0fdf4"], .success-message, [class*="success"]').first();
    this.errorMessage = page.locator('[style*="fef2f2"], .error-message, [class*="error"]').first();
    this.validationErrors = page.locator(
      'p[style*="dc2626"], .field-error, .validation-error, [class*="error"]'
    );
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    // V2 CHANGE-5: Profile moved to /account (Account Center)
    return '/account';
  }

  async goto(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // Field getters
  // ---------------------------------------------------------------------------

  /**
   * Returns the current value of the name input.
   */
  async getName(): Promise<string> {
    await this.waitForElement(this.nameInput);
    return this.getInputValue(this.nameInput);
  }

  /**
   * Returns the email value (read-only in most profiles).
   */
  async getEmail(): Promise<string> {
    await this.waitForElement(this.emailDisplay);
    return this.getInputValue(this.emailDisplay).catch(() =>
      this.getTextContent(this.emailDisplay)
    );
  }

  /**
   * Returns the current phone number value.
   */
  async getPhone(): Promise<string> {
    try {
      await this.waitForElement(this.phoneInput, 3000);
      return this.getInputValue(this.phoneInput);
    } catch {
      return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Field setters
  // ---------------------------------------------------------------------------

  async fillName(name: string): Promise<void> {
    await this.fillInput(this.nameInput, name);
  }

  async fillPhone(phone: string): Promise<void> {
    await this.fillInput(this.phoneInput, phone);
  }

  async fillAddress(data: Partial<ShippingData>): Promise<void> {
    if (data.addressLine1) await this.fillInput(this.addressInput, data.addressLine1);
    if (data.city) await this.fillInput(this.cityInput, data.city);
    if (data.state) await this.fillInput(this.stateInput, data.state);
    if (data.zip) await this.fillInput(this.zipInput, data.zip);
    if (data.country) await this.fillInput(this.countryInput, data.country);
  }

  // ---------------------------------------------------------------------------
  // Profile update — composite methods
  // ---------------------------------------------------------------------------

  /**
   * Updates any subset of profile fields and clicks Save.
   */
  async updateProfile(data: Partial<UserData>): Promise<void> {
    if (data.name) await this.fillName(data.name);
    if (data.phone) await this.fillPhone(data.phone);
    if (data.addressLine1) await this.fillInput(this.addressInput, data.addressLine1);
    if (data.city) await this.fillInput(this.cityInput, data.city);
    if (data.state) await this.fillInput(this.stateInput, data.state);
    if (data.zip) await this.fillInput(this.zipInput, data.zip);
    if (data.country) await this.fillInput(this.countryInput, data.country);
    await this.save();
  }

  /**
   * Clicks the Save / Update Profile button.
   */
  async save(): Promise<void> {
    await this.clickWithRetry(this.saveButton);
    await this.page.waitForTimeout(400);
  }

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  /**
   * Waits for and returns the success message text.
   */
  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible', timeout: 6000 });
    return this.getTextContent(this.successMessage);
  }

  /**
   * Returns true when the success message is visible.
   */
  async isSuccessMessageVisible(): Promise<boolean> {
    return this.isVisible(this.successMessage);
  }

  /**
   * Returns all visible validation error messages.
   */
  async getValidationErrorMessages(): Promise<string[]> {
    try {
      await this.validationErrors.first().waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      return [];
    }
    return this.getAllTextContents(this.validationErrors);
  }

  /**
   * Returns the error message text if an error state is visible.
   */
  async getErrorMessageText(): Promise<string> {
    try {
      await this.waitForElement(this.errorMessage, 5000);
      return this.getTextContent(this.errorMessage);
    } catch {
      return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertOnProfilePage(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.saveButton).toBeVisible();
  }

  async assertSaveSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout: 5000 });
  }

  async assertNameEquals(expected: string): Promise<void> {
    const actual = await this.getName();
    expect(actual, `Expected name "${expected}", got "${actual}"`).toBe(expected);
  }

  async assertEmailEquals(expected: string): Promise<void> {
    const actual = await this.getEmail();
    expect(actual.toLowerCase(), `Expected email "${expected}"`).toContain(expected.toLowerCase());
  }
}
