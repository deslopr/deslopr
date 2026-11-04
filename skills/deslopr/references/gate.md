# Delivery gate

Run the blocks for every domain you touched, before you hand anything over. Each line is PASS or FAIL. A PASS needs evidence: a command and its result, a file and line, or what you looked at. A FAIL means fix and run the block again; work with a FAIL is not delivered.

Another workflow leading the session (a plan, a spec, a review skill) does not replace this gate. Naming a check is not running it.

## Always

- [ ] **Detector.** `npx deslopr --diff` (or on the files you produced) reports no `error` and no `warn`, or each remaining one is suppressed with a stated reason. Evidence: the summary line.
- [ ] **Nothing invented.** Every number, quote, source, name, logo and claim came from the user, the repository or a cited source. Evidence: where each came from, or "none added".
- [ ] **Scope.** You changed what was asked. Pre-existing problems you noticed are reported, not silently fixed.

## Writing

- [ ] The first sentence carries the point, or the setup earns its place.
- [ ] No chat residue, cadence tics, inflation or padding from `writing.md` sections A to D remain without a purpose.
- [ ] The portability test passes: no sentence could move unchanged to another product or person.
- [ ] When editing: the writer's voice and claims survived; What changed lists the edits.
- [ ] It ends on a concrete point, decision or next step.

## Code

- [ ] Tests ran and passed. Evidence: the command and the count. With no tests, say so.
- [ ] Behavior is unchanged where it should be, error types included. Behavior changes are listed separately.
- [ ] Existing helpers were reused; no new abstraction, flag or public API without a second use.
- [ ] No comment restates code or narrates the edit; every remaining comment says why.
- [ ] No swallowed errors, placeholders standing in for code, debug leftovers, secrets or local paths.
- [ ] Docs, examples, configs and changelog that mention what you changed were updated.

## Interface

- [ ] Direction declared (or `DESIGN.md` applied), or the result is labelled "draft without direction".
- [ ] Hard gate in `ui.md`: no invented content, no dead controls, keyboard and focus work, alt text present, contrast meets AA.
- [ ] Rendered and looked at, at desktop and at 375px: no overflow, no clipped text. Evidence: what you viewed.
- [ ] Every interactive element clicked once: it does what it says. Evidence: the list.
- [ ] Empty, loading and error states exist.
- [ ] Each purpose-gate technique that remains has a one-line reason.
- [ ] The swap-the-logo test passes.

## Report format

```
Gate
- detector: PASS (deslopr --diff: no findings in 6 files)
- invented content: PASS (stats from metrics.json, quotes from interviews.md)
- tests: PASS (npm test: 142 passed)
- mobile 375px: PASS (no horizontal scroll; nav collapses to menu)
- states: FAIL -> fixed (added empty state to /projects), re-checked PASS
```
