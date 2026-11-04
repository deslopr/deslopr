// A view is the file with everything a rule should not read replaced by spaces.
//   raw        the file as written
//   prose      readable text of markdown and text files (code, URLs and markup blanked)
//   comments   comments and docstrings of code
//   ui         text a user reads in an interface: text nodes, labels, multi-word string literals
//   code       code with comments and string contents blanked
//   nocomment  everything except comments (class names, styles, attributes)
//   codeless   markdown with code blanked but URLs kept; the raw text elsewhere
import { lex, docstringSpans, blank } from './lexer.js';

function blankRange(arr, a, b) {
  for (let k = a; k < b && k < arr.length; k++) if (arr[k] !== '\n') arr[k] = ' ';
}

function blankMatches(arr, text, re, group) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    if (group && m[group] !== undefined) {
      const start = m.index + m[0].indexOf(m[group]);
      blankRange(arr, start, start + m[group].length);
    } else {
      blankRange(arr, m.index, m.index + m[0].length);
    }
    if (m[0].length === 0) re.lastIndex++;
  }
}

export function markdownProse(raw, stage = 'prose') {
  const arr = raw.split('');
  // Front matter.
  const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(raw);
  if (fm) blankRange(arr, 0, fm[0].length);
  // Fenced code blocks.
  const lines = raw.split('\n');
  let offset = 0;
  let fence = null;
  for (const line of lines) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      blankRange(arr, offset, offset + line.length);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && line.trim() === m[1]) fence = null;
    } else if (m) {
      fence = m[1];
      blankRange(arr, offset, offset + line.length);
    }
    offset += line.length + 1;
  }
  const text = () => arr.join('');
  blankMatches(arr, text(), /<!--[\s\S]*?-->/g);
  blankMatches(arr, text(), /(`+)[^`\n][\s\S]*?\1/g);
  if (stage === 'codeless') return arr.join('');
  blankMatches(arr, text(), /\]\(([^)\s]*)(?:\s+"[^"]*")?\)/g, 1);
  blankMatches(arr, text(), /^\s*\[[^\]]+\]:\s*\S+.*$/gm);
  blankMatches(arr, text(), /<https?:\/\/[^>\s]+>/g);
  blankMatches(arr, text(), /https?:\/\/[^\s)>\]]+/g);
  blankMatches(arr, text(), /<\/?[A-Za-z][^>\n]*>/g);
  return arr.join('');
}

