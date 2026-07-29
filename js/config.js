// ══════════════════════════════════════════
//  1. STORAGE — helpers localStorage versionnés
// ══════════════════════════════════════════
const STORAGE_NS = 'topo-vision';
const STORAGE_VERSION = 1;
function lsKey(k) { return `${STORAGE_NS}.${k}.v${STORAGE_VERSION}`; }
function lsGet(k, fallback = null) {
  try { const v = localStorage.getItem(lsKey(k)); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function lsSet(k, val) {
  try { localStorage.setItem(lsKey(k), JSON.stringify(val)); return true; }
  catch (e) { return false; }
}
function lsDel(k) { try { localStorage.removeItem(lsKey(k)); } catch (e) { } }

// ══════════════════════════════════════════
//  2. CONFIG — configuration runtime
//  Persisté sous   topo-vision.config.v1
//
//  mode = 'proxy'  → fetch via NGINX (/api/netbox/…)
//                    le token ne quitte jamais le serveur
//  mode = 'direct' → fetch direct contre CONFIG.url
//                    avec Authorization header (CORS requis)
// ══════════════════════════════════════════
const DEFAULT_CONFIG = {
  mode: 'proxy',
  url: '',
  token: '',
  theme: 'dark',
  language: '',
  groupCables: true,
  showMinimap: true,
  wanCloud: {
    enabled: false,
    label: 'WAN',
    subLabel: 'REMOTE SIDE',
    sourceLayer: 'sdwan',
    targetLayer: 'firewall-distant'
  },
  roleBlacklist: []
};
let CONFIG = Object.assign({}, DEFAULT_CONFIG, lsGet('config', {}));
// Fusion profonde de wanCloud en cas de valeur partielle sauvegardée
CONFIG.wanCloud = Object.assign({}, DEFAULT_CONFIG.wanCloud, CONFIG.wanCloud || {});

function saveConfig() { lsSet('config', CONFIG); }
function isConfigured() {
  if (CONFIG.mode === 'proxy') return true;
  return Boolean(CONFIG.url && CONFIG.token);
}

// ══════════════════════════════════════════
//  3. I18N — table de traductions EN / FR
// ══════════════════════════════════════════
const I18N = {
  en: {
    'boot.configurePrompt': 'Configure your NetBox connection in the Settings panel.',
    'boot.checkConfig': 'Check NetBox URL, token and CORS settings.',
    'boot.connecting': 'Connecting to NetBox…',
    'boot.autoloading': 'Auto-loading',
    'filter.label': 'Filter',
    'filter.allRoles': 'All roles',
    'filter.allSites': 'All sites',
    'filter.allSiteStatuses': 'Site statuses',
    'filter.allGroups': 'All site groups',
    'filter.allDeviceStatuses': 'Device statuses',
    'filter.allTags': 'All tags',
    'filter.allManufacturers': 'All manufacturers',
    'filter.clear': '\u2715 Clear',
    'filter.searchPrefix': 'Search by prefix',
    'filter.role': 'Role',
    'filter.site': 'Site',
    'filter.siteStatus': 'Site status',
    'filter.group': 'Group',
    'filter.deviceStatus': 'Device status',
    'filter.tag': 'Tag',
    'filter.manufacturer': 'Manufacturer',
    'filter.layers': 'Layers',
    'status.active': 'Active',
    'status.planned': 'Planned',
    'status.staged': 'Staged',
    'status.staging': 'Staging',
    'status.failed': 'Failed',
    'status.offline': 'Offline',
    'status.decommissioning': 'Decommissioning',
    'status.retired': 'Retired',
    'status.inventory': 'Intentory',
    'status.disconnected': 'Disconnected',
    'status.connecting': 'Connecting\u2026',
    'topbar.load': 'Load',
    'topbar.devices': 'Devices',
    'topbar.cables': 'Cables',
    'topbar.layers': 'Layers',
    'legend.title': 'Network layers',
    'export.generating': 'Generating\u2026',
    'export.label': 'Export',
    'export.title': 'Export current view',
    'export.pngDesc': 'High-resolution image \u00d72',
    'export.xmlDesc': 'Open in diagrams.net',
    'shortcut.title': 'Keyboard shortcuts',
    'shortcut.refresh': 'Refresh topology',
    'shortcut.fit': 'Fit view',
    'shortcut.labels': 'Toggle cable labels',
    'shortcut.zones': 'Toggle zones',
    'shortcut.zoomIn': 'Zoom in',
    'shortcut.zoomOut': 'Zoom out',
    'shortcut.escape': 'Close sidebar / modal',
    'shortcut.help': 'Show this help',
    'shortcut.group': 'Toggle cable grouping (G)',
    'ui.settings': 'Settings',
    'ui.resetView': 'Reset view (R)',
    'ui.editZones': 'Edit zones',
    'ui.toggleTheme': 'Toggle theme',
    'ui.save': 'Save & reload',
    'ui.cancel': 'Cancel',
    'settings.title': 'Settings',
    'settings.tab.connection': 'Connection',
    'settings.tab.display': 'Display',
    'settings.tab.language': 'Language',
    'settings.tab.wan': 'WAN cloud',
    'settings.tab.reset': 'Reset',
    'settings.connection.mode': 'Connection mode',
    'settings.connection.proxy': 'Proxy (recommended) \u2014 token stays on the server',
    'settings.connection.direct': 'Direct \u2014 browser calls NetBox with token (requires CORS)',
    'settings.connection.url': 'NetBox URL',
    'settings.connection.token': 'API token',
    'settings.connection.tokenHelp': 'Create one in NetBox: Admin \u2192 API Tokens \u2192 Add Token.',
    'settings.connection.test': 'Test connection',
    'settings.display.theme': 'Theme',
    'settings.display.dark': 'Dark',
    'settings.display.light': 'Light',
    'settings.display.options': 'Display options',
    'settings.display.groupCables': 'Group multiple cables into one line with a count badge',
    'settings.display.minimap': 'Show minimap (bottom-right)',
    'settings.lang.title': 'Interface language',
    'settings.lang.auto': 'Auto (browser)',
    'settings.wan.enabled': 'Enable WAN cloud rendering between two layers',
    'settings.wan.label': 'Main label',
    'settings.wan.subLabel': 'Sub-label',
    'settings.wan.source': 'Source layer (top)',
    'settings.wan.target': 'Target layer (bottom)',
    'settings.wan.help': 'Cables linking a device in the source layer to a device in the target layer will be drawn passing through the cloud.',
    'settings.filtersTab': 'Filters',
    'settings.blacklistRoles': 'Role blacklist (one slug per line)',
    'settings.reset.warn': 'This will clear all locally saved settings (connection, layers, favourites, theme\u2026). The NetBox data itself is untouched.',
    'settings.reset.button': 'Clear local data',
    'settings.defaultTopo.title': 'Server default topology',
    'settings.defaultTopo.help': 'Download current topology as default-topo.json, replace the file and restart Docker to share it with all users.',
    'settings.defaultTopo.button': 'Download as server default',
    'toast.defaultExported': '\u2713 Downloaded \u2014 replace default-topo.json and restart Docker',
    'zones.setDefaultInfo.title': 'Set a default topology',
    'zones.setDefaultInfo.step1': '1. Configure the zones as desired, then click Export JSON.',
    'zones.setDefaultInfo.step2': '2. Save the file as default-topo.json in the project folder (next to docker-compose.yml).',
    'zones.setDefaultInfo.step3': '3. Restart the container: docker compose restart topo-vision',
    'zones.setDefaultInfo.note': 'The file default-topo.example.json in the repo is a starter template.',
    'ui.close': 'Close',
    'zones.title': 'Zone editor',
    'zones.export': 'Export JSON',
    'zones.import': 'Import JSON',
    'zones.setDefault': 'Set as default',
    'zones.reset': 'Reset to defaults',
    'zones.help': 'Drag a zone between columns to move it. Click a zone to expand and edit its slugs/color/order. The "virtual" zone supports extra layout hints (prefix-based bubbles).',
    'zones.left': 'Left column',
    'zones.mid': 'Middle column',
    'zones.right': 'Right column',
    'zones.line': 'Line',
    'zone.key': 'Key (ID)',
    'zone.label': 'Label',
    'zone.color': 'Color',
    'zone.order': 'Order',
    'zone.slugs': 'NetBox role slugs (Enter to add)',
    'zone.virtualLayout': 'Virtual layout (bubbles)',
    'zone.bubbleMaxPerRow': 'Max bubbles/row (0=disabled)',
    'zone.virtualGroups': 'Virtual layout groups (advanced)',
    'zone.virtualHelp': 'Prefix-based grouping. Each line: family,prefix1,prefix2\u2026',
    'zone.delete': 'Delete',
    'fav.title': 'Save current view as favourite',
    'fav.save': 'Save as favourite',
    'fav.name': 'Name',
    'fav.layers': 'Restrict to layers (optional, comma-separated keys)',
    'fav.layersHelp': 'To recreate the historical "Remote sites" shortcut: enter "sdwan, firewall-distant".',
    'toast.connSuccess': '\u2713 Connected',
    'toast.connFail': '\u2715 Connection failed',
    'toast.savedSettings': '\u2713 Settings saved',
    'toast.savedZones': '\u2713 Layers saved',
    'toast.resetDone': '\u2713 Local data cleared',
    'toast.invalidJSON': 'Invalid JSON file',
    'toast.favSaved': '\u2713 Favourite saved',
    'sidebar.device': 'Device',
    'sidebar.subnets': 'Site subnets',
    'sidebar.loading': 'Loading…',
    'sidebar.noSubnet': 'No prefix',
    'sidebar.wan': 'WAN zone',
    'sidebar.cable': 'Cable',
    'sidebar.cables': 'Cables',
    'sidebar.cable_number': 'Cable #',
    'sidebar.remote_side_wan': 'Remote Side — WAN',
    'sidebar.link': 'Link',
    'sidebar.wan_connections': 'Connections Traversing the WAN',
    'sidebar.no_wan_connections': 'No WAN Connections Detected',
    'sidebar.site_group': 'Site Group',
    'sidebar.location': 'Location',
    'sidebar.rack_u': 'Rack / U',
    'sidebar.manufacturer': 'Manufacturer',
    'sidebar.primary_ip': 'Primary IP',
    'sidebar.general': 'General',
    'sidebar.status': 'Status',
    'sidebar.role': 'Role',
    'sidebar.site': 'Site',
    'sidebar.model': 'Model',
    'sidebar.serial_number': 'Serial Number',
    'sidebar.comments': 'Comments',
    'sidebar.interfaces': 'Interfaces',
    'sidebar.description': 'Description',
    'sidebar.label': 'Label',
    'sidebar.color': 'Color',
    'sidebar.type': 'Type',
    'sidebar.netbox_id': 'NetBox ID',
    'status.fetching_data': 'Retrieving Data...',
    'status.devices_abbr': 'dev.',
    'status.error': 'Error',
    'status.devices': 'Devices',
    'status.cables': 'Cables',
    'status.layers': 'Layers'
  },
  fr: {
    'boot.configurePrompt': 'Configurez votre connexion NetBox dans les Param\u00e8tres.',
    'boot.checkConfig': "V\u00e9rifiez l'URL NetBox, le token et les param\u00e8tres CORS.",
    'boot.connecting': 'Connexion \u00e0 NetBox\u2026',
    'boot.autoloading': 'Chargement automatique',
    'filter.label': 'Filtrer',
    'filter.allRoles': 'Tous les r\u00f4les',
    'filter.allSites': 'Tous les sites',
    'filter.allSiteStatuses': 'Statuts des sites',
    'filter.allGroups': 'Tous les groupes',
    'filter.allDeviceStatuses': 'Statuts des \u00e9quipments',
    'filter.allTags': 'Tous les tags',
    'filter.allManufacturers': 'Tous les fabricants',
    'filter.clear': '\u2715 Effacer',
    'filter.searchPrefix': 'Rechercher par pr\u00e9fixe',
    'filter.role': 'R\u00f4le',
    'filter.site': 'Site',
    'filter.siteStatus': 'Statut du site',
    'filter.group': 'Groupe',
    'filter.deviceStatus': 'Statut de l’appareil',
    'filter.tag': 'Tag',
    'filter.manufacturer': 'Fabricant',
    'filter.layers': 'Couches',
    'status.active': 'Actif',
    'status.planned': 'Planifi\u00e9',
    'status.staged': 'Staged',
    'status.staging': 'Staging',
    'status.failed': 'Hors service',
    'status.offline': 'Offline',
    'status.decommissioning': 'D\u00e9commissionnement',
    'status.inventory': 'Inventaire',
    'status.retired': 'Retrait\u00e9',
    'status.disconnected': 'D\u00e9connect\u00e9',
    'status.connecting': 'Connexion\u2026',
    'topbar.load': 'Charger',
    'topbar.devices': '\u00c9quipements',
    'topbar.cables': 'C\u00e2bles',
    'topbar.layers': 'Couches',
    'legend.title': 'Couches r\u00e9seau',
    'export.generating': 'G\u00e9n\u00e9ration\u2026',
    'export.label': 'Exporter',
    'export.title': 'Exporter la vue actuelle',
    'export.pngDesc': 'Image haute r\u00e9solution \u00d72',
    'export.xmlDesc': 'Ouvrir dans diagrams.net',
    'shortcut.title': 'Raccourcis clavier',
    'shortcut.refresh': 'Recharger la topologie',
    'shortcut.fit': 'Ajuster la vue',
    'shortcut.labels': 'Afficher / cacher les labels',
    'shortcut.zones': 'Afficher / cacher les zones',
    'shortcut.zoomIn': 'Zoom +',
    'shortcut.zoomOut': 'Zoom \u2212',
    'shortcut.escape': 'Fermer la sidebar / fen\u00eatre',
    'shortcut.help': 'Afficher cette aide',
    'shortcut.group': 'Grouper les c\u00e2bles (G)',
    'ui.settings': 'Param\u00e8tres',
    'ui.resetView': 'Centrer (R)',
    'ui.editZones': '\u00c9diter les zones',
    'ui.toggleTheme': 'Changer de th\u00e8me',
    'ui.save': 'Enregistrer',
    'ui.cancel': 'Annuler',
    'settings.title': 'Param\u00e8tres',
    'settings.tab.connection': 'Connexion',
    'settings.tab.display': 'Affichage',
    'settings.tab.language': 'Langue',
    'settings.tab.wan': 'Nuage WAN',
    'settings.tab.reset': 'R\u00e9initialiser',
    'settings.connection.mode': 'Mode de connexion',
    'settings.connection.proxy': 'Proxy (recommand\u00e9) \u2014 le token reste c\u00f4t\u00e9 serveur',
    'settings.connection.direct': 'Direct \u2014 le navigateur appelle NetBox avec le token (CORS requis)',
    'settings.connection.url': 'URL NetBox',
    'settings.connection.token': 'Token API',
    'settings.connection.tokenHelp': 'Cr\u00e9er dans NetBox : Admin \u2192 API Tokens \u2192 Add Token.',
    'settings.connection.test': 'Tester la connexion',
    'settings.display.theme': 'Th\u00e8me',
    'settings.display.dark': 'Sombre',
    'settings.display.light': 'Clair',
    'settings.display.options': "Options d'affichage",
    'settings.display.groupCables': 'Grouper les c\u00e2bles multiples sur une ligne avec bulle de compteur',
    'settings.display.minimap': 'Afficher la minimap (en bas \u00e0 droite)',
    'settings.lang.title': "Langue de l'interface",
    'settings.lang.auto': 'Auto (navigateur)',
    'settings.wan.enabled': 'Activer le rendu nuage WAN entre deux couches',
    'settings.wan.label': 'Label principal',
    'settings.wan.subLabel': 'Sous-label',
    'settings.wan.source': 'Couche source (haut)',
    'settings.wan.target': 'Couche cible (bas)',
    'settings.wan.help': "Les c\u00e2bles reliant un \u00e9quipement de la couche source \u00e0 un \u00e9quipement de la couche cible seront dessin\u00e9s en passant par le nuage.",
    'settings.filtersTab': 'Filtres',
    'settings.blacklistRoles': 'Liste noire de r\u00f4les (un slug par ligne)',
    'settings.reset.warn': 'Efface tous les r\u00e9glages locaux (connexion, couches, favoris, th\u00e8me\u2026). Les donn\u00e9es NetBox elles-m\u00eames sont pr\u00e9serv\u00e9es.',
    'settings.reset.button': 'Effacer les donn\u00e9es locales',
    'settings.defaultTopo.title': 'Topologie par d\u00e9faut (serveur)',
    'settings.defaultTopo.help': 'T\u00e9l\u00e9chargez la topologie actuelle en tant que default-topo.json, remplacez le fichier et red\u00e9marrez Docker pour la partager avec tous les utilisateurs.',
    'settings.defaultTopo.button': 'T\u00e9l\u00e9charger comme d\u00e9faut serveur',
    'toast.defaultExported': '\u2713 T\u00e9l\u00e9charg\u00e9 \u2014 remplacez default-topo.json et red\u00e9marrez Docker',
    'zones.setDefaultInfo.title': 'D\u00e9finir une topologie par d\u00e9faut',
    'zones.setDefaultInfo.step1': '1. Configurez les zones comme souhait\u00e9, puis cliquez sur Exporter JSON.',
    'zones.setDefaultInfo.step2': '2. Sauvegardez le fichier sous default-topo.json dans le dossier du projet (\u00e0 c\u00f4t\u00e9 de docker-compose.yml).',
    'zones.setDefaultInfo.step3': '3. Relancez le container : docker compose restart topo-vision',
    'zones.setDefaultInfo.note': 'Le fichier default-topo.example.json du d\u00e9p\u00f4t est un mod\u00e8le de d\u00e9part.',
    'ui.close': 'Fermer',
    'zones.title': '\u00c9diteur de zones',
    'zones.export': 'Exporter JSON',
    'zones.import': 'Importer JSON',
    'zones.setDefault': 'D\u00e9finir par d\u00e9faut',
    'zones.reset': 'R\u00e9initialiser',
    'zones.help': "Glissez-d\u00e9posez une zone entre colonnes. Cliquez sur le nom pour modifier les slugs, la couleur, l'ordre. La zone \"virtual\" g\u00e8re des familles \u00e0 pr\u00e9fixes.",
    'zones.left': 'Colonne gauche',
    'zones.mid': 'Colonne centrale',
    'zones.right': 'Colonne droite',
    'zones.line': 'Ligne',
    'zone.key': 'Cl\u00e9 (ID)',
    'zone.label': 'Libell\u00e9',
    'zone.color': 'Couleur',
    'zone.order': 'Ordre',
    'zone.slugs': 'Slugs de r\u00f4le NetBox (Entr\u00e9e pour ajouter)',
    'zone.virtualLayout': 'Layout virtuel (bulles)',
    'zone.bubbleMaxPerRow': 'Max bulles/ligne (0=d\u00e9sactiv\u00e9)',
    'zone.virtualGroups': 'Groupes pour layout virtuel (avanc\u00e9)',
    'zone.virtualHelp': 'Regroupement par pr\u00e9fixe. Une ligne : famille,pr\u00e9fixe1,pr\u00e9fixe2\u2026',
    'zone.delete': 'Supprimer',
    'fav.title': 'Enregistrer la vue comme favori',
    'fav.save': 'Enregistrer comme favori',
    'fav.name': 'Nom',
    'fav.layers': 'Restreindre aux couches (optionnel, cl\u00e9s s\u00e9par\u00e9es par virgules)',
    'fav.layersHelp': 'Pour recr\u00e9er le raccourci "Sites distants" : saisir "sdwan, firewall-distant".',
    'toast.connSuccess': '\u2713 Connect\u00e9',
    'toast.connFail': '\u2715 Connexion \u00e9chou\u00e9e',
    'toast.savedSettings': '\u2713 Param\u00e8tres enregistr\u00e9s',
    'toast.savedZones': '\u2713 Couches enregistr\u00e9es',
    'toast.resetDone': '\u2713 Donn\u00e9es locales effac\u00e9es',
    'toast.invalidJSON': 'Fichier JSON invalide',
    'toast.favSaved': '\u2713 Favori enregistr\u00e9',
    'sidebar.device': '\u00c9quipement',
    'sidebar.wan': 'Zone WAN',
    'sidebar.cable': 'C\u00e2ble',
    'sidebar.cables': 'C\u00e2bles',
    'sidebar.cable_number': 'C\u002eble #',
    'sidebar.remote_side_wan': 'C\u00f4t\u00e9 distant \u2014 r\u00e9seau \u00e9tendu',
    'sidebar.link': 'liaison',
    'sidebar.wan_connections': 'Connexions traversant le WAN',
    'sidebar.no_wan_connections': 'Aucune connexion WAN d\u00e9tect\u00e9e',
    'sidebar.subnets': 'Sous-r\u00e9seaux du site',
    'sidebar.loading': 'Chargement\u2026',
    'sidebar.noSubnet': 'Aucun pr\u00e9fixe',
    'sidebar.site_group': 'Groupe de site',
    'sidebar.location': 'Emplacement',
    'sidebar.rack_u': 'Baie / U',
    'sidebar.manufacturer': 'Fabricant',
    'sidebar.primary_ip': 'IP primaire',
    'sidebar.general': 'G\u00e9n\u00e9ral',
    'sidebar.status': 'Statut',
    'sidebar.role': 'R\u00f4le',
    'sidebar.site': 'Site',
    'sidebar.model': 'Mod\u00e8le',
    'sidebar.serial_number': 'N\u00b0 s\u00e9rie',
    'sidebar.comments': 'Commentaires',
    'sidebar.interfaces': 'Interfaces',
    'sidebar.description': 'Description',
    'sidebar.label': 'Label',
    'sidebar.color': 'Couleur',
    'sidebar.type': 'Type',
    'sidebar.netbox_id': 'ID NetBox',
    'status.fetching_data': 'R\u00e9cup\u00e9ration des donn\u00e9es\u2026',
    'status.devices_abbr': '\u00e9quip.',
    'status.error': 'Erreur',
    'status.devices': '\u00e9quipements',
    'status.cables': 'c\u00e2bles',
    'status.layers': 'couches'
  }
};
let _lang = 'en';
function detectLang() {
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('fr') ? 'fr' : 'en';
}
function t(key) { return (I18N[_lang] && I18N[_lang][key]) || (I18N.en[key]) || key; }
function applyLanguage(lang) {
  _lang = (lang === 'fr' || lang === 'en') ? lang : 'en';
  document.documentElement.lang = _lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-tip]').forEach(el => {
    el.title = t(el.getAttribute('data-tip'));
  });
  if (typeof renderFavorites === 'function') renderFavorites();
}

