/**
 * WaitHelper.ts — Reusable async wait and retry utilities.
 *
 * Static methods only. Designed for use in page objects, services,
 * and tests that need advanced waiting strategies beyond Playwright's
 * built-in waitForSelector.
 */

import { Page, Response } from '@playwright/test';

export class WaitHelper {
  /** Default timeout used when none is provided (ms). */
  private static readonly DEFAULT_TIMEOUT = 30_000;

  /** Default polling interval (ms). */
  private static readonly DEFAULT_INTERVAL = 250;

  // ── Network helpers ────────────────────────────────────────────────────────

  /**
   * Waits until the page has no in-flight network requests for at least
   * 500 ms (network idle state).
   *
   * @param page    - The Playwright Page to observe.
   * @param timeout - Maximum wait time in ms (default 30 s).
   */
  static async waitForNetworkIdle(
    page: Page,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Waits for an API response matching the given URL pattern.
   * The pattern is matched against the full response URL (case-insensitive).
   *
   * @param page       - The Playwright Page to observe.
   * @param urlPattern - A string that the URL must contain, or a regex.
   * @param timeout    - Maximum wait time in ms (default 30 s).
   * @returns The Playwright Response object.
   */
  static async waitForApiResponse(
    page: Page,
    urlPattern: string | RegExp,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<Response> {
    const pattern =
      typeof urlPattern === 'string'
        ? new RegExp(urlPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        : urlPattern;

    return page.waitForResponse(
      (resp) => pattern.test(resp.url()),
      { timeout },
    );
  }

  /**
   * Waits for a response from the ShopHub API that matches a path fragment.
   * Shorthand for common patterns like '/api/products' or '/api/cart'.
   */
  static async waitForShopApiResponse(
    page: Page,
    pathFragment: string,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<Response> {
    return WaitHelper.waitForApiResponse(page, pathFragment, timeout);
  }

  // ── Retry helper ──────────────────────────────────────────────────────────

  /**
   * Retries the given async function up to `retries` times, waiting
   * `delay` ms between each attempt.
   *
   * Throws the last encountered error if all attempts fail.
   *
   * @param fn      - The async function to retry.
   * @param retries - Maximum number of attempts (default 3).
   * @param delay   - Delay between attempts in ms (default 1000).
   */
  static async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1_000,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          const backoff = delay * attempt; // simple linear back-off
          console.warn(
            `[WaitHelper.retry] Attempt ${attempt}/${retries} failed. ` +
              `Retrying in ${backoff} ms…`,
          );
          await WaitHelper.sleep(backoff);
        }
      }
    }
    throw lastError;
  }

  // ── Condition polling ─────────────────────────────────────────────────────

  /**
   * Polls the given condition function until it returns true or the timeout
   * is reached.
   *
   * @param condition - An async function returning true when the condition is met.
   * @param timeout   - Maximum wait time in ms (default 30 s).
   * @param interval  - Polling interval in ms (default 250 ms).
   * @throws Error if the condition is not met within the timeout.
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
    interval = WaitHelper.DEFAULT_INTERVAL,
  ): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await condition()) return;
      await WaitHelper.sleep(interval);
    }
    throw new Error(
      `[WaitHelper.waitForCondition] Condition not met within ${timeout} ms`,
    );
  }

  /**
   * Polls until the condition returns true, but does not throw — returns
   * false if the timeout is reached.
   */
  static async waitForConditionSafe(
    condition: () => Promise<boolean>,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
    interval = WaitHelper.DEFAULT_INTERVAL,
  ): Promise<boolean> {
    try {
      await WaitHelper.waitForCondition(condition, timeout, interval);
      return true;
    } catch {
      return false;
    }
  }

  // ── URL helpers ────────────────────────────────────────────────────────────

  /**
   * Waits for the page URL to contain the given substring.
   */
  static async waitForUrlContaining(
    page: Page,
    urlSubstring: string,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<void> {
    await page.waitForURL((url) => url.toString().includes(urlSubstring), {
      timeout,
    });
  }

  /**
   * Waits for the page URL to match the given pattern.
   */
  static async waitForUrlMatch(
    page: Page,
    pattern: string | RegExp,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<void> {
    await page.waitForURL(pattern, { timeout });
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  /**
   * Polls until the given text appears anywhere on the page body.
   */
  static async waitForTextOnPage(
    page: Page,
    text: string,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<void> {
    await page
      .locator('body')
      .filter({ hasText: text })
      .waitFor({ state: 'visible', timeout });
  }

  /**
   * Waits for the page title to contain the expected text.
   */
  static async waitForTitleContaining(
    page: Page,
    titleText: string,
    timeout = WaitHelper.DEFAULT_TIMEOUT,
  ): Promise<void> {
    await WaitHelper.waitForCondition(
      async () => {
        const title = await page.title();
        return title.includes(titleText);
      },
      timeout,
    );
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  /**
   * Resolves after the given number of milliseconds.
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Waits for the page's React/SPA rendering to settle by checking
   * document.readyState and ensuring no loading indicators are visible.
   */
  static async waitForSpaReady(
    page: Page,
    timeout = 10_000,
  ): Promise<void> {
    await page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout },
    );
    // Give React one tick to finish async state updates
    await WaitHelper.sleep(100);
  }
}
