# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- `deslopr fix`: safe automatic fixes for pasted citation markers, standalone chat sentences, `debugger` and `breakpoint()` lines, and zero-width characters next to a space. It prints a diff by default; `--write` applies it only to files git can restore, and a fix is dropped if the result would gain any finding. Works with `--diff`, `--staged`, `--rule`, `--stdin` and `--json`.
- `deslopr rules`, `deslopr explain` and `docs/RULES.md` mark the rules that have an autofix; a scan points to `deslopr fix` when some findings can be fixed.
- A logo and brand assets in `.github/assets/` (mark, logo, README banner for light and dark themes, social preview image); the README opens with the banner, and the playground has a favicon.
- README: a prompt to paste into a coding agent that installs deslopr and runs a first pass, and a table of the ways to keep a deliberate finding.

### Fixed

- Scans of large files are much faster: sentence-start patterns no longer rescan long runs of blanked text (a 54 KB HTML file went from 10 s to under 1 s). Findings are unchanged.

## [0.1.0] - 2026-11-03

First release.

- Detector with 66 rules: 23 for writing (English and French), 16 for code, 21 for interfaces, 6 for repository hygiene.
- Views per file type so quoted slop in code blocks and backticks is never reported; inline and file-level suppressions with a reason.
- Slop index per file and per project, weighted toward clusters of different patterns.
- Output as text, JSON, GitHub annotations, SARIF and markdown; `--diff`, `--staged` and `--stdin` modes.
- `deslopr init` for Claude Code, Codex and AGENTS.md agents, Cursor, Copilot, Gemini CLI, Windsurf and Cline, with `--global`, `--hook`, `--dry-run` and `--uninstall`.
- Claude Code plugin with hooks that check every edit and the final uncommitted change.
- Agent skill with references for writing, code and interfaces, and a delivery gate.
- GitHub Action, pre-commit hook, single-file and compact versions for chat tools, browser playground.