// ══════════════════════════════════════════
//  4. STATE — état de vue (pan/zoom, sélection, flags runtime)
// ══════════════════════════════════════════
let viewX = 0, viewY = 0, viewScale = 1;
let isPanning = false, panStartX = 0, panStartY = 0;
let showLabels = false, showZones = true;
let selectedId = null;
let topoData = { devices: [], cables: [], edges: [] };
let currentTopoData = null;
let allSiteGroups = [], siteGroupMap = {}, deviceSiteGroupsMap = {};
let allTags = [], allManufacturers = [], allRoleSlugs = [];

// ── Défaut serveur : chargé dès le démarrage depuis /default-topo.json ──
const _serverDefaultPromise = fetch('/default-topo.json')
  .then(r => r.ok ? r.json() : null)
  .then(d => { if (d?.layers?.length) window.__SERVER_DEFAULT__ = d; })
  .catch(() => { });

// ══════════════════════════════════════════
//  5. LAYERS — structure 3 colonnes générique
//
//  Chaque couche :
//    key    : identifiant stable
//    col    : 'left' | 'mid' | 'right'
//    order  : entier, position verticale dans la colonne
//    label  : nom affiché (UI / légende)
//    color  : couleur hex (zone, badge, arêtes)
//    slugs[]: slugs de rôle NetBox à matcher (insensible à la casse, sous-chaîne)
//
//  NOTE: DEFAULT_LAYERS supprimé intentionnellement.
//  Les zones sont configurées par l'utilisateur via :
//    1. localStorage (priorité max — modifications utilisateur)
//    2. default-topo.json (zones partagées déployées par l'admin)
//    3. Si aucun des deux → liste vide, l'éditeur de zones s'ouvre vide
// ══════════════════════════════════════════

