// ══════════════════════════════════════════
//  SIDEBAR — affichage détails équipements, câbles et zone WAN
//
//  Responsabilité : DOM sidebar uniquement
//  Dépendances    : config.js (t, getLayer, getCableColor, getStatusBadge, esc,
//                              currentTopoData, deviceSiteGroupsMap, siteGroupMap)
// ══════════════════════════════════════════

// ── Détail zone WAN : toutes les connexions source ↔ cible ──
function showWANDetail(wanEdges, devices) {
  document.querySelectorAll('.node-group').forEach(n => n.classList.remove('selected'));
  selectedId = null;

  const totalCables = wanEdges.reduce((s,e) => s + e.cables.length, 0);

  const rows = wanEdges.map(e => {
    const dA = devices.find(d => d.id === e.aId);
    const dB = devices.find(d => d.id === e.bId);
    const sdwan = getLayer(dA)?.key === 'sdwan' ? dA : dB;
    const fwd   = getLayer(dA)?.key === 'sdwan' ? dB : dA;
    return { sdwan, fwd, cables: e.cables };
  }).sort((a,b) => (a.fwd?.name||'').localeCompare(b.fwd?.name||''));


  const rowsHtml = rows.map(r => {
    const cablesHtml = r.cables.map(c => {
      const clr = getCableColor(c.color);
      return `<div class="cable-row">
        <div class="cable-dot" style="background:${clr}"></div>
        <div class="cable-lbl">${c.label || c.type_display || c.type || `${t('sidebar.cable_number')} ${c.id}`}</div>
        <div class="cable-to" style="color:var(--text3);font-size:9px">${c.status||''}</div>
      </div>`;
    }).join('');
    return `
      <div class="info-block" style="border:1px solid var(--line);border-radius:6px;padding:9px 11px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
          <div style="width:3px;height:28px;border-radius:2px;background:#20d0e8;flex-shrink:0"></div>
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--text)">${r.fwd?.name||'?'}</div>
            <div style="font-family:var(--mono);font-size:8.5px;color:var(--text3)">via ${r.sdwan?.name||'?'}</div>
          </div>
          <div style="margin-left:auto;font-family:var(--mono);font-size:8.5px;color:#20d0e8;opacity:.7">${r.cables.length} ${t('sidebar.cable')}${r.cables.length>1?'s':''}</div>
        </div>
        <div class="cables-scroll" style="max-height:80px">${cablesHtml}</div>
      </div>`;
  }).join('');

  document.getElementById('sidebar-kind').textContent = t('sidebar.wan');
  document.getElementById('sidebar-content').innerHTML = `
    <div class="dev-name" style="display:flex;align-items:center;gap:8px">
      <span style="color:#20d0e8;font-size:18px">☁</span> WAN
    </div>
    <div class="dev-model">${t('sidebar.remote_side_wan')}</div>
    <div class="dev-layer-badge" style="background:rgba(32,208,232,0.08);color:#20d0e8;border:1px solid rgba(32,208,232,0.22);">
      ◈&nbsp;${wanEdges.length} ${t('sidebar.link')}${wanEdges.length>1?'s':''} · ${totalCables} ${t('sidebar.cable')}${totalCables>1?'s':''}
    </div>
    <div class="info-block">
      <div class="info-head">${t('sidebar.wan_connections')}</div>
      ${rowsHtml || '<div style="font-size:10.5px;color:var(--text3);padding:8px 0">' + t('sidebar.no_wan_connections') + '</div>'}
    </div>
  `;
  openSidebar();
}

