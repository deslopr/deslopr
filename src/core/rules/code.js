// deslopr-disable-file -- rule examples quote slop on purpose
// Code patterns: what coding agents leave in comments, tests and definitions.
import { re, matchAll } from './helpers.js';

const CODE_KINDS = ['code', 'markup', 'style'];

const STOP = new Set('a an the this that these those to of for in on at by with from into and or is are be it its we our my your all each every some any through over then here there now just simply new value values variable var data object item items list function method'.split(' '));
const WHY = /\b(?:because|since|so that|otherwise|why|avoid|workaround|hack|note|todo|fixme|xxx|warning|careful|must|never|always|only|unless|except|until|in case|required|expects?|assum\w*|edge|bug|issue|see|https?|eslint|prettier|noqa|type:|pragma|ts-)\b/i;
const VERBS = new Set('initialize initialise init set sets setting get gets getting create creates define defines declare declares call calls return returns import imports check checks loop loops iterate iterates increment increments decrement add adds update updates print prints log logs save saves load loads fetch fetches read reads write writes open opens close closes start starts stop stops handle handles compute computes calculate calculates convert converts parse parses validate validates render renders build builds make makes store stores assign assigns append appends push pushes remove removes delete deletes send sends run runs execute executes apply applies use uses instantiate instantiates export exports'.split(' '));

function identParts(code) {
  const out = new Set();
  for (const id of code.match(/[A-Za-z_$][\w$]*/g) || []) {
    for (const part of id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_$]+/g, ' ').toLowerCase().split(/\s+/)) {
      if (!part) continue;
      out.add(part);
      out.add(part.replace(/(?:es|s)$/, ''));
    }
  }
  return out;
}

const stem = (w) => w.replace(/(?:ies)$/, 'y').replace(/(?:es|s)$/, '');

function viewLines(text) {
  return text ? text.split('\n') : [];
}

function lineIndex(ctx, line) {
  return ctx.starts[line - 1] ?? 0;
}

