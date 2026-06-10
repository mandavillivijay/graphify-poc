# Phase 5: Graphify Analysis Report
## ShopHub Automation Framework v1 — Knowledge Graph

**Date:** 2026-06-10  
**Tool:** @sentropic/graphify v0.8.36  
**Target:** automation-v1/ (Playwright + TypeScript framework)  
**Command used:** `graphify update .` (AST-only extraction, zero API/LLM cost)

---

## Graph Statistics

| Metric | Value |
|--------|-------|
| **Total Nodes** | 707 |
| **Total Edges** | 1,238 |
| **Communities** | 31 |
| **Files extracted** | 51 |
| **Extraction method** | 100% AST-extracted (0% inferred) |
| **Import cycles** | None detected |
| **Build time** | < 5 seconds |
| **LLM API cost** | $0.00 (AST-only) |
| **Graph density** | 1,238 / (707 × 706 / 2) = **0.00496** |

---

## God Nodes (Most Connected — Core Abstractions)

| Rank | Node | Edge Count | Community | Betweenness Centrality |
|------|------|-----------|-----------|------------------------|
| 1 | `BasePage` | 45 | 10 | 0.108 (HIGHEST) |
| 2 | `ConfigManager` | 44 | 12 | 0.094 |
| 3 | `ProductListingPage` | 44 | 3 | 0.080 |
| 4 | `ApiService` | 44 | 1 | 0.077 |
| 5 | `CheckoutPage` | 40 | 4 | 0.068 |
| 6 | `ProductDetailPage` | 38 | 5 | 0.061 |
| 7 | `ProductData` | 37 | — | 0.052 |
| 8 | `CartPage` | 37 | 6 | 0.051 |
| 9 | `OrderDetailPage` | 28 | 11 | 0.038 |
| 10 | `RegisterPage` | 26 | 13 | 0.031 |

**Key insight:** `BasePage` and `ConfigManager` are the two most structurally central nodes. Changes to either propagate to virtually every page object and service in the framework.

---

## Community Structure

| Community | Nodes | Cohesion | Primary Members |
|-----------|-------|---------|----------------|
| 0 | 10 | 0.050 | Auth fixtures, LoginPage, RegistrationData |
| 1 | 6 | 0.060 | ApiService, CartService, OrderService, validators |
| 2 | 4 | 0.084 | ProductService, ProductValidator, AdminWorkflow |
| 4 | — | — | CheckoutPage (isolated checkout page cluster) |
| 6 | — | — | CartPage methods cluster |
| 8 | 26 | 0.070 | Documentation + coupling hotspots analysis |
| 17 | 17 | 0.110 | Architecture docs, high-centrality descriptions |
| 19 | 9 | 0.200 | Domain models: ShippingData, CartItem, OrderItem |
| 21 | — | — | CheckoutWorkflow cluster |
| 22 | — | — | ShoppingJourneyWorkflow cluster |
| 24 | 9 | 0.170 | ConfigManager: AppConfig, PaymentData, Users |
| 29 | 4 | 0.290 | ProductListingPage: SortOption, SORT_LABEL_MAP |

**Key insight:** Communities 21 (CheckoutWorkflow) and 22 (ShoppingJourneyWorkflow) form the "orchestration layer" — they bridge page objects to tests. Community 4 (CheckoutPage) has high cross-community edges, explaining its high betweenness centrality.

---

## Dependency Clusters

### Cluster 1: Checkout Subsystem
```
CheckoutPage (community 4)
  └── CheckoutWorkflow (community 21)
        └── ShoppingJourneyWorkflow (community 22)
              └── fixtures.ts (community 0)
                    └── All 14 test files
```
**Impact radius:** Any CheckoutPage change propagates to 18 downstream nodes.

### Cluster 2: Authentication Subsystem
```
LoginPage → AuthenticationService → fixtures.ts
                                          └── All test files
```
**Impact radius:** 15 nodes.

### Cluster 3: Config Cross-Cutting
```
ConfigManager ← BasePage ← All 10 page objects
             ← ApiService ← 4 services
             ← All workflows
```
**Impact radius:** 44 direct edges (cross-cutting dependency).

---

## Hotspots and High-Centrality Nodes

### Critical Change Risk (sorted by impact radius)

| Node | Direct Dependents | Transitive Depth | Risk Level |
|------|------------------|-----------------|-----------|
| `fixtures.ts` | All 14 test files | 1 | **CRITICAL** |
| `ConfigManager` | 12 modules | 2 | **CRITICAL** |
| `AuthenticationService` | 3 workflows + 12 tests | 2 | **HIGH** |
| `CheckoutPage` | CheckoutWorkflow + 8 test files | 3 | **HIGH** |
| `CartPage` | CartService + 11 test files | 2 | **HIGH** |
| `ProductListingPage` | ProductService + 12 tests | 2 | **HIGH** |
| `BasePage` | All 10 page objects | 1 | **STRUCTURAL** |