// ── Détail équipement ──
async function showDeviceDetail(d) {
  selectedId = d.id;
  document.querySelectorAll('.node-group').forEach(n => n.classList.remove('selected'));
  document.querySelector(`.node-group[data-id="${d.id}"]`)?.classList.add('selected');

  const cables = [];
  currentTopoData.edges.forEach(e => {
    if (e.aId !== d.id && e.bId !== d.id) return;
    const otherId = e.aId === d.id ? e.bId : e.aId;
    const od = currentTopoData.devices.find(x => x.id === otherId);
    e.cables.forEach(c => cables.push({...c, otherDevice: od?.name || `#${otherId}`}));
  });

  const layer     = getLayer(d);
  const ancestors = deviceSiteGroupsMap[d.site?.id] || [];
  document.getElementById('sidebar-kind').textContent = t('sidebar.device');
  document.getElementById('sidebar-content').innerHTML = `
    <div class="dev-name">${d.name||'—'}</div>
    <div class="dev-model">${d.device_type?.display||d.device_type?.model||'—'}</div>
    <div class="dev-layer-badge" style="background:${layer.color}12;color:${layer.color};border:1px solid ${layer.color}25;">
      ◈&nbsp;${layer.label}
    </div>
    <div class="info-block">
      <div class="info-head">${t('sidebar.general')}</div>
      <div class="info-row"><span class="info-k">${t('sidebar.status')}</span><span class="info-v"><span class="badge ${getStatusBadge(d.status)}">${d.status?.label||'—'}</span></span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.role')}</span><span class="info-v">${d.role?.name||d.device_role?.name||'—'}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.site')}</span><span class="info-v">${d.site?.name||'—'}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.site_group')}</span><span class="info-v">${ancestors.length > 0 ? ancestors.join(' › ') : (siteGroupMap[d.site?.id]||'—')}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.location')}</span><span class="info-v">${d.location?.name||'—'}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.rack_u')}</span><span class="info-v">${d.rack?.name||'—'}${d.position!=null?' · U'+d.position:''}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.manufacturer')}</span> <span class="info-v">${d.device_type?.manufacturer?.name||'—'}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.model')}</span><span class="info-v">${d.device_type?.model||'—'}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.serial_number')}</span><span class="info-v">${d.serial||'—'}</span></div>
      <div class="info-row"><span class="info-k">${t('sidebar.primary_ip')}</span><span class="info-v">${d.primary_ip?.address||d.primary_ip4?.address||'—'}</span></div>
    </div>
    ${cables.length>0 ? `<div class="info-block"><div class="info-head">${t('sidebar.cables')} (${cables.length})</div><div class="cables-scroll">${
      cables.map(c=>`<div class="cable-row"><div class="cable-dot" style="background:${getCableColor(c.color)}"></div><div class="cable-lbl">${c.label||c.type||`${t('sidebar.cable_number')} ${c.id}`}</div><div class="cable-to">→ ${c.otherDevice}</div></div>`).join('')
    }</div></div>` : ''}
    ${d.comments ? `<div class="info-block"><div class="info-head">${t('sidebar.comments')}</div><div style="font-size:10.5px;color:var(--text2);line-height:1.7">${d.comments}</div></div>` : ''}
    ${d.site?.slug ? `<div class="info-block"><div class="info-head">${t('sidebar.subnets')}</div><div id="sidebar-subnets"><span class="info-v" style="opacity:.5">${t('sidebar.loading')}</span></div></div>` : ''}
  `;
  openSidebar();

  if (d.site?.slug) {
    try {
      const data = await apiGet(`ipam/prefixes/?site=${encodeURIComponent(d.site.slug)}&limit=100`);
      const prefixes = (data.results||[]);
      const el = document.getElementById('sidebar-subnets');
      if (!el) return;
      if (!prefixes.length) {
        el.innerHTML = `<span class="info-v" style="opacity:.5">${t('sidebar.noSubnet')}</span>`;
      } else {
        el.innerHTML = prefixes.map(p =>
          `<div class="info-row">
            <span class="info-k" style="font-family:var(--mono);font-size:10px">${esc(p.prefix)}</span>
            <span class="info-v">${esc(p.description||'')}</span>
          </div>`
        ).join('');
      }
    } catch(e) {
      const el = document.getElementById('sidebar-subnets');
      if (el) el.innerHTML = `<span class="info-v" style="opacity:.5">—</span>`;
    }
  }
}