// A full-line // or # comment: no code on the line, and not part of a /* */ block.
function fullLineComment(commentLine, codeLine) {
  if (codeLine.trim() !== '') return null;
  const m = /^\s*(?:\/\/+|#+)(?!!)\s?(.*)$/.exec(commentLine);
  return m ? m[1].trim() : null;
}

export default [
  {
    id: 'code/elided-code',
    domain: 'code',
    severity: 'error',
    kinds: CODE_KINDS,
    name: 'Placeholder standing in for code',
    why: '"// ... rest of the code" or "# existing implementation here" means an agent replaced real code with a placeholder. Whatever was there is gone.',
    fix: 'Restore the missing code from git history, or write it. Never ship the placeholder.',
    views: ['comments'],
    patterns: [
      re('(?:\\/\\/+|#+|\\/\\*+|\\{\\/\\*|<!--)[ \\t]*\\.{3}[ \\t]*(?:rest|existing|remaining|other|previous|unchanged|more|same|keep)\\b[^\\n]*', 'giu'),
      re('(?:\\/\\/+|#+|\\/\\*+|\\{\\/\\*|<!--)[ \\t]*(?:rest of (?:the )?(?:code|implementation|file|function|component|logic|class|methods?|module)|(?:the )?existing (?:code|logic|implementation|methods?|functions?|imports)(?: (?:here|remains?|unchanged|goes here|stays|as before))?|(?:your|the) (?:code|implementation|logic) (?:goes )?here|implementation (?:goes )?here|add (?:your|more) (?:code|logic) here|(?:code|implementation) (?:remains|stays) (?:the same|unchanged)|unchanged code|same as before)\\b[^\\n]*', 'giu'),
    ],
    examples: {
      bad: [
        { path: 'a.js', text: 'function save(user) {\n  // ... rest of the code\n}\n' },
        { path: 'a.py', text: 'class Cart:\n    # existing methods remain unchanged\n    pass\n' },
      ],
      good: [{ path: 'a.js', text: '// Keep the rest of the queue untouched when one job fails.\nrun();\n' }],
    },
  },
  {
    id: 'code/edit-narration',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Comment narrates the edit',
    why: '"// Added error handling" or "// Now uses the new API" describes the diff, not the code. It is true for one commit and noise forever after.',
    fix: 'Delete it, or rewrite it to say why the code is this way. History belongs in the commit message.',
    views: ['comments'],
    patterns: [
      re('(?:\\/\\/+|#+|\\/\\*+|^\\s*\\*|<!--)[ \\t]*(?:(?:Added|Updated|Changed|Modified|Fixed|Removed|Replaced|Refactored|Moved|Renamed|Reverted|Tweaked|Adjusted)\\s+(?:the |this |a |an |to |for |from |missing |new |proper |extra |support for |error handling|null checks?|validation |logging|type hints?|try\\/catch|guard )|(?:bug ?)?fix(?:ed)? for (?:the |issue|bug|#)|this (?:change|fix|update|edit|patch) (?:ensures|makes|prevents|adds|fixes|will)|now (?:we |it |this )?(?:uses|use|handles|returns|supports|checks|correctly|properly)\\b|previously,|previously (?:we|this|it)\\b|changed from |instead of the old|was:\\s)', 'gimu'),
      re('(?:\\/\\/+|#+|\\/\\*+|^\\s*\\*|<!--)[ \\t]*(?:FIX(?:ED)?|Fix(?:ed)?|CHANGED|Changed|UPDATED|Updated|NEW|New|ADDED|Added|MODIFIED|Modified|REMOVED|Removed)\\s*:', 'gmu'),
    ],
    examples: {
      bad: [
        { path: 'a.ts', text: '// Added error handling for the fetch call\nconst res = await fetch(url);\n' },
        { path: 'a.py', text: '# Now uses the new pricing API\nprice = get_price(sku)\n' },
        { path: 'a.go', text: '// FIX: changed timeout to 30s\nconst timeout = 30\n' },
      ],
      good: [
        { path: 'a.ts', text: '// Retries cover the 502s the gateway returns during deploys.\nconst res = await fetchWithRetry(url);\n' },
        { path: 'a.py', text: '# Removed items stay in the trash for 30 days.\npurge(items)\n' },
        { path: 'a.js', text: '// Added code is compared against the base branch.\n// changed: repo-relative paths of edited files.\nscan(changed);\n' },
      ],
    },
  },
  {
    id: 'code/review-provenance',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Review history in a code comment',
    why: '"Per the reviewer\'s request" or "addressed feedback" records how the code was negotiated, not what it does.',
    fix: 'Say why the code is this way, or delete the comment. Put review history in the PR.',
    views: ['comments'],
    patterns: [
      re('\\b(?:address(?:ed|es|ing)? (?:the )?(?:review|feedback|comments?)|per (?:the |your )?(?:review|reviewer|feedback|request)|as (?:requested|suggested|asked) (?:by|in) (?:the )?(?:review|reviewer|user|you|PR)|(?:the )?reviewer (?:asked|wanted|suggested|flagged|noted|pointed out)|as (?:you|the user) (?:requested|asked|suggested)|per user request|(?:review|feedback) round \\d+|\\(round \\d+\\))', 'giu'),
    ],
    examples: {
      bad: [{ path: 'a.js', text: '// Per the reviewer, use a Map here\nconst seen = new Map();\n' }],
      good: [{ path: 'a.js', text: '// A Map keeps insertion order, which the report relies on.\nconst seen = new Map();\n' }],
    },
  },
  {
    id: 'code/narrating-comment',
    domain: 'code',
    severity: 'info',
    kinds: CODE_KINDS,
    name: 'Comment restates the next line',
    why: '"// Initialize the counter" above "let counter = 0" doubles the reading without adding anything. Three or more in one file is a strong tell.',
    fix: 'Delete it. A comment earns its line by saying what the code cannot: a reason, a constraint, a trap.',
    options: { clusterAt: 3 },
    check(ctx, opt) {
      const cl = viewLines(ctx.views.comments);
      const co = viewLines(ctx.views.code);
      const hits = [];
      for (let i = 0; i < cl.length; i++) {
        const text = fullLineComment(cl[i], co[i] || '');
        if (!text || WHY.test(text)) continue;
        const words = (text.toLowerCase().match(/[a-z]+/g) || []);
        if (words.length < 2 || words.length > 8) continue;
        let j = i + 1;
        while (j < co.length && co[j].trim() === '') j++;
        if (j >= co.length || j - i > 2) continue;
        const parts = identParts(co[j]);
        const content = words.filter((w) => !STOP.has(w));
        const nouns = content.filter((w) => !VERBS.has(w));
        if (!nouns.length) continue;
        if (nouns.every((w) => parts.has(w) || parts.has(stem(w)))) hits.push({ line: i + 1, text });
      }
      const sev = hits.length >= opt.clusterAt ? 'warn' : undefined;
      return hits.map((h) => ({ index: lineIndex(ctx, h.line), match: h.text, severity: sev, message: sev ? `comment restates the next line (${hits.length} in this file)` : undefined }));
    },
    examples: {
      bad: [{ path: 'a.js', text: '// Initialize the counter\nlet counter = 0;\n' }, { path: 'a.py', text: '# Return the result\nreturn result\n' }],
      good: [{ path: 'a.js', text: '// Start at 1: row 0 is the header.\nlet counter = 1;\n' }],
    },
  },
  {
    id: 'code/step-comments',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Step-by-step narration',
    why: '"// Step 1: validate input", "// Step 2: ..." numbers what the control flow already shows.',
    fix: 'Delete the step labels. If the flow is hard to follow, split it into named functions.',
    check(ctx) {
      const text = ctx.views.comments;
      if (!text) return [];
      const hits = [...matchAll(/(?:\/\/+|#+|\/\*+|\{\/\*)[ \t]*(?:Step|Étape|Etape|Phase)[ \t]+\d+[ \t]*[:.)\-–—]/giu, text)];
      return hits.length >= 3 ? hits.map((m) => ({ index: m.index, match: m[0].trim(), message: `numbered step comments (${hits.length} in this file)` })) : [];
    },
    examples: {
      bad: [{ path: 'a.ts', text: '// Step 1: Validate input\nvalidate(x);\n// Step 2: Process\nprocess(x);\n// Step 3: Return\nreturn x;\n' }],
      good: [{ path: 'a.ts', text: '// Step 1 of the OAuth dance happens in the browser, see login.ts.\nexchange(code);\n' }],
    },
  },
  {
    id: 'code/banner-comment',
    domain: 'code',
    severity: 'info',
    kinds: CODE_KINDS,
    name: 'Decorative banner comment',
    why: 'A label boxed between rows of ===== or ───── is decoration. The block itself is a classic generated-code signature.',
    fix: 'Use one plain comment line, or none; if a file needs sections, it may need splitting.',
    check(ctx) {
      const cl = viewLines(ctx.views.comments);
      const co = viewLines(ctx.views.code);
      const out = [];
      const sep = (l) => /^\s*(?:\/\/+|#+|\/\*+|\*+|--)\s*[=\-*#~─═━_+]{10,}\s*(?:\*\/)?\s*$/u.test(l);
      for (let i = 1; i < cl.length - 1; i++) {
        if ((co[i] || '').trim()) continue;
        const label = /^\s*(?:\/\/+|#+|\*+|--)\s*([\p{L}][^\n]{1,50})$/u.exec(cl[i]);
        if (label && sep(cl[i - 1]) && sep(cl[i + 1])) out.push({ index: lineIndex(ctx, i + 1), match: label[1].trim(), message: 'label boxed between separator rows' });
      }
      for (const m of matchAll(/(?:\/\/+|#+|\/\*+|--)[ \t]*[=\-*#~─═━_+]{4,}[ \t]*[\p{L}][^\n]{0,40}?[ \t][=\-*#~─═━_+]{4,}/gu, ctx.views.comments || '')) {
        out.push({ index: m.index, match: m[0].trim(), severity: 'info', message: 'label wrapped in decoration' });
      }
      return out;
    },
    examples: {
      bad: [{ path: 'a.py', text: '# ==========================================\n# CONFIGURATION\n# ==========================================\nDEBUG = False\n' }],
      good: [{ path: 'a.py', text: '# Configuration is read once at import time.\nDEBUG = False\n' }],
    },
  },
  {
    id: 'code/emoji-in-code',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Emoji in comments or log lines',
    why: '✅, 🚀 and 🔥 in comments and log output are the default vocabulary of generated code, and they break grep and some terminals.',
    fix: 'Write the word ("done", "failed") or nothing.',
    patterns: [
      { views: ['comments'], re: re('(?![©®™])\\p{Extended_Pictographic}', 'gu') },
      { views: ['raw'], re: re('(?:console\\.(?:log|info|warn|error|debug)|\\bprint|\\bprintln!?|\\blogger\\.\\w+|\\blogging\\.\\w+|\\blog\\.\\w+|\\becho|\\bputs|fmt\\.Print\\w*)\\s*\\(?\\s*f?["\'`][^"\'`\\n]*?(?![©®™])\\p{Extended_Pictographic}', 'gu') },
    ],
    examples: {
      bad: [{ path: 'a.js', text: 'console.log("✅ Server started");\n' }, { path: 'a.py', text: '# 🚀 Fast path\nrun()\n' }],
      good: [{ path: 'a.js', text: 'console.log("Server started on", port);\n// © 2026 Example Inc.\n' }],
    },
  },
  {
    id: 'code/swallowed-error',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Error swallowed silently',
    why: 'An empty catch or "except Exception: pass" turns a visible crash into invisible corruption. Agents add them to make errors go away.',
    fix: 'Catch the specific error you expect and handle it, or let it raise. If ignoring is deliberate, say why in a comment inside the block.',
    check(ctx) {
      const code = ctx.views.code;
      if (!code) return [];
      const out = [];
      const pats = [
        [/\bexcept\s*(?:\(?\s*(?:Exception|BaseException)\s*\)?)?(?:\s+as\s+\w+)?\s*:[ \t]*(?:\n[ \t]*)?(?:pass|\.\.\.)[ \t]*$/gm, 'broad except that does nothing'],
        [/\bexcept\s*(?:\(?\s*(?:Exception|BaseException)\s*\)?)?(?:\s+as\s+\w+)?\s*:[ \t]*\n[ \t]*return(?:[ \t]+(?:None|False|0|\[\]|\{\}|\(\)))?[ \t]*$/gm, 'broad except that returns a default'],
        [/\bcatch\s*(?:\(\s*[^)]*\))?\s*\{\s*\}/g, 'empty catch block'],
        [/\.catch\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>\s*(?:\{\s*\}|null|undefined|void 0)\s*\)/g, 'promise error discarded', 'info'],
        [/\bif\s+err\s*!=\s*nil\s*\{\s*\}/g, 'error checked and ignored'],
      ];
      for (const [r, msg, severity] of pats) {
        for (const m of matchAll(r, code)) {
          const raw = ctx.raw.slice(m.index, m.index + m[0].length);
          if (/\/\/|#|\/\*/.test(raw.replace(/^[^:{]*[:{]/, ''))) continue;
          out.push({ index: m.index, match: m[0].replace(/\s+/g, ' ').trim(), message: msg, severity });
        }
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'a.py', text: 'try:\n    sync()\nexcept Exception:\n    pass\n' },
        { path: 'a.ts', text: 'try {\n  sync();\n} catch (e) {}\n' },
        { path: 'a.js', text: 'load().catch(() => {});\n' },
      ],
      good: [
        { path: 'a.py', text: 'try:\n    n = int(s)\nexcept ValueError:\n    n = 0\n' },
        { path: 'a.ts', text: 'try {\n  fs.unlinkSync(tmp);\n} catch {\n  // The file may already be gone; nothing to clean.\n}\n' },
      ],
    },
  },
  {
    id: 'code/speculative-generality',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Code kept "for future use"',
    why: 'Flexibility for a future nobody asked for costs review, grep hits and false confidence today.',
    fix: 'Delete what has no caller (git remembers). Add the abstraction when the second use case arrives.',
    views: ['comments'],
    patterns: [
      re('\\b(?:for (?:possible |potential )?future (?:use|extensibility|expansion|flexibility|needs|proofing|reference)|future-proof\\w*|in case we (?:ever )?(?:need|want)|can be (?:easily )?extended (?:later|in the future)|(?:placeholder|stub) for (?:future|later)|not (?:currently|yet) used|reserved for future|(?:might|may|could|can) be useful (?:later|in the future|someday)|for extensibility|to be extensible)\\b', 'giu'),
    ],
    examples: {
      bad: [{ path: 'a.ts', text: '// Kept for future use\nexport function toXml(r) { return ""; }\n' }],
      good: [{ path: 'a.ts', text: '// Used by the nightly export job (jobs/export.ts).\nexport function toXml(r) { return ""; }\n' }],
    },
  },
  {
    id: 'code/vague-todo',
    domain: 'code',
    severity: 'info',
    kinds: CODE_KINDS,
    name: 'TODO with no task in it',
    why: '"TODO: improve this" names a feeling, not a task. Nobody can act on it.',
    fix: 'Write what, and why, or delete it.',
    views: ['comments'],
    patterns: [
      re('\\b(?:TODO|FIXME|XXX)\\b:?[ \\t]*(?:implement(?: this| me)?|add (?:more )?(?:error handling|validation|tests?|logic|features?)|improve(?: this)?|optimi[sz]e(?: this)?|refactor(?: this)?|handle (?:errors?|edge cases|this)|fix(?: this| later)?|clean ?up|make (?:this )?better|finish(?: this)?|complete(?: this)?)[ \\t]*(?:later|here|properly|eventually|in the future|if needed)?[ \\t.!]*(?:\\*\\/|-->)?[ \\t]*$', 'gmu'),
    ],
    examples: {
      bad: [{ path: 'a.js', text: 'function f() {\n  // TODO: improve this\n}\n' }],
      good: [{ path: 'a.js', text: '// TODO(#412): stream rows instead of loading the whole CSV once files pass 1 GB.\n' }],
    },
  },
  {
    id: 'code/redundant-docstring',
    domain: 'code',
    severity: 'warn',
    kinds: CODE_KINDS,
    name: 'Docstring echoes the signature',
    why: '"""Get the user.""" on get_user(), or "@param name The name.", says nothing the signature does not.',
    fix: 'Delete it, or document what the name cannot say: units, edge cases, errors, side effects.',
    check(ctx) {
      const out = [];
      const raw = ctx.raw;
      const echo = (doc, name) => {
        const words = (doc.toLowerCase().match(/[a-z]+/g) || []).filter((w) => !STOP.has(w));
        if (!words.length || words.length > 6) return false;
        const parts = identParts(name);
        const verbish = (w) => VERBS.has(w) || VERBS.has(stem(w));
        if (!words.some((w) => parts.has(w) || parts.has(stem(w)))) return false;
        return words.every((w) => parts.has(w) || parts.has(stem(w)) || verbish(w));
      };
      for (const m of matchAll(/^([ \t]*)(?:async\s+)?def\s+(\w+)\s*\([^)]*\)[^:\n]*:[ \t]*\n[ \t]+[rRuU]?("""|''')[ \t]*([^\n]{3,100}?)[ \t]*\3/gm, raw)) {
        if (echo(m[4], m[2])) out.push({ index: m.index + m[0].indexOf(m[3]), match: m[4], message: `docstring repeats the name ${m[2]}()` });
      }
      for (const m of matchAll(/\/\*\*[ \t]*\n?[ \t]*\*?[ \t]*([^\n*@][^\n*]{2,100}?)[ \t]*\n?[ \t]*\*\/[ \t]*\n[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*(\w+)|(?:const|let|var)\s+(\w+)\s*=|(?:(?:public|private|protected|static|async|override)\s+)*(\w+)\s*\()/g, raw)) {
        const name = m[2] || m[3] || m[4];
        if (name && echo(m[1], name)) out.push({ index: m.index, match: m[1], message: `doc comment repeats the name ${name}` });
      }
      const sig = [
        /@param\s+(?:\{[^}]*\}\s+)?\[?(\w+)\]?\s+(?:-\s+)?(?:the|a|an)\s+(\w+)\.?[ \t]*$/gim,
        /:param\s+(?:\w+\s+)?(\w+):\s*(?:the|a|an)\s+(\w+)\.?[ \t]*$/gim,
        /^[ \t]+(\w+)(?:\s*\([^)]*\))?:\s*(?:The|A|An)\s+(\w+)\.?[ \t]*$/gm,
      ];
      for (const r of sig) {
        for (const m of matchAll(r, raw)) {
          if (m[1].toLowerCase().replace(/_/g, '') === m[2].toLowerCase()) out.push({ index: m.index, match: m[0].trim(), message: 'parameter doc repeats the parameter name' });
        }
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'a.py', text: 'def get_user(user_id):\n    """Get the user."""\n    return db[user_id]\n' },
        { path: 'a.ts', text: '/** Gets the user. */\nexport function getUser(id: string) {}\n' },
        { path: 'a.js', text: '/**\n * @param {string} name The name.\n */\nfunction greet(name) {}\n' },
      ],
      good: [{ path: 'a.py', text: 'def get_user(user_id):\n    """Raises KeyError for deleted users; callers show a 404."""\n    return db[user_id]\n' }],
    },
  },
  {
    id: 'code/debugger-left',
    domain: 'code',
    severity: 'error',
    kinds: CODE_KINDS,
    name: 'Debugger statement left in',
    why: 'A breakpoint in committed code stops or slows every run that hits it.',
    fix: 'Remove it.',
    views: ['code'],
    patterns: [
      re('^[ \\t]*debugger[ \\t]*;?[ \\t]*$', 'gm'),
      re('\\bbreakpoint\\(\\s*\\)|\\bi?pdb\\.set_trace\\(\\s*\\)|\\bbinding\\.pry\\b|^[ \\t]*byebug[ \\t]*$', 'gm'),
    ],
    examples: {
      bad: [{ path: 'a.js', text: 'function f(x) {\n  debugger;\n  return x;\n}\n' }, { path: 'a.py', text: 'def f(x):\n    breakpoint()\n    return x\n' }],
      good: [{ path: 'a.js', text: '// Set a breakpoint here with `debugger` when tracing.\nfunction f(x) { return x; }\n' }],
    },
  },
  {
    id: 'code/test-cannot-fail',
    domain: 'code',
    severity: 'warn',
    kinds: ['code', 'markup'],
    onlyTests: true,
    name: 'Test that cannot fail',
    why: 'A test with no assertion, or one that asserts a constant, passes whatever the code does. It inflates coverage and hides regressions.',
    fix: 'Assert on behavior the user would notice, including a failure case.',
    check(ctx) {
      const out = [];
      const raw = ctx.raw;
      const code = ctx.views.code || raw;
      const helper = /\b(?:check|verify|expect|assert|ensure|validate|should|fail)\w*\s*\(/i;
      const jsAssert = /\b(?:expect|assert|should|t\.(?:is|ok|equal|deepEqual|throws|true|false|fail|plan|snapshot|not\w*|regex|like|match)|chai|sinon\.assert)\b|\.(?:toBe|toEqual|toThrow|rejects|resolves|toMatch)\w*/;
      for (const m of matchAll(/^[ \t]*(?:it|test)(?:\.(?:only|concurrent))?\s*\(\s*['"`]/gm, raw)) {
        const open = code.indexOf('{', m.index + m[0].length);
        if (open < 0 || open - m.index > 300) continue;
        let depth = 0;
        let end = open;
        for (; end < code.length; end++) {
          if (code[end] === '{') depth++;
          else if (code[end] === '}' && --depth === 0) break;
        }
        const body = code.slice(open + 1, end);
        if (!body.trim()) continue;
        if (jsAssert.test(body) || helper.test(raw.slice(open + 1, end))) continue;
        out.push({ index: m.index, match: m[0].trim(), message: 'test has no assertion, so it passes whatever the code does' });
      }
      for (const m of matchAll(/^([ \t]*)(?:async\s+)?def\s+(test_\w*)\s*\([^)]*\)[^:\n]*:[ \t]*\n((?:\1[ \t]+[^\n]*\n|[ \t]*\n)*)/gm, raw)) {
        const body = m[3];
        if (/\b(?:assert|self\.assert\w*|self\.fail|pytest\.(?:raises|fail|approx|warns)|raise)\b/.test(body) || helper.test(body)) continue;
        out.push({ index: m.index, match: `def ${m[2]}`, message: 'test has no assertion, so it passes whatever the code does' });
      }
      const trivial = /expect\(\s*(true|false|null|undefined|\d+)\s*\)\.(?:toBe|toEqual|toStrictEqual)\(\s*\1\s*\)|\bassert\s+True\b|self\.assertTrue\(\s*True\s*\)|\bassert\s+(\d+)\s*==\s*\2\b|assert\.ok\(\s*true\s*\)|\bassert\(\s*true\s*\)/g;
      for (const m of matchAll(trivial, raw)) out.push({ index: m.index, match: m[0], message: 'assertion on a constant cannot fail' });
      return out;
    },
    examples: {
      bad: [
        { path: 'cart.test.js', text: "test('adds item', () => {\n  const cart = new Cart();\n  cart.add('apple');\n});\n" },
        { path: 'test_cart.py', text: 'def test_add():\n    cart = Cart()\n    cart.add("apple")\n' },
        { path: 'cart.test.ts', text: "it('works', () => {\n  expect(true).toBe(true);\n});\n" },
      ],
      good: [
        { path: 'cart.test.js', text: "test('adds item', () => {\n  const cart = new Cart();\n  cart.add('apple');\n  expect(cart.count).toBe(1);\n});\n" },
        { path: 'test_cart.py', text: 'def test_add():\n    cart = Cart()\n    cart.add("apple")\n    assert cart.count == 1\n' },
      ],
    },
  },
  {
    id: 'code/version-suffix',
    domain: 'code',
    severity: 'info',
    kinds: CODE_KINDS,
    name: '_v2 / _new / _fixed clone',
    why: 'An agent that does not dare change foo writes foo_v2 next to it. Now there are two sources of truth and future fixes land in one.',
    fix: 'Merge them into one name. Keep a suffix only during a documented migration.',
    check(ctx) {
      const code = ctx.views.code;
      if (!code) return [];
      const defs = new Map();
      const DEF = /\b(?:def|function|class|fn|func|interface|type|struct|enum|trait)\s+([A-Za-z_$][\w$]*)|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g;
      for (const m of matchAll(DEF, code)) {
        const name = m[1] || m[2];
        if (!defs.has(name)) defs.set(name, m.index);
      }
      const lower = new Set([...defs.keys()].map((n) => n.toLowerCase()));
      const SKIP_BASE = new Set(['is', 'has', 'can', 'should', 'create', 'make', 'add', 'get', 'set', 'build', 'open', 'show', 'with', 'to', 'on', 'handle', 'render', 'use', 'init', 'load', 'insert', 'push', 'mark', 'save']);
      const STRONG = /^(?:_v\d+|_new|_old|_fixed|Fixed|_final|_improved|Improved|_enhanced|Enhanced|_updated|_copy|Copy|_backup|Backup|_refactored|Refactored|_tmp|_temp|_orig|_original|_better|Better)$/;
      const out = [];
      for (const [name, index] of defs) {
        const m = /^(.{3,}?)(_v\d+|V\d+|_new|New|_old|Old|_fixed|Fixed|_final|Final|_improved|Improved|_enhanced|Enhanced|_updated|Updated|_copy|Copy|_backup|Backup|_alt|_better|Better|_refactored|Refactored|_tmp|_temp|_orig|_original|Original|2)$/.exec(name);
        if (!m) continue;
        const base = m[1];
        if (SKIP_BASE.has(base.toLowerCase())) continue;
        if (lower.has(base.toLowerCase())) {
          out.push({ index, match: name, severity: 'warn', message: `${base} and ${name} are both defined: two sources of truth` });
        } else if (STRONG.test(m[2])) {
          out.push({ index, match: name, message: `${name}: a versioned or "fixed" copy of something` });
        }
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'a.py', text: 'def parse(s):\n    return s\n\ndef parse_v2(s):\n    return s.strip()\n' },
        { path: 'a.ts', text: 'function renderChartFixed(data) { return data; }\n' },
      ],
      good: [{ path: 'a.ts', text: 'function isNew(user) { return true; }\nconst vec2 = (x, y) => [x, y];\nfunction getUsersV2() {}\n' }],
    },
  },
  {
    id: 'code/commented-out-code',
    domain: 'code',
    severity: 'info',
    kinds: CODE_KINDS,
    name: 'Block of commented-out code',
    why: 'Old versions left in comments are the debris of an attempt that was replaced. Git already keeps them.',
    fix: 'Delete the block.',
    check(ctx) {
      const cl = viewLines(ctx.views.comments);
      const co = viewLines(ctx.views.code);
      const codeish = (t) => /[;{}]\s*$|^(?:if|for|while|return|const|let|var|def|import|from|function|class|elif|else:|try:|except|await|async)\b|^[\w.[\]]+\s*=\s*\S|^[\w.]+\(.*\)\s*;?$|^(?:print|console\.log)\(/.test(t);
      const out = [];
      let run = [];
      const flush = () => {
        if (run.length >= 4) out.push({ index: lineIndex(ctx, run[0]), match: `${run.length} lines`, message: `${run.length} lines of commented-out code` });
        run = [];
      };
      for (let i = 0; i < cl.length; i++) {
        const t = fullLineComment(cl[i], co[i] || '');
        if (t !== null && t !== '' && codeish(t)) run.push(i + 1);
        else flush();
      }
      flush();
      return out;
    },
    examples: {
      bad: [{ path: 'a.js', text: '// const old = load();\n// if (old) {\n//   save(old);\n// }\nrun();\n' }],
      good: [{ path: 'a.js', text: '// Load once at startup; the cache\n// is invalidated by the watcher.\nrun();\n' }],
    },
  },
  {
    id: 'code/fallback-import',
    domain: 'code',
    severity: 'info',
    kinds: ['code'],
    exts: ['py', 'pyi'],
    name: 'Try-import fallback',
    why: 'try: import fast_x / except ImportError: import x gives two code paths and usually tests one.',
    fix: 'Declare the dependency, or make it a real optional extra with a test for the fallback.',
    views: ['code'],
    patterns: [re('^[ \\t]*try:[ \\t]*\\n[ \\t]+import[ \\t]+\\w+[^\\n]*\\n[ \\t]*except[ \\t]+ImportError[^\\n]*:\\s*\\n[ \\t]+(?:import|\\w+[ \\t]*=[ \\t]*None)', 'gm')],
    examples: {
      bad: [{ path: 'a.py', text: 'try:\n    import ujson as json\nexcept ImportError:\n    import json\n' }],
      good: [{ path: 'a.py', text: 'import json\n' }],
    },
  },
];
