# Comparative Analysis: Baseline vs. Graphify-Assisted Maintenance

**Experiment:** ShopHub v1 automation migrated to ShopHub v2 under two conditions  
**Date:** 2026-06-10  
**Automation Framework:** 69 Playwright tests, ~11,600 LOC  
**V2 Changes:** 7 architectural changes across UI, routing, and backend

---

## Section 1: Metrics Comparison

### Primary Metrics Table

| Metric | Baseline (No Graph) | Graphify | Reduction |
|--------|--------------------:|--------:|----------:|
| Grep searches | 5 | 0 | 100% |
| Graph queries | 0 | 6 | — |
| Files opened for analysis | 18 | 0 | 100% |
| Files opened to edit | 9 | 9 | 0% |
| Total files opened | 18 | 5* | 72.2% |
| LOC inspected | 3,849 | ~600 | 84.4% |
| Estimated tokens | ~8,500 | ~2,800 | 67.1% |
| Time elapsed (minutes) | 77 | 28 | 63.6% |
| Rework cycles | 2 | 0 | 100% |
| Files modified | 9 | 9 | 0% |
| Lines changed | ~879 | ~879 | 0% |
| Migration accuracy | 8/8 | 8/8 | 0% |

*The 5 opened files are 5 of the 9 edited files that required reading context before editing. The other 4 were 1-line changes applied with exact line knowledge from the graph.

### Discovery Efficiency

| Discovery Method | Baseline | Graphify |
|-----------------|----------|---------|
| Time to identify all affected files | ~29 min (grep + open + read) | ~2 min (6 graph queries) |
| False positives reviewed | ~9 files (no changes needed) | 0 |
| Transitive dependency errors | 1 missed cascade | 0 missed cascades |

---

## Section 2: Visual Comparisons (ASCII Charts)

### Files Opened

```
Baseline   [==================] 18
Graphify   [=====]              5

           0    5    10   15   20
```

### LOC Inspected

```
Baseline   [================================================] 3,849
Graphify   [======]                                            600

           0   500  1000  1500  2000  2500  3000  3500  4000
```

### Estimated Tokens

```
Baseline   [==============================] 8,500
Graphify   [==========]                    2,800

           0  1000  2000  3000  4000  5000  6000  7000  8000  9000
```

### Time Spent (minutes)

```
Baseline   [===========================================================] 77 min
  Reading      [================] 25 min
  Grepping     [===] 4 min
  Writing      [===========================] 35 min
  Rework       [====] 8 min (TypeScript check + 2 rework cycles)

Graphify   [=====================] 28 min
  Querying     [=] 2 min
  Writing      [==================] 22 min
  TS check     [=] 1 min
  Rework       [] 0 min

           0    10    20    30    40    50    60    70    80
```

### Rework Cycles

```
Baseline   [==] 2 rework cycles
Graphify   []   0

           0         1         2
```

### Code Changes (Should Be Identical)

```
Files Modified:
Baseline   [=========] 9
Graphify   [=========] 9

Lines Changed:
Baseline   [===========================] ~879
Graphify   [===========================] ~879
```

---

## Section 3: Key Findings

### Finding 1: The work product was identical; only the discovery process differed

Both approaches produced the same 9 modified files with the same ~879 lines of changes. Migration accuracy was 8/8 in both cases. Graphify did not change what needed to be done — it changed how the developer found out what needed to be done.

### Finding 2: 84% LOC reduction came from eliminating exploratory reads

The baseline opened 18 files, of which 9 were changed and 9 were opened only to determine they did not need changes. These 9 "no-change" files accounted for 1,446 of the 3,849 lines inspected — pure overhead. Graphify eliminated all of it.

Even among the 10 files the baseline fully read, much of the reading was navigational (understanding the structure to find the relevant section). Graphify's graph output contained enough structural information to go directly to the right lines.

### Finding 3: The 100% rework reduction is structurally significant

The 2 rework cycles in the baseline were not random errors — they followed predictably from the discovery mechanism. Grep-based discovery surfaces files by string match but does not show call chains. The developer updated CheckoutPage and CheckoutWorkflow correctly, then ran tests, then discovered that checkout.smoke.spec.ts called `checkoutPage.placeOrder()` directly (not via workflow). This required a second pass.

The Graphify `path` query (Query 2) showed this direct reference before any file was touched. The rework was structurally preventable.

### Finding 4: Token reduction of 67.1% scales with codebase complexity

In a 5,000 LOC app with a 70-test suite, the absolute numbers are modest. The mechanism that produced the reduction — eliminating exploratory reads and false-positive investigations — scales with codebase size. In a 50,000 LOC app with 700 tests, the same proportions would represent far more substantial absolute differences.

### Finding 5: Time savings are dominated by two factors

Breaking down the 49-minute difference (77 min vs. 28 min):

| Source of Time Savings | Estimated Minutes |
|------------------------|------------------|
| Eliminated file reads (9 files × avg 3 min) | ~27 min |
| Eliminated rework cycles | ~8 min |
| Eliminated grep + result review | ~4 min |
| Faster navigation within files being edited | ~10 min |
| **Total** | **~49 min** |

The rework elimination alone accounts for 8 of the 49 saved minutes — a disproportionate impact given that it was only 2 cycles. Rework compounds: it requires re-running tests, re-reading output, and re-editing files already closed.

---

## Section 4: What Was Identical

### The code changes themselves

Every line of code written was the same. The checkout 3-step wizard implementation, the sort button click logic, the profile URL update, the dropdown-first logout — all of it was identical. The graph identified the right files and the right change points, but the implementation knowledge was the same in both cases.

### Migration accuracy

Both approaches correctly addressed all 8 automation-relevant changes. Neither approach missed a required change. The graph did not improve accuracy in the sense of catching something the baseline missed — it prevented the rework that the baseline required to reach the same accuracy.

### Final test results

Both approaches produced a passing automation suite against ShopHub v2. The end state of the repository was the same.

### The framework's fundamental architecture

The Page Object Model, workflow layer, service layer, and fixture dependency injection — none of this was changed by either approach. Both operated on the existing architecture without restructuring it.

---

## Section 5: Interpretation and Caveats

### What this comparison measures

This is a controlled, single-session experiment by one developer on one codebase with known changes. The metrics reflect the difference in one specific variable: discovery and navigation method. All other factors (developer familiarity, change complexity, framework maturity) were held constant by design.

### What it does not measure

- Team variability (a developer who already knows the codebase well might perform faster baseline discovery)
- Graph maintenance overhead (the graph must be built and kept current — this cost is not included)
- The learning curve for Graphify query syntax
- Scenarios where the change is ambiguous and requires reading files to understand semantics (the graph shows structure, not behavior)

### Honest assessment of the LOC reduction

The 84% LOC reduction is real but partly reflects the systematic nature of the baseline. An experienced developer who already knows the codebase would not open all 18 files — they would know from memory that CartPage doesn't depend on CheckoutPage directly. The reduction against a genuinely naive baseline would be similar; against an expert baseline it would be smaller.