// ── Détail câble (arête) ──
function showEdgeDetail(edge, devices) {
  const dA = devices.find(d => d.id === edge.aId);
  const dB = devices.find(d => d.id === edge.bId);
  const cards = edge.cables.map((c,i) => {
    const clr    = getCableColor(c.color);
    const ifRow  = (c.ifA||c.ifB) ? `<div class="info-row"><span class="info-k">${t('sidebar.interfaces')}</span><span class="info-v" style="font-size:9.5px">${c.ifA||'—'} ↔ ${c.ifB||'—'}</span></div>` : '';
    const descRow = c.description ? `<div class="info-row"><span class="info-k">${t('sidebar.description')}</span><span class="info-v" style="font-size:9.5px">${c.description}</span></div>` : '';
    return `<div class="cable-card ${i===0?'open':''}" id="cc-${i}">
      <div class="cable-card-head" onclick="toggleCC(${i})">
        <div class="cable-card-dot" style="background:${clr}"></div>
	<span class="cable-card-title">${c.label||`${t('sidebar.cable')} ${(i+1)}`}</span>
        <span class="cable-card-chev">▾</span>
      </div>
      <div class="cable-card-body">
        <div class="info-row"><span class="info-k">${t('sidebar.label')}</span><span class="info-v">${c.label||'—'}</span></div>
        <div class="info-row"><span class="info-k">${t('sidebar.color')}</span><span class="info-v" style="display:flex;align-items:center;gap:5px;justify-content:flex-end"><span style="width:9px;height:9px;border-radius:50%;background:${clr};display:inline-block;flex-shrink:0"></span>${c.color||'—'}</span></div>
        <div class="info-row"><span class="info-k">${t('sidebar.type')}</span><span class="info-v">${c.type_display||c.type||'—'}</span></div>
        <div class="info-row"><span class="info-k">${t('sidebar.status')}</span><span class="info-v">${c.status||'—'}</span></div>
        ${ifRow}${descRow}
        <div class="info-row"><span class="info-k">${t('sidebar.netbox_id')}</span><span class="info-v">#${c.id}</span></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('sidebar-kind').textContent = t('sidebar.cable');
  document.getElementById('sidebar-content').innerHTML = `
    <div class="dev-name" style="font-size:13px">${dA?.name||'?'} ↔ ${dB?.name||'?'}</div>
    <div class="dev-model">${edge.cables.length} ${t('sidebar.cable')}${edge.cables.length>1?'s':''}</div>
    <div class="cables-scroll" style="max-height:calc(100vh - 180px)">${cards}</div>
  `;
  openSidebar();
}

function toggleCC(i) { document.getElementById('cc-'+i)?.classList.toggle('open'); }

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); }

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  selectedId = null;
  document.querySelectorAll('.node-group').forEach(n => n.classList.remove('selected'));
}

// ── Tooltip au survol d'un équipement ──
const _tooltip = {
  el: null,
  bind() {
    this.el = document.getElementById('node-tooltip');
    if (!this.el) return;
    document.addEventListener('mouseover', e => {
      const grp = e.target.closest && e.target.closest('.node-group');
      if (!grp) return;
      const id = +grp.getAttribute('data-id');
      const d  = currentTopoData?.devices.find(x => x.id === id);
      if (!d) return;
      const role   = d.role?.name || d.device_role?.name || '—';
      const site   = d.site?.name || '—';
      const status = d.status?.label || d.status?.value || '—';
      this.el.querySelector('.nt-name').textContent = d.name || '—';
      this.el.querySelector('.nt-meta').textContent = role + '  ·  ' + site + '  ·  ' + status;
      this.el.classList.add('show');
    });
    document.addEventListener('mousemove', e => {
      if (!this.el.classList.contains('show')) return;
      this.el.style.left = (e.clientX + 14) + 'px';
      this.el.style.top  = (e.clientY + 14) + 'px';
    });
    document.addEventListener('mouseout', e => {
      const grp = e.target.closest && e.target.closest('.node-group');
      if (grp && !grp.contains(e.relatedTarget)) this.el.classList.remove('show');
    });
  }
};
