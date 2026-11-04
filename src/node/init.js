// `deslopr init`: install the skill and always-on pointers for the agents a project uses.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pointerBlock, cursorRule, windsurfRule, plainRule, upsertBlock, removeBlock, MARK_START } from './templates.js';
import { CONFIG_FILES } from './config.js';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL_NAME = 'deslopr';

export const AGENTS = {
  claude: { label: 'Claude Code', skillDir: '.claude/skills', globalSkillDir: '.claude/skills', pointer: 'CLAUDE.md', detect: ['.claude', 'CLAUDE.md'] },
  codex: { label: 'Codex and other AGENTS.md agents (Amp, Jules, OpenCode, Zed, Factory, Kimi)', skillDir: '.agents/skills', globalSkillDir: '.agents/skills', pointer: 'AGENTS.md', detect: ['AGENTS.md', '.codex', '.agents'] },
  cursor: { label: 'Cursor', rule: '.cursor/rules/deslopr.mdc', render: cursorRule, detect: ['.cursor', '.cursorrules'] },
  copilot: { label: 'GitHub Copilot', pointer: '.github/copilot-instructions.md', detect: ['.github/copilot-instructions.md', '.github/instructions'] },
  gemini: { label: 'Gemini CLI', pointer: 'GEMINI.md', detect: ['GEMINI.md', '.gemini'] },
  windsurf: { label: 'Windsurf', rule: '.windsurf/rules/deslopr.md', render: windsurfRule, detect: ['.windsurf', '.windsurfrules'] },
  cline: { label: 'Cline', rule: '.clinerules/deslopr.md', render: plainRule, detect: ['.clinerules'] },
};

export function detectAgents(root) {
  const found = Object.entries(AGENTS).filter(([, a]) => a.detect.some((d) => fs.existsSync(path.join(root, d)))).map(([id]) => id);
  return found.length ? found : ['claude', 'codex'];
}

function copyDir(src, dest, actions, dry) {
  actions.push(`copy ${path.relative(PACKAGE_ROOT, src) || src} -> ${dest}`);
  if (dry) return;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function writeFile(file, content, actions, dry, verb = 'write') {
  actions.push(`${verb} ${file}`);
  if (dry) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function hookCommand(root) {
  const local = fs.existsSync(path.join(root, 'node_modules', 'deslopr', 'package.json'));
  return local ? 'npx --no-install deslopr hook' : 'npx --yes deslopr@latest hook';
}

function mergeClaudeHooks(settingsFile, command, actions, dry, remove = false) {
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    } catch {
      actions.push(`skip ${settingsFile}: not valid JSON, left untouched`);
      return;
    }
  }
  const hooks = settings.hooks || {};
  const strip = (list) => (list || []).map((entry) => ({ ...entry, hooks: (entry.hooks || []).filter((h) => !/deslopr(@[\w.-]+)? hook/.test(h.command || '')) })).filter((e) => e.hooks.length);
  hooks.PostToolUse = strip(hooks.PostToolUse);
  hooks.Stop = strip(hooks.Stop);
  if (!remove) {
    hooks.PostToolUse.push({ matcher: 'Write|Edit|MultiEdit', hooks: [{ type: 'command', command, timeout: 30 }] });
    hooks.Stop.push({ hooks: [{ type: 'command', command: `${command} --stop`, timeout: 60 }] });
  }
  for (const k of ['PostToolUse', 'Stop']) if (!hooks[k].length) delete hooks[k];
  settings.hooks = hooks;
  if (!Object.keys(hooks).length) delete settings.hooks;
  writeFile(settingsFile, JSON.stringify(settings, null, 2) + '\n', actions, dry, remove ? 'update' : 'merge hooks into');
}

/**
 * @param {{ root: string, agents?: string[]|'auto'|'all', global?: boolean, hook?: boolean, dryRun?: boolean, uninstall?: boolean }} opts
 */
export function init(opts) {
  const root = path.resolve(opts.root);
  const dry = !!opts.dryRun;
  const actions = [];
  let ids = opts.agents === 'all' ? Object.keys(AGENTS) : !opts.agents || opts.agents === 'auto' ? detectAgents(root) : opts.agents;
  const unknown = ids.filter((id) => !AGENTS[id]);
  if (unknown.length) throw new Error(`unknown agent ${unknown.join(', ')}; choose from ${Object.keys(AGENTS).join(', ')}`);
  ids = [...new Set(ids)];
  const skillSrc = path.join(PACKAGE_ROOT, 'skills', SKILL_NAME);
  const base = opts.global ? os.homedir() : root;

  // 1. The skill, once per folder (several agents share .agents/skills).
  const skillDirs = [...new Set(ids.map((id) => (opts.global ? AGENTS[id].globalSkillDir : AGENTS[id].skillDir)).filter(Boolean))];
  for (const dir of skillDirs) {
    const dest = path.join(base, dir, SKILL_NAME);
    if (opts.uninstall) {
      actions.push(`remove ${dest}`);
      if (!dry) fs.rmSync(dest, { recursive: true, force: true });
    } else copyDir(skillSrc, dest, actions, dry);
  }
  const skillPath = skillDirs.length ? `${opts.global ? '~/' : ''}${skillDirs[0]}/${SKILL_NAME}` : `.claude/skills/${SKILL_NAME}`;

  if (opts.global) {
    const noGlobal = ids.filter((id) => !AGENTS[id].globalSkillDir);
    if (noGlobal.length) actions.push(`note: ${noGlobal.map((id) => AGENTS[id].label).join(', ')} read rules per project; run init inside the project for them`);
    return { actions, agents: ids };
  }

  // 2. Always-on pointers and rule files.
  const opts2 = { skillPath, cmd: 'npx deslopr' };
  for (const id of ids) {
    const a = AGENTS[id];
    if (a.pointer) {
      const file = path.join(root, a.pointer);
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (opts.uninstall) {
        if (existing.includes(MARK_START)) writeFile(file, removeBlock(existing), actions, dry, 'update');
      } else writeFile(file, upsertBlock(existing, pointerBlock(opts2)), actions, dry, existing ? 'update' : 'write');
    }
    if (a.rule) {
      const file = path.join(root, a.rule);
      if (opts.uninstall) {
        if (fs.existsSync(file)) {
          actions.push(`remove ${file}`);
          if (!dry) fs.rmSync(file);
        }
      } else writeFile(file, a.render(opts2), actions, dry);
    }
  }

  // 3. A starter config, never overwritten.
  if (!opts.uninstall && !CONFIG_FILES.some((f) => fs.existsSync(path.join(root, f)))) {
    const cfg = { $schema: 'https://raw.githubusercontent.com/deslopr/deslopr/main/schema.json', ignore: [], rules: {}, allow: [], failOn: 'error' };
    writeFile(path.join(root, '.deslopr.json'), JSON.stringify(cfg, null, 2) + '\n', actions, dry);
  }

  // 4. Claude Code hooks, on request.
  if ((opts.hook || opts.uninstall) && ids.includes('claude')) {
    const file = path.join(root, '.claude', 'settings.json');
    if (opts.uninstall && !fs.existsSync(file)) return { actions, agents: ids };
    mergeClaudeHooks(file, hookCommand(root), actions, dry, !!opts.uninstall);
  }
  return { actions, agents: ids };
}
