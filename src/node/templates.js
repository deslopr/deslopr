// Text that deslopr writes into other tools' instruction files. The build script renders
// the same templates into adapters/ and dist/, so the installer and the committed copies
// never drift apart.

export const MARK_START = '<!-- deslopr:start -->';
export const MARK_END = '<!-- deslopr:end -->';

// Fits the 1,500-character limit of chat custom-instruction fields.
export const COMPACT_RULES = `Write like a careful human expert, not a model. Cut AI slop:
- No "it's not X, it's Y", "No X. No Y. Just Z.", "Here's the thing", "The result?", "Let's dive in", "In conclusion".
- No delve, tapestry, testament, seamless, robust, leverage, pivotal, game-changer, "plays a crucial role", "in today's fast-paced world".
- No unsourced "studies show" or "experts agree". Never invent numbers, quotes, testimonials, sources or claims.
- One or two em dashes per piece at most. No emoji in headings or bullets. Bold only what a skimmer must not miss.
- Lead with the point. Concrete beats abstract: names, numbers, mechanisms. Repeat the right word instead of cycling synonyms.
- When editing, keep the writer's voice and make the smallest edit that fixes the problem.
- End on the last useful sentence: no recap, no "hope this helps", no offer to help more.
Code: no comments that restate the line or narrate the edit, no "for future use" abstractions, no empty catch blocks, no _v2 copies, no tests without real assertions, no "// ... rest of code" placeholders.
UI: no default purple-blue gradients, glows, gradient text, eyebrow labels above the H1, emoji icons, fake stats or testimonials, dead links. Every control works, images have alt text, focus stays visible.`;

export function pointerBody({ skillPath = '.claude/skills/deslopr', cmd = 'npx deslopr' } = {}) {
  return `## No AI slop (deslopr)

Everything you produce here (prose, code, comments, UI copy) must read as the work of a careful human expert.
Full rules: \`${skillPath}/SKILL.md\`. Load \`references/writing.md\`, \`references/code.md\` or \`references/ui.md\` for the domain you touch.

Before you call a task done:
1. Run \`${cmd} --diff\` and fix every error and warning it reports. For a real false positive, keep the line and put \`deslopr-disable-next-line <rule> -- <reason>\` above it.
2. Never invent facts: numbers, quotes, testimonials, sources, logos or compliance claims.
3. Say what you checked (the command and its result), not "looks good".

${COMPACT_RULES}`;
}

// The block quotes slop on purpose, so it switches the detector off for its own lines.
const OFF = '<!-- deslopr-disable -- this block lists slop patterns as examples -->';
const ON = '<!-- deslopr-enable -->';
const OFF_FILE = '<!-- deslopr-disable-file -- this file lists slop patterns as examples -->';

export function pointerBlock(opts) {
  return `${MARK_START}\n${OFF}\n${pointerBody(opts)}\n${ON}\n${MARK_END}\n`;
}

export function cursorRule(opts) {
  return `---
description: Remove AI slop from prose, code and UI (deslopr)
alwaysApply: true
---
${OFF_FILE}

${pointerBody(opts)}
`;
}

export function windsurfRule(opts) {
  return `---
trigger: always_on
description: Remove AI slop from prose, code and UI (deslopr)
---
${OFF_FILE}

${pointerBody(opts)}
`;
}

export function plainRule(opts) {
  return `${OFF_FILE}\n\n${pointerBody(opts)}\n`;
}

// For pasting into a chat tool's custom instructions, so no directive comment.
export function compactFile() {
  return `${COMPACT_RULES}\n`;
}

// Insert or replace our marked block in an instruction file, leaving the rest untouched.
export function upsertBlock(existing, block) {
  if (!existing) return block;
  const a = existing.indexOf(MARK_START);
  const b = existing.indexOf(MARK_END);
  if (a >= 0 && b > a) return existing.slice(0, a) + block.trimEnd() + existing.slice(b + MARK_END.length);
  return existing.replace(/\s*$/, '\n\n') + block;
}

export function removeBlock(existing) {
  const a = existing.indexOf(MARK_START);
  const b = existing.indexOf(MARK_END);
  if (a < 0 || b < a) return existing;
  return (existing.slice(0, a).replace(/\s*$/, '\n') + existing.slice(b + MARK_END.length).replace(/^\s*/, '')).replace(/^\s+$/, '');
}
