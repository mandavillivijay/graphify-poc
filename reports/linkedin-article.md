# I Measured How Much Time a Dependency Graph Actually Saves on Test Maintenance. Here's the Honest Answer.

Last month I ran an experiment I'd been meaning to do for a while. I built a small e-commerce app, wrote 69 Playwright tests for it, then evolved the app through a realistic version upgrade — the kind with a multi-step checkout wizard replacing a single-page form, navigation restructuring, URL changes, new component extractions. The kind of upgrade that breaks automation in ways that aren't obvious until tests start failing.

I performed the same maintenance task twice: once using the approach most teams use (grep, open files, read, trace dependencies manually), and once using a knowledge graph tool called Graphify that builds a queryable dependency graph from AST extraction. I tracked every file opened, every line inspected, every minute spent, and every rework cycle.

The results were better than I expected in some ways and more nuanced than the headline numbers suggest.

---

## What I Built and Why

The test app — ShopHub — is a React/TypeScript frontend with a Node.js/Express/SQLite backend, about 5,000 lines of application code. The automation framework is about 11,600 lines of Playwright tests organized in a layered Page Object Model: page objects, workflow orchestrators, API services, and 69 test cases across 10 spec files.

I made 7 architectural changes to the app for v2. Six of them had direct automation impact:

- Checkout became a 3-step wizard (was a single page)
- Profile moved from /profile to /account
- Sort controls changed from a dropdown to buttons
- An OrderSummary component was extracted with new data-testid attributes
- Guest checkout was enabled (route guard removed)
- The logout button moved into a user dropdown in the navbar

These are the kinds of changes I see regularly in production applications. They're not catastrophic — no API contracts changed, no database schema migrated — but they're enough to break a lot of tests in non-obvious ways.

---

## How the Baseline Worked (No Graph)

The standard process: read the migration notes, grep the codebase for relevant terms, open the files that come back, read them to assess impact, build a mental model of the dependency chain, then start writing changes.

I ran 5 grep searches ("checkout", "profile", "sort", "logout"). They returned 23 unique files with overlaps. I opened 18 of them — 10 fully, 8 with partial scans. Total lines of code read: 3,849. Total time: 77 minutes.

I made the right changes. 8 out of 8 V2 changes were correctly addressed. But I also needed 2 rework cycles.

The rework happened because two test cases in checkout.smoke.spec.ts called `checkoutPage.placeOrder()` directly — bypassing the workflow layer, importing the page object directly. My grep returned checkout.smoke.spec.ts (the string "checkout" matched), but when I opened the file, I was focused on assessing whether the test used the workflow. It did, mostly. I updated those workflow-mediated tests and moved on. The direct calls were in a different section and I missed them.

Tests ran, TC044 and TC046 failed, I reopened the file, found the direct calls, fixed them. Two extra cycles: about 8 minutes of rework plus the cognitive overhead of context-switching back to a file I thought I'd finished.

---

## How Graphify Changed the Process

Graphify builds a dependency graph from your TypeScript codebase using AST extraction — no LLM, no API calls, under 5 seconds to build. The result is 707 nodes and 1,238 edges for this framework, with community detection organizing related nodes into subsystems.

Instead of grep, I ran 6 graph queries:

- `graphify affected "CheckoutPage.ts" --depth 3` — returned 18 impacted nodes in under 2 seconds
- `graphify path "CheckoutPage" "checkout.smoke.spec.ts"` — showed a direct import at line 4, with placeOrder() called at lines 31, 44, and 67
- `graphify affected "ProfilePage.ts" --depth 3` — 15 structural nodes; 2 actual edits
- `graphify explain "ProductListingPage"` — community structure showed sort internals co-located with the page object
- Two more for AuthenticationService

Total graph query time: about 15 seconds. Files opened for analysis: zero. Files opened to make edits: 5 (of the 9 that were changed).

The metrics:

| Metric | Baseline | Graphify | Change |
|--------|----------|---------|--------|
| Files opened | 18 | 5 | -72% |
| LOC inspected | 3,849 | ~600 | -84% |
| Estimated tokens | ~8,500 | ~2,800 | -67% |
| Time elapsed | 77 min | 28 min | -64% |
| Rework cycles | 2 | 0 | -100% |
| Files modified | 9 | 9 | 0% |
| Lines changed | ~879 | ~879 | 0% |

The last two rows are the most important: the code changes were identical. The graph did not change what needed to be done. It changed how I found out what needed to be done, and whether I found all of it before running tests.

---

## What I Think Actually Drove the Improvement

The 84% LOC reduction sounds impressive. The actual mechanism is mundane: I opened 9 files in the baseline that needed no changes, because grep returned them and I couldn't tell without reading them. The graph didn't return those files because they had no import path to the changed nodes. Those 9 files accounted for most of the exploratory reading overhead.

The 0 rework cycles is harder to dismiss. The checkout cascade miss was not random — it was structurally predictable. Grep finds files by string matching. It does not tell you that a file imports a class directly versus through a workflow. Building that understanding requires reading the file. The path query showed the direct import and the exact call sites without file reading. That is genuinely different from what grep gives you.

The time savings break down roughly as: 27 minutes from eliminated file reads, 8 minutes from eliminated rework, 10 minutes from faster navigation within files being edited, 4 minutes from skipping grep output review.

---

## Where I'm Skeptical of My Own Results

This is a synthetic experiment. I built the app, I built the tests, I knew the codebase when I performed both phases. An experienced developer who already knows their automation framework well would not open 18 files — they would already know which ones are relevant. Against that baseline, the Graphify improvement would be smaller.

The 84% LOC reduction is also contingent on the baseline being systematic rather than expert. A developer who has worked on this framework for a year might get to the answer in 45 minutes instead of 77, not because they used better tooling but because they already carry the dependency map in their head. The graph helps most when that implicit knowledge doesn't exist — a new team member, an AI agent, a developer returning to code they haven't touched in six months.

There are also costs I didn't fully account for. The graph must be kept current. `graphify update .` is fast and free, but it has to happen, and in a busy codebase with multiple developers committing daily, graph freshness is an operational concern. I also did not measure the learning curve for graph query syntax — someone encountering `--depth 3` and community detection for the first time will not perform like someone who has used it before.

Finally, the graph is structural, not behavioral. It tells you which files import a changed module; it does not tell you whether those imports are on critical paths or in dead code. The `graphify affected "ProfilePage.ts"` query returned 15 nodes when only 2 needed edits. I had to use domain knowledge to interpret "15 structural dependents" as "2 actual changes." The graph is a starting point, not a complete answer.

---

## What This Means for Teams Actually Doing Automation Maintenance

The experiment supports a practical but bounded recommendation: use graph queries as the first step in any automation maintenance task where the changed application component has more than 3-4 known downstream consumers. If you already know exactly which 2 files need changing, running a graph query adds time rather than saving it. The benefit scales with uncertainty about impact.

For AI-assisted automation maintenance — which is increasingly common — the token reduction matters more than the time reduction. At 67% fewer tokens for an equivalent task, graph-guided agents are substantially cheaper to run and produce fewer exploratory tool calls before getting to the actual edits.

For human developers, the most durable benefit is the rework prevention. Rework is expensive not just in time but in context switching and confidence. Finding a test failure after you thought you finished a task is a different kind of work than finding it before. The graph did not make the checkout changes faster to write — it made it possible to write them completely on the first pass.

If you maintain a large automation framework and regularly absorb application changes, running `graphify update .` and doing a quick `graphify affected` before your next migration is worth the 15 seconds it takes. Whether you need the full workflow depends on how well you already know your codebase's dependency structure — and how much you trust that knowledge to be complete.

---

The experiment code, the automation framework, and all five research reports from this study are available in my GitHub repository. The data is what it is — one developer, one codebase, one set of changes. Your mileage will vary. But the structural mechanism is real, and the rework reduction is the part I find most credible and most worth investigating further.
