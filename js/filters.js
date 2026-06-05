// ══════════════════════════════════════════
//  FILTERS — état des filtres, événements UI, favoris
//
//  Responsabilité : état activeFilters + DOM filterbar uniquement
//  Pas de fetch, pas de rendu SVG direct
// ══════════════════════════════════════════

let activeFilters = {
  role: '', site: '', status: '', siteGroup: '',
  tag: '', manufacturer: '', layerKeys: [], hiddenCols: [], prefixFilter: ''
};
let _prefixMatchedIds = null;

function ipv4ToNum(ip) { return ip.split('.').reduce((a,b) => (a<<8)|+b, 0) >>> 0; }
function ipInCidr(ipWithMask, cidr) {
  try {
    const ip = (ipWithMask||'').split('/')[0];
    const [net, bits] = cidr.split('/');
    if (!ip || !net || bits === undefined) return false;
    const b = +bits; if (b < 0 || b > 32 || isNaN(b)) return false;
    const mask = b === 0 ? 0 : (~0 << (32-b)) >>> 0;
    return (ipv4ToNum(ip) & mask) === (ipv4ToNum(net) & mask);
  } catch(e) { return false; }
}

async function searchByPrefix() {
  const cidr = (document.getElementById('filter-prefix')?.value || '').trim();
  activeFilters.prefixFilter = cidr;
  if (!cidr) { _prefixMatchedIds = null; applyFilters(); return; }

  const ipMatched = topoData.devices.filter(d => {
    const ip = d.primary_ip?.address || d.primary_ip4?.address || '';
    return ip && ipInCidr(ip, cidr);
  });

  let siteMatched = [];
  try {
    const data = await apiGet(`ipam/prefixes/?prefix=${encodeURIComponent(cidr)}&limit=50`);
    const siteSlugs = new Set((data.results||[]).map(p => p.site?.slug).filter(Boolean));
    if (siteSlugs.size) siteMatched = topoData.devices.filter(d => siteSlugs.has(d.site?.slug));
  } catch(e) { /* API optionnelle */ }

  const seen = new Set();
  _prefixMatchedIds = new Set(
    [...ipMatched, ...siteMatched]
      .filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
      .map(d => d.id)
  );
  applyFilters();
}

// ── Peuple les <select> à partir des données équipements chargées ──
function populateFilters(devices) {
  const roles  = [...new Set(devices.map(d => d.role?.name||d.device_role?.name).filter(Boolean))].sort();
  const sites  = [...new Set(devices.map(d => d.site?.name).filter(Boolean))].sort();
  const groups = allSiteGroups.map(g => g.name).sort();

  document.getElementById('filter-role').innerHTML =
    '<option value="">'+t('filter.allRoles')+'</option>' + roles.map(x => `<option value="${x}">${x}</option>`).join('');
  document.getElementById('filter-site').innerHTML =
    '<option value="">'+t('filter.allSites')+'</option>' + sites.map(x => `<option value="${x}">${x}</option>`).join('');
  document.getElementById('filter-site-group').innerHTML =
    '<option value="">'+t('filter.allGroups')+'</option>' + groups.map(x => `<option value="${x}">${x}</option>`).join('');

  // Tags (depuis device.tags[])
  allTags = [...new Set(devices.flatMap(d => (d.tags||[]).map(t => t.name||t.slug||t)).filter(Boolean))].sort();
  document.getElementById('filter-tag').innerHTML =
    '<option value="">'+t('filter.allTags')+'</option>' + allTags.map(x => `<option value="${x}">${x}</option>`).join('');

  // Fabricants (depuis device_type.manufacturer.name)
  allManufacturers = [...new Set(devices.map(d => d.device_type?.manufacturer?.name).filter(Boolean))].sort();
  document.getElementById('filter-manufacturer').innerHTML =
    '<option value="">'+t('filter.allManufacturers')+'</option>' + allManufacturers.map(x => `<option value="${x}">${x}</option>`).join('');

  allRoleSlugs = [...new Set(
    devices.map(d => (d.role?.slug||d.device_role?.slug||'').toLowerCase()).filter(Boolean)
  )].sort();

  const colsGroup = document.getElementById('filter-cols-group');
  if (colsGroup) {
    colsGroup.innerHTML = getColumns().sort((a,b)=>a.pos-b.pos).map(c =>
      `<button class="btn tiny col-toggle ${activeFilters.hiddenCols.includes(c.key)?'':'on'}"
        data-col="${c.key}" onclick="toggleColFilter('${esc(c.key)}')">${esc(c.label)}</button>`
    ).join('');
  }

  renderFavorites();
}

