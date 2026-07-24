# Changelog

All notable changes to **NetBox Topo Vision** are documented in this file.  
This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Unreleased - 2026-07-24

### Fixed
- **fix/Extra-I18n.en** - Fixed issues where multiple messages where hardcoded in French.
  Changed to use i18n tranlation function and added both English and French translations.

---

## [2.0.0] — 2025-07-14

### Added
- **Role slug matching** — `getLayer()` now matches devices against NetBox role
  `slug` field (priority) before falling back to role `name`. Fully backward-compatible
  with existing zone configurations. ([Patch 1])
- **Cable bundle toggle in topbar** — The "group cables" toggle is now directly
  accessible in the top toolbar, alongside the zones and labels toggles.
  The Settings modal toggle remains and is kept in sync via a single
  source of truth (`cfg.groupCables`). ([Patch 2])
- **Named filter presets** — Users can now save a complete filter state
  (role, site, site group, status, tag, manufacturer, visible layers) as a named
  preset. Presets are displayed as clickable pills below the filter bar and
  persisted in `localStorage` under the key `topo_presets`. ([Patch 3])
- **GitHub community files** — Added `README.md`, `CHANGELOG.md`,
  `.github/CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/bug_report.md`,
  `.github/ISSUE_TEMPLATE/feature_request.md`. ([Patch 4])
- **i18n keys** — Added French and English translation keys for topbar cable
  toggle and preset system.

### Changed
- `getLayer()` now performs two-pass slug matching (slug first, name second).

### Fixed
- Devices whose NetBox role slug differs from the display name were not correctly
  assigned to their zone.

---

## [1.0.0] — Initial release

### Added
- Interactive SVG network topology viewer
- Multi-column zone layout (left / center / right)
- Live NetBox REST API integration (devices, cables, IPs, sites, roles)
- Filtering by role, site, site group, status, tag, manufacturer
- Layer-based filtering with checkboxes
- WAN cloud rendering between two configurable layers
- Cable bundle grouping with counter badge
- Dark / Light theme with localStorage persistence
- i18n FR / EN auto-detected from browser
- PNG export and draw.io XML export
- Minimap viewport indicator
- Zone editor UI (add, rename, reorder, recolor, import/export JSON)
- First-run setup wizard
- NGINX Docker container (single `index.html`)
