// ══════════════════════════════════════════
//  EXPORT — PNG ×2 et XML draw.io
//
//  Responsabilité : export uniquement, pas de dépendance circulaire
//  Dépendances    : config.js (showZones, showLabels, activeFilters,
//                              currentTopoData, NODE_W, NODE_H, getLayer,
//                              getCableColor, hex, esc, t, showToast)
// ══════════════════════════════════════════

function toggleExport(e) {
  e.stopPropagation();
  document.getElementById('export-panel').classList.toggle('open');
}
document.addEventListener('click', () => document.getElementById('export-panel')?.classList.remove('open'));

// Nom de fichier avec suffixe de filtres actifs
function exportFilename(ext) {
  const f = [activeFilters.role, activeFilters.site, activeFilters.siteGroup, activeFilters.status].filter(Boolean);
  const suffix = f.length ? '_' + f.join('_').replace(/\s+/g,'-') : '';
  return `netbox-topology${suffix}_${new Date().toISOString().slice(0,10)}.${ext}`;
}

// Construit un SVG autonome prêt pour le rasteriseur
function buildExportSVG() {
  const scene = document.getElementById('scene');
  if (!scene || !currentTopoData?.canvasW) return null;
  const td  = currentTopoData;
  const W   = td.canvasW + 80, H = td.canvasH + 80, PAD = 40;
  const NS  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS,'svg');
  svg.setAttribute('xmlns',NS);
  svg.setAttribute('width',W); svg.setAttribute('height',H);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);

  const bg = document.createElementNS(NS,'rect');
  bg.setAttribute('width',W); bg.setAttribute('height',H); bg.setAttribute('fill','#030608');
  svg.appendChild(bg);

  const style = document.createElementNS(NS,'style');
  style.textContent =
    `.node-name{font-family:'DM Sans','Arial',sans-serif;font-size:11px;fill:#d8e3f5;font-weight:500}`
    + `.node-sub{font-family:'JetBrains Mono',monospace;font-size:8.5px;fill:#2e3f60}`
    + `.zone-label{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.65}`
    + `.edge{stroke-width:1.7;fill:none;opacity:.60}`
    + `.edge-label{font-family:'JetBrains Mono',monospace;font-size:8px}`;
  svg.appendChild(style);

  const clone = scene.cloneNode(true);
  clone.removeAttribute('transform');
  const g = document.createElementNS(NS,'g');
  g.setAttribute('transform',`translate(${PAD},${PAD})`);
  while (clone.firstChild) g.appendChild(clone.firstChild);
  svg.appendChild(g);

  // Filigrane avec filtres actifs
  const meta = [
    activeFilters.role   && 'Rôle: '   + activeFilters.role,
    activeFilters.site   && 'Site: '   + activeFilters.site,
    activeFilters.siteGroup && 'Groupe: ' + activeFilters.siteGroup,
    activeFilters.status && 'Statut: ' + activeFilters.status,
    !showZones   && 'Zones: off',
    showLabels   && 'Labels: on'
  ].filter(Boolean);
  if (meta.length) {
    const wm = document.createElementNS(NS,'text');
    wm.setAttribute('x',W-12); wm.setAttribute('y',H-10); wm.setAttribute('text-anchor','end');
    wm.setAttribute('font-family',"'JetBrains Mono',monospace"); wm.setAttribute('font-size','8'); wm.setAttribute('fill','#18243c');
    wm.textContent = meta.join('  ·  ');
    svg.appendChild(wm);
  }
  return svg;
}

// ── Export PNG ×2 ──
async function exportPNG() {
  document.getElementById('export-panel').classList.remove('open');
  if (!currentTopoData?.canvasW) { showToast("Chargez la topologie d'abord.", 'err'); return; }
  const ov  = document.getElementById('export-overlay');
  const msg = document.getElementById('export-overlay-msg');
  ov.classList.add('show'); msg.textContent = 'Génération PNG ×2…';
  try {
    const SCALE = 2, svg = buildExportSVG();
    if (!svg) throw new Error('SVG vide');
    const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type:'image/svg+xml' }));
    await new Promise((res,rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = W*SCALE; c.height = H*SCALE;
        const ctx = c.getContext('2d');
        ctx.scale(SCALE,SCALE); ctx.drawImage(img,0,0);
        URL.revokeObjectURL(url);
        c.toBlob(blob => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = exportFilename('png'); a.click(); res();
        }, 'image/png');
      };
      img.onerror = rej; img.src = url;
    });
    ov.classList.remove('show'); showToast('✓ Export PNG généré', 'ok');
  } catch(e) { ov.classList.remove('show'); showToast('Erreur PNG: ' + e.message, 'err'); }
}