// ── Applique les filtres actifs et re-rend la topologie ──
function applyFilters() {
  activeFilters.role         = document.getElementById('filter-role').value;
  activeFilters.site         = document.getElementById('filter-site').value;
  activeFilters.status       = document.getElementById('filter-status').value;
  activeFilters.siteGroup    = document.getElementById('filter-site-group').value;
  activeFilters.tag          = document.getElementById('filter-tag')?.value || '';
  activeFilters.manufacturer = document.getElementById('filter-manufacturer')?.value || '';
  // layerKeys est défini programmatiquement par les favoris (pas de contrôle UI direct)

  const has = Object.values(activeFilters).some(v => Array.isArray(v) ? v.length : !!v);

  // Indicateur visuel sur les selects actifs
  ['filter-role','filter-site','filter-status','filter-site-group','filter-tag','filter-manufacturer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('on', !!el.value);
  });
  document.getElementById('filter-clear-btn').style.display = has ? '' : 'none';

  // ── Tags actifs dans la filterbar ──
  const tags = document.getElementById('filter-tags');
  tags.innerHTML = '';
  if (activeFilters.role)         tags.innerHTML += makeTag(t('filter.role'),         activeFilters.role,         () => { document.getElementById('filter-role').value=''; applyFilters(); });
  if (activeFilters.site)         tags.innerHTML += makeTag(t('filter.site'),         activeFilters.site,         () => { document.getElementById('filter-site').value=''; applyFilters(); });
  if (activeFilters.siteGroup)    tags.innerHTML += makeTag(t('filter.group'),        activeFilters.siteGroup,    () => { document.getElementById('filter-site-group').value=''; applyFilters(); });
  if (activeFilters.status)       tags.innerHTML += makeTag(t('filter.status'),       activeFilters.status,       () => { document.getElementById('filter-status').value=''; applyFilters(); });
  if (activeFilters.tag)          tags.innerHTML += makeTag(t('filter.tag'),          activeFilters.tag,          () => { document.getElementById('filter-tag').value=''; applyFilters(); });
  if (activeFilters.manufacturer) tags.innerHTML += makeTag(t('filter.manufacturer'), activeFilters.manufacturer, () => { document.getElementById('filter-manufacturer').value=''; applyFilters(); });
  if (activeFilters.layerKeys && activeFilters.layerKeys.length) {
    tags.innerHTML += makeTag(t('filter.layers'), activeFilters.layerKeys.join(', '),
      () => { activeFilters.layerKeys = []; applyFilters(); });
  }
  activeFilters.hiddenCols.forEach(k => {
    const col = getColumns().find(c => c.key === k);
    if (col) tags.innerHTML += makeTag(t('filter.col')||'Col', col.label, () => toggleColFilter(k));
  });
  if (activeFilters.prefixFilter) {
    tags.innerHTML += makeTag('Préfixe', activeFilters.prefixFilter, () => {
      activeFilters.prefixFilter = ''; _prefixMatchedIds = null;
      const pf = document.getElementById('filter-prefix'); if (pf) pf.value = '';
      applyFilters();
    });
  }

  if (!topoData.devices.length) return;
  if (!has) {
    render(topoData); currentTopoData = topoData;
    updateStats(topoData.devices.length, topoData.cables.length, topoData.layerCount);
    return;
  }

  const visible = topoData.devices.filter(d => {
    const roleMatch   = !activeFilters.role    || (d.role?.name||d.device_role?.name||'') === activeFilters.role;
    const siteMatch   = !activeFilters.site    || (d.site?.name||'') === activeFilters.site;
    const statusMatch = !activeFilters.status  || (d.status?.value||'') === activeFilters.status;
    let groupMatch = true;
    if (activeFilters.siteGroup) {
      const ancestors = deviceSiteGroupsMap[d.site?.id] || [];
      groupMatch = ancestors.includes(activeFilters.siteGroup);
    }
    const tagMatch = !activeFilters.tag || (d.tags||[]).some(tg => (tg.name||tg.slug||tg) === activeFilters.tag);
    const mfMatch  = !activeFilters.manufacturer || (d.device_type?.manufacturer?.name||'') === activeFilters.manufacturer;
    let layerMatch = true;
    if (Array.isArray(activeFilters.layerKeys) && activeFilters.layerKeys.length) {
      layerMatch = activeFilters.layerKeys.includes(getLayer(d).key);
    }
    return roleMatch && siteMatch && statusMatch && groupMatch && tagMatch && mfMatch && layerMatch;
  });

  const prefixVisible = _prefixMatchedIds !== null ? visible.filter(d => _prefixMatchedIds.has(d.id)) : visible;
  const colVisible = prefixVisible.filter(d => !activeFilters.hiddenCols.includes(getLayer(d).col));
  const ft = buildTopology(colVisible, topoData.cables, activeFilters.hiddenCols);
  render(ft); currentTopoData = ft;
  updateStats(visible.length+'/'+topoData.devices.length, ft.cables.length, ft.layerCount);
}