// ── Accesseurs / mutateurs des couches ──
let _layersCache = null;
function getLayers() {
  if (_layersCache) return _layersCache;
  const saved = lsGet('layers');
  if (Array.isArray(saved) && saved.length) { _layersCache = saved; return _layersCache; }
  const sd = window.__SERVER_DEFAULT__;
  // Pas de fallback sur DEFAULT_LAYERS — retourne ce que le serveur fournit ou []
  _layersCache = (sd?.layers || []).map(l => ({ ...l }));
  return _layersCache;
}
function saveLayers(arr) { _layersCache = arr; lsSet('layers', arr); }
function resetLayers() { _layersCache = null; lsDel('layers'); }
function layerByKey(key) { return getLayers().find(l => l.key === key); }

// ══════════════════════════════════════════
//  COLONNES — entités de premier plan
//
//  Chaque colonne :
//    key   : identifiant stable (utilisé par les layers via layer.col)
//    label : nom affiché dans l'éditeur
//    pos   : position horizontale (ordre gauche→droite)
// ══════════════════════════════════════════
const DEFAULT_COLUMNS = [
  { key: 'left', label: 'Left', pos: 0 },
  { key: 'mid', label: 'Middle', pos: 1 },
  { key: 'right', label: 'Right', pos: 2 },
];

