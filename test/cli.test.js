// deslopr-disable-file prose/chat-citation -- the fix tests write pasted citation markers on purpose
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { upsertBlock, removeBlock, pointerBlock, MARK_START, COMPACT_RULES } from '../src/node/templates.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(here, '..', 'bin', 'deslopr.js');

function run(args, { cwd, input } = {}) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, input, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'deslopr-'));
}

function gitRepo() {
  const dir = tmp();
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'test@example.com');
  g('config', 'user.name', 'Test');
  g('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, 'README.md'), "# Demo\n\nIt's not a tool, it's a movement.\n");
  g('add', '.');
  g('commit', '-q', '-m', 'init');
  return dir;
}

test('--stdin with exit codes and fail-on', () => {
  const cwd = tmp();
  const sloppy = 'I hope this helps!';
  assert.equal(run(['--stdin'], { input: sloppy, cwd }).code, 1);
  assert.equal(run(['--stdin', '--fail-on', 'none'], { input: sloppy, cwd }).code, 0);
  assert.equal(run(['--stdin'], { input: 'The cache expires after ten minutes.', cwd }).code, 0);
  assert.equal(run(['--stdin', '--fail-on', 'warn'], { input: "It's not a tool, it's a movement.", cwd }).code, 1);
  assert.equal(run(['--stdin'], { input: "It's not a tool, it's a movement.", cwd }).code, 0);
  assert.equal(run(['--format'], { cwd }).code, 2);
});

test('json and sarif outputs are valid and carry findings', () => {
  const j = JSON.parse(run(['--stdin', '--json', '--fail-on', 'none'], { input: 'I hope this helps!' }).out);
  assert.equal(j.files[0].findings[0].rule, 'prose/chatbot-artifact');
  const s = JSON.parse(run(['--stdin', '--format', 'sarif', '--fail-on', 'none'], { input: 'I hope this helps!' }).out);
  assert.equal(s.version, '2.1.0');
  assert.equal(s.runs[0].results[0].ruleId, 'prose/chatbot-artifact');
  const gh = run(['--stdin', '--format', 'github', '--fail-on', 'none'], { input: 'I hope this helps!' }).out;
  assert.match(gh, /^::error file=stdin\.md,line=1,col=1,title=deslopr prose\/chatbot-artifact::/m);
  const md = run(['--stdin', '--format', 'markdown', '--fail-on', 'none'], { input: 'I hope this helps!' }).out;
  assert.match(md, /\| `stdin\.md:1` \| error \|/);
});

test('rules and explain', () => {
  const r = run(['rules', '--json']);
  assert.equal(r.code, 0);
  assert.ok(JSON.parse(r.out).length > 50);
  const e = run(['explain', 'binary-contrast']);
  assert.equal(e.code, 0);
  assert.match(e.out, /Why:/);
  assert.equal(run(['explain', 'nope']).code, 2);
});

test('scans a folder and honours config ignore and rule overrides', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'a.md'), 'I hope this helps!\n');
  fs.mkdirSync(path.join(dir, 'vendor2'));
  fs.writeFileSync(path.join(dir, 'vendor2', 'b.md'), 'I hope this helps!\n');
  assert.equal(JSON.parse(run(['.', '--json', '--fail-on', 'none'], { cwd: dir }).out).summary.filesWithFindings, 2);
  fs.writeFileSync(path.join(dir, '.deslopr.json'), JSON.stringify({ ignore: ['vendor2/**'], rules: { 'prose/chatbot-artifact': 'warn' } }));
  const j = JSON.parse(run(['.', '--json', '--fail-on', 'none'], { cwd: dir }).out);
  assert.equal(j.summary.filesWithFindings, 1);
  assert.equal(j.files[0].findings[0].severity, 'warn');
  assert.equal(run(['.'], { cwd: dir }).code, 0);
});

