// Command-line interface. Exit codes: 0 clean (or below --fail-on), 1 findings at or above
// --fail-on, 2 usage or runtime error. The hook command uses 2 to talk to the agent.
import fs from 'node:fs';
import { RULES, getRule, DOMAINS } from '../core/rules/index.js';
import { VERSION } from '../core/index.js';
import { loadConfig } from './config.js';
import { scanProject, scanString } from './scan.js';
import { formatText, formatJson, formatGithub, formatSarif, formatMarkdown, failed } from './report.js';
import { runHook } from './hook.js';
import { init, AGENTS } from './init.js';

const HELP = `deslopr ${VERSION}: find AI slop in prose, code and UI.

Usage
  deslopr [paths...] [options]     scan files and folders (default: .)
  deslopr rules [--json]           list every rule
  deslopr explain <rule>           why a rule exists, how to fix it, examples
  deslopr init [options]           install the skill and agent rules in this project
  deslopr hook [--stop]            agent hook entry point (reads the event on stdin)

Scan options
  --diff[=<base>]          only lines added since <base> (default: the default branch)
  --staged                 only staged lines (for pre-commit)
  --stdin                  read text from stdin; --stdin-filename sets its type (default stdin.md)
  --format <f>             text | json | github | sarif | markdown (default text)
  --json                   same as --format json
  --fail-on <sev>          error | warn | info | none (default error, or failOn in config)
  --min-severity <sev>     hide findings below this severity
  --verbose                also show info findings outside clusters
  --rule <id>              run only these rules (repeatable, accepts prose/* or prose)
  --disable <id>           turn rules off (repeatable)
  --domain <d>             prose, code, ui, repo (comma separated)
  --lang <l>               en, fr (comma separated; default all)
  --config <file>          use this config instead of .deslopr.json
  --no-config              ignore any config file
  --no-color               plain output

Init options
  --agents <list>          ${Object.keys(AGENTS).join(', ')}, all (default: detected)
  --global                 install the skill for your user instead of this project
  --hook                   add Claude Code hooks that check every edit and the final diff
  --dry-run                print what would change
  --uninstall              remove everything init added

Docs: https://github.com/deslopr/deslopr`;

const VALUE_FLAGS = new Set(['format', 'fail-on', 'min-severity', 'rule', 'disable', 'domain', 'lang', 'config', 'stdin-filename', 'agents', 'diff']);
const REPEAT = new Set(['rule', 'disable']);

export function parseArgs(argv) {
  const args = { _: [], rule: [], disable: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { args._.push(...argv.slice(i + 1)); break; }
    if (!a.startsWith('--')) {
      if (a === '-h') args.help = true;
      else if (a === '-v') args.version = true;
      else args._.push(a);
      continue;
    }
    let [k, v] = a.slice(2).split(/=(.*)/s);
    if (k.startsWith('no-')) { args[k.slice(3)] = false; continue; }
    // "--diff main" takes a ref; "--diff src/" keeps src/ as a path to scan.
    if (k === 'diff' && v === undefined && argv[i + 1] && !argv[i + 1].startsWith('-') && !fs.existsSync(argv[i + 1])) {
      v = argv[++i];
    }
    if (v === undefined && VALUE_FLAGS.has(k) && k !== 'diff') {
      v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`--${k} needs a value`);
      i++;
    }
    if (REPEAT.has(k)) args[k].push(...v.split(','));
    else args[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v === undefined ? true : v;
  }
  return args;
}

function readStdin() {
  return fs.readFileSync(0, 'utf8');
}

function out(s) {
  process.stdout.write(s.endsWith('\n') ? s : s + '\n');
}

function cmdRules(args) {
  if (args.json) return out(JSON.stringify(RULES.map(({ id, domain, severity, name, why, fix }) => ({ id, domain, severity, name, why, fix })), null, 2));
  const w = Math.max(...RULES.map((r) => r.id.length));
  for (const d of DOMAINS) {
    const list = RULES.filter((r) => r.domain === d);
    out(`\n${d} (${list.length})`);
    for (const r of list) out(`  ${r.id.padEnd(w)}  ${r.severity.padEnd(5)}  ${r.name}`);
  }
  out(`\n${RULES.length} rules. \`deslopr explain <id>\` for details.`);
  return 0;
}

