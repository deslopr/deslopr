<!-- deslopr-disable-file -- this catalog quotes slop patterns as examples -->
# Writing

Applies to docs, READMEs, posts, emails, release notes, commit messages, PR descriptions, code comments written as prose, and every string a user reads in an interface.

Each pattern lists its detector rule when there is one. Patterns marked **judgment** have no reliable detector: you find them by reading.

## Principles

1. **Know the job.** Before word choice, know who reads this and what they should think, feel or do afterwards. If you cannot tell, ask one question: "Who is this for and where will it appear?"
2. **Lead with the point** when the setup adds nothing. Keep a personal setup when it gives context, tension or character.
3. **Concrete beats abstract.** Names, numbers, dates, mechanisms, examples. "Improved efficiency" becomes "cut deploy time from 40 minutes to 4."
4. **The portability test.** If a sentence could move unchanged into another company's page, another person's post or another product's docs, it is filler. Cut it or make it specific to this subject.
5. **Show, then trust the reader.** Let facts carry the emphasis. Delete commentary that labels a point important, surprising or obvious.
6. **People do things.** Active voice with human subjects: "The team shipped it on Tuesday", not "The decision emerged". Inanimate things do not "empower", "unlock" or "embrace".
7. **Repeat the right word.** If "agent" is the right word, use it again. Rotating agent, assistant, tool and system for variety makes the reader wonder if there are four things.
8. **Verbs do the work.** "Made a decision" becomes "decided"; "has the ability to" becomes "can"; "serves as" becomes "is".
9. **Never invent.** Not a statistic, a quote, a source, a customer or a date. Ask, or leave `[source needed]`.

## When editing someone else's text

- First notice their voice: vocabulary, sentence length, bluntness, humor, profanity, hedges, digressions, level of polish. Keep what is theirs.
- Make the minimum effective edit. A rough draft with a real voice should still sound like the same person.
- Keep "I think", "maybe", "honestly" when they carry real uncertainty or spoken rhythm. Cut them when they are padding.
- Keep the structure unless it hurts the piece. If you reorganise, say why in What changed.
- Never add claims, examples, numbers or opinions the writer did not give you.

## Catalog

### A. Chat residue: always fix

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Assistant chatter | `prose/chatbot-artifact` | "I hope this helps", "Certainly! Here is", "As of my last update", "Here's the revised version", "Would you like me to..." | Delete. |
| Sign-off offer | `prose/chatbot-closer` | "Let me know if you have any questions", "Feel free to reach out", "Happy coding!" | End on the last useful sentence, or give a specific next step. |
| Pasted citations | `prose/chat-citation` | `【4†source】`, `[oaicite:2]`, `?utm_source=chatgpt.com` | Remove; cite real sources as links. |
| Unfilled slot | `prose/placeholder` | "[Your Name]", "[Insert link]", "Lorem ipsum" | Fill it or remove the sentence. |
| Invisible characters | `repo/invisible-unicode` | zero-width spaces from a chat window | Delete. |

### B. Cadence: the rhythm of generated text

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Binary contrast | `prose/binary-contrast` | "It's not X, it's Y." "This isn't about speed. It's about trust." "Not just a tool, but a partner." | State Y. "The eval matters more than the model." |
| Negative listing | `prose/negative-listing` | "No fluff. No jargon. Just results." | Say what it is. |
| Rhetorical reveal | `prose/rhetorical-reveal` | "The result? A faster app." "What if I told you..." "Why does this matter?" | Plain statement: "The app got faster." |
| Colon reveal | `prose/colon-reveal` | "The best part: it learns." | One sentence: "It learns from every review, which is the best part." Keep colons for lists, labels and quotes. |
| Mic-drop line | `prose/mic-drop` | "That's it. That's the whole trick." "Let that sink in." "Period." | Delete; end on the clearest concrete sentence. |
| Fake-profound ending | judgment | A final aphorism or metaphor: "The future isn't coming. It's already here." | Delete it. Do not rewrite it into a better metaphor. |
| Staccato drama | judgment | "Fast. Simple. Yours." Stacked fragments for punch. | Complete sentences, unless fragments are the writer's real voice. |
| Rule of three | judgment | Every list has three items; every claim three adjectives. | Use the number of items you actually have. |
| Robotic symmetry | judgment | Every paragraph the same shape and length; every section opens with a one-line summary. | Vary the shape only where it helps the point. |

### C. Inflation: importance asserted instead of shown

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Inflated significance | `prose/significance-inflation` | "marks a pivotal moment", "plays a crucial role", "a testament to", "game changer", "in today's fast-paced world" | State the fact; let the reader judge. |
| "-ing" pseudo-analysis | `prose/superficial-analysis` | ", highlighting the team's commitment to innovation" | Cut, or give the concrete consequence. |
| Unsourced authority | `prose/weasel-attribution` | "Studies show", "Experts agree", "Many believe" | Name and link the source, or drop the claim. |
| Addressing everyone | `prose/false-range` | "Whether you're a solo founder or a Fortune 500 team" | Name the reader this is for. |
| AI-favored words | `prose/ai-vocabulary`, `prose/ai-vocabulary-cluster` | delve, tapestry, testament, realm, seamless, robust, leverage, foster, pivotal, multifaceted, empower, streamline | The plain word, or a fact. One is fine; a cluster is a tell. |
| Unearned numbers | `ui/unsourced-stat` | "10K+ users", "99.9% uptime", "3x faster" | A sourced number or nothing. |

