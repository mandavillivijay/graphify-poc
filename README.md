# GraphifyPOC — Knowledge Graph-Assisted Test Automation Maintenance

A controlled experiment measuring whether an AST-based knowledge graph improves the efficiency of AI-assisted maintenance of a Playwright test automation framework during an application version upgrade.

---

## The Research Question

When an application changes, maintaining the test automation framework requires two phases of work:

1. **Discovery** — figure out which files in the framework are affected and why
2. **Implementation** — write the actual code changes

Standard discovery uses grep searches, manual file reading, and mental dependency tracing. This POC asks: **can a structural knowledge graph make discovery near-instant and eliminate the downstream costs of missed dependencies?**

---

## Experiment Design

### What Was Built

| Component | Description | Size |
|-----------|-------------|------|
| `app-v1/` | ShopHub — React + TypeScript SPA + Node.js/Express + SQLite backend | ~5,000 LOC |
| `app-v2/` | ShopHub with 7 architectural breaking changes | ~5,200 LOC |
| `automation-v1/` | Playwright + TypeScript framework targeting v1 | ~11,600 LOC, 69 tests |
| `automation-baseline/` | Framework migrated to v2 — **without Graphify** | Same 9 files changed |
| `automation-graphify/` | Framework migrated to v2 — **with Graphify** | Same 9 files changed |

### The 7 Breaking Changes in App V2

| # | Change | Automation Impact |
|---|--------|-------------------|
| 1 | Sort controls: `<select>` → button group with `data-testid="sort-btn-{value}"` | `ProductListingPage.sortBy()` rewrite |
| 2 | Checkout: single-page form → 3-step wizard (Shipping → Payment → Review) | `CheckoutPage` + `CheckoutWorkflow` major rewrite |
| 3 | Order summary extracted into shared `<OrderSummary>` component with new testids | `checkoutPage.getSubtotal/getTax/getShippingCost` locator updates |
| 4 | `/checkout` removed from `ProtectedRoute` (guest checkout added) | TC049 test logic inversion |
| 5 | `ProfilePage` at `/profile` → `AccountCenterPage` at `/account` | `ProfilePage.getUrl()` 1-line change + test URLs |
| 6 | Navbar: flat logout button → dropdown menu (`user-menu-btn`) | `AuthenticationService.logout()` rewrite |
| 7 | Backend: order routes refactored into `OrderManagementService` | No automation impact |

### Two Migration Runs — One Variable

The same migration task was performed twice:

- **Baseline (no graph):** grep searches + file reads + manual dependency tracing
- **Graphify:** 6 graph queries → impact map → open only the files being edited

Starting state was identical (tagged commit `v1-automation`). Target was identical (ShopHub v2). Required code changes were identical (verified post-experiment).

---

## Results

### Two-Way: Grep vs Graphify

| Metric | Grep (Baseline) | Graphify | Reduction |
|--------|:--------------:|:-------:|:--------:|
| Grep searches | 5 | 0 | 100% |
| Files opened for analysis | 9 | 0 | 100% |
| **Total files opened** | **18** | **5** | **72%** |
| **LOC inspected** | **4,102** | **1,529** | **63%** |
| **Tokens (discovery)** | **~39,900** | **~16,600** | **58%** |
| **Time elapsed** | **77 min** | **28 min** | **64%** |
| **Rework cycles** | **2** | **0** | **100%** |
| Files modified | 9 | 9 | 0% |
| Lines changed | ~879 | ~879 | 0% |
| Migration accuracy | 8/8 | 8/8 | 0% |

### Three-Way: Grep vs Vector Search (Cursor-style) vs Graphify

A second experiment simulated how a vector embedding-based IDE (Cursor) would perform the same discovery, using `all-MiniLM-L6-v2` with top-10 chunk retrieval across 7 queries — the same approach Cursor uses internally.

| Metric | Grep | Vector Search | Graphify |
|--------|:----:|:------------:|:--------:|
| Files retrieved | 18 | 24 | **5** |
| LOC loaded | 4,102 | 3,113 | **1,529** |
| **Tokens (discovery)** | **~39,900** | **~29,100** | **~16,600** |
| Missed needed files | 0\* | **4** | **0** |
| Rework cycles | 2 | unknown† | **0** |

