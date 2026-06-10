# Root Cause Analysis: Why Graphify Produced Improvements

**Report Type:** Causal Analysis
**Experiment:** Baseline vs. Graphify-Assisted Automation Maintenance
**Codebase:** ShopHub automation framework (69 tests, ~11,600 LOC)

---

## Section 1: How Traditional Code Exploration Works

When a developer is handed a migration document and asked to update an automation framework, the process is fundamentally sequential and exploratory. It proceeds in roughly this order:

**Step 1: Read the migration document.**
The developer learns that "checkout is now a 3-step wizard" and "profile moved to /account." These are described in human language without specifying which code files are affected.

**Step 2: Translate change descriptions into search terms.**
"Checkout changed" → search for "checkout", "CheckoutPage", "CheckoutWorkflow". This translation is lossy. The developer picks terms likely to appear in affected code, but has no systematic way to know whether those are the right terms or whether all terms have been covered.

**Step 3: Run grep searches.**
`grep -rl "checkout|CheckoutPage"` returns a list of files containing the search term. This is a token-frequency search, not a dependency search. It returns files that:
- Import CheckoutPage (need changes)
- Test checkout behavior (may need changes)
- Reference checkout in comments (do not need changes)
- Contain the string "checkout" in variable names for unrelated purposes (do not need changes)

In the baseline, the checkout grep returned 10 files, of which 5 needed changes. The nav/logout grep returned 15 files, of which 2 needed changes. The developer cannot know which category a file falls into without opening it.

**Step 4: Open each grep result to assess impact.**
This is the primary source of overhead. Each file must be opened, the relevant sections located, and the developer must mentally model: "Does this file depend on CheckoutPage in a way that requires a change, or does it merely reference a string that matched my search?" For a 200-line file, this takes 2–4 minutes.

**Step 5: Mentally model the dependency chain.**
After reading several files, the developer builds a mental model: "CheckoutPage is imported by CheckoutWorkflow, which is imported by fixtures.ts, which is imported by all test files." This model is constructed incrementally and is vulnerable to error — particularly when a file imports something in an unusual way (like a test file that bypasses the workflow layer and imports a page object directly).

**Step 6: Write the changes.**
Only after this exploration can the developer begin writing changes with reasonable confidence that they are not missing impacted files.

### Why this process produces the metrics it does

- **18 files opened** = 5 grep result sets × average 4 files per set, minus overlaps, plus files opened to trace dependencies discovered during reading
- **3,849 LOC inspected** = all content of opened files, most of it navigational context rather than the lines being changed
- **2 rework cycles** = the mental model failed to capture one direct import relationship that appeared in a test file but not in the workflow layer
- **77 minutes** = the sum of all navigational reading time + writing time + rework time

The root cause of every excess metric is the same: **the developer was using file content as a proxy for dependency information**, when what they actually needed was the dependency graph.

---

## Section 2: How Graph Traversal Changes Discovery

The Graphify knowledge graph was built from the automation-v1 codebase using AST extraction. Every import statement, every class inheritance, every exported symbol was recorded as an edge in the graph. The result is a queryable representation of the codebase's structural relationships.

When a developer runs `graphify affected "CheckoutPage.ts" --depth 3`, the tool performs a breadth-first traversal of the dependency graph starting from CheckoutPage, following reverse import edges (i.e., "who imports CheckoutPage?") to the specified depth. The result is an exact list of affected nodes — not a list of files that match a string, but a list of files whose runtime behavior depends on CheckoutPage.

This changes the discovery process fundamentally:

**What changes:**
- The question "which files are affected?" is answered in 2 seconds, not 29 minutes
- The answer contains no false positives — every node in the result set has a traceable dependency path to the changed file
- Transitive dependencies at depth 2 and 3 are captured automatically — the developer does not need to read File A to learn it imports File B which imports File C
- The developer's first action with any file is to edit it, not to read it to decide whether it needs editing

**What stays the same:**
- The developer still needs to understand what change to make (the graph shows impact, not solution)
- The developer still reads files — but only files they are about to edit, and only the sections they need
- Migration accuracy depends on correctly interpreting the change document, which the graph does not help with directly

---

## Section 3: The Cascade Problem — A Concrete Example

The most consequential difference between the two approaches was the cascade miss that caused 2 rework cycles in the baseline. This merits a detailed examination.

**The scenario:**

