// Safe automatic fixes. A rule may define autofix(ctx, options), returning edits for the
// patterns it can remove without judgment. Three guards keep a fix from doing damage:
//   1. An edit is applied only where the scan reported that rule on that line, so config,
//      directives, the allow list and --diff scoping hold for fixes exactly as for findings.
//   2. Overlapping edits are dropped, never merged.
//   3. The result is scanned again. If any rule reports more than before, the whole file is
//      left as it was: a fix must never trade one finding for another.
import { scanText, createContext, effectiveSeverity, ruleOptions, normalizePath } from './engine.js';
import { RULES } from './rules/index.js';

function countByRule(findings) {
  const counts = new Map();
  for (const f of findings) counts.set(f.rule, (counts.get(f.rule) || 0) + 1);
  return counts;
}

/**
 * Compute the safe fixes for one file.
 * @param {string} text
 * @param {{ path?: string, config?: object, rules?: object[], lines?: Set<number>|null }} [opts]
 *   lines: only fix findings on these lines (the added lines of a diff).
 * @returns {{ path: string, output: string, changed: boolean, fixes: { rule: string, line: number }[], rejected: string|null, before: object, after: object }}
 */
export function fixText(text, opts = {}) {
  const path = normalizePath(opts.path);
  const config = opts.config || {};
  const rules = opts.rules || RULES;
  const before = scanText(text, { path, config, rules });
  const unchanged = (rejected = null) => ({ path, output: text, changed: false, fixes: [], rejected, before, after: before });
  const ctx = createContext(text, path, config);
  if (!ctx || !before.findings.length) return unchanged();

  const reported = new Set(before.findings.map((f) => `${f.rule}|${f.line}`));
  const edits = [];
  for (const rule of rules) {
    if (typeof rule.autofix !== 'function' || effectiveSeverity(rule, config) === 'off') continue;
    for (const e of rule.autofix(ctx, ruleOptions(rule, config)) || []) {
      if (!reported.has(`${rule.id}|${e.line}`)) continue;
      if (opts.lines && !opts.lines.has(e.line)) continue;
      if (!(e.start >= 0 && e.end >= e.start && e.end <= ctx.raw.length)) continue;
      edits.push({ ...e, rule: rule.id });
    }
  }
  if (!edits.length) return unchanged();

  edits.sort((a, b) => a.start - b.start || a.end - b.end);
  const kept = [];
  let reach = -1;
  for (const e of edits) {
    if (e.start < reach) continue;
    kept.push(e);
    reach = Math.max(e.end, e.start + 1);
  }

  let raw = '';
  let at = 0;
  for (const e of kept) {
    raw += ctx.raw.slice(at, e.start) + e.text;
    at = e.end;
  }
  raw += ctx.raw.slice(at);
  const output = (text.charCodeAt(0) === 0xfeff ? '\uFEFF' : '') + raw;
  if (output === text) return unchanged();

  const after = scanText(output, { path, config, rules });
  const was = countByRule(before.findings);
  for (const [rule, n] of countByRule(after.findings)) {
    if (n > (was.get(rule) || 0)) return unchanged(`the fix would add a ${rule} finding`);
  }
  const fixes = kept.map((e) => ({ rule: e.rule, line: e.line }));
  return { path, output, changed: true, fixes, rejected: null, before, after };
}

export function fixableRules(rules = RULES) {
  return rules.filter((r) => typeof r.autofix === 'function').map((r) => r.id);
}