\*Grep caught all files but required 2 rework cycles due to missed call chains.  
†Vector search missed 4 of 9 needed files outright — any migration using it would be incomplete without a second pass.

**Token reductions (all measured with consistent chars/4 method):**
- Grep → Graphify: **58% reduction**
- Vector → Graphify: **43% reduction**
- Vector vs Grep: Vector loads **27% fewer tokens** than grep — but misses 4 files

**The code changes were identical across all three approaches. Only the discovery path differed.**

---

## How Graphify Changed the Discovery Phase

### Baseline Discovery (29 minutes, 18 files)

```
1. Read migration notes (168 lines)
2. grep -rl "checkout|CheckoutPage|CheckoutWorkflow" → 10 files returned
3. grep -rl "profile|ProfilePage|/profile" → 6 files returned
4. grep -rl "sortBy|sortDropdown|selectOption" → 7 files returned
5. grep -rl "Orders|logout|Logout|navBar" → 15 files returned
6. Open each grep result to determine if a change is actually needed
7. 9 of 18 opened files needed NO changes — pure overhead
8. Missed that checkout.smoke.spec.ts calls checkoutPage.placeOrder() directly
   → discovered on first test run → 2 rework cycles
```

### Graphify Discovery (2 minutes, 0 analysis files)

```
1. graphify affected "CheckoutPage.ts" --depth 3
   → fixtures.ts, CheckoutWorkflow.ts, ALL 14 test files
   → Immediately shows checkout.smoke.spec.ts as a direct dependent

2. graphify path "CheckoutPage" "checkout.smoke.spec.ts"
   → CheckoutPage ← fixtures.ts ← checkout.smoke.spec.ts (2 hops)
   → Rework prevented before first file was touched

3. graphify explain "ProductListingPage"
   → Community 29: SortOption, SORT_LABEL_MAP alongside ProductListingPage
   → Points directly to sortBy() as the change point

4. graphify affected "ProfilePage.ts"
   → 15 nodes, including which test files reference /profile directly

5. graphify affected "AuthenticationService.ts"
   → logout() and isAuthenticated() consumers identified

6. graphify affected "OrderManagementService.ts"
   → 0 automation nodes affected → no changes needed
```

### The Rework Root Cause

The 2 baseline rework cycles were structurally predictable, not random. Grep finds files by string match but does not show call chains. `checkout.smoke.spec.ts` calls `checkoutPage.placeOrder()` directly (bypassing the workflow layer), but this isn't visible until tests fail at runtime. The Graphify `path` query surfaces this 2-hop import chain before any file is touched.

---

## The Knowledge Graph

Graphify extracts a structural knowledge graph from TypeScript AST — no LLM calls, no API cost.

```
Graph statistics (automation-v1):
  Nodes:       707
  Edges:     1,238
  Communities:  31
  Build time:  < 5 seconds
  API cost:    $0.00
```

### God Nodes (highest structural centrality)

| Node | Edge Count | Betweenness Centrality | Risk |
|------|:----------:|:----------------------:|------|
| `BasePage` | 45 | 0.108 | STRUCTURAL — all page objects inherit it |
| `ConfigManager` | 44 | 0.094 | CRITICAL — 12 modules depend on it |
| `ProductListingPage` | 44 | 0.080 | HIGH — bridges catalog to checkout path |
| `ApiService` | 44 | 0.077 | HIGH — all service layer consumers |
| `CheckoutPage` | 40 | 0.068 | HIGH — bridges to 5 workflows + 8 test files |

### Key Subsystem Boundaries (Community Detection)

```
Community  0: Auth fixtures — LoginPage, RegistrationData, fixtures.ts hub
Community  1: API Services — ApiService, CartService, OrderService
Community  4: Checkout Page — all locators and methods
Community 21: Checkout Workflow — bridges CheckoutPage to tests
Community 22: Shopping Journey Workflow — end-to-end orchestrator
Community 24: Config — ConfigManager, AppConfig, PaymentData, Users
Community 29: Product Listing — ProductListingPage, SortOption, SORT_LABEL_MAP
```

