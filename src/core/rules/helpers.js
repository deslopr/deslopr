// Small builders so rule files read as lists of phrases, not as regex soup.

const L = '\\p{L}\\p{N}_';
export const BEFORE = `(?<![${L}])`;
export const AFTER = `(?![${L}])`;
export const APOS = "['’]";
export const SP = '[\\s\\u00a0\\u202f]';

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Phrase mini-syntax:
//   ~      the word may take a suffix (walk~ matches walks, walked, walking)
//   {a|b}  alternatives
//   '      matches ' and ’
//   space  any run of whitespace, including non-breaking spaces
export function phraseSource(p) {
  let out = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '~') out += '[\\p{L}]*';
    else if (c === '{') {
      // Find the matching brace and split on top-level bars, so groups can nest.
      let depth = 0;
      let end = -1;
      const alts = [];
      let start = i + 1;
      for (let k = i; k < p.length; k++) {
        if (p[k] === '{') depth++;
        else if (p[k] === '}' && --depth === 0) { end = k; break; }
        else if (p[k] === '|' && depth === 1) { alts.push(p.slice(start, k)); start = k + 1; }
      }
      if (end < 0) throw new Error(`unbalanced { in phrase: ${p}`);
      alts.push(p.slice(start, end));
      out += '(?:' + alts.map((alt) => phraseSource(alt)).join('|') + ')';
      i = end;
    } else if (c === "'" || c === '’') out += APOS;
    else if (c === ' ') out += `${SP}+`;
    else out += escape(c);
  }
  return out;
}

/** A case-insensitive regex matching any of the phrases as whole words. */
export function phrases(list, { caseSensitive = false } = {}) {
  const alts = [...list].sort((a, b) => b.length - a.length).map(phraseSource).join('|');
  return new RegExp(`${BEFORE}(?:${alts})${AFTER}`, caseSensitive ? 'gu' : 'giu');
}

// Blanked views hold long runs of spaces, and a variable-length lookbehind tried at every
// position of a run rescans the whole run: quadratic time. NOT_RUN skips positions inside a
// run before the lookbehind is tried; no phrase starts with one of these characters.
const NOT_RUN = '(?![\\s>*#-])';

/** Same as phrases(), but only at the start of a sentence, line or paragraph. */
export function sentenceStart(list) {
  const alts = [...list].sort((a, b) => b.length - a.length).map(phraseSource).join('|');
  return new RegExp(`${NOT_RUN}(?:^|(?<=[.!?:]${SP}+)|(?<=\\n[ \\t>*#-]*))(?:${alts})${AFTER}`, 'gimu');
}

export function re(source, flags = 'giu') {
  return new RegExp(source, flags);
}

// A line carries a source when it links, cites or footnotes something.
export function lineHasCitation(ctx, index) {
  const { line } = ctx.positionOf(index);
  const a = ctx.starts[line - 1];
  const b = ctx.starts[line] ?? ctx.raw.length;
  const text = ctx.raw.slice(a, b);
  return /https?:\/\/|\]\(|\bhref\s*=|\[\^?\d+\]|\[\^[\w-]+\]|\((?:[A-Z][\w&.-]+,?\s)+(?:19|20)\d\d\)|\b(?:source|according to [A-Z]|selon [A-Z])/.test(text);
}

export function lineOf(ctx, index) {
  return ctx.positionOf(index).line;
}

export function lineText(ctx, line) {
  const a = ctx.starts[line - 1];
  const b = ctx.starts[line] !== undefined ? ctx.starts[line] - 1 : ctx.raw.length;
  return ctx.raw.slice(a, b);
}

export function* matchAll(re, text) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    yield m;
  }
}

// Autofix building blocks. An edit is { start, end, text, line }: replace raw[start, end)
// with text; line is where the rule reports, so the engine only applies an edit the scan
// actually reported (and that no directive or config silenced).

// The span reads the same in the view as in the file, so it is text the rule may touch.
export function inView(ctx, view, start, end) {
  const v = ctx.views[view];
  return typeof v === 'string' && v.slice(start, end) === ctx.raw.slice(start, end);
}

// The view a prose fix may touch: readable text in documents, comments in source.
export function proseView(ctx) {
  return ctx.info.kind === 'markdown' || ctx.info.kind === 'text' ? 'prose' : 'comments';
}

export function isBlankLine(ctx, line) {
  return line >= 1 && line <= ctx.starts.length && lineText(ctx, line).trim() === '';
}

// An edit deleting one whole line. When the line sat alone between blank lines, one of them
// goes too, so the removal does not leave a double gap.
export function lineRemoval(ctx, line) {
  const { starts, raw } = ctx;
  const n = starts.length;
  const endsWithNewline = raw.endsWith('\n');
  let start = starts[line - 1];
  let end = line < n ? starts[line] : raw.length;
  if (line === n && line > 1) start -= 1;
  const prevBlank = line === 1 || isBlankLine(ctx, line - 1);
  const nextIsEof = line + 1 === n && endsWithNewline;
  if (prevBlank && !nextIsEof && line + 1 < n && isBlankLine(ctx, line + 1)) end = starts[line + 1];
  else if (nextIsEof && line > 1 && isBlankLine(ctx, line - 1)) start = starts[line - 2];
  return { start, end, text: '', line };
}

// Colors, for the UI rules that judge hue.
const NAMED = {
  purple: '#800080', violet: '#ee82ee', indigo: '#4b0082', blueviolet: '#8a2be2', magenta: '#ff00ff', fuchsia: '#ff00ff',
  mediumpurple: '#9370db', darkviolet: '#9400d3', rebeccapurple: '#663399', blue: '#0000ff', cyan: '#00ffff', aqua: '#00ffff',
  pink: '#ffc0cb', hotpink: '#ff69b4', deeppink: '#ff1493', royalblue: '#4169e1', dodgerblue: '#1e90ff', deepskyblue: '#00bfff',
};

export function parseColor(s) {
  s = s.trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(s);
  if (m) return { h: +m[1] % 360, s: +m[2] / 100, l: +m[3] / 100 };
  return null;
}

export function toHsl(c) {
  if (!c) return null;
  if (c.h !== undefined) return c;
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:purple|violet|indigo|blueviolet|magenta|fuchsia|mediumpurple|darkviolet|rebeccapurple|blue|cyan|aqua|pink|hotpink|deeppink|royalblue|dodgerblue|deepskyblue)\b/g;

export function hueFamily(color) {
  const hsl = toHsl(parseColor(color));
  if (!hsl || hsl.s < 0.3 || hsl.l < 0.12 || hsl.l > 0.92) return null;
  const h = hsl.h;
  if (h >= 245 && h < 300) return 'purple';
  if (h >= 300 && h < 345) return 'pink';
  if (h >= 175 && h < 245) return 'blue';
  return 'other';
}

// Class attribute values (HTML class, JSX className, Vue :class strings, clsx calls).
export function* classStrings(text) {
  const re = /\b(?:class|className|class:list|:class)\s*=\s*(?:\{\s*)?(?:`([^`]*)`|"([^"]*)"|'([^']*)')|\b(?:cn|clsx|cx|classNames|twMerge|tw)\(\s*([^)]*)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
    yield { value, index: m.index };
  }
}
