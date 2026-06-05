// ══════════════════════════════════════════
//  API — fetch NetBox REST v4, pagination, auth token
//
//  Mode 'proxy'  → /api/netbox/<endpoint> (NGINX injecte le token côté serveur)
//  Mode 'direct' → ${CONFIG.url}/api/<endpoint> (token envoyé par le navigateur, CORS requis)
//
//  Responsabilité : fetch uniquement — pas de rendu, pas d'état UI
// ══════════════════════════════════════════

function apiBase() {
  return CONFIG.mode === 'proxy'
    ? '/api/netbox/'
    : `${(CONFIG.url||'').replace(/\/$/,'')}/api/`;
}

function apiHeaders() {
  if (CONFIG.mode === 'proxy') return { 'Accept':'application/json' };
  return { 'Authorization': `Token ${CONFIG.token}`, 'Accept':'application/json' };
}

async function apiGet(path) {
  const r = await fetch(apiBase() + path, { headers: apiHeaders() });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${r.statusText}`);
  return r.json();
}

// Récupère toutes les pages d'un endpoint (suit le champ `next` jusqu'à null)
async function fetchAll(ep) {
  // Slash final obligatoire avant le query string pour éviter le 301 NGINX
  const epSlash = ep.replace(/\/?$/, '/');
  let res = [], url = `${epSlash}?limit=1000`;
  while (url) {
    const d = await apiGet(url);
    res = res.concat(d.results || []);
    // d.next = URL absolue NetBox — on garde seulement le chemin relatif après /api/
    url = d.next ? d.next.replace(/^https?:\/\/[^/]+\/api\//, '') : null;
  }
  return res;
}

// Vérification rapide de connectivité (utilisé au boot et par le bouton "Test")
async function apiPing() {
  try {
    const r = await fetch(apiBase() + 'status/', { headers: apiHeaders() });
    return r.ok;
  } catch(e) { return false; }
}

// ══════════════════════════════════════════
//  CHARGEMENT PRINCIPAL — orchestre les appels API puis déclenche le rendu
// ══════════════════════════════════════════
async function loadTopology() {
  await _serverDefaultPromise;  // S'assurer que default-topo.json est chargé avant de construire la topologie
  const btn   = document.getElementById('btn-load');
  const dot   = document.getElementById('status-dot');
  const stxt  = document.getElementById('status-text');
  const empty = document.getElementById('canvas-empty');

  btn.disabled = true;
  dot.className  = 'status-dot loading';
  stxt.textContent = t('status.connecting');
  empty.innerHTML  = `<div class="loader-ring"></div><div class="empty-text">Récupération des données…</div>`;
  empty.style.display = 'flex';
  document.getElementById('topbar-stats').style.display   = 'none';
  document.getElementById('canvas-stats').style.display   = 'none';
  document.getElementById('canvas-legend').style.display  = 'none';
  document.getElementById('edges-layer').innerHTML = '';
  document.getElementById('nodes-layer').innerHTML = '';
  document.getElementById('zones-layer').innerHTML = '';
  closeSidebar();

  try {
    const [devices, cables, siteGroups, sites] = await Promise.all([
      fetchAll('dcim/devices'), fetchAll('dcim/cables'),
      fetchAll('dcim/site-groups'), fetchAll('dcim/sites')
    ]);

    // ── Construction des maps site ↔ groupe de site ──
    allSiteGroups = siteGroups;
    const sgById  = {};
    siteGroups.forEach(sg => { sgById[sg.id] = sg; });

    function sgAncestors(sgId) {
      const ancestors = []; let cur = sgById[sgId];
      while (cur) {
        ancestors.push(cur.name);
        const parentId = cur.parent?.id || cur._parent?.id;
        cur = parentId ? sgById[parentId] : null;
      }
      return ancestors;
    }

    siteGroupMap = {}; deviceSiteGroupsMap = {};
    sites.forEach(s => {
      const sgId   = s.group?.id || s.site_group?.id;
      const sgName = s.group?.name || s.site_group?.name;
      if (sgName) siteGroupMap[s.id] = sgName;
      if (sgId)   deviceSiteGroupsMap[s.id] = sgAncestors(sgId);
    });
    devices.forEach(d => {
      const sid  = d.site?.id;
      const sgId = d.site?.group?.id || d.site?.site_group?.id;
      const sgNm = d.site?.group?.name || d.site?.site_group?.name;
      if (sid && sgNm && !siteGroupMap[sid])           siteGroupMap[sid] = sgNm;
      if (sid && sgId && !deviceSiteGroupsMap[sid])    deviceSiteGroupsMap[sid] = sgAncestors(sgId);
    });

    const blacklistedRoles = new Set((CONFIG.roleBlacklist||[]).map(s=>s.toLowerCase()));
    const visDevices = blacklistedRoles.size > 0
      ? devices.filter(d => !blacklistedRoles.has((d.role?.slug||d.device_role?.slug||'').toLowerCase()))
      : devices;

    dot.className    = 'status-dot ok';
    stxt.textContent = `${visDevices.length} équip.`;
    topoData         = buildTopology(visDevices, cables);
    currentTopoData  = topoData;
    render(topoData);
    updateStats(topoData.devices.length, topoData.cables.length, topoData.layerCount);
    empty.style.display = 'none';
    populateFilters(visDevices);
    resetView();
  } catch(e) {
    dot.className    = 'status-dot err';
    stxt.textContent = 'Erreur';
    empty.innerHTML  = `<div class="empty-glyph">✕</div><div class="empty-text">${e.message}<br><small style="opacity:.4">${t('boot.checkConfig')}</small></div>`;
    showToast(e.message, 'err');
  } finally { btn.disabled = false; }
}

// ── Mise à jour des compteurs dans la topbar et le canvas ──
function updateStats(devs, cables, levels) {
  document.getElementById('stat-devices').textContent = devs;
  document.getElementById('stat-cables').textContent  = cables;
  document.getElementById('stat-levels').textContent  = levels;
  document.getElementById('topbar-stats').style.display = 'flex';
  const cs = document.getElementById('canvas-stats');
  cs.innerHTML = `
    <div class="canvas-stat"><strong>${devs}</strong>&nbsp;équipements</div>
    <div class="canvas-stat"><strong>${cables}</strong>&nbsp;câbles</div>
    <div class="canvas-stat"><strong>${levels}</strong>&nbsp;couches</div>`;
  cs.style.display = 'flex';
}

// ══════════════════════════════════════════
//  16. BOOT — démarrage automatique
// ══════════════════════════════════════════
window.addEventListener('load', async () => {
  applyTheme(CONFIG.theme);
  applyLanguage(CONFIG.language || detectLang());
  applyTopbarToggles();
  _tooltip.bind();
  bindMinimap();
  const reachable = await apiPing();
  if (reachable) {
    loadTopology();
  } else {
    const empty = document.getElementById('canvas-empty');
    if (empty) empty.innerHTML = `<div class="empty-glyph">⚙</div><div class="empty-text">${t('boot.configurePrompt')}</div>`;
    openSettingsModal('connection');
  }
  renderFavorites();
});