// ── Crée une puce de filtre actif avec bouton de suppression ──
function makeTag(key, val, onClose) {
  const id = 't-'+key;
  window['_tc_'+id] = onClose;
  return `<div class="filter-tag">${key}: ${val}<span class="filter-tag-x" onclick="window['_tc_${id}']()">&times;</span></div>`;
}

// ── Réinitialise tous les filtres ──
function clearFilters() {
  ['filter-role','filter-site','filter-site-group','filter-status','filter-tag','filter-manufacturer'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  activeFilters.layerKeys = [];
  activeFilters.hiddenCols = [];
  activeFilters.prefixFilter = '';
  _prefixMatchedIds = null;
  const pf = document.getElementById('filter-prefix'); if (pf) pf.value = '';
  document.querySelectorAll('.col-toggle').forEach(b => b.classList.add('on'));
  document.querySelectorAll('.fav-pill').forEach(p => p.classList.remove('on'));
  applyFilters();
}

function toggleColFilter(colKey) {
  const idx = activeFilters.hiddenCols.indexOf(colKey);
  if (idx === -1) activeFilters.hiddenCols.push(colKey);
  else activeFilters.hiddenCols.splice(idx, 1);
  document.querySelectorAll('.col-toggle').forEach(b => {
    b.classList.toggle('on', !activeFilters.hiddenCols.includes(b.dataset.col));
  });
  applyFilters();
}

// ══════════════════════════════════════════
//  FAVORIS — vues filtrées sauvegardées
// ══════════════════════════════════════════
function getFavorites() { return lsGet('favorites', []) || []; }
function setFavorites(arr) { lsSet('favorites', arr); }

function saveCurrentAsFavorite() {
  document.getElementById('fav-name-input').value   = '';
  document.getElementById('fav-layers-input').value = (activeFilters.layerKeys||[]).join(', ');
  document.getElementById('fav-prompt').classList.add('show');
}

function confirmSaveFavorite() {
  const name = document.getElementById('fav-name-input').value.trim();
  if (!name) return;
  const layerKeys = document.getElementById('fav-layers-input').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const fav = {
    name,
    filters: {
      role:         activeFilters.role,
      site:         activeFilters.site,
      siteGroup:    activeFilters.siteGroup,
      status:       activeFilters.status,
      tag:          activeFilters.tag,
      manufacturer: activeFilters.manufacturer,
      layerKeys
    }
  };
  const favs = getFavorites();
  favs.push(fav);
  setFavorites(favs);
  document.getElementById('fav-prompt').classList.remove('show');
  renderFavorites();
  showToast(t('toast.favSaved'), 'ok');
}

function renderFavorites() {
  const bar = document.getElementById('fav-bar');
  if (!bar) return;
  const favs = getFavorites();
  bar.innerHTML = favs.map((f,i) =>
    '<span class="fav-pill" onclick="applyFavorite('+i+')">' +
    '<span class="fav-star">\u2605</span>'+ esc(f.name) +
    '<span class="fav-x" onclick="event.stopPropagation();deleteFavorite('+i+')">\u00d7</span>' +
    '</span>'
  ).join('');
}

function applyFavorite(i) {
  const fav = getFavorites()[i]; if (!fav) return;
  const f   = fav.filters || {};
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('filter-role',         f.role);
  setVal('filter-site',         f.site);
  setVal('filter-site-group',   f.siteGroup);
  setVal('filter-status',       f.status);
  setVal('filter-tag',          f.tag);
  setVal('filter-manufacturer', f.manufacturer);
  activeFilters.layerKeys = Array.isArray(f.layerKeys) ? f.layerKeys : [];
  document.querySelectorAll('.fav-pill').forEach((el, idx) => el.classList.toggle('on', idx === i));
  applyFilters();
}

function deleteFavorite(i) {
  const favs = getFavorites();
  favs.splice(i, 1);
  setFavorites(favs);
  renderFavorites();
}
