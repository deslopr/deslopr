# Working on deslopr

This repository is the deslopr detector, agent skill and installers. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing rules.

## Layout

- `src/core/`: the engine. Browser-safe, no Node APIs. `lexer.js` splits comments and strings, `views.js` builds the per-file views, `engine.js` runs rules, applies directives and scores, `rules/` holds the catalog.
- `src/node/`: everything that touches the disk: file discovery and git (`fs.js`), config, scanning, output formats, the CLI, the agent hook and the installer.
- `skills/deslopr/`: the agent skill. `SKILL.md` routes; `references/` holds the catalogs and the gate.
- `scripts/build.mjs`: generates `docs/RULES.md`, `schema.json`, `adapters/` and `dist/`. Never edit those by hand.
- `test/`: `rules.test.js` runs every rule's examples; `engine.test.js` and `cli.test.js` cover views, directives, scoring, diff mode, hooks and the installer.
- `playground/`: a static page that imports `src/core/` directly.

## Before you finish a change

1. `npm test`
2. `npm run build`, then commit the regenerated files.
3. `node bin/deslopr.js . --fail-on warn` must report nothing: this repository passes its own detector.

## Rules for changes

- Precision over recall. A new rule needs a real `bad` example and a `good` look-alike, and a check against real repositories for false positives.
- Keep zero runtime dependencies and Node 18 compatibility.
- Comments say why. No narration, no banners, no emoji.
