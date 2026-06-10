/**
 * TestReporter.ts — In-memory test result accumulator and reporter.
 *
 * Collects TestResult objects during a run and can export a JSON summary
 * or print a formatted console report. Useful for custom reporting in
 * CI pipelines or for building custom Playwright reporters.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestResult {
  testName: string;
  suiteName?: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number; // milliseconds
  error?: string;
  retries: number;
  tags?: string[];
  screenshotPath?: string;
  startedAt?: string;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // total ms
  passRate: number; // 0–100
  startedAt: string;
  finishedAt: string;
}

// ---------------------------------------------------------------------------
// TestReporter
// ---------------------------------------------------------------------------

export class TestReporter {
  private results: TestResult[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  // ── Result collection ──────────────────────────────────────────────────────

  /**
   * Adds a single TestResult to the internal collection.
   */
  addResult(result: TestResult): void {
    this.results.push({
      ...result,
      startedAt: result.startedAt ?? new Date().toISOString(),
    });
  }

  /**
   * Returns all collected results.
   */
  getResults(): Readonly<TestResult[]> {
    return this.results;
  }

  /**
   * Returns only the failed test results.
   */
  getFailedResults(): TestResult[] {
    return this.results.filter((r) => r.status === 'failed');
  }

  /**
   * Returns only the passed test results.
   */
  getPassedResults(): TestResult[] {
    return this.results.filter((r) => r.status === 'passed');
  }

  /**
   * Returns only the skipped test results.
   */
  getSkippedResults(): TestResult[] {
    return this.results.filter((r) => r.status === 'skipped');
  }

  /**
   * Clears all collected results and resets the start time.
   */
  reset(): void {
    this.results = [];
    this.startTime = Date.now();
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  /**
   * Generates and returns a TestSummary object from all collected results.
   */
  generateSummary(): TestSummary {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const finishedAt = new Date().toISOString();
    const startedAt = new Date(this.startTime).toISOString();

    return {
      total,
      passed,
      failed,
      skipped,
      duration,
      passRate,
      startedAt,
      finishedAt,
    };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  /**
   * Exports all results and the summary to a JSON file at the given path.
   * Creates parent directories as needed.
   *
   * @param filepath - Absolute or relative path for the output JSON file.
   */
  exportToJson(filepath: string): void {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const summary = this.generateSummary();
    const output = {
      summary,
      results: this.results,
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`[TestReporter] Results exported to: ${filepath}`);
  }

  /**
   * Exports the summary only (without individual results) to a JSON file.
   */
  exportSummaryToJson(filepath: string): void {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const summary = this.generateSummary();
    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`[TestReporter] Summary exported to: ${filepath}`);
  }

  // ── Console output ─────────────────────────────────────────────────────────

  /**
   * Prints a formatted test run summary to stdout.
   *
   * Example output:
   * ```
   * ════════════════════════════════
   *   ShopHub Test Results
   * ════════════════════════════════
   *   Total:   12
   *   Passed:  10  (83%)
   *   Failed:   1
   *   Skipped:  1
   *   Duration: 45.2s
   * ════════════════════════════════
   * ```
   */
  printSummary(): void {
    const s = this.generateSummary();
    const durationSec = (s.duration / 1000).toFixed(1);
    const bar = '═'.repeat(36);

    console.log('');
    console.log(bar);
    console.log('  ShopHub Test Results');
    console.log(bar);
    console.log(`  Total:    ${s.total}`);
    console.log(`  Passed:   ${s.passed}  (${s.passRate}%)`);
    console.log(`  Failed:   ${s.failed}`);
    console.log(`  Skipped:  ${s.skipped}`);
    console.log(`  Duration: ${durationSec}s`);
    console.log(bar);

    if (s.failed > 0) {
      console.log('\n  Failed tests:');
      for (const r of this.getFailedResults()) {
        console.log(`  - ${r.suiteName ? `[${r.suiteName}] ` : ''}${r.testName}`);
        if (r.error) {
          const errorLines = r.error.split('\n').slice(0, 3);
          for (const line of errorLines) {
            console.log(`      ${line}`);
          }
        }
      }
    }

    console.log('');
  }

  /**
   * Prints a one-line status for a single test result.
   */
  printResult(result: TestResult): void {
    const icon = result.status === 'passed'
      ? 'PASS'
      : result.status === 'failed'
        ? 'FAIL'
        : 'SKIP';
    const durationSec = (result.duration / 1000).toFixed(2);
    const suite = result.suiteName ? `[${result.suiteName}] ` : '';
    console.log(`  ${icon}  ${suite}${result.testName}  (${durationSec}s)`);
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  /**
   * Returns the average test duration across all collected results.
   */
  getAverageDuration(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, r) => sum + r.duration, 0);
    return Math.round(total / this.results.length);
  }

  /**
   * Returns the slowest test result.
   */
  getSlowestTest(): TestResult | null {
    if (this.results.length === 0) return null;
    return this.results.reduce(
      (max, r) => (r.duration > max.duration ? r : max),
      this.results[0],
    );
  }

  /**
   * Returns all test results that had retries.
   */
  getFlakyTests(): TestResult[] {
    return this.results.filter((r) => r.retries > 0);
  }

  /**
   * Returns results grouped by suite name.
   */
  getResultsBySuite(): Record<string, TestResult[]> {
    const grouped: Record<string, TestResult[]> = {};
    for (const result of this.results) {
      const suite = result.suiteName ?? 'Unknown';
      if (!grouped[suite]) grouped[suite] = [];
      grouped[suite].push(result);
    }
    return grouped;
  }
}
