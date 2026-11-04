# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## [Unreleased]

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