let _columnsCache = null;
function getColumns() {
  if (_columnsCache) return _columnsCache;
  const saved = lsGet('columns');
  if (Array.isArray(saved) && saved.length) { _columnsCache = saved; return _columnsCache; }
  const sd = window.__SERVER_DEFAULT__;
  _columnsCache = (sd?.columns?.length ? sd.columns : DEFAULT_COLUMNS).map(c => ({ ...c }));
  return _columnsCache;
}
function saveColumns(arr) { _columnsCache = arr; lsSet('columns', arr); }
function resetColumns() { _columnsCache = null; lsDel('columns'); }

// ══════════════════════════════════════════
//  LIGNES GLOBALES — partagées entre toutes les colonnes
//
//  Chaque ligne :
//    order : entier = identifiant + position Y (correspond à layer.order)
//    label : nom affiché dans l'éditeur (ex: "Row 1", "DMZ", ...)
//
//  La propriété layer.order correspond à row.order.
//  allOrders dans buildTopology vient de getRows(), garantissant que
//  les lignes vides réservent leur espace vertical.
// ══════════════════════════════════════════
const DEFAULT_ROWS = [
  { order: 0, label: 'Row 1' },
  { order: 1, label: 'Row 2' },
  { order: 2, label: 'Row 3' },
  { order: 3, label: 'Row 4' },
  { order: 4, label: 'Row 5' },
  { order: 5, label: 'Row 6' },
  { order: 6, label: 'Row 7' },
  { order: 7, label: 'Row 8' },
  { order: 8, label: 'Row 9' },
];

let _rowsCache = null;
function getRows() {
  if (_rowsCache) return _rowsCache;
  const saved = lsGet('rows');
  if (Array.isArray(saved) && saved.length) { _rowsCache = saved; return _rowsCache; }
  const sd = window.__SERVER_DEFAULT__;
  if (sd?.rows?.length) { _rowsCache = sd.rows.map(r => ({ ...r })); return _rowsCache; }
  // Pas de DEFAULT_LAYERS — on retourne DEFAULT_ROWS directement
  _rowsCache = DEFAULT_ROWS.map(r => ({ ...r }));
  return _rowsCache;
}
function saveRows(arr) { _rowsCache = arr; lsSet('rows', arr); }
function resetRows() { _rowsCache = null; lsDel('rows'); }

// ══════════════════════════════════════════
//  6. HELPERS — couleurs, statuts, dimensions
// ══════════════════════════════════════════
const CABLE_COLORS = {
  blue: '#4a8ff0', red: '#f03050', green: '#18e09a', yellow: '#fbbf24',
  orange: '#fb923c', purple: '#9068f8', pink: '#e8608a', cyan: '#20d0e8',
  white: '#d8e3f5', black: '#485870', grey: '#485870', gray: '#485870',
  brown: '#92400e', teal: '#14b8a6', indigo: '#6366f1', violet: '#8b5cf6',
  lime: '#84cc16', amber: '#f0a020', default: '#253450'
};

// ── Constantes de layout ──
const NODE_H = 52;
const COL_GAP = 22;
const NODE_W = 220; // largeur minimale — ajustée dynamiquement par nœud
const SUB_GAP = 40;
const ROW_GAP = 80;
const V_GAP = 18;
const ZPT = 36;
const ZPB = 20;
const ZPS = 20;
const COL_SEP = 50;
const FWD_MAX = 5;

// ── Mesure de largeur de texte via canvas hors-écran ──
const _mc = (function () {
  try { return document.createElement('canvas').getContext('2d'); } catch (e) { return null; }
})();
function measureNodeW(nameStr, subStr) {
  if (!_mc) return NODE_W;
  const PAD_L = 18, PAD_R = 22;
  _mc.font = "500 11px 'DM Sans',sans-serif";
  const nameW = _mc.measureText(nameStr).width;
  _mc.font = "400 8.5px 'JetBrains Mono',monospace";
  const subW = _mc.measureText(subStr).width;
  return Math.max(NODE_W, Math.ceil(Math.max(nameW, subW)) + PAD_L + PAD_R);
}

// ── Carte globale des largeurs de nœuds (remplie par buildTopology) ──
let _nodeWidths = {};
function _nw(d) { return _nodeWidths[d.id] || NODE_W; }
function _step(d) { return _nw(d) + COL_GAP; }

// ── Retourne la couche d'un équipement (match le plus spécifique = slug le plus long) ──
function getLayer(d) {
  const slug   = (d.role?.slug || d.device_role?.slug || '').toLowerCase();
  const name   = (d.role?.name || d.device_role?.name || '').toLowerCase();
  const layers = getLayers();
  let bestLayer = null, bestLen = -1;
  layers.forEach(l => {
    if (l.key === 'other') return;
    (l.slugs || []).forEach(s => {
      if ((slug.includes(s) || name.includes(s)) && s.length > bestLen) {
        bestLen = s.length; bestLayer = l;
      }
    });
  });
  return bestLayer
    || layers.find(l => l.key === 'other')
    || { key: 'other', col: 'mid', order: 99, label: 'Other', color: '#485870', slugs: [] };
}

function getCableColor(c) {
  if (!c) return CABLE_COLORS.default;
  const n = c.toLowerCase().trim();
  if (CABLE_COLORS[n]) return CABLE_COLORS[n];
  if (/^[0-9a-f]{6}$/i.test(n)) return '#' + n;
  return CABLE_COLORS.default;
}

function getStatusBadge(s) {
  const v = (s?.value || s || '').toLowerCase();
  return {
    active: 'b-active', planned: 'b-planned', staged: 'b-staged',
    failed: 'b-failed', offline: 'b-offline', decommissioning: 'b-decom'
  }[v] || 'b-offline';
}