test('--diff reports only added lines', () => {
  const dir = gitRepo();
  fs.appendFileSync(path.join(dir, 'README.md'), '\nLet me know if you have any questions!\n');
  fs.writeFileSync(path.join(dir, 'new.md'), 'Certainly! Here is the updated README.\n');
  const j = JSON.parse(run(['--diff', 'HEAD', '--json', '--fail-on', 'none'], { cwd: dir }).out);
  const found = j.files.flatMap((f) => f.findings.map((x) => `${f.path}:${x.rule}`));
  assert.ok(found.includes('README.md:prose/chatbot-closer'), found.join(' '));
  assert.ok(found.includes('new.md:prose/chatbot-artifact'), found.join(' '));
  assert.ok(!found.includes('README.md:prose/binary-contrast'), 'pre-existing line must not be reported');
  execFileSync('git', ['add', 'new.md'], { cwd: dir });
  const staged = JSON.parse(run(['--staged', '--json', '--fail-on', 'none'], { cwd: dir }).out);
  assert.deepEqual(staged.files.map((f) => f.path), ['new.md']);
});

test('hook: PostToolUse reports slop on edited lines with exit 2', () => {
  const dir = gitRepo();
  const file = path.join(dir, 'post.md');
  fs.writeFileSync(file, "Old line: it's not a bug, it's a feature.\nI hope this helps!\n");
  const input = JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: dir, tool_input: { file_path: file, old_string: 'x', new_string: 'I hope this helps!' } });
  const r = run(['hook'], { input, cwd: dir });
  assert.equal(r.code, 2);
  assert.match(r.err, /prose\/chatbot-artifact/);
  assert.doesNotMatch(r.err, /binary-contrast/);
  const clean = JSON.stringify({ hook_event_name: 'PostToolUse', cwd: dir, tool_input: { file_path: path.join(dir, 'README.md') , new_string: '# Demo' } });
  assert.equal(run(['hook'], { input: clean, cwd: dir }).code, 0);
  assert.equal(run(['hook'], { input: 'not json', cwd: dir }).code, 0);
});

test('hook: Stop checks the uncommitted change once', () => {
  const dir = gitRepo();
  fs.writeFileSync(path.join(dir, 'notes.md'), 'In conclusion, everything works.\n');
  const stop = run(['hook'], { input: JSON.stringify({ hook_event_name: 'Stop', cwd: dir, stop_hook_active: false }), cwd: dir });
  assert.equal(stop.code, 2);
  assert.match(stop.err, /notes\.md:1 \[prose\/summary-ending\]/);
  const again = run(['hook'], { input: JSON.stringify({ hook_event_name: 'Stop', cwd: dir, stop_hook_active: true }), cwd: dir });
  assert.equal(again.code, 0, 'must not loop when the stop hook is already active');
});

