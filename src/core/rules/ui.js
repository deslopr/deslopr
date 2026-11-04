// deslopr-disable-file -- rule examples quote slop on purpose
// Interface patterns, read from source: markup, JSX, Vue, Svelte, Astro, CSS and Tailwind classes.
// A source scan cannot see the rendered page, so purpose-dependent techniques are `info`
// (they count toward the slop index and surface in clusters) and only near-certain
// defects are `warn` or `error`.
import { re, phrases, matchAll, classStrings, COLOR_TOKEN, hueFamily, lineHasCitation, BEFORE } from './helpers.js';

const UI_KINDS = ['markup', 'style'];
const AI_HUES = new Set(['purple', 'violet', 'indigo', 'fuchsia']);
const COOL = new Set(['blue', 'cyan', 'sky', 'pink', 'teal', 'rose', ...AI_HUES]);

export default [
  {
    id: 'ui/ai-gradient',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Purple-blue default gradient',
    why: 'Purple-to-blue, violet-to-pink and indigo-to-cyan gradients are the most recognisable color tell of generated interfaces.',
    fix: 'Pick color from the product\'s own identity. If a gradient stays, write down what it serves.',
    check(ctx) {
      const out = [];
      const text = ctx.views.nocomment || ctx.raw;
      for (const { value, index } of classStrings(text)) {
        const stops = [...value.matchAll(/\b(?:from|via|to)-([a-z]+)-\d{2,3}\b/g)].map((m) => m[1]);
        if (stops.length < 2 || !/\bbg-(?:gradient|linear|radial|conic)-/.test(value)) continue;
        if (stops.some((h) => AI_HUES.has(h)) && stops.every((h) => COOL.has(h)) && new Set(stops).size >= 2) {
          out.push({ index, match: stops.join(' → '), message: `gradient ${stops.join(' → ')}` });
        }
      }
      for (const m of matchAll(/(?:linear|radial|conic)-gradient\(((?:[^()]|\([^()]*\))*)\)/g, text)) {
        const fams = (m[1].match(COLOR_TOKEN) || []).map(hueFamily).filter(Boolean);
        if (fams.includes('purple') && fams.some((f) => f === 'blue' || f === 'pink')) out.push({ index: m.index, match: m[0].slice(0, 80), message: 'purple gradient into blue or pink' });
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'Hero.tsx', text: '<div className="bg-gradient-to-r from-purple-600 to-blue-500 p-8">Hi</div>\n' },
        { path: 'a.css', text: '.hero { background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); }\n' },
      ],
      good: [
        { path: 'Hero.tsx', text: '<div className="bg-gradient-to-b from-amber-100 to-orange-200">Hi</div>\n' },
        { path: 'a.css', text: '.fade { background: linear-gradient(to bottom, #fff, #f4f4f5); }\n' },
      ],
    },
  },
  {
    id: 'ui/gradient-text',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Gradient text',
    why: 'Gradient-filled headings and metrics are decoration standing in for hierarchy, and they often fail contrast.',
    fix: 'Use a solid color; get emphasis from size and weight.',
    check(ctx) {
      const out = [];
      const text = ctx.views.nocomment || ctx.raw;
      for (const { value, index } of classStrings(text)) {
        if (/\bbg-clip-text\b/.test(value) && /\btext-transparent\b/.test(value)) out.push({ index, match: 'bg-clip-text text-transparent' });
      }
      for (const m of matchAll(/(?:-webkit-)?background-clip\s*:\s*text/g, text)) out.push({ index: m.index, match: m[0] });
      return out;
    },
    examples: {
      bad: [{ path: 'a.jsx', text: '<h1 className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">Build</h1>\n' }],
      good: [{ path: 'a.jsx', text: '<h1 className="text-4xl font-bold text-zinc-900">Build</h1>\n' }],
    },
  },
  {
    id: 'ui/glow-shadow',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Colored glow',
    why: 'A zero-offset colored halo on cards, buttons and icons is decoration, not depth. Glow everywhere is a generated-UI signature.',
    fix: 'Use offset, soft, neutral shadows for elevation, or none.',
    check(ctx) {
      const out = [];
      const text = ctx.views.nocomment || ctx.raw;
      for (const { value, index } of classStrings(text)) {
        const m = /\bshadow-(?:purple|violet|indigo|fuchsia|blue|cyan|sky|pink|emerald|green|teal)-\d{3}(?:\/\d+)?\b|\b(?:drop-)?shadow-\[0(?:px)?_0(?:px)?_\d+px[^\]]*\]/.exec(value);
        if (m) out.push({ index, match: m[0] });
      }
      for (const m of matchAll(/(?:box|text)-shadow\s*:\s*0(?:px)?\s+0(?:px)?\s+(\d+)px(?:\s+\d+px)?\s+([^;}\n]+)/g, text)) {
        if (+m[1] < 8) continue;
        const color = (m[2].match(COLOR_TOKEN) || [])[0];
        const fam = color && hueFamily(color);
        if (fam) out.push({ index: m.index, match: m[0].slice(0, 80) });
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'a.tsx', text: '<button className="rounded-xl shadow-lg shadow-purple-500/50">Go</button>\n' },
        { path: 'a.css', text: '.card { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }\n' },
      ],
      good: [{ path: 'a.css', text: '.card { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); }\n' }],
    },
  },
  {
    id: 'ui/blurred-orb',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Decorative blurred color orb',
    why: 'An absolutely positioned, heavily blurred purple or blue circle behind the hero is the default "ambient" background of generated landing pages.',
    fix: 'Remove it, or replace it with imagery or texture that comes from the product.',
    check(ctx) {
      const out = [];
      for (const { value, index } of classStrings(ctx.views.nocomment || ctx.raw)) {
        if (/\brounded-full\b/.test(value) && /\bblur-(?:2xl|3xl|\[\d{2,}px\])/.test(value) && /\bbg-(?:purple|violet|indigo|fuchsia|pink|blue|cyan|sky)-\d{2,3}/.test(value)) {
          out.push({ index, match: value.slice(0, 80) });
        }
      }
      return out;
    },
    examples: {
      bad: [{ path: 'a.tsx', text: '<div className="absolute -top-20 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl" />\n' }],
      good: [{ path: 'a.tsx', text: '<img className="h-12 w-12 rounded-full" src="/team/ana.jpg" alt="Ana Ruiz" />\n' }],
    },
  },
  {
    id: 'ui/side-stripe',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Colored side stripe on cards',
    why: 'A thick colored border on one side of a rounded card or callout is one of the most recognisable tells of generated UI.',
    fix: 'Drop the stripe; mark state with an icon, a label or the background.',
    check(ctx) {
      const out = [];
      const text = ctx.views.nocomment || ctx.raw;
      for (const { value, index } of classStrings(text)) {
        if (/\bborder-[lrse]-(?:[2-8]|\[\d+px\])\b/.test(value) && /\b(?:rounded|bg-|p-|px-|py-|shadow)/.test(value)) {
          const tag = text.lastIndexOf('<', index);
          if (/^<blockquote\b/i.test(text.slice(tag, tag + 12))) continue;
          out.push({ index, match: (value.match(/\bborder-[lrse]-\S+/) || [''])[0] });
        }
      }
      for (const m of matchAll(/([^{}]*)\{[^{}]*?\bborder-(?:left|right|inline-start|inline-end)\s*:\s*(?:[3-9]|\d{2,})px\s+solid[^{}]*\}/g, text)) {
        if (/blockquote|\bpre\b|code/.test(m[1])) continue;
        out.push({ index: m.index + m[0].indexOf('border-'), match: 'border-left stripe' });
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'a.tsx', text: '<div className="rounded-lg border-l-4 border-indigo-500 bg-white p-4">Tip</div>\n' },
        { path: 'a.css', text: '.callout { border-left: 4px solid #6366f1; border-radius: 8px; }\n' },
      ],
      good: [{ path: 'a.css', text: 'blockquote { border-left: 4px solid #ccc; padding-left: 1rem; }\n' }],
    },
  },
  {
    id: 'ui/glass-stack',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Glassmorphism on everything',
    why: 'Backdrop blur on the navbar, the cards, the modal and the sidebar at once is trend stacking with no hierarchy left.',
    fix: 'Keep blur for the one surface that floats over content, or none.',
    options: { max: 2 },
    check(ctx, opt) {
      const text = ctx.views.nocomment || ctx.raw;
      const hits = [...matchAll(/\bbackdrop-blur(?:-\w+)?\b|backdrop-filter\s*:\s*blur/g, text)];
      return hits.length > opt.max ? [{ index: hits[0].index, match: hits[0][0], message: `backdrop blur on ${hits.length} elements in one file` }] : [];
    },
    examples: {
      bad: [{ path: 'a.tsx', text: '<nav className="backdrop-blur-md" />\n<div className="backdrop-blur-lg" />\n<aside className="backdrop-blur" />\n' }],
      good: [{ path: 'a.tsx', text: '<nav className="backdrop-blur-md" />\n' }],
    },
  },
  {
    id: 'ui/eyebrow-label',
    domain: 'ui',
    severity: 'warn',
    kinds: ['markup'],
    name: 'Eyebrow label or pill above the headline',
    why: 'A tiny uppercase, letter-spaced label (or a small pill chip) parked right above the H1 is the default hero of generated pages, and it usually repeats what the heading says.',
    fix: 'Delete it and let the heading carry the page.',
    check(ctx) {
      const out = [];
      const text = ctx.views.nocomment || ctx.raw;
      for (const h of matchAll(/<h[12]\b/g, text)) {
        const windowStart = Math.max(0, h.index - 500);
        const before = text.slice(windowStart, h.index);
        let last = null;
        for (const m of before.matchAll(/<(\w+)\b([^>]*\bclass(?:Name)?\s*=\s*[^>]*)>([^<]{1,60})<\/\1>/g)) last = m;
        if (!last) continue;
        const attrs = last[2];
        const kicker = /\buppercase\b/.test(attrs) && /\btracking-(?:wide|wider|widest|\[)/.test(attrs);
        const pill = /\brounded-full\b/.test(attrs) && /\btext-(?:xs|sm|\[1[0-3]px\])\b/.test(attrs) && /\b(?:border|bg-)/.test(attrs);
        if (!kicker && !pill) continue;
        const between = before.slice(last.index + last[0].length);
        if (/[^\s]/.test(between.replace(/<[^>]*>/g, ''))) continue;
        out.push({ index: windowStart + last.index, match: last[3].trim(), message: kicker ? 'uppercase tracked label above the headline' : 'pill chip above the headline' });
      }
      return out;
    },
    examples: {
      bad: [
        { path: 'Hero.tsx', text: '<section>\n  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">AI-powered analytics</p>\n  <h1 className="text-5xl">Understand your data</h1>\n</section>\n' },
        { path: 'Hero.vue', text: '<template>\n  <span class="rounded-full border px-3 py-1 text-xs">New in 2.0</span>\n  <h1>Ship faster</h1>\n</template>\n' },
      ],
      good: [{ path: 'Hero.tsx', text: '<section>\n  <h1 className="text-5xl">Understand your data</h1>\n  <p className="text-lg">Connect a warehouse and ask questions in SQL.</p>\n</section>\n' }],
    },
  },
  {
    id: 'ui/unsourced-stat',
    domain: 'ui',
    severity: 'warn',
    name: 'Statistic with no source',
    why: '"10K+ users", "99.9% uptime" and "3x faster" are the numbers generators invent to fill a hero. Unverified, they are fabrication.',
    fix: 'Use a real, sourced number, or remove it. Never invent metrics, logos or testimonials.',
    views: ['ui', 'prose'],
    patterns: [
      { views: ['prose'], when: (m, ctx) => !lineHasCitation(ctx, m.index), re: re(`${BEFORE}(?:\\d{1,3}(?:[.,]\\d+)?\\s?[kKmMbB]\\+|\\d{1,3}(?:[ ,.\\u202f]\\d{3})+\\+)\\s+(?:happy |active |satisfied )?(?:users|customers|developers|teams|companies|businesses|downloads|clients|creators|members|startups|brands|utilisateurs|clients|entreprises|développeurs|équipes|marques)\\b`, 'giu') },
      { views: ['ui'], when: (m, ctx) => !lineHasCitation(ctx, m.index), re: re(`${BEFORE}(?:\\d{1,3}(?:[.,]\\d+)?\\s?[kKmMbB]\\+|\\d{1,3}(?:[ ,.\\u202f]\\d{3})+\\+?)\\s+(?:happy |active |satisfied )?(?:users|customers|developers|teams|companies|businesses|downloads|clients|creators|members|startups|brands|utilisateurs|clients|entreprises|développeurs|équipes|marques)\\b`, 'giu') },
      { when: (m, ctx) => !lineHasCitation(ctx, m.index), re: re(`${BEFORE}99[.,]9+\\s?%\\s+(?:uptime|availability|accuracy|satisfaction|disponibilité|de disponibilité|de satisfaction)`, 'giu') },
      { when: (m, ctx) => !lineHasCitation(ctx, m.index), re: re(`${BEFORE}(?:\\d{1,4}\\s?%|\\d{1,3}(?:[.,]\\d)?x)\\s+(?:faster|quicker|more productive|cheaper|less time|fewer bugs|more conversions|increase in|boost in|plus rapide|moins cher|de temps gagné|de productivité en plus)`, 'giu') },
      { when: (m, ctx) => !lineHasCitation(ctx, m.index), re: re(`${BEFORE}(?:trusted|used|loved|chosen) by (?:over |more than |\\d)[\\d,.]*\\s?[kKmM]?\\+?`, 'giu') },
      { when: (m, ctx) => !lineHasCitation(ctx, m.index), re: re(`${BEFORE}4[.,][5-9]\\s?\\/\\s?5\\b|${BEFORE}★★★★★`, 'gu') },
    ],
    examples: {
      bad: [
        { path: 'Hero.tsx', text: '<p className="text-sm">Trusted by 10,000+ teams worldwide</p>\n' },
        { path: 'index.html', text: '<span>99.9% uptime</span>\n' },
        { path: 'Stats.tsx', text: 'const stats = [{ label: "Join 50K+ developers shipping faster" }];\n' },
      ],
      good: [
        { path: 'Hero.tsx', text: '<p>Used by 312 teams (<a href="/customers">see the list</a>)</p>\n' },
        'The migration takes about a minute for 1,000 users and is safe to re-run.',
      ],
    },
  },
  {
    id: 'ui/unverified-claim',
    domain: 'ui',
    severity: 'warn',
    name: 'Compliance or security claim to verify',
    why: '"SOC 2 compliant" and "bank-grade encryption" are claims generators add to look credible. False, they are a legal problem, not a style one.',
    fix: 'Keep the claim only if it is true and documented; link the evidence.',
    views: ['ui', 'prose'],
    patterns: [
      { when: (m, ctx) => !lineHasCitation(ctx, m.index), re: phrases([
        'SOC ?2{ Type {I|II|1|2}|} {compliant|certified|ready}', 'SOC 2 Type {I|II}', 'HIPAA{-| }compliant', 'GDPR{-| }compliant', 'ISO 27001{ certified|}',
        '{bank|military|enterprise}{-| }grade {security|encryption|protection}', '256-bit encryption', 'PCI{-| }DSS compliant',
        'conforme {au |}RGPD', 'sécurité de niveau {bancaire|militaire}', 'certifié ISO 27001', 'hébergement certifié HDS',
      ]) },
    ],
    examples: {
      bad: [{ path: 'Footer.tsx', text: '<li>SOC 2 Type II compliant</li>\n<li>Bank-grade encryption</li>\n' }],
      good: [{ path: 'Footer.tsx', text: '<li>Data stored in Frankfurt (eu-central-1)</li>\n' }],
    },
  },
  {
    id: 'ui/placeholder-person',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Placeholder or random person',
    why: 'Random avatar services and "Jane Doe, CEO" make testimonials and team sections that are fabricated by construction.',
    fix: 'Use real people with their consent, or an honest empty state. Never fake a testimonial.',
    patterns: [
      { views: ['nocomment'], re: re('\\b(?:i\\.pravatar\\.cc|randomuser\\.me|ui-avatars\\.com|thispersondoesnotexist\\.com|xsgames\\.co\\/randomusers|api\\.dicebear\\.com|robohash\\.org)\\b', 'gi') },
      { views: ['nocomment'], re: re('\\b(?:placehold\\.co|placeholder\\.com|via\\.placeholder\\.com|picsum\\.photos|dummyimage\\.com|source\\.unsplash\\.com|placekitten\\.com|loremflickr\\.com)\\b', 'gi'), severity: 'info' },
      { views: ['ui'], re: phrases(['John Doe', 'Jane Doe', 'Jane Smith', 'John Smith', 'Jean Dupont', 'Marie Dupont', 'Acme {Corp|Inc|Corporation}', 'TechCorp', 'Example Corp']) },
    ],
    examples: {
      bad: [{ path: 'Testimonials.tsx', text: '<img src="https://i.pravatar.cc/150?img=3" alt="" />\n<p>Jane Doe, CEO at TechCorp</p>\n' }],
      good: [{ path: 'Team.tsx', text: '<img src="/team/ana.jpg" alt="Ana Ruiz" />\n' }],
    },
  },
  {
    id: 'ui/dead-control',
    domain: 'ui',
    severity: 'warn',
    kinds: ['markup'],
    name: 'Control that does nothing',
    why: 'href="#", empty onClick handlers and links to nowhere look finished in a screenshot and fail the first click.',
    fix: 'Wire it to a real destination or action, or remove it. If it is pending, label it visibly.',
    views: ['nocomment'],
    patterns: [
      re('\\bhref\\s*=\\s*(?:"#?"|\'#?\'|\\{\\s*["\']#?["\']\\s*\\}|"javascript:void\\(0\\);?")', 'g'),
      re('\\bon[Cc]lick\\s*=\\s*\\{\\s*\\(\\s*\\w*\\s*\\)\\s*=>\\s*(?:\\{\\s*\\}|null|undefined|void 0)\\s*\\}', 'g'),
      re('(?:@click|v-on:click|on:click|onclick)\\s*=\\s*(?:""|\'\'|\\{\\s*\\(\\)\\s*=>\\s*\\{\\s*\\}\\s*\\})', 'g'),
    ],
    examples: {
      bad: [{ path: 'Nav.tsx', text: '<a href="#">Pricing</a>\n<button onClick={() => {}}>Buy</button>\n' }],
      good: [{ path: 'Nav.tsx', text: '<a href="#pricing">Pricing</a>\n<button onClick={() => checkout(plan)}>Buy</button>\n' }],
    },
  },
  {
    id: 'ui/emoji-icon',
    domain: 'ui',
    severity: 'warn',
    kinds: ['markup'],
    name: 'Emoji used as an icon',
    why: 'Emoji standing in for an icon system (🚀 on every feature card) renders differently on every platform and reads as filler.',
    fix: 'Use one consistent icon set, or no icon.',
    views: ['nocomment'],
    patterns: [
      re('(?<=<(?:h[1-6]|button|li|a|span|div|p|dt)\\b[^>]*>\\s*)(?![©®™])\\p{Extended_Pictographic}', 'gu'),
      re('(?<=\\bicon\\s*[:=]\\s*\\{?\\s*["\'`]\\s*)(?![©®™])\\p{Extended_Pictographic}', 'gu'),
    ],
    examples: {
      bad: [{ path: 'Features.tsx', text: 'const features = [{ icon: "🚀", title: "Fast" }];\n<h3>⚡ Lightning fast</h3>\n' }],
      good: [{ path: 'Features.tsx', text: '<h3><BoltIcon aria-hidden /> Fast builds</h3>\n' }],
    },
  },
  {
    id: 'ui/missing-alt',
    domain: 'ui',
    severity: 'warn',
    kinds: ['markup'],
    name: 'Image without alt text',
    why: 'Screen readers announce the file name or nothing. Generated markup often drops alt.',
    fix: 'Describe the image in alt, or use alt="" if it is purely decorative.',
    views: ['nocomment'],
    patterns: [re('<(?:img|Image)\\b(?![^>]*\\balt\\s*=)(?![^>]*\\{\\s*\\.\\.\\.)[^>]*>', 'g')],
    examples: {
      bad: [{ path: 'a.html', text: '<img src="/hero.png" class="w-full">\n' }],
      good: [{ path: 'a.html', text: '<img src="/hero.png" alt="Dashboard showing weekly revenue">\n<img src="/dots.svg" alt="">\n' }],
    },
  },
  {
    id: 'ui/focus-removed',
    domain: 'ui',
    severity: 'warn',
    kinds: UI_KINDS,
    name: 'Focus outline removed with no replacement',
    why: 'outline: none without a visible focus style makes the interface unusable from the keyboard.',
    fix: 'Keep the outline, or replace it with a :focus-visible style (ring, border, offset).',
    check(ctx) {
      const text = ctx.views.nocomment || ctx.raw;
      const out = [];
      if (!/focus-visible|:focus\s*\{|focus:ring|focus:border|focus:shadow|focus-within/.test(text)) {
        for (const m of matchAll(/\boutline\s*:\s*(?:none|0)\b/g, text)) out.push({ index: m.index, match: m[0] });
      }
      for (const { value, index } of classStrings(text)) {
        if (/\b(?:focus:)?outline-none\b/.test(value) && !/\bfocus(?:-visible)?:(?:ring|outline|border|shadow|bg|underline)/.test(value)) out.push({ index, match: 'outline-none' });
      }
      return out;
    },
    examples: {
      bad: [{ path: 'a.css', text: 'button { outline: none; }\n' }, { path: 'a.tsx', text: '<input className="outline-none border px-2" />\n' }],
      good: [{ path: 'a.tsx', text: '<input className="outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />\n' }],
    },
  },
  {
    id: 'ui/clickable-div',
    domain: 'ui',
    severity: 'warn',
    kinds: ['markup'],
    name: 'Click handler on a div',
    why: 'A div with onClick is not focusable and not announced as a control.',
    fix: 'Use a <button> (or <a> for navigation).',
    views: ['nocomment'],
    patterns: [re('<(?:div|span|li)\\b(?=[^>]*\\b(?:on[Cc]lick|@click|on:click|v-on:click)\\s*=)(?![^>]*\\brole\\s*=)(?![^>]*\\btabIndex|tabindex)[^>]*>', 'g')],
    examples: {
      bad: [{ path: 'Card.tsx', text: '<div className="card" onClick={() => open(id)}>Open</div>\n' }],
      good: [{ path: 'Card.tsx', text: '<button type="button" className="card" onClick={() => open(id)}>Open</button>\n' }],
    },
  },
  {
    id: 'ui/overused-font',
    domain: 'ui',
    severity: 'info',
    kinds: ['markup', 'style', 'code'],
    name: 'Default AI typeface',
    why: 'Inter, Roboto, Poppins, Plus Jakarta Sans, Space Grotesk and Geist are what generators reach for with no brief. Fine with a reason; a tell without one.',
    fix: 'Choose the face for the brand\'s character, and write the reason down. Allow your brand font in config.',
    options: { fonts: ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Geist', 'DM Sans', 'Outfit', 'Manrope', 'Lato', 'Fraunces'], allow: [] },
    check(ctx, opt) {
      const fonts = opt.fonts.filter((f) => !opt.allow.map((a) => a.toLowerCase()).includes(f.toLowerCase()));
      if (!fonts.length) return [];
      const names = fonts.map((f) => f.replace(/ /g, '[ +_]')).join('|');
      const text = ctx.views.nocomment || ctx.raw;
      const out = [];
      const pats = [
        new RegExp(`font-family\\s*:\\s*['"]?(${names})\\b`, 'g'),
        new RegExp(`import\\s*\\{[^}]*\\b(${fonts.map((f) => f.replace(/ /g, '_')).join('|')})\\b[^}]*\\}\\s*from\\s*['"]next/font/google['"]`, 'g'),
        new RegExp(`fonts\\.googleapis\\.com/css2?\\?family=(${names})\\b`, 'g'),
        new RegExp(`fontFamily\\s*:\\s*\\{[^}]*?\\[\\s*['"](${names})['"]`, 'g'),
      ];
      for (const r of pats) for (const m of matchAll(r, text)) out.push({ index: m.index, match: m[1].replace(/[+_]/g, ' ') });
      return out;
    },
    examples: {
      bad: [{ path: 'a.css', text: 'body { font-family: "Inter", sans-serif; }\n' }, { path: 'layout.tsx', text: "import { Inter } from 'next/font/google';\n" }],
      good: [{ path: 'a.css', text: 'body { font-family: "Söhne", system-ui, sans-serif; }\n' }],
    },
  },
  {
    id: 'ui/generic-ai-icon',
    domain: 'ui',
    severity: 'info',
    kinds: ['markup', 'code'],
    name: 'Sparkle, wand and rocket icons',
    why: 'Sparkles, magic wands, bolts, rockets and robot heads signal "AI" by reflex and say nothing about the feature.',
    fix: 'Pick an icon that depicts what the feature does, or none.',
    check(ctx) {
      const out = [];
      const AI = /^(?:Sparkles?|SparklesIcon|Wand2?|WandSparkles|MagicWand\w*|Zap|ZapIcon|Bot|BotIcon|BrainCircuit|Rocket|RocketIcon|Stars|Gem|Cpu|Atom|Lightning\w*|Bolt\w*)$/;
      for (const m of matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](?:lucide-react|lucide-vue-next|lucide-svelte|@lucide\/[\w-]+|@heroicons\/react[^'"]*|react-icons[^'"]*|@tabler\/icons-react|phosphor-react|@phosphor-icons\/react|@radix-ui\/react-icons)['"]/g, ctx.raw)) {
        const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter((n) => AI.test(n));
        if (names.length >= 2) out.push({ index: m.index, match: names.join(', '), message: `generic "AI" icons: ${names.join(', ')}` });
      }
      return out;
    },
    examples: {
      bad: [{ path: 'a.tsx', text: "import { Sparkles, Zap, Rocket, Shield } from 'lucide-react';\n" }],
      good: [{ path: 'a.tsx', text: "import { Calendar, Mail } from 'lucide-react';\n" }],
    },
  },
  {
    id: 'ui/generic-cta',
    domain: 'ui',
    severity: 'info',
    kinds: ['markup'],
    name: 'Generic call to action',
    why: '"Get Started", "Learn More" and "Explore" name no action. The button should say what happens next.',
    fix: 'Name the action: "Create a workspace", "Read the API docs", "Book a demo".',
    views: ['nocomment'],
    patterns: [
      re('>\\s*(?:Get Started(?: Now| Free| for Free)?|Learn More|Try (?:it )?(?:Now|for Free|Free)|Explore(?: Now| More)?|Discover(?: More)?|Click Here|Sign Up Now|Start Your Journey|Unlock (?:the )?Power|Join the (?:Revolution|Future)|Commencer(?: maintenant)?|En savoir plus|Découvrir|Essayer gratuitement|Cliquez ici)\\s*(?:→|->|&rarr;|↗|›)?\\s*<', 'giu'),
    ],
    examples: {
      bad: [{ path: 'Hero.tsx', text: '<button className="btn">Get Started →</button>\n' }],
      good: [{ path: 'Hero.tsx', text: '<button className="btn">Create a workspace</button>\n' }],
    },
  },
  {
    id: 'ui/bounce-easing',
    domain: 'ui',
    severity: 'info',
    kinds: UI_KINDS,
    name: 'Bounce and elastic motion',
    why: 'Bouncing and elastic easing feels dated and draws the eye for no reason.',
    fix: 'Use a smooth ease-out; reserve motion for one authored moment.',
    check(ctx) {
      const text = ctx.views.nocomment || ctx.raw;
      const out = [];
      for (const m of matchAll(/\banimate-bounce\b|\bease(?:In|Out|InOut)?(?:Back|Elastic|Bounce)\b|\b(?:bounce|elastic)(?:In|Out|InOut)\b|cubic-bezier\(\s*[\d.]+\s*,\s*(?:-\d*\.?\d+|1\.[1-9]\d*|[2-9][\d.]*)/g, text)) out.push({ index: m.index, match: m[0] });
      return out;
    },
    examples: {
      bad: [{ path: 'a.tsx', text: '<div className="animate-bounce">↓</div>\n' }],
      good: [{ path: 'a.css', text: '.in { transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1); }\n' }],
    },
  },
  {
    id: 'ui/fake-window-chrome',
    domain: 'ui',
    severity: 'info',
    kinds: UI_KINDS,
    name: 'Fake terminal or window chrome',
    why: 'Three red-yellow-green dots on a dark box, typing out commands, is the stock "developer tool" hero visual.',
    fix: 'Show the real product, or a real screenshot.',
    check(ctx) {
      const text = ctx.views.nocomment || ctx.raw;
      const out = [];
      for (const m of matchAll(/bg-red-[45]00[\s\S]{0,300}?bg-(?:yellow|amber)-[45]00[\s\S]{0,300}?bg-green-[45]00/g, text)) out.push({ index: m.index, match: 'red / yellow / green dots' });
      for (const m of matchAll(/#ff5f5[67][\s\S]{0,300}?#ffbd2[ef][\s\S]{0,300}?#27c93f/gi, text)) out.push({ index: m.index, match: 'traffic-light colors' });
      return out;
    },
    examples: {
      bad: [{ path: 'Terminal.tsx', text: '<div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-red-500" /><span className="h-3 w-3 rounded-full bg-yellow-500" /><span className="h-3 w-3 rounded-full bg-green-500" /></div>\n' }],
      good: [{ path: 'Status.tsx', text: '<span className="bg-green-500">Online</span>\n' }],
    },
  },
  {
    id: 'ui/pulsing-dot',
    domain: 'ui',
    severity: 'info',
    kinds: UI_KINDS,
    name: 'Decorative pulsing dot',
    why: 'A small pinging dot simulates liveness. Unless it reflects live data, it is decoration that pulls attention.',
    fix: 'Use a static indicator, or tie the animation to real state.',
    check(ctx) {
      const out = [];
      for (const { value, index } of classStrings(ctx.views.nocomment || ctx.raw)) {
        if (/\banimate-(?:ping|pulse)\b/.test(value) && /\brounded-full\b/.test(value) && /\b(?:h|w|size)-(?:1|1\.5|2|2\.5|3)\b/.test(value)) out.push({ index, match: 'animate-ping dot' });
      }
      return out;
    },
    examples: {
      bad: [{ path: 'a.tsx', text: '<span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />\n' }],
      good: [{ path: 'a.tsx', text: '<div className="h-24 animate-pulse rounded bg-zinc-100" aria-busy="true" />\n' }],
    },
  },
];
