// ══════════════════════════════════════════
//  TOPOLOGY — buildTopology() + layout 3 colonnes + rendu SVG
//
//  Responsabilité : SVG uniquement, consomme données de api.js
//  Dépendances    : config.js (getLayers, getLayer, getCableColor, CONFIG,
//                              NODE_H, COL_GAP, NODE_W, _nw, _step, showZones,
//                              showLabels, currentTopoData, esc, hex)
// ══════════════════════════════════════════

// ── Constantes de layout virtuel ──
const VIRT_ROW_GAP   = 50;
const BUBBLE_PAD_X   = 16;
const BUBBLE_PAD_Y   = 14;
const BUBBLE_LABEL_H = 22;
const BUBBLE_GAP     = 22;

// ── Dimensions d'une sous-couche ──
function getSubLayerDims(sl) {
  if (sl.layer.virtualGroups != null) return getVirtualDims(sl.nodes, sl.layer);
  if (sl.layer.gridLayout) {
    const mpr    = sl.layer.gridMaxPerRow || 5;
    const rows   = Math.ceil(sl.nodes.length / mpr);
    const perRow = Math.min(sl.nodes.length, mpr);
    const rowW   = sl.nodes.slice(0, perRow).reduce((s,d) => s + _step(d), 0) - COL_GAP;
    return { w: Math.max(rowW, NODE_W), h: rows * NODE_H + Math.max(0, rows-1) * V_GAP };
  }
  const totalW = sl.nodes.reduce((s,d) => s + _step(d), 0) - COL_GAP;
  return { w: Math.max(totalW, NODE_W), h: NODE_H };
}

// ── Configuration du layout virtuel (peut être porté par n'importe quelle couche) ──
function getVirtualConfig(layer) {
  // Priorité : la couche passée en param, sinon toute couche avec virtualGroups
  const vl     = layer || getLayers().find(l => (l.virtualGroups||[]).length > 0);
  const groups = (vl && Array.isArray(vl.virtualGroups)) ? vl.virtualGroups : [];
  const sw   = groups.find(g => g.family === 'sw')?.prefixes   || [];
  const esx  = groups.find(g => g.family === 'esx')?.prefixes  || [];
  const vrtx = groups.find(g => g.family === 'vrtx')?.prefixes || [];
  const custom = groups.filter(g => !['sw','esx','vrtx','other'].includes(g.family));
  return { swPrefixes: sw, esxPrefixes: esx, vrtxPrefixes: vrtx, customGroups: custom };
}

function classifyVirtNode(name, cfg) {
  const n = (name||'').toUpperCase();
  const { swPrefixes, esxPrefixes, vrtxPrefixes, customGroups = [] } = cfg || getVirtualConfig();
  for (const p of swPrefixes)   if (n.startsWith(p.toUpperCase())) return { family:'sw',   prefix:p };
  for (const p of esxPrefixes)  if (n.startsWith(p.toUpperCase())) return { family:'esx',  prefix:p };
  for (const p of vrtxPrefixes) if (n.startsWith(p.toUpperCase())) return { family:'vrtx', prefix:p };
  for (const g of customGroups) {
    for (const p of (g.prefixes||[])) {
      if (n.startsWith(p.toUpperCase())) return { family: g.family, prefix: p };
    }
  }
  return { family:'other', prefix:'OTHER' };
}

function splitVirtualGroups(nodes, layer) {
  const cfg = getVirtualConfig(layer);
  const sw={}, esx={}, vrtx={}, generic={}, other=[];
  nodes.forEach(d => {
    const { family, prefix } = classifyVirtNode(d.name, cfg);
    const name = (d.name||'').toUpperCase();
    if (family === 'sw') {
      if (!sw[prefix]) sw[prefix] = { top:[], bot:[], mgmt:[] };
      if      (name.includes('TOP'))  sw[prefix].top.push(d);
      else if (name.includes('BOT'))  sw[prefix].bot.push(d);
      else if (name.includes('MGMT')) sw[prefix].mgmt.push(d);
      else                            sw[prefix].top.push(d);
    } else if (family === 'esx')  { if (!esx[prefix])  esx[prefix]=[];  esx[prefix].push(d); }
      else if (family === 'vrtx') { if (!vrtx[prefix]) vrtx[prefix]=[]; vrtx[prefix].push(d); }
      else if (family !== 'other') {
        const key = family+':'+prefix;
        if (!generic[key]) generic[key] = { family, prefix, nodes:[] };
        generic[key].nodes.push(d);
      } else { other.push(d); }
  });
  const sortFn = (a,b) => (a.name||'').localeCompare(b.name||'');
  Object.values(sw).forEach(g => { g.top.sort(sortFn); g.bot.sort(sortFn); g.mgmt.sort(sortFn); });
  Object.values(esx).forEach(arr  => arr.sort(sortFn));
  Object.values(vrtx).forEach(arr => arr.sort(sortFn));
  Object.values(generic).forEach(g => g.nodes.sort(sortFn));
  other.sort(sortFn);
  const { swPrefixes, esxPrefixes, vrtxPrefixes, customGroups } = cfg;
  const swGroups      = swPrefixes.filter(p => sw[p]).map(p => ({ prefix:p, ...sw[p] }));
  const esxGroups     = esxPrefixes.filter(p => esx[p]).map(p => ({ prefix:p, nodes:esx[p] }));
  const vrtxGroups    = vrtxPrefixes.filter(p => vrtx[p]).map(p => ({ prefix:p, nodes:vrtx[p] }));
  const genericGroups = customGroups.flatMap(g =>
    (g.prefixes||[]).filter(p => generic[g.family+':'+p]).map(p => generic[g.family+':'+p])
  );
  return { swGroups, esxGroups, vrtxGroups, vrtxNodes: other, genericGroups };
}

function swBubbleW(grp)   { const topRow=[...grp.top,...grp.mgmt], botRow=grp.bot; const tw=topRow.reduce((s,d)=>s+_step(d),0)-COL_GAP; const bw=botRow.reduce((s,d)=>s+_step(d),0)-COL_GAP; return Math.max(tw,bw,NODE_W); }
function esxBubbleW(nodes){ const row=nodes.slice(0,2); return Math.max(row.reduce((s,d)=>s+_step(d),0)-COL_GAP, NODE_W); }
function swBubbleH(grp)   { const rows = grp.bot.length > 0 ? 2 : 1; return rows * NODE_H + (rows-1) * V_GAP; }
function esxBubbleH(nodes){ const rows = Math.ceil(nodes.length / 2); return rows * NODE_H + (rows-1) * V_GAP; }

function genericBubbleW(nodes) { return Math.max(nodes.reduce((s,d)=>s+_step(d),0)-COL_GAP, NODE_W); }
function bubbleGridW(nodes, mpr) {
  const perRow = Math.min(nodes.length, mpr);
  return Math.max(nodes.slice(0,perRow).reduce((s,d)=>s+_step(d),0)-COL_GAP, NODE_W);
}
function bubbleGridH(nodes, mpr) {
  const rows = Math.ceil(nodes.length / mpr);
  return rows * NODE_H + Math.max(0, rows-1) * V_GAP;
}
function positionBubbleNodes(nodes, innerX, innerY, positions, mpr) {
  const effectiveMpr = mpr || nodes.length;
  nodes.forEach((d, i) => {
    const row = Math.floor(i / effectiveMpr);
    const offsetX = nodes.slice(row*effectiveMpr, i).reduce((s,x)=>s+_step(x), 0);
    positions[d.id] = { x: innerX + offsetX, y: innerY + row*(NODE_H+V_GAP) };
  });
}

function buildBubbleItems(swGroups, esxGroups, vrtxGroups, genericGroups, mpr) {
  const P2 = BUBBLE_PAD_X * 2;
  const items = [];
  swGroups.forEach(g => {
    const nodes = [...g.top,...g.mgmt,...g.bot];
    items.push({ type:'sw', g, nodes,
      w: (mpr ? bubbleGridW(nodes,mpr) : swBubbleW(g)) + P2,
      ch: mpr ? bubbleGridH(nodes,mpr) : swBubbleH(g)
    });
  });
  esxGroups.forEach(g => {
    items.push({ type:'esx', g, nodes:g.nodes,
      w: (mpr ? bubbleGridW(g.nodes,mpr) : esxBubbleW(g.nodes)) + P2,
      ch: mpr ? bubbleGridH(g.nodes,mpr) : esxBubbleH(g.nodes)
    });
  });
  [...vrtxGroups, ...genericGroups].forEach(g => {
    items.push({ type:'flat', g, nodes:g.nodes,
      w: (mpr ? bubbleGridW(g.nodes,mpr) : genericBubbleW(g.nodes)) + P2,
      ch: mpr ? bubbleGridH(g.nodes,mpr) : NODE_H
    });
  });
  items.forEach(b => { b.h = b.ch + BUBBLE_PAD_Y*2 + BUBBLE_LABEL_H; });
  return items;
}