`fixtures.ts` is the dependency injection hub — all 14 test spec files import from it. If it breaks, 100% of tests fail.

---

## Automation Framework Architecture

The `automation-v1/` framework uses a layered architecture:

```
Tests (69 specs)
    ↓ imports from
fixtures.ts  ← Playwright fixture DI hub — single source for all objects
    ↓ provides
Workflow Layer        Page Object Layer       Service Layer
  ShoppingJourneyWorkflow  BasePage (abstract)    ApiService
  CheckoutWorkflow         ├── LoginPage           AuthenticationService
  AuthWorkflow             ├── ProductListingPage  CartService
  AdminWorkflow            ├── CheckoutPage        OrderService
                           ├── CartPage            ProductService
                           ├── ProfilePage
                           └── AdminDashboardPage
    ↓ all backed by
ConfigManager  ← singleton, all env vars, credentials, base URLs
```

**Key design decisions:**
- `BasePage` provides `clickWithRetry`, `fillInput`, `waitForElement` used by every page object
- `CheckoutWorkflow` orchestrates the multi-step checkout; tests that bypass it call page methods directly
- `fixtures.ts` is the only import path for tests — no direct page object instantiation in spec files

---

## Project Structure

```
GraphifyPOC/
├── app-v1/                     # ShopHub e-commerce app (original)
│   ├── backend/                # Node.js + Express + SQLite
│   │   └── src/
│   │       ├── routes/         # auth, products, cart, orders, admin
│   │       ├── services/       # authService, cartService, orderService, productService
│   │       ├── middleware/     # JWT auth, requireAdmin, optionalAuth
│   │       └── database/       # SQLite init + seed (2 users, 20 products)
│   └── frontend/               # React + TypeScript SPA
│       └── src/
│           ├── contexts/       # AuthContext, CartContext
│           ├── pages/          # 10 pages
│           ├── components/     # Navbar, ProductCard, ProtectedRoute, etc.
│           └── services/       # Axios API client with JWT interceptor
│
├── app-v2/                     # ShopHub v2 (7 architectural changes)
│   ├── MIGRATION_NOTES.md      # Full documentation of all changes + testid impacts
│   └── ...                     # Same structure, modified files
│
├── automation-v1/              # Playwright framework targeting v1 (baseline state)
│   ├── src/
│   │   ├── config/             # ConfigManager singleton
│   │   ├── pages/              # 10 page objects (BasePage + 9 specific)
│   │   ├── services/           # ApiService, AuthenticationService, CartService, OrderService
│   │   ├── workflows/          # ShoppingJourneyWorkflow, CheckoutWorkflow, AuthWorkflow, AdminWorkflow
│   │   └── fixtures/           # fixtures.ts (DI hub)
│   ├── tests/                  # 69 specs across 8 test suites
│   └── graphify-out/           # Knowledge graph (707 nodes, 1,238 edges)
│
├── automation-baseline/        # Framework migrated to v2 WITHOUT Graphify
│   └── src/ + tests/           # Same 9 files changed, 2 rework cycles required
│
├── automation-graphify/        # Framework migrated to v2 WITH Graphify
│   └── src/ + tests/           # Same 9 files changed, 0 rework cycles
│
├── vector-sim/                 # Vector search simulation (Cursor-style retrieval)
│   ├── simulate.js             # Embeds automation-v1 files, runs 7 queries, records results
│   └── package.json
│
└── reports/
    ├── baseline-results.md         # Phase 4: full discovery log, metrics, time breakdown
    ├── graphify-analysis.md        # Phase 5: graph stats, god nodes, communities, impact analysis
    ├── graphify-results.md         # Phase 6: graphify migration log and metrics
    ├── comparison.md               # Two-way metrics + ASCII charts + key findings
    ├── vector-search-results.md    # Three-way comparison including vector simulation
    ├── root-cause-analysis.md      # Why graphify helps: cascade problem mechanics
    ├── final-research-study.md     # 15-section executive research report
    └── linkedin-article.md         # Professional engineering write-up
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, React Router v6, Axios |
| Backend | Node.js, Express, SQLite (better-sqlite3), JWT, bcrypt |
| Automation | Playwright, TypeScript, Page Object Model |
| Graph Tool | [@sentropic/graphify](https://www.npmjs.com/package/@sentropic/graphify) v0.8.36 |
| Test Runner | Playwright Test with custom fixture DI |

---

## Running the Experiment Yourself

### Prerequisites

- Node.js 18+
- npm

### 1. Start the ShopHub v1 app

```bash
# Backend
cd app-v1/backend
npm install
npm start          # runs on http://localhost:3001