function cmdExplain(args) {
  const id = args._[1];
  const rule = id && (getRule(id) || RULES.find((r) => r.id.endsWith('/' + id)));
  if (!rule) {
    process.stderr.write(`unknown rule ${id || ''}; see \`deslopr rules\`\n`);
    return 2;
  }
  const ex = (e) => (typeof e === 'string' ? e : `[${e.path}] ${e.text}`).trimEnd().split('\n').map((l) => `    ${l}`).join('\n');
  out(`${rule.id}  (${rule.domain}, ${rule.severity})\n${rule.name}\n\nWhy: ${rule.why}\nFix: ${rule.fix}\n\nFlags:\n${rule.examples.bad.map(ex).join('\n\n')}\n\nDoes not flag:\n${rule.examples.good.map(ex).join('\n\n')}`);
  return 0;
}

function cmdInit(args) {
  const agents = typeof args.agents === 'string' ? (args.agents === 'all' || args.agents === 'auto' ? args.agents : args.agents.split(',')) : 'auto';
  const { actions, agents: used } = init({ root: process.cwd(), agents, global: !!args.global, hook: !!args.hook, dryRun: !!args.dryRun, uninstall: !!args.uninstall });
  out(`${args.dryRun ? 'Would' : args.uninstall ? 'Removed for' : 'Installed for'}: ${used.map((id) => AGENTS[id].label).join('; ')}`);
  for (const a of actions) out(`  ${a}`);
  if (!args.uninstall && !args.dryRun) {
    out('\nNext: reload your agent, then ask it to "check this with deslopr" or run `npx deslopr --diff`.');
    if (!args.hook && used.includes('claude')) out('Tip: `npx deslopr init --hook` makes Claude Code check every edit automatically.');
  }
  return 0;
}

function cmdScan(args) {
  let { config, file, problems } = args.config === false ? { config: { failOn: 'error', rules: {} }, file: null, problems: [] } : loadConfig(process.cwd(), typeof args.config === 'string' ? args.config : undefined);
  for (const p of problems) process.stderr.write(`[warn] ${p}\n`);
  config = { ...config, rules: { ...config.rules } };
  for (const id of args.disable) config.rules[id] = 'off';
  if (args.rule.length) config.only = args.rule;
  if (typeof args.domain === 'string') config.domains = args.domain.split(',');
  if (typeof args.lang === 'string') config.languages = args.lang.split(',');
  const format = args.json ? 'json' : args.format || 'text';
  if (!['text', 'json', 'github', 'sarif', 'markdown'].includes(format)) throw new Error(`unknown format ${format}`);
  const failOn = args.failOn || config.failOn || 'error';
  let res;
  if (args.stdin) res = scanString(readStdin(), { filename: args.stdinFilename || 'stdin.md', config });
  else res = scanProject({ root: process.cwd(), targets: args._, config, diff: args.diff, staged: !!args.staged });
  const view = { verbose: !!args.verbose, minSeverity: args.minSeverity || 'info', color: args.color !== false && process.stdout.isTTY && !process.env.NO_COLOR };
  const render = { text: formatText, json: formatJson, github: formatGithub, sarif: formatSarif, markdown: formatMarkdown }[format];
  out(render(res.results, res.summary, view));
  for (const s of res.skipped) process.stderr.write(`[warn] skipped ${s}\n`);
  if (file && format === 'text' && args.verbose) process.stderr.write(`config: ${file}\n`);
  return failed(res.summary, failOn) ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`deslopr: ${e.message}\n`);
    return 2;
  }
  if (args.version) { out(VERSION); return 0; }
  if (args.help || args._[0] === 'help') { out(HELP); return 0; }
  try {
    switch (args._[0]) {
      case 'rules': return cmdRules(args);
      case 'explain': return cmdExplain(args);
      case 'init': return cmdInit(args);
      case 'hook': {
        const r = runHook({ argv });
        if (r.stderr) process.stderr.write(r.stderr + '\n');
        return r.code;
      }
      default:
        if (args._[0] === 'scan') args._.shift();
        return cmdScan(args);
    }
  } catch (e) {
    process.stderr.write(`deslopr: ${e.message}\n`);
    if (process.env.DESLOPR_DEBUG) process.stderr.write(e.stack + '\n');
    return 2;
  }
}