// ── Export XML draw.io ──
function exportXML() {
  document.getElementById('export-panel').classList.remove('open');
  if (!currentTopoData?.canvasW) { showToast("Chargez la topologie d'abord.", 'err'); return; }
  const ov  = document.getElementById('export-overlay');
  const msg = document.getElementById('export-overlay-msg');
  ov.classList.add('show'); msg.textContent = 'Génération XML draw.io…';
  try {
    const td = currentTopoData, PAD = 40;
    const PW = td.canvasW + 80, PH = td.canvasH + 80;
    let cells = '', id = 10;
    const nm = {};

    if (showZones && td.zoneRects) td.zoneRects.forEach(z => {
      if (!z.layer) return;
      const c = hex(z.layer.color);
      cells += `<mxCell id="z${id++}" value="${esc(z.layer.label)}" style="swimlane;startSize=24;fillColor=#${c}18;strokeColor=#${c};strokeWidth=1;fontColor=#${c};fontSize=9;fontStyle=1;rounded=1;arcSize=5;" vertex="1" parent="1"><mxGeometry x="${z.x+PAD}" y="${z.y+PAD}" width="${z.w}" height="${z.h}" as="geometry"/></mxCell>\n`;
    });

    td.devices.forEach(d => {
      const pos = td.positions[d.id]; if (!pos) return;
      const l   = getLayer(d), c = hex(l.color);
      const cid = `d${d.id}`; nm[d.id] = cid;
      const label = esc(d.name || `Device #${d.id}`);
      const sub   = esc([d.role?.name||d.device_role?.name||'', d.site?.name||''].filter(Boolean).join(' · '));
      cells += `<mxCell id="${cid}" value="&lt;b&gt;${label}&lt;/b&gt;&lt;br/&gt;&lt;font color=&quot;#2e3f60&quot; style=&quot;font-size:8.5px&quot;&gt;${sub}&lt;/font&gt;" style="rounded=1;arcSize=9;fillColor=#0c1018;strokeColor=#${c};strokeWidth=1.1;fontColor=#d8e3f5;fontSize=11;align=left;spacingLeft=10;html=1;" vertex="1" parent="1"><mxGeometry x="${pos.x+PAD}" y="${pos.y+PAD}" width="${NODE_W}" height="${NODE_H}" as="geometry"/></mxCell>\n`;
    });

    td.edges.forEach(edge => {
      const src = nm[edge.aId], tgt = nm[edge.bId]; if (!src||!tgt) return;
      edge.cables.forEach((cable,ci) => {
        const c   = hex(getCableColor(cable.color));
        const off = (ci - (edge.cables.length-1)/2) * 9;
        const xs  = off!==0 ? `exitX=0.5;exitY=1;exitDx=${off};exitDy=0;entryX=0.5;entryY=0;entryDx=${-off};entryDy=0;` : '';
        cells += `<mxCell id="e${id++}" value="${esc(cable.label||'')}" style="rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;endFill=0;strokeColor=#${c};strokeWidth=2;opacity=65;${xs}" edge="1" source="${src}" target="${tgt}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>\n`;
      });
    });

    const metaStr = [
      activeFilters.role   && 'Rôle: '   + activeFilters.role,
      activeFilters.site   && 'Site: '   + activeFilters.site,
      activeFilters.siteGroup && 'Groupe: ' + activeFilters.siteGroup,
      activeFilters.status && 'Statut: ' + activeFilters.status
    ].filter(Boolean).join(' | ');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- NetBox Topology — ${new Date().toISOString()}${metaStr?' | '+metaStr:''} -->\n<mxfile host="app.diagrams.net" type="device">\n  <diagram name="NetBox Topology">\n    <mxGraphModel dx="0" dy="0" grid="0" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${PW}" pageHeight="${PH}" background="#030608" math="0" shadow="0">\n      <root>\n        <mxCell id="0"/>\n        <mxCell id="1" parent="0"/>\n        ${cells}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([xml], { type:'application/xml' }));
    a.download = exportFilename('xml'); a.click();
    ov.classList.remove('show'); showToast('✓ Export XML draw.io généré', 'ok');
  } catch(e) { ov.classList.remove('show'); showToast('Erreur XML: ' + e.message, 'err'); }
}
