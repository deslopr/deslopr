<!-- deslopr-disable-file -- this catalog quotes slop patterns as examples -->
# Code

Code slop is code that works and still degrades the repository. It reimplements what exists, adds abstraction nobody asked for, hides errors that should surface, narrates itself in comments, and leaves behind text that was true before the change. Unlike prose, code has an oracle: **the test suite decides what "meaning-preserving" means.**

Patterns marked **judgment** need you to read the repository; the detector cannot see them.

## Cleanup rules

These govern changes to code that already exists. In Guard mode they apply to cleanup you do after implementing, not to the feature itself.

1. **Behavior preservation is absolute.** That includes error types and error timing. Swapping an accidental `AttributeError` for a "nicer" `ValueError` breaks every caller that catches it. Report latent bugs; do not fix them inside a cleanup.
2. **No passing tests, no cleanup edits.** Run the suite first. If it is missing, failing or does not cover the code, report only, and offer to write characterization tests first.
3. **Report before you rewrite.** Detect first. Edit pre-existing code when the user approves, or asked for fixes explicitly.
4. **One pattern class per commit.** Each cleanup commit removes one kind of slop and passes the full suite. A red test reverts the commit; do not fix forward into unrelated code.
5. **Search before you judge duplication.** Before you scan or implement, find the repository's helpers, utils, validators and base classes. You cannot spot a reimplementation if you do not know what exists.
6. **Grep everything before deleting "unused" code**: scripts, templates, configs, docs, reflection, entry points.

## Catalog

Severity guide for a findings table: **0** absent, **1** present but justified (exempt, leave it), **2** minor, **3** clear debt, **4** breaks semantics or architecture.

### 1. Duplication and reinvention

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Reimplemented helper | judgment | A new private function that duplicates something in `utils/`, a sibling module or an installed dependency. The signature tell: agents write from the prompt outward, not from the repo inward. | Call the existing helper. |
| `_v2` / `_new` / `_fixed` clone | `code/version-suffix`, `repo/duplicate-file` | `parse` and `parse_v2` both alive; `Header.old.tsx`; `utils copy.py` | Merge into one name, unless a documented migration is in progress. |
| Reinvented standard library | judgment | Hand-rolled `groupby`, deep copy through JSON, manual URL parsing, bespoke date math | Use the standard or installed equivalent. |

### 2. Speculative architecture

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Single-implementation abstraction | judgment | An interface, ABC, registry or factory with one implementation and one call site | Inline it. Add the abstraction when the second case arrives. |
| Code kept for the future | `code/speculative-generality` | "for future use", "can be extended later", exported helpers nothing calls, parameters no caller passes | Delete (git remembers), after grepping everything. |
| Wrapper that adds nothing | judgment | A function whose body is one call with the same arguments | Call the inner function. |
| Config sprawl | judgment | A new global flag, env var or public parameter read in exactly one place | Make it local to the code that needs it. |

### 3. Defensive slop

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Swallowed error | `code/swallowed-error` | `except Exception: pass`, `catch (e) {}`, `.catch(() => {})`, `if err != nil {}` | Catch the error you expect and handle it, or let it raise. If ignoring is deliberate, say why inside the block. Changing this is behavior: separate commit. |
| Try-import fallback | `code/fallback-import` | `try: import ujson except ImportError: import json` with no extra declared and no test of the fallback | Declare the dependency, or make it a real optional extra with a test. |
| Attribute-probing chain | judgment | `hasattr` / `getattr` / `isinstance` ladders accepting "a dict, an object or maybe None" | Find the real type (the tests tell you) and write to it. |
| Paranoid re-validation | judgment | `if x is not None` on a value constructed two lines up | Delete the check. |

### 4. Noise

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Comment restates the line | `code/narrating-comment` | `// Initialize the counter` above `let counter = 0` | Delete. A comment earns its line by saying what the code cannot: a reason, a constraint, a trap. |
| Comment narrates the edit | `code/edit-narration` | `// Added error handling`, `// Now uses the new API`, `// FIX: changed timeout` | Delete, or say why the code is this way. History goes in the commit message. |
| Review history in comments | `code/review-provenance` | `// Per the reviewer`, `// addressed feedback (round 2)` | Same: say why, or delete. |
| Echoing docstring | `code/redundant-docstring` | `"""Get the user."""` on `get_user()`, `@param name The name.` | Delete, or document units, edge cases, errors, side effects. |
| Step narration | `code/step-comments` | `// Step 1: Validate input`, `// Step 2: Process` | Delete. If the flow is hard to follow, extract named functions. |
| Banner comments | `code/banner-comment` | A label boxed between rows of `=====` | One plain line or none. |
| Emoji in code | `code/emoji-in-code` | `console.log("✅ Done")`, `# 🚀 Fast path` | Words, or nothing. |
| Commented-out code | `code/commented-out-code` | Four or more lines of old code in comments | Delete. |
| Vague TODO | `code/vague-todo` | `TODO: improve this` | Write what and why, with an issue link, or delete. |
| Over-explained comment | judgment | Four lines of history and reasoning around a one-line fact | Cut to the constraint: one line, two at most. |
| Debug leftovers | `code/debugger-left` | `debugger;`, `breakpoint()`, `binding.pry` | Remove. |

