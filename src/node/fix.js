// deslopr fix: apply the safe fixes from src/core/fix.js to files on disk. Nothing is written
// without `write`, and with it only files whose current content git can restore, so
// `git diff` shows exactly what changed and `git restore` undoes it.
import fs from 'node:fs';
import path from 'node:path';
import { fixText } from '../core/fix.js';
import { selectFiles } from './scan.js';
import { git, gitRoot, isBinary } from './fs.js';

const MAX_BYTES = 1024 * 1024;

// A file is rewritten only if decoding and re-encoding it gives back the same bytes, so a
// fix can never damage an encoding the scanner only approximates.
function readExact(file) {
  const st = fs.statSync(file);
  if (st.size > MAX_BYTES) return { skip: 'larger than 1 MB' };
  const buf = fs.readFileSync(file);
  if (isBinary(buf)) return { skip: 'binary' };
  const text = buf.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buf)) return { skip: 'not valid UTF-8' };
  return { text };
}

// Paths, relative to the repository, that git could not restore after a write: untracked
// files and files with unstaged changes. Staged-only changes are fine, the index keeps them.
export function unrestorable(repo) {
  const out = new Set();
  const status = git(repo, ['-c', 'core.quotepath=off', 'status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const entries = status.split('\0');
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.length < 4) continue;
    const x = e[0];
    const y = e[1];
    if (x === 'R' || x === 'C') i++;
    if (y !== ' ' || x === '?') out.add(e.slice(3));
  }
  return out;
}

/**
 * @param {{ root: string, targets?: string[], config: object, diff?: string|boolean, staged?: boolean, write?: boolean, allowDirty?: boolean }} opts
 */
export function fixProject(opts) {
  const { config } = opts;
  const { root, files, added } = selectFiles(opts);
  const results = [];
  const skipped = [];
  let remaining = 0;
  for (const rel of files) {
    const lines = added ? added.get(rel) : null;
    if (added && !lines) continue;
    let read;
    try {
      read = readExact(path.join(root, rel));
    } catch (e) {
      skipped.push(`${rel}: ${e.message}`);
      continue;
    }
    if (read.skip) continue;
    const r = fixText(read.text, { path: rel, config, lines: lines && lines !== 'all' ? lines : null });
    remaining += r.after.findings.filter((f) => f.severity !== 'info').length;
    if (r.rejected) skipped.push(`${rel}: ${r.rejected}; left unchanged`);
    if (r.changed) results.push({ path: rel, fixes: r.fixes, before: read.text, output: r.output });
  }

  if (opts.write && results.length) {
    if (!opts.allowDirty) {
      const repo = gitRoot(root);
      if (!repo) throw new Error('fix --write only edits files that git can restore, and this is not a git repository. Pass --allow-dirty to write anyway.');
      const dirty = unrestorable(repo);
      const blocked = results.map((r) => r.path).filter((p) => dirty.has(path.relative(repo, path.join(root, p)).split(path.sep).join('/')));
      if (blocked.length) {
        throw new Error(`fix --write only edits files that git can restore. These have unstaged changes or are untracked: ${blocked.join(', ')}. Commit or stash them, or pass --allow-dirty.`);
      }
    }
    for (const r of results) fs.writeFileSync(path.join(root, r.path), r.output);
  }

  const byRule = {};
  for (const r of results) for (const f of r.fixes) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  const fixes = results.reduce((n, r) => n + r.fixes.length, 0);
  return { results, skipped, summary: { files: results.length, fixes, byRule, remaining: added ? null : remaining, written: !!opts.write } };
}

function splitLines(text) {
  return text.match(/[^\n]*\n|[^\n]+$/g) || [];
}

// Myers' O(ND) diff on lines: D, the number of changed lines, is small for a fix.
function diffLines(a, b) {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const n = A.length;
  const m = B.length;
  const off = n + m + 1;
  let v = new Int32Array(2 * off + 1);
  const trace = [];
  let found = n === 0 && m === 0;
  for (let d = 0; d <= n + m && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && A[x] === B[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = true; break; }
    }
  }
  const mid = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    v = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? k + 1 : k - 1;
    const prevX = v[off + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { mid.push([' ', A[x - 1]]); x--; y--; }
    if (d > 0) {
      if (x === prevX) mid.push(['+', B[y - 1]]);
      else mid.push(['-', A[x - 1]]);
    }
    x = prevX;
    y = prevY;
  }
  mid.reverse();
  return [...a.slice(0, pre).map((l) => [' ', l]), ...mid, ...a.slice(a.length - suf).map((l) => [' ', l])];
}

/** A unified diff that `git apply` accepts. */
export function unifiedDiff(file, before, after, { context = 3, color = false } = {}) {
  const ops = diffLines(splitLines(before), splitLines(after));
  let ai = 0;
  let bi = 0;
  const rows = ops.map(([t, l]) => {
    const r = { t, l, ai, bi };
    if (t !== '+') ai++;
    if (t !== '-') bi++;
    return r;
  });
  const paint = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const out = [paint(1, `--- a/${file}`), paint(1, `+++ b/${file}`)];
  let i = 0;
  let any = false;
  while (i < rows.length) {
    if (rows[i].t === ' ') { i++; continue; }
    any = true;
    const start = Math.max(0, i - context);
    let end = i;
    let j = i;
    while (j < rows.length) {
      if (rows[j].t !== ' ') { end = j; j++; continue; }
      let k = j;
      while (k < rows.length && rows[k].t === ' ') k++;
      if (k < rows.length && k - j <= 2 * context) { j = k; continue; }
      break;
    }
    const stop = Math.min(rows.length, end + 1 + context);
    const hunk = rows.slice(start, stop);
    const aLen = hunk.filter((r) => r.t !== '+').length;
    const bLen = hunk.filter((r) => r.t !== '-').length;
    const aStart = aLen ? hunk[0].ai + 1 : hunk[0].ai;
    const bStart = bLen ? hunk[0].bi + 1 : hunk[0].bi;
    out.push(paint(36, `@@ -${aStart},${aLen} +${bStart},${bLen} @@`));
    for (const r of hunk) {
      const body = r.l.endsWith('\n') ? r.l.slice(0, -1) : r.l;
      out.push(r.t === '-' ? paint(31, `-${body}`) : r.t === '+' ? paint(32, `+${body}`) : ` ${body}`);
      if (!r.l.endsWith('\n')) out.push('\\ No newline at end of file');
    }
    i = stop;
  }
  return any ? out.join('\n') + '\n' : '';
}
