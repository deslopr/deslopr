// Splits source text into comments, string literals and code without a real parser.
// Every output string has the same length as the input and keeps its newlines, so an
// index into any of them is an index into the original file.

const KEYWORDS_BEFORE_STRING = new Set([
  'return', 'case', 'in', 'of', 'typeof', 'import', 'from', 'export', 'default', 'yield',
  'await', 'throw', 'else', 'do', 'include', 'require', 'print', 'puts', 'echo', 'and', 'or',
  'not', 'is', 'assert', 'raise', 'with', 'as', 'if', 'elif', 'while', 'for', 'when', 'then',
]);

export const FAMILIES = {
  c: { line: ['//'], block: [['/*', '*/']], quotes: ['`', '"', "'"] },
  hash: { line: ['#'], block: [], quotes: ['"""', "'''", '"', "'"] },
  sql: { line: ['--'], block: [['/*', '*/']], quotes: ["'", '"'] },
  lua: { line: ['--'], block: [['--[[', ']]']], quotes: ['"', "'"] },
  css: { line: [], block: [['/*', '*/']], quotes: ['"', "'"] },
  html: { line: [], block: [['<!--', '-->']], quotes: [] },
  none: { line: [], block: [], quotes: [] },
};

const blank = (s) => s.replace(/[^\n]/g, ' ');

// Can a quote at position i open a string? In JSX or prose-like text an apostrophe follows a
// letter ("don't"); in code a string follows an operator, a bracket or a keyword.
function canOpenString(text, i, quote, family) {
  if (family !== 'c') return true;
  if (quote === '`') return true;
  let j = i - 1;
  while (j >= 0 && (text[j] === ' ' || text[j] === '\t')) j--;
  if (j < 0 || text[j] === '\n') return true;
  const prev = text[j];
  if (/[=([{,:;!&|?+\-*%<>~^}]/.test(prev)) return true;
  if (/[A-Za-z_$]/.test(prev)) {
    let k = j;
    while (k >= 0 && /[A-Za-z_$]/.test(text[k])) k--;
    return KEYWORDS_BEFORE_STRING.has(text.slice(k + 1, j + 1));
  }
  return false;
}

/**
 * @param {string} text
 * @param {keyof FAMILIES} familyName
 * @param {{ rustChars?: boolean }} [opts]
 * @returns {{ comments: string, strings: string, code: string, commentSpans: Array<[number, number]>, stringSpans: Array<[number, number]> }}
 */
export function lex(text, familyName, opts = {}) {
  const fam = FAMILIES[familyName] || FAMILIES.none;
  const n = text.length;
  const commentSpans = [];
  const stringSpans = [];
  let i = 0;
  const starts = (tok, at) => text.startsWith(tok, at);
  while (i < n) {
    let matched = false;
    for (const tok of fam.line) {
      if (!starts(tok, i)) continue;
      // "#" inside a shebang or a CSS color is not a comment in hash languages: only the shebang matters here.
      if (tok === '#' && i === 0 && text[1] === '!') break;
      let end = text.indexOf('\n', i);
      if (end === -1) end = n;
      commentSpans.push([i, end]);
      i = end;
      matched = true;
      break;
    }
    if (matched) continue;
    for (const [open, close] of fam.block) {
      if (!starts(open, i)) continue;
      let end = text.indexOf(close, i + open.length);
      end = end === -1 ? n : end + close.length;
      commentSpans.push([i, end]);
      i = end;
      matched = true;
      break;
    }
    if (matched) continue;
    for (const q of fam.quotes) {
      if (!starts(q, i)) continue;
      if (!canOpenString(text, i, q, familyName)) break;
      if (q === "'" && opts.rustChars) {
        const m = /^'(?:\\.|[^'\\\n])'/.exec(text.slice(i, i + 12));
        if (!m) break;
        stringSpans.push([i, i + m[0].length]);
        i += m[0].length;
        matched = true;
        break;
      }
      let j = i + q.length;
      const single = q.length === 1 && q !== '`';
      while (j < n) {
        if (text[j] === '\\') { j += 2; continue; }
        if (single && text[j] === '\n') break;
        if (starts(q, j)) { j += q.length; break; }
        j++;
      }
      stringSpans.push([i, Math.min(j, n)]);
      i = Math.min(j, n);
      matched = true;
      break;
    }
    if (matched) continue;
    i++;
  }
  const keep = (spans) => {
    const out = blank(text).split('');
    for (const [a, b] of spans) for (let k = a; k < b; k++) out[k] = text[k];
    return out.join('');
  };
  const commentsText = keep(commentSpans);
  const stringsText = keep(stringSpans);
  const codeArr = text.split('');
  for (const [a, b] of [...commentSpans, ...stringSpans]) {
    for (let k = a; k < b; k++) if (codeArr[k] !== '\n') codeArr[k] = ' ';
  }
  return { comments: commentsText, strings: stringsText, code: codeArr.join(''), commentSpans, stringSpans };
}

// Python docstrings: a triple-quoted string that opens a line. They read as prose, so the
// comment view includes them.
export function docstringSpans(text, stringSpans) {
  return stringSpans.filter(([a]) => {
    if (!(text.startsWith('"""', a) || text.startsWith("'''", a))) return false;
    let k = a - 1;
    while (k >= 0 && (text[k] === ' ' || text[k] === '\t')) k--;
    return k < 0 || text[k] === '\n';
  });
}

export { blank };
