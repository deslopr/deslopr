// What a path is: which views a file gets and which lexer reads it.

const EXT = {
  markdown: ['md', 'mdx', 'markdown', 'mdown'],
  text: ['txt', 'text', 'rst', 'adoc', 'asciidoc', 'org', 'tex'],
  markup: ['html', 'htm', 'xhtml', 'vue', 'svelte', 'astro', 'jsx', 'tsx', 'erb', 'hbs', 'handlebars', 'njk', 'liquid', 'twig', 'ejs', 'php'],
  style: ['css', 'scss', 'sass', 'less', 'styl', 'pcss'],
  code: [
    'js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'py', 'pyi', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'scala', 'swift',
    'c', 'h', 'cc', 'cpp', 'cxx', 'hpp', 'cs', 'fs', 'dart', 'lua', 'sql', 'sh', 'bash', 'zsh', 'fish', 'ps1',
    'r', 'pl', 'pm', 'ex', 'exs', 'elm', 'clj', 'zig', 'nim', 'jl', 'groovy', 'gradle', 'tf', 'hcl',
  ],
  config: ['json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'properties', 'xml', 'plist'],
};

const FAMILY_BY_EXT = {
  py: 'hash', pyi: 'hash', rb: 'hash', sh: 'hash', bash: 'hash', zsh: 'hash', fish: 'hash', ps1: 'hash', r: 'hash',
  pl: 'hash', pm: 'hash', ex: 'hash', exs: 'hash', yaml: 'hash', yml: 'hash', toml: 'hash', tf: 'hash', hcl: 'hash',
  ini: 'hash', cfg: 'hash', conf: 'hash', env: 'hash', properties: 'hash', jl: 'hash', nim: 'hash',
  sql: 'sql', lua: 'lua', elm: 'sql',
  css: 'css', scss: 'c', sass: 'c', less: 'c', styl: 'c', pcss: 'css',
  html: 'html', htm: 'html', xhtml: 'html', xml: 'html', plist: 'html', erb: 'html', hbs: 'html', handlebars: 'html',
  njk: 'html', liquid: 'html', twig: 'html', ejs: 'html', php: 'html', vue: 'html', svelte: 'html', astro: 'html',
  json: 'none', json5: 'c', jsonc: 'c',
};

const NAME_KIND = [
  [/(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|go\.sum|composer\.lock|Gemfile\.lock|bun\.lockb?)$/, 'data'],
  [/\.min\.(js|css)$|\.map$|\.(log|csv|tsv|jsonl|ndjson|sarif|snap|svg|lock)$/i, 'data'],
  [/(^|\/)(Dockerfile|Makefile|Justfile|Procfile|Vagrantfile)$/, 'code'],
  [/(^|\/)(README|CHANGELOG|CONTRIBUTING|LICENSE|NOTICE|AUTHORS|HISTORY)$/i, 'text'],
];

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'target', 'vendor', 'third_party', '.next', '.nuxt',
  '.svelte-kit', '.astro', '.output', 'coverage', '__pycache__', '.venv', 'venv', '.tox', '.mypy_cache', '.pytest_cache',
  '.turbo', '.cache', '.parcel-cache', '.idea', '.vscode', 'bower_components', '__snapshots__', '.terraform',
]);

export function extOf(path) {
  const base = path.split(/[\\/]/).pop() || '';
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i + 1).toLowerCase() : '';
}

/**
 * @param {string} path
 * @returns {{ kind: 'markdown'|'text'|'markup'|'style'|'code'|'config'|'data'|'unknown', ext: string, family: string, jsxLike: boolean, test: boolean }}
 */
export function classify(path) {
  const p = path.replace(/\\/g, '/');
  const ext = extOf(p);
  let kind = 'unknown';
  for (const [re, k] of NAME_KIND) if (re.test(p)) { kind = k; break; }
  if (kind === 'unknown') {
    for (const [k, list] of Object.entries(EXT)) if (list.includes(ext)) { kind = k; break; }
  }
  const jsxLike = ext === 'jsx' || ext === 'tsx';
  let family = FAMILY_BY_EXT[ext] || 'c';
  if (jsxLike) family = 'c';
  if (kind === 'markdown' || kind === 'text') family = 'none';
  if (/(^|\/)(Dockerfile|Makefile|Justfile|Procfile)$/.test(p)) family = 'hash';
  const test = /(^|\/)(tests?|__tests__|spec|specs|fixtures?|testdata|__mocks__)\/|(^|\/)test_[^/]*\.py$|_test\.(py|go|rs)$|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)conftest\.py$/.test(p);
  return { kind, ext, family, jsxLike, test };
}