test('init installs, is idempotent, and uninstalls cleanly', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Project rules\n\nUse tabs.\n');
  fs.mkdirSync(path.join(dir, '.cursor'));
  let r = run(['init', '--agents', 'claude,codex,cursor', '--hook'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/deslopr/SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.agents/skills/deslopr/references/writing.md')));
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/deslopr.mdc')));
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Use tabs\./);
  assert.equal(agents.split(MARK_START).length, 2);
  const settings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
  assert.match(settings.hooks.PostToolUse[0].hooks[0].command, /deslopr(@latest)? hook/);
  run(['init', '--agents', 'claude,codex,cursor', '--hook'], { cwd: dir });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').split(MARK_START).length, 2, 'second run must not duplicate the block');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')).hooks.PostToolUse.length, 1);
  // The installed files must not trip the detector themselves.
  assert.equal(run(['.', '--fail-on', 'warn'], { cwd: dir }).code, 0, run(['.'], { cwd: dir }).out);
  r = run(['init', '--agents', 'claude,codex,cursor', '--uninstall'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  assert.ok(!fs.existsSync(path.join(dir, '.claude/skills/deslopr')));
  assert.ok(!fs.existsSync(path.join(dir, '.cursor/rules/deslopr.mdc')));
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').trim(), '# Project rules\n\nUse tabs.');
  assert.ok(!JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')).hooks);
});

test('init --dry-run writes nothing', () => {
  const dir = tmp();
  const r = run(['init', '--dry-run'], { cwd: dir });
  assert.equal(r.code, 0);
  assert.match(r.out, /CLAUDE\.md/);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('templates: block upsert keeps user content, compact rules fit 1,500 characters', () => {
  const block = pointerBlock({});
  const once = upsertBlock('# Mine\n', block);
  assert.equal(upsertBlock(once, block), once);
  assert.equal(removeBlock(once).trim(), '# Mine');
  assert.ok(COMPACT_RULES.length <= 1500);
});

test('fix previews a diff git can apply, refuses to write what git cannot restore, then writes', () => {
  const dir = gitRepo();
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  fs.writeFileSync(path.join(dir, 'notes.md'), 'Revenue grew last year【4†source】.\n\nI hope this helps!\n');
  fs.writeFileSync(path.join(dir, 'a.js'), 'function f(x) {\n  debugger;\n  return x;\n}\n');
  g('add', '.');
  g('commit', '-q', '-m', 'add');

  const preview = run(['fix'], { cwd: dir });
  assert.equal(preview.code, 1);
  assert.match(preview.out, /^--- a\/a\.js\n\+\+\+ b\/a\.js\n@@ -1,4 \+1,3 @@\n function f\(x\) \{\n-  debugger;\n/m);
  assert.match(preview.out, /3 fixes in 2 files .*Nothing was written/);
  assert.equal(g('status', '--porcelain'), '', 'a preview must not touch the tree');
  const patch = path.join(dir, '..', `${path.basename(dir)}.diff`);
  fs.writeFileSync(patch, preview.out.split('\ndeslopr fix:')[0]);
  g('apply', '--check', patch);

  fs.appendFileSync(path.join(dir, 'a.js'), '// local edit\n');
  const refused = run(['fix', '--write'], { cwd: dir });
  assert.equal(refused.code, 2);
  assert.match(refused.err, /unstaged changes or are untracked: a\.js/);
  assert.match(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), /source/, 'a refused write changes nothing');

  g('checkout', '--', 'a.js');
  const written = run(['fix', '--write'], { cwd: dir });
  assert.equal(written.code, 0);
  assert.match(written.out, /applied 3 fixes in 2 files/);
  assert.equal(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'Revenue grew last year.\n');
  assert.equal(fs.readFileSync(path.join(dir, 'a.js'), 'utf8'), 'function f(x) {\n  return x;\n}\n');
  assert.equal(run(['fix'], { cwd: dir }).code, 0);
});

test('fix --diff only touches added lines; --stdin and --json work', () => {
  const dir = gitRepo();
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  fs.writeFileSync(path.join(dir, 'notes.md'), 'Old line【1†source】.\n');
  g('add', '.');
  g('commit', '-q', '-m', 'old');
  g('checkout', '-q', '-b', 'feature');
  fs.appendFileSync(path.join(dir, 'notes.md'), 'New line【2†source】.\n');
  g('commit', '-qam', 'new');
  const r = run(['fix', '--diff', 'main', '--write'], { cwd: dir });
  assert.equal(r.code, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'Old line【1†source】.\nNew line.\n');

  const s = run(['fix', '--stdin', '--stdin-filename', 'x.md'], { input: 'Done.【3†source】\n' });
  assert.equal(s.code, 0);
  assert.equal(s.out, 'Done.\n');

  const j = JSON.parse(run(['fix', '--json'], { cwd: dir }).out);
  assert.equal(j.summary.fixes, 1);
  assert.equal(j.files[0].path, 'notes.md');
  assert.match(j.files[0].diff, /^-Old line【1†source】\.$/m);
});

test('fix --write outside git needs --allow-dirty', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'a.md'), 'Done.【3†source】\n');
  const r = run(['fix', '--write'], { cwd: dir });
  assert.equal(r.code, 2);
  assert.match(r.err, /not a git repository/);
  assert.equal(run(['fix', '--write', '--allow-dirty'], { cwd: dir }).code, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'a.md'), 'utf8'), 'Done.\n');
});
