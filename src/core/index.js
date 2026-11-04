// Browser-safe entry point: no Node APIs below this directory.
export { scanText, summarize, slopIndex, grade, matchesRuleId, effectiveSeverity, SEVERITIES } from './engine.js';
export { RULES, DOMAINS, getRule } from './rules/index.js';
export { classify } from './files.js';
export const VERSION = '0.1.0';
