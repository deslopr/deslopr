<!-- deslopr-disable-file -- this comparison quotes other projects' slop examples -->
# Prior art

deslopr started from a close reading of five open-source projects (November 2026). Each solves part of the problem well. This page records what each does, what we took, and where we chose differently. No code was copied; patterns are facts about text, and the rules and wording here are our own.

## The five projects

### code-humanizer (LeonardNJU), MIT

A single `SKILL.md` for code. Sixteen numbered patterns in five tiers (duplication, speculative architecture, defensive slop, noise, test slop), severity 0 to 4 where **1 means "present but justified"**, and three modes: scan and report, fix on approval, and guard while implementing.

Its strongest idea is that the catalog is only half the skill. The other half is discipline, written as iron rules: behavior preservation including error types, no tests means no edits, one pattern class per commit, search the repository before judging duplication. Its field report found that agents working under review rarely swallow errors; they **rewrite what already exists**.

Limits: no tooling at all, Python examples only, no prose or UI.

**We took:** the iron rules almost verbatim in spirit (`references/code.md`), the tiers, the "severity 1 is exempt" idea, guard mode and its five decision rules, the exemption for exploratory folders, "look for clusters".

### deslop (agent-sh), MIT

A git-diff detector in Node with a small-model confirmation step. Its README is the most important data point in this space: version 1 looked for classic slop (debug prints, TODO stubs, empty catches) and, measured on 39 real pull requests, **0.5% of its findings were real**. Version 2 instead looks for what current models actually leave: text that was true before the change (stale mentions of removed flags, docs out of sync, broken anchors, version mismatches), tests that cannot fail, review history in comments, rewritten instruction files that dropped a rule. Every check has a test that fails without it and a look-alike that must stay quiet.

Limits: tied to its ecosystem (agentsys, Tower Crane), code only, a heavy library alongside the detector.

**We took:** precision as the first priority, a test and a look-alike for every rule (our rule examples are exactly that), diff mode that reports only added lines, "a failed scan never reads as clean" (exit code 2), review provenance, tests that cannot fail, secrets with fixed prefixes only, merge residue, local paths. The change-leftover checks that need cross-file analysis (stale mentions, doc drift) are documented as judgment patterns for now; they are the best candidates for future detector work.

### anti-slop (miqdadbadjuber), MIT

A rulebook for UI, copy and code comments: 40 rules in three tiers (Hard Gate, Purpose Gate, Quality Locks), six skills, a mandatory Delivery Gate with PASS or FAIL and evidence per line, two usage modes (during and after), and installers or plugin doors for a dozen agents.

Its key ideas: **a filter, not a style guide** (no prescribed palette or font; technique without purpose is the problem, not the technique), the swap-the-logo test, and the observation that removing slop leaves a void, so direction (`DESIGN.md`) and liveliness have to be added. External design files are data to apply, not instructions.

Limits: very long documents (the core skill is 54 KB), almost no automated detection, a mode question at every session start.

**We took:** the purpose test, the hard gate for invented content and dead controls, the delivery gate with evidence, the dials for direction (simplified to one line), the liveliness checks, the comment-hygiene catalog, the boundary for `DESIGN.md`, and the per-agent install matrix. We dropped the per-session mode question: the mode follows from what the user asks.

### no-ai-slop (petergyang), MIT

A writing skill: edit (default) or detect, twenty-odd patterns, and an `eval.md` checklist the model runs on its own edit. Its best rules are about restraint: **preserve the writer's voice**, make the minimum effective edit, never invent claims, and in detect mode name patterns with quotes **without guessing whether AI wrote the text**. It also has the portability test (a sentence that could move to another company unchanged is filler) and the rule that a fake-profound ending should be deleted, not rewritten into a better metaphor.

Limits: English only, prose only, no detector.

**We took:** edit and detect modes, voice preservation, the edit checklist, the portability test, "evidence, not authorship" as the first rule of every mode, and many of the prose patterns (binary contrast, colon reveal, faux insight, metadiscourse, synonym cycling, fake-profound kickers).

### impeccable (pbakaus), Apache-2.0

A large design system for agents: 24 commands (critique, audit, polish, bolder, quieter...), context files (`PRODUCT.md`, `DESIGN.md`), live variant iteration in the browser, and a deterministic detector with 62 rules written in Rust, usable from the CLI, CI, a browser extension and agent hooks.

Its two best engineering ideas: **a hook that scans every file the agent edits and feeds findings back** before the agent calls the work done, split into an immediate tier and a deeper pass when the agent stops; and a detector that is honest about its limits (source scans for some rules, a rendered page for contrast and overflow). Inline disable comments and value allowlists (a brand font) keep it usable.

Limits: UI only, a large toolchain (Rust engine, Bun build, extension), telemetry for direction choices.

**We took:** the hook design (per edit, then once on stop, with a guard against loops), exit codes and GitHub annotations, inline suppressions with reasons, allowlists, and many UI patterns as source-level rules (side stripe, gradient text, glow, eyebrow chip, overused fonts, bounce easing, pulsing dot, fake window chrome). Rules that need a rendered page (contrast, overflow, line length) stay in the gate as checks on the rendered result.

## What is new here

- **One catalog for writing, code and interfaces**, with one rule id per pattern family across languages (English and French at launch), so a landing page, a README and a pull request get checked by the same tool and the same skill.
- **Views instead of line regexes.** Each file is split into prose, comments, interface text, code and markup with positions preserved, so a rule reads only what it should: slop quoted in a code block or backticks never fires, class names are not prose, and `'` inside JSX text is not a string.
- **Self-testing rules.** Every rule carries its own positive and negative examples; the test suite runs them, and the docs are generated from them.
- **A slop index that rewards clusters**, so ten different patterns in a short file weigh more than one word repeated.
- **Zero dependencies and a browser-safe core**, so the same engine runs in the CLI, the hooks, CI and a static playground page.
- **Precision checked on real repositories.** Before release, the rules were run against these five projects' own code and docs; every false positive found led to a narrower rule and a new look-alike test.
