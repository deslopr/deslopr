// Scan files on disk, a git diff, or text, with the project's config applied.
import path from 'node:path';
import { scanText, summarize, slopIndex, grade } from '../core/engine.js';
import { listFiles, readText, diffAddedLines, gitRoot, defaultBase, makeIgnore, realPath } from './fs.js';

const SEV_POINTS = { error: 5, warn: 3, info: 1 };

function rescore(result, kept) {
  const distinct = new Set(kept.map((f) => f.rule)).size;
  const points = kept.reduce((s, f) => s + SEV_POINTS[f.severity], 0);
  const index = slopIndex(points, result.words, result.lines, distinct);
  return { ...result, findings: kept, distinct, points, index, grade: grade(index), cluster: distinct >= 3 };
}

/**
 * @param {{ root: string, targets?: string[], config: object, diff?: string|boolean, staged?: boolean }} opts
 */
export function scanProject(opts) {
  const { config } = opts;
  const root = realPath(opts.root);
  const targets = opts.targets || [];
  const ignore = makeIgnore(config.ignore || []);
  let files;
  let added = null;
  if (opts.diff || opts.staged) {
    const repo = gitRoot(root);
    if (!repo) throw new Error('--diff and --staged need a git repository');
    const base = typeof opts.diff === 'string' ? opts.diff : defaultBase(repo);
    added = diffAddedLines(repo, { base, staged: opts.staged });
    const rel = (p) => path.relative(root, path.join(repo, p)).split(path.sep).join('/');
    const wanted = targets.length ? targets.map((t) => path.relative(root, path.resolve(root, t)).split(path.sep).join('/')) : null;
    files = [...added.keys()].map(rel).filter((p) => !p.startsWith('..') && !ignore(p) && (!wanted || wanted.some((w) => w === '' || w === '.' || p === w || p.startsWith(w + '/'))));
    const remapped = new Map();
    for (const [p, lines] of added) remapped.set(rel(p), lines);
    added = remapped;
  } else {
    files = listFiles(root, targets, { ignore: config.ignore || [] });
  }
  const results = [];
  const skipped = [];
  for (const rel of files) {
    let text;
    try {
      text = readText(path.join(root, rel));
    } catch (e) {
      skipped.push(`${rel}: ${e.message}`);
      continue;
    }
    if (text === null) continue;
    let r = scanText(text, { path: rel, config });
    if (added) {
      const lines = added.get(rel);
      if (lines && lines !== 'all') {
        // Keep findings on added lines; file-level findings (line 1 path rules, density) stay
        // when the change touched the file at all.
        r = rescore(r, r.findings.filter((f) => lines.has(f.line) || (f.line === 1 && /^repo\/(agent-report-file|duplicate-file)$/.test(f.rule)) || /density|cluster/.test(f.rule)));
      }
    }
    results.push(r);
  }
  return { results, summary: summarize(results), skipped };
}

export function scanString(text, { filename = 'stdin.md', config = {} } = {}) {
  const r = scanText(text, { path: filename, config });
  return { results: [r], summary: summarize([r]), skipped: [] };
}