# Frontend (new terminal)
cd app-v1/frontend
npm install
npm start          # runs on http://localhost:3000
```

Default credentials: `admin@shop.com / admin123` · `user@shop.com / user123`

### 2. Run the v1 automation suite

```bash
cd automation-v1
npm install
npx playwright test
```

### 3. Start the ShopHub v2 app

```bash
# Same pattern — use app-v2/backend and app-v2/frontend
```

### 4. Compare the two migrated frameworks

The `automation-baseline/` and `automation-graphify/` directories contain identical end-state code. To see how they differ in the *discovery process*, read:

- `reports/baseline-results.md` — step-by-step log of the grep-based migration
- `reports/graphify-results.md` — step-by-step log of the graph-assisted migration
- `reports/comparison.md` — side-by-side metrics

### 5. Regenerate the knowledge graph

```bash
cd automation-v1
npx graphify update .
# Graph written to graphify-out/graph.json

# Query examples:
npx graphify affected "CheckoutPage.ts" --depth 3
npx graphify path "CheckoutPage" "checkout.smoke.spec.ts"
npx graphify explain "ProductListingPage"
```

---

## Key Findings in Plain Terms

**What Graphify changes is not what you write — it's what you have to read first.**

In the baseline, the developer spent 29 of 77 minutes just figuring out what was affected: running grep commands, opening files to see if they mattered, reading through code to mentally reconstruct the dependency chain. 9 of the 18 files opened needed zero changes.

With the graph, the same dependency information was available in 2 minutes and 6 commands. The developer opened files only to edit them.

The rework cycles (2 in baseline, 0 with Graphify) weren't mistakes — they were the predictable result of grep's fundamental limitation: it finds files that mention a string, but it doesn't show you who calls what. The test file that bypassed the workflow and called `checkoutPage.placeOrder()` directly was invisible until tests failed. The graph made it visible before the first file was touched.

At the scale of this experiment (5,000 LOC app, 70 tests), the absolute numbers are modest. The mechanism that produced them — eliminating exploratory reads — scales linearly with codebase size.

---

## Caveats

- Single-session, single-developer, controlled experiment
- Graph build and maintenance cost (~5 seconds per `graphify update .`) is not included in Graphify timings
- An expert who already has the codebase memorized would see a smaller baseline reduction
- The graph shows structure, not behavior — ambiguous semantic changes still require reading files

---

## Reports

| Report | Purpose |
|--------|---------|
| [`reports/comparison.md`](reports/comparison.md) | Primary two-way metrics comparison with ASCII charts |
| [`reports/vector-search-results.md`](reports/vector-search-results.md) | Three-way comparison including vector search simulation |
| [`reports/final-research-study.md`](reports/final-research-study.md) | Full 15-section research study |
| [`reports/graphify-analysis.md`](reports/graphify-analysis.md) | Knowledge graph deep-dive: nodes, communities, centrality |
| [`reports/baseline-results.md`](reports/baseline-results.md) | Baseline migration log with discovery narrative |
| [`reports/graphify-results.md`](reports/graphify-results.md) | Graphify migration log with query transcript |
| [`reports/root-cause-analysis.md`](reports/root-cause-analysis.md) | Why the differences occur mechanically |
| [`reports/linkedin-article.md`](reports/linkedin-article.md) | Publishable engineering write-up |

---

## Author

Vijay Mandavilli — [mvijayfromvizag@gmail.com](mailto:mvijayfromvizag@gmail.com)