function getVirtualDims(nodes, layer) {
  const { swGroups, esxGroups, vrtxGroups, vrtxNodes, genericGroups } = splitVirtualGroups(nodes, layer);
  const P2  = BUBBLE_PAD_X * 2;
  const mpr = layer?.gridLayout ? (layer.gridMaxPerRow || FWD_MAX) : null;
  const bpr = (layer?.bubbleMaxPerRow > 0) ? layer.bubbleMaxPerRow : 0;

  // Pas de groupes → ligne simple
  if (swGroups.length === 0 && esxGroups.length === 0 && vrtxGroups.length === 0 && genericGroups.length === 0) {
    const totalW = vrtxNodes.reduce((s,d) => s + _step(d), 0) - COL_GAP;
    return { w: Math.max(totalW, NODE_W), h: NODE_H };
  }

  // Grille de bulles (bubbleMaxPerRow)
  if (bpr > 0) {
    const items = buildBubbleItems(swGroups, esxGroups, vrtxGroups, genericGroups, mpr);
    if (items.length === 0) return { w: NODE_W, h: NODE_H };
    const rows = [];
    for (let i = 0; i < items.length; i += bpr) rows.push(items.slice(i, i+bpr));
    const totalW = Math.max(...rows.map(r => r.reduce((s,b)=>s+b.w+BUBBLE_GAP,-BUBBLE_GAP)));
    const totalH = rows.reduce((s,r,ri) => s + Math.max(...r.map(b=>b.h)) + (ri>0?BUBBLE_GAP:0), 0);
    return { w: Math.max(totalW, NODE_W), h: Math.max(totalH, NODE_H) };
  }

  const swWidths = swGroups.map(g => {
    const ns = [...g.top,...g.mgmt,...g.bot];
    return (mpr ? bubbleGridW(ns, mpr) : swBubbleW(g)) + P2;
  });
  const swLineW = swWidths.filter(w=>w>0).reduce((a,b) => a+b+BUBBLE_GAP, -BUBBLE_GAP);
  const swLineH = swGroups.length > 0
    ? Math.max(...swGroups.map(g => {
        const ns = [...g.top,...g.mgmt,...g.bot];
        return (mpr ? bubbleGridH(ns, mpr) : swBubbleH(g)) + BUBBLE_PAD_Y*2 + BUBBLE_LABEL_H;
      }))
    : 0;

  const esxWidths  = esxGroups.map(g  => (mpr ? bubbleGridW(g.nodes, mpr) : esxBubbleW(g.nodes)) + P2);
  const vrtxWidths = vrtxGroups.map(g => (mpr ? bubbleGridW(g.nodes, mpr) : genericBubbleW(g.nodes)) + P2);
  const genWidths  = genericGroups.map(g => (mpr ? bubbleGridW(g.nodes, mpr) : genericBubbleW(g.nodes)) + P2);
  const esxLineW   = [...esxWidths, ...vrtxWidths, ...genWidths].filter(w=>w>0).reduce((a,b)=>a+b+BUBBLE_GAP, -BUBBLE_GAP);
  const esxLineH   = esxGroups.length > 0
    ? Math.max(...esxGroups.map(g => (mpr ? bubbleGridH(g.nodes, mpr) : esxBubbleH(g.nodes)) + BUBBLE_PAD_Y*2 + BUBBLE_LABEL_H))
    : (vrtxGroups.length > 0 || genericGroups.length > 0 ? NODE_H + BUBBLE_PAD_Y*2 + BUBBLE_LABEL_H : 0);

  const hasSwRow  = swGroups.length > 0;
  const hasEsxRow = esxGroups.length > 0 || vrtxGroups.length > 0 || genericGroups.length > 0;
  const totalH    = (hasSwRow ? swLineH : 0)
                  + (hasSwRow && hasEsxRow ? VIRT_ROW_GAP : 0)
                  + (hasEsxRow ? esxLineH : 0);

  // vrtxNodes (équipements sans famille) sont placés après les groupes esx/vrtx/generic
  // sur la même ligne Y — leur largeur doit être incluse dans le w retourné
  const vrtxNodesW = vrtxNodes.length > 0
    ? (hasEsxRow ? BUBBLE_GAP : 0) + Math.max(vrtxNodes.reduce((s,d) => s + _step(d), 0) - COL_GAP, 0)
    : 0;

  return { w: Math.max(Math.max(swLineW, 0), Math.max(esxLineW, 0) + vrtxNodesW, NODE_W), h: Math.max(totalH, NODE_H) };
}

function positionVirtualNodes(sl, startX, startY, positions) {
  const { swGroups, esxGroups, vrtxGroups, vrtxNodes, genericGroups } = splitVirtualGroups(sl.nodes, sl.layer);
  const P2  = BUBBLE_PAD_X * 2;
  const mpr = sl.layer?.gridLayout ? (sl.layer.gridMaxPerRow || FWD_MAX) : null;
  const bpr = (sl.layer?.bubbleMaxPerRow > 0) ? sl.layer.bubbleMaxPerRow : 0;

  // Ligne simple si pas de groupes
  if (swGroups.length === 0 && esxGroups.length === 0 && vrtxGroups.length === 0 && genericGroups.length === 0) {
    let curX = startX;
    vrtxNodes.forEach(d => { positions[d.id] = { x: curX, y: startY }; curX += _step(d); });
    return;
  }

  // Grille de bulles (bubbleMaxPerRow)
  if (bpr > 0) {
    const items = buildBubbleItems(swGroups, esxGroups, vrtxGroups, genericGroups, mpr);
    let bx = startX, by = startY, col = 0, rowMaxH = 0;
    items.forEach(b => {
      b.bx = bx; b.by = by;
      rowMaxH = Math.max(rowMaxH, b.h);
      bx += b.w + BUBBLE_GAP;
      col++;
      if (col >= bpr) { by += rowMaxH + BUBBLE_GAP; bx = startX; col = 0; rowMaxH = 0; }
    });
    items.forEach(b => {
      const innerX = b.bx + BUBBLE_PAD_X, innerY = b.by + BUBBLE_PAD_Y;
      if (mpr) {
        positionBubbleNodes(b.nodes, innerX, innerY, positions, mpr);
      } else if (b.type === 'sw') {
        [...b.g.top,...b.g.mgmt].forEach((d,ci,arr) => {
          positions[d.id] = { x: innerX+arr.slice(0,ci).reduce((s,x)=>s+_step(x),0), y: innerY };
        });
        b.g.bot.forEach((d,ci,arr) => {
          positions[d.id] = { x: innerX+arr.slice(0,ci).reduce((s,x)=>s+_step(x),0), y: innerY+NODE_H+V_GAP };
        });
      } else if (b.type === 'esx') {
        b.nodes.forEach((d,i) => {
          const off = i%2===0 ? 0 : _step(b.nodes[i-1]);
          positions[d.id] = { x: innerX+off, y: innerY+Math.floor(i/2)*(NODE_H+V_GAP) };
        });
      } else {
        positionBubbleNodes(b.nodes, innerX, innerY, positions, null);
      }
    });
    let curX = startX;
    vrtxNodes.forEach(d => { positions[d.id]={x:curX, y:by+BUBBLE_PAD_Y}; curX+=_step(d); });
    return;
  }

  // Layout avec bulles
  let curX = startX;
  swGroups.forEach(grp => {
    const innerX = curX + BUBBLE_PAD_X, innerY = startY + BUBBLE_PAD_Y;
    if (mpr) {
      positionBubbleNodes([...grp.top,...grp.mgmt,...grp.bot], innerX, innerY, positions, mpr);
      curX += bubbleGridW([...grp.top,...grp.mgmt,...grp.bot], mpr) + P2 + BUBBLE_GAP;
    } else {
      [...grp.top, ...grp.mgmt].forEach((d,ci,arr) => {
        positions[d.id] = { x: innerX + arr.slice(0,ci).reduce((s,x)=>s+_step(x),0), y: innerY };
      });
      grp.bot.forEach((d,ci,arr) => {
        positions[d.id] = { x: innerX + arr.slice(0,ci).reduce((s,x)=>s+_step(x),0), y: innerY + NODE_H + V_GAP };
      });
      curX += swBubbleW(grp) + P2 + BUBBLE_GAP;
    }
  });

  const swLineH   = swGroups.length > 0
    ? Math.max(...swGroups.map(g => {
        const ns = [...g.top,...g.mgmt,...g.bot];
        return (mpr ? bubbleGridH(ns, mpr) : swBubbleH(g)) + BUBBLE_PAD_Y*2 + BUBBLE_LABEL_H;
      }))
    : 0;
  const esxStartY = startY + swLineH + (swGroups.length > 0 ? VIRT_ROW_GAP : 0);

  curX = startX;
  esxGroups.forEach(grp => {
    const innerX = curX + BUBBLE_PAD_X, innerY = esxStartY + BUBBLE_PAD_Y;
    if (mpr) {
      positionBubbleNodes(grp.nodes, innerX, innerY, positions, mpr);
      curX += bubbleGridW(grp.nodes, mpr) + P2 + BUBBLE_GAP;
    } else {
      grp.nodes.forEach((d,i) => {
        const col = i % 2, colOffset = col === 0 ? 0 : _step(grp.nodes[i-1]);
        positions[d.id] = { x: innerX + colOffset, y: innerY + Math.floor(i/2)*(NODE_H+V_GAP) };
      });
      curX += esxBubbleW(grp.nodes) + P2 + BUBBLE_GAP;
    }
  });

  // vrtxGroups : bulles (ligne ou grille)
  vrtxGroups.forEach(g => {
    const innerX = curX + BUBBLE_PAD_X, innerY = esxStartY + BUBBLE_PAD_Y;
    positionBubbleNodes(g.nodes, innerX, innerY, positions, mpr || null);
    curX += (mpr ? bubbleGridW(g.nodes, mpr) : genericBubbleW(g.nodes)) + P2 + BUBBLE_GAP;
  });

  // Groupes génériques (familles libres)
  genericGroups.forEach(g => {
    const innerX = curX + BUBBLE_PAD_X, innerY = esxStartY + BUBBLE_PAD_Y;
    positionBubbleNodes(g.nodes, innerX, innerY, positions, mpr || null);
    curX += (mpr ? bubbleGridW(g.nodes, mpr) : genericBubbleW(g.nodes)) + P2 + BUBBLE_GAP;
  });

  // Nœuds non classifiés (other) en ligne simple
  vrtxNodes.forEach(d => { positions[d.id] = { x: curX, y: esxStartY + BUBBLE_PAD_Y }; curX += _step(d); });
}

