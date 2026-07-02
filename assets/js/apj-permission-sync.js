/* APJ PERMISSION SYNC V182 - LEVEL_PERMISSION + MODUL_ACCESS guard + permission notice modal */
(function(){
  'use strict';

  var CFG = window.APJ_CONFIG || {};
  var STORAGE = CFG.storage || {};
  var KEYS = {
    active: STORAGE.active || 'APJ_SESSION_ACTIVE',
    token: STORAGE.token || 'APJ_SESSION_TOKEN',
    level: STORAGE.level || 'APJ_USER_LEVEL',
    permissions: STORAGE.permissions || 'APJ_USER_PERMISSIONS',
    modules: STORAGE.modules || 'APJ_MODULE_ACCESS'
  };

  var FULL_ACCESS_LEVELS = ['OWNER','SUPERADMIN','SUPER ADMIN'];

  function copyObject_(obj){
    var out = {};
    Object.keys(obj || {}).forEach(function(key){ out[key] = obj[key]; });
    return out;
  }
  function asPermissionString_(value){
    if (Array.isArray(value)) return value.join(',');
    return String(value || '').trim();
  }
  function cleanRegistryUrl_(url){
    var raw = String(url || '').split('#')[0].split('?')[0];
    return raw.split('/').pop().toLowerCase();
  }
  function menuItems_(){
    var rows = CFG.menu && Array.isArray(CFG.menu.items) ? CFG.menu.items : [];
    return rows.filter(function(item){ return item && cleanRegistryUrl_(item.href || item.url); });
  }
  function buildPermissionMap_(fallback){
    var map = copyObject_(fallback);
    menuItems_().forEach(function(item){
      var href = cleanRegistryUrl_(item.href || item.url);
      var permission = asPermissionString_(item.permission || item.permissionKey);
      if (href && permission) map[href] = permission;
    });
    return map;
  }
  function buildModuleKeyMap_(fallback){
    var map = copyObject_(fallback);
    menuItems_().forEach(function(item){
      var href = cleanRegistryUrl_(item.href || item.url);
      var moduleKey = String(item.moduleKey || item.MODULE_KEY || '').trim();
      if (href && moduleKey) map[href] = moduleKey;
    });
    return map;
  }
  function mergeConfigObject_(fallback, configObject){
    var map = copyObject_(fallback);
    Object.keys(configObject || {}).forEach(function(key){ map[key] = configObject[key]; });
    return map;
  }

  var PAGE_PERMISSION_FALLBACK = {
    'dashboard.html': 'dashboardUtama',
    'dashboard-inventory.html': 'dashboardInventory',
    'input-stok.html': 'inputStok',
    'output-stok.html': 'outputStok',
    'stok-opname.html': 'stokOpname',
    'lihat-stok.html': 'lihatStok',
    'preparasi.html': 'preparasi',
    'produksi.html': 'produksi',
    'transfer-produksi.html': 'transferItem',
    'produk-outlet.html': 'produkOutlet',
    'setup-inventory.html': 'setupInventory',
    'riwayat-inventory.html': 'jurnalStokAudit',
    'dashboard-absensi.html': 'dashboardAbsensi',
    'absensi.html': 'absensiCheck',
    'rekap-absensi.html': 'rekapAbsensi',
    'hr-karyawan.html': 'dataKaryawan',
    'dashboard-keuangan.html': 'dashboardKeuangan',
    'input-kas-bank.html': 'inputKasBank'
  };
  var PAGE_PERMISSION = buildPermissionMap_(PAGE_PERMISSION_FALLBACK);

  var URL_PERMISSION = buildPermissionMap_(PAGE_PERMISSION_FALLBACK);

  var MODULE_KEY_BY_URL_FALLBACK = {
    'dashboard.html': 'DASHBOARD_UTAMA',
    'dashboard-inventory.html': 'DASHBOARD_INVENTORY',
    'input-stok.html': 'INPUT_STOK',
    'output-stok.html': 'OUTPUT_STOK',
    'stok-opname.html': 'STOK_OPNAME',
    'lihat-stok.html': 'LIHAT_STOK',
    'preparasi.html': 'PREPARASI',
    'produksi.html': 'PRODUKSI',
    'transfer-produksi.html': 'TRANSFER_ITEM',
    'produk-outlet.html': 'PRODUK_OUTLET',
    'setup-inventory.html': 'SETUP_INVENTORY',
    'riwayat-inventory.html': 'JURNAL_STOK_AUDIT',
    'dashboard-absensi.html': 'DASHBOARD_ABSENSI',
    'absensi.html': 'CHECK_IN_OUT',
    'rekap-absensi.html': 'REKAP_ABSENSI',
    'hr-karyawan.html': 'DATA_KARYAWAN',
    'dashboard-keuangan.html': 'DASHBOARD_KEUANGAN',
    'input-kas-bank.html': 'INPUT_KAS_BANK'
  };
  var MODULE_KEY_BY_URL = buildModuleKeyMap_(MODULE_KEY_BY_URL_FALLBACK);

  var TAB_PERMISSION_FALLBACK = {
    'karyawan': 'dataKaryawan',
    'shift': 'shiftKerja',
    'jadwal': 'jadwalKaryawan',
    'akses': 'aksesOutlet',
    'rekap-outlet': 'rekapHarianOutlet',
    'kas-masuk': 'kasMasuk',
    'kas-keluar': 'kasKeluar',
    'transfer': 'transferKasBank',
    'kasbon': 'kasbonKaryawan',
    'kategori': 'kategoriTransaksi',
    'laporan': 'laporanKas'
  };
  var TAB_PERMISSION = mergeConfigObject_(TAB_PERMISSION_FALLBACK, CFG.menu && CFG.menu.tabs);

  var ALIASES_FALLBACK = {
    dashboardUtama: ['dashboard'],
    dashboardInventory: ['inventory'],
    transferItem: ['transferProduksi','transferProduk'],
    jurnalStokAudit: ['riwayatTransaksi','riwayatInventory'],
    absensiCheck: ['absensiDiri'],
    rekapAbsensi: ['absensiAdmin'],
    dataKaryawan: ['hrKaryawan','absensiAdmin'],
    dashboardAbsensi: ['absensiAdmin'],
    dashboardKeuangan: ['keuangan'],
    inputKasBank: ['keuangan'],
    rekapHarianOutlet: ['keuangan'],
    kasMasuk: ['keuangan'],
    kasKeluar: ['keuangan'],
    transferKasBank: ['keuangan'],
    kasbonKaryawan: ['keuangan'],
    kategoriTransaksi: ['keuangan'],
    laporanKas: ['keuangan'],
    setupInventory: ['admin']
  };
  var ALIASES = mergeConfigObject_(ALIASES_FALLBACK, CFG.menu && CFG.menu.aliases);

  function safeJson(value, fallback){ try { return value ? JSON.parse(value) : fallback; } catch(e){ return fallback; } }
  function escapeHtml(value){ return String(value == null ? '' : value).replace(/[&<>'"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]; }); }
  function normalizeKey(key){ return String(key || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, ''); }
  function normalizeStatus(v){ return String(v || '').trim().toUpperCase(); }
  function boolPerm(v){
    if (v === true) return true;
    if (typeof v === 'number') return v > 0;
    var s = String(v || '').trim().toUpperCase();
    return ['Y','YA','YES','TRUE','1','AKTIF','ALLOW','ALLOWED'].indexOf(s) >= 0;
  }
  function getLevel(){ return String(localStorage.getItem(KEYS.level) || '').trim().toUpperCase(); }
  function isFullAccess(){ return FULL_ACCESS_LEVELS.indexOf(getLevel()) >= 0; }
  function isLoggedIn(){ return localStorage.getItem(KEYS.active) === 'true' && !!localStorage.getItem(KEYS.token); }
  function getPerms(){ return safeJson(localStorage.getItem(KEYS.permissions), {}) || {}; }
  function getModules(){ var m = safeJson(localStorage.getItem(KEYS.modules), []); return Array.isArray(m) ? m : []; }
  function hasOwnPermission(perms, key){
    if (!key) return false;
    return Object.prototype.hasOwnProperty.call(perms, key) || Object.prototype.hasOwnProperty.call(perms, normalizeKey(key));
  }
  function valueForPermission(perms, key){
    if (Object.prototype.hasOwnProperty.call(perms, key)) return perms[key];
    var nk = normalizeKey(key);
    if (Object.prototype.hasOwnProperty.call(perms, nk)) return perms[nk];
    return undefined;
  }
  function hasPermissionKey(key){
    key = String(key || '').trim();
    if (!key) return true;
    if (isFullAccess()) return true;
    var perms = getPerms();
    if (hasOwnPermission(perms, key)) return boolPerm(valueForPermission(perms, key));
    var aliases = ALIASES[key] || ALIASES[normalizeKey(key)] || [];
    return aliases.some(function(alias){ return hasOwnPermission(perms, alias) && boolPerm(valueForPermission(perms, alias)); });
  }
  function splitKeys(keys){ return String(keys || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean); }
  function hasAny(keys){
    var list = Array.isArray(keys) ? keys : splitKeys(keys);
    if (!list.length) return true;
    return list.some(hasPermissionKey);
  }
  function currentPage(){ return String(location.pathname.split('/').pop() || 'dashboard.html').toLowerCase(); }
  function cleanUrl(url){
    var raw = String(url || '').split('#')[0].split('?')[0];
    return raw.split('/').pop().toLowerCase();
  }
  function linkText_(link){
    var label = link && (link.querySelector('.nav-text') || link.querySelector('.apj-nav-text'));
    return (label ? label.textContent : (link && link.textContent) || '').trim().toLowerCase();
  }
  function findRegistryItemForLink(link){
    if (!link) return null;
    var mk = String(link.getAttribute('data-module-key') || '').trim().toUpperCase();
    var href = cleanUrl(link.getAttribute('data-original-href') || link.getAttribute('href') || '');
    var text = linkText_(link);
    var rows = menuItems_();
    for (var i=0; i<rows.length; i++) {
      var item = rows[i] || {};
      var itemKey = String(item.moduleKey || item.MODULE_KEY || '').trim().toUpperCase();
      var itemUrl = cleanUrl(item.href || item.url || item.URL || '');
      var itemLabel = String(item.label || item.MODULE_NAME || '').trim().toLowerCase();
      if (mk && itemKey && mk === itemKey) return item;
      if (href && href !== '#' && itemUrl && href === itemUrl) return item;
      if (!href && text && itemLabel && text === itemLabel) return item;
    }
    return null;
  }
  function getModuleValue(m, upper, camel){ if (!m) return ''; return m[camel] || m[upper] || ''; }
  function findModuleForLink(link){
    var modules = getModules();
    if (!modules.length) return null;
    var mk = (link.getAttribute('data-module-key') || '').toUpperCase();
    var href = cleanUrl(link.getAttribute('data-original-href') || link.getAttribute('href'));
    var text = linkText_(link);
    for (var i=0; i<modules.length; i++) {
      var m = modules[i] || {};
      var modKey = String(getModuleValue(m, 'MODULE_KEY', 'moduleKey') || '').toUpperCase();
      var modUrl = cleanUrl(getModuleValue(m, 'URL', 'url'));
      var modName = String(getModuleValue(m, 'MODULE_NAME', 'moduleName') || '').trim().toLowerCase();
      if (mk && modKey === mk) return m;
      if (href && modUrl && href === modUrl) return m;
      if (!href && text && modName && text === modName) return m;
    }
    return null;
  }
  function modulePermission(m){ return getModuleValue(m, 'PERMISSION_KEY', 'permissionKey') || ''; }
  function moduleAllowed(m){
    if (!m) return true;
    if (isFullAccess()) return true;
    if (m.locked === true || m.LOCKED === true) return false;
    if (m.allowed === false || m.ALLOWED === false) return false;
    var key = modulePermission(m);
    return hasAny(key);
  }
  function moduleStatus(m){ return normalizeStatus(getModuleValue(m, 'STATUS', 'status') || 'AKTIF'); }
  function isComingSoonStatus(status){ return ['SEGERA','COMING_SOON','COMING SOON','SOON'].indexOf(status) >= 0; }
  function isRepairStatus(status){ return ['PERBAIKAN','DALAM_PERBAIKAN','DALAM PERBAIKAN','MAINTENANCE','REPAIR','MAINTENANCE_MODE'].indexOf(status) >= 0; }

  function pageRequiredPermission(){ return PAGE_PERMISSION[currentPage()] || ''; }
  function isPageAllowed(){
    if (currentPage() === 'index.html') return true;
    if (!isLoggedIn()) return true;
    return hasAny(pageRequiredPermission());
  }

  function buildNotice(){
    var existing = document.getElementById('apjPermissionNotice');
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = 'apjPermissionNotice';
    wrap.className = 'apj-permission-notice';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '' +
      '<div class="apj-permission-notice-backdrop" data-apj-permission-close="Y"></div>' +
      '<section class="apj-permission-notice-card" role="dialog" aria-modal="true" aria-labelledby="apjPermissionNoticeTitle">' +
        '<button type="button" class="apj-permission-notice-x" data-apj-permission-close="Y" aria-label="Tutup">×</button>' +
        '<div class="apj-permission-notice-icon" data-apj-permission-icon>🔒</div>' +
        '<div class="apj-permission-notice-kicker" data-apj-permission-kicker>Permission</div>' +
        '<h2 id="apjPermissionNoticeTitle" class="apj-permission-notice-title" data-apj-permission-title>Menu Terkunci</h2>' +
        '<p class="apj-permission-notice-message" data-apj-permission-message>Menu belum bisa diakses oleh akun ini.</p>' +
        '<div class="apj-permission-notice-meta" data-apj-permission-meta></div>' +
        '<div class="apj-permission-notice-actions"><button type="button" class="apj-permission-notice-ok" data-apj-permission-close="Y">Mengerti</button></div>' +
      '</section>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function(ev){
      if (ev.target && ev.target.getAttribute('data-apj-permission-close') === 'Y') closeNotice();
    });
    return wrap;
  }
  function closeNotice(){
    var wrap = document.getElementById('apjPermissionNotice');
    if (!wrap) return;
    wrap.classList.remove('apj-show');
    wrap.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('apj-permission-notice-open');
  }
  function noticeCopy(options){
    options = options || {};
    var type = options.type || 'locked';
    var menuName = options.menuName || options.name || 'Menu ini';
    var permission = options.permission || options.key || '';
    if (type === 'soon') {
      return {
        type: 'soon', icon: '⏳', kicker: 'Segera Hadir', title: 'Menu Segera Hadir',
        message: menuName + ' sedang disiapkan dan belum aktif.', meta: 'Status: SEGERA / COMING_SOON'
      };
    }
    if (type === 'repair') {
      return {
        type: 'repair', icon: '🛠️', kicker: 'Dalam Perbaikan', title: 'Menu Dalam Perbaikan',
        message: menuName + ' sedang dalam perbaikan sementara.', meta: 'Status: DALAM PERBAIKAN'
      };
    }
    if (type === 'tab') {
      return {
        type: 'locked', icon: '🔒', kicker: 'Permission', title: 'Tab Terkunci',
        message: menuName + ' belum bisa diakses oleh akun ini.', meta: 'Permission: ' + (permission || '-')
      };
    }
    return {
      type: 'locked', icon: '🔒', kicker: 'Permission', title: 'Menu Terkunci',
      message: menuName + ' belum bisa diakses oleh akun ini.', meta: 'Permission: ' + (permission || '-')
    };
  }
  function showNotice(options){
    var wrap = buildNotice();
    var copy = noticeCopy(options || {});
    wrap.className = 'apj-permission-notice apj-permission-notice-' + copy.type;
    wrap.querySelector('[data-apj-permission-icon]').textContent = copy.icon;
    wrap.querySelector('[data-apj-permission-kicker]').textContent = copy.kicker;
    wrap.querySelector('[data-apj-permission-title]').textContent = copy.title;
    wrap.querySelector('[data-apj-permission-message]').textContent = copy.message;
    var meta = wrap.querySelector('[data-apj-permission-meta]');
    if (copy.meta) { meta.textContent = copy.meta; meta.style.display = ''; }
    else { meta.textContent = ''; meta.style.display = 'none'; }
    document.body.classList.add('apj-permission-notice-open');
    window.requestAnimationFrame(function(){
      wrap.classList.add('apj-show');
      wrap.setAttribute('aria-hidden', 'false');
      var ok = wrap.querySelector('.apj-permission-notice-ok');
      if (ok) ok.focus({ preventScroll: true });
    });
  }
  function getLinkName(link){
    if (!link) return 'Menu ini';
    return link.getAttribute('data-repair-menu') || link.getAttribute('data-coming-soon-menu') || link.getAttribute('data-locked-menu') ||
      (link.querySelector('.nav-text') ? link.querySelector('.nav-text').textContent.trim() : '') ||
      link.getAttribute('title') || 'Menu ini';
  }
  function handlePermissionClick(ev){
    var target = ev.target;
    if (!target || !target.closest) return;
    var tab = target.closest('.hr-tab-locked');
    if (tab) {
      ev.preventDefault(); ev.stopImmediatePropagation(); ev.stopPropagation();
      var tabName = (tab.textContent || 'Tab ini').replace(/🔒/g, '').trim() || 'Tab ini';
      showNotice({ type: 'tab', menuName: tabName, permission: tab.getAttribute('data-permission') || '-' });
      return false;
    }
    var link = target.closest('a.nav-item, a.apj-nav-link, [data-locked-menu], [data-coming-soon-menu], [data-repair-menu]');
    if (!link) return;
    if (link.classList.contains('nav-maintenance') || link.classList.contains('apj-maintenance') || link.getAttribute('data-repair-menu')) {
      ev.preventDefault(); ev.stopImmediatePropagation(); ev.stopPropagation();
      showNotice({ type: 'repair', menuName: getLinkName(link) });
      return false;
    }
    if (link.classList.contains('nav-coming-soon') || link.classList.contains('apj-coming-soon') || link.getAttribute('data-coming-soon-menu')) {
      ev.preventDefault(); ev.stopImmediatePropagation(); ev.stopPropagation();
      showNotice({ type: 'soon', menuName: getLinkName(link) });
      return false;
    }
    if (link.classList.contains('nav-locked') || link.classList.contains('apj-locked') || link.getAttribute('data-locked-menu')) {
      ev.preventDefault(); ev.stopImmediatePropagation(); ev.stopPropagation();
      showNotice({ type: 'locked', menuName: getLinkName(link), permission: link.getAttribute('data-locked-permission') || link.getAttribute('data-permission') || '-' });
      return false;
    }
  }
  document.addEventListener('click', handlePermissionClick, true);
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape') closeNotice();
  });

  function renderAccessDenied(required){
    var target = document.querySelector('main.apj-main') || document.querySelector('main') || document.body;
    if (!target) return;
    target.innerHTML = '<div class="apj-permission-denied"><div class="apj-permission-denied-card"><div class="apj-denied-lock">🔒</div><h1>Akses Ditolak</h1><p>Akun Anda belum memiliki izin untuk membuka halaman ini. Silakan cek sheet <strong>LEVEL_PERMISSION</strong> dan <strong>MODUL_ACCESS</strong> pada APJ Core User.</p><div class="apj-denied-meta">Permission: <code>' + escapeHtml(required || '-') + '</code></div><button type="button" class="apj-denied-back" onclick="window.location.href=\'dashboard.html\'">Kembali ke Dashboard Utama</button></div></div>';
    document.body.classList.add('apj-access-denied-page');
  }

  function addBadge(el, text, cls){
    if (!el) return null;
    var found = el.querySelector('.' + cls);
    if (found) { found.textContent = text; return found; }
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    el.appendChild(span);
    return span;
  }
  function removeBadges(link, selectors){
    if (!link) return;
    link.querySelectorAll(selectors).forEach(function(el){ el.remove(); });
  }
  function normalizeLockBadge(link){
    if (!link) return;
    removeBadges(link, '.nav-lock-badge, .apj-lock-badge, .nav-soon, .nav-repair');
    var locks = Array.prototype.slice.call(link.querySelectorAll('.nav-lock'));
    var badge = locks.shift();
    locks.forEach(function(el){ el.remove(); });
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-lock';
      link.appendChild(badge);
    }
    badge.textContent = 'Lock';
  }
  function clearStateBadges(link){ removeBadges(link, '.nav-lock, .nav-lock-badge, .apj-lock-badge, .nav-soon, .nav-repair'); }
  function clearLockState(link){
    if (!link) return;
    link.classList.remove('nav-locked','nav-coming-soon','nav-maintenance','apj-coming-soon','apj-maintenance');
    link.removeAttribute('data-locked-permission');
    link.removeAttribute('data-locked-menu');
    link.removeAttribute('data-repair-menu');
    clearStateBadges(link);
  }
  function setLockedLink(link, permission){
    if (!link) return;
    if (!link.dataset.originalHref) link.dataset.originalHref = link.getAttribute('href') || '';
    clearStateBadges(link);
    link.classList.add('nav-locked');
    link.classList.remove('nav-coming-soon','nav-maintenance','apj-coming-soon','apj-maintenance');
    link.removeAttribute('data-coming-soon-menu');
    link.removeAttribute('data-repair-menu');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('data-locked-permission', permission || link.getAttribute('data-permission') || '');
    if (!link.getAttribute('data-locked-menu')) {
      var text = link.querySelector('.nav-text') ? link.querySelector('.nav-text').textContent.trim() : 'Menu';
      link.setAttribute('data-locked-menu', text);
    }
    link.setAttribute('href', '#');
    normalizeLockBadge(link);
  }
  function setUnlockedLink(link){
    if (!link) return;
    var original = link.dataset.originalHref;
    if (original && !link.hasAttribute('data-coming-soon-menu') && !link.hasAttribute('data-repair-menu')) link.setAttribute('href', original);
    clearLockState(link);
    link.setAttribute('aria-disabled', 'false');
  }
  function setComingSoonLink(link){
    if (!link) return;
    if (!link.dataset.originalHref) link.dataset.originalHref = link.getAttribute('href') || '';
    clearLockState(link);
    link.classList.add('nav-coming-soon');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('href', '#');
    if (!link.getAttribute('data-coming-soon-menu')) {
      var text = link.querySelector('.nav-text') ? link.querySelector('.nav-text').textContent.trim() : 'Menu';
      link.setAttribute('data-coming-soon-menu', text);
    }
    addBadge(link, 'Segera', 'nav-soon');
  }
  function setRepairLink(link){
    if (!link) return;
    if (!link.dataset.originalHref) link.dataset.originalHref = link.getAttribute('href') || '';
    clearLockState(link);
    link.classList.add('nav-maintenance');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('href', '#');
    if (!link.getAttribute('data-repair-menu')) {
      var text = link.querySelector('.nav-text') ? link.querySelector('.nav-text').textContent.trim() : 'Menu';
      link.setAttribute('data-repair-menu', text);
    }
    addBadge(link, 'Perbaikan', 'nav-repair');
  }

  function inferLinkPermission(link){
    var p = link.getAttribute('data-permission');
    if (p) return p;
    var href = cleanUrl(link.getAttribute('href') || link.dataset.originalHref || '');
    return URL_PERMISSION[href] || '';
  }
  function inferModuleKey(link){
    var mk = link.getAttribute('data-module-key');
    if (mk) return mk;
    var href = cleanUrl(link.getAttribute('href') || link.dataset.originalHref || '');
    return MODULE_KEY_BY_URL[href] || '';
  }
  function syncStaticSidebar(){
    document.querySelectorAll('#dashboardSidebarMenu a.nav-item, #sidebar a.nav-item').forEach(function(link){
      var href = link.getAttribute('href') || '';
      if (!link.dataset.originalHref) link.dataset.originalHref = href;
      var inferredPermission = inferLinkPermission(link);
      var inferredModuleKey = inferModuleKey(link);
      var registryItem = findRegistryItemForLink(link);
      var registryPermission = registryItem ? asPermissionString_(registryItem.permission || registryItem.permissionKey) : '';
      var registryModuleKey = registryItem ? String(registryItem.moduleKey || registryItem.MODULE_KEY || '').trim() : '';
      if (inferredPermission && !link.getAttribute('data-permission')) link.setAttribute('data-permission', inferredPermission);
      if (inferredModuleKey && !link.getAttribute('data-module-key')) link.setAttribute('data-module-key', inferredModuleKey);
      if (registryModuleKey && !link.getAttribute('data-module-key')) link.setAttribute('data-module-key', registryModuleKey);
      var mod = findModuleForLink(link);
      var status = moduleStatus(mod);
      var permission = modulePermission(mod) || registryPermission || inferredPermission;
      if (permission) link.setAttribute('data-permission', permission);
      if (registryItem && (registryItem.href || registryItem.url) && !registryItem.comingSoon && !registryItem.maintenance && !registryItem.repair && !mod) {
        link.dataset.originalHref = registryItem.href || registryItem.url;
      }
      if (mod && getModuleValue(mod, 'URL', 'url') && !isComingSoonStatus(status) && !isRepairStatus(status)) {
        var modUrl = getModuleValue(mod, 'URL', 'url');
        if (modUrl) {
          link.dataset.originalHref = modUrl;
          link.removeAttribute('data-coming-soon-menu');
          link.removeAttribute('data-repair-menu');
        }
      }
      if (mod && isRepairStatus(status)) { setRepairLink(link); return; }
      if (mod && isComingSoonStatus(status)) { setComingSoonLink(link); return; }
      if (registryItem && (registryItem.maintenance || registryItem.repair)) { setRepairLink(link); return; }
      if (registryItem && registryItem.comingSoon) { setComingSoonLink(link); return; }
      if (link.getAttribute('data-repair-menu')) { setRepairLink(link); return; }
      if (link.getAttribute('data-coming-soon-menu')) { setComingSoonLink(link); return; }
      if (!hasAny(permission) || !moduleAllowed(mod)) { setLockedLink(link, permission); return; }
      setUnlockedLink(link);
    });
  }

  function syncTabs(){
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.hr-tab[data-tab], [data-finance-tab]'));
    if (!tabs.length) return;
    var firstAllowed = null;
    tabs.forEach(function(btn){
      var tabId = btn.getAttribute('data-tab') || btn.getAttribute('data-finance-tab') || '';
      var perm = btn.getAttribute('data-permission') || TAB_PERMISSION[tabId] || '';
      if (perm) btn.setAttribute('data-permission', perm);
      var allowed = hasAny(perm);
      btn.classList.toggle('hr-tab-locked', !allowed);
      btn.setAttribute('aria-disabled', allowed ? 'false' : 'true');
      if (!allowed) addBadge(btn, '🔒', 'hr-tab-lock-badge');
      else {
        var b = btn.querySelector('.hr-tab-lock-badge');
        if (b) b.remove();
        if (!firstAllowed) firstAllowed = btn;
      }
      if (btn.dataset.permissionTabBound !== 'Y') {
        btn.dataset.permissionTabBound = 'Y';
        btn.addEventListener('click', function(ev){
          if (btn.classList.contains('hr-tab-locked')) {
            ev.preventDefault(); ev.stopImmediatePropagation();
            var tabName = (btn.textContent || 'Tab ini').replace(/🔒/g, '').trim() || 'Tab ini';
            showNotice({ type: 'tab', menuName: tabName, permission: btn.getAttribute('data-permission') || '-' });
          }
        }, true);
      }
    });
    var active = tabs.find(function(btn){ return btn.classList.contains('is-active'); });
    if (active && active.classList.contains('hr-tab-locked') && firstAllowed) {
      setTimeout(function(){ firstAllowed.click(); }, 0);
    }
  }

  function init(){
    syncStaticSidebar();
    syncTabs();
    setTimeout(function(){ syncStaticSidebar(); syncTabs(); }, 120);
    setTimeout(function(){ syncStaticSidebar(); syncTabs(); }, 420);
    var required = pageRequiredPermission();
    if (required && !isPageAllowed()) {
      window.APJ_PERMISSION_PAGE_DENIED = true;
      renderAccessDenied(required);
      return false;
    }
    window.APJ_PERMISSION_PAGE_DENIED = false;
    return true;
  }

  document.addEventListener('DOMContentLoaded', function(ev){
    var ok = init();
    if (ok === false && ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  });

  window.APJPermissionNotice = {
    show: showNotice,
    close: closeNotice
  };
  window.showAPJPermissionNotice = showNotice;
  window.APJPermissionSync = {
    init: init,
    hasPermission: hasPermissionKey,
    hasAny: hasAny,
    getPermissions: getPerms,
    getModules: getModules,
    pageRequiredPermission: pageRequiredPermission,
    isPageAllowed: isPageAllowed,
    syncStaticSidebar: syncStaticSidebar,
    syncTabs: syncTabs,
    showNotice: showNotice,
    closeNotice: closeNotice,
    aliases: ALIASES,
    menuItems: menuItems_,
    pagePermissions: PAGE_PERMISSION,
    urlPermissions: URL_PERMISSION,
    moduleKeysByUrl: MODULE_KEY_BY_URL
  };
})();
