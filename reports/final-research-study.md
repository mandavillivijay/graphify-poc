# Knowledge Graph-Assisted Test Automation Maintenance: A Controlled Study

**Research Report — Phase 7**
**Date:** 2026-06-10
**Researcher:** Vijay Mandavilli
**Classification:** Proof of Concept — Single-Developer Experiment

---

## 1. Executive Summary

- A controlled experiment compared standard grep-based exploration against Graphify knowledge graph traversal for maintaining a Playwright test automation framework across an application version upgrade with 7 architectural changes.
- Graphify-assisted maintenance reduced time from 77 to 28 minutes (63.6% reduction), tokens from ~8,500 to ~2,800 (67.1% reduction), and LOC inspected from 3,849 to ~600 (84.4% reduction), while producing identical code changes and identical migration accuracy.
- The primary mechanism was the elimination of exploratory file reads: 18 files opened in the baseline versus 0 opened for analysis with Graphify (5 opened only to make edits).
- Rework was eliminated entirely (2 cycles in baseline, 0 with Graphify) because the dependency graph surfaced a direct import relationship that grep-based discovery missed until test execution.

---

## 2. Research Question

Can a static AST-derived knowledge graph reduce the time, token consumption, and error rate associated with maintaining test automation frameworks during application version upgrades, without compromising migration accuracy or requiring changes to the underlying test code?

---

## 3. Hypothesis

**Primary:** A developer using graph traversal queries will inspect fewer files and fewer lines of code than a developer using grep-based exploration, because the graph provides pre-computed dependency information that eliminates the need to read files for navigational purposes.

**Secondary:** Graph traversal will reduce or eliminate rework caused by missed transitive dependencies, because the graph captures complete import chains that are invisible to string-matching searches.

**Null hypothesis:** The discovery method will not affect total files modified, lines changed, or migration accuracy — only the path to arriving at those changes.

---

## 4. Methodology

### Experimental Design

A single automation maintenance task was performed twice under controlled conditions:

1. **Baseline (Phase 4):** Standard file exploration using grep searches, reading file contents, and manual dependency tracing. No graph tooling.
2. **Graphify-Assisted (Phase 6):** Knowledge graph queries used to identify all impacted files before any file was opened. Files opened only to make edits.

The starting state (automation-v1 codebase at a tagged commit) was identical for both phases. The target (ShopHub v2 with 7 changes) was identical. The developer (one person with comparable familiarity in both phases) performed both.

### What Was Measured

- Number of grep searches and graph queries
- Files opened and why (analysis vs. editing)
- Total LOC inspected (all content loaded into context)
- Estimated token consumption (input + output)
- Elapsed time by phase
- Rework cycles required
- Migration accuracy (8-point checklist against V2 changes)

### What Was Not Varied

- The application changes (same V2 codebase)
- The starting framework (same automation-v1)
- The required code changes (independently verified to be identical)
- The developer

---

## 5. Application Architecture

### ShopHub v1

ShopHub v1 was a standard e-commerce application built with React and TypeScript on the frontend and Node.js/Express with SQLite on the backend. The application was approximately 5,000 LOC and implemented core e-commerce functionality: user registration and authentication, product catalog with search and filtering, shopping cart, checkout with order placement, order history, and an admin dashboard for product and order management.

Key architectural characteristics: single-page checkout, route-based authentication guards (ProtectedRoute), a single Profile page at /profile, and a flat navbar with a visible logout button.

### ShopHub v2

ShopHub v2 introduced 7 architectural changes to the same application. Six of the seven changes had direct impact on the automation framework; one was a backend refactor with no automation impact. The changes represented real patterns seen in production application evolution: form flows becoming multi-step wizards, shared component extraction with new testid attributes, route restructuring, and navigation pattern changes.

---

## 6. Automation Architecture

### Framework Structure

The automation framework was built on Playwright with TypeScript and organized into four layers:

**Page Objects (src/pages/):** 10 page object classes extending BasePage. Each class encapsulates all locators and interaction methods for one application page. BasePage provides shared utilities (fillInput, clickWithRetry, waitForElement) and access to ConfigManager.

**Workflows (src/workflows/):** 3 workflow classes orchestrating multi-step user journeys. CheckoutWorkflow, ShoppingJourneyWorkflow, and AdminWorkflow compose page objects into reusable flows.

**Services (src/services/):** 4 service classes (ApiService, AuthenticationService, CartService, OrderService) providing API-level setup and teardown operations.

**Tests (tests/):** 69 test cases across 10 spec files organized by feature area. All tests depend on fixtures.ts, the Playwright fixture composition root that wires page objects and services into test contexts.

### Key Patterns

- Fixtures as dependency injection: `fixtures.ts` is the single point where all page objects, services, and workflows are instantiated and made available to tests
- Layered calls: most tests call workflow methods, not page object methods directly
- Type-safe selectors: locators defined as readonly class properties with explicit Playwright Locator types

### Scale

Total framework: ~11,600 LOC across 51 files. Graph representation: 707 nodes, 1,238 edges, 31 communities.

