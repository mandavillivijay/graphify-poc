# Graph Report - automation-v1  (2026-06-10)

## Corpus Check
- 51 files · ~38,483 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 707 nodes · 1238 edges · 31 communities (15 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b15a210`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `BasePage` - 45 edges
2. `ConfigManager` - 44 edges
3. `ProductListingPage` - 44 edges
4. `ApiService` - 44 edges
5. `CheckoutPage` - 40 edges
6. `ProductDetailPage` - 38 edges
7. `ProductData` - 37 edges
8. `CartPage` - 37 edges
9. `OrderDetailPage` - 28 edges
10. `RegisterPage` - 26 edges

## Surprising Connections (you probably didn't know these)
- `BasePage` --references--> `ConfigManager`  [EXTRACTED]
  src/pages/BasePage.ts → src/config/ConfigManager.ts
- `ApiService` --references--> `ConfigManager`  [EXTRACTED]
  src/services/ApiService.ts → src/config/ConfigManager.ts
- `AuthenticationService` --references--> `ConfigManager`  [EXTRACTED]
  src/services/AuthenticationService.ts → src/config/ConfigManager.ts
- `CartService` --references--> `ConfigManager`  [EXTRACTED]
  src/services/CartService.ts → src/config/ConfigManager.ts
- `OrderService` --references--> `ConfigManager`  [EXTRACTED]
  src/services/OrderService.ts → src/config/ConfigManager.ts

## Import Cycles
- None detected.

## Communities (31 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (10): UserCredentials, PageFixtures, ServiceFixtures, StateFixtures, test, WorkflowFixtures, LoginPage, RegistrationData (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (6): CartData, OrderData, ApiService, CartService, OrderService, OrderValidator

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (4): ProductData, ProductService, ProductValidator, AdminWorkflow

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (27): compilerOptions, allowSyntheticDefaultImports, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (26): 1. CheckoutPage (Score: 22), 2. fixtures.ts (Score: 32), 3. ShoppingJourneyWorkflow (Score: 17), 4. AuthenticationService (Score: 15), Admin Subsystem, ApiService, Authentication Subsystem, AuthenticationService (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (11): UserData, ADJECTIVES, BRANDS, CATEGORIES, CITIES, FIRST_NAMES, LAST_NAMES, PRODUCT_NOUNS (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (3): TestReporter, TestResult, TestSummary

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (17): Architectural Philosophy, Automation Framework Architecture, ConfigManager sits outside this hierarchy and is a cross-cutting dependency:, Coupling Analysis, Dependency Graph (Critical Paths), Fixture Architecture, High-Centrality Nodes, Layer 1: BasePage (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (9): ShippingData, CartItem, CheckoutSummaryItem, OrderConfirmation, OrderDetailInfo, OrderItem, ShippingAddressInfo, OrderSummaryInfo (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (9): AppConfig, PaymentData, ShippingData, TestData, Users, LoginResponseData, RawCartItem, RawOrder (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (12): devDependencies, @playwright/test, @types/node, typescript, name, scripts, report, test (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (11): Architecture, Configuration, Dependency Injection Architecture, Fast Setup via API, Fixture-Based State, High-Centrality Modules, Prerequisites, Quick Start (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (6): ApiResponse, OrdersListResponse, PaginatedResponse, ProductsListResponse, ShippingAddressData, DashboardStats

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (4): ProductDetail, ProductCardData, SORT_LABEL_MAP, SortOption

## Knowledge Gaps
- **121 isolated node(s):** `name`, `version`, `test`, `test:smoke`, `test:regression` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BasePage` connect `Community 10` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 19`, `Community 20`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `ProductListingPage` connect `Community 3` to `Community 0`, `Community 2`, `Community 10`, `Community 19`, `Community 22`, `Community 29`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `CheckoutPage` connect `Community 4` to `Community 0`, `Community 10`, `Community 19`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `name`, `version`, `test` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0504828797190518 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.059932659932659935 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08367071524966262 - nodes in this community are weakly interconnected._