function hex(c) { return c.replace('#', ''); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ══════════════════════════════════════════
//  THEME — application et bascule
// ══════════════════════════════════════════
function applyTheme(theme) {
  document.documentElement.dataset.theme = (theme === 'light') ? 'light' : 'dark';
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = (theme === 'light') ? '\u2600' : '\ud83c\udf19';
}
function toggleTheme() {
  CONFIG.theme = (CONFIG.theme === 'light') ? 'dark' : 'light';
  applyTheme(CONFIG.theme);
  saveConfig();
  if (currentTopoData) render(currentTopoData);
}

// ══════════════════════════════════════════
//  TOPBAR — toggles câbles et minimap
// ══════════════════════════════════════════
function applyTopbarToggles() {
  const g = document.getElementById('btn-group');
  if (g) g.classList.toggle('on', !!CONFIG.groupCables);
  const m = document.getElementById('minimap');
  if (m) m.classList.toggle('show', !!CONFIG.showMinimap);
}
function toggleCableGrouping() {
  CONFIG.groupCables = !CONFIG.groupCables;
  saveConfig();
  applyTopbarToggles();
  if (currentTopoData) render(currentTopoData);
}

// ══════════════════════════════════════════
//  TOAST — notification légère
// ══════════════════════════════════════════
let _tt;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast show ' + (type || '');
  clearTimeout(_tt); _tt = setTimeout(() => el.className = 'toast', 4500);
}

// ══════════════════════════════════════════
//  AIDE RACCOURCIS
// ══════════════════════════════════════════
function toggleShortcutsHelp() {
  document.getElementById('shortcuts-overlay').classList.toggle('show');
}

