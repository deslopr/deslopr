import prose from './prose.js';
import code from './code.js';
import ui from './ui.js';
import repo from './repo.js';

export const RULES = [...prose, ...code, ...ui, ...repo];
export const DOMAINS = ['prose', 'code', 'ui', 'repo'];

export function getRule(id) {
  return RULES.find((r) => r.id === id);
}
