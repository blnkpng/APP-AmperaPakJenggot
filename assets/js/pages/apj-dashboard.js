/* APJ Dashboard V222 - Fast Calendar Load */
(function () {
  'use strict';

  const MENU_GROUP_KEY = 'APJ_DASHBOARD_MENU_GROUPS_V22';
  const SIDEBAR_KEY = 'APJ_SIDEBAR_COLLAPSED';
  const PAGE_MODE = (document.body && document.body.getAttribute('data-dashboard-mode')) || 'central';
  const PAGE_META = {
    central: {
      badge: 'APJ Central',
      title: 'Dashboard Utama APJ',
      subtitle: 'Home umum karyawan: sambutan, kalender, ulang tahun, pengumuman, dan shortcut sesuai akses.',
      descOwner: 'Selamat datang di APJ Central. Semua data sensitif tetap berada di dashboard modul sesuai permission.',
      descOperator: 'Selamat datang di APJ Central. Semoga harimu lancar, semangat, dan APJ makin solid.',
      loading: 'Memuat Dashboard Utama...',
      loadingSub: ''
    },
    inventory: {
      badge: 'Inventory V3',
      title: 'Dashboard Inventory',
      subtitle: 'Kontrol stok gudang, preparasi, produksi, transfer produk, outlet, opname, dan audit.',
      descOwner: 'Ringkasan Inventory V3 dari master item, jurnal stok, produksi, transfer, outlet, dan audit.',
      descOperator: 'Tampilan Inventory mengikuti permission role. Menu terkunci tetap terlihat agar alur sistem jelas.',
      loading: 'Menarik data Dashboard Inventory...',
      loadingSub: 'Sinkron dengan MASTER_ITEM, JURNAL_STOK, dan STOK_AKHIR.'
    },
    absensi: {
      badge: 'Absensi',
      title: 'Dashboard Absensi',
      subtitle: 'Monitoring kehadiran harian, jadwal, outlet, checkout, alpa, izin, libur, terlambat, dan lembur.',
      descOwner: 'Ringkasan HR harian: total karyawan, hadir, belum absen, alpa, libur, izin, akurasi outlet, detail absensi, dan status khusus.',
      descOperator: 'Dashboard Absensi mengikuti hak akses. Data ditarik dari USER, OUTLET, ID_JADWAL, dan ID_ABSENSI.',
      loading: 'Menarik data Dashboard Absensi...',
      loadingSub: 'Sinkron dengan USER, OUTLET, ID_JADWAL, dan ID_ABSENSI.'
    }
  };
  let currentSession = null;
  let absensiCalendarSelectedDay = null;
  let absensiCalendarViewDate = new Date();
  let absensiCalendarCache = null;
  let absensiCalendarRemoteTimer = null;
  let absensiCalendarRemoteLoadingKey = '';
  let absensiCalendarRemoteLoadedKey = '';
  const APJ_CALENDAR_CACHE_PREFIX = 'APJ_DASH_CALENDAR_V46_FIX4_';
  const APJ_CALENDAR_CACHE_TTL_MS = 2 * 60 * 1000;
  let homeBirthdayContext = { isBirthday:false, name:'', rows:[], calendar:null, wishes:[], sentWishes:[], birthdayDirectory:[] };
  let homeBackendLoaded = false;
  let homeLatestTodayItems = [];
  let homeLatestAnnouncements = [];
  let homeBirthdayWishesBackendLoaded = false;
  let homeSilentRefreshTimer = null;
  let homeSilentRefreshRunning = false;

  const MENU_ITEMS = configuredMenuItems([
    { module:'Inventori', group:'Inventori / Dashboard', label:'Dashboard Inventory', href:'dashboard-inventory.html', permission:['inventory','lihatStok','inputStok'], desc:'Ringkasan stok, produksi, transfer, outlet, dan audit.', tone:'blue' },
    { module:'Inventori', group:'Inventori / Stok Gudang', label:'Input Stok', href:'input-stok.html', permission:['inputStok'], desc:'Barang masuk dari supplier/pembelian.', tone:'emerald' },
    { module:'Inventori', group:'Inventori / Stok Gudang', label:'Output Stok', href:'output-stok.html', permission:['outputStok'], desc:'Barang keluar gudang/non-produksi.', tone:'rose' },
    { module:'Inventori', group:'Inventori / Dapur Produksi', label:'Preparasi', href:'preparasi.html', permission:['preparasi'], desc:'Bahan mentah menjadi semi-finished.', tone:'amber' },
    { module:'Inventori', group:'Inventori / Dapur Produksi', label:'Produksi', href:'produksi.html', permission:['produksi'], desc:'Semi-finished menjadi produk siap transfer.', tone:'amber' },
    { module:'Inventori', group:'Inventori / Dapur', label:'Transfer Item', href:'transfer-produksi.html', permission:['transferItem','transferProduksi','transferProduk'], desc:'Kirim item/produk pusat ke outlet.', tone:'violet' },
    { module:'Inventori', group:'Inventori / Outlet', label:'Produk Outlet', href:'produk-outlet.html', permission:['produkOutlet'], desc:'Stok, terjual, dan opname outlet.', tone:'sky' },
    { module:'Inventori', group:'Inventori / Stok Gudang', label:'Stok Opname', href:'stok-opname.html', permission:['stokOpname'], desc:'Koreksi stok fisik.', tone:'blue' },
    { module:'Inventori', group:'Inventori / Stok Gudang', label:'Lihat Stok', href:'lihat-stok.html', permission:['lihatStok'], desc:'Monitoring STOK_AKHIR.', tone:'slate' },
    { module:'Inventori', group:'Inventori / Setup & Audit', label:'Setup Inventory', href:'setup-inventory.html', permission:['setupInventory','admin'], desc:'Master kategori, item, produk, resep.', tone:'violet', admin:true },
    { module:'Inventori', group:'Inventori / Setup & Audit', label:'Jurnal Stok / Audit', href:'riwayat-inventory.html', permission:['jurnalStokAudit','riwayatTransaksi'], desc:'Audit dari JURNAL_STOK.', tone:'blue' },
    { module:'HR / Absensi', group:'HR / Absensi / Dashboard', label:'Dashboard Absensi', href:'dashboard-absensi.html', permission:['dashboardAbsensi','absensiAdmin','absensiDiri'], desc:'Kehadiran, belum absen, checkout, dan shift.', tone:'sky' },
    { module:'HR / Absensi', group:'HR / Absensi / Absensi', label:'Check In / Check Out', href:'absensi.html', permission:['absensiCheck','absensiDiri'], desc:'Absensi mandiri karyawan.', tone:'emerald' },
    { module:'HR / Absensi', group:'HR / Absensi / Absensi', label:'Rekap Absensi', href:'rekap-absensi.html', permission:['rekapAbsensi','absensiAdmin'], desc:'Rekap hadir, terlambat, dan belum checkout.', tone:'blue' },
    { module:'HR / Absensi', group:'HR / Absensi / Karyawan', label:'Data Karyawan', href:'hr-karyawan.html', permission:['dataKaryawan','absensiAdmin'], desc:'Data karyawan, shift, jadwal, dan akses outlet.', tone:'slate' },
    { module:'Keuangan', group:'Keuangan / Dashboard', label:'Dashboard Keuangan', href:'#', permission:['keuangan','dashboardKeuangan'], desc:'Ringkasan kas, bank, biaya, dan laporan.', tone:'emerald', comingSoon:true }
  ]);

  document.addEventListener('DOMContentLoaded', initDashboard);

  function configuredMenuItems(fallback) {
    const configRows = window.APJ_CONFIG && window.APJ_CONFIG.menu && Array.isArray(window.APJ_CONFIG.menu.items)
      ? window.APJ_CONFIG.menu.items
      : [];
    if (!configRows.length) return fallback;
    return configRows
      .filter(function (item) {
        const href = item.href || item.url || '';
        return href && item.module !== 'APJ Central';
      })
      .map(function (item) {
        return {
          module: item.module || '',
          group: item.group || item.module || '',
          label: item.label || '',
          href: item.comingSoon ? '#' : (item.href || item.url || '#'),
          permission: Array.isArray(item.permission) ? item.permission : String(item.permission || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
          desc: item.desc || '',
          tone: item.tone || 'blue',
          comingSoon: !!item.comingSoon,
          admin: !!item.admin
        };
      });
  }

  function initDashboard() {
    bindSidebarInteractions();
    initMenuGroups();
    highlightCurrentMenu();
    applyPageModeChrome();
    if (PAGE_MODE !== 'central') renderMiniCalendar();

    if (window.APJAuth && !window.APJAuth.requireLogin()) return;
    currentSession = getSession();
    if (!currentSession.active) {
      window.location.href = (window.APJ_CONFIG && window.APJ_CONFIG.loginPage) || 'index.html';
      return;
    }

    hydrateUser(currentSession);
    setupAccessUI(currentSession);
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      if (PAGE_MODE === 'absensi') loadAbsensiDashboardData(true);
      else if (PAGE_MODE === 'central') renderCentralHomeDashboard(true);
      else loadDashboardData(true);
    });
    if (PAGE_MODE === 'absensi') loadAbsensiDashboardData(false);
    else if (PAGE_MODE === 'central') renderCentralHomeDashboard(false);
    else loadDashboardData(false);
    document.querySelectorAll('#sidebar a').forEach(function (link) { link.addEventListener('click', closeMobileSidebar); });
  }

  function getSession() {
    if (window.APJAuth && window.APJAuth.getSession) return window.APJAuth.getSession();
    return {
      active: localStorage.getItem('APJ_SESSION_ACTIVE') === 'true',
      token: localStorage.getItem('APJ_SESSION_TOKEN') || '',
      username: localStorage.getItem('APJ_USER_USERNAME') || '',
      name: localStorage.getItem('APJ_USER_NAME') || 'Pengguna',
      level: localStorage.getItem('APJ_USER_LEVEL') || '',
      outlet: localStorage.getItem('APJ_USER_OUTLET') || '',
      outletAccess: localStorage.getItem('APJ_USER_OUTLET_ACCESS') || '',
      permissions: safeParseJSON(localStorage.getItem('APJ_USER_PERMISSIONS') || '{}')
    };
  }

  function hydrateUser(session) {
    const name = session.name || session.nama || session.username || 'Pengguna';
    const level = session.level || 'USER';
    setText('displayNama', name);
    setText('displayLevel', level);
    setText('displayInisial', String(name || 'U').charAt(0).toUpperCase());
    setText('welcomeNama', name);
    setText('greetingText', getGreetingLabel());
    setText('greetingEmoji', '👋');
  }

  function getGreetingLabel(date) {
    const hour = (date || new Date()).getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  function setupAccessUI(session) {
    document.querySelectorAll('[data-admin-menu]').forEach(function (el) {
      el.classList.toggle('hidden', !isAdmin(session));
    });

    document.querySelectorAll('#dashboardSidebarMenu [data-permission]').forEach(function (el) {
      const keys = String(el.getAttribute('data-permission') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      const allowed = hasAnyPermission(session, keys);
      el.classList.toggle('nav-locked', !allowed);
      el.setAttribute('aria-disabled', allowed ? 'false' : 'true');
      if (!allowed && !el.dataset.lockBound) {
        el.dataset.lockBound = 'Y';
        el.addEventListener('click', function (event) {
          event.preventDefault();
          showToast('Menu masih terkunci. Cek LEVEL_PERMISSION / MODUL_ACCESS di APJ Core User.', 'warning');
        });
      }
    });
  }


  function getPageMenus(session, mode) {
    let rows = MENU_ITEMS.slice();
    if (mode === 'inventory') rows = rows.filter(function (m) { return m.module === 'Inventori'; });
    else if (mode === 'absensi') rows = rows.filter(function (m) { return m.module === 'HR / Absensi'; });
    else {
      rows = rows.filter(function (m) {
        return m.label.indexOf('Dashboard') !== -1 || m.module === 'Inventori';
      });
    }
    return rows;
  }

  function applyPageModeChrome() {
    const meta = PAGE_META[PAGE_MODE] || PAGE_META.central;
    const topTitle = document.querySelector('.topbar-title h2');
    const topDesc = document.querySelector('.topbar-title p');
    if (topTitle) topTitle.textContent = meta.title;
    if (topDesc) topDesc.textContent = meta.subtitle;
    const loading = document.getElementById('loadingState');
    if (loading) {
      const bold = loading.querySelector('p.font-bold');
      const sub = loading.querySelector('p.text-xs');
      if (bold) bold.textContent = meta.loading;
      if (sub) sub.textContent = meta.loadingSub;
    }
    document.title = meta.title + ' | APJ Central';
    setText('modeBadge', meta.badge);
    setText('modeDescription', meta.descOwner);
  }

  function highlightCurrentMenu() {
    const path = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
    document.querySelectorAll('#dashboardSidebarMenu a.nav-item').forEach(function (a) {
      const href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
      const active = href && href !== '#' && href === path;
      a.classList.toggle('active', active);
      if (active) {
        let node = a.parentElement;
        while (node && node.id !== 'dashboardSidebarMenu') {
          if (node.hasAttribute && node.hasAttribute('data-menu-group')) setDashboardMenuGroup(node, true);
          node = node.parentElement;
        }
      }
    });
  }

  function renderAbsensiPlaceholder(isManualRefresh) {
    const data = {
      mode: isOwner(currentSession) ? 'owner' : 'operator',
      today: formatDateHuman(new Date()),
      syncAt: new Date().toLocaleString('id-ID'),
      kpi: { totalKaryawan: 0, hadir: 0, belumAbsen: 0, belumCheckout: 0, terlambat: 0, lembur: 0, outletAktif: 5, shiftAktif: 0 },
      categorySummary: [
        { kategori:'Outlet LAHOR', totalItem:0, totalStok:0, kritis:0, kosong:0 },
        { kategori:'Outlet SENISONO', totalItem:0, totalStok:0, kritis:0, kosong:0 },
        { kategori:'Outlet PUJON', totalItem:0, totalStok:0, kritis:0, kosong:0 },
        { kategori:'Outlet NGUJUNG', totalItem:0, totalStok:0, kritis:0, kosong:0 },
        { kategori:'Outlet POKOPEK', totalItem:0, totalStok:0, kritis:0, kosong:0 }
      ],
      criticalItems: [
        { nama:'API Absensi', kategori:'Integrasi', status:'Belum disambungkan', stok:0, satuan:'' },
        { nama:'Mapping shift', kategori:'Setup HR', status:'Siapkan ID_JADWAL', stok:0, satuan:'' },
        { nama:'Rekap outlet', kategori:'Dashboard', status:'Slot siap', stok:0, satuan:'' }
      ],
      topMovements: [
        { nama:'Check In / Check Out', kategori:'Fitur inti', qty:0, jenis:'Absensi' },
        { nama:'Belum Absen', kategori:'Monitoring', qty:0, jenis:'Absensi' },
        { nama:'Belum Checkout', kategori:'Monitoring', qty:0, jenis:'Absensi' }
      ],
      recentActivities: [],
      locationSummary: [
        { lokasi:'LAHOR', totalTransaksi:0, masuk:0, keluar:0 },
        { lokasi:'SENISONO', totalTransaksi:0, masuk:0, keluar:0 },
        { lokasi:'PUJON', totalTransaksi:0, masuk:0, keluar:0 },
        { lokasi:'NGUJUNG', totalTransaksi:0, masuk:0, keluar:0 },
        { lokasi:'POKOPEK', totalTransaksi:0, masuk:0, keluar:0 }
      ],
      quickMenus: getPageMenus(currentSession, 'absensi').map(function (m) { return Object.assign({}, m, { disabled: !menuAllowed(currentSession, m) }); })
    };
    setText('primaryPanelTitle', 'Ringkasan Outlet Absensi');
    setText('primaryPanelDesc', 'Slot rekap kehadiran per outlet. Data live menyusul setelah API absensi aktif.');
    setText('attentionTitle', 'Setup Absensi Perlu Disiapkan');
    setText('attentionDesc', 'Fondasi dashboard aman dulu, isi data dicicil pelan-pelan.');
    setText('activityTitle', 'Aktivitas Absensi Terbaru');
    setText('activityDesc', 'Akan terisi dari ABSENSI setelah API disambungkan.');
    renderDashboard(data);
    if (isManualRefresh) showToast('Dashboard Absensi siap. Data live menunggu API absensi.', 'info');
  }

  async function loadAbsensiDashboardData(isManualRefresh) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('dashboardContent');
    if (loading && content) {
      loading.classList.remove('hidden');
      content.classList.add('hidden');
    }
    try {
      const res = await absensiCall(absensiActionName('dashboard', 'getDashboardAbsensiV170'), userPayload({ tanggal: dateISOLocal(new Date()) }));
      if (res && res.success === false) throw new Error(res.pesan || 'Dashboard Absensi gagal dimuat.');
      renderAbsensiDashboardV168(normalizeAbsensiDashboardData(res || {}));
      if (isManualRefresh) showToast('Dashboard Absensi sudah disegarkan.', 'success');
    } catch (error) {
      const fallback = buildAbsensiFallbackData(error);
      renderAbsensiDashboardV168(fallback);
      if (isManualRefresh) showToast('Dashboard Absensi memakai fallback lokal: ' + (error && error.message ? error.message : 'API belum aktif'), 'warning');
    }
  }

  function absensiActionName(key, fallback) {
    return (((window.APJ_CONFIG || {}).actions || {}).absensi || {})[key] || fallback;
  }

  async function absensiCall(action, payload) {
    if (window.APJApi && window.APJApi.absensi) return window.APJApi.absensi(action, payload || {});
    const cfg = window.APJ_CONFIG || {};
    const url = cfg.absensiApiUrl || (cfg.apis && cfg.apis.absensi);
    if (!url) throw new Error('URL Absensi API belum diatur.');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(Object.assign({}, payload || {}, { action: action }))
    });
    return response.json();
  }

  function coreActionName(key, fallback) {
    return (((window.APJ_CONFIG || {}).actions || {}).core || {})[key] || fallback;
  }

  async function coreCall(action, payload) {
    if (window.APJApi && window.APJApi.core) return window.APJApi.core(action, payload || {});
    const cfg = window.APJ_CONFIG || {};
    const url = cfg.coreApiUrl || (cfg.apis && cfg.apis.core);
    if (!url) throw new Error('URL Core User API belum diatur.');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(Object.assign({}, payload || {}, { action: action }))
    });
    return response.json();
  }

  async function coreCallAbortable(action, payload, ms) {
    const cfg = window.APJ_CONFIG || {};
    const url = cfg.coreApiUrl || (cfg.apis && cfg.apis.core) || (window.APJApi && window.APJApi.endpoint && window.APJApi.endpoint('core'));
    if (!url) throw new Error('URL Core User API belum diatur.');
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timeoutMs = ms || 12000;
    let timeoutId;
    try {
      timeoutId = setTimeout(function () {
        try { if (controller) controller.abort(); } catch (ignore) {}
      }, timeoutMs);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify(Object.assign({}, payload || {}, { action: action }))
      });
      const raw = await response.text();
      let json;
      try { json = JSON.parse(raw); }
      catch (error) { throw new Error('Respons Core User bukan JSON valid: ' + raw.slice(0, 160)); }
      return json;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('Core User terlalu lama merespons. Cek deploy Apps Script Core User.');
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function withTimeout(promise, ms, message) {
    let timeoutId;
    const timeout = new Promise(function (_, reject) {
      timeoutId = setTimeout(function () { reject(new Error(message || 'Request terlalu lama merespons.')); }, ms || 20000);
    });
    return Promise.race([promise, timeout]).finally(function () { clearTimeout(timeoutId); });
  }

  function buildAbsensiFallbackData(error) {
    const name = currentSession && (currentSession.name || currentSession.nama || currentSession.username) || 'Pengguna';
    return normalizeAbsensiDashboardData({
      success: true,
      fallback: true,
      pesan: error && error.message ? error.message : 'Backend Dashboard Absensi belum aktif.',
      todayLabel: formatDateHuman(new Date()),
      syncAt: new Date().toLocaleString('id-ID'),
      user: { nama: name },
      kpi: { totalKaryawan: 0, hadir: 0, belumAbsen: 0, alpa: 0, libur: 0, izin: 0 },
      outletAccuracy: [], detailAbsensi: [], belumAbsen: [], belumCheckout: [], lokasiAbsen: [], topLembur: [], topTerlambat: [], karyawanLibur: [], karyawanIzin: [], karyawanAlpa: [], calendar: { tanggalMerah: [], pesanan: [], ulangTahun: [] }
    });
  }

  function normalizeAbsensiDashboardData(data) {
    data = data || {};
    data.kpi = data.kpi || {};
    data.outletAccuracy = arr(data.outletAccuracy || data.rekapOutlet || data.outlets);
    data.detailAbsensi = arr(data.detailAbsensi || data.absensi || data.hadirRows);
    data.belumAbsen = arr(data.belumAbsen);
    data.belumCheckout = arr(data.belumCheckout || data.belumCekOut);
    data.lokasiAbsen = arr(data.lokasiAbsen || data.lokasi);
    data.topLembur = arr(data.topLembur || data.lembur);
    data.topTerlambat = arr(data.topTerlambat || data.terlambat);
    data.karyawanLibur = arr(data.karyawanLibur || data.libur);
    data.karyawanIzin = arr(data.karyawanIzin || data.izin);
    data.karyawanAlpa = arr(data.karyawanAlpa || data.alpa);
    data.calendar = data.calendar || {};
    data.calendar.tanggalMerah = arr(data.calendar.tanggalMerah);
    data.calendar.pesanan = arr(data.calendar.pesanan);
    data.calendar.ulangTahun = arr(data.calendar.ulangTahun);
    return data;
  }

  function renderAbsensiDashboardV168(data) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('dashboardContent');
    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    const k = data.kpi || {};
    const todayLabel = data.todayLabel || formatDateHuman(new Date());
    setText('absTodayLabel', todayLabel);
    setText('absSyncLabel', 'Update: ' + (data.syncAt || new Date().toLocaleString('id-ID')));
    setText('modeDescription', data.fallback ? ('Mode fallback: ' + (data.pesan || 'data belum tersedia.')) : 'Ringkasan dashboard absensi hari ini: jadwal, kehadiran, checkout, izin, libur, alpa, dan outlet.');
    setText('modeBadge', 'Absensi • Live');

    renderAbsensiKpisV168(k);
    renderAbsensiCalendarV168(data.calendar || {});
    renderOutletAccuracyV168(data.outletAccuracy || []);
    renderDetailAbsensiV168(data.detailAbsensi || []);
    renderMiniAbsensiList('belumAbsenList', data.belumAbsen || [], 'Belum ada karyawan yang perlu follow-up.', function (r) { return listLine(r.nama || r.username || '-', r.outlet || r.shift || '-'); });
    renderMiniAbsensiList('belumCheckoutList', data.belumCheckout || [], 'Belum ada karyawan yang belum checkout.', function (r) { return listLine(r.nama || r.username || '-', r.outlet || r.jamMasuk || '-'); });
    renderMiniAbsensiList('lokasiAbsenList', data.lokasiAbsen || [], 'Belum ada data lokasi absen.', function (r) { return listLine(r.nama || r.username || '-', r.outlet || r.lokasi || '-'); });
    renderMiniAbsensiList('topLemburList', data.topLembur || [], 'Belum ada data lembur.', function (r) { return listLine(r.nama || '-', (r.totalLembur || r.menit || 0) + ' menit'); });
    renderMiniAbsensiList('topTerlambatList', data.topTerlambat || [], 'Belum ada data terlambat.', function (r) { return listLine(r.nama || '-', (r.menit || r.terlambatMenit || 0) + ' menit'); });
    renderMiniAbsensiList('karyawanLiburList', data.karyawanLibur || [], 'Tidak ada jadwal libur hari ini.', function (r) { return listNameOnly(r.nama || r.username || '-'); });
    renderMiniAbsensiList('karyawanIzinList', data.karyawanIzin || [], 'Tidak ada karyawan izin hari ini.', function (r) { return listNameOnly(r.nama || r.username || '-'); });
    renderMiniAbsensiList('karyawanAlpaList', data.karyawanAlpa || [], 'Tidak ada karyawan alpa.', function (r) { return listNameOnly(r.nama || r.username || '-'); });
  }


  function renderAbsensiHeroStatsV171(k) {
    const rows = [
      { label:'Total Karyawan', value:k.totalKaryawan || 0, tone:'blue' },
      { label:'Hadir', value:k.hadir || 0, tone:'emerald' },
      { label:'Follow Up', value:k.belumAbsen || 0, tone:'amber' },
      { label:'Alpa', value:k.alpa || 0, tone:'rose' }
    ];
    html('absensiHeroStats', rows.map(function (r) {
      return '<div class="tone-' + esc(r.tone) + '"><span>' + esc(r.label) + '</span><b>' + esc(formatNumber(r.value)) + '</b></div>';
    }).join(''));
  }

  function renderAbsensiKpisV168(k) {
    const cards = [
      { label:'Total Karyawan', value:k.totalKaryawan || 0, sub:'master aktif/nonaktif', tone:'blue' },
      { label:'Hadir', value:k.hadir || 0, sub:'sudah check in', tone:'emerald' },
      { label:'Belum Absen', value:k.belumAbsen || 0, sub:'perlu follow-up', tone:'amber' },
      { label:'Alpa', value:k.alpa || 0, sub:'tidak masuk', tone:'rose' },
      { label:'Libur', value:k.libur || 0, sub:'jadwal libur', tone:'slate' },
      { label:'Izin', value:k.izin || 0, sub:'izin hari ini', tone:'violet' }
    ];
    html('absensiKpiGrid', cards.map(function (c) {
      return '<div class="absensi-kpi tone-' + esc(c.tone) + '"><p>' + esc(c.label) + '</p><strong>' + esc(formatNumber(c.value)) + '</strong><span>' + esc(c.sub) + '</span></div>';
    }).join(''));
  }

  function renderOutletAccuracyV168(rows) {
    if (!rows.length) return html('outletAccuracyBody', '<tr><td colspan="4" class="empty-cell">Belum ada data outlet hari ini.</td></tr>');
    html('outletAccuracyBody', rows.map(function (r) {
      return '<tr><td><b>' + esc(r.outlet || '-') + '</b></td><td>' + esc(formatNumber(r.hadir || 0)) + '</td><td>' + esc(formatNumber(r.belumCheckout || r.belumOut || 0)) + '</td><td><span class="pill tone-' + (Number(r.capaian || 0) >= 80 ? 'emerald' : 'amber') + '">' + esc(formatNumber(r.capaian || 0)) + '%</span></td></tr>';
    }).join(''));
  }

  function renderDetailAbsensiV168(rows) {
    if (!rows.length) return html('absensiDetailBody', '<tr><td colspan="3" class="empty-cell">Belum ada detail absensi hari ini.</td></tr>');
    html('absensiDetailBody', rows.slice(0, 20).map(function (r) {
      return '<tr><td><b>' + esc(r.nama || r.username || '-') + '</b><small>' + esc(r.outlet || '') + '</small></td><td>' + esc(r.jamMasuk || '-') + '</td><td>' + esc(r.jamKeluar || r.jamPulang || '-') + '</td></tr>';
    }).join(''));
  }

  function renderMiniAbsensiList(id, rows, empty, renderer) {
    if (!rows.length) return html(id, '<div class="absensi-empty">' + esc(empty) + '</div>');
    html(id, rows.slice(0, 8).map(renderer).join(''));
  }

  function listLine(title, sub) {
    return '<div class="absensi-list-row"><b>' + esc(title || '-') + '</b><span>' + esc(sub || '-') + '</span></div>';
  }

  function listNameOnly(title) {
    return '<div class="absensi-list-row name-only"><b>' + esc(title || '-') + '</b></div>';
  }

  function renderAbsensiCalendarV168(calendar) {
    const el = document.getElementById('calendarGrid');
    if (!el) return;
    const now = new Date();
    const view = absensiCalendarViewDate || now;
    const year = view.getFullYear();
    const month = view.getMonth();
    const today = now.getDate();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    calendar = normalizeCalendarForView(calendar || {}, view);
    absensiCalendarCache = calendar || {};
    if (!absensiCalendarSelectedDay || absensiCalendarSelectedDay > days) absensiCalendarSelectedDay = isCurrentMonth ? today : 1;
    setText('calendarMonth', view.toLocaleDateString('id-ID', { month:'long', year:'numeric' }));
    setText('calendarTitle', 'Kalender');
    setText('calendarModePill', isCurrentMonth ? 'Hari ini' : 'Pilih bulan');
    ensureAbsensiCalendarControls(view);
    const sourceKey = calendar.__viewKey || calendar.viewKey || calendar.monthKey || '';
    const red = indexCalendarRows(calendar.tanggalMerah, view, { sourceKey: sourceKey, requireMonth: true });
    const order = indexCalendarRows(calendar.pesanan, view, { sourceKey: sourceKey, requireMonth: true });
    const birth = indexCalendarRows(calendar.ulangTahun, view, { recurringMonth: true, sourceKey: sourceKey, requireMonth: true });
    const labels = ['S','S','R','K','J','S','M'];
    let cells = labels.map(function (d) { return '<div class="calendar-cell calendar-label">' + d + '</div>'; }).join('');
    for (let i = 0; i < start; i++) cells += '<div class="calendar-cell muted"></div>';
    for (let d = 1; d <= days; d++) {
      const dt = new Date(year, month, d);
      const cls = ['calendar-cell', 'abs-cal-day'];
      const note = [];
      if (isCurrentMonth && d === today) { cls.push('today'); note.push('Hari ini'); }
      if (d === absensiCalendarSelectedDay) cls.push('selected-date');
      if (red[d] || dt.getDay() === 0) { cls.push('red-date'); (red[d] || [{ label:'Minggu' }]).forEach(function (x) { note.push(x.label || 'Tanggal merah'); }); }
      if (order[d]) { cls.push('order-date'); order[d].forEach(function (x) { note.push('Pesanan: ' + (x.label || x.nama || x.jam || '-')); }); }
      if (birth[d]) { cls.push('birthday-date'); birth[d].forEach(function (x) { note.push('Ultah: ' + (x.nama || x.label || '-')); }); }
      if (note.length > 1) cls.push('multi-date');
      const hasMarker = (isCurrentMonth && d === today) || !!red[d] || dt.getDay() === 0 || !!order[d] || !!birth[d];
      let markerClass = '';
      if (isCurrentMonth && d === today) markerClass = 'today';
      else if (red[d] || dt.getDay() === 0) markerClass = 'red';
      else if (order[d]) markerClass = 'order';
      else if (birth[d]) markerClass = 'birthday';
      cells += '<button type="button" class="' + cls.join(' ') + '" data-calendar-day="' + d + '" title="' + esc(note.join(' • ') || ('Tanggal ' + d)) + '"><span class="cal-num">' + d + '</span><span class="cal-dots">' + (hasMarker ? '<i class="' + markerClass + '"></i>' : '') + '</span></button>';
    }
    el.innerHTML = cells;
    el.querySelectorAll('[data-calendar-day]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        absensiCalendarSelectedDay = Number(btn.getAttribute('data-calendar-day') || (isCurrentMonth ? today : 1)) || (isCurrentMonth ? today : 1);
        el.querySelectorAll('.abs-cal-day').forEach(function (x) { x.classList.remove('selected-date'); });
        btn.classList.add('selected-date');
        renderAbsensiCalendarEventsForDay(absensiCalendarCache || {}, absensiCalendarSelectedDay, true);
      });
    });
    bindAbsensiCalendarBack();
    showAbsensiCalendarGrid();
  }

  function ensureAbsensiCalendarControls(view) {
    const grid = document.getElementById('calendarGrid');
    if (!grid || !grid.parentNode) return;
    let wrap = document.getElementById('calendarNavControls');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'calendarNavControls';
      wrap.className = 'calendar-nav-controls';
      wrap.innerHTML = '<button type="button" class="calendar-nav-btn" data-calendar-nav="prev">‹</button>' +
        '<select id="calendarMonthSelect" class="calendar-nav-select" aria-label="Pilih bulan kalender"></select>' +
        '<select id="calendarYearSelect" class="calendar-nav-select" aria-label="Pilih tahun kalender"></select>' +
        '<button type="button" class="calendar-nav-btn" data-calendar-nav="next">›</button>' +
        '<button type="button" class="calendar-nav-today" data-calendar-nav="today">Hari ini</button>';
      grid.parentNode.insertBefore(wrap, grid);
      wrap.addEventListener('click', function (event) {
        const action = event.target && event.target.getAttribute && event.target.getAttribute('data-calendar-nav');
        if (!action) return;
        if (action === 'prev') moveCalendarMonth(-1);
        else if (action === 'next') moveCalendarMonth(1);
        else if (action === 'today') {
          const todayDate = new Date();
          setAbsensiCalendarView(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), true);
        }
      });
    }
    const monthSelect = document.getElementById('calendarMonthSelect');
    const yearSelect = document.getElementById('calendarYearSelect');
    if (monthSelect && !monthSelect.__apjCalendarBound) {
      monthSelect.__apjCalendarBound = true;
      monthSelect.innerHTML = Array.from({ length: 12 }).map(function (_, i) {
        const label = new Date(2026, i, 1).toLocaleDateString('id-ID', { month:'long' });
        return '<option value="' + i + '">' + esc(label) + '</option>';
      }).join('');
      monthSelect.addEventListener('change', function () {
        setAbsensiCalendarView(Number(yearSelect && yearSelect.value || view.getFullYear()), Number(monthSelect.value || 0), 1, true);
      });
    }
    if (yearSelect) {
      const currentYear = new Date().getFullYear();
      const viewYear = Number(view.getFullYear() || currentYear);
      const minYear = Math.min(2020, currentYear - 10, viewYear - 5);
      const maxYear = Math.max(currentYear + 10, viewYear + 5);
      const desired = String(viewYear);
      const currentOptions = Array.from(yearSelect.options || []).map(function (o) { return o.value; }).join('|');
      const neededOptions = Array.from({ length: maxYear - minYear + 1 }).map(function (_, i) { return String(minYear + i); }).join('|');
      if (currentOptions !== neededOptions) {
        yearSelect.innerHTML = Array.from({ length: maxYear - minYear + 1 }).map(function (_, i) {
          const y = minYear + i;
          return '<option value="' + y + '">' + y + '</option>';
        }).join('');
      }
      if (!yearSelect.__apjCalendarBound) {
        yearSelect.__apjCalendarBound = true;
        yearSelect.addEventListener('change', function () {
          setAbsensiCalendarView(Number(yearSelect.value || view.getFullYear()), Number(monthSelect && monthSelect.value || view.getMonth()), 1, true);
        });
      }
      if (Array.from(yearSelect.options || []).some(function (o) { return o.value === desired; })) yearSelect.value = desired;
    }
    if (monthSelect) monthSelect.value = String(view.getMonth());
  }

  function moveCalendarMonth(delta) {
    const base = absensiCalendarViewDate || new Date();
    const next = new Date(base.getFullYear(), base.getMonth() + Number(delta || 0), 1);
    setAbsensiCalendarView(next.getFullYear(), next.getMonth(), 1, true);
  }

  function setAbsensiCalendarView(year, month, day, shouldLoadRemote) {
    absensiCalendarViewDate = new Date(Number(year), Number(month), Number(day || 1));
    absensiCalendarSelectedDay = Number(day || 1);

    // FIX4: kalender langsung digambar dari cache lokal/shell bulan,
    // lalu data Sheet/API disinkronkan di belakang. Ini mencegah layar terasa lama kosong.
    const instantCalendar = getInstantCalendarForView(absensiCalendarViewDate);
    renderAbsensiCalendarV168(instantCalendar);

    if (shouldLoadRemote) scheduleAbsensiCalendarMonthSync();
  }

  function getInstantCalendarForView(viewDate) {
    const view = viewDate || new Date();
    const key = calendarViewKey(view);
    const cached = readCalendarMonthCache(key);
    if (cached) return normalizeCalendarForView(cached, view);

    const current = getCalendarForView(absensiCalendarCache || {}, view);
    if (current && !current.__loading) return current;

    return buildCalendarShellForView(view);
  }

  function buildCalendarShellForView(viewDate) {
    const view = viewDate || new Date();
    const key = calendarViewKey(view);
    return {
      tanggalMerah: [],
      pesanan: [],
      ulangTahun: [],
      __viewKey: key,
      viewKey: key,
      __loading: true
    };
  }

  function readCalendarMonthCache(key) {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(APJ_CALENDAR_CACHE_PREFIX + key);
      if (!raw) return null;
      const box = JSON.parse(raw);
      if (!box || !box.calendar || !box.ts) return null;
      if ((Date.now() - Number(box.ts || 0)) > APJ_CALENDAR_CACHE_TTL_MS) return null;
      const cal = box.calendar || {};
      cal.__viewKey = key;
      return cal;
    } catch (err) {
      return null;
    }
  }

  function saveCalendarMonthCache(key, calendar) {
    if (!key || !calendar) return;
    try {
      const safe = normalizeCalendarForView(calendar, keyToDate(key));
      safe.__viewKey = key;
      localStorage.setItem(APJ_CALENDAR_CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), calendar: safe }));
    } catch (err) {}
  }

  function keyToDate(key) {
    const parts = String(key || '').split('-');
    const y = Number(parts[0] || new Date().getFullYear());
    const m = Number(parts[1] || 1) - 1;
    return new Date(y, m, 1);
  }

  function getCalendarForView(calendar, viewDate) {
    const key = calendarViewKey(viewDate || new Date());
    const sourceKey = calendar && (calendar.__viewKey || calendar.viewKey || calendar.monthKey);
    if (sourceKey && sourceKey !== key) return { tanggalMerah: [], pesanan: [], ulangTahun: [], __viewKey: key, __loading: true };
    const copy = normalizeCalendarForView(calendar || {}, viewDate || new Date());
    copy.__viewKey = key;
    return copy;
  }

  function scheduleAbsensiCalendarMonthSync() {
    if (PAGE_MODE !== 'central' && PAGE_MODE !== 'absensi') return;
    if (absensiCalendarRemoteTimer) clearTimeout(absensiCalendarRemoteTimer);
    absensiCalendarRemoteTimer = setTimeout(loadAbsensiCalendarMonthForView, 180);
  }

  async function loadAbsensiCalendarMonthForView() {
    const view = absensiCalendarViewDate || new Date();
    const key = calendarViewKey(view);
    if (!key || absensiCalendarRemoteLoadingKey === key) return;
    absensiCalendarRemoteLoadingKey = key;
    try {
      const payloadDate = dateISOLocal(new Date(view.getFullYear(), view.getMonth(), 1));
      const res = await absensiCall(absensiActionName('dashboard', 'getDashboardAbsensiV170'), userPayload({ tanggal: payloadDate, calendarOnly: true }));
      if (res && res.success === false) throw new Error(res.pesan || 'Kalender gagal dimuat.');
      const normalized = normalizeAbsensiDashboardData(res || {});
      const calendar = normalizeCalendarForView(normalized.calendar || {}, view);
      calendar.__viewKey = key;
      absensiCalendarRemoteLoadedKey = key;
      saveCalendarMonthCache(key, calendar);
      renderAbsensiCalendarV168(calendar);
    } catch (error) {
      const cached = readCalendarMonthCache(key);
      if (cached) {
        renderAbsensiCalendarV168(cached);
      } else if (PAGE_MODE === 'central') {
        const fallback = normalizeCalendarForView(buildCentralFallbackCalendar(getUserDataObject(), false, ''), view);
        fallback.__viewKey = key;
        renderAbsensiCalendarV168(fallback);
      }
    } finally {
      absensiCalendarRemoteLoadingKey = '';
    }
  }

  function calendarViewKey(date) {
    date = date || new Date();
    return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function normalizeCalendarForView(calendar, viewDate) {
    const key = (calendar && (calendar.__viewKey || calendar.viewKey || calendar.monthKey)) || calendarViewKey(viewDate || new Date());
    const out = {
      tanggalMerah: arr((calendar || {}).tanggalMerah).map(function (r) { return tagCalendarRowSource(r, key); }),
      pesanan: arr((calendar || {}).pesanan).map(function (r) { return tagCalendarRowSource(r, key); }),
      ulangTahun: arr((calendar || {}).ulangTahun).map(function (r) { return tagCalendarRowSource(r, key); }),
      __viewKey: key
    };
    return out;
  }

  function tagCalendarRowSource(row, key) {
    const out = Object.assign({}, row || {});
    if (!out.__viewKey) out.__viewKey = key || '';
    return out;
  }

  function lockAbsensiCalendarCardHeight(card) {
    if (!card) return;
    if (!card.classList.contains('is-event-mode')) {
      const rect = card.getBoundingClientRect();
      const h = Math.ceil(rect && rect.height ? rect.height : card.offsetHeight || 0);
      if (h > 0) card.style.setProperty('--apj-calendar-card-height', h + 'px');
    }
  }

  function bindAbsensiCalendarBack() {
    const back = document.getElementById('calendarBackBtn');
    if (!back || back.__apjCalendarBackBound) return;
    back.__apjCalendarBackBound = true;
    back.addEventListener('click', function () { showAbsensiCalendarGrid(); });
  }

  function showAbsensiCalendarGrid() {
    const card = document.getElementById('absensiCalendarCard');
    const back = document.getElementById('calendarBackBtn');
    const pill = document.getElementById('calendarModePill');
    if (card) {
      card.classList.remove('is-event-mode');
      card.style.removeProperty('--apj-calendar-card-height');
    }
    if (back) back.classList.add('hidden');
    if (pill) pill.classList.remove('hidden');
    setText('calendarTitle', 'Kalender');
    const view = absensiCalendarViewDate || new Date();
    const now = new Date();
    const isCurrentMonth = view.getFullYear() === now.getFullYear() && view.getMonth() === now.getMonth();
    setText('calendarMonth', view.toLocaleDateString('id-ID', { month:'long', year:'numeric' }));
    setText('calendarModePill', isCurrentMonth ? 'Hari ini' : 'Pilih bulan');
    html('calendarEvents', '');
  }

  function renderAbsensiCalendarEventsForDay(calendar, day, openCard) {
    const now = new Date();
    const view = absensiCalendarViewDate || now;
    const selectedDay = day || (view.getFullYear() === now.getFullYear() && view.getMonth() === now.getMonth() ? now.getDate() : 1);
    const dt = new Date(view.getFullYear(), view.getMonth(), selectedDay);
    const isToday = dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && selectedDay === now.getDate();
    calendar = normalizeCalendarForView(calendar || {}, view);
    const sourceKey = calendar.__viewKey || calendar.viewKey || calendar.monthKey || '';
    const red = indexCalendarRows(calendar.tanggalMerah, view, { sourceKey: sourceKey, requireMonth: true });
    const order = indexCalendarRows(calendar.pesanan, view, { sourceKey: sourceKey, requireMonth: true });
    const birth = indexCalendarRows(calendar.ulangTahun, view, { recurringMonth: true, sourceKey: sourceKey, requireMonth: true });
    const events = [];
    if (isToday) events.push({ type:'Hari ini', label: dt.toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) });
    const redRows = red[selectedDay] || (dt.getDay() === 0 ? [{ label:'Minggu' }] : []);
    redRows.forEach(function (x) { events.push({ type:'Tanggal merah', label:x.label || x.nama || 'Libur nasional' }); });
    (order[selectedDay] || []).forEach(function (x) { events.push({ type:'Pesanan', label:x.label || x.nama || x.jam || '-' }); });
    (birth[selectedDay] || []).forEach(function (x) { events.push({ type:'Ulang tahun', label:x.nama || x.label || '-' }); });
    const dateLabel = dt.toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    const smallDate = dt.toLocaleDateString('id-ID', { day:'2-digit', month:'short' });
    const listHtml = events.length ? events.map(function (e) {
      const typeClass = String(e.type || '').toLowerCase().replace(/\s+/g, '-');
      return '<div class="calendar-event-line type-' + esc(typeClass) + '"><b>' + esc(e.type) + '</b><span>' + esc(e.label) + '</span></div>';
    }).join('') : '<div class="calendar-event-line muted"><b>Tidak ada event</b><span>Tidak ada pesanan, ulang tahun, atau tanggal merah.</span></div>';
    const summary = events.length + ' event';
    html('calendarEvents', '<div class="calendar-event-card"><div class="calendar-event-card-head"><div class="calendar-event-date"><strong>' + esc(String(selectedDay)) + '</strong><span>' + esc(smallDate.replace(/^\d+\s*/, '')) + '</span></div><div class="calendar-event-heading"><p>Detail Tanggal</p><h4>' + esc(dateLabel) + '</h4><span>' + esc(summary) + ' ditemukan</span></div></div><div class="calendar-event-list">' + listHtml + '</div></div>');
    if (openCard) {
      const card = document.getElementById('absensiCalendarCard');
      const back = document.getElementById('calendarBackBtn');
      const pill = document.getElementById('calendarModePill');
      if (card) {
        lockAbsensiCalendarCardHeight(card);
        card.classList.add('is-event-mode');
      }
      if (back) back.classList.remove('hidden');
      if (pill) pill.classList.add('hidden');
      setText('calendarTitle', 'Event Tanggal');
      setText('calendarMonth', dateLabel);
      bindAbsensiCalendarBack();
    }
  }

  function indexCalendarRows(rows, viewDate, options) {
    const map = {};
    (rows || []).forEach(function (r) {
      if (!calendarRowMatchesView(r, viewDate || new Date(), options || {})) return;
      const d = Number(getCalendarDayValue(r) || 0);
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(r || {});
    });
    return map;
  }

  function calendarRowMatchesView(row, viewDate, options) {
    if (!row) return false;
    options = options || {};
    const view = viewDate || new Date();
    const parsed = getCalendarRowParsedDate(row);
    const monthValue = row.month || row.bulan || row.MONTH || row.BULAN || row.tanggalBulan || row.TANGGAL_BULAN;
    const rowYear = row.year || row.tahun || row.YEAR || row.TAHUN;
    if (parsed) {
      if (parsed.getMonth() !== view.getMonth()) return false;
      const raw = String(rawCalendarDateValue(row) || '');
      const hasExplicitYear = /\d{4}/.test(raw) || rowYear;
      if (hasExplicitYear && !options.recurringMonth && parsed.getFullYear() !== view.getFullYear()) return false;
      return true;
    }
    const m = Number(monthValue || 0);
    if (m && m >= 1 && m <= 12) {
      if ((m - 1) !== view.getMonth()) return false;
      const y = Number(rowYear || 0);
      if (y && !options.recurringMonth && y !== view.getFullYear()) return false;
      return true;
    }
    if (options.requireMonth) {
      const sourceKey = options.sourceKey || row.__viewKey || row.viewKey || row.monthKey || '';
      return !!sourceKey && sourceKey === calendarViewKey(view);
    }
    return true;
  }

  function getCalendarRowParsedDate(row) {
    const raw = rawCalendarDateValue(row);
    return raw ? parseAnyDate(raw) : null;
  }

  function rawCalendarDateValue(row) {
    if (!row) return '';
    return row.tanggal || row.date || row.TANGGAL || row.tanggalLahir || row.TANGGAL_LAHIR || row.ulangTahun || row.ULTAH || row.timestamp || row.createdAt || '';
  }

  function indexDays(rows) {
    const map = {};
    (rows || []).forEach(function (r) {
      const d = Number(getCalendarDayValue(r) || 0);
      if (d) map[d] = true;
    });
    return map;
  }

  function arr(v) { return Array.isArray(v) ? v : []; }



  async function renderCentralHomeDashboard(isManualRefresh) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('dashboardContent');
    setDashboardHomeLoading(true);
    if (loading) {
      const bold = loading.querySelector('p.font-bold');
      const sub = loading.querySelector('p.text-xs');
      if (bold) bold.textContent = 'Memuat Dashboard Utama...';
      if (sub) {
        sub.textContent = '';
        sub.style.display = 'none';
      }
    }

    const user = getUserDataObject();
    const birthdayToday = isBirthdayToday(user, currentSession);
    const name = currentSession && (currentSession.name || currentSession.nama || currentSession.username) || 'Pengguna';

    applyCentralBirthdayHero(birthdayToday, name);

    renderCentralMiniInfo(birthdayToday);
    renderHomeEditButtons();
    renderHomeDailyCards();

    const fallbackCalendar = buildCentralFallbackCalendar(user, birthdayToday, name);
    renderHomeBirthdayCards(birthdayToday, name, fallbackCalendar);
    renderAbsensiCalendarV168(getInstantCalendarForView(absensiCalendarViewDate || new Date()) || fallbackCalendar);
    if (birthdayToday) scheduleHomeBirthdayNotice(true, name, fallbackCalendar);

    // FIX4: dashboard langsung ditampilkan; API Sheet/API libur nasional tetap sinkron di belakang.
    setDashboardHomeLoading(false);

    const backendTask = loadCentralHomeBackendData(!!isManualRefresh, birthdayToday, name);
    const calendarTask = loadCentralHomeCalendarData(fallbackCalendar, isManualRefresh, birthdayToday, name);

    try {
      await withTimeout(Promise.allSettled([backendTask, calendarTask]), 10000, 'Dashboard Utama memakai data fallback karena API terlalu lama merespons.');
    } catch (error) {
      if (isManualRefresh) showToast(error && error.message ? error.message : 'Dashboard Utama memakai data fallback.', 'warning');
    }

    renderBirthdayInbox(birthdayToday, name);
    setDashboardHomeLoading(false);
    startCentralHomeSilentRefresh();
    if (isManualRefresh) showToast('Dashboard Utama sudah disegarkan.', 'success');
  }

  function startCentralHomeSilentRefresh() {
    if (PAGE_MODE !== 'central' || homeSilentRefreshTimer) return;
    homeSilentRefreshTimer = setInterval(function () {
      refreshCentralHomeSilent('interval');
    }, 45000);
  }

  async function refreshCentralHomeSilent(reason) {
    if (PAGE_MODE !== 'central' || homeSilentRefreshRunning) return;
    homeSilentRefreshRunning = true;
    try {
      const user = getUserDataObject();
      const birthdayToday = isBirthdayToday(user, currentSession);
      const name = currentSession && (currentSession.name || currentSession.nama || currentSession.username) || 'Pengguna';
      await loadCentralHomeBackendData(false, birthdayToday, name);
      renderBirthdayInbox(birthdayToday, name);
      if (reason === 'send') {
        setBirthdayWishStatus('Ucapan berhasil masuk ke sheet.', 'success');
      }
    } catch (error) {
      if (reason === 'send') {
        const msg = error && error.message ? error.message : 'Gagal menyegarkan pesan.';
        setBirthdayWishStatus(msg, 'warning');
      }
    } finally {
      homeSilentRefreshRunning = false;
    }
  }

  window.APJSilentRefreshDashboardUtama = function (reason) {
    return refreshCentralHomeSilent(reason || 'manual');
  };

  function setDashboardHomeLoading(isLoading) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('dashboardContent');
    const body = document.body;
    if (body) body.classList.toggle('home-dashboard-loading', !!isLoading);
    if (loading) {
      loading.classList.toggle('hidden', !isLoading);
      loading.style.display = isLoading ? 'flex' : 'none';
      loading.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
    }
    if (content) {
      content.classList.toggle('hidden', !!isLoading);
      content.style.display = isLoading ? 'none' : '';
      content.setAttribute('aria-hidden', isLoading ? 'true' : 'false');
    }
  }

  window.renderCentralHomeDashboard = renderCentralHomeDashboard;

  async function loadCentralHomeBackendData(isManualRefresh, birthdayToday, name) {
    try {
      const res = await coreCall(coreActionName('dashboardUtama', 'getDashboardUtamaDataV202'), userPayload({ tanggal: dateISOLocal(new Date()) }));
      if (!res || res.success === false) throw new Error((res && (res.message || res.pesan)) || 'Dashboard Utama belum aktif.');
      homeBackendLoaded = true;
      homeLatestTodayItems = arr(res.todayItems || res.today || []);
      homeLatestAnnouncements = arr(res.pengumuman || res.announcements || []);
      renderHomeTodayItems(homeLatestTodayItems);
      renderHomeAnnouncements(homeLatestAnnouncements);
      homeBirthdayWishesBackendLoaded = true;
      homeBirthdayContext.wishes = arr(res.birthdayWishes || res.ucapan || res.wishes || []);
      homeBirthdayContext.sentWishes = arr(res.sentBirthdayWishes || res.sentUcapan || res.sentWishes || []);
      // Sheet UCAPAN_ULANG_TAHUN adalah sumber utama. Jika backend berhasil terbaca,
      // cache/local fallback hari ini dibersihkan supaya pesan lama tidak muncul lagi
      // setelah baris sheet dihapus manual.
      clearBirthdayMessageLocalCache();
      homeBirthdayContext.birthdayDirectory = arr(res.birthdays || res.ulangTahun || []).map(enrichBirthdayRow);
      const backendCalendar = { tanggalMerah: [], pesanan: [], ulangTahun: homeBirthdayContext.birthdayDirectory.slice() };
      renderHomeBirthdayCards(!!birthdayToday, name, backendCalendar);
      scheduleHomeBirthdayNotice(homeBirthdayContext.isBirthday, name, backendCalendar);
      if (isManualRefresh) showToast('Data Dashboard Utama dari Core User sudah dimuat.', 'success');
      return res;
    } catch (error) {
      homeBackendLoaded = false;
      if (isManualRefresh) showToast('Data Today/Pengumuman belum tersambung: ' + (error && error.message ? error.message : 'API belum aktif'), 'warning');
      return { success:false, error:error };
    }
  }

  function renderHomeTodayItems(rows) {
    rows = arr(rows).filter(Boolean);
    if (!rows.length) {
      html('todayCardList', '<div class="today-line is-primary"><b>APJ - Solid</b><span>Salam, informasi, apresiasi, doa, dan motivasi.</span></div><div class="today-line"><b>APJ - YES</b><span>Jaga pelayanan, kebersihan, dan kerja sama tim.</span></div>');
      return;
    }
    html('todayCardList', rows.slice(0, 6).map(function (r, idx) {
      const title = r.judul || r.title || r.badge || 'Today';
      const body = r.isi || r.body || r.keterangan || r.catatan || '';
      const icon = r.icon || (idx === 0 ? '✨' : '•');
      return '<div class="today-line ' + (idx === 0 ? 'is-primary' : '') + '"><b>' + esc(icon + ' ' + title) + '</b><span>' + esc(body) + '</span></div>';
    }).join(''));
  }

  function renderHomeAnnouncements(rows) {
    rows = arr(rows).filter(Boolean);
    if (!rows.length) {
      html('announcementList', '<div class="soft-row announcement-empty-row"><p class="row-title">Belum ada pengumuman baru.</p><p class="row-sub">Pengumuman bisa diedit owner/superadmin dari Dashboard Utama atau sheet PENGUMUMAN_APJ.</p></div>');
      return;
    }
    html('announcementList', rows.slice(0, 5).map(function (r) {
      const priority = String(r.prioritas || r.priority || '').toUpperCase();
      const badge = priority && priority !== 'NORMAL' ? '<span class="announcement-badge">' + esc(priority) + '</span>' : '';
      return '<div class="soft-row announcement-row"><p class="row-title">' + esc(r.judul || r.title || 'Pengumuman') + badge + '</p><p class="row-sub">' + esc(r.isi || r.body || r.keterangan || '-') + '</p></div>';
    }).join(''));
  }

  async function loadCentralHomeCalendarData(fallbackCalendar, isManualRefresh, birthdayToday, name) {
    try {
      const view = absensiCalendarViewDate || new Date();
      const key = calendarViewKey(view);
      const cached = !isManualRefresh ? readCalendarMonthCache(key) : null;
      if (cached) {
        renderAbsensiCalendarV168(cached);
        renderHomeBirthdayCards(!!birthdayToday, name, cached);
      }
      const res = await absensiCall(absensiActionName('dashboard', 'getDashboardAbsensiV170'), userPayload({ tanggal: dateISOLocal(new Date(view.getFullYear(), view.getMonth(), 1)), calendarOnly: true }));
      if (res && res.success === false) throw new Error(res.pesan || 'Kalender umum gagal dimuat.');
      const normalized = normalizeAbsensiDashboardData(res || {});
      const mergedCalendar = mergeCentralCalendar(normalized.calendar || {}, fallbackCalendar || {});
      mergedCalendar.__viewKey = calendarViewKey(view);
      saveCalendarMonthCache(mergedCalendar.__viewKey, mergedCalendar);
      renderAbsensiCalendarV168(mergedCalendar);
      renderHomeBirthdayCards(!!birthdayToday, name, mergedCalendar);
      scheduleHomeBirthdayNotice(homeBirthdayContext.isBirthday, name, mergedCalendar);
      return mergedCalendar;
    } catch (error) {
      renderAbsensiCalendarV168(fallbackCalendar || { tanggalMerah: [], pesanan: [], ulangTahun: [] });
      renderHomeBirthdayCards(!!birthdayToday, name, fallbackCalendar || { ulangTahun: [] });
      scheduleHomeBirthdayNotice(homeBirthdayContext.isBirthday, name, fallbackCalendar || { ulangTahun: [] });
      if (isManualRefresh) showToast('Kalender umum memakai data lokal: ' + (error && error.message ? error.message : 'API belum aktif'), 'warning');
      return fallbackCalendar || { tanggalMerah: [], pesanan: [], ulangTahun: [] };
    }
  }

  function mergeCentralCalendar(mainCalendar, fallbackCalendar) {
    const out = {
      tanggalMerah: arr((mainCalendar || {}).tanggalMerah).slice(),
      pesanan: arr((mainCalendar || {}).pesanan).slice(),
      ulangTahun: arr((mainCalendar || {}).ulangTahun).slice()
    };
    arr((fallbackCalendar || {}).tanggalMerah).forEach(function (x) { out.tanggalMerah.push(x); });
    arr((fallbackCalendar || {}).pesanan).forEach(function (x) { out.pesanan.push(x); });
    arr((fallbackCalendar || {}).ulangTahun).forEach(function (x) { out.ulangTahun.push(x); });
    return out;
  }

  function getUserDataObject() {
    const raw = safeParseJSON(localStorage.getItem('APJ_USER_DATA') || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  }

  function isBirthdayToday(user, session) {
    const candidates = [
      user.tanggalLahir, user.TANGGAL_LAHIR, user['Tanggal Lahir'], user.tglLahir, user.TTL, user.ULTAH, user.ulangTahun,
      session && session.tanggalLahir, session && session['Tanggal Lahir']
    ].filter(Boolean);
    const now = new Date();
    return candidates.some(function (value) {
      const d = parseBirthdayDate(value);
      return d && d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
    });
  }

  function parseBirthdayDate(value) {
    if (!value) return null;
    if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value;
    const s = String(value).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    m = s.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    if (m) return new Date(Number(m[3] || new Date().getFullYear()), Number(m[2]) - 1, Number(m[1]));
    return null;
  }

  function renderCentralMiniInfo(isBirthday) {
    html('dashboardHomeMini', [
      '<span>📅 ' + esc(formatDateHuman(new Date())) + '</span>',
      '<span>👤 ' + esc((currentSession && currentSession.level) || 'USER') + '</span>',
      '<span>' + (isBirthday ? '🎂 Hari spesial kamu' : '✨ APJ - Solid') + '</span>',
      '<a class="home-absen-chip" href="absensi.html" title="Buka Check In / Out">📍 Absen</a>'
    ].join(''));
  }

  function renderHomeEditButtons() {
    const canEdit = hasAnyPermission(currentSession, ['dashboardUtamaEdit', 'editDashboardUtama', 'editMotoJargon', 'editToday', 'editPengumuman']);
    const labelMap = { today: 'Today', motto: 'Today', announcement: 'Pengumuman' };
    document.querySelectorAll('[data-home-edit]').forEach(function (btn) {
      btn.classList.toggle('hidden', !canEdit);
      if (!btn.__homeEditBound) {
        btn.__homeEditBound = true;
        btn.addEventListener('click', function () {
          const key = btn.getAttribute('data-home-edit') || '';
          openHomeEditPrompt(key, labelMap[key] || 'Dashboard Utama');
        });
      }
    });
  }

  function openHomeEditPrompt(key, label) {
    openHomeEditModal(key, label);
  }

  function ensureHomeEditModal() {
    let modal = document.getElementById('homeEditModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'homeEditModal';
    modal.className = 'home-edit-modal hidden';
    modal.innerHTML = '<div class="home-edit-backdrop" data-home-edit-close="1"></div>' +
      '<div class="home-edit-panel" role="dialog" aria-modal="true" aria-labelledby="homeEditTitle">' +
      '<button type="button" class="home-edit-close" data-home-edit-close="1" aria-label="Tutup">×</button>' +
      '<div class="home-edit-head"><span class="home-edit-kicker">Dashboard Utama</span><h3 id="homeEditTitle">Edit</h3><p id="homeEditDesc">Perbarui konten yang tampil untuk karyawan.</p></div>' +
      '<form id="homeEditForm" class="home-edit-form"></form>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (event) {
      if (event.target && event.target.getAttribute('data-home-edit-close')) closeHomeEditModal();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeHomeEditModal();
    });
    return modal;
  }

  function openHomeEditModal(key, label) {
    if (!hasAnyPermission(currentSession, ['dashboardUtamaEdit', 'editDashboardUtama', key === 'today' ? 'editToday' : 'editPengumuman'])) {
      showToast('Akses edit ditolak.', 'error');
      return;
    }
    const modal = ensureHomeEditModal();
    const form = modal.querySelector('#homeEditForm');
    const title = modal.querySelector('#homeEditTitle');
    const desc = modal.querySelector('#homeEditDesc');
    const current = key === 'today' ? (homeLatestTodayItems[0] || {}) : (homeLatestAnnouncements[0] || {});
    if (title) title.textContent = key === 'today' ? 'Edit Today' : 'Edit Pengumuman APJ';
    if (desc) desc.textContent = key === 'today' ? 'Isi semangat, apresiasi, atau fokus kerja hari ini.' : 'Isi informasi resmi yang akan tampil untuk karyawan.';
    if (!form) return;
    if (key === 'today') {
      form.innerHTML =
        '<input type="hidden" name="kind" value="today">' +
        '<label>Judul Today<input name="judul" value="' + esc(current.judul || current.title || '') + '" placeholder="Contoh: APJ - Solid" required></label>' +
        '<label>Isi<textarea name="isi" rows="5" placeholder="Tulis isi Today..." required>' + esc(current.isi || current.body || current.keterangan || '') + '</textarea></label>' +
        '<div class="home-edit-two"><label>Icon<input name="icon" value="' + esc(current.icon || '✨') + '" placeholder="✨"></label><label>Badge<input name="badge" value="' + esc(current.badge || '') + '" placeholder="Opsional"></label></div>' +
        '<div class="home-edit-actions"><button type="button" class="btn-secondary" data-home-edit-close="1">Batal</button><button type="submit" class="btn-primary">Simpan Today</button></div>';
    } else {
      form.innerHTML =
        '<input type="hidden" name="kind" value="announcement">' +
        '<label>Judul Pengumuman<input name="judul" value="' + esc(current.judul || current.title || '') + '" placeholder="Contoh: Briefing Pagi" required></label>' +
        '<label>Isi Pengumuman<textarea name="isi" rows="5" placeholder="Tulis isi pengumuman..." required>' + esc(current.isi || current.body || current.keterangan || '') + '</textarea></label>' +
        '<div class="home-edit-two"><label>Prioritas<select name="prioritas"><option value="NORMAL"' + (String(current.prioritas || '').toUpperCase() !== 'PENTING' ? ' selected' : '') + '>Normal</option><option value="PENTING"' + (String(current.prioritas || '').toUpperCase() === 'PENTING' ? ' selected' : '') + '>Penting</option></select></label><label>Target Outlet<input name="targetOutlet" value="' + esc(current.targetOutlet || 'ALL') + '" placeholder="ALL / LAHOR"></label></div>' +
        '<div class="home-edit-two"><label>Target Level<input name="targetLevel" value="' + esc(current.targetLevel || 'ALL') + '" placeholder="ALL / KASIR"></label><label>Status<select name="status"><option value="AKTIF" selected>Aktif</option><option value="NONAKTIF">Nonaktif</option></select></label></div>' +
        '<div class="home-edit-actions"><button type="button" class="btn-secondary" data-home-edit-close="1">Batal</button><button type="submit" class="btn-primary">Simpan Pengumuman</button></div>';
    }
    form.onsubmit = function (event) { submitHomeEditForm(event, key, label); };
    modal.classList.remove('hidden');
    document.body.classList.add('home-edit-open');
    const firstInput = form.querySelector('input[name="judul"]');
    if (firstInput) window.setTimeout(function () { firstInput.focus(); }, 60);
  }

  function closeHomeEditModal() {
    const modal = document.getElementById('homeEditModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('home-edit-open');
  }

  async function submitHomeEditForm(event, key, label) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const judul = String(fd.get('judul') || '').trim();
    const isi = String(fd.get('isi') || '').trim();
    if (!judul || !isi) return showToast('Judul dan isi wajib diisi.', 'warning');
    try {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...'; }
      const action = key === 'today' ? coreActionName('saveDashboardToday', 'saveDashboardTodayV202') : coreActionName('savePengumumanApj', 'savePengumumanApjV202');
      const payload = key === 'today'
        ? { judul: judul, isi: isi, icon: String(fd.get('icon') || '✨').trim(), badge: String(fd.get('badge') || '').trim(), status:'AKTIF' }
        : { judul: judul, isi: isi, targetLevel:String(fd.get('targetLevel') || 'ALL').trim(), targetOutlet:String(fd.get('targetOutlet') || 'ALL').trim(), status:String(fd.get('status') || 'AKTIF').trim(), prioritas:String(fd.get('prioritas') || 'NORMAL').trim() };
      const res = await coreCall(action, userPayload(payload));
      if (!res || res.success === false) throw new Error((res && (res.message || res.pesan)) || 'Gagal menyimpan.');
      closeHomeEditModal();
      showToast(label + ' berhasil disimpan.', 'success');
      loadCentralHomeBackendData(true, isBirthdayToday(getUserDataObject(), currentSession), (currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || 'Pengguna');
    } catch (error) {
      showToast('Gagal menyimpan ' + label + ': ' + (error && error.message ? error.message : error), 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = key === 'today' ? 'Simpan Today' : 'Simpan Pengumuman'; }
    }
  }

  function getCalendarDayValue(row) {
    if (!row) return 0;
    const direct = Number(row.day || row.hari || row.tanggalHari || row.TANGGAL_HARI || 0);
    if (direct && direct <= 31) return direct;
    const raw = row.tanggal || row.date || row.TANGGAL || row.tanggalLahir || row.TANGGAL_LAHIR || row.ulangTahun || row.ULTAH || row.timestamp || row.createdAt;
    const parsed = parseAnyDate(raw);
    return parsed ? parsed.getDate() : direct;
  }

  function parseAnyDate(value) {
    if (!value) return null;
    if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value;
    const s = String(value).trim();
    let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{2,4}))?/);
    if (m) return new Date(Number(m[3] || new Date().getFullYear()), Number(m[2]) - 1, Number(m[1]));
    m = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)(?:\s+(\d{2,4}))?/i);
    if (m) {
      const mm = monthNameIndex(m[2]);
      if (mm >= 0) return new Date(Number(m[3] || new Date().getFullYear()), mm, Number(m[1]));
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function monthNameIndex(value) {
    const key = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    const map = {
      januari:0, january:0, jan:0,
      februari:1, february:1, feb:1,
      maret:2, march:2, mar:2,
      april:3, apr:3,
      mei:4, may:4,
      juni:5, june:5, jun:5,
      juli:6, july:6, jul:6,
      agustus:7, august:7, aug:7, agu:7,
      september:8, sep:8, sept:8,
      oktober:9, october:9, okt:9, oct:9,
      november:10, nov:10,
      desember:11, december:11, des:11, dec:11
    };
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : -1;
  }

  function getBirthdayCacheKey() {
    return 'APJ_HOME_TODAY_BIRTHDAYS_' + dateISO(new Date());
  }

  function cacheTodayBirthdays(rows) {
    try { localStorage.setItem(getBirthdayCacheKey(), JSON.stringify(arr(rows).slice(0, 20))); } catch (ignore) {}
  }

  function readCachedTodayBirthdays() {
    try { return arr(safeParseJSON(localStorage.getItem(getBirthdayCacheKey()) || '[]')); } catch (ignore) { return []; }
  }

  function clearCachedTodayBirthdays() {
    try {
      localStorage.removeItem(getBirthdayCacheKey());
      Object.keys(localStorage).forEach(function (key) {
        if (/^APJ_HOME_TODAY_BIRTHDAYS_/.test(key)) localStorage.removeItem(key);
      });
    } catch (ignore) {}
  }

  function isCalendarRowToday(row) {
    const now = new Date();
    if (!calendarRowMatchesView(row, now, { recurringMonth: true })) return false;
    return Number(getCalendarDayValue(row) || 0) === now.getDate();
  }

  function isCurrentUserBirthdayRow(row, name) {
    if (!row) return false;
    const session = currentSession || {};
    const userKey = normalizeNameKey(session.username || session.userName || '');
    const rowUserKey = normalizeNameKey(getBirthdayRowUsername(row));
    if (userKey && rowUserKey && userKey === rowUserKey) return true;
    const selfNameKey = normalizeNameKey(name || session.name || session.nama || session.username || '');
    const rowNameKey = normalizeNameKey(getBirthdayRowName(row));
    return !!selfNameKey && !!rowNameKey && selfNameKey === rowNameKey;
  }

  function applyCentralBirthdayHero(isBirthday, name) {
    setText('modeBadge', isBirthday ? 'APJ Central • Ulang Tahun' : 'APJ Central • Live');
    setText('welcomeNama', name || 'Pengguna');
    const hero = document.getElementById('heroCard');
    if (isBirthday) {
      setText('greetingText', 'Selamat ulang tahun');
      setText('greetingEmoji', '🎂');
      setText('modeDescription', 'Semoga sehat, bahagia, rezeki lancar, dan terus bertumbuh bersama APJ. APJ - Solid, APJ - YES!');
      if (hero) hero.classList.add('is-birthday-hero');
    } else {
      setText('greetingText', getGreetingLabel());
      setText('greetingEmoji', '👋');
      setText('modeDescription', 'Selamat datang di APJ Central. Semoga harimu lancar, semangat, dan APJ makin solid.');
      if (hero) hero.classList.remove('is-birthday-hero');
    }
  }

  function renderHomeBirthdayCards(isBirthday, name, calendar) {
    let rows = arr((calendar || {}).ulangTahun).filter(isCalendarRowToday);
    rows = dedupeBirthdayRows(enrichBirthdayRows(rows));
    const selfBirthdayFromSheet = rows.some(function (r) { return isCurrentUserBirthdayRow(r, name); });
    const actualIsBirthday = !!isBirthday || selfBirthdayFromSheet;

    if (actualIsBirthday && !rows.some(function (r) { return isCurrentUserBirthdayRow(r, name); })) {
      rows.unshift({ nama: name || 'Karyawan APJ', username: currentSession && currentSession.username || '' });
      rows = dedupeBirthdayRows(enrichBirthdayRows(rows));
    }

    if (rows.length) cacheTodayBirthdays(rows);
    else clearCachedTodayBirthdays();

    homeBirthdayContext = {
      isBirthday: !!actualIsBirthday,
      name: name || '',
      rows: rows,
      calendar: calendar || {},
      wishes: homeBirthdayContext.wishes || [],
      sentWishes: homeBirthdayContext.sentWishes || [],
      birthdayDirectory: homeBirthdayContext.birthdayDirectory || []
    };

    applyCentralBirthdayHero(!!actualIsBirthday, name || 'Pengguna');
    renderCentralMiniInfo(!!actualIsBirthday);

    const hasBirthday = rows.length > 0;
    const section = document.getElementById('dashboardBirthdaySection');
    const messagePanel = document.getElementById('birthdayMessagePanel');
    const inboxPanel = document.getElementById('birthdayInboxPanel');
    if (section) {
      section.classList.toggle('hidden', !hasBirthday);
      section.classList.toggle('is-birthday-user', !!actualIsBirthday);
      section.classList.toggle('is-non-birthday-user', !actualIsBirthday);
    }
    if (messagePanel) messagePanel.classList.toggle('hidden', !hasBirthday || !!actualIsBirthday);
    if (inboxPanel) inboxPanel.classList.toggle('hidden', !hasBirthday || !actualIsBirthday);
    if (!hasBirthday) {
      html('birthdayTodayCard', '');
      html('birthdayMessageCard', '');
      html('birthdayInboxCard', '');
      return;
    }
    const list = rows.slice(0, 8).map(function (r) {
      const nama = getBirthdayRowName(r) || 'Karyawan APJ';
      return '<div class="birthday-person"><b>🎂 ' + esc(nama) + '</b></div>';
    }).join('');
    html('birthdayTodayCard', '<div class="birthday-highlight"><b>Ulang tahun hari ini</b><span>' + rows.length + ' keluarga APJ berulang tahun.</span></div><div class="birthday-person-list">' + list + '</div>');
    if (actualIsBirthday) {
      html('birthdayMessageCard', '');
      renderBirthdayInbox(true, name);
    } else {
      renderBirthdayMessageForm(rows.filter(function (r) { return !isCurrentUserBirthdayRow(r, name); }));
      html('birthdayInboxCard', '');
    }
  }

  function normalizeNameKey(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function dedupeBirthdayRows(rows) {
    const seen = new Set();
    const out = [];
    arr(rows).forEach(function (r, idx) {
      const nama = r && (r.nama || r.label || r.Nama || r.username || r.Username) || '';
      const key = normalizeNameKey(nama) || ('row-' + idx);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(r);
    });
    return out;
  }

  function getBirthdayRowUsername(row) {
    if (!row) return '';
    return String(row.username || row.userName || row.USERNAME || row.usernameUlangTahun || row.USERNAME_ULANG_TAHUN || row.targetUsername || '').trim();
  }

  function getBirthdayRowName(row) {
    if (!row) return '';
    return String(row.nama || row.label || row.Nama || row.NAMA || row.namaUlangTahun || row.NAMA_ULANG_TAHUN || row.targetName || '').trim();
  }

  function enrichBirthdayRow(row) {
    row = row || {};
    const out = Object.assign({}, row);
    const name = getBirthdayRowName(out);
    if (!getBirthdayRowUsername(out)) {
      const dir = arr(homeBirthdayContext.birthdayDirectory || []);
      const match = dir.find(function (x) { return normalizeNameKey(getBirthdayRowName(x)) === normalizeNameKey(name); });
      const username = getBirthdayRowUsername(match) || (normalizeNameKey(name) === normalizeNameKey((currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || '') ? (currentSession && currentSession.username || '') : '');
      if (username) out.username = username;
    }
    return out;
  }

  function enrichBirthdayRows(rows) {
    return arr(rows).map(enrichBirthdayRow);
  }

  function resolveBirthdayTargetUsername(target, targetName) {
    const direct = getBirthdayRowUsername(target);
    if (direct) return direct;
    const search = arr(homeBirthdayContext.rows || []).concat(arr(homeBirthdayContext.birthdayDirectory || []));
    const match = search.find(function (x) { return normalizeNameKey(getBirthdayRowName(x)) === normalizeNameKey(targetName); });
    const found = getBirthdayRowUsername(match);
    if (found) return found;
    const selfName = (currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || '';
    if (normalizeNameKey(targetName) === normalizeNameKey(selfName)) return currentSession && currentSession.username || '';
    return '';
  }

  function renderBirthdayMessageForm(rows) {
    const safeRows = dedupeBirthdayRows(enrichBirthdayRows(rows || []));
    if (!safeRows.length) {
      html('birthdayMessageCard', '<div class="soft-row"><p class="row-title">Kirim ucapan</p><p class="row-sub">Belum ada karyawan yang berulang tahun hari ini.</p></div>');
      return;
    }
    const options = safeRows.map(function (r, idx) {
      const nama = getBirthdayRowName(r) || 'Karyawan APJ';
      return '<option value="' + idx + '">' + esc(nama) + '</option>';
    }).join('');
    homeBirthdayContext.rows = safeRows;
    html('birthdayMessageCard', '<form class="birthday-wish-form" id="birthdayWishForm">' +
      '<label class="birthday-field-label" for="birthdayWishTarget">Untuk</label>' +
      '<select id="birthdayWishTarget" class="birthday-wish-select">' + options + '</select>' +
      '<label class="birthday-field-label" for="birthdayWishText">Ucapan</label>' +
      '<textarea id="birthdayWishText" class="birthday-wish-textarea" rows="4" maxlength="240" placeholder="Tulis ucapan dan doa terbaik..."></textarea>' +
      '<div class="birthday-wish-status" id="birthdayWishStatus" aria-live="polite"></div>' +
      '<div class="birthday-wish-footer"><span>Maks. 240 karakter</span><button type="button" id="birthdayWishSubmit" class="birthday-send-btn" data-birthday-send="1" aria-live="polite">Kirim Ucapan</button></div>' +
      '</form>');
    bindBirthdayWishForm();
  }

  function bindBirthdayWishForm() {
    const form = document.getElementById('birthdayWishForm');
    const button = document.getElementById('birthdayWishSubmit');
    if (!form || !button) return;

    window.APJSubmitBirthdayWish = submitBirthdayWish;
    window.APJSubmitBirthdayWishDirect = function (event) {
      submitBirthdayWish(event);
      return false;
    };

    // Reset binding setiap form dirender ulang agar tidak memakai handler lama dari cache.
    button.setAttribute('onclick', 'return window.APJSubmitBirthdayWishDirect && window.APJSubmitBirthdayWishDirect(event);');
    if (!form.__birthdayWishBoundV209) {
      form.__birthdayWishBoundV209 = true;
      form.addEventListener('submit', submitBirthdayWish, false);
    }
    if (!button.__birthdayWishBoundV209) {
      button.__birthdayWishBoundV209 = true;
      ['click', 'pointerup', 'touchend'].forEach(function (type) {
        button.addEventListener(type, submitBirthdayWish, false);
      });
    }
    if (!window.__apjBirthdayWishDelegatedV209) {
      window.__apjBirthdayWishDelegatedV209 = true;
      document.addEventListener('click', function (event) {
        const trigger = event.target && event.target.closest && event.target.closest('#birthdayWishSubmit,[data-birthday-send="1"]');
        if (!trigger) return;
        submitBirthdayWish(event);
      }, false);
    }
  }

  function setBirthdayWishStatus(message, tone) {
    const statusEl = document.getElementById('birthdayWishStatus');
    if (!statusEl) return;
    statusEl.className = 'birthday-wish-status' + (tone ? ' is-' + tone : '');
    statusEl.textContent = message || '';
  }

  function setBirthdayWishButtonLoading(isLoading, text) {
    const btn = document.getElementById('birthdayWishSubmit');
    if (!btn) return;
    if (!btn.__normalHtml) btn.__normalHtml = btn.innerHTML || 'Kirim Ucapan';
    btn.disabled = !!isLoading;
    btn.classList.toggle('is-loading', !!isLoading);
    btn.innerHTML = isLoading ? '<span class="btn-spinner"></span>' + (text || 'Mengirim...') : btn.__normalHtml;
  }

  async function submitBirthdayWish(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const form = document.getElementById('birthdayWishForm');
    const targetEl = document.getElementById('birthdayWishTarget');
    const textEl = document.getElementById('birthdayWishText');
    if (!form || !targetEl || !textEl) {
      showToast('Form kirim ucapan belum siap. Refresh halaman lalu coba lagi.', 'warning');
      return false;
    }

    const message = String(textEl.value || '').trim();
    if (!message) {
      setBirthdayWishStatus('Tulis ucapan terlebih dulu.', 'warning');
      showToast('Tulis ucapan terlebih dulu.', 'warning');
      textEl.focus();
      return false;
    }

    if (form.__birthdayWishSending) return false;

    const rows = arr(homeBirthdayContext.rows || []);
    const idx = Number(targetEl.value || 0) || 0;
    const target = rows[idx] || rows[0];
    if (!target) {
      setBirthdayWishStatus('Belum ada penerima ucapan.', 'error');
      showToast('Belum ada penerima ucapan.', 'warning');
      return false;
    }

    const targetName = getBirthdayRowName(target) || 'Karyawan APJ';
    const targetUsername = resolveBirthdayTargetUsername(target, targetName);
    const senderName = (currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || 'Rekan APJ';

    const newWish = {
      usernameUlangTahun: targetUsername || '',
      targetUsername: targetUsername || '',
      namaUlangTahun: targetName,
      targetName: targetName,
      usernamePengirim: (currentSession && currentSession.username) || '',
      namaPengirim: senderName,
      senderName: senderName,
      message: message,
      ucapan: message,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const payload = userPayload({
      targetUsername: targetUsername || '',
      usernameUlangTahun: targetUsername || '',
      targetName: targetName,
      namaUlangTahun: targetName,
      ucapan: message
    });

    // V216: sheet-first. Ucapan dianggap berhasil hanya setelah backend mengonfirmasi append ke sheet.
    form.__birthdayWishSending = true;
    form.classList.add('is-sending');
    setBirthdayWishStatus('', '');
    setBirthdayWishButtonLoading(true, 'Mengirim...');

    withTimeout(coreCallAbortable(coreActionName('sendUcapanUlangTahun', 'sendUcapanUlangTahunV202'), payload, 18000), 18500, 'Core User terlalu lama merespons. Cek deploy Apps Script Core User.')
      .then(function (res) {
        if (!res || res.success === false) throw new Error((res && (res.message || res.pesan || res.error)) || 'Ucapan belum tersimpan ke sheet.');
        textEl.value = '';
        clearBirthdayMessageLocalCache();
        setBirthdayWishStatus('Ucapan berhasil masuk ke sheet.', 'success');
        showToast('Ucapan berhasil masuk ke sheet.', 'success');
        refreshCentralHomeSilent('send');
      })
      .catch(function (error) {
        const msg = (error && error.message ? error.message : String(error || 'Backend gagal.'));
        setBirthdayWishStatus(msg, 'error');
        showToast(msg, 'warning');
      })
      .finally(function () {
        setBirthdayWishButtonLoading(false);
        form.classList.remove('is-sending');
        form.__birthdayWishSending = false;
      });

    return false;
  }

  function syncBirthdayWishToSheet(payload, localWish) {
    const action = coreActionName('sendUcapanUlangTahun', 'sendUcapanUlangTahunV202');
    withTimeout(coreCallAbortable(action, payload, 8000), 8500, 'Core User terlalu lama merespons. Cek deploy Apps Script Core User.')
      .then(function (res) {
        if (!res || res.success === false) throw new Error((res && (res.message || res.pesan || res.error)) || 'Ucapan belum tersimpan ke sheet.');
        setBirthdayWishStatus('Ucapan sudah tersimpan ke sheet.', 'success');
        showToast('Ucapan sudah masuk ke sheet.', 'success');
      })
      .catch(function (error) {
        const msg = (error && error.message ? error.message : String(error || 'Backend gagal'));
        setBirthdayWishStatus('Ucapan tersimpan sementara. Gagal sinkron sheet: ' + msg, 'warning');
        showToast('Ucapan tersimpan sementara. Cek Core User: ' + msg, 'warning');
        try {
          localWish.syncStatus = 'failed';
          localWish.syncError = msg;
          saveBirthdayMessage(localWish);
        } catch (ignore) {}
      });
  }

  function getBirthdayMessageStorageKey() {
    return 'APJ_BIRTHDAY_MESSAGES_' + dateISO(new Date());
  }

  function readBirthdayMessages() {
    const raw = safeParseJSON(localStorage.getItem(getBirthdayMessageStorageKey()) || '[]');
    return Array.isArray(raw) ? raw : [];
  }

  function writeBirthdayMessages(rows) {
    try {
      localStorage.setItem(getBirthdayMessageStorageKey(), JSON.stringify(arr(rows).slice(-200)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveBirthdayMessage(row) {
    const rows = readBirthdayMessages();
    rows.push(row);
    return writeBirthdayMessages(rows);
  }

  function makeInboxMessageKey(m) {
    return [m.ucapanId || '', m.usernamePengirim || '', m.senderName || m.namaPengirim || '', m.createdAt || '', m.message || m.ucapan || ''].join('|');
  }

  function normalizeInboxMessage(m, mode) {
    return {
      ucapanId: m.ucapanId || m.UCAPAN_ID || '',
      usernameUlangTahun: m.usernameUlangTahun || m.targetUsername || m.USERNAME_ULANG_TAHUN || '',
      namaUlangTahun: m.namaUlangTahun || m.targetName || m.NAMA_ULANG_TAHUN || '',
      usernamePengirim: m.usernamePengirim || m.USERNAME_PENGIRIM || '',
      senderName: m.namaPengirim || m.senderName || m.NAMA_PENGIRIM || 'Rekan APJ',
      targetName: m.targetName || m.namaUlangTahun || m.NAMA_ULANG_TAHUN || 'Karyawan APJ',
      message: m.ucapan || m.message || m.UCAPAN || '',
      createdAt: m.createdAt || m.CREATED_AT || '',
      mode: mode || 'inbox'
    };
  }

  function getInboxMessagesForCurrentUser(name) {
    const currentName = name || (currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || '';
    const currentUsername = currentSession && currentSession.username || '';
    const nameKey = normalizeNameKey(currentName);
    const userKey = normalizeNameKey(currentUsername);
    // Pesan Masuk harus mengikuti sheet/backend. Local fallback hanya dipakai saat backend
    // belum berhasil dimuat sama sekali; kalau backend sudah berhasil dan sheet kosong,
    // jangan tampilkan pesan lokal lama.
    const combined = homeBirthdayWishesBackendLoaded ? arr(homeBirthdayContext.wishes) : arr(homeBirthdayContext.wishes).concat(readBirthdayMessages());
    const seen = {};
    return combined.filter(function (m) {
      const targetUserKey = normalizeNameKey(m.usernameUlangTahun || m.targetUsername || m.USERNAME_ULANG_TAHUN || '');
      const targetNameKey = normalizeNameKey(m.namaUlangTahun || m.targetName || m.NAMA_ULANG_TAHUN || '');
      return (userKey && targetUserKey === userKey) || (nameKey && targetNameKey === nameKey);
    }).map(function (m) { return normalizeInboxMessage(m, 'inbox'); }).filter(function (m) {
      const key = makeInboxMessageKey(m);
      if (seen[key]) return false;
      seen[key] = true;
      return !!m.message;
    });
  }

  function getSentBirthdayMessagesForCurrentUser(name) {
    const currentUsername = currentSession && currentSession.username || '';
    const currentName = name || (currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || '';
    const userKey = normalizeNameKey(currentUsername);
    const nameKey = normalizeNameKey(currentName);
    const source = homeBirthdayWishesBackendLoaded ? arr(homeBirthdayContext.sentWishes || []) : arr(homeBirthdayContext.sentWishes || []).concat(readBirthdayMessages());
    const seen = {};
    return source.filter(function (m) {
      const senderUserKey = normalizeNameKey(m.usernamePengirim || m.USERNAME_PENGIRIM || '');
      const senderNameKey = normalizeNameKey(m.namaPengirim || m.senderName || m.NAMA_PENGIRIM || '');
      return (userKey && senderUserKey === userKey) || (nameKey && senderNameKey === nameKey);
    }).map(function (m) { return normalizeInboxMessage(m, 'sent'); }).filter(function (m) {
      const key = makeInboxMessageKey(m);
      if (seen[key]) return false;
      seen[key] = true;
      return !!m.message;
    });
  }

  function clearBirthdayMessageLocalCache() {
    try {
      const today = getBirthdayMessageStorageKey();
      localStorage.removeItem(today);
      Object.keys(localStorage).forEach(function (key) {
        if (/^APJ_BIRTHDAY_MESSAGES_/.test(key)) localStorage.removeItem(key);
      });
    } catch (ignore) {}
  }

  function renderBirthdayInbox(isBirthday, name) {
    const currentName = name || (currentSession && (currentSession.name || currentSession.nama || currentSession.username)) || '';
    const messages = getInboxMessagesForCurrentUser(currentName);
    const sentMessages = getSentBirthdayMessagesForCurrentUser(currentName);
    if (messages.length) {
      const list = messages.slice().reverse().slice(0, 8).map(function (m) {
        const head = m.senderName || 'Rekan APJ';
        return '<div class="birthday-inbox-message"><b>' + esc(head) + '</b><p>' + esc(m.message || '') + '</p></div>';
      }).join('');
      html('birthdayInboxCard', '<div class="soft-row birthday-inbox-summary"><p class="row-title">Pesan untuk kamu</p><p class="row-sub">' + messages.length + ' ucapan tersimpan dari sheet.</p></div><div class="birthday-inbox-list">' + list + '</div>');
      return;
    }
    if (sentMessages.length) {
      const list = sentMessages.slice().reverse().slice(0, 8).map(function (m) {
        const target = m.targetName || m.namaUlangTahun || 'Karyawan APJ';
        return '<div class="birthday-inbox-message"><b>Untuk ' + esc(target) + '</b><p>' + esc(m.message || '') + '</p></div>';
      }).join('');
      html('birthdayInboxCard', '<div class="soft-row birthday-inbox-summary"><p class="row-title">Ucapan terkirim</p><p class="row-sub">' + sentMessages.length + ' ucapan tersimpan di sheet.</p></div><div class="birthday-inbox-list">' + list + '</div>');
      return;
    }
    if (!isBirthday) {
      html('birthdayInboxCard', '<div class="soft-row"><p class="row-title">Pesan masuk</p><p class="row-sub">Pesan ulang tahun akan muncul untuk karyawan yang sedang berulang tahun.</p></div>');
      return;
    }
    html('birthdayInboxCard', '<div class="soft-row"><p class="row-title">Pesan untuk kamu</p><p class="row-sub">Belum ada pesan masuk. Doa dari rekan APJ akan tampil di sini.</p></div>');
  }

  window.APJRefreshBirthdayInbox = function () {
    try { renderBirthdayInbox(homeBirthdayContext.isBirthday, homeBirthdayContext.name); } catch (e) { console.warn('[APJ birthday inbox refresh]', e); }
  };


  function scheduleHomeBirthdayNotice(isBirthday, name, calendar) {
    if (PAGE_MODE !== 'central') return;
    const rows = getTodayBirthdayRows(calendar, name, isBirthday);
    if (!rows.length) return;
    const key = getBirthdayNoticeStorageKey(isBirthday ? 'self' : 'others');
    if (localStorage.getItem(key) === 'shown') return;
    localStorage.setItem(key, 'shown');
    window.setTimeout(function () {
      if (isBirthday) showBirthdayCelebrationModal(name || 'Karyawan APJ');
      else showBirthdayReminderModal(rows);
    }, isBirthday ? 700 : 950);
  }

  function getTodayBirthdayRows(calendar, name, isBirthday) {
    const today = new Date().getDate();
    const rows = arr((calendar || {}).ulangTahun).filter(isCalendarRowToday).slice();
    if (isBirthday && !rows.some(function (r) { return normalizeNameKey(r.nama || r.label || r.Nama || '') === normalizeNameKey(name); })) {
      rows.unshift({ nama: name || 'Karyawan APJ' });
    }
    return dedupeBirthdayRows(rows);
  }

  function getBirthdayNoticeStorageKey(type) {
    const session = currentSession || {};
    const userKey = String(session.username || session.name || session.nama || 'user').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return 'APJ_BIRTHDAY_NOTICE_' + type + '_' + dateISO(new Date()) + '_' + userKey;
  }

  function showBirthdayReminderModal(rows) {
    const firstName = rows && rows.length ? (rows[0].nama || rows[0].label || rows[0].Nama || 'Rekan APJ') : 'Rekan APJ';
    const message = rows.length > 1
      ? esc(firstName) + ' dan ' + (rows.length - 1) + ' rekan APJ sedang berulang tahun.'
      : esc(firstName) + ' sedang berulang tahun.';
    const body = '<div class="birthday-popup-icon">🎂</div>' +
      '<h3>Ada yang ulang tahun hari ini!</h3>' +
      '<p><b>' + message + '</b><br>Yuk kirim ucapan dan doa terbaik.</p>' +
      '<div class="birthday-popup-actions"><button type="button" class="btn-primary" data-birthday-action="send">Kirim Ucapan</button><button type="button" class="btn-secondary" data-birthday-action="later">Nanti</button></div>';
    openHomeBirthdayModal(body, 'birthday-reminder');
  }

  function showBirthdayCelebrationModal(name) {
    const body = '<div class="birthday-party-stage" aria-hidden="true"><span>🎺</span><span>🎉</span><span>🎊</span><span>🎈</span><span>✨</span></div>' +
      '<div class="birthday-popup-icon is-party">🎂</div>' +
      '<h3>Selamat ulang tahun, ' + esc(name || 'Karyawan APJ') + '!</h3>' +
      '<p>Semoga sehat, bahagia, rezeki lancar, dan terus bertumbuh bersama APJ.<br><b>APJ - Solid, APJ - YES!</b></p>' +
      '<div class="birthday-popup-actions"><button type="button" class="btn-primary" data-birthday-action="thanks">Terima kasih</button></div>';
    openHomeBirthdayModal(body, 'birthday-celebration');
  }

  function openHomeBirthdayModal(innerHtml, mode) {
    closeHomeBirthdayModal();
    const modal = document.createElement('div');
    modal.className = 'home-birthday-modal is-open ' + (mode || '');
    modal.id = 'homeBirthdayModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="home-birthday-backdrop" data-birthday-action="close"></div><div class="home-birthday-dialog"><button type="button" class="home-birthday-close" aria-label="Tutup" data-birthday-action="close">×</button>' + innerHtml + '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (event) {
      const actionEl = event.target.closest('[data-birthday-action]');
      if (!actionEl) return;
      const action = actionEl.getAttribute('data-birthday-action');
      if (action === 'send') {
        closeHomeBirthdayModal();
        focusBirthdayMessageCard();
      } else {
        closeHomeBirthdayModal();
      }
    });
    document.addEventListener('keydown', handleHomeBirthdayModalKeydown);
  }

  function handleHomeBirthdayModalKeydown(event) {
    if (event.key === 'Escape') closeHomeBirthdayModal();
  }

  function closeHomeBirthdayModal() {
    const existing = document.getElementById('homeBirthdayModal');
    if (existing) existing.remove();
    document.removeEventListener('keydown', handleHomeBirthdayModalKeydown);
  }

  function focusBirthdayMessageCard() {
    const section = document.getElementById('dashboardBirthdaySection');
    const isBirthdayUser = !!(homeBirthdayContext && homeBirthdayContext.isBirthday);
    const card = document.getElementById(isBirthdayUser ? 'birthdayInboxCard' : 'birthdayMessageCard');
    if (section) section.classList.remove('hidden');
    if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const parent = card ? card.closest('.dashboard-birthday-card') : null;
    if (parent) {
      parent.classList.add('birthday-card-highlight');
      window.setTimeout(function () { parent.classList.remove('birthday-card-highlight'); }, 1600);
    }
  }

  function renderHomeDailyCards() {
    const user = getUserDataObject();
    const session = currentSession || {};
    const outlet = session.outlet || user.outlet || user.outletUtama || user['Outlet Utama'] || 'Belum diatur';
    const level = session.level || user.level || 'USER';
    const shift = user.shift || user.namaShift || user['Nama Shift'] || session.shift || 'Cek jadwal HR';
    html('homeStatusCard', '<div class="daily-status-grid"><div><span>Outlet</span><b>' + esc(outlet) + '</b></div><div><span>Level</span><b>' + esc(level) + '</b></div><div><span>Status Absen</span><b>Gunakan tombol Absen</b></div></div>');
    html('homeScheduleCard', '<div class="daily-list"><div><b>Hari ini</b><span>' + esc(shift) + '</span></div><div><b>Besok</b><span>Menunggu data jadwal</span></div><div><b>Catatan</b><span>Jadwal pribadi akan membaca ID_JADWAL.</span></div></div>');
    html('homeReminderCard', '<div class="daily-list reminder-list"><div><b>Briefing</b><span>Datang lebih awal dan ikuti briefing.</span></div><div><b>Absensi</b><span>Jangan lupa check in dan check out.</span></div><div><b>APJ</b><span>Jaga pelayanan, kebersihan, dan kerja sama.</span></div></div>');
  }

  function buildCentralFallbackCalendar(user, isBirthday, name) {
    const now = new Date();
    const today = now.getDate();
    const birthdayRows = isBirthday ? [{ day: today, month: now.getMonth() + 1, year: now.getFullYear(), tanggal: dateISOLocal(now), nama: name || 'Karyawan APJ' }] : [];
    return { tanggalMerah: [], pesanan: [], ulangTahun: birthdayRows, __viewKey: calendarViewKey(now) };
  }

  async function loadDashboardData(isManualRefresh) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('dashboardContent');
    if (loading && content) {
      loading.classList.remove('hidden');
      content.classList.add('hidden');
    }

    try {
      const [dashRes, stokRes, riwayatRes] = await Promise.allSettled([
        inventoryCall(actionName('dashboard', 'getDashboardData'), userPayload()),
        inventoryCall(actionName('stokAkhir', 'getStokAkhirReport'), userPayload({ limit: 5000 })),
        inventoryCall(actionName('riwayat', 'getRiwayatTransaksi'), userPayload({ limit: 250 }))
      ]);

      const dash = unpackSettled(dashRes, {});
      const stok = unpackSettled(stokRes, { data: [] });
      const riwayat = unpackSettled(riwayatRes, { data: [] });
      const data = normalizeDashboardData(dash, stok, riwayat, currentSession);
      renderDashboard(data);
      if (isManualRefresh) showToast('Dashboard sudah disegarkan.', 'success');
    } catch (error) {
      renderDashboardError(error);
    }
  }

  function actionName(key, fallback) {
    return (((window.APJ_CONFIG || {}).actions || {}).inventory || {})[key] || fallback;
  }

  function userPayload(extra) {
    return Object.assign({
      sessionToken: currentSession && currentSession.token,
      userName: currentSession && (currentSession.name || currentSession.username),
      username: currentSession && currentSession.username,
      level: currentSession && currentSession.level,
      outlet: currentSession && currentSession.outlet,
      permissions: currentSession && currentSession.permissions
    }, extra || {});
  }

  async function inventoryCall(action, payload) {
    if (window.APJApi && window.APJApi.inventory) return window.APJApi.inventory(action, payload || {});
    const cfg = window.APJ_CONFIG || {};
    const url = cfg.inventoryApiUrl || (cfg.apis && cfg.apis.inventory);
    if (!url) throw new Error('URL Inventory API belum diatur.');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(Object.assign({}, payload || {}, { action: action }))
    });
    return response.json();
  }

  function unpackSettled(result, fallback) {
    if (!result || result.status !== 'fulfilled') return fallback;
    const value = result.value || fallback;
    if (value && value.success === false) return fallback;
    return value;
  }

  function normalizeDashboardData(dash, stokRes, riwayatRes, session) {
    const stokRows = Array.isArray(stokRes.data) ? stokRes.data : (Array.isArray(stokRes.raw) ? stokRes.raw : []);
    const riwayatRows = Array.isArray(riwayatRes.data) ? riwayatRes.data : [];
    const today = dateISO(new Date());
    const todayRows = riwayatRows.filter(function (r) { return dateISO(r.tanggal || r.timestamp) === today; });
    const activeMenus = MENU_ITEMS.filter(function (m) { return menuAllowed(session, m); });
    const dashKpi = dash.kpi || {};

    const totalItem = Number(dashKpi.totalItem || stokRows.length || 0);
    const totalKategori = Number(dashKpi.totalKategori || unique(stokRows.map(function (r) { return r.kategori || r.Kategori || r['Kategori']; })).length || 0);
    const stokKosong = Number(dashKpi.stokKosong || dashKpi.habis || countByStatus(stokRows, ['HABIS', 'KOSONG']) || 0);
    const stokKritis = Number(dashKpi.stokKritis || dashKpi.menipis || countByStatus(stokRows, ['MENIPIS', 'KRITIS', 'WASPADA']) || 0);

    return {
      mode: isOwner(session) ? 'owner' : 'operator',
      today: formatDateHuman(new Date()),
      syncAt: dash.serverTime || dash.updatedAt || new Date().toLocaleString('id-ID'),
      kpi: {
        totalItem: totalItem,
        totalKategori: totalKategori,
        transaksiHariIni: todayRows.length,
        inputHariIni: countJenis(todayRows, ['Input', 'INPUT_STOK']),
        outputHariIni: countJenis(todayRows, ['Output', 'OUTPUT_STOK', 'Produk Outlet']),
        produksiHariIni: countJenis(todayRows, ['Produksi', 'PRODUKSI']),
        preparasiHariIni: countJenis(todayRows, ['Preparasi', 'PREPARASI']),
        transferHariIni: countJenis(todayRows, ['Transfer', 'TRANSFER_PRODUK']),
        stokKritis: stokKritis,
        stokKosong: stokKosong,
        aksesAktif: activeMenus.length,
        lokasiAktif: unique(riwayatRows.map(function (r) { return (r.lokasi || '') + ' ' + (r.outlet || ''); })).length || 1
      },
      categorySummary: buildCategorySummary(stokRows, dash.kategori || dash.categorySummary || []),
      criticalItems: buildCriticalItems(stokRows),
      topMovements: buildTopMovements(todayRows.length ? todayRows : riwayatRows),
      recentActivities: riwayatRows.slice(0, 12),
      locationSummary: buildLocationSummary(riwayatRows),
      quickMenus: getPageMenus(session, PAGE_MODE).map(function (m) { return Object.assign({}, m, { disabled: !menuAllowed(session, m) }); })
    };
  }

  function countByStatus(rows, statuses) {
    const set = statuses.map(function (s) { return s.toUpperCase(); });
    return rows.filter(function (r) {
      const status = String(r.status || r.Status || r['Status'] || '').toUpperCase();
      return set.some(function (s) { return status.indexOf(s) !== -1; });
    }).length;
  }

  function countJenis(rows, needles) {
    const low = needles.map(function (n) { return String(n).toLowerCase(); });
    return rows.filter(function (r) {
      const text = [r.jenis, r.modul, r.arah, r.keterangan].join(' ').toLowerCase();
      return low.some(function (n) { return text.indexOf(n.toLowerCase()) !== -1; });
    }).length;
  }

  function buildCategorySummary(stokRows, fallbackKategori) {
    const map = {};
    stokRows.forEach(function (r) {
      const kategori = r.kategori || r.Kategori || r['Kategori'] || 'Tanpa Kategori';
      if (!map[kategori]) map[kategori] = { kategori: kategori, totalItem: 0, totalStok: 0, kritis: 0, kosong: 0 };
      const qty = num(r.stokTersedia || r['Stok Akhir'] || r.stokAkhir || r.qty || 0);
      const status = String(r.status || r.Status || '').toUpperCase();
      map[kategori].totalItem += 1;
      map[kategori].totalStok += qty;
      if (status.indexOf('HABIS') !== -1 || status.indexOf('KOSONG') !== -1) map[kategori].kosong += 1;
      else if (status.indexOf('MENIPIS') !== -1 || status.indexOf('KRITIS') !== -1 || status.indexOf('WASPADA') !== -1) map[kategori].kritis += 1;
    });
    let out = Object.keys(map).map(function (k) { map[k].totalStok = round(map[k].totalStok); return map[k]; });
    if (!out.length && Array.isArray(fallbackKategori)) {
      out = fallbackKategori.map(function (r) {
        return { kategori: r['Nama Kategori'] || r.namaKategori || r.nama || r.kategori || '-', totalItem: 0, totalStok: 0, kritis: 0, kosong: 0 };
      });
    }
    return out.sort(function (a, b) { return (b.totalItem || 0) - (a.totalItem || 0); }).slice(0, 8);
  }

  function buildCriticalItems(stokRows) {
    return stokRows.map(function (r) {
      return {
        id: r.id || r.idItem || r['ID Item'] || '',
        nama: r.nama || r.namaItem || r['Nama Item'] || r.namaBarang || '-',
        kategori: r.kategori || r.Kategori || r['Kategori'] || '-',
        stok: num(r.stokTersedia || r.stokAkhir || r['Stok Akhir'] || 0),
        satuan: r.satuan || r.satuanStok || r['Satuan'] || r['Satuan Stok'] || '',
        status: r.status || r.Status || ''
      };
    }).filter(function (r) {
      const s = String(r.status || '').toUpperCase();
      return s.indexOf('HABIS') !== -1 || s.indexOf('KOSONG') !== -1 || s.indexOf('MENIPIS') !== -1 || s.indexOf('KRITIS') !== -1 || r.stok < 0;
    }).sort(function (a, b) { return a.stok - b.stok; }).slice(0, 8);
  }

  function buildTopMovements(rows) {
    const map = {};
    rows.forEach(function (r) {
      const id = r.idBarang || r.idItem || r['ID Item'] || r.namaBarang || r.nama || '-';
      const key = String(id);
      if (!map[key]) map[key] = { id: key, nama: r.namaBarang || r.nama || r['Nama Item'] || key, kategori: r.kategori || r.Kategori || '', qty: 0, jenis: r.jenis || r.modul || '' };
      map[key].qty += Math.abs(num(r.qty || r.qtyMasuk || r.qtyKeluar || r.qtyAdjust || 0));
    });
    return Object.keys(map).map(function (k) { map[k].qty = round(map[k].qty); return map[k]; }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 8);
  }

  function buildLocationSummary(rows) {
    const map = {};
    rows.forEach(function (r) {
      const lokasi = String(r.lokasi || r.outlet || 'PUSAT').trim() || 'PUSAT';
      if (!map[lokasi]) map[lokasi] = { lokasi: lokasi, totalTransaksi: 0, masuk: 0, keluar: 0 };
      map[lokasi].totalTransaksi += 1;
      map[lokasi].masuk += num(r.qtyMasuk || 0);
      map[lokasi].keluar += num(r.qtyKeluar || 0);
    });
    let out = Object.keys(map).map(function (k) { map[k].masuk = round(map[k].masuk); map[k].keluar = round(map[k].keluar); return map[k]; });
    if (!out.length) out = [{ lokasi:'PUSAT / OUTLET', totalTransaksi:0, masuk:0, keluar:0 }];
    return out.slice(0, 6);
  }

  function renderDashboard(data) {
    const loading = document.getElementById('loadingState');
    const content = document.getElementById('dashboardContent');
    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    setText('syncDate', 'Update: ' + (data.syncAt || data.today || '-'));

    const isOwnerMode = data.mode === 'owner';
    const meta = PAGE_META[PAGE_MODE] || PAGE_META.central;
    setText('modeBadge', isOwnerMode ? meta.badge + ' • Owner' : meta.badge);
    setText('modeDescription', isOwnerMode ? meta.descOwner : meta.descOperator);
    setText('quickMenuDesc', PAGE_MODE === 'central' ? 'Shortcut lintas modul. Modul belum aktif tetap ditandai jelas.' : (isOwnerMode ? 'Menu modul ini untuk owner/admin.' : 'Menu aktif mengikuti LEVEL_PERMISSION.'));

    renderKpis(data.kpi || {});
    renderCategories(data.categorySummary || []);
    renderMovements(data.topMovements || []);
    renderCriticalItems(data.criticalItems || []);
    renderActivities(data.recentActivities || []);
    renderLocations(data.locationSummary || []);
    renderQuickMenus(data.quickMenus || []);
    renderMiniActions(data.quickMenus || []);
    renderAgenda(data.recentActivities || []);
  }

  function renderKpis(k) {
    let mainCards;
    let miniCards;

    if (PAGE_MODE === 'central') {
      mainCards = [
        { label:'Inventory', value:k.totalItem || 0, suffix:'Item aktif', tone:'blue', trend:'Live' },
        { label:'Stok Prioritas', value:(k.stokKritis || 0) + (k.stokKosong || 0), suffix:'Perlu cek', tone:'amber', trend:'Inventory' },
        { label:'Absensi', value:'Siap', suffix:'Dashboard mandiri', tone:'sky', trend:'Fondasi' },
        { label:'Keuangan', value:'Siap', suffix:'Slot modul', tone:'emerald', trend:'Berikutnya' }
      ];
      miniCards = [
        { label:'Transaksi Stok', value:k.transaksiHariIni || 0, tone:'emerald' },
        { label:'Transfer', value:k.transferHariIni || 0, tone:'violet' },
        { label:'Menu Aktif', value:k.aksesAktif || 0, tone:'slate' },
        { label:'Sub Utama', value:3, tone:'blue' }
      ];
    } else if (PAGE_MODE === 'absensi') {
      mainCards = [
        { label:'Total Karyawan', value:k.totalKaryawan || 0, suffix:'Master karyawan', tone:'blue', trend:'Siap API' },
        { label:'Hadir', value:k.hadir || 0, suffix:'Hari ini', tone:'emerald', trend:'Live nanti' },
        { label:'Belum Absen', value:k.belumAbsen || 0, suffix:'Perlu follow-up', tone:'amber', trend:'HR' },
        { label:'Belum Checkout', value:k.belumCheckout || 0, suffix:'Pantau outlet', tone:'rose', trend:'HR' }
      ];
      miniCards = [
        { label:'Terlambat', value:k.terlambat || 0, tone:'amber' },
        { label:'Lembur', value:k.lembur || 0, tone:'violet' },
        { label:'Outlet', value:k.outletAktif || 5, tone:'sky' },
        { label:'Shift', value:k.shiftAktif || 0, tone:'slate' }
      ];
    } else {
      mainCards = [
        { label:'Total Item', value:k.totalItem || 0, suffix:'MASTER_ITEM', tone:'blue', trend:'Aktif' },
        { label:'Transaksi', value:k.transaksiHariIni || 0, suffix:'Hari ini', tone:'emerald', trend:'JURNAL_STOK' },
        { label:'Output', value:k.outputHariIni || 0, suffix:'Keluar/jual', tone:'rose', trend:'Operasional' },
        { label:'Stok Kritis', value:(k.stokKritis || 0) + (k.stokKosong || 0), suffix:'Perlu cek', tone:'amber', trend:'Prioritas' }
      ];
      miniCards = [
        { label:'Preparasi', value:k.preparasiHariIni || 0, tone:'amber' },
        { label:'Produksi', value:k.produksiHariIni || 0, tone:'amber' },
        { label:'Transfer', value:k.transferHariIni || 0, tone:'violet' },
        { label:'Menu Aktif', value:k.aksesAktif || 0, tone:'slate' }
      ];
    }

    html('kpiGrid', mainCards.map(function (card) {
      return '<div class="kpi-card tone-' + esc(card.tone) + '">' +
        '<div class="kpi-top"><div class="min-w-0"><p class="kpi-label">' + esc(card.label) + '</p><p class="text-xs mt-1" style="color:var(--muted)">' + esc(card.suffix) + '</p></div><div class="kpi-icon">' + iconForTone(card.tone) + '</div></div>' +
        '<div><div class="kpi-value"><strong>' + esc(formatNumber(card.value)) + '</strong></div><div class="kpi-footer"><span>' + esc(card.trend) + '</span><b>Live</b></div></div>' +
        '</div>';
    }).join(''));
    html('miniKpiGrid', miniCards.map(function (card) {
      return '<div class="mini-stat tone-' + esc(card.tone) + '"><div class="min-w-0"><p>' + esc(card.label) + '</p><strong>' + esc(formatNumber(card.value)) + '</strong></div><span class="flat-icon-sm">' + iconForTone(card.tone) + '</span></div>';
    }).join(''));
  }

  function renderCategories(rows) {
    if (!rows.length) return html('categoryList', emptyState('Belum ada ringkasan kategori.'));
    html('categoryList', rows.map(function (r) {
      const risk = Number(r.kritis || 0) + Number(r.kosong || 0);
      const tone = risk ? 'amber' : 'emerald';
      return '<div class="soft-row"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="row-title">' + esc(r.kategori || r.nama || '-') + '</p><p class="row-sub">' + esc(formatNumber(r.totalItem || 0)) + ' item • stok total ' + esc(formatNumber(r.totalStok || 0)) + '</p></div><span class="pill tone-' + tone + '">' + esc(formatNumber(risk)) + ' prioritas</span></div></div>';
    }).join(''));
  }

  function renderMovements(rows) {
    if (!rows.length) return html('movementList', emptyState('Belum ada pergerakan transaksi.'));
    html('movementList', rows.map(function (r) {
      return '<div class="soft-row"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="row-title">' + esc(r.nama || '-') + '</p><p class="row-sub">' + esc(r.kategori || r.jenis || '-') + '</p></div><span class="pill tone-blue">' + esc(formatNumber(r.qty || 0)) + '</span></div></div>';
    }).join(''));
  }

  function renderCriticalItems(rows) {
    if (!rows.length) return html('criticalList', emptyState('Stok kritis belum terdeteksi. Tetap cek fisik, jangan cuma percaya layar.'));
    html('criticalList', rows.map(function (r) {
      const tone = String(r.status || '').toUpperCase().indexOf('HABIS') !== -1 || Number(r.stok) <= 0 ? 'rose' : 'amber';
      return '<div class="soft-row"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="row-title">' + esc(r.nama || '-') + '</p><p class="row-sub">' + esc(r.kategori || '-') + ' • ' + esc(r.status || 'Perlu cek') + '</p></div><span class="pill tone-' + tone + '">' + esc(formatNumber(r.stok || 0)) + ' ' + esc(r.satuan || '') + '</span></div></div>';
    }).join(''));
  }

  function renderActivities(rows) {
    if (!rows.length) return html('activityList', emptyState('Belum ada aktivitas terbaru.'));
    html('activityList', rows.slice(0, 8).map(function (r) {
      const jenis = r.jenis || r.modul || '-';
      const tone = toneFromJenis(jenis);
      return '<div class="soft-row"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="row-title">' + esc(jenis) + ' • ' + esc(r.namaBarang || r.nama || r.idBarang || '-') + '</p><p class="row-sub">' + esc(r.tanggal || '') + ' • ' + esc(r.petugas || '-') + ' • ' + esc(r.outlet || r.lokasi || '') + '</p></div><span class="pill tone-' + tone + '">' + esc(formatNumber(r.qty || r.qtyMasuk || r.qtyKeluar || 0)) + '</span></div></div>';
    }).join(''));
  }

  function renderLocations(rows) {
    if (!rows.length) return html('locationList', emptyState('Belum ada data lokasi.'));
    html('locationList', rows.map(function (r) {
      return '<div class="soft-row"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="row-title">' + esc(r.lokasi || '-') + '</p><p class="row-sub">Masuk ' + esc(formatNumber(r.masuk || 0)) + ' • Keluar ' + esc(formatNumber(r.keluar || 0)) + '</p></div><span class="pill tone-slate">' + esc(formatNumber(r.totalTransaksi || 0)) + ' trx</span></div></div>';
    }).join(''));
  }

  function renderQuickMenus(menus) {
    const rows = menus.filter(function (m) { return !m.admin || isAdmin(currentSession); }).slice(0, 10);
    if (!rows.length) return html('quickMenuGrid', emptyState('Belum ada menu aktif.'));
    html('quickMenuGrid', rows.map(function (menu) {
      const disabled = !!menu.disabled;
      const coming = !!menu.comingSoon;
      const tag = disabled ? 'div' : 'a';
      const href = disabled ? '' : ' href="' + esc(menu.href) + '"';
      const suffix = coming ? ' • Segera' : (disabled ? ' 🔒' : '');
      return '<' + tag + href + ' class="soft-row quick-card ' + (disabled ? 'opacity-60 cursor-not-allowed' : '') + '"><div class="flex items-start gap-3"><span class="flat-icon-sm tone-' + esc(menu.tone || 'blue') + '">' + iconForTone(menu.tone || 'blue') + '</span><div class="min-w-0"><p class="row-title">' + esc(menu.label || '-') + suffix + '</p><p class="row-sub clamp-1">' + esc(menu.desc || '') + '</p></div></div></' + tag + '>';
    }).join(''));
  }

  function renderMiniActions(menus) {
    const visible = menus.filter(function (m) { return !m.disabled && m.href !== 'dashboard.html'; }).slice(0, 4);
    html('quickActionMini', visible.map(function (menu) {
      return '<a href="' + esc(menu.href) + '" class="pill" style="background:var(--surface-solid);border-color:var(--border);color:var(--text);box-shadow:var(--shadow-soft)">' + esc(menu.label) + '</a>';
    }).join(''));
  }

  function renderAgenda(rows) {
    const today = dateISO(new Date());
    const list = rows.filter(function (r) { return dateISO(r.tanggal || r.timestamp) === today; }).slice(0, 4);
    if (!list.length) return html('agendaList', emptyState('Belum ada agenda dari transaksi hari ini.'));
    html('agendaList', '<div class="list-stack">' + list.map(function (r, idx) {
      return '<div class="soft-row"><p class="row-title">' + esc(timeFromText(r.timestamp) || agendaTime(idx)) + ' • ' + esc(r.jenis || r.modul || 'Aktivitas') + '</p><p class="row-sub">' + esc(r.namaBarang || r.keterangan || '-') + '</p></div>';
    }).join('') + '</div>');
  }

  function renderMiniCalendar() {
    const el = document.getElementById('calendarGrid');
    if (!el) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    setText('calendarMonth', now.toLocaleDateString('id-ID', { month:'long', year:'numeric' }));
    const labels = ['S','S','R','K','J','S','M'];
    let cells = labels.map(function (d) { return '<div class="calendar-cell calendar-label">' + d + '</div>'; }).join('');
    for (let i = 0; i < start; i++) cells += '<div class="calendar-cell muted"></div>';
    for (let d = 1; d <= days; d++) cells += '<div class="calendar-cell ' + (d === today ? 'today' : '') + '">' + d + '</div>';
    el.innerHTML = cells;
  }

  function renderDashboardError(error) {
    const message = error && error.message ? error.message : 'Gagal memuat dashboard.';
    const loading = document.getElementById('loadingState');
    if (loading) loading.innerHTML = '<div class="text-rose-500 font-extrabold mb-1">Dashboard gagal dimuat.</div><div class="text-xs" style="color:var(--muted)">' + esc(message) + '</div>';
    showToast('Gagal memuat dashboard. Cek deploy Code.gs Inventory V3.', 'error');
  }

  function hasAnyPermission(session, keys) {
    if (!keys || !keys.length) return true;
    if (isOwner(session)) return true;
    if (keys.indexOf('admin') !== -1 && isAdmin(session)) return true;
    const perms = (session && session.permissions) || {};
    return keys.some(function (key) {
      return boolPerm(perms[key]) || boolPerm(perms[normalizePermission(key)]) || boolPerm(perms[String(key).toUpperCase()]);
    });
  }

  function menuAllowed(session, menu) { if (menu && menu.comingSoon) return false; return hasAnyPermission(session, menu.permission || []); }
  function isOwner(session) { return ['OWNER','SUPERADMIN','SUPER ADMIN'].indexOf(String(session && session.level || '').trim().toUpperCase()) !== -1; }
  function isAdmin(session) { return isOwner(session) || ['SUPERVISOR'].indexOf(String(session && session.level || '').trim().toUpperCase()) !== -1; }
  function boolPerm(v) { if (v === true) return true; if (typeof v === 'number') return v > 0; const s = String(v || '').toUpperCase(); return ['Y','YA','YES','TRUE','1','AKTIF'].indexOf(s) !== -1; }
  function normalizePermission(v) { return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

  function bindSidebarInteractions() {
    const sidebarToggle = document.querySelector('[data-sidebar-collapse]');
    if (sidebarToggle && sidebarToggle.dataset.bound !== 'Y') {
      sidebarToggle.dataset.bound = 'Y';
      sidebarToggle.addEventListener('click', toggleSidebarCollapse);
    }
    document.querySelectorAll('#dashboardSidebarMenu [data-coming-soon-menu]').forEach(function (link) {
      if (link.dataset.boundSoon === 'Y') return;
      link.dataset.boundSoon = 'Y';
      link.addEventListener('click', function (event) {
        event.preventDefault();
        showToast((link.getAttribute('data-coming-soon-menu') || 'Menu ini') + ' sedang disiapkan. Struktur tempatnya sudah aman.', 'info');
      });
    });
    document.querySelectorAll('#dashboardSidebarMenu [data-menu-toggle]').forEach(function (button) {
      if (button.dataset.bound === 'Y') return;
      button.dataset.bound = 'Y';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        if (document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('sidebar-collapsed')) return;
        toggleDashboardMenuGroup(button.getAttribute('data-menu-toggle'));
      });
    });
    applySidebarState();
  }

  function initMenuGroups() {
    const saved = safeParseJSON(localStorage.getItem(MENU_GROUP_KEY) || '{}');
    document.querySelectorAll('#dashboardSidebarMenu [data-menu-group]').forEach(function (group) {
      const key = group.getAttribute('data-menu-group');
      const shouldOpen = typeof saved[key] === 'boolean' ? saved[key] : group.classList.contains('open');
      setDashboardMenuGroup(group, shouldOpen);
    });
  }

  function setDashboardMenuGroup(group, open) {
    if (!group) return;
    group.classList.toggle('open', !!open);
    const button = group.querySelector('.nav-group-toggle');
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleDashboardMenuGroup(key) {
    const group = document.querySelector('#dashboardSidebarMenu [data-menu-group="' + cssEscape(key) + '"]');
    if (!group) return;
    const next = !group.classList.contains('open');
    setDashboardMenuGroup(group, next);
    const saved = safeParseJSON(localStorage.getItem(MENU_GROUP_KEY) || '{}');
    saved[key] = next;
    localStorage.setItem(MENU_GROUP_KEY, JSON.stringify(saved));
  }

  function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  function setSidebarCollapsed(collapsed) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const active = !!collapsed && window.innerWidth >= 1024;
    sidebar.classList.toggle('sidebar-collapsed', active);
    document.body.classList.toggle('sidebar-collapsed-active', active);
  }

  function applySidebarState() { setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === 'true'); }

  function toggleSidebarCollapse(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || window.innerWidth < 1024) return;
    const next = !sidebar.classList.contains('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_KEY, next ? 'true' : 'false');
    setSidebarCollapsed(next);
  }

  function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(function () {
      modal.querySelector('.modal-overlay')?.classList.remove('opacity-0');
      modal.querySelector('.modal-content')?.classList.remove('opacity-0', 'scale-95');
    });
  }

  function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    modal.querySelector('.modal-overlay')?.classList.add('opacity-0');
    modal.querySelector('.modal-content')?.classList.add('opacity-0', 'scale-95');
    setTimeout(function () { modal.classList.add('hidden'); }, 160);
  }

  async function executeLogout() {
    try { if (window.APJApi && window.APJApi.logout) await window.APJApi.logout(); } catch (e) {}
    if (window.APJAuth && window.APJAuth.logout) window.APJAuth.logout();
    else {
      localStorage.clear();
      window.location.href = (window.APJ_CONFIG && window.APJ_CONFIG.loginPage) || 'index.html';
    }
  }

  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { closeMobileSidebar(); closeLogoutModal(); } });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1024) closeMobileSidebar(); applySidebarState(); });

  function showToast(message, type) {
    if (window.APJToast) {
      const method = type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info';
      window.APJToast[method](message || '-');
      return;
    }
    const toast = document.getElementById('customToast');
    const msg = document.getElementById('toastMessage');
    if (msg) msg.textContent = message || '-';
    if (toast) { toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 3200); }
  }

  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value == null ? '' : String(value); }
  function html(id, value) { const el = document.getElementById(id); if (el) el.innerHTML = value || ''; }
  function safeParseJSON(text) { try { return text ? JSON.parse(text) : {}; } catch (e) { return {}; } }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (ch) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]; }); }
  function num(value) { if (typeof value === 'number') return Number.isFinite(value) ? value : 0; let s = String(value == null ? '' : value).trim().replace(/\s/g, ''); if (!s) return 0; const comma = s.lastIndexOf(','), dot = s.lastIndexOf('.'); if (comma !== -1 && dot !== -1) s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); else if (comma !== -1) s = s.replace(',', '.'); const n = parseFloat(s); return Number.isFinite(n) ? n : 0; }
  function round(n) { return Math.round((Number(n) || 0) * 1000000) / 1000000; }
  function unique(arr) { const seen = {}; return (arr || []).map(function (x) { return String(x || '').trim(); }).filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; }); }
  function formatNumber(value) { const n = Number(value || 0); if (!Number.isFinite(n)) return String(value || 0); return new Intl.NumberFormat('id-ID').format(n); }
  function formatDateHuman(date) { return date.toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }); }
  function dateISO(value) { if (!value) return ''; if (Object.prototype.toString.call(value) === '[object Date]') return dateISOLocal(value); const s = String(value); const iso = s.match(/\d{4}-\d{2}-\d{2}/); if (iso) return iso[0]; const dmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/); if (dmy) return String(dmy[3]).padStart(4, '20') + '-' + String(dmy[2]).padStart(2, '0') + '-' + String(dmy[1]).padStart(2, '0'); return ''; }
  function dateISOLocal(value) { const d = (Object.prototype.toString.call(value) === '[object Date]') ? value : new Date(value); if (!d || isNaN(d.getTime())) return ''; return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function emptyState(text) { return '<div class="soft-row"><p class="row-sub">' + esc(text) + '</p></div>'; }
  function toneFromJenis(jenis) { const j = String(jenis || '').toLowerCase(); if (j.includes('input')) return 'emerald'; if (j.includes('output') || j.includes('terjual')) return 'rose'; if (j.includes('preparasi')) return 'amber'; if (j.includes('produksi')) return 'amber'; if (j.includes('transfer')) return 'violet'; if (j.includes('opname')) return 'blue'; return 'slate'; }
  function timeFromText(value) { const m = String(value || '').match(/\b(\d{1,2}:\d{2})\b/); return m ? m[1] : ''; }
  function agendaTime(idx) { return ['09:00','11:30','14:00','16:00'][idx] || '--:--'; }
  function cssEscape(value) { if (window.CSS && window.CSS.escape) return window.CSS.escape(value); return String(value || '').replace(/"/g, '\\"'); }

  function iconForTone(tone) {
    if (tone === 'emerald') return iconBox();
    if (tone === 'rose') return iconArrowDown();
    if (tone === 'amber') return iconWarning();
    if (tone === 'violet') return iconTransfer();
    if (tone === 'sky') return iconStore();
    if (tone === 'slate') return iconGrid();
    return iconChart();
  }
  function iconChart(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 19V5m4 14v-7m4 7V8m4 11v-4m4 4H4"/></svg>'; }
  function iconBox(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7.2 12 12l8.7-4.8M12 22V12"/></svg>'; }
  function iconArrowDown(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v14m0 0 5-5m-5 5-5-5M5 21h14"/></svg>'; }
  function iconWarning(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01"/></svg>'; }
  function iconTransfer(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3"/></svg>'; }
  function iconStore(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10h16M6 10v10h12V10M8 10V6a4 4 0 0 1 8 0v4M9 15h2m2 0h2"/></svg>'; }
  function iconGrid(){ return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>'; }

  Object.assign(window, {
    openMobileSidebar: openMobileSidebar,
    closeMobileSidebar: closeMobileSidebar,
    toggleSidebarCollapse: toggleSidebarCollapse,
    toggleDashboardMenuGroup: toggleDashboardMenuGroup,
    showLogoutModal: showLogoutModal,
    closeLogoutModal: closeLogoutModal,
    executeLogout: executeLogout
  });
})();
