# Contributing to NetBox Topo Vision

Thank you for your interest in contributing! 🎉  
This document explains how to set up a local environment, the code conventions, and how to submit a pull request.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Fork and Clone](#how-to-fork-and-clone)
- [Local Development Setup](#local-development-setup)
- [Code Conventions](#code-conventions)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)

---

## 🤝 Code of Conduct

Be kind, inclusive, and constructive. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## 🍴 How to Fork and Clone

```bash
# 1. Fork the repository on GitHub (top-right button)

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/netbox-topo-vision.git
cd netbox-topo-vision

# 3. Add the upstream remote to stay in sync
git remote add upstream https://github.com/Bricebern/netbox-topo-vision.git
```

---

## 🐳 Local Development Setup

The project is intentionally simple — a **single `index.html`** served by NGINX in Docker.

### Prerequisites

- Docker & Docker Compose
- A running NetBox instance (local or remote) with an API token
- Any text editor

### Start the dev environment

```bash
# Start the NGINX container
docker-compose up -d

# The app is available at:
open http://localhost:8080
```

### Watch for changes

Since there is no build step, just **edit `index.html` and refresh your browser**.  
NGINX serves the file directly from the bind mount.

### Using a test NetBox instance

For isolated testing, you can spin up a NetBox Docker instance:

```bash
git clone https://github.com/netbox-community/netbox-docker.git
cd netbox-docker
docker-compose up -d
```

Then in Topo Vision's Settings modal, point to `http://localhost:8000` with your token.

---

## 🧑‍💻 Code Conventions

This project uses **vanilla JavaScript only** — no frameworks, no transpilers, no bundlers.

### JavaScript

| Rule | Example |
|---|---|
| ES2020+ syntax | `const`, `let`, arrow functions, template literals, optional chaining |
| No `var` | Use `const` by default, `let` only when reassignment is needed |
| Functions | Named functions for public API, arrow functions for callbacks |
| Async/await | Preferred over `.then()` chains |
| DOM queries | `document.getElementById()` for performance-critical paths |
| No external libs | Everything must work offline from the static file |

### CSS

- Design tokens are CSS custom properties in `:root` — always use them, never hardcode colors.
- Theme variants use `[data-theme="light"]` selector on `<html>`.
- BEM-like naming for new components: `.preset-pill`, `.preset-pill-del`, etc.

### i18n

- All user-visible strings must be in **both** `I18N.fr` and `I18N.en`.
- Use the `t('key')` helper everywhere — never hardcode display strings in JS.
- New keys must be added to the i18n table before the PR is submitted.

### Patches / Sections

The JS is organized in numbered modules (comments like `// 1. STORAGE`, `// 2. CONFIG`, etc.).  
When adding a feature, insert your code in the **appropriate module section**
and add `/* PATCH X — début */` / `/* PATCH X — fin */` markers during development
(they can be cleaned up in the final PR).

---

## 📬 Submitting a Pull Request

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** — keep commits small and focused.

3. **Test manually**:
   - [ ] App loads without console errors
   - [ ] Feature works in Chrome and Firefox
   - [ ] Both FR and EN languages display correctly
   - [ ] localStorage keys are not broken (no data loss on upgrade)
   - [ ] Dark and Light themes both look correct
   - [ ] Export PNG still works after your change

4. **Update the CHANGELOG** under `[Unreleased]` section.

5. **Push and open a PR**:
   ```bash
   git push origin feat/my-feature
   ```
   Then open a Pull Request on GitHub with:
   - A clear title (`feat: ...` / `fix: ...` / `docs: ...`)
   - A description of what changes and why
   - Screenshots for UI changes

6. A maintainer will review within a few days. Be ready for feedback!

---

## 🐛 Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).  
Please include your NetBox version, browser, and any console errors.

---

Thank you for making NetBox Topo Vision better! 🚀