// Multi-word string literals read as interface copy; class lists and paths do not.
function looksLikeCopy(s) {
  const t = s.trim();
  if (t.length < 12) return false;
  const words = t.split(/\s+/);
  if (words.length < 3) return false;
  if (!/[\p{L}]{3,}[\s,]+[\p{L}]{2,}/u.test(t)) return false;
  const technical = words.filter((w) => /[-:/\[\]=_{}<>#]|^\d|^\.|\.\w+$/.test(w)).length;
  return technical / words.length < 0.34;
}

const UI_ATTRS = /\b(alt|title|placeholder|aria-label|aria-description|label|content|description|tooltip|subtitle|heading|caption)\s*=\s*(["'])([^"'\n]*)\2/gi;

function htmlUi(raw, arr, attrSource) {
  // arr: raw with script, style and comment regions blanked; attrSource: where attribute
  // values are still readable.
  const src = arr.join('');
  const out = blank(raw).split('');
  // Text between tags.
  const textNode = />([^<>]+)</g;
  let m;
  while ((m = textNode.exec(src))) {
    const start = m.index + 1;
    const seg = m[1].replace(/\{[^{}]*\}/g, (x) => ' '.repeat(x.length));
    if (!/\p{L}{2,}/u.test(seg)) continue;
    if (/=>|&&|\|\||[;=]|\)\s*\{|\w\(/.test(seg)) continue;
    for (let k = 0; k < seg.length; k++) if (seg[k] !== ' ') out[start + k] = raw[start + k];
    textNode.lastIndex = m.index + m[0].length - 1;
  }
  const attrs = attrSource ?? src;
  UI_ATTRS.lastIndex = 0;
  while ((m = UI_ATTRS.exec(attrs))) {
    const start = m.index + m[0].lastIndexOf(m[3]);
    for (let k = 0; k < m[3].length; k++) out[start + k] = raw[start + k];
  }
  return out;
}

function addCopyStrings(raw, out, stringSpans) {
  for (const [a, b] of stringSpans) {
    const inner = raw.slice(a + 1, b - 1);
    const before = raw.slice(Math.max(0, a - 12), a);
    if (/(class|className|class:list|style|href|src|d|viewBox|xmlns|id|key|type|role|name|to|path|url|import|from|require)\s*[=:(]\s*\{?\s*$/.test(before)) continue;
    if (!looksLikeCopy(inner)) continue;
    for (let k = a + 1; k < b - 1; k++) if (raw[k] !== '\n') out[k] = raw[k];
  }
}

function regionsOf(raw, ext) {
  // Script and style blocks inside markup files; Astro front matter is script.
  const regions = [];
  const re = /<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].indexOf('>') + 1;
    regions.push({ type: m[1].toLowerCase(), start, end: start + m[2].length });
  }
  if (ext === 'astro') {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    if (fm) regions.push({ type: 'script', start: 4, end: 4 + fm[1].length });
  }
  return regions;
}

/**
 * @param {string} raw
 * @param {ReturnType<import('./files.js').classify>} info
 */
export function buildViews(raw, info) {
  const views = { raw };
  const { kind, family, jsxLike, ext } = info;
  views.codeless = raw;
  if (kind === 'markdown') {
    views.prose = markdownProse(raw);
    views.codeless = markdownProse(raw, 'codeless');
    return views;
  }
  if (kind === 'text' || kind === 'unknown') {
    views.prose = raw;
    return views;
  }
  if (kind === 'data') return views;

  if (kind === 'markup' && !jsxLike) {
    const comments = blank(raw).split('');
    const code = raw.split('');
    const nocomment = raw.split('');
    const masked = raw.split('');
    const stringSpans = [];
    // HTML comments.
    const htmlLex = lex(raw, 'html');
    for (const [a, b] of htmlLex.commentSpans) {
      for (let k = a; k < b; k++) comments[k] = raw[k];
      blankRange(code, a, b);
      blankRange(nocomment, a, b);
      blankRange(masked, a, b);
    }
    for (const r of regionsOf(raw, ext)) {
      const sub = raw.slice(r.start, r.end);
      const l = lex(sub, r.type === 'style' ? 'css' : 'c');
      for (const [a, b] of l.commentSpans) {
        for (let k = a; k < b; k++) comments[r.start + k] = raw[r.start + k];
        blankRange(code, r.start + a, r.start + b);
        blankRange(nocomment, r.start + a, r.start + b);
      }
      for (const [a, b] of l.stringSpans) {
        stringSpans.push([r.start + a, r.start + b]);
        blankRange(code, r.start + a + 1, r.start + b - 1);
      }
      blankRange(masked, r.start, r.end);
    }
    const ui = htmlUi(raw, masked);
    addCopyStrings(raw, ui, stringSpans);
    views.comments = comments.join('');
    views.code = code.join('');
    views.nocomment = nocomment.join('');
    views.ui = ui.join('');
    return views;
  }

  if (family === 'none') {
    views.nocomment = raw;
    views.code = raw;
    return views;
  }

  const l = lex(raw, family, { rustChars: ext === 'rs' });
  const comments = l.comments.split('');
  if (family === 'hash' && (ext === 'py' || ext === 'pyi')) {
    for (const [a, b] of docstringSpans(raw, l.stringSpans)) for (let k = a; k < b; k++) comments[k] = raw[k];
  }
  views.comments = comments.join('');
  views.code = l.code;
  const noc = raw.split('');
  for (const [a, b] of l.commentSpans) blankRange(noc, a, b);
  views.nocomment = noc.join('');
  if (jsxLike || kind === 'markup') {
    const masked = noc.slice();
    for (const [a, b] of l.stringSpans) blankRange(masked, a, b);
    const ui = htmlUi(raw, masked, views.nocomment);
    addCopyStrings(raw, ui, l.stringSpans);
    views.ui = ui.join('');
  }
  return views;
}
