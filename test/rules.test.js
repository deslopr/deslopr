// Every rule documents itself with examples; every example is a test.
// bad: the rule must fire. good: the rule must stay quiet (the look-alike that keeps it precise).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanText, fixText, RULES } from '../src/core/index.js';

const asCase = (ex) => (typeof ex === 'string' ? { text: ex, path: 'example.md' } : ex);

for (const rule of RULES) {
  test(`${rule.id} has metadata and examples`, () => {
    for (const k of ['id', 'domain', 'severity', 'name', 'why', 'fix']) assert.ok(rule[k], `${rule.id} lacks ${k}`);
    assert.ok(rule.examples?.bad?.length, `${rule.id} needs at least one bad example`);
    assert.ok(rule.examples?.good?.length, `${rule.id} needs at least one good example (a look-alike that must not fire)`);
    assert.match(rule.id, /^(prose|code|ui|repo)\/[a-z0-9-]+$/);
  });
  for (const ex of rule.examples?.bad || []) {
    const c = asCase(ex);
    test(`${rule.id} fires on: ${c.text.slice(0, 60).replace(/\n/g, '\n')}`, () => {
      const r = scanText(c.text, { path: c.path, config: { rules: { [rule.id]: rule.severity } } });
      assert.ok(r.findings.some((f) => f.rule === rule.id), `expected ${rule.id} in ${c.path}; got ${JSON.stringify(r.findings.map((f) => f.rule))}`);
    });
  }
  for (const ex of rule.examples?.good || []) {
    const c = asCase(ex);
    test(`${rule.id} stays quiet on: ${c.text.slice(0, 60).replace(/\n/g, '\n')}`, () => {
      const r = scanText(c.text, { path: c.path });
      const hits = r.findings.filter((f) => f.rule === rule.id);
      assert.equal(hits.length, 0, `unexpected ${rule.id}: ${JSON.stringify(hits.map((f) => f.match))}`);
    });
  }
}

test('rule ids are unique', () => {
  const ids = RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

// Autofixes: each fix example states the exact output, look-alikes included (output equal to
// input). Fixing twice changes nothing, and a fixed file never gains a finding.
for (const rule of RULES.filter((r) => typeof r.autofix === 'function')) {
  test(`${rule.id} documents its autofix with examples`, () => {
    assert.ok(rule.examples.fixes?.length, `${rule.id} has an autofix and needs examples.fixes`);
    assert.ok(rule.examples.fixes.some((f) => f.output !== f.text), `${rule.id} needs a fix example that changes something`);
    assert.ok(rule.examples.fixes.some((f) => f.output === f.text), `${rule.id} needs a look-alike its fix must leave alone`);
  });
  for (const ex of rule.examples.fixes || []) {
    const path = ex.path || 'example.md';
    test(`${rule.id} fixes: ${ex.text.slice(0, 50).replace(/\n/g, '\\n')}`, () => {
      const r = fixText(ex.text, { path });
      assert.equal(r.output, ex.output);
      assert.equal(r.rejected, null);
      assert.equal(fixText(r.output, { path }).changed, false, 'fixing twice must change nothing');
      if (r.changed) assert.ok(r.after.findings.length < r.before.findings.length);
    });
  }
}

test('good examples never change under fix', () => {
  for (const rule of RULES) {
    for (const ex of rule.examples.good) {
      const c = asCase(ex);
      const r = fixText(c.text, { path: c.path });
      assert.equal(r.output, c.text, `${rule.id}: fix changed a good example`);
    }
  }
});