ShopHub v2 changed checkout from a single page to a 3-step wizard. The developer needed to update CheckoutPage.ts and CheckoutWorkflow.ts. The workflow update was straightforward: `fillShipping()` now navigates to Step 2, `fillPayment()` navigates to Step 3, and `placeOrder()` is called only on Step 3.

**Where the baseline failed:**

After updating CheckoutPage and CheckoutWorkflow, the developer ran the test suite. Two tests failed — TC044 and TC046 in checkout.smoke.spec.ts. These tests called `checkoutPage.placeOrder()` directly, bypassing CheckoutWorkflow entirely:

```typescript
// checkout.smoke.spec.ts — the pattern that was missed
test('TC044: Place order as authenticated user', async () => {
  await checkoutPage.fillShippingDetails(shippingData);
  // No workflow — directly calling page object method
  await checkoutPage.placeOrder();   // <-- This was the missed dependency
  await expect(page).toHaveURL('/order-confirmation');
});
```

Because the test did not go through CheckoutWorkflow, the baseline developer's mental model — "I updated the workflow, so tests using the workflow are covered" — was incomplete. The test file had to be opened, the failure understood, and the test rewritten. This happened twice (TC044 and TC046).

**How Graphify prevented this:**

Graphify Query 2 was specifically a path query:

```
graphify path "CheckoutPage" "checkout.smoke.spec.ts"
```

Output:
```
Direct reference:
  checkout.smoke.spec.ts imports CheckoutPage directly (line 4)
  checkout.smoke.spec.ts references placeOrder() at lines 31, 44, 67
```

The graph showed — before any file was opened — that checkout.smoke.spec.ts imports CheckoutPage directly and calls placeOrder() at three specific lines. The developer therefore knew to update those call sites when editing the test file, not after running tests and watching them fail.

**The structural reason this works:**

The graph's reverse import traversal does not care how the import is used. Whether the test uses CheckoutPage via workflow or imports it directly, the import edge exists in the graph and the affected query returns it. Grep would have returned both files, but the developer would still have needed to read both files to understand the relationship. The graph returns the call-site line numbers without file reading.

---

## Section 4: Token Reduction Mechanics

The 67.1% token reduction is a direct consequence of the LOC reduction, with some modifiers.

**Baseline token budget breakdown:**

| Activity | LOC | Tokens (est.) |
|----------|-----|---------------|
| Migration notes (read once) | 168 | ~218 |
| 10 full file reads (avg 240 lines) | 2,403 | ~3,124 |
| 8 partial scans (avg 181 lines) | 1,446 | ~1,880 |
| Grep output and navigation | ~200 | ~260 |
| Writing 9 files (output tokens) | ~879 | ~1,143 |
| Prompt/context overhead | — | ~1,875 |
| **Total** | | **~8,500** |

The dominant cost was the 10 full file reads: files opened to understand structure, determine impact, and locate the sections needing change. These 2,403 lines of code were input tokens that informed decisions but produced no output.

**Graphify token budget breakdown:**

| Activity | LOC | Tokens (est.) |
|----------|-----|---------------|
| Migration notes (read once) | 168 | ~218 |
| 6 graph query results (avg 50 lines) | ~300 | ~390 |
| 9 files opened to edit (avg 67 lines read) | ~600 | ~780 |
| Writing 9 files (output tokens) | ~879 | ~1,143 |
| Prompt/context overhead | — | ~269 |
| **Total** | | **~2,800** |

The graph query results replaced the full file reads. Each query result is compact — 30 to 80 lines of structured output — compared to 200+ lines of source code read to understand the same structural information.

**Why the reduction is 67%, not 84%:**

The 84% LOC reduction does not translate linearly to tokens because:
1. Output tokens (writing the changes) are the same in both cases — this is a fixed cost (~1,143 tokens)
2. The migration notes are read in both cases (~218 tokens)
3. The graph query results add a cost the baseline does not have (~390 tokens)
4. There is a base overhead cost that does not scale with LOC

Removing the fixed costs from both sides, the variable input token reduction is approximately 84%, consistent with the LOC reduction. The overall 67% accounts for the fixed components.

---

## Section 5: Complete Dependency Chain Example

The full checkout change propagation as seen by each approach:

**The actual dependency chain:**
```
App V2 Change: checkout is now a 3-step wizard
  |
  v
CheckoutPage.ts              [page object — needs 3-step methods]
  |
  +---> CheckoutWorkflow.ts  [workflow — must navigate 3 steps]
  |       |
  |       +---> ShoppingJourneyWorkflow.ts  [orchestrator — calls CheckoutWorkflow]
  |
  +---> checkout.smoke.spec.ts              [direct import — placeOrder() at 3 locations]
  |
  +---> checkout.regression.spec.ts         [direct import — step navigation + summary-*]
  |
  +---> full.regression.spec.ts             [indirect via ShoppingJourneyWorkflow]
```

**Baseline discovery of this chain:**
```
Time 0:00  Read migration notes (understood: checkout changed)
Time 3:00  grep -rl "checkout|CheckoutPage" → 10 files returned
Time 4:00  Open CheckoutPage.ts (409 lines) — understand current implementation
Time 9:00  Open CheckoutWorkflow.ts (272 lines) — understand workflow structure
Time 14:00 Open checkout.smoke.spec.ts (92 lines) — assess impact
Time 16:00 Open checkout.regression.spec.ts (219 lines) — assess impact
Time 20:00 Open full.regression.spec.ts (155 lines) — assess full regression impact
           Mental model now assembled: 5 files need changes
Time 22:00 Start writing changes
[Later]    Run tests — TC044, TC046 fail (direct placeOrder() calls missed)
Time 65:00 Rework: re-open checkout.smoke.spec.ts, fix direct placeOrder() calls

Total for this chain: ~35 minutes
```

**Graphify discovery of this chain:**
```
Time 3:00  graphify affected "CheckoutPage.ts" --depth 3
           → 18 nodes returned, including all 6 files above
Time 3:15  graphify path "CheckoutPage" "checkout.smoke.spec.ts"
           → direct import confirmed; placeOrder() at lines 31, 44, 67 shown
Time 3:30  Discovery complete. 6 files identified, 0 files read.
Time 5:30  Start writing changes.
Time 5:30  Editing checkout.smoke.spec.ts: knew about lines 31, 44, 67 from query output.

Total for this chain: ~8 minutes (discovery 30 seconds, writing ~7.5 minutes)
```

The difference for this single chain: approximately 27 minutes.

---

## Section 6: Limitations of the Observed Improvement

The improvements are real, but the following limitations are important to document honestly.

**1. The graph identifies which files, not what to change.**

`graphify affected "CheckoutPage.ts"` returned 18 nodes. This told the developer which files to edit. It did not explain that the 3-step wizard requires a `navigateToStep()` method, or what the new data-testid selectors would be named. That knowledge came from reading the migration notes and exercising domain understanding. The graph is a navigation tool, not a specification.

**2. AST-only graphs lack runtime behavior.**

The graph was built from import statements and symbol references. It does not capture:
- Which code paths are exercised at runtime
- Whether an import is used in a critical flow or a utility function
- Conditional imports or dynamic requires
- Test data dependencies

A change to a utility function imported by 30 files might have zero runtime impact if only 2 of those imports call the function. The graph cannot distinguish this without semantic analysis.

**3. Community detection gave one misleading signal.**

When querying `graphify affected "ProfilePage.ts" --depth 3`, the result showed 15 affected nodes. The actual edit impact was 2 files. The 13-node difference was structural reach via fixtures.ts — ProfilePage is imported into the fixtures composition root, which is imported by all tests. The graph correctly reported this structural fact, but the developer still needed domain knowledge to interpret "15 nodes affected" as "2 files need edits."

This is not a bug in the graph — it is a genuine structural coupling — but it means graph output requires interpretation, not just reading.

**4. The improvement assumes a systematic baseline.**

The baseline developer opened 18 files methodically, including 9 that needed no changes. An experienced developer with deep knowledge of this codebase might skip several of those exploratory reads from memory. Against such a baseline, the measured improvement would be smaller. The 84% LOC reduction is an upper bound relative to a systematic, knowledge-limited baseline — which is the appropriate comparison for a new team member, an AI agent, or a developer returning to an unfamiliar codebase.

**5. Graph maintenance adds ongoing cost.**

The graph must be built and updated. `graphify update .` takes under 5 seconds and costs nothing in API calls, but it is a step that must happen whenever the codebase changes. For projects with frequent commits, this is a minor operational concern. For projects that do not update the graph consistently, query results will be stale, and the false confidence they produce could be worse than no graph at all.
