// File discovery and git access. Everything that touches the disk or spawns a process lives here.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classify, SKIP_DIRS } from '../core/files.js';

const MAX_BYTES = 1024 * 1024;

export function git(cwd, args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    if (allowFail) return null;
    throw new Error(`git ${args.join(' ')} failed: ${(e.stderr || e.message).toString().trim()}`);
  }
}

// Temp folders reach git through symlinks (/var -> /private/var on macOS) or 8.3 short
// names (RUNNER~1 on Windows); compare real paths or files look outside the repository.
export function realPath(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

export function gitRoot(cwd) {
  const out = git(cwd, ['rev-parse', '--show-toplevel'], { allowFail: true });
  return out ? realPath(out.trim()) : null;
}

function globToRegExp(glob) {
  let s = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        s += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else s += '[^/]*';
    } else if (c === '?') s += '[^/]';
    else if ('.+^$()|[]{}\\'.includes(c)) s += '\\' + c;
    else s += c;
  }
  return new RegExp(`^${s}(?:/|$)`);
}

export function makeIgnore(patterns = []) {
  const res = patterns.map((p) => globToRegExp(p.replace(/^\.\//, '').replace(/\/$/, '')));
  return (rel) => res.some((r) => r.test(rel));
}

export function isBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

export function readText(file) {
  const st = fs.statSync(file);
  if (st.size > MAX_BYTES) return null;
  const buf = fs.readFileSync(file);
  if (isBinary(buf)) return null;
  return buf.toString('utf8');
}

const scannable = (rel) => {
  const { kind } = classify(rel);
  return kind !== 'data';
};

function walk(dir, root, out, ignore) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (ignore(rel)) continue;
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || (e.name.startsWith('.') && !['.github', '.claude', '.cursor', '.agents', '.windsurf', '.clinerules'].includes(e.name))) continue;
      walk(abs, root, out, ignore);
    } else if (e.isFile() && scannable(rel)) out.push(rel);
  }
}

/**
 * Files to scan under the given targets, relative to root. Inside a git repository the
 * list honours .gitignore; elsewhere a directory walk skips dependency and build folders.
 */
export function listFiles(root, targets, { ignore = [] } = {}) {
  const ig = makeIgnore(ignore);
  const out = new Set();
  const inGit = !!gitRoot(root);
  for (const t of targets.length ? targets : ['.']) {
    const abs = path.resolve(root, t);
    if (!fs.existsSync(abs)) throw new Error(`path not found: ${t}`);
    const st = fs.statSync(abs);
    if (st.isFile()) {
      out.add(path.relative(root, abs).split(path.sep).join('/'));
      continue;
    }
    if (inGit) {
      const listed = git(abs, ['ls-files', '-co', '--exclude-standard', '-z'], { allowFail: true });
      if (listed !== null) {
        for (const f of listed.split('\0').filter(Boolean)) {
          const rel = path.relative(root, path.join(abs, f)).split(path.sep).join('/');
          const parts = rel.split('/');
          if (parts.some((p) => SKIP_DIRS.has(p))) continue;
          if (ig(rel) || !scannable(rel)) continue;
          if (!fs.existsSync(path.join(root, rel))) continue;
          out.add(rel);
        }
        continue;
      }
    }
    const found = [];
    walk(abs, root, found, ig);
    for (const f of found) out.add(f);
  }
  return [...out].sort();
}

// Added lines per file between a base and the working tree (or the index with staged).
export function diffAddedLines(root, { base, staged }) {
  const args = ['-c', 'core.quotepath=off', 'diff', '--no-color', '--no-ext-diff', '--unified=0', '-M'];
  if (staged) args.push('--cached');
  else if (base) {
    const mb = git(root, ['merge-base', base, 'HEAD'], { allowFail: true });
    args.push(mb ? mb.trim() : base);
  }
  const text = git(root, args);
  const files = new Map();
  let cur = null;
  let line = 0;
  for (const raw of text.split('\n')) {
    if (raw.startsWith('+++ ')) {
      const p = raw.slice(4).trim();
      cur = p === '/dev/null' ? null : p.replace(/^"?b\//, '').replace(/"$/, '');
      if (cur && !files.has(cur)) files.set(cur, new Set());
      continue;
    }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(raw);
    if (h) {
      line = Number(h[1]);
      continue;
    }
    if (cur && raw.startsWith('+') && !raw.startsWith('+++')) {
      files.get(cur).add(line);
      line++;
    }
  }
  if (!staged) {
    // Untracked files are entirely new.
    const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z'], { allowFail: true }) || '';
    for (const f of untracked.split('\0').filter(Boolean)) if (!files.has(f)) files.set(f, 'all');
  }
  return files;
}

export function defaultBase(root) {
  const head = git(root, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], { allowFail: true });
  if (head) return head.trim();
  for (const b of ['origin/main', 'origin/master', 'main', 'master']) {
    if (git(root, ['rev-parse', '--verify', '--quiet', b], { allowFail: true })) return b;
  }
  return 'HEAD';
}
