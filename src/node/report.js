// Output formats: text for people, json for tools, github for Actions annotations, sarif
// for code scanning, markdown for PR comments.
import { RULES, getRule } from '../core/rules/index.js';
import { VERSION } from '../core/index.js';

const SEV_ORDER = { error: 0, warn: 1, info: 2 };

export function visibleFindings(result, { verbose = false, minSeverity = 'info' } = {}) {
  const min = SEV_ORDER[minSeverity] ?? 2;
  return result.findings.filter((f) => {
    if (SEV_ORDER[f.severity] > min) return false;
    if (f.severity === 'info' && !verbose && !result.cluster) return false;
    return true;
  });
}

function colors(enabled) {
  const c = (code) => (s) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : String(s));
  return { red: c(31), yellow: c(33), blue: c(34), gray: c(90), bold: c(1), green: c(32), cyan: c(36), dim: c(2) };
}

const GRADE_WORD = { A: 'clean', B: 'light', C: 'noticeable', D: 'heavy', F: 'saturated' };

export function formatText(results, summary, opts = {}) {
  const k = colors(opts.color);
  const sevColor = { error: k.red, warn: k.yellow, info: k.blue };
  const out = [];
  let hiddenInfo = 0;
  const usedRules = new Map();
  for (const r of results) {
    const shown = visibleFindings(r, opts);
    hiddenInfo += r.findings.filter((f) => f.severity === 'info').length - shown.filter((f) => f.severity === 'info').length;
    if (!shown.length) continue;
    const cluster = r.cluster ? k.gray(` · cluster of ${r.distinct} patterns`) : '';
    out.push(`${k.bold(r.path)}  ${k.gray(`slop index ${r.index} (${r.grade})`)}${cluster}`);
    const idWidth = Math.max(...shown.map((f) => f.rule.length));
    let lastLine = 0;
    for (const f of shown) {
      usedRules.set(f.rule, (usedRules.get(f.rule) || 0) + 1);
      const pos = `${f.line}:${f.column}`.padEnd(7);
      out.push(`  ${k.gray(pos)} ${sevColor[f.severity](f.severity.padEnd(5))} ${k.cyan(f.rule.padEnd(idWidth))}  ${f.message}${f.match && !f.message.includes(f.match) ? k.gray(`  "${f.match}"`) : ''}`);
      if (opts.excerpts !== false && f.excerpt && f.line !== lastLine) out.push(`  ${' '.repeat(7)} ${k.dim('│ ' + f.excerpt)}`);
      lastLine = f.line;
    }
    out.push('');
  }
  if (usedRules.size && opts.fixes !== false) {
    out.push(k.bold('How to fix'));
    for (const [id, n] of [...usedRules].sort((a, b) => b[1] - a[1])) {
      const rule = getRule(id);
      out.push(`  ${k.cyan(id)} ${k.gray(`×${n}`)}  ${rule ? rule.fix : ''}`);
    }
    out.push('');
  }
  const { counts } = summary;
  const total = counts.error + counts.warn + counts.info;
  const parts = [
    counts.error ? sevColor.error(`${counts.error} error${counts.error === 1 ? '' : 's'}`) : null,
    counts.warn ? sevColor.warn(`${counts.warn} warning${counts.warn === 1 ? '' : 's'}`) : null,
    counts.info ? sevColor.info(`${counts.info} info`) : null,
  ].filter(Boolean);
  if (!total) {
    out.push(`${k.green('deslopr:')} no slop found in ${summary.files} file${summary.files === 1 ? '' : 's'}.`);
  } else {
    out.push(`${k.bold('deslopr:')} ${total} finding${total === 1 ? '' : 's'} (${parts.join(', ')}) in ${summary.filesWithFindings} of ${summary.files} files · slop index ${summary.index} (${summary.grade}, ${GRADE_WORD[summary.grade]})`);
  }
  if (hiddenInfo > 0) out.push(k.gray(`${hiddenInfo} info finding${hiddenInfo === 1 ? '' : 's'} outside clusters hidden; --verbose shows them.`));
  const fixable = [...usedRules.keys()].filter((id) => getRule(id)?.autofix);
  if (fixable.length) out.push(k.gray(`Some ${fixable.join(', ')} findings have a safe automatic fix: \`deslopr fix\` previews it as a diff.`));
  return out.join('\n');
}

