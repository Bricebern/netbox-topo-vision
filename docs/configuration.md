# Configuration reference — NetBox Topo Vision

This document covers every knob exposed by **netbox-topo-vision**.
All settings except the two server-side env vars (`NETBOX_URL`, `NETBOX_TOKEN`)
are configured **from the UI** and persisted in the browser's `localStorage`.
No source-code edits are ever needed.

---

## Table of contents

1. [Server-side environment variables](#1-server-side-environment-variables)
2. [Connection modes](#2-connection-modes)
3. [Layers / Zones editor](#3-layers--zones-editor)
4. [Filters and favourite views](#4-filters-and-favourite-views)
5. [Display options](#5-display-options)
6. [WAN cloud](#6-wan-cloud)
7. [Language](#7-language)
8. [Keyboard shortcuts](#8-keyboard-shortcuts)
9. [Export formats](#9-export-formats)
10. [localStorage schema reference](#10-localstorage-schema-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Server-side environment variables

Set in `.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `NETBOX_URL` | `http://localhost:8000` | Full URL of your NetBox instance, **no trailing slash**. |
| `NETBOX_TOKEN` | _(empty)_ | NetBox API token. Create one in **NetBox → Admin → API Tokens → Add Token**. |
| `APP_PORT` | `8090` | Host port that exposes the web UI. |

These vars are injected into the NGINX config at container startup by
`envsubst`. The token is **never** sent to the browser.

```bash
cp .env.example .env
# Edit .env:
NETBOX_URL=https://netbox.example.com
NETBOX_TOKEN=0123456789abcdef0123456789abcdef01234567
APP_PORT=8090
```

---

## 2. Connection modes

Access via **Settings ⚙ → Connection**.

### Proxy mode (recommended, default)

The browser calls `/api/netbox/<endpoint>`. NGINX rewrites it to
`${NETBOX_URL}/api/<endpoint>` and injects `Authorization: Token <NETBOX_TOKEN>`.

- Token never reaches the browser
- No CORS configuration needed in NetBox
- Works out of the box with Docker Compose

### Direct mode

The browser calls the NetBox API directly with the token in the
`Authorization` header. Useful when running `index.html` standalone.
Requires NetBox CORS to be configured for the browser origin.

> **Security note:** In direct mode the token is stored in `localStorage`.
> Only use this on a trusted machine.

---

## 3. Layers / Zones editor

Open with the **▣** button in the topbar.

### Layer fields

| Field | Description |
|-------|-------------|
| `key` | Stable identifier. Used in favourite views, WAN cloud config. |
| `col` | Column: `left`, `mid`, `right`. |
| `order` | Vertical sort order within the column. |
| `label` | Display name shown in legend and zone background. |
| `color` | Hex color for zone border, node accent bar, legend dot. |
| `slugs[]` | NetBox device role slugs/names that map to this layer. Case-insensitive substring match. |
| `virtualGroups[]` | _(virtual layer only)_ Prefix-based sub-layout groups. |

### Editing

- **Drag** a zone card to move it between columns (HTML5 drag & drop).
- **Click** a card to expand the edit form.
- **Slugs**: press Enter to add a chip; click × to remove.
- **+** button at the top of each column to add a new zone.
- **Delete** button on a card to remove the zone.
- **Export JSON** / **Import JSON** to back up or share layer configs.
- **Reset to defaults** to restore the built-in layer set.

### Virtual layer — advanced sub-layout

The `virtual` layer supports a `virtualGroups` field that groups devices
into labelled bubbles by device name prefix. Format in the textarea
(one group per line):

```
family,prefix1,prefix2,...
```

| `family` | Layout |
|----------|--------|
| `sw` | Two-row switch bubble. Devices with `TOP`/`MGMT` in name → top row; `BOT` → bottom row. |
| `esx` | Two-column hypervisor bubble. |
| `vrtx` | Single row with a prefix label on the left. |
| `other` | Plain row (default fallback). |

**Example** (Brice's original company layout):
```
sw,SWA,SWB,SWW
esx,ESXA,ESXB,ESXC,ESXW
vrtx,VRTX
```

Leave empty → flat single-row layout.

---

## 4. Filters and favourite views

### Live filters

| Filter | Matches on |
|--------|-----------|
| Role | `device.role.name` |
| Site | `device.site.name` |
| Site group | Any ancestor group name (walks the hierarchy) |
| Status | `device.status.value` |
| Tag | Any entry in `device.tags[].name` |
| Manufacturer | `device.device_type.manufacturer.name` |

All filters are AND-combined. Active filters display as dismissible chips.

### Favourite views

Click **★** in the filter bar to save the current filter combination
as a named favourite. The prompt includes an optional "Restrict to layers"
field (comma-separated layer keys) — for example:

```
sdwan, firewall-distant
```

This replaces the old hardcoded `__distant__` shortcut.

Favourites persist in `localStorage` and appear as pill buttons at
the left of the filter bar. Click a pill to apply; × to delete.

---

## 5. Display options

Settings ⚙ → Display:

| Option | Default | Description |
|--------|---------|-------------|
| Theme | dark | `dark` or `light`. Also toggled with 🌙/☀ in the topbar. |
| Group cables | ON | ON = single arc + count badge; OFF = one arc per cable (parallel). |
| Show minimap | ON | Overview map in the bottom-right. Click/drag to pan the main view. |

---

## 6. WAN cloud

Settings ⚙ → WAN cloud:

| Setting | Default | Description |
|---------|---------|-------------|
| Enabled | OFF | Master switch. |
| Main label | `WAN` | Text displayed on the cloud. |
| Sub-label | _(empty)_ | Smaller text below the main label. |
| Source layer | `sdwan` | Layer key for the "top" side. |
| Target layer | `firewall-distant` | Layer key for the "bottom" side. |

When enabled, cables between the source and target layers are routed
through an animated cloud shape. Clicking the cloud opens a sidebar
panel listing all traversing connections.

---

## 7. Language

Settings ⚙ → Language:

| Choice | Behaviour |
|--------|-----------|
| Auto | Uses `navigator.language`; picks `fr` if French, `en` otherwise. |
| English | Forces EN. |
| Français | Forces FR. |

---

## 8. Keyboard shortcuts

| Key | Action |
|-----|--------|
| `R` | Refresh topology (re-fetch from NetBox) |
| `F` | Fit view |
| `+` / `=` | Zoom in |
| `−` | Zoom out |
| `L` | Toggle cable labels |
| `Z` | Toggle zone backgrounds |
| `G` | Toggle cable grouping |
| `?` | Show/hide shortcuts overlay |
| `Esc` | Close active modal, then close sidebar |

> Shortcuts are disabled when an `<input>`, `<textarea>` or `<select>` is focused.

---

## 9. Export formats

### PNG (×2)

Renders the current view at 2× pixel density via an off-screen canvas.
Filename: `netbox-topology[_filters]_YYYY-MM-DD.png`.

### XML draw.io

Produces an `mxfile` XML for [diagrams.net](https://app.diagrams.net/).
All devices, cables and zone backgrounds are exported as `mxCell` elements.
Filename: `netbox-topology[_filters]_YYYY-MM-DD.xml`.

---

## 10. localStorage schema reference

All keys are versioned: `topo-vision.<key>.v1`.

### `topo-vision.config.v1`

```jsonc
{
  "mode":        "proxy",
  "url":         "",
  "token":       "",
  "theme":       "dark",
  "language":    "",
  "groupCables": true,
  "showMinimap": true,
  "wanCloud": {
    "enabled":     false,
    "label":       "WAN",
    "subLabel":    "",
    "sourceLayer": "sdwan",
    "targetLayer": "firewall-distant"
  }
}
```

### `topo-vision.layers.v1`

Array of layer objects:

```jsonc
[
  {
    "key": "core", "col": "mid", "order": 3,
    "label": "Core", "color": "#4a8ff0",
    "slugs": ["core", "core-switch", "backbone", "spine"]
  }
]
```

Virtual layer example with `virtualGroups`:

```jsonc
{
  "key": "virtual", "col": "right", "order": 4,
  "label": "Virtual Infrastructure", "color": "#18e09a",
  "slugs": ["virtual", "vmware", "kvm", "vsphere"],
  "virtualGroups": [
    { "family": "sw",   "prefixes": ["SWA", "SWB"] },
    { "family": "esx",  "prefixes": ["ESXA", "ESXB"] },
    { "family": "vrtx", "prefixes": ["VRTX"] }
  ]
}
```

### `topo-vision.favorites.v1`

```jsonc
[
  {
    "name": "Remote sites",
    "filters": {
      "role": "", "site": "", "siteGroup": "",
      "status": "", "tag": "", "manufacturer": "",
      "layerKeys": ["sdwan", "firewall-distant"]
    }
  }
]
```

---

## 11. Troubleshooting

### "Configure your NetBox connection" message at startup

- **Proxy mode:** Check `NETBOX_URL` and `NETBOX_TOKEN` in `.env`:
  ```bash
  docker compose down && docker compose up -d
  docker exec topo-vision wget -qO- http://localhost/healthz
  ```
- **Direct mode:** Use **Settings → Connection → Test connection**.

### HTTP 401 Unauthorized

Token is invalid or expired. Create a new one in
**NetBox → Admin → API Tokens → Add Token**.

### HTTP 502 / 504 Bad Gateway (proxy mode)

NGINX cannot reach NetBox. Verify `NETBOX_URL` is reachable from inside
the container:

```bash
docker exec topo-vision wget -qO- "${NETBOX_URL}/api/status/"
```

If NetBox is on the same Docker host (Linux), use the bridge IP
(`172.17.0.1`) or the container name if both stacks share a Docker network.

### CORS errors (direct mode)

Add to `netbox/configuration/configuration.py`:

```python
CORS_ORIGIN_ALLOW_ALL = True
# or:
CORS_ORIGIN_WHITELIST = ['http://localhost:8090']
```

Restart NetBox after the change.

### Devices land in "Other" layer

The device role slug does not match any entry in your layers config.
Check the exact slug in **NetBox → Devices → Device Roles** and add it
via the Zone editor ▣.

### Minimap is empty

The minimap only renders after a successful topology load.

### PNG export is blank

Ensure the topology is fully loaded. Very large topologies (>5000 devices)
may hit browser canvas limits — apply filters to reduce the scope first.