// ══════════════════════════════════════════
//  SETTINGS MODAL
// ══════════════════════════════════════════
function openSettingsModal(tab) {
  document.getElementById('set-mode-proxy').checked = CONFIG.mode === 'proxy';
  document.getElementById('set-mode-direct').checked = CONFIG.mode === 'direct';
  document.getElementById('set-url').value = CONFIG.url || '';
  document.getElementById('set-token').value = CONFIG.token || '';
  document.getElementById('set-theme-dark').checked = CONFIG.theme !== 'light';
  document.getElementById('set-theme-light').checked = CONFIG.theme === 'light';
  document.getElementById('set-group').checked = !!CONFIG.groupCables;
  document.getElementById('set-minimap').checked = !!CONFIG.showMinimap;
  const lang = CONFIG.language || '';
  document.getElementById('set-lang-auto').checked = lang === '';
  document.getElementById('set-lang-en').checked = lang === 'en';
  document.getElementById('set-lang-fr').checked = lang === 'fr';
  document.getElementById('set-wan-enabled').checked = !!(CONFIG.wanCloud && CONFIG.wanCloud.enabled);
  document.getElementById('set-wan-label').value = CONFIG.wanCloud?.label || 'WAN';
  document.getElementById('set-wan-sublabel').value = CONFIG.wanCloud?.subLabel || '';
  const opts = getLayers().map(l => '<option value="' + l.key + '">' + l.label + ' (' + l.key + ')</option>').join('');
  document.getElementById('set-wan-src').innerHTML = opts;
  document.getElementById('set-wan-tgt').innerHTML = opts;
  document.getElementById('set-wan-src').value = CONFIG.wanCloud?.sourceLayer || 'sdwan';
  document.getElementById('set-wan-tgt').value = CONFIG.wanCloud?.targetLayer || 'firewall-distant';
  document.getElementById('set-blacklist-roles').value = (CONFIG.roleBlacklist || []).join('\n');
  const direct = document.getElementById('direct-fields');
  function syncDirect() { direct.style.display = document.getElementById('set-mode-direct').checked ? '' : 'none'; }
  syncDirect();
  document.getElementById('set-mode-proxy').onchange = syncDirect;
  document.getElementById('set-mode-direct').onchange = syncDirect;
  document.getElementById('settings-modal').classList.add('show');
  switchSettingsTab(tab || 'connection');
}
function closeSettingsModal() { document.getElementById('settings-modal').classList.remove('show'); }
function switchSettingsTab(name) {
  document.querySelectorAll('#settings-modal .modal-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('#settings-modal .settings-pane').forEach(p => p.style.display = (p.dataset.pane === name) ? '' : 'none');
}
async function testConnection() {
  const result = document.getElementById('conn-test-result');
  result.textContent = '…';
  const mode = document.querySelector('input[name=mode]:checked').value;
  const url = document.getElementById('set-url').value.trim();
  const token = document.getElementById('set-token').value.trim();
  let base, headers;
  if (mode === 'proxy') {
    base = '/api/netbox/'; headers = { 'Accept': 'application/json' };
  } else {
    base = url.replace(/\/$/, '') + '/api/';
    headers = { 'Authorization': 'Token ' + token, 'Accept': 'application/json' };
  }
  try {
    const r = await fetch(base + 'status/', { headers });
    if (r.ok) { result.textContent = t('toast.connSuccess'); result.style.color = 'var(--green)'; }
    else { result.textContent = t('toast.connFail') + ' (HTTP ' + r.status + ')'; result.style.color = 'var(--red)'; }
  } catch (e) { result.textContent = t('toast.connFail') + ' (' + e.message + ')'; result.style.color = 'var(--red)'; }
}
function saveSettings() {
  CONFIG.mode = document.querySelector('input[name=mode]:checked').value;
  CONFIG.url = document.getElementById('set-url').value.trim();
  CONFIG.token = document.getElementById('set-token').value.trim();
  CONFIG.theme = document.querySelector('input[name=theme]:checked').value;
  CONFIG.groupCables = document.getElementById('set-group').checked;
  CONFIG.showMinimap = document.getElementById('set-minimap').checked;
  CONFIG.language = document.querySelector('input[name=lang]:checked').value;
  CONFIG.wanCloud = {
    enabled: document.getElementById('set-wan-enabled').checked,
    label: document.getElementById('set-wan-label').value.trim() || 'WAN',
    subLabel: document.getElementById('set-wan-sublabel').value.trim(),
    sourceLayer: document.getElementById('set-wan-src').value,
    targetLayer: document.getElementById('set-wan-tgt').value
  };
  CONFIG.roleBlacklist = document.getElementById('set-blacklist-roles').value
    .split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
  saveConfig(); applyTheme(CONFIG.theme); applyLanguage(CONFIG.language || detectLang());
  applyTopbarToggles(); closeSettingsModal(); showToast(t('toast.savedSettings'), 'ok'); loadTopology();
}
function resetAllLocalConfig() {
  if (!confirm(t('settings.reset.warn'))) return;
  lsDel('config'); lsDel('layers'); lsDel('columns'); lsDel('rows'); lsDel('favorites');
  CONFIG = Object.assign({}, DEFAULT_CONFIG); resetLayers(); resetColumns(); resetRows();
  // Après reset, recharge depuis default-topo.json si disponible — sinon liste vide
  const sd = window.__SERVER_DEFAULT__;
  if (sd) {
    if (sd.layers?.length) saveLayers(sd.layers.map(l => ({ ...l })));
    if (sd.columns?.length) saveColumns(sd.columns.map(c => ({ ...c })));
    if (sd.rows?.length) saveRows(sd.rows.map(r => ({ ...r })));
    if (sd.blacklist?.roles) { CONFIG.roleBlacklist = sd.blacklist.roles; saveConfig(); }
  }
  showToast(t('toast.resetDone'), 'ok'); setTimeout(() => location.reload(), 500);
}

function showSetDefaultInfo() {
  document.getElementById('set-default-info-modal').classList.add('show');
}

// ══════════════════════════════════════════
//  ZONE EDITOR MODAL — colonnes dynamiques
// ══════════════════════════════════════════

let _editingLayers = null;
let _editingColumns = null;
let _editingRows = null;
let _dragState = null; // couche en cours de drag

function openZonesModal() {
  _editingLayers = JSON.parse(JSON.stringify(getLayers()));
  _editingColumns = JSON.parse(JSON.stringify(getColumns()));
  _editingRows = JSON.parse(JSON.stringify(getRows()));
  _dragState = null;
  renderZoneEditor();
  document.getElementById('zones-modal').classList.add('show');
}

function closeZonesModal() {
  _editingLayers = null; _editingColumns = null; _editingRows = null; _dragState = null;
  document.getElementById('zones-modal').classList.remove('show');
}

function addColumn() {
  const pos = _editingColumns.length > 0 ? Math.max(..._editingColumns.map(c => c.pos)) + 1 : 0;
  _editingColumns.push({ key: 'col-' + Math.random().toString(36).slice(2, 7), label: 'New column', pos });
  renderZoneEditor();
}

function _deleteColumn(colKey) {
  const remaining = _editingColumns.filter(c => c.key !== colKey);
  const fallback = remaining[0]?.key;
  if (fallback) _editingLayers.forEach(l => { if (l.col === colKey) l.col = fallback; });
  _editingColumns = remaining;
  renderZoneEditor();
}

function addRow() {
  const maxOrd = _editingRows.length > 0 ? Math.max(..._editingRows.map(r => r.order)) + 1 : 0;
  _editingRows.push({ order: maxOrd, label: 'Row ' + (_editingRows.length + 1) });
  renderZoneEditor();
}

function _deleteRow(order) {
  _editingRows = _editingRows.filter(r => r.order !== order);
  // Supprimer les layers sur cette ligne
  _editingLayers = _editingLayers.filter(l => l.order !== order);
  renderZoneEditor();
}

function escAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

// ── Éditeur vue grille : rows × columns ──
function renderZoneEditor() {
  const container = document.getElementById('zone-editor-container');
  if (!container) return;
  container.innerHTML = '';

  const cols = [..._editingColumns].sort((a, b) => a.pos - b.pos);
  const rows = [..._editingRows].sort((a, b) => a.order - b.order);

  // ─── Grille CSS dynamique ───
  // Colonne 0 = en-tête des lignes | Colonnes 1..N = colonnes de zones
  const grid = document.createElement('div');
  grid.className = 'zed-grid';
  grid.style.gridTemplateColumns = '120px ' + cols.map(() => '1fr').join(' ') + ' auto';

  // ─── Ligne d'en-tête des colonnes ───
  // Cellule vide coin supérieur gauche
  const cornerCell = document.createElement('div');
  cornerCell.className = 'zed-corner';
  grid.appendChild(cornerCell);

  cols.forEach((col, ci) => {
    const head = document.createElement('div');
    head.className = 'zed-col-head';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'zed-col-name'; nameSpan.textContent = col.label;
    nameSpan.title = 'Cliquer pour renommer';
    nameSpan.onclick = () => {
      const inp2 = document.createElement('input');
      inp2.value = col.label; inp2.className = 'input';
      inp2.style.cssText = 'width:80px;font-size:10px;padding:2px 5px';
      nameSpan.replaceWith(inp2); inp2.focus(); inp2.select();
      const commit = () => { col.label = inp2.value.trim() || col.label; renderZoneEditor(); };
      inp2.onblur = commit;
      inp2.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } };
    };
    head.appendChild(nameSpan);

    const acts = document.createElement('div'); acts.className = 'zed-head-acts';
    if (ci > 0) {
      const b = document.createElement('button'); b.className = 'btn tiny'; b.textContent = '←';
      b.onclick = () => { const prev = cols[ci - 1];[col.pos, prev.pos] = [prev.pos, col.pos]; renderZoneEditor(); };
      acts.appendChild(b);
    }
    if (ci < cols.length - 1) {
      const b = document.createElement('button'); b.className = 'btn tiny'; b.textContent = '→';
      b.onclick = () => { const next = cols[ci + 1];[col.pos, next.pos] = [next.pos, col.pos]; renderZoneEditor(); };
      acts.appendChild(b);
    }
    if (cols.length > 1) {
      const b = document.createElement('button'); b.className = 'btn tiny danger'; b.textContent = '✕';
      b.onclick = () => {
        const hasL = _editingLayers.some(l => l.col === col.key);
        if (hasL && !confirm('Supprimer "' + col.label + '" ?')) return;
        _deleteColumn(col.key);
      };
      acts.appendChild(b);
    }
    head.appendChild(acts);
    grid.appendChild(head);
  });

  // Cellule coin supérieur droit : bouton "+ Colonne"
  const addColCell = document.createElement('div');
  addColCell.className = 'zed-corner';
  const addColBtn = document.createElement('button');
  addColBtn.className = 'btn tiny'; addColBtn.textContent = '+ Col';
  addColBtn.onclick = addColumn;
  addColCell.appendChild(addColBtn);
  grid.appendChild(addColCell);

  // ─── Lignes de données ───
  rows.forEach((row) => {
    // En-tête de ligne
    const rowHead = document.createElement('div');
    rowHead.className = 'zed-row-head';

    const rowName = document.createElement('span');
    rowName.className = 'zed-row-name'; rowName.textContent = row.label;
    rowName.title = 'Cliquer pour renommer';
    rowName.onclick = () => {
      const inp2 = document.createElement('input');
      inp2.value = row.label; inp2.className = 'input';
      inp2.style.cssText = 'width:80px;font-size:10px;padding:2px 5px';
      rowName.replaceWith(inp2); inp2.focus(); inp2.select();
      const commit = () => { row.label = inp2.value.trim() || row.label; renderZoneEditor(); };
      inp2.onblur = commit;
      inp2.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } };
    };
    rowHead.appendChild(rowName);

    const rowActs = document.createElement('div'); rowActs.className = 'zed-head-acts';
    if (rows.length > 1) {
      const b = document.createElement('button'); b.className = 'btn tiny danger'; b.textContent = '✕';
      b.title = 'Supprimer cette ligne (et ses zones)';
      b.onclick = () => {
        const hasL = _editingLayers.some(l => l.order === row.order);
        if (hasL && !confirm('Supprimer la ligne "' + row.label + '" et ses ' + _editingLayers.filter(l => l.order === row.order).length + ' zone(s) ?')) return;
        _deleteRow(row.order);
      };
      rowActs.appendChild(b);
    }
    rowHead.appendChild(rowActs);
    grid.appendChild(rowHead);

    // Cellules de cette ligne (une par colonne)
    cols.forEach(col => {
      const cell = document.createElement('div');
      cell.className = 'zed-cell';
      cell.dataset.col = col.key;
      cell.dataset.order = row.order;

      const zonesInCell = _editingLayers.filter(l => l.col === col.key && l.order === row.order);
      const cardsWrap = document.createElement('div'); cardsWrap.className = 'zed-cell-cards';
      zonesInCell.forEach(layer => cardsWrap.appendChild(buildZoneCard(layer)));
      cell.appendChild(cardsWrap);

      // Bouton "+" dans chaque cellule
      const addZoneBtn = document.createElement('button');
      addZoneBtn.className = 'zed-cell-add'; addZoneBtn.textContent = '+';
      addZoneBtn.title = 'Ajouter une zone ici';
      addZoneBtn.onclick = () => addZoneInCell(col.key, row.order);
      cell.appendChild(addZoneBtn);

      // Drop sur la cellule
      cell.addEventListener('dragover', e => {
        if (!_dragState) return; e.preventDefault();
        if (!e.target.closest('.zone-card')) cell.classList.add('zed-cell-hover');
      });
      cell.addEventListener('dragleave', e => {
        if (!e.relatedTarget?.closest('.zed-cell[data-col="' + col.key + '"][data-order="' + row.order + '"]'))
          cell.classList.remove('zed-cell-hover');
      });
      cell.addEventListener('drop', e => {
        if (!_dragState) return; e.preventDefault(); e.stopPropagation();
        cell.classList.remove('zed-cell-hover');
        if (e.target.closest('.zone-card')) return; // géré par la card
        _dragState.col = col.key; _dragState.order = row.order; _dragState = null;
        renderZoneEditor();
      });

      grid.appendChild(cell);
    });

    // Cellule vide (colonne "+ Colonne") sur cette ligne
    grid.appendChild(document.createElement('div'));
  });

  // ─── Ligne "+ Ligne" ───
  const addRowHead = document.createElement('div');
  addRowHead.className = 'zed-row-head';
  const addRowBtn = document.createElement('button');
  addRowBtn.className = 'btn tiny'; addRowBtn.textContent = '+ ' + t('zones.line');
  addRowBtn.onclick = addRow;
  addRowHead.appendChild(addRowBtn);
  grid.appendChild(addRowHead);

  // Cellules vides sur la dernière ligne
  cols.forEach(() => grid.appendChild(document.createElement('div')));
  grid.appendChild(document.createElement('div'));

  container.appendChild(grid);
}

