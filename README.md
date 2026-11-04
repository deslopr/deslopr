# deslopr

Find and remove AI slop in writing, code and interfaces, and keep it out of what your agents produce next.

English | [Français](README.fr.md)

```bash
npx deslopr            # scan this folder
npx deslopr --diff     # only what your branch added
npx deslopr init       # teach your coding agent the rules
```

deslopr is three things that work together:

1. **A detector.** A zero-dependency CLI with 66 rules across prose (English and French), code, UI and repository hygiene. It reads markdown, source comments, JSX text, HTML, CSS and Tailwind classes, and it runs in CI, in a pre-commit hook, in your agent after every edit, or in a browser tab.
2. **An agent skill.** `skills/deslopr/` follows the [Agent Skills](https://agentskills.io) format. It teaches Claude Code, Codex, Cursor, Copilot, Gemini, Windsurf, Cline and any `AGENTS.md` agent what slop looks like, what to write instead, and how to clean it without breaking anything.
3. **A gate.** A short checklist the agent passes before it says "done", with evidence for every line.

## Why another one

Five good projects already attack this problem, each from one side: [humanizer for code](https://github.com/LeonardNJU/code-humanizer), [deslop](https://github.com/agent-sh/deslop), [anti-slop](https://github.com/miqdadbadjuber/anti-slop), [no-ai-slop](https://github.com/petergyang/no-ai-slop) and [impeccable](https://github.com/pbakaus/impeccable). Some are excellent prompts with no detector; some are excellent detectors for one domain. deslopr puts the pieces in one place: one catalog for writing, code and UI, a detector that checks it mechanically, and the discipline rules that keep a cleanup from doing damage. [docs/PRIOR-ART.md](docs/PRIOR-ART.md) lists what we took from each and what we changed.

The principles, in order:

- **Precision over recall.** A rule that is wrong half the time trains people to ignore the tool. Every rule ships with a real example it must catch and a look-alike it must leave alone, and both are tests.
- **Evidence, not authorship.** deslopr never says "AI wrote this". It names a pattern, quotes the line and gives the fix. Humans write slop too.
- **Purpose beats pattern.** A gradient, a defensive `try`, a rhetorical question can all be right. One hit means little; several different patterns in one place is the signal, and the slop index weighs clusters accordingly.
- **Never invent.** The skill forbids made-up numbers, quotes, testimonials, sources and compliance claims, and the detector flags the usual suspects.

## What it catches

| Domain | Examples | Rules |
|---|---|---|
| Writing | `It's not X, it's Y`, `Here's the thing`, `The result?`, `No fluff. No jargon. Just results.`, `plays a crucial role`, `Studies show` without a source, em dash saturation, emoji headings, `I hope this helps`, pasted `【4†source】` citations, `[Your Name]` | 23, in English and French |
| Code | `// ... rest of the code`, `// Added error handling`, comments that restate the next line, `"""Get the user."""`, `except Exception: pass`, `parse` next to `parse_v2`, `// Kept for future use`, tests with no assertion, `debugger;` | 16 |
| Interfaces | purple-to-blue gradients, gradient text, glow, blurred orbs, eyebrow labels above the H1, `Trusted by 10,000+ teams`, `SOC 2 compliant`, `i.pravatar.cc` avatars, `href="#"`, images without alt, removed focus outlines | 21 |
| Repository | committed secrets, conflict markers, `/Users/you/...` paths, zero-width characters, `IMPLEMENTATION_SUMMARY.md`, `utils_v2.py` | 6 |

The full catalog with examples is in [docs/RULES.md](docs/RULES.md), or run `npx deslopr rules` and `npx deslopr explain <rule>`.

What a scan looks like:

```text
src/Hero.tsx  slop index 258 (F) · cluster of 15 patterns
  12:7    warn  ui/eyebrow-label       pill chip above the headline  "✨ Now with AI"
          │ <span className="rounded-full border border-purple-500/40 px-3 py-1 text-xs">✨ Now with AI</span>
  12:84   warn  ui/emoji-icon          Emoji used as an icon  "✨"
  13:11   warn  ui/ai-gradient         gradient purple → blue
          │ <h1 className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent text-6xl">
  13:11   warn  ui/gradient-text       Gradient text  "bg-clip-text text-transparent"
  16:21   warn  ui/unsourced-stat      Statistic with no source  "10,000+ teams"
          │ <p>Trusted by 10,000+ teams worldwide. 99.9% uptime. SOC 2 Type II compliant.</p>
  16:60   warn  ui/unverified-claim    Compliance or security claim to verify  "SOC 2 Type II"
  17:10   warn  ui/dead-control        Control that does nothing  "href="#""
  ...

deslopr: 17 findings (13 warnings, 4 info) in 1 of 1 files · slop index 258 (F, saturated)
```

(Excerpt; the full run is `npx deslopr test/fixtures/sloppy/Hero.tsx --no-config`.)

Severity tells you how far to trust a finding. `error` is almost always a real defect. `warn` is usually real: read the line. `info` only counts in a cluster, so it shows when a file holds three or more different patterns (or with `--verbose`).

## Install

### In your coding agent

```bash
npx deslopr init
```

`init` detects the agents a project uses and installs the skill and an always-on rule for each. Pick them yourself with `--agents claude,codex,cursor,copilot,gemini,windsurf,cline` (or `all`), preview with `--dry-run`, undo with `--uninstall`. It writes inside marked blocks and never touches the rest of your `AGENTS.md` or `CLAUDE.md`.

| Agent | What `init` writes |
|---|---|
| Claude Code | `.claude/skills/deslopr/`, a block in `CLAUDE.md`, and with `--hook`, hooks in `.claude/settings.json` |
| Codex, Amp, Jules, OpenCode, Zed, Factory, Kimi | `.agents/skills/deslopr/`, a block in `AGENTS.md` |
| Cursor | `.cursor/rules/deslopr.mdc` |
| GitHub Copilot | a block in `.github/copilot-instructions.md` |
| Gemini CLI | a block in `GEMINI.md` |
| Windsurf | `.windsurf/rules/deslopr.md` |
| Cline | `.clinerules/deslopr.md` |

`npx deslopr init --global` installs the skill for your user (`~/.claude/skills`, `~/.agents/skills`) instead of one project. The [Agent Skills](https://agentskills.io) installer works too: `npx skills add deslopr/deslopr`.

### Claude Code plugin

```text
/plugin marketplace add deslopr/deslopr
/plugin install deslopr@deslopr
```

The plugin adds the skill and two hooks: after every `Write` or `Edit` the detector checks the lines the agent just wrote and hands any findings back to it; before the agent stops, it checks the whole uncommitted change once. The agent fixes what it wrote before you see it.

### In a chat window

Paste [dist/deslopr.md](dist/deslopr.md) (the full skill in one file) into a project's instructions, or [dist/deslopr-compact.md](dist/deslopr-compact.md) (under 1,500 characters) into a custom-instructions field.

### In CI

```yaml
# .github/workflows/slop.yml
on: pull_request
jobs:
  slop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: deslopr/deslopr@v0
        with:
          fail-on: warn
```

On a pull request the action checks only the lines the PR adds and reports them as inline annotations. `--format sarif` feeds GitHub code scanning; `--format markdown` writes a PR comment.

### As a pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/deslopr/deslopr
    rev: v0.1.0
    hooks:
      - id: deslopr
```

Or without the framework: `npx deslopr --staged` in `.git/hooks/pre-commit`.

### In the browser

Open [playground/index.html](playground/index.html), paste text or code, and see each pattern highlighted. Nothing leaves the page.

## Usage

```bash
npx deslopr [paths...]                 # files and folders (respects .gitignore)
npx deslopr --diff                     # lines added since the default branch
npx deslopr --diff=release/2.x         # another base
npx deslopr --staged                   # staged lines only
pbpaste | npx deslopr --stdin          # any text; --stdin-filename x.tsx sets its type
npx deslopr --json | --format sarif | --format github | --format markdown
npx deslopr --fail-on warn             # exit 1 on warnings too (default: errors)
npx deslopr --domain prose --lang fr   # one domain, one language
npx deslopr --rule code/swallowed-error --disable ui/overused-font
```

Exit codes: `0` nothing at or above `--fail-on`, `1` findings, `2` usage or runtime error.

## Configuration

`.deslopr.json` at the project root (or a `deslopr` key in `package.json`):

```json
{
  "$schema": "https://raw.githubusercontent.com/deslopr/deslopr/main/schema.json",
  "ignore": ["vendor/**", "docs/archive/**"],
  "rules": {
    "prose/em-dash-density": "off",
    "ui/overused-font": { "allow": ["Inter"] },
    "code": "warn"
  },
  "allow": ["leverage ratio", "Acme Corp"],
  "languages": ["en", "fr"],
  "failOn": "error",
  "hook": { "severity": "warn", "onStop": true }
}
```

A rule key can be an id (`prose/binary-contrast`), a domain (`code`) or `*`. `allow` lists words and phrases that are never reported, such as brand names and terms of art.

To keep one line, say why next to it:

```md
<!-- deslopr-disable-next-line prose/binary-contrast -- quoted from the customer interview -->
```

```js
// deslopr-disable-next-line code/swallowed-error -- best-effort cleanup, failure is harmless
```

`deslopr-disable-line`, `deslopr-disable` / `deslopr-enable` ranges and `deslopr-disable-file` work in any comment syntax.

## How it works

Each file gets views with everything a rule should not read replaced by spaces, so positions stay exact: the prose of a markdown file without its code blocks and URLs, the comments of a source file, the text and copy strings of a component, the code without its strings. A rule declares which views it reads. Quoted slop inside backticks or a code fence is never reported, which is why this README passes its own detector.

The slop index is points per 1,000 words of readable text (or per 400 lines of code), with `error` 5, `warn` 3 and `info` 1, boosted when several different patterns appear together. Grades run from A (under 2) to F (25 and up).

The core in `src/core/` uses no Node APIs, so the same engine runs in the CLI, the hooks and the playground.

## Contributing

New patterns are welcome, and the bar is the same as for the ones already here: a real example first, then the rule, and a look-alike that must stay quiet. [CONTRIBUTING.md](CONTRIBUTING.md) walks through adding a rule, a language or an agent adapter. German, Spanish and Portuguese patterns are the most wanted.

## Credits

deslopr stands on [code-humanizer](https://github.com/LeonardNJU/code-humanizer) (the iron rules for cleaning code and the tiered catalog), [deslop](https://github.com/agent-sh/deslop) (precision first, change leftovers, tests that cannot fail), [anti-slop](https://github.com/miqdadbadjuber/anti-slop) (the purpose test, the delivery gate, multi-agent installation), [no-ai-slop](https://github.com/petergyang/no-ai-slop) (voice preservation, detect without guessing authorship, the portability test) and [impeccable](https://github.com/pbakaus/impeccable) (deterministic UI rules, hooks that check every edit, inline suppressions). Also [humanizer](https://github.com/blader/humanizer) and Wikipedia's [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). No code was copied; the rules and text are written from scratch.

## License

[MIT](LICENSE)