function positionFWDNodes(nodes, startX, startY, positions) {
  positionGridNodes(nodes, startX, startY, positions, FWD_MAX);
}

// Grille générique : maxPerRow nœuds par ligne (paramétrable via layer.gridMaxPerRow)
function positionGridNodes(nodes, startX, startY, positions, maxPerRow) {
  const mpr = maxPerRow || FWD_MAX;
  nodes.sort((a,b) => a.name.localeCompare(b.name));
  nodes.forEach((d,i) => {
    const row      = Math.floor(i / mpr);
    const rowNodes = nodes.slice(row*mpr, i);
    const offsetX  = rowNodes.reduce((s,x) => s + _step(x), 0);
    positions[d.id] = { x: startX + offsetX, y: startY + row*(NODE_H+V_GAP) };
  });
}

// ══════════════════════════════════════════════════════════════
//  BUILD TOPOLOGY — layout N colonnes générique
// ══════════════════════════════════════════════════════════════
function buildTopology(devices, cables, hiddenCols = []) {
  // Précalcul des largeurs par équipement (avant layout)
  const nodeWidths = {}; _nodeWidths = nodeWidths;
  devices.forEach(d => {
    const nm  = d.name || `Device #${d.id}`;
    const rn  = d.role?.name || d.device_role?.name || '';
    const sn  = d.site?.name || '';
    const sub = [rn, sn].filter(Boolean).join(' · ');
    nodeWidths[d.id] = measureNodeW(nm, sub);
  });
  function nw(d)   { return nodeWidths[d.id] || NODE_W; }
  function step(d) { return nw(d) + COL_GAP; }

  // Construction du graphe de câbles
  const adj = {}, cableMap = {};
  devices.forEach(d => { adj[d.id] = []; });
  cables.forEach(c => {
    (c.a_terminations||[]).forEach(aT => {
      (c.b_terminations||[]).forEach(bT => {
        const aId = aT.object?.device?.id, bId = bT.object?.device?.id;
        if (!aId || !bId || aId === bId) return;
        if (!adj[aId]) adj[aId] = []; if (!adj[bId]) adj[bId] = [];
        if (!adj[aId].includes(bId)) adj[aId].push(bId);
        if (!adj[bId].includes(aId)) adj[bId].push(aId);
        const key = [aId,bId].sort().join('-');
        if (!cableMap[key]) cableMap[key] = [];
        cableMap[key].push({
          id:c.id, label:c.label||'', color:c.color||'',
          type:c.type||'', type_display:c.type_display||c.type||'',
          status:c.status?.label||c.status?.value||c.status||'',
          description:c.description||'',
          ifA:aT.object?.name||'', ifB:bT.object?.name||''
        });
      });
    });
  });

  // ── Colonnes dynamiques triées par pos ──
  const cols = getColumns().sort((a,b) => a.pos - b.pos).filter(c => !hiddenCols.includes(c.key));
  const validColKeys = new Set(cols.map(c => c.key));
  const fallbackCol  = cols[0]?.key || 'mid';

  // Organisation des équipements par colonne + ordre
  const byCol = {};
  cols.forEach(c => { byCol[c.key] = {}; });
  devices.forEach(d => {
    const l      = getLayer(d);
    const colKey = validColKeys.has(l.col) ? l.col : fallbackCol;
    if (!byCol[colKey][l.order])        byCol[colKey][l.order] = {};
    if (!byCol[colKey][l.order][l.key]) byCol[colKey][l.order][l.key] = { layer:l, nodes:[] };
    byCol[colKey][l.order][l.key].nodes.push(d);
  });

  // Garantir que toutes les couches configurées au même ordre/col s'affichent côte à côte
  getLayers().forEach(l => {
    const colKey = validColKeys.has(l.col) ? l.col : null;
    if (!colKey) return;
    if (!byCol[colKey][l.order]) byCol[colKey][l.order] = {};
    if (!byCol[colKey][l.order][l.key]) byCol[colKey][l.order][l.key] = { layer: l, nodes: [] };
  });

  function toRows(colData) {
    return Object.keys(colData).map(Number).sort((a,b) => a-b)
      .map(ord => {
        const allSLs = Object.values(colData[ord]);
        if (!allSLs.some(sl => sl.nodes.length > 0)) return null; // tout vide → skip
        return { order: ord, subLayers: allSLs };
      })
      .filter(r => r !== null);
  }

  function slW(sl) { return getSubLayerDims(sl).w; }
  function slH(sl) { return getSubLayerDims(sl).h; }
  function rowW(sls) { return sls.reduce((a,sl,i) => a + slW(sl) + (i>0 ? SUB_GAP : 0), 0); }

  // Calcul des largeurs et positions X de chaque colonne
  const colRows = {}, colW = {}, colX = {};
  let curX = 0;
  cols.forEach(col => {
    const rows  = colRows[col.key] = toRows(byCol[col.key]);
    const maxW = rows.length > 0 ? Math.max(...rows.map(r => rowW(r.subLayers)), NODE_W) : NODE_W;
    colW[col.key] = maxW + ZPS * 2;
    colX[col.key] = curX;
    curX += colW[col.key] + COL_SEP;
  });
  const canvasW = Math.max(0, curX - (cols.length > 0 ? COL_SEP : 0));

  // Y partagés : source de vérité = registre des lignes globales (getRows())
  // Garantit que les lignes vides réservent quand même leur espace vertical
  const allOrders = getRows().map(r => r.order).sort((a,b)=>a-b);
  // Ajouter aussi les orders de layers orphelins (order non dans getRows())
  const rowOrderSet = new Set(allOrders);
  cols.flatMap(c => (colRows[c.key]||[]).map(r => r.order)).forEach(o => {
    if (!rowOrderSet.has(o)) { allOrders.push(o); rowOrderSet.add(o); }
  });
  allOrders.sort((a,b)=>a-b);
  const lastOrd = allOrders.length > 0 ? allOrders[allOrders.length-1] : 0;

  const orderContentH = {};
  allOrders.forEach(ord => {
    const allSLsAtOrd = cols.flatMap(c => {
      const row = (colRows[c.key]||[]).find(r => r.order === ord);
      return row ? row.subLayers : [];
    });
    if (allSLsAtOrd.length === 0) {
      // Ligne vide : espace minimal réservé pour garantir l'alignement
      orderContentH[ord] = NODE_H;
      return;
    }
    const heights = allSLsAtOrd.map(sl => slH(sl));
    orderContentH[ord] = heights.length > 0 ? Math.max(...heights) : NODE_H;
  });


  const orderY = {};
  let curY = 20;
  allOrders.forEach(ord => {
    orderY[ord] = curY;
    curY += orderContentH[ord] + ZPT + ZPB + ROW_GAP;
  });
  const canvasH = curY;

  const positions = {}, zoneRects = [], usedLayers = [];
  function trackLayer(sl) {
    if (!usedLayers.find(u => u.layer.key === sl.layer.key)) usedLayers.push(sl);
  }

  // ─── Positionnement générique : boucle sur toutes les colonnes ───
  cols.forEach(col => {
    const cX   = colX[col.key], cW = colW[col.key];
    const rows  = colRows[col.key] || [];
    if (!rows.length) return;

    // ── Nuage WAN (fond SVG) ──
    if (CONFIG.wanCloud?.enabled) {
      const srcKey  = CONFIG.wanCloud.sourceLayer;
      const tgtKey  = CONFIG.wanCloud.targetLayer;
      const srcR    = rows.filter(r => r.subLayers.some(sl => sl.layer.key === srcKey));
      const tgtR    = rows.filter(r => r.subLayers.some(sl => sl.layer.key === tgtKey));
      if (srcR.length > 0 && tgtR.length > 0) {
        const srcLastOrd  = Math.max(...srcR.map(r => r.order));
        const tgtFirstOrd = Math.min(...tgtR.map(r => r.order));
        const srcBotY = orderY[srcLastOrd] + orderContentH[srcLastOrd] + ZPT + ZPB;
        const tgtTopY = orderY[tgtFirstOrd];
        if (tgtTopY > srcBotY) {
          const WAN_H = 90, WAN_W = cW * 0.82;
          const gapMid = srcBotY + (tgtTopY - srcBotY) / 2;
          const wanY   = gapMid - WAN_H / 2;
          zoneRects.push({
            isWANCloud: true,
            x: cX + (cW - WAN_W)/2, y: wanY, w: WAN_W, h: WAN_H,
            cx: cX + cW/2, cy: wanY + WAN_H/2,
            entryY: wanY + WAN_H * 0.08, exitY: wanY + WAN_H * 0.92,
            layer: null
          });
        }
      }
    }

    // ── Toutes les couches : positionnement côte à côte par ligne (virtual et normales unifiées) ──
    rows.forEach(row => {
      const ord = row.order;
      const y   = orderY[ord];
      const layerOrder = getLayers().map(l => l.key);
      const sorted = [...row.subLayers].sort((a,b) => {
        const ia = layerOrder.indexOf(a.layer.key), ib = layerOrder.indexOf(b.layer.key);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      if (sorted.length === 1) {
        const sl = sorted[0];
        trackLayer(sl);
        const zh = slH(sl) + ZPT + ZPB;
        const w  = slW(sl);
        const sx = cX + ZPS + (cW - ZPS*2 - w) / 2;
        if (sl.layer.virtualGroups != null) {
          zoneRects.push({ layer:sl.layer, isVirtZone:true, isFullWidth:true, x:cX, y, w:cW, h:zh });
          positionVirtualNodes(sl, sx, y + ZPT, positions);
        } else if (sl.layer.gridLayout) {
          positionGridNodes(sl.nodes, sx, y+ZPT, positions, sl.layer.gridMaxPerRow || FWD_MAX);
          zoneRects.push({ layer:sl.layer, isFullWidth:true, x:cX, y, w:cW, h:zh });
        } else {
          sl.nodes.forEach((d,ci,arr) => { positions[d.id] = { x: sx + arr.slice(0,ci).reduce((s,x)=>s+step(x),0), y: y+ZPT }; });
          zoneRects.push({ layer:sl.layer, isFullWidth:true, x:cX, y, w:cW, h:zh });
        }
      } else {
        // Plusieurs sublayers : côte à côte (virtual et normales traitées pareillement)
        const tw    = rowW(sorted);
        const maxZh = Math.max(...sorted.map(sl => slH(sl))) + ZPT + ZPB;
        let xc = cX + ZPS + (cW - ZPS*2 - tw) / 2;
        sorted.forEach(sl => {
          trackLayer(sl);
          const w = slW(sl);
          // maxZh uniformisé pour éviter la superposition visuelle entre zones de hauteurs différentes
          if (sl.layer.virtualGroups != null) {
            zoneRects.push({ layer:sl.layer, isVirtZone:true, isSubZone:true, x:xc-ZPS/2, y, w:w+ZPS, h:maxZh });
            positionVirtualNodes(sl, xc, y + ZPT, positions);
          } else if (sl.layer.gridLayout) {
            positionGridNodes(sl.nodes, xc, y+ZPT, positions, sl.layer.gridMaxPerRow || FWD_MAX);
            zoneRects.push({ layer:sl.layer, isSubZone:true, x:xc-ZPS/2, y, w:w+ZPS, h:maxZh });
          } else {
            sl.nodes.forEach((d,ci,arr) => { positions[d.id] = { x: xc + arr.slice(0,ci).reduce((s,x)=>s+step(x),0), y: y+ZPT }; });
            zoneRects.push({ layer:sl.layer, isSubZone:true, x:xc-ZPS/2, y, w:w+ZPS, h:maxZh });
          }
          xc += w + SUB_GAP;
        });
        zoneRects.push({ layer:null, isBackground:true, x:cX, y, w:cW, h:maxZh });
      }
    });
  });

  const edgeList = [], seen = new Set();
  Object.keys(cableMap).forEach(key => {
    if (seen.has(key)) return; seen.add(key);
    const [aId,bId] = key.split('-').map(Number);
    edgeList.push({ aId, bId, cables: cableMap[key] });
  });

  return { devices, cables, positions, edges: edgeList, zoneRects, usedLayers,
           usedLayerKeys: new Set(usedLayers.map(l=>l.layer.key)),
           adj, cableMap, canvasW, canvasH, layerCount: usedLayers.length };
}

// ── Helpers pour sous-groupes virtuels ──
function groupVirtualSubgroups(virtDevices, layer) { return splitVirtualGroups(virtDevices, layer); }

function drawVirtualSubgroups(parentG, splitData, positions, zoneColor, elFn, layer) {
  const { swGroups, esxGroups, vrtxGroups = [], vrtxNodes = [], genericGroups = [] } = splitData;
  function drawBubble(nodes, label, bubble) {
    if (nodes.length === 0) return;
    const nodePos = nodes.map(d => positions[d.id]).filter(Boolean);
    if (nodePos.length === 0) return;
    const minX = Math.min(...nodePos.map(p=>p.x));
    const minY = Math.min(...nodePos.map(p=>p.y));
    const maxX = Math.max(...nodes.filter(d=>positions[d.id]).map(d=>positions[d.id].x+_nw(d)));
    const maxY = Math.max(...nodePos.map(p=>p.y+NODE_H));
    const bx = minX - BUBBLE_PAD_X, by = minY - BUBBLE_PAD_Y;
    const bw = maxX - minX + BUBBLE_PAD_X*2, bh = maxY - minY + BUBBLE_PAD_Y*2;
    const _light   = document.documentElement.dataset.theme === 'light';
    const _bStroke = _light ? 'rgba(15,23,42,0.45)'   : 'rgba(216,227,245,0.22)';
    const _bLabel  = _light ? 'rgba(15,23,42,0.65)'   : 'rgba(216,227,245,0.55)';
    if (bubble) {
      parentG.appendChild(elFn('rect', {
        x:bx, y:by, width:bw, height:bh, rx:Math.min(bh/2,30),
        fill:'none', stroke:_bStroke, 'stroke-width':'1.2', 'stroke-dasharray':'3,3'
      }));
    }
    if (label) {
      const lbl = elFn('text', {
        x: bx+bw/2, y: by+bh+BUBBLE_LABEL_H/2,
        'text-anchor':'middle', 'dominant-baseline':'central',
        fill:_bLabel, 'font-family':"'DM Sans',sans-serif",
        'font-size':'10.5', 'font-weight':'600'
      });
      lbl.textContent = label;
      parentG.appendChild(lbl);
    }
  }
  swGroups.forEach(grp => drawBubble([...grp.top,...grp.mgmt,...grp.bot], grp.prefix, true));
  esxGroups.forEach(grp => drawBubble(grp.nodes, grp.prefix, true));
  vrtxGroups.forEach(grp => drawBubble(grp.nodes, grp.prefix, true));
  genericGroups.forEach(grp => drawBubble(grp.nodes, grp.prefix, true));
}

// ── Opacités des zones selon le thème (clair = plus saturé) ──
function _zoneOp() {
  const light = document.documentElement.dataset.theme === 'light';
  return {
    fillFull:    light ? '0.18' : '0.035',
    fillSub:     light ? '0.30' : '0.07',
    fillGrid:    light ? '0.20' : '0.06',
    strokeFull:  light ? '0.60' : '0.16',
    strokeSub:   light ? '0.75' : '0.28',
    strokeGrid:  light ? '0.65' : '0.22',
    labelBg:     light ? 'var(--ink2)' : '#030608',
    labelBgOp:   light ? '1'    : '0.90',
  };
}

// ══════════════════════════════════════════════════════════════
//  RENDER — dessin SVG complet
// ══════════════════════════════════════════════════════════════
function render({ devices, edges, positions, zoneRects, usedLayers }) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs={}) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v));
    return e;
  };
  const EL = document.getElementById('edges-layer');
  const NL = document.getElementById('nodes-layer');
  const ZL = document.getElementById('zones-layer');
  EL.innerHTML=''; NL.innerHTML=''; ZL.innerHTML='';
  const R = 8;
  render._wanCloud = null;

  const wanCloudOn  = !!(CONFIG.wanCloud && CONFIG.wanCloud.enabled);
  const srcLayerKey = (CONFIG.wanCloud && CONFIG.wanCloud.sourceLayer) || 'sdwan';
  const tgtLayerKey = (CONFIG.wanCloud && CONFIG.wanCloud.targetLayer) || 'firewall-distant';
  const sdwanIds = new Set(wanCloudOn ? devices.filter(d => getLayer(d).key === srcLayerKey).map(d=>d.id) : []);
  const fwdIds   = new Set(wanCloudOn ? devices.filter(d => getLayer(d).key === tgtLayerKey).map(d=>d.id) : []);

  // ── Zones ──
  if (showZones) {
    // Ordre de rendu SVG (du bas vers le haut) :
    // 1. Nuages WAN   2. Zones continues (grille/virtuel) = fond
    // 3. Backgrounds  4. Zones normales = premier plan
    const isContZone = z => z.isGridZone || z.isVirtZone;
    const clouds     = zoneRects.filter(z =>  z.isWANCloud);
    const contZones  = zoneRects.filter(z => !z.isWANCloud && isContZone(z));
    const bgs        = zoneRects.filter(z => !z.isWANCloud && !isContZone(z) &&  z.isBackground);
    const fgs        = zoneRects.filter(z => !z.isWANCloud && !isContZone(z) && !z.isBackground);
    [...clouds, ...contZones, ...bgs, ...fgs].forEach(z => {
      const g = el('g');
      if (z.isWANCloud) {
        const CX = z.x + z.w/2, CY = z.y + z.h/2;
        const RW = z.w/2, RH = z.h/2;

        function buildCloudPath(cx, cy, rw, rh) {
          const bumps = [
            { x: cx - rw*0.52, y: cy - rh*0.12, r: rh*0.54 },
            { x: cx - rw*0.18, y: cy - rh*0.44, r: rh*0.60 },
            { x: cx + rw*0.18, y: cy - rh*0.38, r: rh*0.56 },
            { x: cx + rw*0.54, y: cy - rh*0.08, r: rh*0.46 },
          ];
          const baseY = cy + rh * 0.52;
          const L = cx - rw * 0.82, R = cx + rw * 0.82;
          function tangentPts(b1, b2) {
            const dx = b2.x-b1.x, dy = b2.y-b1.y, d = Math.sqrt(dx*dx+dy*dy);
            const angle = Math.atan2(dy,dx);
            const spread = Math.acos(Math.min(1,(b1.r-b2.r)/d+0.1)) || Math.PI/4;
            return {
              ex: b1.x + b1.r * Math.cos(angle + spread*0.9),
              ey: b1.y + b1.r * Math.sin(angle + spread*0.9),
              ix: b2.x + b2.r * Math.cos(Math.PI + angle - spread*0.9),
              iy: b2.y + b2.r * Math.sin(Math.PI + angle - spread*0.9),
            };
          }
          const startAngle0 = Math.atan2(baseY - bumps[0].y, L - bumps[0].x);
          const sx0 = bumps[0].x + bumps[0].r * Math.cos(startAngle0);
          const sy0 = bumps[0].y + bumps[0].r * Math.sin(startAngle0);
          let d2 = `M ${L} ${baseY}`;
          d2 += ` Q ${L - rw*0.05} ${(baseY + sy0)/2 + 8} ${sx0} ${sy0}`;
          for (let i = 0; i < bumps.length; i++) {
            const b = bumps[i], next = bumps[i+1];
            if (next) {
              const t = tangentPts(b, next);
              d2 += ` A ${b.r} ${b.r} 0 0 1 ${t.ex} ${t.ey}`;
              d2 += ` Q ${(t.ex+t.ix)/2} ${(t.ey+t.iy)/2 + rh*0.06} ${t.ix} ${t.iy}`;
            } else {
              const endAngle = Math.atan2(baseY - b.y, R - b.x);
              const ex = b.x + b.r * Math.cos(endAngle), ey = b.y + b.r * Math.sin(endAngle);
              d2 += ` A ${b.r} ${b.r} 0 0 1 ${ex} ${ey}`;
              d2 += ` Q ${R + rw*0.05} ${(baseY + ey)/2 + 8} ${R} ${baseY}`;
            }
          }
          d2 += ` Q ${cx} ${baseY + rh*0.55} ${L} ${baseY} Z`;
          return d2;
        }

        const cloudD   = buildCloudPath(CX, CY, RW, RH);
        const wanEdges = (currentTopoData?.edges || []).filter(e =>
          (sdwanIds.has(e.aId) && fwdIds.has(e.bId)) ||
          (fwdIds.has(e.aId)   && sdwanIds.has(e.bId))
        );
        const wanCableCount = wanEdges.reduce((s,e) => s + e.cables.length, 0);

        const cloudG = el('g', { class:'wan-cloud-shape', style:'cursor:pointer' });
        cloudG.appendChild(el('ellipse', { cx:CX, cy:CY+RH*0.15, rx:RW*1.08, ry:RH*0.75, fill:'#20d0e8', 'fill-opacity':'0.05', filter:'url(#node-glow)' }));
        cloudG.appendChild(el('path', { d:cloudD, fill:'#081820', 'fill-opacity':'0.96', stroke:'#20d0e8', 'stroke-width':'1.6', 'stroke-opacity':'0.65', 'stroke-linejoin':'round', 'stroke-linecap':'round' }));
        cloudG.appendChild(el('ellipse', { cx:CX-RW*0.06, cy:CY-RH*0.22, rx:RW*0.42, ry:RH*0.20, fill:'#20d0e8', 'fill-opacity':'0.06' }));

        const lblWan = el('text', { x:String(CX), y:String(CY-RH*0.05), 'text-anchor':'middle', 'dominant-baseline':'central', 'font-family':"'JetBrains Mono',monospace", 'font-size':'15', 'font-weight':'700', fill:'#20d0e8', opacity:'0.90', 'letter-spacing':'0.22em' });
        lblWan.textContent = (CONFIG.wanCloud && CONFIG.wanCloud.label) || 'WAN';
        cloudG.appendChild(lblWan);

        const lblSub = el('text', { x:String(CX), y:String(CY+RH*0.35), 'text-anchor':'middle', 'dominant-baseline':'central', 'font-family':"'JetBrains Mono',monospace", 'font-size':'7.5', 'font-weight':'500', fill:'#20d0e8', opacity:'0.45', 'letter-spacing':'0.12em' });
        lblSub.textContent = (CONFIG.wanCloud && CONFIG.wanCloud.subLabel) || '';
        cloudG.appendChild(lblSub);

        if (wanCableCount > 0) {
          const badgeCX = CX+RW*0.52, badgeCY = CY-RH*0.42;
          cloudG.appendChild(el('circle', { cx:String(badgeCX), cy:String(badgeCY), r:'9', fill:'#20d0e8', 'fill-opacity':'0.18', stroke:'#20d0e8', 'stroke-width':'1', 'stroke-opacity':'0.5' }));
          const badgeTxt = el('text', { x:String(badgeCX), y:String(badgeCY+0.5), 'text-anchor':'middle', 'dominant-baseline':'central', 'font-family':"'JetBrains Mono',monospace", 'font-size':'8', 'font-weight':'700', fill:'#20d0e8', opacity:'0.90' });
          badgeTxt.textContent = String(wanCableCount);
          cloudG.appendChild(badgeTxt);
        }

        const entryXs = [-RW*0.28, 0, RW*0.28].map(ox => CX+ox);
        const exitXs  = [-RW*0.28, 0, RW*0.28].map(ox => CX+ox);
        entryXs.forEach(px => {
          cloudG.appendChild(el('circle', { cx:String(px), cy:String(z.entryY), r:'3.5', fill:'none', stroke:'#20d0e8', 'stroke-width':'1.2', opacity:'0.55' }));
          cloudG.appendChild(el('circle', { cx:String(px), cy:String(z.entryY), r:'1.8', fill:'#20d0e8', opacity:'0.75' }));
        });
        exitXs.forEach(px => {
          cloudG.appendChild(el('circle', { cx:String(px), cy:String(z.exitY), r:'3.5', fill:'none', stroke:'#20d0e8', 'stroke-width':'1.2', opacity:'0.55' }));
          cloudG.appendChild(el('circle', { cx:String(px), cy:String(z.exitY), r:'1.8', fill:'#20d0e8', opacity:'0.75' }));
        });

        const hitZone = el('ellipse', { cx:String(CX), cy:String(CY+RH*0.10), rx:String(RW*0.95), ry:String(RH*0.85), fill:'transparent', stroke:'none', style:'cursor:pointer' });
        hitZone.addEventListener('click', ev => { ev.stopPropagation(); showWANDetail(wanEdges, currentTopoData?.devices || []); });
        hitZone.addEventListener('mouseenter', () => { cloudG.querySelector('path').setAttribute('stroke-opacity','1'); cloudG.querySelector('path').setAttribute('fill-opacity','0.99'); });
        hitZone.addEventListener('mouseleave', () => { cloudG.querySelector('path').setAttribute('stroke-opacity','0.65'); cloudG.querySelector('path').setAttribute('fill-opacity','0.96'); });
        cloudG.appendChild(hitZone);
        g.appendChild(cloudG);

        render._wanCloud = { cx:CX, cy:CY, x:z.x, y:z.y, w:z.w, h:z.h, entryY:z.entryY, exitY:z.exitY };

      } else if (z.isBackground && !z.layer) {
        g.appendChild(el('rect', { x:z.x+2, y:z.y, width:z.w-4, height:z.h, rx:10, fill:'rgba(255,255,255,0.010)', stroke:'rgba(80,120,200,0.09)', 'stroke-width':1 }));
      } else if (z.layer) {
        const full = z.isFullWidth && !z.isSubZone;
        const op   = _zoneOp();
        if (z.layer.virtualGroups != null) {
          g.appendChild(el('rect', {
            x:z.x+(full?2:0), y:z.y, width:z.w-(full?4:0), height:z.h, rx:full?10:7,
            fill:z.layer.color, 'fill-opacity':full?op.fillFull:op.fillSub,
            stroke:z.layer.color, 'stroke-opacity':full?op.strokeFull:op.strokeSub, 'stroke-width':1
          }));
          const tlbl = el('text', { x:z.x+(full?16:9), y:z.y+15, class:'zone-label', fill:z.layer.color, 'font-size':full?'9.5':'9' });
          tlbl.textContent = z.layer.label.toUpperCase();
          g.appendChild(tlbl);
          if (currentTopoData && currentTopoData.positions) {
            const virtDevices = currentTopoData.devices.filter(d => getLayer(d).key === z.layer.key);
            const subGroups   = groupVirtualSubgroups(virtDevices, z.layer);
            drawVirtualSubgroups(g, subGroups, currentTopoData.positions, z.layer.color, el, z.layer);
          }
        } else if (z.isGridZone) {
          g.appendChild(el('rect', { x:z.x+2, y:z.y, width:z.w-4, height:z.h, rx:10, fill:z.layer.color, 'fill-opacity':op.fillGrid, stroke:z.layer.color, 'stroke-opacity':op.strokeGrid, 'stroke-width':1 }));
          const tlbl = el('text', { x:z.x+13, y:z.y+15, class:'zone-label', fill:z.layer.color, 'font-size':'9.5' });
          tlbl.textContent = z.layer.label.toUpperCase();
          g.appendChild(tlbl);
        } else {
          g.appendChild(el('rect', {
            x:z.x+(full?2:0), y:z.y, width:z.w-(full?4:0), height:z.h, rx:full?10:7,
            fill:z.layer.color, 'fill-opacity':full?op.fillFull:op.fillSub,
            stroke:z.layer.color, 'stroke-opacity':full?op.strokeFull:op.strokeSub, 'stroke-width':1
          }));
          const tlbl = el('text', { x:z.x+(full?16:9), y:z.y+15, class:'zone-label', fill:z.layer.color, 'font-size':full?'9.5':'9' });
          tlbl.textContent = z.layer.label.toUpperCase();
          g.appendChild(tlbl);
        }
      }
      ZL.appendChild(g);
    });
  }

  // ── Arêtes ──
  edges.forEach(e => {
    const pa = positions[e.aId], pb = positions[e.bId];
    if (!pa || !pb) return;
    const ax = pa.x + (_nodeWidths[e.aId]||NODE_W)/2, ay = pa.y + NODE_H/2;
    const bx = pb.x + (_nodeWidths[e.bId]||NODE_W)/2, by = pb.y + NODE_H/2;
    const dx = bx-ax, dy = by-ay;
    const dist = Math.sqrt(dx*dx + dy*dy + 0.001);
    const isClose    = dist < Math.max(_nodeWidths[e.aId]||NODE_W, _nodeWidths[e.bId]||NODE_W) * 2.5;
    const cableSpread = isClose ? 22 : 9;
    const minCurve    = isClose ? 40 : 0;
    const perpX = -dy/dist, perpY = dx/dist;

    const isWANLink = (sdwanIds.has(e.aId) && fwdIds.has(e.bId))
                   || (fwdIds.has(e.aId)   && sdwanIds.has(e.bId));
    const wc = render._wanCloud;

    const groups = [];
    if (CONFIG.groupCables) {
      e.cables.forEach(cable => {
        const lbl = (cable.label||'').trim();
        if (lbl) {
          const existing = groups.find(g => g.label===lbl && g.color===cable.color);
          if (existing) { existing.members.push(cable); return; }
        }
        groups.push({ label:lbl, color:cable.color, members:[cable] });
      });
    } else {
      e.cables.forEach(cable => groups.push({ label:(cable.label||'').trim(), color:cable.color, members:[cable] }));
    }

    const arcs = groups.map((grp,gi) => {
      const off = (gi - (groups.length-1)/2) * cableSpread;
      if (isWANLink && wc) {
        const aIsSdwan = sdwanIds.has(e.aId);
        const srcX = aIsSdwan ? ax : bx, srcY = aIsSdwan ? ay : by;
        const dstX = aIsSdwan ? bx : ax, dstY = aIsSdwan ? by : ay;
        const spreadX = off * 0.55;
        return {
          isWAN: true, clr: getCableColor(grp.color),
          seg1: { ax:srcX, ay:srcY, bx:wc.cx+spreadX*0.7, by:wc.entryY, cpx:(srcX+wc.cx+spreadX*0.7)/2+perpX*off*0.3, cpy:(srcY+wc.entryY)/2+perpY*off*0.3 },
          seg2: { ax:wc.cx+spreadX*0.5, ay:wc.exitY, bx:dstX, by:dstY,  cpx:(wc.cx+spreadX*0.5+dstX)/2+perpX*off*0.3, cpy:(wc.exitY+dstY)/2+perpY*off*0.3 }
        };
      }
      const curve = Math.max(Math.abs(off), minCurve) * Math.sign(off||1);
      return { cpx:(ax+bx)/2+perpX*curve, cpy:(ay+by)/2+perpY*curve, clr:getCableColor(grp.color) };
    });

    const edgeRefs = [];

    function highlightEdge(gi) {
      edgeRefs.forEach((ref,i) => {
        const isActive = (i === gi);
        const sw = isActive ? '4.5' : '1.6', op = isActive ? '1' : '0.20';
        ref.p.setAttribute('stroke', isActive ? '#ffffff' : ref.clr);
        ref.p.setAttribute('stroke-width', sw); ref.p.setAttribute('opacity', op);
        if (isActive) ref.p.setAttribute('filter','url(#cable-glow)'); else ref.p.removeAttribute('filter');
        if (ref.p2) {
          ref.p2.setAttribute('stroke', isActive ? '#ffffff' : ref.clr);
          ref.p2.setAttribute('stroke-width', sw); ref.p2.setAttribute('opacity', op);
          if (isActive) ref.p2.setAttribute('filter','url(#cable-glow)'); else ref.p2.removeAttribute('filter');
        }
        if (ref.bg) { const lbg = _zoneOp().labelBg; ref.bg.setAttribute('fill', isActive ? (document.documentElement.dataset.theme==='light'?'#334155':'#ffffff') : lbg); ref.bg.setAttribute('fill-opacity', isActive ? '0.18' : _zoneOp().labelBgOp); ref.bg.setAttribute('stroke', isActive ? (document.documentElement.dataset.theme==='light'?'#334155':'#ffffff') : ref.clr); ref.bg.setAttribute('stroke-opacity', isActive ? '1' : '0.28'); }
        if (ref.t) ref.t.setAttribute('fill', isActive ? '#ffffff' : ref.clr);
      });
    }

    function resetEdges() {
      edgeRefs.forEach(ref => {
        ref.p.setAttribute('stroke', ref.clr); ref.p.setAttribute('stroke-width','1.7'); ref.p.setAttribute('opacity','0.50'); ref.p.removeAttribute('filter');
        if (ref.p2) { ref.p2.setAttribute('stroke', ref.clr); ref.p2.setAttribute('stroke-width','1.7'); ref.p2.setAttribute('opacity','0.50'); ref.p2.removeAttribute('filter'); }
        if (ref.bg) { const op2=_zoneOp(); ref.bg.setAttribute('fill',op2.labelBg); ref.bg.setAttribute('fill-opacity',op2.labelBgOp); ref.bg.setAttribute('stroke',ref.clr); ref.bg.setAttribute('stroke-opacity','0.58'); }
        if (ref.t) ref.t.setAttribute('fill',ref.clr);
      });
    }

    groups.forEach((grp,gi) => {
      const arc = arcs[gi];
      const merged = grp.members.length;
      const baseW  = merged > 1 ? Math.min(1.7 + merged*0.6, 5) : 1.7;
      const groupEdge = { aId:e.aId, bId:e.bId, cables:grp.members };

      if (arc.isWAN) {
        const s1 = arc.seg1, s2 = arc.seg2;
        const dSeg1 = `M${s1.ax},${s1.ay} Q${s1.cpx},${s1.cpy} ${s1.bx},${s1.by}`;
        const dSeg2 = `M${s2.ax},${s2.ay} Q${s2.cpx},${s2.cpy} ${s2.bx},${s2.by}`;
        const p1 = el('path', { d:dSeg1, class:'edge wan-edge-flow', stroke:arc.clr, 'stroke-width':String(baseW) });
        const p2 = el('path', { d:dSeg2, class:'edge wan-edge-flow', stroke:arc.clr, 'stroke-width':String(baseW) });
        EL.appendChild(p1); EL.appendChild(p2);
        const HIT_W = '28';
        const hit1 = el('path', { d:dSeg1, stroke:'transparent', 'stroke-width':HIT_W, fill:'none', style:'cursor:pointer' });
        const hit2 = el('path', { d:dSeg2, stroke:'transparent', 'stroke-width':HIT_W, fill:'none', style:'cursor:pointer' });
        [hit1, hit2].forEach(h => {
          h.addEventListener('click', ev => { ev.stopPropagation(); showEdgeDetail(groupEdge, currentTopoData.devices); });
          h.addEventListener('mouseenter', () => highlightEdge(gi));
          h.addEventListener('mouseleave', () => resetEdges());
        });
        EL.appendChild(hit1); EL.appendChild(hit2);
        edgeRefs.push({ p:p1, p2, clr:arc.clr, bg:null, t:null });
      } else {
        const dPath = `M${ax},${ay} Q${arc.cpx},${arc.cpy} ${bx},${by}`;
        const p = el('path', { d:dPath, class:'edge', stroke:arc.clr, 'stroke-width':String(baseW) });
        EL.appendChild(p);
        const hit = el('path', { d:dPath, stroke:'transparent', 'stroke-width':'18', fill:'none', style:'cursor:pointer' });
        hit.addEventListener('click', ev => { ev.stopPropagation(); showEdgeDetail(groupEdge, currentTopoData.devices); });
        hit.addEventListener('mouseenter', () => highlightEdge(gi));
        hit.addEventListener('mouseleave', () => resetEdges());
        EL.appendChild(hit);
        edgeRefs.push({ p, clr:arc.clr, bg:null, t:null });
      }
    });

    // Labels de câbles
    groups.forEach((grp,gi) => {
      if (!showLabels || !grp.label) return;
      const arc = arcs[gi];
      const merged = grp.members.length;
      let lx, ly, cpx, cpy;
      if (arc.isWAN) {
        const s = arc.seg1, t_param = 0.5;
        lx = (1-t_param)*(1-t_param)*s.ax + 2*(1-t_param)*t_param*s.cpx + t_param*t_param*s.bx;
        ly = (1-t_param)*(1-t_param)*s.ay + 2*(1-t_param)*t_param*s.cpy + t_param*t_param*s.by;
        cpx = s.cpx; cpy = s.cpy;
      } else {
        cpx = arc.cpx; cpy = arc.cpy;
        const total = groups.filter(g=>g.label).length;
        const labelIdx = groups.slice(0,gi).filter(g=>g.label).length;
        const t_param = total > 1 ? 0.35 + (labelIdx/(total-1))*0.30 : 0.5;
        lx = (1-t_param)*(1-t_param)*ax + 2*(1-t_param)*t_param*cpx + t_param*t_param*bx;
        ly = (1-t_param)*(1-t_param)*ay + 2*(1-t_param)*t_param*cpy + t_param*t_param*by;
      }
      const tgx = arc.isWAN ? (arc.seg1.bx-arc.seg1.ax) : 2*(cpx-ax)+2*(bx-cpx)*0.5;
      const tgy = arc.isWAN ? (arc.seg1.by-arc.seg1.ay) : 2*(cpy-ay)+2*(by-cpy)*0.5;
      const tgLen = Math.sqrt(tgx*tgx + tgy*tgy + 0.001);
      const normX = -tgy/tgLen, normY = tgx/tgLen;
      const labelOff = isClose ? 16 : 10;
      const sign  = gi%2===0 ? 1 : -1;
      const tlx = lx + normX*labelOff*sign, tly = ly + normY*labelOff*sign;
      const clr  = arc.clr;
      const displayLabel = merged > 1 ? grp.label + ' +' + (merged-1) : grp.label;
      const labelW = displayLabel.length*5.5 + 18, labelH = 15;
      const groupEdge = { aId:e.aId, bId:e.bId, cables:grp.members };
      const lg = el('g', { style:'cursor:pointer' });
      const _op = _zoneOp();
      const bg = el('rect', { x:tlx-labelW/2, y:tly-labelH/2, width:labelW, height:labelH, rx:3, fill:_op.labelBg, 'fill-opacity':_op.labelBgOp, stroke:clr, 'stroke-opacity':merged>1?'1':'0.68', 'stroke-width':merged>1?'1.6':'1.1' });
      lg.appendChild(bg);
      const t2 = el('text', { x:tlx, y:tly+0.5, 'text-anchor':'middle', 'dominant-baseline':'central', class:'edge-label', fill:clr, 'font-weight':'600' });
      t2.textContent = displayLabel;
      lg.appendChild(t2);
      if (merged > 1) {
        const badge = el('circle', { cx:tlx+labelW/2-4, cy:tly-labelH/2+4, r:'4', fill:clr, opacity:'0.9' });
        lg.appendChild(badge);
        const badgeTxt = el('text', { x:tlx+labelW/2-4, y:tly-labelH/2+4.5, 'text-anchor':'middle', 'dominant-baseline':'central', fill:'#030608', 'font-size':'5', 'font-weight':'700' });
        badgeTxt.textContent = String(merged);
        lg.appendChild(badgeTxt);
      }
      edgeRefs[gi].bg = bg; edgeRefs[gi].t = t2;
      lg.addEventListener('click', ev => { ev.stopPropagation(); showEdgeDetail(groupEdge, currentTopoData.devices); });
      lg.addEventListener('mouseenter', () => highlightEdge(gi));
      lg.addEventListener('mouseleave', () => resetEdges());
      EL.appendChild(lg);
    });
  });

  // ── Nœuds ──
  devices.forEach(d => {
    const pos = positions[d.id]; if (!pos) return;
    const { x, y } = pos;
    const layer = getLayer(d), clr = layer.color;
    const status = d.status?.value || 'active';
    const g = el('g', { class:'node-group', 'data-id':d.id, transform:`translate(${x},${y})` });
    const nw = _nw(d);

    g.appendChild(el('rect', { x:-2, y:-2, width:nw+4, height:NODE_H+4, rx:R+2, fill:'none', stroke:clr, 'stroke-width':'1', opacity:'0.08' }));
    const body = el('rect', { class:'node-bg', x:0, y:0, width:nw, height:NODE_H, rx:R, fill:'#0c1018', stroke:clr, 'stroke-width':'1.1', 'stroke-opacity':'0.42' });
    g.appendChild(body);

    const clipId = `c${d.id}`;
    const clip = el('clipPath', { id:clipId });
    clip.appendChild(el('rect', { x:0, y:0, width:nw, height:NODE_H, rx:R }));
    g.appendChild(clip);

    g.appendChild(el('rect', { x:0, y:0, width:3, height:NODE_H, fill:clr, opacity:'0.85', 'clip-path':`url(#${clipId})` }));

    const NS2 = 'http://www.w3.org/2000/svg';
    const grad = document.createElementNS(NS2,'linearGradient');
    const gid = `g${d.id}`;
    grad.setAttribute('id',gid); grad.setAttribute('x1','0'); grad.setAttribute('y1','0'); grad.setAttribute('x2','1'); grad.setAttribute('y2','0');
    const s1 = document.createElementNS(NS2,'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color',clr); s1.setAttribute('stop-opacity','0.09');
    const s2 = document.createElementNS(NS2,'stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color',clr); s2.setAttribute('stop-opacity','0');
    grad.appendChild(s1); grad.appendChild(s2);
    document.getElementById('topo-svg').querySelector('defs').appendChild(grad);
    g.appendChild(el('rect', { x:0, y:0, width:nw, height:NODE_H, rx:R, fill:`url(#${gid})`, 'clip-path':`url(#${clipId})` }));

    const sc = { active:'#18e09a', planned:'#4a8ff0', staged:'#9068f8', failed:'#f03050', offline:'#485870', decommissioning:'#f0a020' };
    g.appendChild(el('circle', { cx:nw-11, cy:11, r:'3', fill:sc[status]||'#485870' }));

    const nameStr = d.name || `Device #${d.id}`;
    const rn = d.role?.name || d.device_role?.name || '';
    const sn = d.site?.name || '';
    const sub = [rn,sn].filter(Boolean).join(' · ');

    const nt = el('text', { x:12, y:21, class:'node-name', 'dominant-baseline':'central' });
    nt.textContent = nameStr;
    g.appendChild(nt);

    const st = el('text', { x:12, y:37, class:'node-sub', 'dominant-baseline':'central' });
    st.textContent = sub;
    g.appendChild(st);

    g.addEventListener('click', () => showDeviceDetail(d));
    NL.appendChild(g);
  });

  // ── Légende ──
  const lr = document.getElementById('legend-rows');
  lr.innerHTML = '';
  usedLayers.forEach(({layer}) => {
    lr.innerHTML += `<div class="legend-row"><div class="legend-dot" style="background:${layer.color}"></div>${layer.label}</div>`;
  });
  document.getElementById('canvas-legend').style.display = 'block';

  if (CONFIG.showMinimap) renderMinimap();
}