### Cross-Community Bridges (Betweenness Centrality)

Nodes with high betweenness serve as bridges between subsystems:

1. **BasePage** (centrality 0.108) — bridges community 10 (base utilities) to 14 other communities (all page objects). Removing BasePage would disconnect the entire framework.

2. **ProductListingPage** (centrality 0.080) — bridges community 3 to 6 other communities. Central to the product discovery → cart → checkout path.

3. **CheckoutPage** (centrality 0.068) — bridges community 4 to 5 other communities. The checkout-to-order transition point.

---

## Impact Analysis for V2 Changes

Using `graphify affected <node> --depth 3` for each V2 change:

### CHANGE-2: CheckoutPage affected 18 nodes
```
graphify affected "CheckoutPage.ts" --depth 3
→ fixtures.ts, CheckoutWorkflow.ts, OrderService.ts, ShoppingJourneyWorkflow.ts
→ ALL 14 test spec files (via fixtures.ts)
```
**Graph instantly identifies:** The change propagates to ALL tests via the fixtures hub — no grep needed.

### CHANGE-5: ProfilePage affected 15 nodes
```
graphify affected "ProfilePage.ts" --depth 3
→ fixtures.ts
→ All 14 test files
```
**Graph reveals:** ProfilePage is imported into fixtures.ts, which cascades to everything. The actual URL-change impact is only 2 test files, but the graph correctly shows the structural reach.

### CHANGE-1: ProductListingPage affected nodes
```
graphify explain "ProductListingPage" 
→ Community 29 contains SortOption, SORT_LABEL_MAP (sort internals)
→ Used by ProductService, ShoppingJourneyWorkflow
```
**Graph reveals:** The sort data structures (SortOption type, SORT_LABEL_MAP) are in community 29 alongside ProductListingPage — pointing directly to the sortBy() method as the change point.

### Dependency Path: Application Change → Test Impact
```
graphify path "CheckoutPage" "checkout.smoke.spec.ts"
→ CheckoutPage <--imports-- fixtures.ts <--imports_from-- checkout.smoke.spec.ts
2 hops
```

---

## Coupling Risks Identified by Graph

1. **fixtures.ts fan-in = 14 test files.** All tests depend on it. If fixtures.ts has an error, 100% of tests fail. (This is by design — it's the DI container — but worth monitoring.)

2. **CheckoutPage fan-out = 5 workflows/services.** A checkout UI change cascade-breaks checkout, orders, shopping journey, and full regression tests.

3. **BasePage betweenness = 0.108.** BasePage methods (fillInput, clickWithRetry, waitForElement) are called by every page object. If a Playwright API breaking change hits BasePage, all 10 page objects need updates.

4. **ConfigManager is a silent singleton.** 12 modules import ConfigManager. It appears in every constructor. If the config schema changes (e.g., new environment variable naming), every module breaks.

---

## Subsystem Boundaries (from Community Detection)

```
┌─ Community 0: Auth fixtures ──────────────────────┐
│  LoginPage, RegistrationData, fixtures.ts hub      │
└────────────────────────────────────────────────────┘
┌─ Community 1: API Services ───────────────────────┐
│  ApiService, CartService, OrderService, validators  │
└────────────────────────────────────────────────────┘
┌─ Community 4: Checkout Page ──────────────────────┐
│  CheckoutPage, all checkout locators/methods        │
└────────────────────────────────────────────────────┘
┌─ Community 21: Checkout Workflow ─────────────────┐
│  CheckoutWorkflow (bridges pages to tests)          │
└────────────────────────────────────────────────────┘
┌─ Community 22: Shopping Journey ──────────────────┐
│  ShoppingJourneyWorkflow (end-to-end orchestrator)  │
└────────────────────────────────────────────────────┘
┌─ Community 24: Config ────────────────────────────┐
│  ConfigManager, AppConfig, PaymentData, Users       │
└────────────────────────────────────────────────────┘
┌─ Community 29: Product Listing ───────────────────┐
│  ProductListingPage, SortOption, SORT_LABEL_MAP     │
└────────────────────────────────────────────────────┘
```

---

## Summary: What the Graph Tells Us Before Any File Is Opened

Given App V2 changes:
1. **"Checkout changed" → `graphify affected "CheckoutPage.ts"` → 18 impacted nodes in 2 seconds**
2. **"Profile URL changed" → `graphify affected "ProfilePage.ts"` → 15 nodes in 1 second**
3. **"Sort controls changed" → `graphify explain "ProductListingPage"` → community 29 shows SortOption/SORT_LABEL_MAP as related symbols**
4. **"Logout button moved" → `graphify path "AuthenticationService" "auth.smoke.spec.ts"` → 2-hop path via fixtures.ts**

Total graph query time: **< 15 seconds**  
Files opened to build this understanding in Graphify approach: **0** (vs 18 in baseline)
