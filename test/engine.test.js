import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText, slopIndex, grade } from '../src/core/index.js';
import { lex } from '../src/core/lexer.js';
import { buildViews, markdownProse } from '../src/core/views.js';
import { classify } from '../src/core/files.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (p) => fs.readFileSync(path.join(here, 'fixtures', p), 'utf8');
const rules = (r) => new Set(r.findings.map((f) => f.rule));

test('lexer separates comments, strings and code', () => {
  const src = 'const url = "http://x.dev/a"; // real comment\nconst s = \'it\\\'s\';\n/* block */ run();\n';
  const l = lex(src, 'c');
  assert.equal(l.comments.length, src.length);
  assert.match(l.comments, /real comment/);
  assert.match(l.comments, /block/);
  assert.doesNotMatch(l.comments, /http/);
  assert.doesNotMatch(l.code, /real comment|http/);
  assert.match(l.code, /run\(\)/);
});

test('lexer does not treat JSX apostrophes as strings', () => {
  const src = "<p>Don't panic</p>\n// a comment\n";
  assert.match(lex(src, 'c').comments, /a comment/);
});

test('python docstrings count as comments, f-strings do not break the lexer', () => {
  const v = buildViews('def f():\n    """Explain the thing."""\n    return f"{x} # not a comment"\n', classify('a.py'));
  assert.match(v.comments, /Explain the thing/);
  assert.doesNotMatch(v.comments, /not a comment/);
});

test('markdown prose view blanks code, links and front matter but keeps line numbers', () => {
  const md = '---\ntitle: delve\n---\nText [link](https://x.dev/delve) and `delve`.\n\n```js\n// delve\n```\nLast line\n';
  const p = markdownProse(md);
  assert.equal(p.length, md.length);
  assert.equal(p.split('\n').length, md.split('\n').length);
  assert.doesNotMatch(p, /delve/);
  assert.match(p, /Last line/);
});

test('slop quoted in markdown code is ignored', () => {
  const r = scanText('Use plain words.\n\n```\nIt\'s not a tool, it\'s a movement.\n```\n\nAvoid `I hope this helps`.\n', { path: 'a.md' });
  assert.equal(r.findings.length, 0);
});

test('ui view reads JSX text and copy strings, not class names', () => {
  const v = buildViews('const f = [{ title: "A seamless experience for every team" }];\nexport const X = () => <div className="flex items-center gap-2">Hello there friend</div>;\n', classify('a.tsx'));
  assert.match(v.ui, /seamless experience/);
  assert.match(v.ui, /Hello there friend/);
  assert.doesNotMatch(v.ui, /items-center/);
});

test('directives: next-line, line, range and file', () => {
  const t = "It's not a tool, it's a movement.\n<!-- deslopr-disable-next-line prose/binary-contrast -- quoted -->\nIt's not a tool, it's a movement.\nIt's not a tool, it's a movement. <!-- deslopr-disable-line -->\n<!-- deslopr-disable prose -->\nIt's not a tool, it's a movement.\n<!-- deslopr-enable prose -->\nIt's not a tool, it's a movement.\n";
  const lines = scanText(t, { path: 'a.md' }).findings.filter((f) => f.rule === 'prose/binary-contrast').map((f) => f.line);
  assert.deepEqual(lines, [1, 8]);
  const off = scanText('<!-- deslopr-disable-file -->\nI hope this helps!\n', { path: 'a.md' });
  assert.equal(off.findings.length, 0);
});

test('config: severity override, off, domains, languages, allow', () => {
  const t = "It's not a tool, it's a movement. Let's delve in. Ce n'est pas un outil, c'est une philosophie.";
  assert.equal(scanText(t, { path: 'a.md', config: { rules: { 'prose/binary-contrast': 'error' } } }).findings.find((f) => f.rule === 'prose/binary-contrast').severity, 'error');
  assert.ok(!rules(scanText(t, { path: 'a.md', config: { rules: { prose: 'off' } } })).has('prose/binary-contrast'));
  assert.equal(scanText(t, { path: 'a.md', config: { domains: ['code'] } }).findings.length, 0);
  const en = scanText(t, { path: 'a.md', config: { languages: ['en'] } }).findings.filter((f) => f.rule === 'prose/binary-contrast');
  assert.equal(en.length, 1);
  assert.ok(!rules(scanText('We delve into logs.', { path: 'a.md', config: { allow: ['delve'] } })).has('prose/ai-vocabulary'));
});

test('slop index rewards clusters and grades', () => {
  assert.equal(slopIndex(0, 1000, 10, 0), 0);
  assert.ok(slopIndex(9, 1000, 10, 3) > slopIndex(9, 1000, 10, 1));
  assert.equal(grade(0), 'A');
  assert.equal(grade(30), 'F');
});

test('sloppy fixtures are caught across domains and languages', () => {
  const expect = {
    'sloppy/launch-post.md': ['prose/binary-contrast', 'prose/throat-clearing', 'prose/rhetorical-reveal', 'prose/faux-insight', 'prose/negative-listing', 'prose/false-range', 'prose/summary-ending', 'prose/chatbot-closer', 'prose/emoji-decoration', 'prose/em-dash-density', 'prose/weasel-attribution'],
    'sloppy/post-fr.md': ['prose/binary-contrast', 'prose/throat-clearing', 'prose/rhetorical-reveal', 'prose/faux-insight', 'prose/negative-listing', 'prose/false-range', 'prose/summary-ending', 'prose/significance-inflation', 'prose/weasel-attribution'],
    'sloppy/Hero.tsx': ['ui/ai-gradient', 'ui/gradient-text', 'ui/blurred-orb', 'ui/eyebrow-label', 'ui/unsourced-stat', 'ui/unverified-claim', 'ui/dead-control', 'ui/glow-shadow', 'ui/missing-alt', 'ui/placeholder-person'],
    'sloppy/billing_service.py': ['code/version-suffix', 'code/redundant-docstring', 'code/step-comments', 'code/swallowed-error', 'code/speculative-generality', 'code/elided-code', 'code/emoji-in-code'],
  };
  for (const [file, ids] of Object.entries(expect)) {
    const r = scanText(fixture(file), { path: path.basename(file) });
    const got = rules(r);
    for (const id of ids) assert.ok(got.has(id), `${file}: expected ${id}; got ${[...got].join(', ')}`);
    assert.equal(r.grade, 'F', `${file} should grade F, got ${r.grade} (${r.index})`);
  }
});

test('clean fixtures produce no findings at all', () => {
  for (const file of fs.readdirSync(path.join(here, 'fixtures', 'clean'))) {
    const r = scanText(fixture(`clean/${file}`), { path: file });
    assert.deepEqual(r.findings.map((f) => `${f.rule}:${f.line} ${f.match}`), [], file);
  }
});

test('data files are skipped and huge inputs stay fast', () => {
  assert.equal(scanText('{"a": "I hope this helps"}', { path: 'package-lock.json' }).findings.length, 0);
  const big = fixture('sloppy/launch-post.md').repeat(200);
  const t = Date.now();
  scanText(big, { path: 'big.md' });
  assert.ok(Date.now() - t < 5000, 'a 200-copy document should scan in under 5 s');
});
