# Contributing

Thanks for helping. deslopr gets better one precise rule at a time, and the most useful contribution is a pattern you met in the wild.

## The bar for a rule

1. **A real example first.** Paste what a tool actually produced (trimmed and anonymised). Invented examples tend to match only themselves.
2. **A look-alike that must stay quiet.** The closest legitimate use you can think of: the human sentence, the defensive check at a trust boundary, the gradient that is the brand. This is what keeps the rule precise.
3. **The right severity.**
   - `error`: wrong in practically every context (chat residue, placeholders, secrets, deleted code behind `// ...`).
   - `warn`: wrong most of the time; a reader can confirm in one glance.
   - `info`: a technique or word that is fine alone and a signal in a cluster.
4. **A fix a person can act on**, in one or two sentences.

If a pattern needs meaning to judge (synonym cycling, a single-implementation abstraction), it belongs in the skill's references as a **judgment** pattern, not in the detector.

## Adding a rule

Rules live in `src/core/rules/` (`prose.js`, `code.js`, `ui.js`, `repo.js`). A rule is a plain object:

```js
{
  id: 'prose/negative-listing',      // domain/kebab-case, stable forever
  domain: 'prose',                   // prose | code | ui | repo
  severity: 'warn',
  name: 'Negative listing ("No X. No Y. Just Z.")',
  why: 'One or two sentences: why readers notice it.',
  fix: 'One or two sentences: what to write instead.',
  views: ['prose', 'comments', 'ui'], // which views of a file it reads (see src/core/views.js)
  patterns: [{ lang: 'en', re: /.../giu }, { lang: 'fr', re: /.../giu }],
  // or: check(ctx, options) { return [{ index, match, message }] }
  examples: {
    bad: ['No fluff. No jargon. Just results.'],
    good: ['No. The cache is rebuilt on deploy.'],
  },
}
```

- Prefer `phrases([...])` and `sentenceStart([...])` from `helpers.js` for word lists: they handle word boundaries in every alphabet, curly apostrophes and non-breaking spaces. `~` allows a suffix, `{a|b}` an alternative.
- Examples are strings (scanned as `example.md`) or `{ path, text }` objects; the extension picks the views.
- Every `bad` example must fire and every `good` example must stay quiet; `npm test` checks both automatically, so the examples are the tests.

Then:

```bash
npm test                       # rule examples, engine, CLI, hooks, installer
npm run build                  # regenerates docs/RULES.md, schema.json, adapters/, dist/
node bin/deslopr.js .          # the repository must pass its own detector
```

Test your rule on real text before you open the PR. Scanning a few large, mostly human repositories (`--no-config --json`) and reading every hit is the fastest way to find false positives.

## Adding a language

Add patterns with `lang: '<code>'` next to the English ones in the same rule, so one rule id covers every language and users can still filter with `--lang`. Add a `bad` and a `good` example in that language. Patterns that only make sense in one language (French typography, for example) can be their own rule. Document notable patterns in `skills/deslopr/references/writing.md`.

## Adding an agent

Agent targets are in `src/node/init.js` (`AGENTS`) and the text they receive in `src/node/templates.js`. Verify the folder and file names against the vendor's current documentation, add a test in `test/cli.test.js`, and add the generated copy to `scripts/build.mjs`.

## Code style

- Zero runtime dependencies. Node 18 or later. ES modules.
- `src/core/` must stay free of Node APIs: it also runs in the browser playground.
- Comments say why, not what. This repository runs deslopr on itself in CI, with `--fail-on warn`.
- Rule files open with `// deslopr-disable-file`, because their examples are slop on purpose.

## Pull requests

Keep one rule or one fix per PR, fill in the template, and add a line to `CHANGELOG.md` under Unreleased for anything users will notice. Be kind in reviews; see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