---

## 7. Application V2 Changes

| # | Change | Description | Automation Impact |
|---|--------|-------------|------------------|
| CHANGE-1 | ProductListingPage | Sort is now buttons (data-testid="sort-btn-*"), FilterPanel extracted as component with data-testid="category-checkbox-{slug}" | ProductListingPage.ts: sortBy() and filterByCategory() methods |
| CHANGE-2 | Checkout wizard | 3-step wizard (Shipping → Payment → Review). PlaceOrder moved to Step 3 | CheckoutPage.ts (major rewrite), CheckoutWorkflow.ts (major rewrite), all checkout tests |
| CHANGE-3 | OrderSummary component | Extracted as shared component with data-testid="summary-*" selectors | CheckoutPage.ts locators, checkout.regression.spec.ts assertions |
| CHANGE-4 | Guest checkout | /checkout no longer a ProtectedRoute; guest flow enabled | CheckoutPage.ts (guest methods), checkout.regression.spec.ts (TC049) |
| CHANGE-5 | Profile → /account | Profile page moved to /account (Account Center with tabs) | ProfilePage.ts (getUrl()), full.regression.spec.ts |
| CHANGE-6 | Navbar restructure | Logout now in user dropdown (user-menu-btn); catalog dropdown added | AuthenticationService.ts, auth.smoke.spec.ts |
| CHANGE-7 | OrderManagementService | Backend refactoring of order management logic | No automation impact |

---

## 8. Baseline Results

The baseline maintenance required 77 minutes, 5 grep searches, 18 files opened (10 full reads, 8 partial scans), and 3,849 LOC inspected. Nine files were modified with ~879 lines changed. Migration accuracy was 8/8.

Two rework cycles were required. Both resulted from a missed dependency: checkout.smoke.spec.ts imported CheckoutPage directly and called `placeOrder()` without going through CheckoutWorkflow. This was not visible from the grep results alone and was discovered only after test execution failure. The rework required re-opening the file, understanding the direct import pattern, and re-editing the affected test cases.

The baseline approach was systematic and representative of standard automation maintenance practice. All changes were ultimately correct. The overhead — 9 files read but not modified, 2 rework cycles, 49 extra minutes — was structural rather than accidental.

---

## 9. Graphify Results

The Graphify-assisted maintenance required 28 minutes, 6 graph queries, 0 files opened for analysis, and 5 files opened for editing (of the 9 total). LOC inspected was approximately 600. Nine files were modified with the same ~879 lines changed. Migration accuracy was 8/8. Rework was 0.

The 6 queries used were: `graphify affected "CheckoutPage.ts" --depth 3`, `graphify path "CheckoutPage" "checkout.smoke.spec.ts"`, `graphify affected "ProfilePage.ts" --depth 3`, `graphify explain "ProductListingPage"`, `graphify path "AuthenticationService" "auth.smoke.spec.ts"`, and `graphify explain "OrderSummary"`. Total query time was under 15 seconds.

The checkout direct-import cascade was discovered by Query 2 before any file was opened. The graph output identified that checkout.smoke.spec.ts imports CheckoutPage directly and calls placeOrder() at lines 31, 44, and 67. This information was incorporated into the editing pass, eliminating both rework cycles.

---

## 10. Comparative Analysis

| Metric | Baseline | Graphify | Change |
|--------|----------|---------|--------|
| Files opened (total) | 18 | 5 | -72.2% |
| LOC inspected | 3,849 | 600 | -84.4% |
| Estimated tokens | ~8,500 | ~2,800 | -67.1% |
| Time (minutes) | 77 | 28 | -63.6% |
| Rework cycles | 2 | 0 | -100% |
| Grep searches | 5 | 0 | -100% |
| Graph queries | 0 | 6 | +6 |
| Files modified | 9 | 9 | 0% |
| Lines changed | ~879 | ~879 | 0% |
| Migration accuracy | 8/8 | 8/8 | 0% |

The null hypothesis was confirmed: the code changes and accuracy were identical. The primary and secondary hypotheses were also confirmed: graph traversal reduced LOC inspection by 84.4% and eliminated all rework.

---

## 11. Root Cause Analysis

Three structural mechanisms produced the observed improvements.

**Mechanism 1 — Elimination of false-positive file reads.** Grep returns files by string match. In the baseline, 9 of 18 opened files required no changes. These false positives consumed approximately 1,446 LOC of reading overhead. Graph traversal using reverse dependency edges returns only true positives — files with a traceable import path to the changed node.

**Mechanism 2 — Compression of transitive dependency tracing.** Building the mental model "CheckoutPage → CheckoutWorkflow → ShoppingJourneyWorkflow → all tests" required opening and reading 3 intermediate files in the baseline. The graph query captured the same chain automatically in 2 seconds. The compression is proportional to dependency chain depth.

**Mechanism 3 — Call-site visibility without file reads.** The graph's edge metadata included line-number references for method calls. `graphify path "CheckoutPage" "checkout.smoke.spec.ts"` returned that placeOrder() was called at lines 31, 44, and 67 — specific enough to edit without reading the file for navigation. This is what prevented the rework that failed the baseline.

