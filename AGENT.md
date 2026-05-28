# AGENT.md — netbox-topo-vision
Repo: github.com/Brice97426/netbox-topo-vision | Licence: MIT | v0.1.0

---

## PROJET
Plugin visualisation topologie réseau pour NetBox Labs.
Frontend pur HTML/CSS/JS vanilla → NGINX Docker → NetBox API REST v4.
**Zéro dépendance npm. Zéro bundler. Zéro framework.**

```
Navigateur ←──API REST (token bearer)──► NetBox (Docker)
    ▲
    └── servi par NGINX (Docker)
```

---

## STRUCTURE
```
netbox-topo-vision/
├── .github/workflows/docker-publish.yml
├── .github/ISSUE_TEMPLATE/{bug_report,feature_request}.md
├── docs/configuration.md + screenshots/
├── nginx/default.conf
├── .env.example / .gitignore / LICENSE / README.md
├── docker-compose.yml + docker-compose.dev.yml
├── favicon.ico
├── AGENT.md          ← CE FICHIER
└── index.html        ← APPLICATION PRINCIPALE (tout est ici)
```

---

## STACK
| Couche | Techno |
|--------|--------|
| Frontend | HTML5, CSS3, JS vanilla |
| Rendu | SVG natif (pas D3, pas Canvas) |
| Serveur | NGINX `nginx:alpine` |
| Orchestration | Docker Compose |
| API | NetBox REST v4 |
| Polices | JetBrains Mono + DM Sans (Google CDN uniquement) |

---

## CONVENTIONS

**CSS** : variables dans `:root` (`--` prefix) · BEM léger · pas Tailwind/SCSS
**JS** : ES6+ · camelCase fonctions · UPPER_SNAKE_CASE constantes · async/await (jamais .then()) · sections `// ══════ TITRE ══════`
**HTML** : indent 2 espaces · `data-*` pour hooks JS · IDs préfixés par contexte (`filter-role`, `btn-load`)

---

## API NETBOX (endpoints actifs)
```
GET /api/dcim/devices/      → équipements
GET /api/dcim/cables/       → câbles
GET /api/dcim/sites/        → sites
GET /api/dcim/site-groups/  → groupes de sites
```
Pagination : suivre `next` jusqu'à `null`.
Auth : `Authorization: Token <TOKEN>`

Endpoints à venir : `/api/dcim/interfaces/` · `/api/ipam/ip-addresses/`

---

## FONCTIONNALITÉS

**Existantes ✅**
Topologie SVG 3 colonnes · layers par slugs · filtres rôle/site/groupe/statut · sidebar détails · export PNG×2 + XML draw.io · zones colorées · agrégation câbles

**Roadmap 🚧**
Zones drag&drop · slugs configurables UI · filtres sauvegardés · toggle agrégation · localStorage · export JSON config

---

## CONFIG `.env`
```env
NETBOX_URL=http://192.168.1.28:8000
NETBOX_TOKEN=nbt_xNclE6x4hBcE.GKGsGjIaJ9j0N4egLHNE7pIhT3pIBxKNOH6p9yYV
APP_PORT=8090
```
Variables injectées dans `index.html` au démarrage NGINX via `envsubst` (Phase 2).

---

## ENV DE TEST
VM Linux locale · NetBox 4.x Docker · 8 sites · ~150 équipements · ~300 câbles
Peuplement : `scripts/populate/populate_netbox.py`

---

## RÈGLES AGENT

**À FAIRE**
1. Lire `index.html` en entier avant toute modification
2. Préserver toutes les fonctionnalités existantes
3. Respecter les conventions CSS/JS ci-dessus
4. Commenter en français les sections nouvelles
5. Tester idempotence (rechargement = même résultat)
6. Maintenir zéro-dépendance (pas npm, pas CDN tiers hors polices)
7. Documenter chaque nouvelle fonctionnalité dans `README.md`

**INTERDIT ❌**
- Framework (React, Vue...) · build step (Webpack, Vite...) · jQuery/Lodash
- Casser compatibilité NetBox API v4
- Hardcoder valeurs spécifiques entreprise
- Commiter `.env` ou token
- Modifier `LICENSE` sans accord

---

## ÉCONOMIE TOKENS — RÈGLES RÉPONSE
- Réponse directe, pas d'introduction ni conclusion
- Modifications → diff uniquement (pas fichier complet)
- Code → commentaires sur lignes complexes uniquement
- Si tient en 3 lignes → 3 lignes

---

## GIT
**⚠️ STATUT ACTUEL : repo GitHub vide — aucun fichier poussé pour le moment.**
Le développement se fait en local. Ne pas tenter de `git pull` ou de référencer du code remote.

```bash
git checkout -b feat/nom-fonctionnalite
git commit -m "feat|fix|docs|refactor|style|test|chore: message"
git push origin feat/nom-fonctionnalite
# → Pull Request
```

---

## RESSOURCES
- NetBox API : docs.netbox.dev/en/stable/integrations/rest-api/
- NetBox Docker : github.com/netbox-community/netbox-docker
- Issues : github.com/Brice97426/netbox-topo-vision/issues