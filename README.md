# NetBox Topo Vision

[![Stars](https://img.shields.io/github/stars/Brice97426/netbox-topo-vision?style=flat-square&logo=github)](https://github.com/Brice97426/netbox-topo-vision/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![NetBox](https://img.shields.io/badge/NetBox-3.x%20%7C%204.x-9068f8?style=flat-square&logo=data:image/svg+xml;base64,...)](https://netbox.dev)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?style=flat-square&logo=docker)](docker-compose.yml)

> **A standalone, zero-dependency network topology viewer for NetBox — served by a single NGINX container.**

![Screenshot placeholder](docs/screenshot.png)
_↑ Replace with an actual screenshot of your topology_

---

## ✨ Features

- 🗺️ **Interactive SVG topology** — pan, zoom, drag
- 🏗️ **Multi-column zone layout** — left / center / right columns, fully customizable
- 🔌 **Live NetBox API** — devices, cables, IP addresses, sites, roles
- 🔍 **Rich filtering** — by role, site, site group, status, tag, manufacturer, layer
- 💾 **Named filter presets** — save & restore complete filter configurations in one click
- ⬡ **Cable bundle toggle** — group parallel cables into a single labeled edge
- ☁️ **WAN cloud rendering** — visual cloud node between two configurable layers
- 🌐 **Slug-based role matching** — zones matched on NetBox role slugs (priority) then name
- 🌙 **Dark / Light theme** — persisted in localStorage
- 🗣️ **i18n FR / EN** — auto-detected from browser
- 📤 **Export PNG & draw.io XML** — one-click topology export
- 🗺️ **Minimap** — viewport indicator for large topologies
- 🔧 **Zone editor UI** — add, rename, reorder, recolor zones directly in the browser
- 🔑 **No backend required** — pure static HTML served by NGINX

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| NetBox | 3.x or 4.x |
| Docker & Docker Compose | 20.x+ |
| NetBox API Token | Read-only is sufficient |

### 1. Clone the repository

```bash
git clone https://github.com/Brice97426/netbox-topo-vision.git
cd netbox-topo-vision
```

### 2. Start the container

```bash
docker-compose up -d
```

### 3. Open your browser

```
http://localhost:8080
```

On first launch, a **setup wizard** will guide you through entering your NetBox URL and API token.

---

## ⚙️ Configuration

All configuration is stored in **browser localStorage** — no server-side config file needed.

| Setting | Description | Example |
|---|---|---|
| NetBox URL | Base URL of your NetBox instance | `https://netbox.mycompany.com` |
| API Token | NetBox API token (read-only sufficient) | `abc123def456...` |
| Port (Docker) | Host port mapped to NGINX | `8080` (default) |

### docker-compose.yml

```yaml
version: "3.8"
services:
  topo-vision:
    image: nginx:alpine
    container_name: netbox-topo-vision
    ports:
      - "8080:80"
    volumes:
      - ./index.html:/usr/share/nginx/html/index.html:ro
      - ./favicon.ico:/usr/share/nginx/html/favicon.ico:ro
    restart: unless-stopped
```

> **CORS note:** If NetBox and this app are on different domains, you may need to configure NetBox's `ALLOWED_HOSTS` and either a reverse proxy or the CORS plugin.

### Using a reverse proxy (recommended for production)

If NetBox is behind a different origin, add an NGINX proxy block in `nginx.conf`:

```nginx
location /api/netbox/ {
    proxy_pass https://netbox.mycompany.com/api/;
    proxy_set_header Authorization "Token YOUR_TOKEN";
}
```

---

## 🗺️ Zone Configuration

Zones are configured directly in the **Zone Editor** (click the grid icon in the topbar).  
Each zone has:
- A **key** (internal identifier)
- A **label** (displayed name)
- A **color**
- A list of **slugs** — matched against NetBox role slugs (priority) then role names

Export/import zones as JSON to share configurations between instances.

---

## 🛣️ Roadmap

- [ ] Multiple topology layouts (radial, hierarchical)
- [ ] Click-to-trace cable path across multiple hops
- [ ] IP prefix overlay on nodes
- [ ] VLAN / prefix topology view
- [ ] NetBox plugin integration (embedded panel)
- [ ] Custom node shapes per device type
- [ ] Topology diff (before/after comparison)
- [ ] Shareable topology URLs (encoded state)

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) first.

```bash
# Fork → Clone → Branch → Commit → PR
git checkout -b feat/my-feature
```

---

## 📄 License

MIT © [Brice97426](https://github.com/Brice97426)  
See [LICENSE](LICENSE) for details.