function addZoneInCell(colKey, order) {
  const label = prompt('Nom de la zone :', 'New zone');
  if (label === null) return; // annulé
  _editingLayers.push({
    key: 'zone-' + Math.random().toString(36).slice(2, 7),
    col: colKey, order,
    label: label.trim() || 'New zone',
    color: '#4a8ff0', slugs: []
  });
  renderZoneEditor();
}

function addZone(col) {
  const rows = (_editingRows || getRows()).slice().sort((a, b) => a.order - b.order);
  const opts = rows.map(r => r.order + ': ' + r.label).join(', ');
  const choice = prompt('Sur quelle ligne ? (' + opts + ')', rows[0]?.order ?? 0);
  if (choice === null) return;
  const order = parseInt(choice, 10);
  if (isNaN(order)) return;
  addZoneInCell(col, order);
}


function _dropBetween(targetCol, fractionalOrder) {
  // Non utilisé dans la vue grille (les drops se font directement sur les cellules)
  // Conservé pour compatibilité
  if (!_dragState) return;
  const layer = _dragState; _dragState = null;
  layer.col = targetCol;
  // Trouver la row la plus proche
  const rows = (_editingRows || []).map(r => r.order).sort((a, b) => a - b);
  layer.order = rows.find(o => o >= fractionalOrder) ?? (rows[rows.length - 1] ?? 0);
  renderZoneEditor();
}


function buildZoneCard(layer) {
  const card = document.createElement('div');
  card.className = 'zone-card'; card.style.borderLeftColor = layer.color;
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    _dragState = layer; card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', layer.key);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging'); _dragState = null;
    document.querySelectorAll('.drop-slot-active,.row-group-hover,.card-merge-target')
      .forEach(el => el.classList.remove('drop-slot-active', 'row-group-hover', 'card-merge-target'));
  });
  card.addEventListener('dragover', e => {
    if (!_dragState || _dragState === layer) return;
    e.preventDefault(); e.stopPropagation(); card.classList.add('card-merge-target');
  });
  card.addEventListener('dragleave', () => card.classList.remove('card-merge-target'));
  card.addEventListener('drop', e => {
    if (!_dragState || _dragState === layer) return;
    e.preventDefault(); e.stopPropagation(); card.classList.remove('card-merge-target');
    _dragState.col = layer.col; _dragState.order = layer.order; _dragState = null;
    renderZoneEditor();
  });

  const hasVG = layer.virtualGroups != null;
  const slugChips = (layer.slugs || []).map(s => '<span class="tagchip">' + esc(s) + '<span data-rm="' + esc(s) + '">×</span></span>').join('');
  const vgText = (layer.virtualGroups || []).map(g => g.family + ',' + (g.prefixes || []).join(',')).join('\n');

  card.innerHTML =
    '<div class="zone-card-row">' +
    '<span style="width:8px;height:8px;border-radius:50%;background:' + layer.color + ';flex-shrink:0"></span>' +
    '<span class="zone-card-name">' + esc(layer.label) + '</span>' +
    '<span class="zone-card-key">' + esc(layer.key) + '</span>' +
    '<div class="zone-card-actions"><button class="btn tiny danger" data-action="del">' + t('zone.delete') + '</button></div>' +
    '</div>' +
    '<details><summary>edit</summary>' +
    '<div class="zone-card-row"><label class="field-label" style="flex:0 0 80px">' + (t('zone.key') || 'Clé (ID)') + '</label><input class="input mini" data-f="key" value="' + escAttr(layer.key) + '" placeholder="ex: internet-dmz"></div>' +
    '<div class="zone-card-row"><label class="field-label" style="flex:0 0 80px">' + t('zone.label') + '</label><input class="input" data-f="label" value="' + escAttr(layer.label) + '"></div>' +
    '<div class="zone-card-row"><label class="field-label" style="flex:0 0 80px">' + t('zone.color') + '</label><input class="input input-color" type="color" data-f="color" value="' + layer.color + '"></div>' +
    '<div class="zone-card-row" style="align-items:flex-start"><label class="field-label" style="flex:0 0 80px;padding-top:6px">' + t('zone.slugs') + '</label>' +
    '<div class="taglist" data-f="slugs" style="flex:1">' + slugChips + '<input placeholder="…"></div>' +
    '</div>' +
    '<div class="zone-card-row"><label class="checkbox" style="gap:6px"><input type="checkbox" data-f="gridLayout"' + (layer.gridLayout ? ' checked' : '') + '>' +
    '<span>' + (t('zone.gridLayout') || 'Layout grille') + '</span></label></div>' +
    '<div class="zone-card-row grid-max-row" style="' + (layer.gridLayout ? '' : 'display:none') + '">' +
    '<label class="field-label" style="flex:0 0 80px">' + (t('zone.gridMaxPerRow') || 'Max/ligne') + '</label>' +
    '<input class="input mini" type="number" data-f="gridMaxPerRow" value="' + (layer.gridMaxPerRow || 5) + '" min="1" max="20">' +
    '</div>' +
    '<div class="zone-card-row"><label class="checkbox" style="gap:6px"><input type="checkbox" data-f="virtualGroups-toggle"' + (hasVG ? ' checked' : '') + '>' +
    '<span>' + (t('zone.virtualLayout') || 'Layout virtuel (bulles)') + '</span></label>' +
    '<button class="btn tiny" style="margin-left:auto" onclick="openVirtHelp(event)">?</button></div>' +
    (hasVG ?
      '<div class="zone-card-row" style="align-items:flex-start"><label class="field-label" style="flex:0 0 80px;padding-top:6px">' + t('zone.virtualGroups') + '</label>' +
      '<textarea class="textarea" data-f="virtualGroups" style="flex:1;font-size:10px">' + esc(vgText) + '</textarea></div>' +
      '<div class="field-help">' + t('zone.virtualHelp') + '</div>' +
      '<div class="zone-card-row"><label class="field-label" style="flex:0 0 80px">' + (t('zone.bubbleMaxPerRow') || 'Max bulles/ligne') + '</label>' +
      '<input class="input mini" type="number" data-f="bubbleMaxPerRow" value="' + (layer.bubbleMaxPerRow || 0) + '" min="0" max="20" placeholder="0"></div>' : '') +
    '</details>';

  card.querySelector('[data-action=del]').onclick = () => {
    _editingLayers = _editingLayers.filter(l => l !== layer); renderZoneEditor();
  };
  card.querySelectorAll('[data-f]').forEach(inp => {
    if (inp.tagName === 'INPUT' || inp.tagName === 'TEXTAREA') {
      const fn = () => {
        updateLayerFromInput(layer, inp);
        if (inp.getAttribute('data-f') === 'gridLayout') {
          const row = card.querySelector('.grid-max-row');
          if (row) row.style.display = layer.gridLayout ? '' : 'none';
        }
      };
      inp.addEventListener('change', fn);
      inp.addEventListener('blur', () => updateLayerFromInput(layer, inp));
    }
  });
  const tagList = card.querySelector('.taglist');
  if (tagList) {
    tagList.querySelectorAll('[data-rm]').forEach(x => {
      x.onclick = () => { layer.slugs = (layer.slugs || []).filter(s => s !== x.getAttribute('data-rm')); renderZoneEditor(); };
    });
    const tinp = tagList.querySelector('input');
    let acDiv = null;
    function showAC(items) {
      if (!acDiv) { acDiv = document.createElement('div'); acDiv.className = 'slug-autocomplete'; tagList.appendChild(acDiv); }
      acDiv.innerHTML = items.map(s => `<div class="slug-ac-item" data-s="${escAttr(s)}">${esc(s)}</div>`).join('');
      acDiv.style.display = items.length ? '' : 'none';
      acDiv.querySelectorAll('.slug-ac-item').forEach(el => {
        el.addEventListener('mousedown', ev => {
          ev.preventDefault();
          const s = el.getAttribute('data-s');
          if (s && !(layer.slugs || []).includes(s)) { layer.slugs = [...(layer.slugs || []), s]; renderZoneEditor(); }
        });
      });
    }
    function hideAC() { if (acDiv) acDiv.style.display = 'none'; }
    tinp.addEventListener('input', () => {
      const q = tinp.value.trim().toLowerCase();
      if (!q) { hideAC(); return; }
      const existing = new Set(layer.slugs || []);
      showAC((allRoleSlugs || []).filter(s => s.includes(q) && !existing.has(s)).slice(0, 10));
    });
    tinp.addEventListener('blur', () => setTimeout(hideAC, 150));
    tinp.addEventListener('keydown', e => {
      if (e.key === 'Escape') { hideAC(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(acDiv?.querySelectorAll('.slug-ac-item') || [])];
        if (!items.length) return;
        const fi = items.findIndex(i => i.classList.contains('focused'));
        items[fi]?.classList.remove('focused');
        const ni = e.key === 'ArrowDown' ? Math.min(fi + 1, items.length - 1) : Math.max(fi - 1, 0);
        items[fi < 0 && e.key === 'ArrowDown' ? 0 : ni]?.classList.add('focused');
        return;
      }
      if (e.key === 'Enter' && tinp.value.trim()) {
        e.preventDefault();
        const focused = acDiv?.querySelector('.slug-ac-item.focused');
        const val = focused ? focused.getAttribute('data-s') : tinp.value.trim().toLowerCase();
        if (val && !(layer.slugs || []).includes(val)) { layer.slugs = [...(layer.slugs || []), val]; renderZoneEditor(); }
        else hideAC();
      }
    });
  }
  return card;
}

