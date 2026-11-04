// Runs rules over one file and returns findings with positions, plus a slop index.
import { classify } from './files.js';
import { buildViews } from './views.js';
import { RULES } from './rules/index.js';

export const SEVERITIES = ['error', 'warn', 'info'];
export const SEVERITY_POINTS = { error: 5, warn: 3, info: 1 };
const SEV_RANK = { error: 0, warn: 1, info: 2, off: 9 };

export function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

export function positionOf(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: index - starts[lo] + 1 };
}

// deslopr-disable-next-line <ids>, deslopr-disable-line <ids>,
// deslopr-disable <ids> ... deslopr-enable <ids>, deslopr-disable-file <ids>.
// No ids means every rule. Anything after " -- " is the reason and is ignored.
const DIRECTIVE = /deslopr-(disable-next-line|disable-line|disable-file|disable|enable)\b([^\n]*)/g;

function parseIds(rest) {
  const body = rest.split(/\s--\s|-->|\*\/|#\}/)[0];
  return body.split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^[a-z*][\w/*-]*$/i.test(s));
}

export function matchesRuleId(pattern, id) {
  if (pattern === '*' || pattern === id) return true;
  if (pattern.endsWith('/*')) return id.startsWith(pattern.slice(0, -1));
  if (!pattern.includes('/')) return id.startsWith(pattern + '/');
  return false;
}

function parseDirectives(raw, starts) {
  const fileOff = [];
  const lineOff = new Map(); // line -> ids[]
  const ranges = []; // { from, to, ids }
  const open = [];
  DIRECTIVE.lastIndex = 0;
  let m;
  while ((m = DIRECTIVE.exec(raw))) {
    const { line } = positionOf(starts, m.index);
    const ids = parseIds(m[2]);
    const all = ids.length ? ids : ['*'];
    const kind = m[1];
    if (kind === 'disable-file') fileOff.push(...all);
    else if (kind === 'disable-line') lineOff.set(line, [...(lineOff.get(line) || []), ...all]);
    else if (kind === 'disable-next-line') {
      // The next non-blank line, so a directive can sit above a blank-separated block.
      const lines = raw.split('\n');
      let target = line + 1;
      while (target <= lines.length && lines[target - 1].trim() === '') target++;
      lineOff.set(target, [...(lineOff.get(target) || []), ...all]);
    } else if (kind === 'disable') open.push({ from: line, ids: all });
    else if (kind === 'enable') {
      for (let k = open.length - 1; k >= 0; k--) {
        const o = open[k];
        if (!ids.length || ids.some((id) => o.ids.includes(id))) {
          ranges.push({ from: o.from, to: line, ids: o.ids });
          open.splice(k, 1);
        }
      }
    }
  }
  for (const o of open) ranges.push({ from: o.from, to: Infinity, ids: o.ids });
  return (id, line) => {
    if (fileOff.some((p) => matchesRuleId(p, id))) return true;
    const l = lineOff.get(line);
    if (l && l.some((p) => matchesRuleId(p, id))) return true;
    return ranges.some((r) => line >= r.from && line <= r.to && r.ids.some((p) => matchesRuleId(p, id)));
  };
}

export function countWords(text) {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

function excerptAt(raw, starts, line) {
  const a = starts[line - 1] ?? 0;
  const b = starts[line] !== undefined ? starts[line] - 1 : raw.length;
  return raw.slice(a, b).replace(/\r$/, '').trim().slice(0, 160);
}

/**
 * Resolve the effective severity of a rule given config. Returns 'off' when disabled.
 * @param {object} rule
 * @param {object} config
 */
export function effectiveSeverity(rule, config = {}) {
  const r = config.rules || {};
  let sev = rule.severity;
  for (const [pattern, value] of Object.entries(r)) {
    if (!matchesRuleId(pattern, rule.id)) continue;
    const v = typeof value === 'string' ? value : value && value.severity;
    if (v) sev = v;
  }
  if (config.domains && !config.domains.includes(rule.domain)) return 'off';
  if (config.only && config.only.length && !config.only.some((p) => matchesRuleId(p, rule.id))) return 'off';
  return sev;
}

export function ruleOptions(rule, config = {}) {
  const out = { ...(rule.options || {}) };
  for (const [pattern, value] of Object.entries(config.rules || {})) {
    if (matchesRuleId(pattern, rule.id) && value && typeof value === 'object') Object.assign(out, value.options || value);
  }
  delete out.severity;
  return out;
}

export function normalizePath(path) {
  return (path || 'stdin.md').replace(/\\/g, '/');
}

/**
 * What a rule sees of one file. The BOM is stripped, so indexes are into `raw`.
 * Returns null for data files, which no rule reads.
 * @param {string} text
 * @param {string} path
 * @param {object} config
 */
export function createContext(text, path, config = {}) {
  const raw = text.replace(/^\uFEFF/, '');
  const info = classify(path);
  if (info.kind === 'data') return null;
  const views = buildViews(raw, info);
  const starts = lineStarts(raw);
  const proseText = [views.prose, views.comments, views.ui].filter(Boolean).join('\n');
  const words = countWords(proseText);
  return { path, info, raw, views, starts, words, lines: starts.length, config, positionOf: (i) => positionOf(starts, i) };
}

/**
 * Scan one file's text.
 * @param {string} text
 * @param {{ path?: string, config?: object, rules?: object[] }} [opts]
 */
export function scanText(text, opts = {}) {
  const path = normalizePath(opts.path);
  const config = opts.config || {};
  const rules = opts.rules || RULES;
  const info = classify(path);
  const findings = [];
  const ctx = createContext(text, path, config);
  if (!ctx) return finalize({ path, info, findings, words: 0, lines: 0 });
  const { raw, views, starts, words, lines } = ctx;
  const disabled = parseDirectives(raw, starts);
  const allowWords = (config.allow || []).map((w) => w.toLowerCase());

  for (const rule of rules) {
    const severity = effectiveSeverity(rule, config);
    if (severity === 'off') continue;
    if (rule.kinds && !rule.kinds.includes(info.kind) && !(info.jsxLike && rule.kinds.includes('markup'))) continue;
    if (rule.skipTests && info.test) continue;
    if (rule.onlyTests && !info.test) continue;
    if (rule.exts && !rule.exts.includes(info.ext)) continue;
    const options = ruleOptions(rule, config);
    const emit = (index, extra = {}) => {
      const pos = typeof extra.line === 'number' ? { line: extra.line, column: extra.column || 1 } : positionOf(starts, index);
      const match = extra.match || '';
      if (match && allowWords.some((w) => match.toLowerCase().includes(w))) return;
      findings.push({
        rule: rule.id,
        domain: rule.domain,
        severity: extra.severity || severity,
        line: pos.line,
        column: pos.column,
        match: match.slice(0, 120),
        message: extra.message || rule.message || rule.name,
        fix: rule.fix,
        excerpt: excerptAt(raw, starts, pos.line),
      });
    };
    if (rule.patterns) {
      const viewNames = rule.views || ['prose', 'comments', 'ui'];
      const patternViews = rule.patterns.flatMap((p) => p.views || []);
      for (const viewName of [...new Set([...viewNames, ...patternViews])]) {
        const view = views[viewName];
        if (!view) continue;
        for (const p of rule.patterns) {
          if (p.lang && config.languages && !config.languages.includes(p.lang)) continue;
          if (p.views ? !p.views.includes(viewName) : !viewNames.includes(viewName)) continue;
          const re = p instanceof RegExp ? p : p.re;
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(view))) {
            if (m[0].length === 0) { re.lastIndex++; continue; }
            if (p.when && !p.when(m, ctx)) continue;
            const msg = p.message ? (typeof p.message === 'function' ? p.message(m) : p.message) : undefined;
            emit(m.index, { match: m[0].replace(/\s+/g, ' ').trim(), message: msg, severity: p.severity });
          }
        }
      }
    }
    if (rule.check) {
      for (const f of rule.check(ctx, options) || []) emit(f.index ?? 0, f);
    }
  }
  // Same rule on the same line once; directives last.
  const seen = new Set();
  const kept = [];
  for (const f of findings) {
    const key = `${f.rule}|${f.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (disabled(f.rule, f.line)) continue;
    kept.push(f);
  }
  return finalize({ path, info, findings: kept, words, lines });
}

function finalize({ path, info, findings, words, lines }) {
  findings.sort((a, b) => a.line - b.line || a.column - b.column || SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  const distinct = new Set(findings.map((f) => f.rule)).size;
  const points = findings.reduce((s, f) => s + (SEVERITY_POINTS[f.severity] || 0), 0);
  const index = slopIndex(points, words, lines, distinct);
  return { path, kind: info.kind, words, lines, findings, points, distinct, index, grade: grade(index), cluster: distinct >= 3 };
}

// Points per 1,000 words of readable text (or per 400 lines of code when a file has little
// prose), with a floor so a three-line file is not judged on a tiny denominator. Several
// different patterns together weigh more than one repeated: a cluster is the real signal.
export function slopIndex(points, words, lines, distinct) {
  if (!points) return 0;
  const size = Math.max(words / 1000, lines / 400, 0.25);
  const clusterBoost = distinct >= 5 ? 1.5 : distinct >= 3 ? 1.25 : 1;
  return Math.round((points / size) * clusterBoost * 10) / 10;
}

export function grade(index) {
  if (index < 2) return 'A';
  if (index < 6) return 'B';
  if (index < 12) return 'C';
  if (index < 25) return 'D';
  return 'F';
}

export function summarize(results) {
  const all = results.flatMap((r) => r.findings);
  const counts = { error: 0, warn: 0, info: 0 };
  for (const f of all) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const words = results.reduce((s, r) => s + r.words, 0);
  const lines = results.reduce((s, r) => s + r.lines, 0);
  const points = results.reduce((s, r) => s + r.points, 0);
  const distinct = new Set(all.map((f) => f.rule)).size;
  const index = slopIndex(points, words, lines, distinct);
  const byRule = {};
  for (const f of all) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  return { files: results.length, filesWithFindings: results.filter((r) => r.findings.length).length, counts, words, index, grade: grade(index), byRule };
}