---

## 12. Threats to Validity

**Threat 1 — Single-developer experiment.** Both phases were performed by the same developer. Developer expertise, fatigue state, and pre-existing knowledge of the codebase could influence timing. Results may not generalize across developers with different familiarity levels.

**Threat 2 — Synthetic codebase.** ShopHub was purpose-built for this experiment. Real production codebases have accumulated technical debt, inconsistent naming, and legacy patterns that may reduce graph query precision or increase the number of queries needed.

**Threat 3 — Known change set.** The developer knew in advance that 7 changes were being tested. In a real maintenance scenario, the change set may be partial, undocumented, or discovered incrementally. Graph utility may differ when the starting point is ambiguous.

**Threat 4 — Small scale.** 69 tests and ~11,600 LOC is a small-to-medium framework. Scaling effects in either direction are not measured. The graph may be proportionally less useful in very small codebases (where the developer already knows the structure) or may be proportionally more useful in very large ones (where grep results are too voluminous to manually review).

**Threat 5 — Graph freshness assumption.** Both experiments used a known, tagged starting state where the graph was current. In a continuous development workflow, the graph must be kept updated. Stale graph results from an outdated graph could produce false negatives (missing affected nodes) that are worse than the baseline's false positives.

**Threat 6 — Timing methodology.** Time estimates are based on logged activity duration rather than objective instrumentation. Some timing variance is inherent in self-reported measurement.

---

## 13. Limitations

**Limitation 1 — The graph identifies scope, not solution.** Graph queries answer "which files are affected?" but not "what should change in those files?" Domain knowledge, migration documentation reading, and implementation judgment are required for the actual edits. The graph cannot replace this.

**Limitation 2 — AST graphs lack runtime semantics.** The graph captures import relationships and symbol references. It cannot distinguish between a critical runtime path and a utility import used in one edge case. A structural dependent is not always a behavioral dependent. Over-broad impact assessment is possible.

**Limitation 3 — Graph building requires discipline.** For the tool to be useful, `graphify update .` must be run after code changes. Teams that skip this step will have stale graphs. Building the update into CI is possible but adds pipeline complexity.

**Limitation 4 — Learning curve for query syntax.** The 6 queries used in this experiment are not intuitive to developers unfamiliar with graph concepts. `--depth 3` semantics, the difference between `affected` and `path` and `explain`, and the interpretation of community structure all require onboarding. The baseline approach requires no special tools.

---

## 14. Conclusions

**Conclusion 1:** A static AST-derived knowledge graph materially reduces the exploration overhead of automation maintenance tasks. In this experiment, the reduction was 84.4% in LOC inspected and 63.6% in total time. The mechanism is structurally sound and repeatable.

**Conclusion 2:** The improvement is concentrated in discovery, not implementation. The code changes themselves were identical in both conditions. Teams that already have expert knowledge of their framework structure will see smaller absolute improvements from graph tooling than teams navigating an unfamiliar or large codebase.

**Conclusion 3:** Dependency cascade completeness is the highest-value property of the graph. The rework elimination (2 cycles to 0) did not result from the graph being faster — it resulted from the graph being complete. Grep-based discovery is inherently incomplete for transitive import chains; graph traversal is inherently complete.

**Conclusion 4:** The experiment validates the core trade-off: graph maintenance overhead (build time, update discipline) in exchange for query efficiency gains at each maintenance event. For frameworks that undergo frequent application updates — a common pattern in active product development — the trade-off is favorable.

---

## 15. Recommendations

**Recommendation 1: Build the graph at framework initialization, not retroactively.**
The benefits of graph-assisted maintenance are proportional to the complexity of the codebase. Teams starting a new automation framework should run `graphify update .` as part of their initial setup and document the top god nodes (high-betweenness nodes) as architectural risk indicators.

**Recommendation 2: Prioritize graph queries for multi-file changes.**
Single-file changes with obvious impact do not benefit significantly from graph queries — the overhead of running a query may exceed the time saved. The benefit is largest when a change affects a central node (like CheckoutPage with 40 edges) where the impact fan-out is non-obvious.

**Recommendation 3: Treat god nodes as change risk indicators.**
The graph identified BasePage (45 edges), ConfigManager (44), and CheckoutPage (40) as structurally central nodes. Changes to these nodes should trigger mandatory impact review via `graphify affected`. This is a preventive maintenance policy, not a reactive one.

**Recommendation 4: Incorporate graph updates into CI.**
`graphify update .` runs in under 5 seconds at zero API cost (AST-only). Adding it as a post-commit hook or CI step ensures the graph is always current. Stale graphs are the primary operational risk of graph-assisted maintenance.

**Recommendation 5: Use graph community boundaries to scope test selection.**
The community structure identified 31 subsystems within the framework. Developers can use community membership as a fast heuristic for test suite partitioning: a change to a node in Community 4 (CheckoutPage) should run all tests in communities 4, 21, and 22 at minimum. This supports faster regression targeting without full suite execution.