function updateLayerFromInput(layer, inp) {
  const f = inp.getAttribute('data-f');
  if (f === 'gridLayout') layer.gridLayout = inp.checked;
  else if (f === 'gridMaxPerRow') layer.gridMaxPerRow = Math.max(1, +inp.value || 5);
  else if (f === 'key') {
    const newKey = inp.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!newKey) { inp.value = layer.key; return; }
    if (_editingLayers.some(l => l !== layer && l.key === newKey)) {
      inp.value = layer.key;
      showToast((t('toast.keyConflict') || 'Clé déjà utilisée'), 'err');
      return;
    }
    layer.key = newKey; inp.value = newKey;
    const span = inp.closest('.zone-card')?.querySelector('.zone-card-key');
    if (span) span.textContent = newKey;
  } else if (f === 'bubbleMaxPerRow') {
    layer.bubbleMaxPerRow = Math.max(0, +inp.value || 0);
  } else if (f === 'virtualGroups-toggle') {
    layer.virtualGroups = inp.checked ? (layer.virtualGroups || []) : null;
    renderZoneEditor();
  } else if (f === 'virtualGroups') {
    layer.virtualGroups = inp.value.split('\n').map(line => {
      const parts = line.split(',').map(s => s.trim()).filter(Boolean);
      return parts.length ? { family: parts[0], prefixes: parts.slice(1) } : null;
    }).filter(Boolean);
  } else if (f !== 'slugs') layer[f] = inp.value;
}

function openVirtHelp(e) {
  e && e.stopPropagation();
  const isFR = (CONFIG.language || detectLang()) === 'fr';
  document.getElementById('virt-help-content').innerHTML = `
    <p style="margin-bottom:12px">${isFR ? 'Regroupe les équipements en <strong>bulles visuelles</strong> selon le préfixe de leur nom.' : 'Groups devices into <strong>visual bubbles</strong> based on their name prefix.'}</p>
    <div class="field-label" style="margin-bottom:6px">${isFR ? 'Syntaxe (une ligne par groupe) :' : 'Syntax (one line per group):'}</div>
    <pre class="virt-help-pre">famille,PREFIX1,PREFIX2,…</pre>
    <div class="field-label" style="margin:10px 0 6px">${isFR ? 'Familles intégrées (comportement spécial) :' : 'Built-in families (special layout):'}</div>
    <table class="virt-help-table">
      <tr><th>sw</th><td>${isFR ? 'Switches — 1 ou 2 lignes (TOP/BOT/MGMT dans le nom → 2ᵉ ligne)' : 'Switches — 1 or 2 rows (TOP/BOT/MGMT in name → 2nd row)'}</td></tr>
      <tr><th>esx</th><td>${isFR ? 'Hôtes ESX — grille 2 colonnes' : 'ESX hosts — 2-column grid'}</td></tr>
      <tr><th>vrtx</th><td>${isFR ? 'Châssis Dell VRTX — ligne simple, sans bulle' : 'Dell VRTX chassis — single row, no bubble'}</td></tr>
      <tr><th><em>${isFR ? 'nom libre' : 'custom name'}</em></th><td>${isFR ? "N'importe quel nom → ligne horizontale dans une bulle" : 'Any name → horizontal row inside a bubble'}</td></tr>
    </table>
    <div class="field-label" style="margin:10px 0 6px">${isFR ? 'Exemple :' : 'Example:'}</div>
    <pre class="virt-help-pre">sw,LY-SW,MRS-SW,PA-SW\nesx,LY-ESX,PA-ESX\nrouter,LY-RTR,PA-RTR</pre>
    <div class="field-help" style="margin-top:8px">${isFR
      ? '→ 3 bulles switch (une par préfixe), 2 bulles ESX, 2 bulles « router ».<br>Les équipements sans correspondance s\'affichent en ligne normale.'
      : '→ 3 switch bubbles (one per prefix), 2 ESX bubbles, 2 "router" bubbles.<br>Unmatched devices appear in a normal row.'}</div>
  `;
  document.getElementById('virt-help-modal').classList.add('show');
}
function closeVirtHelp() { document.getElementById('virt-help-modal').classList.remove('show'); }

function addZone(col) {
  const inCol = _editingLayers.filter(l => l.col === col);
  const maxOrd = inCol.length > 0 ? Math.max(...inCol.map(l => l.order)) + 10 : 0;
  _editingLayers.push({ key: 'zone-' + Math.random().toString(36).slice(2, 7), col, order: maxOrd, label: 'New zone', color: '#4a8ff0', slugs: [] });
  renderZoneEditor();
}

function saveZonesAndClose() {
  if (!_editingLayers) return;
  saveLayers(_editingLayers);
  if (_editingColumns) saveColumns(_editingColumns);
  if (_editingRows) saveRows(_editingRows);
  closeZonesModal(); showToast(t('toast.savedZones'), 'ok'); loadTopology();
}

function resetLayersConfig() {
  if (!confirm('Reset all layers, columns and rows to defaults?')) return;
  resetLayers(); resetColumns(); resetRows();
  showToast(t('toast.savedZones'), 'ok'); closeZonesModal(); loadTopology();
}

function exportLayersJSON() {
  const data = JSON.stringify({
    layers: _editingLayers || getLayers(),
    columns: _editingColumns || getColumns(),
    rows: _editingRows || getRows(),
    blacklist: { roles: CONFIG.roleBlacklist || [] }
  }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = 'topo-vision-zones_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
}

function importLayersJSON() {
  const inp = document.getElementById('hidden-file-input');
  inp.onchange = async ev => {
    const file = ev.target.files[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (Array.isArray(parsed)) { _editingLayers = parsed; }
      else if (parsed.layers) {
        _editingLayers = parsed.layers;
        if (Array.isArray(parsed.columns)) _editingColumns = parsed.columns;
        if (Array.isArray(parsed.rows)) _editingRows = parsed.rows;
        if (Array.isArray(parsed.blacklist?.roles)) { CONFIG.roleBlacklist = parsed.blacklist.roles; saveConfig(); }
      } else throw new Error('Invalid');
      renderZoneEditor();
    } catch (e) { showToast(t('toast.invalidJSON'), 'err'); }
    inp.value = '';
  };
  inp.click();
}