// ══════════════════════════════════════════
//  PAN / ZOOM — interactions canvas
// ══════════════════════════════════════════
const wrap = document.getElementById('canvas-wrap');

wrap.addEventListener('mousedown', e => {
  if (e.target.closest('.node-group') || e.target.closest('.edge')) return;
  isPanning = true; panStartX = e.clientX - viewX; panStartY = e.clientY - viewY;
});
window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  viewX = e.clientX - panStartX; viewY = e.clientY - panStartY; applyT();
});
window.addEventListener('mouseup', () => { isPanning = false; });
wrap.addEventListener('wheel', e => {
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.1 : 0.91;
  const r = wrap.getBoundingClientRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  viewX = cx + (viewX-cx)*f; viewY = cy + (viewY-cy)*f; viewScale *= f; applyT();
}, { passive:false });

function applyT() {
  document.getElementById('scene').setAttribute('transform', `translate(${viewX},${viewY}) scale(${viewScale})`);
  if (CONFIG.showMinimap && currentTopoData?.canvasW) renderMinimap();
}

function zoomBy(f) {
  const r = wrap.getBoundingClientRect();
  const cx = r.width/2, cy = r.height/2;
  viewX = cx + (viewX-cx)*f; viewY = cy + (viewY-cy)*f; viewScale *= f; applyT();
}

