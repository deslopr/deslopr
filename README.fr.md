# deslopr

Repérer et supprimer le « slop » d'IA dans les textes, le code et les interfaces, et l'empêcher de revenir dans ce que produisent vos agents.

[English](README.md) | Français

```bash
npx deslopr            # analyser ce dossier
npx deslopr --diff     # seulement ce que votre branche ajoute
npx deslopr fix        # voir les corrections sûres sous forme de diff ; --write les applique
npx deslopr init       # apprendre les règles à votre agent de code
```

## À coller dans votre IA

Collez ce texte dans Claude Code, Codex, Cursor, Copilot ou tout agent qui peut lancer des commandes dans votre projet. Il installe deslopr, analyse le dépôt et vous demande votre accord avant de modifier quoi que ce soit.

```text
Installe deslopr (https://github.com/deslopr/deslopr) dans ce dépôt et fais une première passe de nettoyage.

1. Lance `npx -y deslopr init`, puis lis le skill installé (SKILL.md) et suis-le à partir de maintenant.
2. Lance `npx -y deslopr` et résume les résultats par règle, du plus grave au moins grave. Ne modifie rien pour l'instant.
3. Lance `npx -y deslopr fix` et montre-moi le diff des corrections automatiques sûres. Ne les applique avec `npx -y deslopr fix --write` qu'après mon accord.
4. Pour le reste, propose des corrections par petits lots (un type de problème par commit, tests au vert après chacun) et attends mon feu vert pour chaque lot.
5. Certains éléments signalés sont voulus. Avant de toucher à quelque chose qui pourrait l'être (un dégradé de la marque, une citation, un try/catch défensif), demande-moi. Pour le garder, ajoute `deslopr-disable-next-line <règle> -- <raison>` au-dessus, ou ajoute le terme à "allow" dans .deslopr.json.
```

deslopr réunit trois briques :

