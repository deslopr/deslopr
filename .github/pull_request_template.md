## What this changes

## Checklist

- [ ] A new or changed rule has at least one `bad` example that a real tool produced and one `good` look-alike that must stay quiet.
- [ ] `npm test` passes.
- [ ] `npm run build` was run, and the generated files are committed (`node scripts/build.mjs --check` passes).
- [ ] `node bin/deslopr.js . --fail-on warn` passes on this repository.
- [ ] CHANGELOG.md has an entry under Unreleased for anything users will notice.