### D. Padding: words that delay the point

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Throat-clearing | `prose/throat-clearing` | "Here's the thing", "Let's dive in", "In this article, we will explore" | Start with the claim. |
| Faux insight | `prose/faux-insight` | "What nobody tells you", "The part everyone misses" | Cut the setup; let the claim stand. |
| Filler phrase | `prose/filler-phrase` | "It's worth noting that", "When it comes to", "At the end of the day" | Delete the phrase. |
| Stacked hedges | `prose/hedge-stack` | "could potentially", "may possibly" | One hedge if the doubt is real, otherwise the claim. |
| Recap ending | `prose/summary-ending` | "In conclusion", or a final paragraph restating the piece | End on the last point, decision or next step. |
| Metadiscourse | judgment | "The key point is", "As you can see", "This distinction matters", "In other words" | Delete the aside; if the point is unclear, fix the point. |
| Signposting | judgment | "Let's take a look at", "Now we'll cover" | Just cover it. |
| Fake candor | judgment | "I'll be honest", "To be clear", "Truth be told" (when nothing candid follows) | Delete. |

### E. Formatting

| Pattern | Rule | Tell | Fix |
|---|---|---|---|
| Em dash saturation | `prose/em-dash-density` | Dashes as the default rhythm | Commas, colons, parentheses or two sentences. One or two in a long piece is fine; none in short copy. |
| Emoji as decoration | `prose/emoji-decoration` | 🚀 in headings, ✅ bullet lists | Remove. |
| Bold everywhere | `prose/bold-overuse` | Bold mid-sentence, "**Label:** text" list items | Bold only what a skimmer must not miss; labels become prose or a table. |
| Headers over tiny sections | judgment | A heading over two sentences | Merge into the surrounding text. |
| Bullets that should be prose | judgment | A reasoning chain chopped into fragments | Write the paragraph. |
| Title Case Everywhere | judgment | Every heading in Title Case in a sentence-case document | Follow the document's convention. |

## What is not slop

- A writer's idiosyncrasies: odd word choices, run-on spoken sentences, swearing, jokes, digressions, self-interruptions.
- Real uncertainty ("I think", "probably") and real admissions.
- A rhetorical question the writer means, a single dash, a single bold warning.
- Quotes, citations, legal and regulatory text, examples of slop like the ones in this file.
- Technical vocabulary that happens to be on a list: "robust statistics", "test harness", "leverage ratio".

## French notes (français)

Les mêmes familles existent en français, avec leurs formes propres. Le détecteur couvre les variantes françaises de chaque règle.

| Famille | Exemples | Correction |
|---|---|---|
| Contraste binaire | « Ce n'est pas un outil, c'est une philosophie. » « Il ne s'agit pas de vitesse, mais de confiance. » « Plus qu'un logiciel, une méthode. » | Dire ce que c'est. |
| Raclement de gorge | « Soyons honnêtes », « Plongeons dans le vif du sujet », « Dans cet article, nous allons voir » | Commencer par l'idée. |
| Inflation | « joue un rôle essentiel », « change la donne », « dans un monde en constante évolution », « à l'ère du numérique » | Le fait, sans adjectif. |
| Remplissage | « Il est important de noter que », « force est de constater », « en termes de » | Supprimer. |
| Fin récapitulative | « En conclusion », « En somme », « En définitive » | Finir sur le dernier point concret. |
| Formule de chatbot | « J'espère que cela vous aide », « N'hésitez pas à me contacter », « Voici une version améliorée » | Supprimer. |
| Vocabulaire | « véritable atout », « incontournable », « booster », « sublimer », « pierre angulaire », « synergie » | Le mot simple, ou un fait. |

Typographie : le français utilise espace insécable avant `; : ! ?` et les guillemets « ». Le tiret cadratin sert au dialogue en début de ligne, ce que le détecteur ignore. Dans le corps du texte, une rafale de tirets « — » est le même tic qu'en anglais.

## Edit checklist

Answer each with pass or fail before returning an edit. Fix any fail first.

1. The point, claims and facts are the writer's; nothing was added.
2. The writer would recognise the voice as their own.
3. Strong human sentences were left alone; cutting is proportional to the actual slop.
4. Every sentence passes the portability test, or was made specific.
5. No pattern from sections A to E remains, unless it has a purpose you can state.
6. The ending is the last concrete point, not a recap or a kicker.
7. Formatting follows the content: no decorative bold, emoji or headers.
8. The output contains the full edited text and a short **What changed** list.