function resetView() {
  if (!currentTopoData?.canvasW) return;
  const r = wrap.getBoundingClientRect(), pad = 50;
  viewScale = Math.min((r.width-pad*2)/currentTopoData.canvasW, (r.height-pad*2)/currentTopoData.canvasH, 1.2);
  viewX = (r.width - currentTopoData.canvasW * viewScale) / 2; viewY = pad; applyT();
}

function toggleLabels() { showLabels = !showLabels; document.getElementById('btn-labels').classList.toggle('on', showLabels); if (currentTopoData) render(currentTopoData); }
function toggleZones()  { showZones  = !showZones;  document.getElementById('btn-zones').classList.toggle('on',  showZones);  if (currentTopoData) render(currentTopoData); }

wrap.addEventListener('click', e => { if (!e.target.closest('.node-group') && !e.target.closest('.edge')) closeSidebar(); });

document.addEventListener('keydown', e => {
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key==='Escape') {
    const openModal = document.querySelector('.modal-overlay.show');
    if (openModal) { openModal.classList.remove('show'); return; }
    const help = document.getElementById('shortcuts-overlay');
    if (help && help.classList.contains('show')) { help.classList.remove('show'); return; }
    closeSidebar(); return;
  }
  if (e.key==='r'||e.key==='R') loadTopology();
  if (e.key==='f'||e.key==='F') resetView();
  if (e.key==='+'||e.key==='=') zoomBy(1.2);
  if (e.key==='-') zoomBy(0.8);
  if (e.key==='l'||e.key==='L') toggleLabels();
  if (e.key==='z'||e.key==='Z') toggleZones();
  if (e.key==='g'||e.key==='G') toggleCableGrouping();
  if (e.key==='?')              toggleShortcutsHelp();
});

