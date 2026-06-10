/**
 * BasePage — Abstract base class for all page objects.
 *
 * Provides common navigation helpers, wait utilities, and screenshot support
 * that every concrete page object inherits and can extend.
 */

import { expect, Locator, Page } from '@playwright/test';
import { ConfigManager } from '../config/ConfigManager';

export abstract class BasePage {
  protected page: Page;
  protected config: ConfigManager;
  protected baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.config = ConfigManager.getInstance();
    this.baseUrl = this.config.getBaseUrl();
  }

  // ---------------------------------------------------------------------------
  // Abstract contract — every page object must declare its route
  // ---------------------------------------------------------------------------

  /** Returns the relative URL path for this page (e.g. '/login'). */
  abstract getUrl(): string;

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Navigates to this page's URL and waits for the page to settle.
   */
  async navigate(): Promise<void> {
    const url = this.getUrl();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitForPageLoad();
  }

  /**
   * Waits for the page to reach a stable 'load' network-idle state.
   * Uses a short poll on `document.readyState` as a fallback guard.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Give React / SPA hydration a moment to settle
    await this.page.waitForFunction(() => document.readyState === 'complete', {
      timeout: this.config.getDefaultTimeout(),
    });
  }

  // ---------------------------------------------------------------------------
  // Page metadata
  // ---------------------------------------------------------------------------

  /** Returns the current browser tab title. */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /** Returns the current URL shown in the browser. */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  // ---------------------------------------------------------------------------
  // Screenshot
  // ---------------------------------------------------------------------------

  /**
   * Captures a PNG screenshot and saves it into the test-results directory.
   * @param name - Descriptive name; spaces are replaced with hyphens.
   */
  async takeScreenshot(name: string): Promise<void> {
    const safeName = name.replace(/\s+/g, '-').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `test-results/screenshots/${safeName}-${timestamp}.png`;
    await this.page.screenshot({ path, fullPage: true });
    console.log(`[Screenshot] Saved: ${path}`);
  }

  // ---------------------------------------------------------------------------
  // Wait helpers
  // ---------------------------------------------------------------------------

  /**
   * Waits for a locator to become visible within the given timeout.
   * @param locator  - The Playwright Locator to wait for.
   * @param timeout  - Optional override timeout in ms.
   */
  async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.getDefaultTimeout();
    await locator.waitFor({ state: 'visible', timeout: effectiveTimeout });
  }

  /**
   * Waits for a locator to be hidden/detached.
   * Useful for waiting on loading spinners to disappear.
   */
  async waitForElementHidden(locator: Locator, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.config.getDefaultTimeout();
    await locator.waitFor({ state: 'hidden', timeout: effectiveTimeout });
  }

  /**
   * Returns whether the locator is currently visible on the page.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    try {
      return await locator.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Returns whether the locator is currently enabled (not disabled).
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    try {
      return await locator.isEnabled();
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Interaction helpers
  // ---------------------------------------------------------------------------

  /**
   * Scrolls the viewport to bring a locator into view.
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Returns the trimmed inner text of a locator.
   * Throws a descriptive error if the element is not found.
   */
  async getTextContent(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    const text = await locator.textContent();
    if (text === null) {
      throw new Error(
        `[BasePage.getTextContent] Element found but returned null text: ${locator}`
      );
    }
    return text.trim();
  }

  /**
   * Returns the inner text of all elements matched by the locator.
   */
  async getAllTextContents(locator: Locator): Promise<string[]> {
    await locator.first().waitFor({ state: 'attached', timeout: this.config.getDefaultTimeout() });
    const texts = await locator.allTextContents();
    return texts.map((t) => t.trim());
  }

  /**
   * Clicks a locator with automatic retry on failure.
   * Useful for elements that are briefly detached after a re-render.
   *
   * @param locator  - Target locator.
   * @param retries  - Number of retry attempts (default 3).
   */
  async clickWithRetry(locator: Locator, retries = 3): Promise<void> {
    let lastError: Error | unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await locator.click({ timeout: this.config.getDefaultTimeout() });
        return;
      } catch (err) {
        lastError = err;
        console.warn(`[clickWithRetry] Attempt ${attempt}/${retries} failed. Retrying…`);
        await this.page.waitForTimeout(500 * attempt);
      }
    }
    throw new Error(
      `[clickWithRetry] All ${retries} attempts failed for locator: ${locator}\nLast error: ${lastError}`
    );
  }

  /**
   * Fills an input field after clearing its current value.
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Selects an option from a <select> element by its visible label text.
   */
  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.selectOption({ label });
  }

  /**
   * Selects an option from a <select> element by its value attribute.
   */
  async selectByValue(locator: Locator, value: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.selectOption({ value });
  }

  /**
   * Returns the current value of an input or textarea locator.
   */
  async getInputValue(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    return locator.inputValue();
  }

  /**
   * Presses a keyboard key while the given locator has focus.
   * @param locator  - Element to focus before pressing.
   * @param key      - Key name (e.g. 'Enter', 'Escape', 'Tab').
   */
  async pressKey(locator: Locator, key: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.press(key);
  }

  /**
   * Checks or unchecks a checkbox/toggle to reach the desired state.
   */
  async setCheckbox(locator: Locator, checked: boolean): Promise<void> {
    await this.waitForElement(locator);
    const current = await locator.isChecked();
    if (current !== checked) {
      await locator.click();
    }
  }

  // ---------------------------------------------------------------------------
  // Assertion helpers (wrap expect for re-use in page methods)
  // ---------------------------------------------------------------------------

  /** Asserts that the locator is visible. */
  async assertVisible(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeVisible();
  }

  /** Asserts that the locator is hidden. */
  async assertHidden(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeHidden();
  }

  /** Asserts that the locator contains the expected text. */
  async assertText(locator: Locator, expected: string): Promise<void> {
    await expect(locator).toContainText(expected);
  }
}
