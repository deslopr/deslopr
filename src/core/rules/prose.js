// deslopr-disable-file -- rule examples quote slop on purpose
// Writing patterns. English and French side by side: one rule id per pattern family, so
// disabling a rule disables it in every language.
import { phrases, sentenceStart, re, BEFORE, SP, lineHasCitation, matchAll } from './helpers.js';

const notCited = (m, ctx) => !lineHasCitation(ctx, m.index);

export const EN_VOCAB = [
  'delve~', 'tapestry', 'testament', 'realm', 'beacon', 'multifaceted', 'meticulous~', 'intricate~', 'intricacies',
  'paramount', 'embark~', 'elevate~', 'foster~', 'leverag~', 'utiliz~', 'utilise', 'utilised', 'utilises', 'utilising', 'seamless~', 'robust', 'cutting-edge',
  'state-of-the-art', 'game-changer', 'game-changing', 'ever-evolving', 'ever-changing', 'holistic', 'synerg~',
  'empower~', 'streamlin~', 'supercharg~', 'unparalleled', 'groundbreaking', 'revolutioniz~', 'transformative',
  'pivotal', 'bustling', 'vibrant', 'nestled', 'boasts', 'showcas~', 'underscor~', 'noteworthy', 'commendable',
  'plethora', 'myriad', 'unleash~', 'resonat~', 'nuanced', 'furthermore', 'moreover', 'additionally', 'notably',
  'comprehensive', 'crucial', 'invaluable', 'thought-provoking', 'world-class', 'next-generation', 'next-gen',
  'best-in-class', 'mission-critical', 'frictionless', 'effortless~', 'unlock~ the power', 'harness the power',
];

export const FR_VOCAB = [
  'plonger dans', 'plongeons', 'méandres', 'tapisserie', 'pierre angulaire', 'incontournable~', 'révolutionnaire~',
  'synergie~', 'holistique~', 'catalyseur~', 'sublimer', 'sublime~ votre', 'propulser', 'décupler', 'booster',
  'dynamiser', 'véritable~', 'robuste~', 'transformat~', 'en outre', 'de surcroît', 'fluidifier',
  'innovant~', 'disruptif~', 'écosystème~', 'levier~', 'à la pointe',
];

const EN_VOCAB_RE = phrases(EN_VOCAB);
const FR_VOCAB_RE = phrases(FR_VOCAB);

