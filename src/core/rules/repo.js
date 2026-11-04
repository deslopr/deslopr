// deslopr-disable-file -- rule examples quote slop on purpose
// Repository hygiene: what a change should never commit, whatever wrote it.
import { re, matchAll, inView, proseView } from './helpers.js';

const SECRETS = [
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/g],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/g],
  ['Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{30,}/g],
  ['OpenAI key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}/g],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Stripe live key', /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}/g],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/g],
  ['Hugging Face token', /\bhf_[A-Za-z0-9]{30,}\b/g],
  ['credentials in URL', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/'"]+:[^\s:@/'"]{6,}@[\w.-]+/g],
];

export default [
  {
    id: 'repo/secret',
    domain: 'repo',
    severity: 'error',
    name: 'Committed credential',
    why: 'Agents paste working keys into config and examples to make things run. A pushed key is a leaked key.',
    fix: 'Remove it, rotate it, and read it from the environment or a secret store.',
    check(ctx) {
      const out = [];
      for (const [name, r] of SECRETS) {
        for (const m of matchAll(r, ctx.raw)) {
          if (name === 'credentials in URL' && /:\/\/[^:]+:(?:\$\{?|<|\*{3}|x{3}|password|pass|secret|token|changeme)/i.test(m[0])) continue;
          out.push({ index: m.index, match: `${m[0].slice(0, 8)}...`, severity: ctx.info.test ? 'warn' : undefined, message: `looks like a committed ${name}; rotate it if it is real` });
        }
      }
      return out;
    },
    examples: {
      bad: [{ path: 'config.js', text: 'const key = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";\n' }],
      good: [{ path: 'config.js', text: 'const key = process.env.GITHUB_TOKEN;\n' }],
    },
  },
  {
    id: 'repo/merge-conflict',
    domain: 'repo',
    severity: 'error',
    name: 'Conflict markers committed',
    why: 'A half-resolved merge breaks the file and usually the build.',
    fix: 'Resolve the conflict and remove the markers.',
    check(ctx) {
      if (!/^<{7}(?: |$)/m.test(ctx.raw) || !/^>{7}(?: |$)/m.test(ctx.raw)) return [];
      return [...matchAll(/^(?:<{7}|>{7})(?: [^\n]*)?$|^={7}$/gm, ctx.raw)].map((m) => ({ index: m.index, match: m[0].slice(0, 20) }));
    },
    examples: {
      bad: [{ path: 'a.js', text: '<<<<<<< HEAD\nconst a = 1;\n=======\nconst a = 2;\n>>>>>>> main\n' }],
      good: [{ path: 'a.md', text: 'Title\n=======\n\nText.\n' }],
    },
  },
  {
    id: 'repo/local-path',
    domain: 'repo',
    severity: 'warn',
    name: 'Machine-local path',
    why: 'An absolute path into someone\'s home folder works on one laptop and nowhere else.',
    fix: 'Use a path relative to the project, an environment variable, or a placeholder.',
    views: ['raw'],
    patterns: [
      re('(?<![\\w.-])\\/Users\\/(?!(?:Shared|user|username|me|you|name|yourname|someone|foo|example|runner|USER|vous|toi|moi|utilisateur|nom|votrenom|usuario|benutzer|tu)\\/)[A-Za-z0-9._-]+\\/', 'g'),
      re('(?<![\\w.-])\\/home\\/(?!(?:user|username|me|you|name|yourname|someone|foo|example|runner|ubuntu|root|node|app|vous|toi|moi|utilisateur|nom|votrenom|usuario|benutzer|tu)\\/)[a-z_][a-z0-9_-]*\\/(?:projects|src|code|repos|git|workspace|work|dev|Desktop|Documents|Downloads)\\/', 'g'),
      re('\\b[A-Z]:(?:\\\\\\\\|\\\\|\\/)Users(?:\\\\\\\\|\\\\|\\/)(?!(?:user|username|me|you|name|yourname|public|default|example|all users|vous|toi|moi|utilisateur|nom|votrenom|usuario|benutzer|tu)\\b)[A-Za-z0-9._-]+', 'gi'),
    ],
    examples: {
      bad: [{ path: 'build.sh', text: 'cp dist/* /Users/kevin/projects/site/\n' }, { path: 'a.json', text: '{ "out": "C:\\\\Users\\\\marc\\\\Desktop\\\\out" }\n' }],
      good: [{ path: 'build.sh', text: 'cp dist/* "$HOME/site/"\n# e.g. /Users/you/site\n' }, { path: 'GUIDE.md', text: 'Skills live in C:\\Users\\You\\.claude\\skills on Windows.\n' }, 'Vos fichiers sont dans /Users/vous/projets/site.'],
    },
  },
  {
    id: 'repo/invisible-unicode',
    domain: 'repo',
    severity: 'warn',
    name: 'Invisible or bidirectional characters',
    why: 'Zero-width spaces ride along when text is pasted from a chat window; bidi controls in code can hide what it really does.',
    fix: 'Delete them. In code, a bidi control should never be there.',
    check(ctx) {
      const out = [];
      for (const m of matchAll(/[\u200B\u2060\u00AD\uFEFF]/g, ctx.raw)) out.push({ index: m.index, match: `U+${m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`, message: 'invisible character (zero-width space, word joiner, soft hyphen or stray BOM)' });
      for (const m of matchAll(/[\u202A-\u202E\u2066-\u2069]/g, ctx.raw)) {
        out.push({ index: m.index, match: `U+${m[0].charCodeAt(0).toString(16).toUpperCase()}`, severity: ['code', 'markup', 'style'].includes(ctx.info.kind) ? 'error' : undefined, message: 'bidirectional control character' });
      }
      return out;
    },
    examples: {
      bad: ['The build\u200B passes on main.'],
      good: ['The build passes on main.'],
      fixes: [
        { text: 'The build\u200B passes on main.\n', output: 'The build passes on main.\n' },
        { path: 'a.js', text: '// Retry \uFEFF twice.\nretry(2);\n', output: '// Retry twice.\nretry(2);\n' },
        { text: 'Injects values \u200B\u200Bfrom the app context.\n', output: 'Injects values from the app context.\n' },
        { text: 'Ping @\u200Bteam in the channel.\n', output: 'Ping @\u200Bteam in the channel.\n' },
        { text: 'Call VeryLong\u200BClassName here.\n', output: 'Call VeryLong\u200BClassName here.\n' },
        { path: 'a.js', text: 'const sep = " \u200B";\n', output: 'const sep = " \u200B";\n' },
      ],
    },
    // Only zero-width characters that touch a space or tab: there they separate nothing and
    // cannot be a line-break hint or a mention breaker. Soft hyphens and bidi controls can be
    // intentional and are left for a person; so is anything inside strings or code.
    autofix(ctx) {
      const view = proseView(ctx);
      const out = [];
      for (const m of matchAll(/[\u200B\u2060\uFEFF]+/g, ctx.raw)) {
        const i = m.index;
        const j = i + m[0].length;
        const spaceBefore = /[ \t]/.test(ctx.raw[i - 1] || '');
        const spaceAfter = /[ \t]/.test(ctx.raw[j] || '');
        if (!spaceBefore && !spaceAfter) continue;
        if (!inView(ctx, view, i, j)) continue;
        out.push({ start: i, end: spaceBefore && spaceAfter ? j + 1 : j, text: '', line: ctx.positionOf(i).line });
      }
      return out;
    },
  },
  {
    id: 'repo/agent-report-file',
    domain: 'repo',
    severity: 'warn',
    name: 'Agent report committed as a file',
    why: 'IMPLEMENTATION_SUMMARY.md, FIXES_APPLIED.md and friends are an agent\'s notes to its user. They go stale the moment they land.',
    fix: 'Move what matters into the PR description, the changelog or real docs, and delete the file.',
    check(ctx) {
      const p = ctx.path;
      if (/(^|\/)\.github\//.test(p)) return [];
      const base = p.split('/').pop();
      const report = /^(?:[A-Z0-9]+_)+(?:SUMMARY|COMPLETE|COMPLETED|FIXES|FIXED|APPLIED|DONE|FINAL|REPORT|CHANGES|NOTES|STATUS|ANALYSIS|RESULTS)(?:_[A-Z0-9]+)*\.md$|^(?:SUMMARY|CHANGES|FIXES|FINAL|IMPLEMENTATION|REFACTOR(?:ING)?|MIGRATION|WORK|TASK|SESSION)_[A-Z0-9_]+\.md$/;
      if (report.test(base) && !/^(?:CHANGELOG|CONTRIBUTING|SECURITY|CODE_OF_CONDUCT|RELEASE_NOTES)/.test(base)) return [{ line: 1, match: base, message: `${base} reads as an agent's report to its user` }];
      if (!p.includes('/') && /^(?:test|debug|quick|tmp|temp|scratch|try|fix|check|verify|demo)_[\w-]+\.(?:py|js|ts|mjs|cjs|sh|rb)$/.test(base)) return [{ line: 1, match: base, severity: 'info', message: `${base}: a one-off script left at the repository root` }];
      return [];
    },
    examples: {
      bad: [{ path: 'IMPLEMENTATION_SUMMARY.md', text: '# Summary\n' }, { path: 'docs/FIXES_APPLIED.md', text: '# Fixes\n' }],
      good: [{ path: 'SUMMARY.md', text: '# Summary\n' }, { path: '.github/ISSUE_TEMPLATE/BUG_REPORT.md', text: '# Bug\n' }, { path: 'CHANGELOG.md', text: '# Changelog\n' }],
    },
  },
  {
    id: 'repo/duplicate-file',
    domain: 'repo',
    severity: 'warn',
    name: 'Second copy of a file',
    why: 'utils_v2.py, Header.old.tsx and "config copy.json" are forks of one file. Fixes now land in one copy.',
    fix: 'Keep one file. History lives in git.',
    check(ctx) {
      const p = ctx.path;
      if (/(^|\/)(?:migrations?|versions|versioned_docs|archive|legacy|fixtures?|__fixtures__|testdata)\//i.test(p)) return [];
      const base = p.split('/').pop();
      if (/(?:[_.-](?:v\d+|new|old|backup|bak|copy|final|fixed|updated|improved|enhanced|orig|tmp)| copy| \(\d+\))\.[\w]+$|\.(?:bak|orig|old)$/i.test(base)) {
        return [{ line: 1, match: base, message: `${base} looks like a copy of another file` }];
      }
      return [];
    },
    examples: {
      bad: [{ path: 'src/utils_v2.py', text: 'x = 1\n' }, { path: 'src/Header.old.tsx', text: 'export {};\n' }],
      good: [{ path: 'src/utils.py', text: 'x = 1\n' }, { path: 'db/migrations/0002_users_v2.sql', text: 'select 1;\n' }],
    },
  },
];
