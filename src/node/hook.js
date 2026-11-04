// Agent hook entry point. Reads the hook event as JSON on stdin and answers with exit code 2
// and a message on stderr when the agent just wrote slop, which Claude Code (and harnesses
// that follow its hook protocol) feeds back to the model.
//
//   PostToolUse (Write|Edit|MultiEdit)  scan the edited file, report findings on edited lines
//   Stop                                scan the uncommitted change once before the agent stops
import fs from 'node:fs';
import path from 'node:path';
import { scanText } from '../core/engine.js';
import { getRule } from '../core/rules/index.js';
import { classify } from '../core/files.js';
import { loadConfig } from './config.js';
import { readText, gitRoot, diffAddedLines, realPath } from './fs.js';

const RANK = { error: 0, warn: 1, info: 2 };
const MAX = 12;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function changedText(input) {
  const ti = input.tool_input || {};
  if (typeof ti.content === 'string') return ti.content;
  if (typeof ti.new_string === 'string') return ti.new_string;
  if (Array.isArray(ti.edits)) return ti.edits.map((e) => e.new_string || '').join('\n');
  if (Array.isArray(input.edits)) return input.edits.map((e) => e.new_string || e.text || '').join('\n');
  return null;
}

function filePathOf(input) {
  const ti = input.tool_input || {};
  return ti.file_path || ti.path || ti.notebook_path || input.file_path || (input.tool_response && input.tool_response.filePath) || null;
}

function describe(f) {
  const rule = getRule(f.rule);
  return `- line ${f.line}: [${f.rule}] ${f.message}${f.match && !f.message.includes(f.match) ? ` ("${f.match}")` : ''}. Fix: ${rule ? rule.fix : ''}`;
}

function message(where, findings) {
  const head = `deslopr found ${findings.length} AI-slop pattern${findings.length === 1 ? '' : 's'} in ${where}. Fix them before you finish. If one is a real false positive, keep the line and put \`deslopr-disable-next-line <rule> -- <reason>\` above it.`;
  const shown = findings.slice(0, MAX).map(describe);
  if (findings.length > MAX) shown.push(`- ...and ${findings.length - MAX} more (run \`npx deslopr\` to see all).`);
  return [head, ...shown].join('\n');
}

export function runHook({ argv = [], stdin } = {}) {
  const text = stdin ?? readStdin();
  let input = {};
  try {
    input = text.trim() ? JSON.parse(text) : {};
  } catch {
    return { code: 0 };
  }
  const cwd = input.cwd || process.cwd();
  let config;
  try {
    config = loadConfig(cwd).config;
  } catch {
    return { code: 0 };
  }
  const hookCfg = config.hook || {};
  if (hookCfg.enabled === false || process.env.DESLOPR_HOOK === 'off') return { code: 0 };
  const minRank = RANK[hookCfg.severity || 'warn'];
  const keep = (f) => RANK[f.severity] <= minRank;
  const event = input.hook_event_name || (argv.includes('--stop') ? 'Stop' : 'PostToolUse');

  if (event === 'Stop' || event === 'SubagentStop') {
    if (input.stop_hook_active) return { code: 0 };
    if (hookCfg.onStop === false) return { code: 0 };
    const repo = gitRoot(cwd);
    if (!repo) return { code: 0 };
    let added;
    try {
      added = diffAddedLines(repo, { base: 'HEAD' });
    } catch {
      return { code: 0 };
    }
    const all = [];
    for (const [rel, lines] of added) {
      if (classify(rel).kind === 'data') continue;
      const abs = path.join(repo, rel);
      if (!fs.existsSync(abs)) continue;
      const body = readText(abs);
      if (body === null) continue;
      const r = scanText(body, { path: rel, config });
      for (const f of r.findings) if (keep(f) && (lines === 'all' || lines.has(f.line))) all.push({ ...f, file: rel });
    }
    if (!all.length) return { code: 0 };
    const lines = all.slice(0, MAX).map((f) => `- ${f.file}:${f.line} [${f.rule}] ${f.message}${f.match && !f.message.includes(f.match) ? ` ("${f.match}")` : ''}`);
    if (all.length > MAX) lines.push(`- ...and ${all.length - MAX} more (run \`npx deslopr --diff\`).`);
    return { code: 2, stderr: [`deslopr: your uncommitted changes still contain ${all.length} AI-slop pattern${all.length === 1 ? '' : 's'}. Fix them (or justify each with \`deslopr-disable-next-line <rule> -- <reason>\`) before you stop:`, ...lines].join('\n') };
  }

  const file = filePathOf(input);
  if (!file) return { code: 0 };
  if (!fs.existsSync(path.resolve(cwd, file))) return { code: 0 };
  const abs = realPath(path.resolve(cwd, file));
  const root = gitRoot(path.dirname(abs)) || realPath(cwd);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (rel.startsWith('..') || classify(rel).kind === 'data') return { code: 0 };
  const body = readText(abs);
  if (body === null) return { code: 0 };
  const result = scanText(body, { path: rel, config });
  const changed = changedText(input);
  const lines = body.split('\n');
  const touched = (f) => {
    if (changed === null) return true;
    const line = (lines[f.line - 1] || '').trim();
    return line !== '' && changed.includes(line);
  };
  const findings = result.findings.filter((f) => keep(f) && touched(f));
  if (!findings.length) return { code: 0 };
  return { code: 2, stderr: message(rel, findings) };
}