1. **Un détecteur.** Une CLI sans dépendance, 66 règles : prose (anglais et français), code, interface, hygiène du dépôt. Elle lit le markdown, les commentaires, le texte JSX, le HTML, le CSS et les classes Tailwind. Elle tourne en CI, en pre-commit, dans votre agent après chaque modification, ou dans un onglet de navigateur. `deslopr fix` corrige les cas qui ne demandent aucun jugement et montre d'abord le diff.
2. **Un skill pour agents.** `skills/deslopr/` suit le format [Agent Skills](https://agentskills.io). Il apprend à Claude Code, Codex, Cursor, Copilot, Gemini, Windsurf, Cline et à tout agent qui lit `AGENTS.md` à reconnaître le slop, à écrire autre chose à la place, et à nettoyer sans rien casser.
3. **Une porte de sortie.** Une courte liste de vérifications que l'agent passe avant de dire « terminé », avec une preuve pour chaque ligne.

## Principes

- **La précision avant le rappel.** Une règle qui se trompe une fois sur deux apprend aux gens à ignorer l'outil. Chaque règle arrive avec un vrai exemple qu'elle doit attraper et un faux ami qu'elle doit laisser passer ; les deux sont des tests.
- **Des preuves, pas des procès d'intention.** deslopr ne dit jamais « une IA a écrit ça ». Il nomme un motif, cite la ligne et propose la correction. Les humains aussi écrivent du slop.
- **L'intention prime sur le motif.** Un dégradé, un `try` défensif, une question rhétorique peuvent être justes. Un seul signal ne veut pas dire grand-chose ; plusieurs motifs différents au même endroit, si. L'indice de slop pondère ces grappes.
- **Ne jamais inventer.** Le skill interdit les chiffres, citations, témoignages, sources et certifications inventés, et le détecteur signale les suspects habituels.

## Ce qu'il détecte

| Domaine | Exemples | Règles |
|---|---|---|
| Écriture | `Ce n'est pas un outil, c'est une philosophie`, `Soyons honnêtes`, `Le résultat ?`, `Pas de blabla. Pas de jargon. Que du concret.`, `joue un rôle essentiel`, `Les experts s'accordent` sans source, rafales de tirets cadratins, emoji dans les titres, `J'espère que cela vous aide`, `[Votre nom]` | 23, en anglais et en français |
| Code | `// ... rest of the code`, `// Added error handling`, commentaires qui répètent la ligne suivante, `"""Get the user."""`, `except Exception: pass`, `parse` à côté de `parse_v2`, tests sans assertion | 16 |
| Interfaces | dégradés violet-bleu, texte en dégradé, halos, orbes floutés, étiquette au-dessus du H1, `Trusted by 10,000+ teams`, `SOC 2 compliant`, avatars `i.pravatar.cc`, `href="#"`, images sans `alt`, focus supprimé | 21 |
| Dépôt | secrets committés, marqueurs de conflit, chemins `/Users/vous/...`, caractères invisibles, `IMPLEMENTATION_SUMMARY.md`, `utils_v2.py` | 6 |

Le catalogue complet, avec exemples : [docs/RULES.md](docs/RULES.md), ou `npx deslopr rules` et `npx deslopr explain <règle>`.

Gravité : `error` est presque toujours un vrai défaut, `warn` l'est souvent (lisez la ligne), `info` ne compte que dans une grappe ; il s'affiche quand un fichier contient au moins trois motifs différents, ou avec `--verbose`.

## Installation

**Dans votre agent :** `npx deslopr init` détecte les agents du projet et installe le skill ainsi qu'une règle toujours active pour chacun. Choisissez-les avec `--agents claude,codex,cursor,copilot,gemini,windsurf,cline` (ou `all`), prévisualisez avec `--dry-run`, annulez avec `--uninstall`. L'installeur écrit dans des blocs balisés et ne touche jamais au reste de votre `AGENTS.md` ou `CLAUDE.md`. Ajoutez `--hook` pour que Claude Code vérifie chaque modification.

**Plugin Claude Code :**

```text
/plugin marketplace add deslopr/deslopr
/plugin install deslopr@deslopr
```

Après chaque `Write` ou `Edit`, le détecteur vérifie les lignes que l'agent vient d'écrire et lui renvoie ce qu'il trouve ; avant de s'arrêter, l'agent vérifie une fois l'ensemble des modifications non committées.

**Dans un chat :** collez [dist/deslopr.md](dist/deslopr.md) (le skill complet en un fichier) dans les instructions d'un projet, ou [dist/deslopr-compact.md](dist/deslopr-compact.md) (moins de 1 500 caractères) dans un champ d'instructions personnalisées.

**En CI :** l'action GitHub `deslopr/deslopr@v0` ne vérifie que les lignes ajoutées par la PR et les affiche en annotations. Voir le [README anglais](README.md#in-ci) pour l'exemple complet, ainsi que les sorties SARIF et markdown.

**En pre-commit :** `npx deslopr --staged`, ou le hook `deslopr` pour le framework pre-commit.

**Dans le navigateur :** ouvrez [playground/index.html](playground/index.html), collez un texte ou du code, chaque motif est surligné. Rien ne quitte la page.

## Corrections sûres

`npx deslopr fix` affiche les corrections sous forme de diff sans rien écrire ; `--write` les applique, `--diff` se limite aux lignes ajoutées par votre branche, `--rule <id>` à un seul type de correction. Elle ne corrige que ce qui ne demande aucun jugement : marqueurs de citation collés (`【4†source】`, `utm_source=chatgpt.com`), phrases de chatbot isolées (`J'espère que cela vous aide !`), lignes `debugger` et `breakpoint()`, caractères invisibles collés à un espace.

- **Aperçu d'abord.** Sans `--write`, rien n'est écrit.
- **Seulement ce que git peut annuler.** `--write` refuse les fichiers non suivis ou modifiés sans être indexés : `git diff` montre exactement les corrections, `git restore` les annule. `--allow-dirty` lève ce garde-fou.
- **Seulement ce qui a été signalé.** Les exceptions, `allow`, les règles désactivées et `--diff` valent aussi pour les corrections.
- **Jamais un problème contre un autre.** Chaque fichier corrigé est réanalysé ; si une règle y trouve plus qu'avant, le fichier reste intact.
- **Le code continue de marcher.** Une ligne `debugger` reste en place quand la retirer pourrait changer le programme, et les chaînes utilisées par le programme ne sont jamais modifiées.

## Configuration

`.deslopr.json` à la racine du projet :

```json
{
  "ignore": ["vendor/**"],
  "rules": { "prose/em-dash-density": "off", "ui/overused-font": { "allow": ["Inter"] } },
  "allow": ["Acme Corp"],
  "languages": ["fr"],
  "failOn": "error"
}
```

### Garder ce qui compte

Un signalement est une question, pas un verdict. Quand le dégradé est celui de la marque, que la phrase est une citation ou que le `catch` large protège une frontière de confiance, gardez-le et dites-le une fois à deslopr : ni l'analyse ni `deslopr fix` n'y toucheront plus.

| Pour garder | Utilisez |
|---|---|
| Une ligne | `deslopr-disable-next-line <règle> -- <raison>` au-dessus, ou `deslopr-disable-line` sur la ligne |
| Un bloc | `deslopr-disable <règle>` ... `deslopr-enable <règle>` |
| Un fichier entier | `deslopr-disable-file <règle> -- <raison>` |
| Un mot ou un nom partout | `"allow": ["Acme Corp"]` dans `.deslopr.json` |
| Une règle qui ne vous convient pas | `"rules": { "prose/em-dash-density": "off" }`, ou une gravité plus basse |
| Des dossiers générés ou importés | `"ignore": ["vendor/**"]` |

Pour garder une ligne signalée, dites pourquoi juste au-dessus :

```md
<!-- deslopr-disable-next-line prose/binary-contrast -- citation exacte du client -->
```

## Contribuer

Les nouveaux motifs sont bienvenus, avec la même exigence que les existants : un vrai exemple d'abord, puis la règle, et un faux ami qui doit rester silencieux. Tout est expliqué dans [CONTRIBUTING.md](CONTRIBUTING.md). Les motifs en allemand, espagnol et portugais sont les plus attendus.

## Licence

[MIT](LICENSE)