### 5. Leftovers of a change

Current models rarely leave debug prints. What they leave is text that was true before the change. Look at every file that mentions what the change removed or renamed.

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Deleted code behind a placeholder | `code/elided-code` | `// ... rest of the code`, `# existing methods unchanged` | Restore from git or write it. This is data loss. |
| Stale mention | judgment | A doc, comment, config or script still names the flag, env var, file or function the change removed | Update or delete the mention. |
| Docs out of sync | judgment | README example runs a removed command; a version or count updated in one file and not its copies | Update every copy. |
| Broken references | judgment | A link to a renamed heading, a cited path that does not exist | Fix the link. |
| Missing changelog entry | judgment | A user-visible change with nothing under Unreleased | Add the entry, if the project keeps a changelog. |
| Agent report committed | `repo/agent-report-file` | `IMPLEMENTATION_SUMMARY.md`, `FIXES_APPLIED.md`, `test_fix.py` at the root | Move what matters to the PR or docs; delete the file. |
| Machine-local path | `repo/local-path` | `/Users/kevin/projects/...`, `C:\Users\marc\...` | Relative path or environment variable. |
| Committed secret | `repo/secret` | A real-looking key or token | Remove, rotate, load from the environment. |
| Conflict markers | `repo/merge-conflict` | `<<<<<<<`, `>>>>>>>` | Resolve. |
| Contradicted scope claim | judgment | PR body or commit says "docs-only" or "no behavior change" over a code change | Make the description true. |

### 6. Test slop (report by default)

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Test that cannot fail | `code/test-cannot-fail` | No assertion; `expect(true).toBe(true)`; `assert True` | Assert on behavior a user would notice, including a failure case. |
| Test asserts the mock | judgment | Every collaborator mocked; the assertion checks a mock was called | Test real behavior at a boundary you own. |
| Duplicated or trivial cases | judgment | The same case under three names to inflate coverage | Keep one; add the edge case that is missing. |
| Swallowed failure in test scripts | judgment | A command OR-ed with `true`, `2>/dev/null`, `set +e` in a test script | Let it go red. |

## What is not slop

Severity 1, justified, leave it:

- Fallbacks and shims with a documented reason (platform differences, declared extras, version gates during a migration).
- Defensive code at trust boundaries: user input, network payloads, plugin-supplied objects. Probing and broad catches are correct there, though they should log.
- Registries and interfaces in real plugin systems, where implementations load from outside the repository.
- Duplication with a measured reason (a benchmarked hot path) or deliberately vendored code.
- `_v2` during a documented migration (check the changelog and git history).
- Generated code, license headers, legal notices.
- Exploration: `experiments/`, `scratch/`, `notebooks/`, `prototypes/` may hold duplicates and hard-coded values while they stay contained. The exemption ends when the code moves into a shared module or a merge-ready path.
- Style you merely dislike. Formatting is the linter's job.

Look for clusters. One narrating comment is nothing. Narrating comments plus a single-implementation registry plus a `_v2` plus an unused export in the same PR is the signal.

## Guard mode: five decisions while you write

1. **Reuse before recreating** (section 1). Search the repository and its dependencies before you write a helper.
2. **Concrete before abstract** (section 2). Keep a local need local; wait for the second implementation before an interface, a registry, a flag or a public parameter.
3. **Know before defending** (section 3). Trace the real types, invariants and error behavior. Defensive flexibility belongs at trust boundaries, not wherever a type went unexamined.
4. **Explain why, not what** (section 4). Comments record constraints and non-obvious reasons. No narration, no history, no decoration.
5. **Test behavior, not scaffolding** (section 6). Assert what users would notice, including failures.

After coding: run the tests, run `npx deslopr --diff`, fix what your change introduced, and report pre-existing findings separately instead of fixing them uninvited. End with a compact audit, for example: "reused `utils.validate_email`; no new public API; deslopr --diff clean; 142 tests passed."

## Commit messages and PR descriptions

They are writing; `references/writing.md` applies. In particular:

- Say what changed and why in plain words. No "This PR introduces a comprehensive, robust solution that seamlessly...".
- No emoji prefixes unless the project uses them. Follow the project's convention (Conventional Commits or not).
- No claims you did not verify: "fully tested", "no breaking changes", "docs-only" must be true.
- One commit, one purpose.
