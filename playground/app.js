// deslopr-disable-file -- the samples below are slop on purpose
import { scanText, getRule } from '../src/core/index.js';

const SAMPLES = {
  post: { kind: 'md', text: `## 🚀 Introducing FlowSync 2.0

In today's fast-paced world, teams need more than tools. Here's the thing: it's not just a calendar, it's a whole new way of working.

We delved deep into what makes collaboration seamless — and the answer surprised us. The result? A robust, cutting-edge platform that empowers teams to leverage their full potential.

What nobody tells you about scheduling: it plays a crucial role in team health. Studies show that teams with shared calendars ship 40% faster.

- ✅ Seamless integrations
- ✅ Enterprise-grade security
- ✅ Effortless onboarding

No setup. No learning curve. Just results.

Whether you're a solo founder or a Fortune 500 team, FlowSync marks a pivotal moment for modern work, highlighting our commitment to innovation.

In conclusion, FlowSync isn't just software — it's a movement. Let me know if you have any questions!
` },
  fr: { kind: 'md', text: `## ✨ Pourquoi l'automatisation change la donne

Soyons honnêtes : dans un monde en constante évolution, l'automatisation n'est plus une option. Ce n'est pas un outil, c'est une véritable philosophie.

Plongeons dans le vif du sujet. Le résultat ? Une productivité décuplée et une synergie incontournable entre vos équipes.

Ce que personne ne vous dit : l'automatisation joue un rôle essentiel dans la réussite de votre stratégie. Les experts s'accordent à dire qu'elle est la pierre angulaire de la transformation.

Pas de code. Pas de stress. Que du concret.

Que vous soyez freelance ou grand groupe, notre plateforme vous accompagne, soulignant ainsi notre engagement envers l'innovation.

En conclusion, il est important de noter que l'avenir appartient à ceux qui automatisent. N'hésitez pas à nous contacter !
` },
  hero: { kind: 'tsx', text: `import { Sparkles, Zap, Rocket } from 'lucide-react';

// =============================================
// HERO SECTION
// =============================================

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/30 blur-3xl" />
      <span className="rounded-full border border-purple-500/40 px-3 py-1 text-xs">✨ Now with AI</span>
      <h1 className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent text-6xl">
        Supercharge your workflow
      </h1>
      <p>Trusted by 10,000+ teams worldwide. 99.9% uptime. SOC 2 Type II compliant.</p>
      <a href="#" className="rounded-full px-6 py-3 shadow-lg shadow-purple-500/50">Get Started →</a>
      <img src="https://i.pravatar.cc/150?img=3" className="h-10 w-10 rounded-full" />
      <p>"This changed everything." - Jane Doe, CEO at TechCorp</p>
    </section>
  );
}
` },
  py: { kind: 'py', text: `# ==========================================
# CONFIGURATION
# ==========================================

# Set the timeout
timeout = 30


def get_invoice(invoice_id):
    """Get the invoice."""
    # Step 1: Load the data
    data = load(invoice_id)
    # Step 2: Parse the data
    parsed = json.loads(data)
    # Step 3: Return the result
    return parsed


def get_invoice_v2(invoice_id):
    try:
        return fetch(invoice_id)
    except Exception:
        pass


def export_to_xml(invoice):
    # Kept for future use
    # ... rest of the implementation
    print("✅ Exported invoice")
` },
  clean: { kind: 'md', text: `# FlowSync 2.0

FlowSync now syncs Google and Outlook calendars both ways. Before 2.0, changes made in Outlook took up to 15 minutes to show up; they now arrive in under 30 seconds.

Run \`flowsync migrate\` once per workspace. It takes about a minute for 1,000 users and is safe to re-run. If it fails halfway, nothing is lost: the old sync keeps running until the migration finishes.

Recurring events with exceptions created before 2019 sometimes lose their exceptions on the first sync. It's not common, but if you see it, re-save the series once in Google Calendar.
` },
};

const $ = (id) => document.getElementById(id);
const input = $('input');
const kind = $('kind');
const lang = $('lang');
const verbose = $('verbose');

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function lineStarts(text) {
  const out = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') out.push(i + 1);
  return out;
}

function render() {
  const text = input.value;
  const config = lang.value ? { languages: [lang.value] } : {};
  const result = scanText(text, { path: `input.${kind.value}`, config });
  const shown = result.findings.filter((f) => f.severity !== 'info' || verbose.checked || result.cluster);

  const total = result.findings.length;
  $('score').innerHTML = !text.trim()
    ? 'Nothing to check yet.'
    : total
      ? `Slop index <strong>${result.index}</strong><span class="grade grade-${result.grade}">${result.grade}</span> · ${total} finding${total === 1 ? '' : 's'}, ${result.distinct} pattern${result.distinct === 1 ? '' : 's'}`
      : 'No slop found. <span class="grade grade-A">A</span>';

  // Highlight the match where it sits on its line; a summary match (a list of names, a
  // count) is not literal text, so mark the rest of the line from the column instead.
  const starts = lineStarts(text);
  const ranges = shown.map((f, i) => {
    const lineStart = starts[f.line - 1] ?? 0;
    const lineEnd = (starts[f.line] ?? text.length + 1) - 1;
    let from = lineStart + f.column - 1;
    let len;
    const at = f.match ? text.slice(lineStart, lineEnd).indexOf(f.match, Math.max(0, f.column - 1)) : -1;
    if (at >= 0) {
      from = lineStart + at;
      len = f.match.length;
    } else {
      len = Math.min(lineEnd - from, 60);
    }
    return { from, to: from + Math.max(1, len), f, n: i + 1 };
  }).sort((a, b) => a.from - b.from);

  let html = '';
  let pos = 0;
  for (const r of ranges) {
    if (r.from < pos) continue;
    html += escapeHtml(text.slice(pos, r.from));
    html += `<mark class="${r.f.severity}" id="m${r.n}" title="${escapeHtml(r.f.rule + ': ' + r.f.message)}">${escapeHtml(text.slice(r.from, r.to))}<sup>${r.n}</sup></mark>`;
    pos = r.to;
  }
  html += escapeHtml(text.slice(pos));
  $('marked').innerHTML = html || '<span class="empty">Your text appears here with each pattern marked.</span>';

  const list = $('findings');
  list.innerHTML = shown.length
    ? shown.map((f, i) => {
        const rule = getRule(f.rule);
        const quote = f.match && !f.message.includes(f.match) ? ` <q>${escapeHtml(f.match)}</q>` : '';
        return `<li><button type="button" data-n="${i + 1}"><div class="f-head"><span class="f-sev ${f.severity}">${f.severity}</span>${escapeHtml(f.message)}${quote}</div><div class="f-rule">line ${f.line} · ${f.rule}</div><p class="f-fix">${escapeHtml(rule ? rule.fix : '')}</p></button></li>`;
      }).join('')
    : text.trim() && total ? '<li class="empty">Only info findings, which count in clusters. Tick the box above to see them.</li>' : '';
}

$('findings').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-n]');
  if (!b) return;
  document.querySelectorAll('mark.active').forEach((m) => m.classList.remove('active'));
  const m = document.getElementById(`m${b.dataset.n}`);
  if (m) {
    m.classList.add('active');
    m.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
});

document.querySelector('.samples').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-sample]');
  if (!b) return;
  const s = SAMPLES[b.dataset.sample];
  kind.value = s.kind;
  input.value = s.text;
  render();
  input.focus();
});

let timer;
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(render, 120);
});
for (const el of [kind, lang, verbose]) el.addEventListener('change', render);

input.value = SAMPLES.post.text;
render();
