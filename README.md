# NetBox Topo Vision

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-nginx%3Aalpine-blue)](Dockerfile)
[![NetBox](https://img.shields.io/badge/NetBox-3.x%20%E2%80%93%204.x-brightgreen)](https://github.com/netbox-community/netbox)
[![Vanilla JS](https://img.shields.io/badge/stack-vanilla%20JS-yellow)]()
[![Issues](https://img.shields.io/github/issues/Brice97426/netbox-topo-vision)](https://github.com/Brice97426/netbox-topo-vision/issues)

A self-contained, **zero-build** network topology visualization tool for
[NetBox](https://github.com/netbox-community/netbox).
It reads devices, cables, sites and site-groups straight from the NetBox API
and renders an interactive 3-column SVG topology in the browser.

> Built originally for an internal infrastructure, then refactored as a
> **generic** open-source tool to be proposed to the
> [NetBox Labs community](https://netboxlabs.com/).

![screenshot placeholder](docs/screenshots/main.png)

---

## ✨ Features

- 🗺️ **Visual network topology** built directly from the NetBox API
- 🧩 **Customizable zones** — drag & drop between columns, add / remove,
  edit colors, NetBox role slugs, ordering
- 🔌 **Per-zone NetBox slug mapping** (case-insensitive)
- 🔍 **Filters** — role, site, site group, status, tag, manufacturer
- ⭐ **Saved favourite views** — one-click filters with optional layer scope
- 🛰️ **Optional WAN cloud** between any two layers (label / source / target
  configurable)
- 📦 **Cable grouping toggle** — single bubble with counter, or one line per
  cable
- 🌙/☀️ **Dark / Light theme** toggle, persisted in `localStorage`
- 🗺️ **Minimap** with click-to-pan viewport
- 🛈 **Hover tooltip** on every node (name · role · site · status)
- ⌨️ **Keyboard shortcuts** (press `?` to see them all)
- 📤 **Export** — high-resolution PNG (×2) and draw.io XML
- 🌐 **i18n** — English & Français (auto-detected, switchable)
- 🔐 **Secure-by-default proxy mode** — the NetBox API token never reaches
  the browser, it is injected by NGINX on the server side

---

## 🚀 Quick start

### 1. Clone

```bash
git clone https://github.com/Brice97426/netbox-topo-vision.git
cd netbox-topo-vision
```

### 2. Configure

```bash
cp .env.example .env
$EDITOR .env
# → set NETBOX_URL and NETBOX_TOKEN
```

### 3. Run

```bash
docker compose up -d
```

### 4. Open

<http://localhost:8090>

---

## 🏗️ Architecture

```
   ┌───────────┐       ┌────────────────────┐       ┌────────────┐
   │  Browser  │  ───▶ │  NGINX (this app)  │  ───▶ │  NetBox    │
   │ (vanilla  │       │  static + proxy    │       │  API       │
   │  JS)      │  ◀─── │  /api/netbox/*     │  ◀─── │            │
   └───────────┘       └────────────────────┘       └────────────┘
        ▲                       ▲
        │                       │  injects "Authorization: Token …"
   localStorage                 │
   (layers, favs,        env: NETBOX_URL / NETBOX_TOKEN
    theme, language)
```

**Why a proxy?** It keeps the API token server-side (never sent to the
browser), avoids CORS issues, and lets you swap NetBox URL/token without
asking users to update their browser config.

> A **direct mode** is also available (Settings → Connection → Direct) for
> standalone / dev usage — it requires NetBox CORS to be configured for the
> browser origin.

---

## ⚙️ Configuration

The project ships with sensible defaults; everything else is configured
**from the UI** (no source-code editing needed) and persisted to
`localStorage`.

- **Connection** — Settings ⚙ → Connection
- **Layers / Zones** — Zone editor ▣ in the topbar
- **Theme, minimap, cable grouping, language, WAN cloud** —
  Settings ⚙ → Display / Language / WAN cloud
- **Favourite views** — ★ button in the filter bar

Detailed reference: **[docs/configuration.md](docs/configuration.md)**.

---

## ⌨️ Keyboard shortcuts

| Key | Action |
| --- | --- |
| `R` | Refresh topology (re-fetch from NetBox) |
| `F` | Fit view |
| `+` / `−` | Zoom in / out |
| `L` | Toggle cable labels |
| `Z` | Toggle zone backgrounds |
| `G` | Toggle cable grouping |
| `?` | Show this help overlay |
| `Esc` | Close sidebar / modal |

---

## 🧪 Development

For live editing without rebuilding the image, use the dev overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

It mounts the whole project directory read-only into the container, so
saving `index.html` and refreshing the browser is enough.

### Stack

- **Frontend**: 100 % vanilla HTML / CSS / SVG / JS — *no build step, no
  npm install, no framework*
- **Backend**: a single `nginx:alpine` container
- **Storage**: browser `localStorage` (the project itself is stateless)

---

## 🤝 Contributing

Issues and pull requests are welcome.

- For **bugs**: please use the
  [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).
- For **features**: please use the
  [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).
- For **code style**: keep the project monolithic and dependency-free
  (this is a feature, not a limitation — it makes the tool trivial to
  audit and deploy).

---

## 📄 License

[MIT](LICENSE) © [Brice97426](https://github.com/Brice97426)

---

## 🇫🇷 Version française condensée

**netbox-topo-vision** est un outil léger de visualisation de topologie
réseau pour NetBox. Il se déploie en une commande Docker, lit l'API
NetBox via NGINX (le token reste côté serveur) et affiche vos équipements,
câbles et zones dans une vue interactive 3 colonnes.

### Démarrage rapide

```bash
git clone https://github.com/Brice97426/netbox-topo-vision.git
cd netbox-topo-vision
cp .env.example .env       # → renseigne NETBOX_URL et NETBOX_TOKEN
docker compose up -d
# → http://localhost:8090
```

### Fonctionnalités principales

- Topologie SVG interactive depuis l'API NetBox
- Éditeur de zones drag & drop personnalisable
- Filtres : rôle, site, groupe de site, statut, tag, fabricant
- Vues favorites (clic unique)
- Nuage WAN optionnel entre deux couches
- Bulles ou lignes individuelles pour les câbles multiples
- Thème sombre / clair, minimap, tooltips au survol
- Raccourcis clavier (touche `?`)
- Export PNG ×2 et XML draw.io
- Interface FR / EN auto-détectée

Toute la configuration se fait depuis l'interface : aucun fichier source
à modifier.
