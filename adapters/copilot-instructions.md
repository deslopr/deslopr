<!-- deslopr:start -->
<!-- deslopr-disable -- this block lists slop patterns as examples -->
## No AI slop (deslopr)

Everything you produce here (prose, code, comments, UI copy) must read as the work of a careful human expert.
Full rules: `.agents/skills/deslopr/SKILL.md`. Load `references/writing.md`, `references/code.md` or `references/ui.md` for the domain you touch.

Before you call a task done:
1. Run `npx deslopr --diff` and fix every error and warning it reports. For a real false positive, keep the line and put `deslopr-disable-next-line <rule> -- <reason>` above it.
2. Never invent facts: numbers, quotes, testimonials, sources, logos or compliance claims.
3. Say what you checked (the command and its result), not "looks good".

Write like a careful human expert, not a model. Cut AI slop:
- No "it's not X, it's Y", "No X. No Y. Just Z.", "Here's the thing", "The result?", "Let's dive in", "In conclusion".
- No delve, tapestry, testament, seamless, robust, leverage, pivotal, game-changer, "plays a crucial role", "in today's fast-paced world".
- No unsourced "studies show" or "experts agree". Never invent numbers, quotes, testimonials, sources or claims.
- One or two em dashes per piece at most. No emoji in headings or bullets. Bold only what a skimmer must not miss.
- Lead with the point. Concrete beats abstract: names, numbers, mechanisms. Repeat the right word instead of cycling synonyms.
- When editing, keep the writer's voice and make the smallest edit that fixes the problem.
- End on the last useful sentence: no recap, no "hope this helps", no offer to help more.
Code: no comments that restate the line or narrate the edit, no "for future use" abstractions, no empty catch blocks, no _v2 copies, no tests without real assertions, no "// ... rest of code" placeholders.
UI: no default purple-blue gradients, glows, gradient text, eyebrow labels above the H1, emoji icons, fake stats or testimonials, dead links. Every control works, images have alt text, focus stays visible.
<!-- deslopr-enable -->
<!-- deslopr:end -->