export default [
  {
    id: 'prose/chatbot-artifact',
    domain: 'prose',
    severity: 'error',
    name: 'Chat assistant residue',
    why: 'Lines a chat assistant says to its user ended up in the deliverable. Readers notice at once.',
    fix: 'Delete the line. A document does not talk about having been written.',
    patterns: [
      { lang: 'en', re: phrases([
        'I hope this helps', 'hope this helps', 'as an AI language model', 'as an AI model', 'as a large language model',
        'as an AI assistant', 'as of my last {knowledge |training |}{update|cutoff}', 'my knowledge cutoff',
        'my training data', 'I cannot browse the internet', 'I don\'t have access to real-time',
        '{Certainly|Sure|Absolutely|Of course}! Here{\'s| is| are}', 'great question!', 'what a great question',
        'here{\'s| is} {a|an|the|your} {revised|updated|improved|rewritten|polished|refined|corrected|cleaned-up} {version|draft|text|copy}',
        'would you like me to', 'shall I {also |}{continue|expand|add|write|create}', 'you\'re absolutely right',
        'I apologize for the confusion', 'I apologize for any confusion',
      ]) },
      { lang: 'fr', re: phrases([
        'j\'espère que {cela|ça} {vous |t\'|}aide', 'en tant qu\'{IA|intelligence artificielle|modèle de langage|assistant}',
        '{excellente|très bonne|bonne} question !', '{Bien sûr|Certainement|Absolument} ! Voici',
        'voici {une|la|ta|votre} version {révisée|améliorée|corrigée|retravaillée|reformulée}',
        '{souhaitez|voulez}-vous que je', 'veux-tu que je', 'ma date de coupure', 'mes connaissances s\'arrêtent',
        'vous avez tout à fait raison', 'je m\'excuse pour la confusion',
      ]) },
    ],
    examples: {
      bad: [
        'The function returns a list of users. I hope this helps!',
        'Certainly! Here is the updated README for your project.',
        'As of my last knowledge update, the API supports three regions.',
        'Voici une version améliorée de votre texte.',
        'J\'espère que cela vous aide !',
      ],
      good: [
        'We hope the new import flow helps teams with large catalogs.',
        'Here is the configuration file used in production.',
      ],
    },
  },
  {
    id: 'prose/chatbot-closer',
    domain: 'prose',
    severity: 'warn',
    name: 'Chatbot sign-off',
    why: 'A generic closing offer adds nothing the reader can act on and is the default ending of assistant replies.',
    fix: 'End on the last useful sentence, or give a specific next step (a link, a command, a contact).',
    patterns: [
      { lang: 'en', re: phrases([
        'let me know if you have any {other |further |more |}questions', 'let me know if you\'d like', 'let me know if you would like',
        'feel free to ask', 'don\'t hesitate to {reach out|ask|contact}', 'I\'m happy to help', 'I\'d be happy to help',
        'happy coding!', 'I hope you found this {helpful|useful|informative}', 'hope you enjoyed {this|the}',
        'thanks for reading!', 'stay tuned for more',
      ]) },
      { lang: 'fr', re: phrases([
        'n\'hésitez pas à {me|nous} {contacter|solliciter|faire signe|poser vos questions}', 'n\'hésite pas à me',
        'j\'espère que cet article vous a {plu|été utile|aidé}', 'bonne lecture !', 'à vos claviers !',
        'je reste à {votre|ta} disposition', 'restez connectés', 'je suis là pour vous aider',
      ]) },
    ],
    examples: {
      bad: ['That covers the setup. Let me know if you have any questions!', 'Et voilà. N\'hésitez pas à me contacter pour la suite.'],
      good: ['Questions go to the #infra channel; the on-call engineer answers within a day.'],
    },
  },
  {
    id: 'prose/chat-citation',
    domain: 'prose',
    severity: 'error',
    name: 'Pasted chat citation marker',
    why: 'Citation tokens and tracking parameters that chat tools add survive copy and paste and mark the text as pasted.',
    fix: 'Remove the marker; if a source matters, cite it as a normal link.',
    views: ['codeless'],
    patterns: [
      re('【\\d+(?::\\d+)?†[^】\\n]{0,80}】'),
      re('\\[?oaicite:\\d+\\]?(?:\\{index=\\d+\\})?'),
      re(':?contentReference\\[oaicite:\\d+\\]'),
      re('\\b(?:turn\\d+(?:search|view|news|fetch|file)\\d+)\\b'),
      re('[?&]utm_source=(?:chatgpt\\.com|openai|perplexity|claude\\.ai|copilot)'),
    ],
    examples: {
      bad: [
        'Revenue grew 12% last year【4†source】.',
        'See the [docs](https://example.org/guide?utm_source=chatgpt.com).',
        'The policy changed in March :contentReference[oaicite:2]{index=2}.',
      ],
      good: ['See the [docs](https://example.org/guide?utm_source=newsletter).', 'Delete pasted markers such as `【4†source】` before you publish.'],
    },
  },
  {
    id: 'prose/placeholder',
    domain: 'prose',
    severity: 'error',
    name: 'Unfilled placeholder',
    why: 'A template slot that never got its value ships as visible filler.',
    fix: 'Fill in the real value or remove the sentence.',
    patterns: [
      { lang: 'en', re: re('\\[(?:your|insert|add|enter|company|product|client|brand|author|date|name|link|url|email|phone|address|city|title|topic)\\b[^\\]\\n]{0,40}\\]', 'gi') },
      { lang: 'fr', re: re('\\[(?:votre|vos|ton|ta|insérer|ajouter|nom|prénom|entreprise|société|produit|marque|date|lien|ville|adresse|titre)\\b[^\\]\\n]{0,40}\\]', 'giu') },
      re('\\blorem ipsum\\b', 'gi'),
    ],
    examples: {
      bad: ['Contact us at [Your Email] to get started.', 'Signé : [Votre nom]', '<p>Lorem ipsum dolor sit amet</p>'],
      good: ['- [x] Ship the release notes', 'Set [the timeout](#timeout) before you deploy.'],
    },
  },
  {
    id: 'prose/binary-contrast',
    domain: 'prose',
    severity: 'warn',
    name: 'Binary contrast ("it\'s not X, it\'s Y")',
    why: 'Knocking down a claim nobody made to set up the real one is the most recognisable AI cadence.',
    fix: 'State Y directly. "The question isn\'t the model. It\'s the eval." becomes "The eval matters more than the model."',
    patterns: [
      { lang: 'en', re: re(`${BEFORE}(?:it|this|that|they|we|you|he|she)(?:['’]s not|['’]re not| is not| are not| was not| isn['’]t| aren['’]t| wasn['’]t) (?:just |only |merely |simply |really |even |about )*[^.!?\\n;:]{1,60}?(?:[,;—–]|\\.|\\s-)\\s*(?:(?:it|this|that|they|we|you)(?:['’]s|['’]re| is| are| was)|but (?:rather |instead )?(?:a|an|the|about|to|for|it['’]s)\\b)`, 'giu') },
      { lang: 'en', re: re(`${BEFORE}(?:the )?[\\p{L}-]+ (?:isn['’]t|is not|aren['’]t|are not) (?:just |only |merely |about )*[^.!?\\n;:]{1,50}?(?:[,;—–]|\\.)\\s*(?:it|they)(?:['’]s|['’]re| is| are)\\b`, 'giu') },
      { lang: 'en', re: re(`${BEFORE}not (?:just|only|merely|simply) (?:a |an |the )?[^,.;!?\\n]{1,40}?[,;—–]\\s*(?:but|it['’]s|it is|they['’]re)\\b`, 'giu') },
      { lang: 'fr', re: re(`${BEFORE}(?:ce|cela|ça|il|elle) n['’](?:est|était) (?:pas|plus) (?:seulement |juste |simplement |uniquement |qu['’]une? )?[^.!?\\n;:]{1,60}?(?:[,;—–]|\\.)\\s*(?:c['’]est|c['’]était|mais|il s['’]agit)\\b`, 'giu') },
      { lang: 'fr', re: re(`${BEFORE}il ne s['’]agit (?:pas|plus) (?:seulement |juste |simplement |uniquement )?d[e'’u][^.!?\\n;:]{0,60}?(?:[,;—–]|\\.)\\s*(?:mais|il s['’]agit)\\b`, 'giu') },
      { lang: 'fr', re: re(`${BEFORE}plus qu['’]une? [^,.!?\\n]{1,40},\\s*(?:c['’]est )?(?:un|une)\\b`, 'giu') },
      { lang: 'fr', re: re(`${BEFORE}pas (?:seulement|uniquement|juste|simplement) [^,.!?\\n]{1,40},\\s*mais\\b`, 'giu') },
    ],
    examples: {
      bad: [
        "It's not a tool, it's a movement.",
        "This isn't about speed. It's about trust.",
        "The question isn't the model. It's the eval.",
        'It is not just a library, but a whole ecosystem.',
        "Ce n'est pas un outil, c'est une philosophie.",
        "Il ne s'agit pas de vitesse, mais de confiance.",
        "Plus qu'un logiciel, une méthode.",
      ],
      good: [
        "It's not ready for production yet; the migration runs next week.",
        "It's not common, but if you see it, re-save the series.",
        'The flag is not required.',
        "Ce n'est pas grave.",
      ],
    },
  },
  {
    id: 'prose/negative-listing',
    domain: 'prose',
    severity: 'warn',
    name: 'Negative listing ("No X. No Y. Just Z.")',
    why: 'Stacking what something is not before saying what it is reads as ad copy written by a template.',
    fix: 'Say what it is. Keep one "no" only if the reader actually expected it.',
    patterns: [
      { lang: 'en', re: re('(?:^|(?<=[.!?]\\s))(?:Not|No) [^.!?\\n]{1,40}[.!?]\\s+(?:Not|No) [^.!?\\n]{1,40}[.!?]', 'gmu') },
      { lang: 'en', re: re(`${BEFORE}no [\\p{L}-]+(?: [\\p{L}-]+)?, no [\\p{L}-]+(?: [\\p{L}-]+)?(?:,| —| -| and)? (?:just|only|simply)\\b`, 'giu') },
      { lang: 'fr', re: re("(?:^|(?<=[.!?]\\s))(?:Pas de|Pas d['’]|Sans|Zéro|Ni) [^.!?\\n]{1,35}[.!?]\\s+(?:Pas de|Pas d['’]|Sans|Zéro|Ni) [^.!?\\n]{1,35}[.!?]", 'gmu') },
      { lang: 'fr', re: re(`${BEFORE}(?:pas de|sans) [^,.!?\\n]{1,25}, (?:pas de|sans) [^,.!?\\n]{1,25}(?:,| :| —)? (?:juste|seulement|que du|rien que)\\b`, 'giu') },
    ],
    examples: {
      bad: ['No fluff. No jargon. Just results.', 'No signup, no credit card, just code.', 'Pas de blabla. Pas de jargon. Que du concret.'],
      good: ['No. The cache is rebuilt on deploy.', 'No tests were run against the staging database.'],
    },
  },
  {
    id: 'prose/throat-clearing',
    domain: 'prose',
    severity: 'warn',
    name: 'Throat-clearing opener',
    why: 'An announcement that the point is coming delays the point.',
    fix: 'Delete the opener and start with the claim.',
    patterns: [
      { lang: 'en', re: sentenceStart([
        "here's the thing", "here's the deal", "here's the truth", 'let me be clear', "let's be honest", "let's be real",
        "let's face it", 'the truth is', 'the reality is', 'make no mistake', "here's what you need to know",
        "let's dive in", "let's dive into", "let's dive deep", "let's delve", "let's break it down", "let's break this down", "let's unpack",
        'without further ado', 'buckle up', 'in this article, {we|I}', 'in this {post|guide|blog post|tutorial}, {we|you|I}',
        "in today's {fast-paced|digital|ever-changing|modern|rapidly evolving|competitive} {world|age|landscape|era|market}",
        'in an {era|age|world} {where|of|defined by}', 'imagine a world where',
      ]) },
      { lang: 'fr', re: sentenceStart([
        'soyons {clairs|honnêtes|francs|réalistes|lucides}', 'disons-le {clairement|franchement|tout net}',
        'la vérité, c\'est que', 'la réalité, c\'est que', 'voici ce qu\'il faut savoir', 'plongeons dans', 'plongeons au cœur',
        'entrons dans le vif du sujet', 'sans plus attendre', 'dans cet article, {nous|je|vous}', 'accrochez-vous',
        'attachez vos ceintures', 'à l\'ère du numérique', 'à l\'heure où', 'dans un monde en constante évolution',
        'dans un monde où', 'imaginez un monde où',
      ]) },
    ],
    examples: {
      bad: ["Here's the thing: most dashboards are never opened.", "Let's dive in.", 'In this article, we will explore caching.', "In today's fast-paced world, speed matters.", 'Soyons honnêtes : personne ne lit la doc.', "À l'ère du numérique, tout va vite."],
      good: ['The truth table below covers every input.', 'We dive into the logs only when an alert fires.'],
    },
  },
  {
    id: 'prose/faux-insight',
    domain: 'prose',
    severity: 'warn',
    name: 'Faux-insight setup',
    why: '"What nobody tells you" casts the writer as the lone expert and promises a secret the sentence rarely delivers.',
    fix: 'Cut the setup; let the claim stand on its own evidence.',
    patterns: [
      { lang: 'en', re: phrases([
        'what {nobody|no one} {tells|told} you', 'what most people {get wrong|miss|don\'t realize|don\'t know|overlook|forget}',
        'the part {everyone|most people|nobody} {misses|skips|ignores|gets wrong|forgets}', 'here\'s what {nobody|no one|most people}',
        'most people don\'t realize', '{nobody|no one} {talks|is talking} about', 'the {dirty|little-known|open|best-kept} secret',
        'the secret {nobody|no one}', 'what they don\'t tell you',
      ]) },
      { lang: 'fr', re: phrases([
        'ce que personne ne {vous |te |}dit', 'ce que {la plupart des gens|beaucoup} {ignorent|ne savent pas|oublient}',
        'le secret que personne', 'ce dont personne ne parle', 'on ne vous {le |}dit pas', 'personne n\'en parle',
        '{peu de gens|rares sont ceux qui} le savent',
      ]) },
    ],
    examples: {
      bad: ["Here's what nobody tells you about pricing.", 'The part everyone misses: distribution.', 'Ce que personne ne vous dit sur le SEO.'],
      good: ['Nobody on the team had used Rust before.'],
    },
  },
  {
    id: 'prose/rhetorical-reveal',
    domain: 'prose',
    severity: 'warn',
    name: 'Rhetorical setup and reveal',
    why: '"The result?" and "What if I told you" stage a reveal instead of stating a fact. It is the cadence of engagement bait.',
    fix: 'Write the answer as a plain sentence: "The result? Faster builds." becomes "Builds got faster."',
    patterns: [
      { lang: 'en', re: re(`${BEFORE}(?:and )?the (?:result|catch|kicker|best part|twist|answer|secret|problem|truth|bottom line|upshot|payoff|punchline|real question|difference|takeaway|verdict|outcome)\\?`, 'giu') },
      { lang: 'en', re: phrases(['what if I told you', 'think about it:', 'think about that.', 'plot twist:', 'spoiler:', 'spoiler alert:', 'why does {this|that|it} matter?', 'why? because', 'sound familiar?', "here's the kicker", "but here's the {catch|kicker|twist}", 'let that sink in']) },
      { lang: 'fr', re: re(`${BEFORE}(?:et )?(?:le|la) (?:résultat|problème|solution|secret|bonne nouvelle|mauvaise nouvelle|hic|raison|différence|clé|vérité|conclusion|réponse)${SP}?\\?`, 'giu') },
      { lang: 'fr', re: phrases(['et si je vous disais', 'spoiler :', 'spoiler:', 'ça vous parle ?', 'vous voyez le tableau', 'réfléchissez-y', 'pourquoi ? parce que']) },
    ],
    examples: {
      bad: ['We cut the bundle in half. The result? A faster app.', 'What if I told you tests can write themselves?', 'Le résultat ? Une appli plus rapide.'],
      good: ['The result is stored in `out/`.', 'What is the result of the second query?'],
    },
  },
  {
    id: 'prose/colon-reveal',
    domain: 'prose',
    severity: 'warn',
    name: 'Colon reveal',
    why: 'A noun phrase, a colon, then a lowercase reveal ("The best part: it learns.") is staged drama.',
    fix: 'Rewrite as one plain sentence; keep colons for lists, labels and quotes.',
    patterns: [
      { lang: 'en', re: re(`(?!\\s)(?:^|(?<=[.!?]\\s)|(?<=\\n\\s*))(?:[Tt]he|[Hh]ere['’]s the|[Aa]nd the|[Bb]ut the) (?:best|real|key|secret|magic|hard|crazy|wild|interesting|surprising|funny|important|tricky|scary|beautiful|kicker|catch|twist|trick)(?: (?:part|thing|bit|trick|insight|ingredient|lesson|takeaway|difference|move|news))?:\\s+[a-z]`, 'gmu') },
      { lang: 'fr', re: re(`(?!\\s)(?:^|(?<=[.!?]\\s)|(?<=\\n\\s*))(?:[Ll]e|[Ll]a|[Ee]t le|[Ee]t la|[Mm]ais le|[Mm]ais la) (?:meilleur|meilleure|vrai|vraie|seul|seule|plus beau|plus belle|plus grand|plus grande|plus gros|plus grosse) [\\p{L}]+${SP}?:\\s+[a-zà-ÿ]`, 'gmu') },
    ],
    examples: {
      bad: ['The best part: it learns from every review.', 'Le meilleur atout : il apprend tout seul.'],
      good: ['The best part of the release is the new importer.', 'Note: run the migration first.'],
    },
  },
  {
    id: 'prose/significance-inflation',
    domain: 'prose',
    severity: 'warn',
    name: 'Inflated significance',
    why: 'Calling something pivotal, a testament or a game changer asserts importance instead of showing it.',
    fix: 'State the fact and let the reader judge: "marks a pivotal moment" becomes "is the first paid product".',
    patterns: [
      { lang: 'en', re: phrases([
        '{stands|serves} as a testament', 'a testament to', 'marks a {pivotal|significant|major|key|new|turning} {moment|milestone|point|shift|step|chapter}',
        'plays a {pivotal|crucial|vital|key|significant|critical|central|major|important} role', 'pivotal moment', 'watershed moment',
        'paradigm shift', 'game{-| }changer', 'game{-| }changing', 'this changes everything', 'changes the game',
        'revolutioniz~ the way', 'redefin~ what{\'s| is} possible', 'solidif~ {its|their|his|her} {position|status|place|role}',
        'cement~ {its|their|his|her} {position|status|place|legacy}', 'leav~ a lasting {impact|legacy|impression|mark}', 'indelible mark',
        'underscor~ the {importance|significance|need}', 'highlight~ the {importance|significance}', 'a rich tapestry', 'tapestry of',
        'at the forefront of', 'in the realm of', 'the {ever-evolving|ever-changing|evolving|digital|modern} landscape', 'unlock {the|its|your|their} {full |true |}potential',
        'harness the {full |}power of', 'navigat~ the complexities', 'a new era of', 'push~ the boundaries',
        'nothing short of', 'second to none',
      ]) },
      { lang: 'fr', re: phrases([
        'joue un rôle {crucial|essentiel|clé|majeur|central|déterminant|primordial|prépondérant|fondamental}', 'témoigne de',
        'un véritable {tournant|pilier|catalyseur|levier|game changer|atout|bijou}', 'marque un tournant', 'en constante évolution',
        'dans le paysage {actuel|numérique|technologique|économique}', 'révolutionne~ {la façon|la manière}', 'change~ la donne',
        'repousse~ les limites', '{libérer|exploiter|révéler} {tout |pleinement |}{le|son|votre} potentiel', 'une nouvelle ère',
        's\'inscrit dans une démarche', 'au cœur de {votre|notre|la} {stratégie|démarche|transformation}', 'tout simplement révolutionnaire',
      ]) },
    ],
    examples: {
      bad: ['The launch marks a pivotal moment for the company.', 'Caching plays a crucial role in performance.', 'Cette fonctionnalité change la donne.', "L'IA joue un rôle essentiel dans notre stratégie."],
      good: ['The launch is the company\'s first paid product.', 'Caching cut p95 latency from 900 ms to 120 ms.'],
    },
  },
  {
    id: 'prose/superficial-analysis',
    domain: 'prose',
    severity: 'warn',
    name: 'Trailing "-ing" pseudo-analysis',
    why: 'A clause like ", highlighting the team\'s commitment" pretends to explain meaning without adding a fact.',
    fix: 'Cut the clause, or replace it with the concrete consequence ("so users can find old drafts").',
    patterns: [
      { lang: 'en', re: re(`,\\s+(?:highlighting|underscoring|showcasing|emphasizing|emphasising|reflecting|symbolizing|symbolising|signaling|signalling|cementing|solidifying|reinforcing|fostering|paving the way for|marking|demonstrating)\\s+(?:the|its|their|his|her|a|an|our|your|this)\\b`, 'giu') },
      { lang: 'fr', re: re(`,\\s+(?:soulignant|mettant en lumière|mettant en avant|mettant en exergue|illustrant|reflétant|témoignant|symbolisant|renforçant|consolidant|incarnant)\\s+(?:ainsi\\s+)?(?:l['’]|la|le|les|son|sa|ses|leur|leurs|un|une|notre|votre)`, 'giu') },
    ],
    examples: {
      bad: ["The launch adds file search, highlighting the team's commitment to better workflows.", "L'équipe a livré la V2, soulignant ainsi son engagement envers les clients."],
      good: ['The parser reads the file, ignoring comments.', 'Run the linter, then the tests.'],
    },
  },
  {
    id: 'prose/weasel-attribution',
    domain: 'prose',
    severity: 'warn',
    name: 'Unsourced attribution',
    why: '"Experts agree" and "studies show" borrow authority without naming it. The reader cannot check the claim.',
    fix: 'Name the source and link it, or drop the claim. Never invent a source.',
    patterns: [
      { lang: 'en', when: notCited, re: phrases([
        'experts {say|agree|believe|suggest|warn|note|argue|recommend}', 'studies {show|suggest|have shown|indicate|prove}',
        'research {shows|suggests|has shown|indicates|proves}', 'many {experts|people|believe|argue|say}',
        'it is widely {believed|accepted|regarded|known|recognized|recognised}', '{is|are} widely regarded as',
        'some {say|argue|believe}', 'critics {say|argue}', 'observers {note|say}', 'industry {reports|experts|insiders|leaders} {suggest|say|agree|note}',
        'according to {experts|studies|research|many}', 'data shows', 'science says',
      ]) },
      { lang: 'fr', when: notCited, re: phrases([
        'les experts {s\'accordent|estiment|affirment|disent|recommandent}', '{des|les|de nombreuses} études {montrent|ont montré|suggèrent|indiquent|prouvent}',
        'selon {les experts|de nombreuses études|certaines études|les spécialistes}', 'il est {largement|généralement|communément} {admis|reconnu|accepté}',
        'beaucoup {pensent|estiment|affirment}', 'de nombreux experts', 'la science le prouve',
      ]) },
    ],
    examples: {
      bad: ['Studies show that remote teams ship faster.', 'Les experts s\'accordent à dire que le SEO est mort.'],
      good: ['Studies show the effect only in teams over 50 people ([Forsgren et al., 2018](https://example.org/accelerate)).'],
    },
  },
  {
    id: 'prose/ai-vocabulary',
    domain: 'prose',
    severity: 'info',
    name: 'AI-favored word',
    why: 'Words like delve, tapestry, seamless or leverage are far more frequent in model output than in human writing. One is nothing; a cluster is a tell.',
    fix: 'Use the plain word (use, help, strong, smooth) or a concrete fact.',
    patterns: [
      { lang: 'en', re: EN_VOCAB_RE, when: (m, ctx) => !/test harness|harness file/i.test(ctx.raw.slice(Math.max(0, m.index - 6), m.index + 20)) },
      { lang: 'fr', re: FR_VOCAB_RE },
    ],
    examples: {
      bad: ["Let's delve into the details.", 'A seamless experience for everyone.', 'Un véritable atout pour votre équipe.'],
      good: ['The handler retries twice, then fails.'],
    },
  },
  {
    id: 'prose/ai-vocabulary-cluster',
    domain: 'prose',
    severity: 'warn',
    name: 'Cluster of AI-favored words',
    why: 'Several different AI-favored words in a short span is one of the strongest signals that text was generated and not edited.',
    fix: 'Rewrite the passage in plain words; keep the facts.',
    options: { minDistinct: 4, perThousand: 8, shortText: 200, shortMinDistinct: 3 },
    check(ctx, opt) {
      const hits = [];
      for (const v of ['prose', 'comments', 'ui']) {
        const text = ctx.views[v];
        if (!text) continue;
        for (const r of [EN_VOCAB_RE, FR_VOCAB_RE]) for (const m of matchAll(r, text)) hits.push({ index: m.index, word: m[0].toLowerCase() });
      }
      if (!hits.length) return [];
      const lemma = (w) => w.replace(/(?:ing|ed|es|s|d)$/, '');
      const distinct = [...new Map(hits.map((h) => [lemma(h.word), h.word])).values()];
      const density = (hits.length / Math.max(ctx.words, 1)) * 1000;
      const short = ctx.words <= opt.shortText && distinct.length >= opt.shortMinDistinct;
      if (!short && !(distinct.length >= opt.minDistinct && density >= opt.perThousand)) return [];
      hits.sort((a, b) => a.index - b.index);
      return [{ index: hits[0].index, match: distinct.slice(0, 6).join(', '), message: `${distinct.length} different AI-favored words (${distinct.slice(0, 6).join(', ')}) in ${ctx.words} words` }];
    },
    examples: {
      bad: ['Our robust platform seamlessly empowers teams to leverage cutting-edge insights.'],
      good: ['Our platform syncs your calendar every five minutes and flags double bookings.'],
    },
  },
  {
    id: 'prose/filler-phrase',
    domain: 'prose',
    severity: 'info',
    name: 'Filler phrase',
    why: 'Phrases like "it\'s worth noting that" delay the point and pad the rhythm.',
    fix: 'Delete the phrase; the sentence usually works without it.',
    patterns: [
      { lang: 'en', re: phrases([
        "it's worth noting", 'it is worth noting', "it's important to {note|remember|understand}", 'it is important to {note|remember|understand}',
        'it should be noted', 'needless to say', 'at the end of the day', 'when it comes to', 'at its core', 'first and foremost',
        'last but not least', 'a wide {range|variety|array} of', 'in the world of', 'all in all', 'that being said', 'with that said',
        'having said that', 'in essence', 'it goes without saying',
      ]) },
      { lang: 'fr', re: phrases([
        'il est important de {noter|souligner|rappeler|comprendre}', 'il convient de {noter|souligner|rappeler}', 'il est à noter que',
        'force est de constater', 'en ce qui concerne', 'en termes de', 'au final', 'en fin de compte', 'il va sans dire',
        'tout d\'abord et avant tout', 'last but not least', 'à cet égard',
      ]) },
    ],
    examples: {
      bad: ["It's worth noting that the API is rate limited.", 'Il est important de noter que le cache expire.'],
      good: ['The API allows 100 requests per minute.'],
    },
  },
  {
    id: 'prose/summary-ending',
    domain: 'prose',
    severity: 'warn',
    name: 'Recap ending',
    why: '"In conclusion" and a closing paragraph that restates the piece repeat what the reader just read.',
    fix: 'End on the last concrete point, decision or next step.',
    patterns: [
      { lang: 'en', re: re('(?:^|\\n)[ \\t>]*(?:#{1,6}\\s*)?(?:In conclusion|In summary|To summarize|To sum up|In closing|To conclude|In a nutshell)\\b', 'giu') },
      { lang: 'fr', re: re('(?:^|\\n)[ \\t>]*(?:#{1,6}\\s*)?(?:En conclusion|En résumé|Pour conclure|En somme|En définitive|Pour résumer|En bref|Pour faire court)\\b', 'giu') },
    ],
    examples: {
      bad: ['We moved the queue to Redis.\n\nIn conclusion, the new setup is faster and simpler.', 'Le cache est réparé.\n\nEn conclusion, tout fonctionne mieux.'],
      good: ['The conclusion of the audit is in `audit.md`.'],
    },
  },
  {
    id: 'prose/hedge-stack',
    domain: 'prose',
    severity: 'warn',
    name: 'Stacked hedges',
    why: 'Two hedges on one claim ("could potentially") say the writer is not committing to anything.',
    fix: 'Keep one hedge if the uncertainty is real, or state the claim.',
    patterns: [
      { lang: 'en', re: phrases(['{may|might|could|can} potentially', '{may|might|could} possibly', 'it could be argued that', 'it may be the case that', 'might perhaps', 'could perhaps']) },
      { lang: 'fr', re: phrases(['{pourrait|pourraient|peut|peuvent} potentiellement', '{pourrait|pourraient} éventuellement', 'il se pourrait éventuellement']) },
    ],
    examples: {
      bad: ['This change could potentially break older clients.', 'Cette option pourrait potentiellement ralentir le site.'],
      good: ['This change breaks clients older than 2.3.'],
    },
  },
  {
    id: 'prose/false-range',
    domain: 'prose',
    severity: 'warn',
    name: 'False range ("whether you\'re a X or a Y")',
    why: 'Addressing every possible reader at once addresses none of them.',
    fix: 'Name the reader this is for, or cut the sentence.',
    patterns: [
      { lang: 'en', re: re(`${BEFORE}whether you(?:['’]re| are) (?:a |an |just )?[^,.!?\\n]{1,40} or (?:a |an )?[^,.!?\\n]{1,40}`, 'giu') },
      { lang: 'en', re: phrases(['and everything in between', 'from beginners to {experts|pros|professionals}', 'from startups to {enterprises|Fortune 500}']) },
      { lang: 'fr', re: re(`${BEFORE}que vous soyez (?:un |une )?[^,.!?\\n]{1,40} ou (?:un |une )?[^,.!?\\n]{1,40}`, 'giu') },
      { lang: 'fr', re: phrases(['et tout ce qui se trouve entre les deux', 'des débutants aux experts', 'de la startup {au grand groupe|à la multinationale|au grand compte}']) },
    ],
    examples: {
      bad: ["Whether you're a solo founder or a Fortune 500 team, we've got you covered.", 'Que vous soyez freelance ou grand groupe, cet outil est fait pour vous.'],
      good: ['Whether the job retries depends on the exit code.'],
    },
  },
  {
    id: 'prose/mic-drop',
    domain: 'prose',
    severity: 'warn',
    name: 'Mic-drop line',
    why: '"That\'s it. That\'s the whole trick." and "Let that sink in" perform profundity instead of making a point.',
    fix: 'Delete the line and end on the clearest concrete sentence already there.',
    patterns: [
      { lang: 'en', re: re(`${BEFORE}that['’]s it\\.\\s+that['’]s (?:the|all)\\b`, 'giu') },
      { lang: 'en', re: re('(?<=[.!?]\\s)(?:Period|Full stop)\\.(?=\\s|$)', 'gu') },
      { lang: 'en', re: phrases(['read that again', "I'll say it again", 'let that sink in', "and that's the whole point", "and that's okay."]) },
      { lang: 'fr', re: re('(?<=[.!?]\\s)(?:Point final|Point barre)\\.(?=\\s|$)', 'gu') },
      { lang: 'fr', re: phrases(['relisez cette phrase', "c'est tout. c'est", 'je le répète']) },
    ],
    examples: {
      bad: ["Ship small. That's it. That's the whole strategy.", 'Tests matter. Period.', 'Le code est une dette. Point final.'],
      good: ["That's it for setup; the next section covers deploys.", 'The billing period ends on the 30th.'],
    },
  },
  {
    id: 'prose/em-dash-density',
    domain: 'prose',
    severity: 'warn',
    name: 'Em dash saturation',
    why: 'Humans use em dashes, but models use them as a rhythm crutch. Many of them in little text is a strong tell.',
    fix: 'Replace most with commas, colons, parentheses or two sentences. One or two in a long piece is fine.',
    options: { min: 3, perThousand: 5, shortText: 150, shortMin: 2 },
    check(ctx, opt) {
      let count = 0;
      let first = -1;
      // Code comments are left out: engineers use dashes there freely, and the signal is weak.
      for (const v of ['prose', 'ui']) {
        const text = ctx.views[v];
        if (!text) continue;
        for (const m of matchAll(/—|(?<=\S) – (?=\S)/g, text)) {
          // Dialogue and list dashes open a line; those are punctuation, not cadence.
          const lineStart = text.lastIndexOf('\n', m.index) + 1;
          if (text.slice(lineStart, m.index).trim() === '') continue;
          count++;
          if (first < 0 || m.index < first) first = m.index;
        }
      }
      const density = (count / Math.max(ctx.words, 1)) * 1000;
      const short = ctx.words <= opt.shortText && count >= opt.shortMin;
      if (!short && !(count >= opt.min && density >= opt.perThousand)) return [];
      return [{ index: first, match: '—', message: `${count} em dashes in ${ctx.words} words (${density.toFixed(1)} per 1,000)` }];
    },
    examples: {
      bad: ['Fast — secure — and built for teams. It ships today — and it is free.'],
      good: ['The build takes four minutes. Most of that is the type check, which we cache.', '— Bonjour, dit-elle.\n— Bonjour.'],
    },
  },
  {
    id: 'prose/emoji-decoration',
    domain: 'prose',
    severity: 'warn',
    name: 'Emoji as decoration',
    why: 'Emoji in headings and emoji bullet lists are the default formatting of generated posts and READMEs.',
    fix: 'Remove them; let headings and list items carry their own words.',
    check(ctx) {
      const text = ctx.views.prose;
      if (!text || ctx.info.kind !== 'markdown') return [];
      const out = [];
      for (const m of matchAll(/^#{1,6}[ \t][^\n]*?(?![©®™])\p{Extended_Pictographic}/gmu, text)) out.push({ index: m.index, match: m[0].trim(), message: 'emoji in a heading' });
      const bullets = [...matchAll(/^[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+)?(?![©®™#*\d])\p{Extended_Pictographic}/gmu, text)];
      if (bullets.length >= 3) for (const m of bullets) out.push({ index: m.index, match: m[0].trim(), message: `emoji bullet (${bullets.length} lines start with an emoji)` });
      return out;
    },
    examples: {
      bad: ['## 🚀 Getting started\n\nInstall it.', '- ✅ Fast\n- ✅ Secure\n- ✅ Simple'],
      good: ['## Getting started\n\nInstall it with npm.', 'Copyright © 2026 Example'],
    },
  },
  {
    id: 'prose/bold-overuse',
    domain: 'prose',
    severity: 'info',
    name: 'Bold everywhere',
    why: 'Bold sprinkled through sentences, or a list of "**Label:** text" items, is generated-document formatting. When everything is emphasised, nothing is.',
    fix: 'Keep bold for the one thing a skimming reader must not miss; turn label lists into prose or a table.',
    check(ctx) {
      const text = ctx.views.prose;
      if (!text || ctx.info.kind !== 'markdown') return [];
      const out = [];
      let offset = 0;
      for (const para of text.split(/\n[ \t]*\n/)) {
        const bolds = [...para.matchAll(/\*\*[^*\n]{1,60}\*\*/g)];
        const words = (para.match(/[\p{L}\p{N}]+/gu) || []).length;
        const labelLines = para.split('\n').filter((l) => /^\s*(?:[-*+]|\d+\.)\s+\*\*[^*]{1,40}(?::\*\*|\*\*:)/.test(l)).length;
        if ((bolds.length >= 4 && bolds.length / Math.max(words, 1) >= 1 / 20) || labelLines >= 5) {
          out.push({ index: offset + (bolds[0]?.index ?? 0), match: bolds[0]?.[0] || '**', message: labelLines >= 5 ? `${labelLines} list items open with a bold label` : `${bolds.length} bold spans in ${words} words` });
        }
        offset += para.length + 2;
      }
      return out;
    },
    examples: {
      bad: ['- **Speed:** fast\n- **Security:** strong\n- **Scale:** big\n- **Support:** 24/7\n- **Price:** low'],
      good: ['Run **one** migration at a time.'],
    },
  },
];