export function formatJson(results, summary) {
  return JSON.stringify({ version: VERSION, summary, files: results.filter((r) => r.findings.length).map((r) => ({ path: r.path, index: r.index, grade: r.grade, words: r.words, findings: r.findings })) }, null, 2);
}

function ghEscape(s, prop = false) {
  let t = String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  if (prop) t = t.replace(/:/g, '%3A').replace(/,/g, '%2C');
  return t;
}

export function formatGithub(results, summary, opts = {}) {
  const level = { error: 'error', warn: 'warning', info: 'notice' };
  const out = [];
  for (const r of results) {
    for (const f of visibleFindings(r, opts)) {
      const rule = getRule(f.rule);
      out.push(`::${level[f.severity]} file=${ghEscape(r.path, true)},line=${f.line},col=${f.column},title=${ghEscape(`deslopr ${f.rule}`, true)}::${ghEscape(`${f.message}${f.match ? ` ("${f.match}")` : ''}. ${rule ? rule.fix : ''}`)}`);
    }
  }
  out.push(`deslopr: ${summary.counts.error} errors, ${summary.counts.warn} warnings, ${summary.counts.info} info · slop index ${summary.index} (${summary.grade})`);
  return out.join('\n');
}

export function formatSarif(results) {
  const level = { error: 'error', warn: 'warning', info: 'note' };
  const used = new Set(results.flatMap((r) => r.findings.map((f) => f.rule)));
  const rules = RULES.filter((r) => used.has(r.id)).map((r) => ({
    id: r.id,
    name: r.name,
    shortDescription: { text: r.name },
    fullDescription: { text: r.why },
    help: { text: r.fix, markdown: `**Why:** ${r.why}\n\n**Fix:** ${r.fix}` },
    defaultConfiguration: { level: level[r.severity] },
    properties: { tags: ['ai-slop', r.domain] },
  }));
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'deslopr', version: VERSION, informationUri: 'https://github.com/deslopr/deslopr', rules } },
      results: results.flatMap((r) => r.findings.map((f) => ({
        ruleId: f.rule,
        level: level[f.severity],
        message: { text: `${f.message}${f.match ? ` ("${f.match}")` : ''}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: r.path }, region: { startLine: f.line, startColumn: f.column } } }],
      }))),
    }],
  };
  return JSON.stringify(sarif, null, 2);
}

export function formatMarkdown(results, summary, opts = {}) {
  const out = [];
  const total = summary.counts.error + summary.counts.warn + summary.counts.info;
  out.push(`### deslopr: ${total ? `${total} finding${total === 1 ? '' : 's'}` : 'no slop found'} · slop index ${summary.index} (${summary.grade})`);
  const rows = [];
  for (const r of results) for (const f of visibleFindings(r, opts)) rows.push(`| \`${r.path}:${f.line}\` | ${f.severity} | \`${f.rule}\` | ${f.message.replace(/\|/g, '\\|')}${f.match ? ` (\`${f.match.replace(/`/g, "'").replace(/\|/g, '\\|')}\`)` : ''} |`);
  if (rows.length) {
    out.push('', '| Where | Severity | Rule | Finding |', '|---|---|---|---|', ...rows.slice(0, 200));
    if (rows.length > 200) out.push('', `…and ${rows.length - 200} more.`);
  }
  return out.join('\n');
}

export function failed(summary, failOn) {
  if (failOn === 'none') return false;
  const { counts } = summary;
  if (failOn === 'info') return counts.error + counts.warn + counts.info > 0;
  if (failOn === 'warn') return counts.error + counts.warn > 0;
  return counts.error > 0;
}