// ══════════════════════════════════════════
//  MINIMAP — indicateur de viewport
// ══════════════════════════════════════════
function renderMinimap() {
  const mm = document.getElementById('minimap-svg');
  if (!mm || !currentTopoData?.canvasW) { if (mm) mm.innerHTML = ''; return; }
  const W = currentTopoData.canvasW, H = currentTopoData.canvasH;
  mm.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  let svg = '';
  (currentTopoData.zoneRects||[]).forEach(z => {
    if (z.isWANCloud || !z.layer) return;
    svg += '<rect x="'+z.x+'" y="'+z.y+'" width="'+z.w+'" height="'+z.h+'" fill="'+z.layer.color+'" fill-opacity="0.18" stroke="'+z.layer.color+'" stroke-opacity="0.4" stroke-width="2"/>';
  });
  (currentTopoData.devices||[]).forEach(d => {
    const p = currentTopoData.positions[d.id]; if (!p) return;
    svg += '<rect x="'+p.x+'" y="'+p.y+'" width="'+NODE_W+'" height="'+NODE_H+'" fill="#d8e3f5" fill-opacity="0.6"/>';
  });
  const r = wrap.getBoundingClientRect();
  svg += '<rect class="minimap-viewport" x="'+(-viewX/viewScale)+'" y="'+(-viewY/viewScale)+'" width="'+(r.width/viewScale)+'" height="'+(r.height/viewScale)+'"/>';
  mm.innerHTML = svg;
}

function bindMinimap() {
  const svg = document.getElementById('minimap-svg');
  if (!svg) return;
  function panTo(e) {
    const r = svg.getBoundingClientRect();
    const W = currentTopoData?.canvasW || 1, H = currentTopoData?.canvasH || 1;
    const x = (e.clientX - r.left) / r.width  * W;
    const y = (e.clientY - r.top)  / r.height * H;
    const wr = document.getElementById('canvas-wrap').getBoundingClientRect();
    viewX = wr.width  / 2 - x * viewScale;
    viewY = wr.height / 2 - y * viewScale;
    applyT(); renderMinimap();
  }
  let dragging = false;
  svg.addEventListener('mousedown', e => { dragging = true; panTo(e); });
  window.addEventListener('mousemove', e => { if (dragging) panTo(e); });
  window.addEventListener('mouseup',   () => { dragging = false; });
}
