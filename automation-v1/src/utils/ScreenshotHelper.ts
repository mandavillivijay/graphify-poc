/**
 * ScreenshotHelper.ts — Utility class for capturing screenshots in tests.
 *
 * Provides full-page, element-level, and on-failure capture methods.
 * Screenshots are written to test-results/screenshots/ by default.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Locator, Page } from '@playwright/test';

export class ScreenshotHelper {
  /** Base output directory for all screenshots. */
  private static readonly BASE_DIR = 'test-results/screenshots';

  // ── Setup ──────────────────────────────────────────────────────────────────

  /**
   * Ensures the screenshots directory exists, creating it if needed.
   */
  private static ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ── File path helpers ──────────────────────────────────────────────────────

  /**
   * Returns an absolute path for a screenshot file.
   *
   * @param name      - Descriptive name (spaces replaced with hyphens).
   * @param subDir    - Optional sub-directory under the base dir.
   * @returns Absolute path ending in `.png`.
   */
  static getScreenshotPath(name: string, subDir?: string): string {
    const safeName = name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-_.]/g, '')
      .toLowerCase();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const fileName = `${safeName}-${timestamp}.png`;
    const dir = subDir
      ? path.join(ScreenshotHelper.BASE_DIR, subDir)
      : ScreenshotHelper.BASE_DIR;
    ScreenshotHelper.ensureDir(dir);
    return path.join(dir, fileName);
  }

  // ── Capture methods ────────────────────────────────────────────────────────

  /**
   * Captures a full-page screenshot.
   *
   * @param page - The Playwright Page to capture.
   * @param name - Descriptive name for the file.
   */
  static async captureFullPage(page: Page, name: string): Promise<void> {
    const filePath = ScreenshotHelper.getScreenshotPath(name, 'full-page');
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`[ScreenshotHelper] Full-page screenshot: ${filePath}`);
  }

  /**
   * Captures a screenshot of a specific element identified by the Locator.
   *
   * @param locator - Playwright Locator pointing to the element.
   * @param name    - Descriptive name for the file.
   */
  static async captureElement(locator: Locator, name: string): Promise<void> {
    const filePath = ScreenshotHelper.getScreenshotPath(name, 'elements');
    try {
      await locator.screenshot({ path: filePath });
      console.log(`[ScreenshotHelper] Element screenshot: ${filePath}`);
    } catch (err) {
      console.warn(
        `[ScreenshotHelper] Could not capture element screenshot "${name}": ${err}`,
      );
    }
  }

  /**
   * Captures a screenshot designed for test failure reporting.
   * The file is placed in a "failures" sub-directory and includes the test name.
   *
   * @param page     - The Playwright Page at time of failure.
   * @param testName - The name of the failing test.
   */
  static async captureOnFailure(page: Page, testName: string): Promise<void> {
    const filePath = ScreenshotHelper.getScreenshotPath(testName, 'failures');
    try {
      await page.screenshot({ path: filePath, fullPage: true });
      console.error(`[ScreenshotHelper] Failure screenshot saved: ${filePath}`);
    } catch (err) {
      console.error(
        `[ScreenshotHelper] Failed to capture failure screenshot: ${err}`,
      );
    }
  }

  /**
   * Captures a viewport-only (non-full-page) screenshot.
   * Useful for above-the-fold visual checks.
   */
  static async captureViewport(page: Page, name: string): Promise<void> {
    const filePath = ScreenshotHelper.getScreenshotPath(name, 'viewport');
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[ScreenshotHelper] Viewport screenshot: ${filePath}`);
  }

  /**
   * Captures a screenshot clipped to the given bounding box.
   *
   * @param page - Playwright Page.
   * @param name - Descriptive name.
   * @param clip - { x, y, width, height } in pixels.
   */
  static async captureClipped(
    page: Page,
    name: string,
    clip: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    const filePath = ScreenshotHelper.getScreenshotPath(name, 'clipped');
    await page.screenshot({ path: filePath, clip });
    console.log(`[ScreenshotHelper] Clipped screenshot: ${filePath}`);
  }

  // ── Diff / comparison helpers ──────────────────────────────────────────────

  /**
   * Returns the list of all screenshot files in the given sub-directory.
   * Useful for comparing before/after states.
   */
  static listScreenshots(subDir?: string): string[] {
    const dir = subDir
      ? path.join(ScreenshotHelper.BASE_DIR, subDir)
      : ScreenshotHelper.BASE_DIR;
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.png'))
      .map((f) => path.join(dir, f));
  }

  /**
   * Cleans up all screenshots in the base directory (or a sub-directory).
   * Only call this at the start of a test run if you want a clean slate.
   */
  static cleanScreenshots(subDir?: string): void {
    const dir = subDir
      ? path.join(ScreenshotHelper.BASE_DIR, subDir)
      : ScreenshotHelper.BASE_DIR;
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      fs.unlinkSync(path.join(dir, file));
    }
    console.log(
      `[ScreenshotHelper] Cleaned ${files.length} screenshot(s) from ${dir}`,
    );
  }
}
