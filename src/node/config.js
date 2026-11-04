// .deslopr.json (or "deslopr" in package.json) at the project root.
import fs from 'node:fs';
import path from 'node:path';
import { RULES } from '../core/rules/index.js';
import { matchesRuleId } from '../core/engine.js';

export const CONFIG_FILES = ['.deslopr.json', 'deslopr.config.json', '.desloprrc.json'];
const SEVERITIES = new Set(['error', 'warn', 'info', 'off']);

export const DEFAULT_CONFIG = {
  ignore: [],
  rules: {},
  allow: [],
  failOn: 'error',
};

export function findConfig(dir) {
  let cur = path.resolve(dir);
  for (;;) {
    for (const name of CONFIG_FILES) {
      const p = path.join(cur, name);
      if (fs.existsSync(p)) return p;
    }
    const pkg = path.join(cur, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, 'utf8')).deslopr) return pkg;
      } catch { /* not our problem here */ }
    }
    if (fs.existsSync(path.join(cur, '.git'))) return null;
    const up = path.dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

export function validateConfig(cfg, source = 'config') {
  const problems = [];
  if (cfg.rules && typeof cfg.rules === 'object') {
    for (const [pattern, value] of Object.entries(cfg.rules)) {
      if (!RULES.some((r) => matchesRuleId(pattern, r.id))) problems.push(`${source}: rule "${pattern}" matches no rule (see \`deslopr rules\`)`);
      const sev = typeof value === 'string' ? value : value && value.severity;
      if (sev && !SEVERITIES.has(sev)) problems.push(`${source}: rule "${pattern}" has unknown severity "${sev}"`);
    }
  }
  if (cfg.failOn && !['error', 'warn', 'info', 'none'].includes(cfg.failOn)) problems.push(`${source}: failOn must be error, warn, info or none`);
  if (cfg.languages && !Array.isArray(cfg.languages)) problems.push(`${source}: languages must be an array such as ["en", "fr"]`);
  return problems;
}

export function loadConfig(dir, explicit) {
  const file = explicit ? path.resolve(explicit) : findConfig(dir);
  if (!file) return { config: { ...DEFAULT_CONFIG }, file: null, problems: [] };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`could not read ${file}: ${e.message}`);
  }
  if (path.basename(file) === 'package.json') data = data.deslopr;
  const config = { ...DEFAULT_CONFIG, ...data, rules: { ...(data.rules || {}) } };
  return { config, file, problems: validateConfig(config, path.basename(file)) };
}
