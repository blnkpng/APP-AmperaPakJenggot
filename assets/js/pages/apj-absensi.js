/* APJ HR ABSENSI V221 - silent status sync fix: status string safe */
(function(){
  'use strict';

  const APJ_GUIDE_VERSION = 'V42';
  function apjGuideUserKey() {
    const raw = localStorage.getItem('APJ_USER_USERNAME') || localStorage.getItem('APJ_USER_ID') || localStorage.getItem('APJ_USER_NAME') || 'guest';
    return String(raw || 'guest').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || 'guest';
  }
  function apjGuideSeenKey(pageKey) {
    return 'APJ_GUIDE_SEEN_' + APJ_GUIDE_VERSION + '::' + apjGuideUserKey() + '::' + String(pageKey || location.pathname.split('/').pop() || 'page').toLowerCase();
  }
  function apjHasSeenGuide(pageKey) {
    try { return localStorage.getItem(apjGuideSeenKey(pageKey)) === 'true'; } catch (err) { return false; }
  }
  function apjMarkGuideSeen(pageKey) {
    try { localStorage.setItem(apjGuideSeenKey(pageKey), 'true'); } catch (err) {}
  }


  var state = {
    session: null,
    user: null,
    outlets: [],
    jadwal: null,
    riwayat: null,
    stream: null,
    bootstrapOk: false,
    position: null,
    outletAktif: null,
    foto: '',
    busy: false
  };

  function $(id){ return document.getElementById(id); }
  function cfg(){ return window.APJ_CONFIG || {}; }
  function apiUrl(){ return cfg().absensiApiUrl || (cfg().apis && cfg().apis.absensi) || ''; }
  function toast(type, message){
    var kind = type || 'info';
    var msg = message || '-';
    // V125: Absensi memakai satu jalur notifikasi saja.
    // Sebelumnya APJToast + floating notice tampil bersamaan sehingga notifikasi sukses jadi dobel.
    showAbsensiNotice(kind, msg);
  }
  function showAbsensiNotice(type, message){
    var id = 'absensiFloatingNotice';
    var box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div');
      box.id = id;
      box.style.cssText = 'position:fixed;z-index:99999;left:50%;top:22px;transform:translateX(-50%);max-width:min(92vw,520px);padding:16px 20px;border-radius:22px;font-weight:900;font-size:15px;line-height:1.35;box-shadow:0 18px 45px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.25);opacity:0;pointer-events:none;transition:opacity .2s ease, transform .2s ease;';
      document.body.appendChild(box);
    }
    var bg = type === 'success' ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : type === 'error' ? 'linear-gradient(135deg,#ef4444,#f43f5e)' : type === 'warning' ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'linear-gradient(135deg,#2563eb,#06b6d4)';
    box.style.background = bg;
    box.style.color = '#fff';
    box.textContent = message || '-';
    box.style.opacity = '1';
    box.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(window.__absensiNoticeTimer);
    window.__absensiNoticeTimer = setTimeout(function(){
      box.style.opacity = '0';
      box.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 4200);
  }
  function escapeHtml(v){ return String(v == null ? '' : v).replace(/[&<>'"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]; }); }
  function setText(id, text){ var el = $(id); if (el) el.textContent = text == null || text === '' ? '-' : String(text); }
  function setPill(kind, text){ var el = $('absStatusPill'); if (!el) return; el.className = 'absensi-status-pill' + (kind ? ' is-' + kind : ''); el.textContent = text || '-'; }
  function setLocation(kind, main, sub){ var el = $('absLocationCard'); if (el) el.className = 'absensi-location-card' + (kind ? ' is-' + kind : ''); setText('absLocationStatus', main); setText('absLocationDetail', sub); }
  function withSessionPayload(extra){
    extra = extra || {};
    var s = state.session || (window.APJAuth ? APJAuth.getSession() : {});
    return Object.assign({
      username: s.username || '',
      nama: s.name || '',
      name: s.name || '',
      level: s.level || '',
      outletUser: s.outlet || '',
      outletAkses: s.outletAccess || '',
      sessionToken: s.token || '',
      device: navigator.userAgent || ''
    }, extra);
  }
  async function hr(action, payload){
    if (!apiUrl()) throw new Error('URL API HR Absensi belum diatur di assets/js/apj-config.js');
    return APJApi.absensi(action, withSessionPayload(payload || {}));
  }

  function initUser(){
    if (window.APJAuth && !APJAuth.requireLogin()) return false;
    state.session = window.APJAuth ? APJAuth.getSession() : {};
    var name = state.session.name || state.session.username || 'Pengguna';
    setText('absUserName', name);
    setText('absUserMeta', (state.session.level || '-') + (state.session.outlet ? ' • ' + state.session.outlet : ''));
    setText('absNamaKaryawan', name);
    var initial = name.trim().charAt(0).toUpperCase() || 'U';
    setText('absUserInitial', initial);
    setText('displayNama', name);
    setText('displayLevel', state.session.level || '--');
    setText('displayInisial', initial);
    return true;
  }

  function fallbackOutlets(){
    return [
      { outlet:'Lahor', kodeOutlet:'LAHOR', latitude:-7.86850534205165, longitude:112.519032001227, radius:300 },
      { outlet:'Senisono', kodeOutlet:'SENISONO', latitude:-7.87304515981674, longitude:112.527518123377, radius:300 },
      { outlet:'Pujon', kodeOutlet:'PUJON', latitude:-7.84242427980118, longitude:112.467381656164, radius:300 },
      { outlet:'Ngujung', kodeOutlet:'NGUJUNG', latitude:-7.864311319138, longitude:112.551075324804, radius:300 },
      { outlet:'Pokopek', kodeOutlet:'POKOPEK', latitude:-7.8921488777071, longitude:112.541366526741, radius:300 }
    ];
  }

  async function loadBootstrap(){
    try{
      var res = await hr('getAbsensiBootstrap', {});
      if (!res || !(res.sukses || res.success)) throw new Error((res && res.pesan) || 'Bootstrap gagal');
      state.bootstrapOk = true;
      state.user = res.user || null;
      state.outlets = normalizeOutlets(res.outlets || []);
      state.jadwal = res.jadwal || null;
      var bootRiwayat = extractRiwayat(res) || extractRiwayat(res.riwayat) || extractRiwayat(res.data);
      if (hasAbsensiData(bootRiwayat)) state.riwayat = bootRiwayat;
      else { state.riwayat = null; clearRiwayatCache(); }
      if (!state.outlets.length) state.outlets = fallbackOutlets();
      applyBootstrap();
    }catch(err){
      state.bootstrapOk = false;
      state.user = {
        username: state.session.username || '',
        nama: state.session.name || state.session.username || '',
        level: state.session.level || '',
        outlet: state.session.outlet || '',
        outletAkses: state.session.outletAccess || state.session.outlet || ''
      };
      state.outlets = fallbackOutlets();
      setPill('warning', 'Sinkronisasi ulang');
      setLocation('warning', 'Data absensi belum tersinkron', 'Klik Refresh Lokasi setelah koneksi atau backend siap.');
      toast('warning', 'Data absensi belum tersinkron. Pastikan Code.gs HR sudah versi terbaru dan Web App sudah dideploy ulang.');
      applyRiwayat(null);
    }
  }

  function normalizeOutlets(rows){
    return (rows || []).map(function(o){
      return {
        outlet: o.outlet || o.OUTLET || o.nama || o.Nama || '',
        kodeOutlet: o.kodeOutlet || o.KODE_OUTLET || o.kode || o.Kode || '',
        latitude: Number(o.latitude || o.LATITUDE || o.lat || o.Lat || 0),
        longitude: Number(o.longitude || o.LONGITUDE || o.longtitude || o.LONGTITUDE || o.lng || o.lon || 0),
        radius: Number(o.radius || o.RADIUS || 100)
      };
    }).filter(function(o){ return o.outlet && o.latitude && o.longitude; });
  }

  function applyBootstrap(){
    var user = state.user || {};
    var name = user.nama || state.session.name || state.session.username || '-';
    setText('absUserName', name);
    setText('absNamaKaryawan', name);
    setText('absUserMeta', (user.level || state.session.level || '-') + (user.outlet ? ' • ' + user.outlet : ''));
    var initial = name.trim().charAt(0).toUpperCase() || 'U';
    setText('absUserInitial', initial);
    setText('displayNama', name);
    setText('displayLevel', user.level || state.session.level || '--');
    setText('displayInisial', initial);
    applyJadwal();
    setRiwayatSafe(state.riwayat, 'bootstrap');
  }

  function applyJadwal(){
    var jadwalText = '-';
    if (state.jadwal && (state.jadwal.jamMasuk || state.jadwal.jamPulang)) {
      jadwalText = (state.jadwal.jamMasuk || '-') + ' - ' + (state.jadwal.jamPulang || '-');
      if (state.jadwal.toleransiMenit !== undefined && state.jadwal.toleransiMenit !== null && String(state.jadwal.toleransiMenit) !== '') jadwalText += ' • Toleransi ' + state.jadwal.toleransiMenit + ' menit';
    } else if (state.jadwal && state.jadwal.isLibur) {
      jadwalText = 'LIBUR';
    }
    setText('shiftNama', state.jadwal && state.jadwal.shift ? state.jadwal.shift : '-');
    setText('shiftJam', jadwalText);
  }

  function cleanTime(value){
    var s = String(value == null ? '' : value).trim();
    if (!s || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
    return s;
  }
  function minutesLabel(value){
    var n = Number(value || 0);
    if (n === null || isNaN(n) || n < 0) return '-';
    n = Math.round(n);
    var h = Math.floor(n / 60);
    var m = Math.round(n % 60);
    return h + ' jam ' + m + ' menit';
  }
  function hoursLabel(value){
    var n = Number(String(value == null ? 0 : value).replace(',', '.') || 0);
    if (!n || n < 0) return '-';
    var rounded = Math.round(n * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return Math.round(rounded) + ' jam';
    return String(rounded).replace('.', ',') + ' jam';
  }
  function overtimeLabel(data){
    data = data || {};
    if (data.totalLemburJam !== undefined && data.totalLemburJam !== null && String(data.totalLemburJam) !== '') return hoursLabel(data.totalLemburJam);
    var paidMinutes = Number(data.totalLemburMenit || 0);
    return paidMinutes >= 60 ? hoursLabel(Math.floor(paidMinutes / 60)) : '-';
  }
  function hasAbsensiData(data){
    if (!data) return false;
    return !!cleanTime(data.jamMasuk || data.masuk || data.jamPulang || data.pulang || '');
  }
  function extractRiwayat(res){
    if (!res) return null;
    // V221: jangan anggap field status string (mis. "Sudah Check In" / "success") sebagai object riwayat.
    // Bug sebelumnya membuat fallback lokal setelah check-in dianggap invalid sehingga jam masuk tidak tampil.
    if (res.data && typeof res.data === 'object') return res.data;
    if (res.riwayat && typeof res.riwayat === 'object') return res.riwayat;
    if (res.status && typeof res.status === 'object') return res.status;
    if (res.absensi && typeof res.absensi === 'object') return res.absensi;
    if (res.record && typeof res.record === 'object') return res.record;
    if (res.row && typeof res.row === 'object') return res.row;
    if (res.exists === false && !hasAbsensiData(res)) return null;
    if (hasAbsensiData(res)) return res;
    return null;
  }
  function sleep(ms){ return new Promise(function(resolve){ setTimeout(resolve, ms); }); }

  function absensiCacheKey(){
    var s = state.session || {};
    var user = (state.user && state.user.username) || s.username || s.name || 'user';
    var d = new Date();
    var keyDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    return 'APJ_ABSENSI_STATUS_' + String(user).toLowerCase().replace(/[^a-z0-9_-]+/g,'_') + '_' + keyDate;
  }
  function saveRiwayatCache(data){
    // APP-V.4.3 ABSENSI SHEET SOURCE FIX:
    // Cache hanya untuk optimistic display sesaat setelah klik Check In/Out.
    // LocalStorage lama tidak lagi dipakai sebagai sumber data absensi, karena sumber final wajib Sheet.
    try{
      if (hasAbsensiData(data)) sessionStorage.setItem(absensiCacheKey(), JSON.stringify({ savedAt: Date.now(), data: data }));
    }catch(e){}
  }
  function clearRiwayatCache(){
    try{ sessionStorage.removeItem(absensiCacheKey()); }catch(e){}
    try{ localStorage.removeItem(absensiCacheKey()); }catch(e){}
  }
  function clearLegacyAbsensiCaches(){
    // Bersihkan cache status lama lintas versi supaya data yang sudah dihapus dari Sheet tidak tetap tampil.
    try{
      var prefixes = ['APJ_ABSENSI_STATUS_'];
      [sessionStorage, localStorage].forEach(function(store){
        for (var i = store.length - 1; i >= 0; i--) {
          var key = store.key(i) || '';
          if (prefixes.some(function(prefix){ return key.indexOf(prefix) === 0; })) store.removeItem(key);
        }
      });
    }catch(e){}
  }
  function loadRiwayatCache(){
    // Tidak dipakai untuk bootstrap/refresh normal. Hanya fallback optimistic beberapa detik setelah submit.
    try{
      var raw = sessionStorage.getItem(absensiCacheKey());
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var savedAt = Number(parsed.savedAt || 0);
      var data = parsed.data || parsed;
      if (!savedAt || Date.now() - savedAt > 15000) return null;
      return hasAbsensiData(data) ? data : null;
    }catch(e){ return null; }
  }
  function setRiwayatSafe(data, source){
    var latest = extractRiwayat(data);
    if (hasAbsensiData(latest)) {
      state.riwayat = latest;
      saveRiwayatCache(latest);
      applyRiwayat(state.riwayat);
      return true;
    }
    // Jika backend/Sheet tidak mengirim riwayat, tampilan harus kosong. Jangan tampilkan cache lama.
    state.riwayat = null;
    clearRiwayatCache();
    applyRiwayat(null);
    return false;
  }

  function applyRiwayat(data){
    data = data || {};
    if (data.jadwal) { state.jadwal = data.jadwal; applyJadwal(); }
    var masuk = cleanTime(data.jamMasuk || data.masuk || '');
    var pulang = cleanTime(data.jamPulang || data.pulang || '');
    var statusMasuk = cleanTime(data.statusMasuk || '');
    var statusPulang = cleanTime(data.statusPulang || '');
    var status = cleanTime(data.status || '');
    if (!status) status = masuk ? (pulang ? (statusPulang || 'Selesai') : (statusMasuk || 'Sudah Check In')) : 'Belum Absen';
    var late = Number(data.terlambatMenit || data.terlambat || 0);
    setText('histTanggal', data.tanggal || new Date().toLocaleDateString('id-ID'));
    setText('histMasuk', masuk || '-');
    setText('histPulang', pulang || '-');
    setText('histStatus', status);
    setText('histLate', late > 0 ? (late + ' menit') : (masuk && statusMasuk && statusMasuk.toUpperCase().indexOf('TERLAMBAT') === -1 ? '0 menit' : '-'));
    setText('histWork', data.totalKerjaBersih || minutesLabel(data.totalKerjaBersihMenit || data.totalKerjaMenit || 0));
    setText('histOvertime', overtimeLabel(data));
    updateButtons(Object.assign({}, data, { jamMasuk: masuk, masuk: masuk, jamPulang: pulang, pulang: pulang }));
  }


  function updateButtons(data){
    data = data || {};
    var masuk = cleanTime(data.jamMasuk || data.masuk || '');
    var pulang = cleanTime(data.jamPulang || data.pulang || '');
    var btnIn = $('btnCheckIn');
    var btnOut = $('btnCheckOut');
    if (!btnIn || !btnOut) return;
    btnIn.disabled = !!masuk || state.busy;
    btnOut.disabled = !masuk || !!pulang || state.busy;
  }


  function distance(lat1, lon1, lat2, lon2){
    var R = 6371000;
    var dLat = (lat2-lat1) * Math.PI/180;
    var dLon = (lon2-lon1) * Math.PI/180;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function nearestOutlet(lat, lng){
    var best = null, dist = Infinity;
    (state.outlets.length ? state.outlets : fallbackOutlets()).forEach(function(o){
      var d = distance(lat, lng, o.latitude, o.longitude);
      if (d < dist){ dist = d; best = Object.assign({}, o, { jarak: Math.round(d) }); }
    });
    return best;
  }

  function isBypass(){
    var username = String(state.session.username || '').toLowerCase();
    var name = String(state.session.name || '').toLowerCase();
    var level = String((state.user && state.user.level) || state.session.level || '').toUpperCase();
    return username === 'anandaarifp' || name === 'ananda arif putra' || level === 'OWNER' || level === 'SUPERADMIN';
  }

  function norm(v){ return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function isAllToken(v){
    var t = norm(v).replace(/\s+/g, '');
    return t === 'all' || t === 'semua' || t === 'semuaoutlet';
  }
  function jadwalOutletTokens(){
    var j = state.jadwal || {};
    var raw = [j.aksesOutletAbsensi, j.jadwalOutlet, j.outlet].filter(Boolean).join(',');
    return raw.split(/[;,|]/).map(norm).filter(Boolean);
  }
  function canUseOutlet(outlet){
    if (isBypass()) return true;
    var tokens = jadwalOutletTokens();
    if (!tokens.length) return false;
    if (tokens.some(isAllToken)) return true;
    var aliases = [outlet && outlet.outlet, outlet && outlet.kodeOutlet].map(norm).filter(Boolean);
    return tokens.some(function(t){ return aliases.indexOf(t) !== -1; });
  }
  function jadwalAccessLabel(){
    var tokens = jadwalOutletTokens();
    if (!tokens.length) return 'jadwal belum tersedia';
    if (tokens.some(isAllToken)) return 'semua outlet';
    return tokens.join(', ');
  }

  function getLocation(){
    setPill('warning', 'Mencari GPS...');
    setLocation('warning', 'Mencari lokasi', 'Pastikan GPS aktif dan izin lokasi diberikan.');
    if (!navigator.geolocation){
      setPill('danger', 'GPS tidak didukung');
      setLocation('danger', 'GPS tidak didukung', 'Browser perangkat ini belum mendukung geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(function(pos){
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      state.position = { latitude: lat, longitude: lng };
      state.outletAktif = nearestOutlet(lat, lng);
      var o = state.outletAktif;
      if (!o){
        setPill('danger', 'Outlet tidak ditemukan');
        setLocation('danger', 'Outlet tidak ditemukan', 'Data outlet belum tersedia. Silakan refresh lokasi atau hubungi admin.');
        return;
      }
      setText('absOutletBadge', 'Outlet: ' + o.outlet);
      var accessOk = canUseOutlet(o);
      var radius = Number(o.radius || 300);
      if (!state.bootstrapOk) {
        var fallbackInside = o.jarak <= radius || isBypass();
        setPill(fallbackInside ? 'warning' : 'danger', fallbackInside ? 'Menunggu sinkron' : 'Di luar radius');
        setLocation(fallbackInside ? 'warning' : 'danger', o.outlet + ' • ' + o.jarak + ' meter', 'Radius sementara: ' + radius + ' meter. Refresh lokasi setelah data user tersinkron.');
        return;
      }
      var inside = (o.jarak <= radius && accessOk) || isBypass();
      var reason = !accessOk ? 'Outlet tidak sesuai jadwal absensi' : 'Di luar radius';
      setPill(inside ? 'ready' : 'danger', inside ? 'Siap Absen' : reason);
      setLocation(inside ? 'ready' : 'danger', o.outlet + ' • ' + o.jarak + ' meter', 'Radius diizinkan: ' + radius + ' meter' + (isBypass() ? ' • Owner bypass aktif' : (!accessOk ? ' • Jadwal: ' + jadwalAccessLabel() : '')));
    }, function(err){
      setPill('danger', 'GPS tidak aktif');
      setLocation('danger', 'GPS tidak aktif', err && err.message ? err.message : 'Izinkan akses lokasi dari browser.');
    }, { enableHighAccuracy:true, timeout:12000, maximumAge:0 });
  }

  async function startCamera(){
    var video = $('absCamera');
    var wrap = video && video.closest('.absensi-camera-wrap');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      if ($('absCameraPlaceholder')) $('absCameraPlaceholder').textContent = 'Kamera tidak didukung browser ini.';
      return;
    }
    try{
      state.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
      video.srcObject = state.stream;
      if (wrap) wrap.classList.add('is-live');
    }catch(err){
      if ($('absCameraPlaceholder')) $('absCameraPlaceholder').textContent = 'Gagal mengakses kamera. Izinkan kamera dari browser.';
      toast('warning', 'Kamera belum aktif. Izinkan kamera dari browser.');
    }
  }

  function flash(){
    var f = document.createElement('div');
    f.className = 'absensi-flash';
    document.body.appendChild(f);
    setTimeout(function(){ f.remove(); }, 320);
  }

  async function countdown(){
    var overlay = $('absCountdown');
    var number = $('absCountdownNumber');
    if (!overlay || !number) return;
    overlay.classList.add('is-show');
    for (var i=3;i>=1;i--){
      number.textContent = i;
      await new Promise(function(resolve){ setTimeout(resolve, 820); });
    }
    overlay.classList.remove('is-show');
  }

  function capturePhoto(){
    var video = $('absCamera');
    var canvas = $('absCanvas');
    if (!video || !canvas || !video.videoWidth) return '';
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    // V129: kamera depan dibuat mirror supaya gerakan kiri/kanan terasa natural.
    // Foto yang dikirim ke Drive disamakan dengan preview agar tidak membingungkan karyawan.
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  function locationPayload(){
    var pos = state.position || {};
    var outlet = state.outletAktif || {};
    return { latitude: pos.latitude || 0, longitude: pos.longitude || 0, outlet: outlet.outlet || '' };
  }

  function currentTimeString(){
    var d = new Date();
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
  }
  function buildLocalRiwayat(kind){
    var base = Object.assign({}, state.riwayat || {});
    var t = currentTimeString();
    if (kind === 'in' && !cleanTime(base.jamMasuk || base.masuk)) {
      base.jamMasuk = t;
      base.masuk = t;
      base.statusMasuk = 'Sudah Check In';
      base.status = 'Sudah Check In';
    }
    if (kind === 'out' && cleanTime(base.jamMasuk || base.masuk) && !cleanTime(base.jamPulang || base.pulang)) {
      base.jamPulang = t;
      base.pulang = t;
      base.statusPulang = 'PULANG';
      base.status = 'Selesai';
    }
    base.tanggal = base.tanggal || new Date().toLocaleDateString('id-ID');
    base.nama = base.nama || (state.user && state.user.nama) || state.session.name || state.session.username || '';
    base.outlet = base.outlet || (state.outletAktif && state.outletAktif.outlet) || '';
    if (state.jadwal) base.jadwal = state.jadwal;
    return base;
  }

  async function doAbsensi(kind){
    if (state.busy) return;
    if (!apiUrl()) { toast('error', 'URL API HR Absensi belum diatur di apj-config.js'); return; }
    if (!state.position) { toast('warning', 'GPS belum siap. Klik Refresh Lokasi.'); getLocation(); return; }
    var outletNow = state.outletAktif || {};
    var jarakNow = Number(outletNow.jarak || 0);
    var radiusNow = Number(outletNow.radius || 300);
    if (!isBypass() && (!outletNow.outlet || !canUseOutlet(outletNow) || jarakNow > radiusNow)) {
      toast('error', !canUseOutlet(outletNow) ? 'Outlet tidak sesuai jadwal absensi.' : 'Di luar radius outlet. Refresh lokasi atau pindah ke outlet sesuai jadwal.');
      getLocation();
      return;
    }
    state.busy = true; updateButtons(state.riwayat || {});
    try{
      await countdown();
      flash();
      var foto = capturePhoto();
      if (!foto) throw new Error('Foto belum berhasil diambil. Kamera belum siap.');
      var action = kind === 'in' ? 'checkin' : 'checkout';
      var res = await hr(action, Object.assign(locationPayload(), { foto: foto }));
      var latest = extractRiwayat(res);
      if (!res || !(res.sukses || res.success)) {
        // Kalau backend menolak karena sudah Check In/Out tetapi mengirim data riwayat, tetap kunci tombol di web.
        if (hasAbsensiData(latest)) {
          setRiwayatSafe(latest, 'already-checked');
          toast('warning', (res && res.pesan) || 'Status absensi sudah tercatat.');
          return;
        }
        throw new Error((res && res.pesan) || 'Absensi gagal');
      }
      // Tampilkan hasil segera dari response/fallback lokal hanya sebagai optimistic display sementara.
      // Setelah itu readback Sheet wajib menjadi sumber final.
      state.optimisticUntil = Date.now() + 15000;
      if (hasAbsensiData(latest)) {
        setRiwayatSafe(latest, 'check-response');
      } else {
        var localLatest = buildLocalRiwayat(kind);
        state.riwayat = localLatest;
        saveRiwayatCache(localLatest);
        applyRiwayat(localLatest);
      }
      var successMsg = res.pesan || (kind === 'in' ? 'Check In berhasil' : 'Check Out berhasil');
      toast('success', successMsg);
      setText('absDeviceNote', successMsg + ' Menyinkronkan status terbaru...');
      await syncRiwayatAfterSubmit(kind, successMsg);
    }catch(err){
      toast('error', err.message || String(err));
    }finally{
      state.busy = false; updateButtons(state.riwayat || {});
    }
  }

  function riwayatHasKind(data, kind){
    data = data || {};
    if (kind === 'out') return !!cleanTime(data.jamPulang || data.pulang || '');
    if (kind === 'in') return !!cleanTime(data.jamMasuk || data.masuk || '');
    return hasAbsensiData(data);
  }

  async function refreshRiwayat(options){
    options = options || {};
    try{
      var before = state.riwayat;
      var res = await hr('getAbsensiHariIni', {});
      var latest = extractRiwayat(res);
      if (res && res.jadwal) { state.jadwal = res.jadwal; applyJadwal(); }
      if (hasAbsensiData(latest)) {
        setRiwayatSafe(latest, 'refresh');
        return options.requireKind ? riwayatHasKind(state.riwayat, options.requireKind) : true;
      }
      // Jika Sheet tidak menemukan baris, kosongkan tampilan. Sumber final absensi adalah Sheet, bukan cache.
      // Preserve hanya berlaku sangat singkat setelah klik Check In/Out untuk menghindari kedip saat writeback.
      var optimistic = hasAbsensiData(before) && options.preserveValid !== false && state.optimisticUntil && Date.now() < state.optimisticUntil;
      if (optimistic) {
        state.riwayat = before;
        applyRiwayat(state.riwayat);
        return false;
      }
      state.riwayat = null;
      clearRiwayatCache();
      applyRiwayat(null);
      return false;
    }catch(err){
      // Saat API error jaringan/backend, jangan munculkan localStorage lama. Pertahankan state hanya kalau memang baru submit.
      if (state.optimisticUntil && Date.now() < state.optimisticUntil && hasAbsensiData(state.riwayat)) {
        applyRiwayat(state.riwayat);
      } else {
        state.riwayat = null;
        clearRiwayatCache();
        applyRiwayat(null);
      }
      return false;
    }
  }

  async function syncRiwayatAfterSubmit(kind, successMsg){
    // V220: refresh status absensi secara senyap sampai data yang baru masuk sheet terbaca.
    // Ini mencegah user harus reload manual setelah Check In / Check Out berhasil.
    var maxTry = kind === 'out' ? 10 : 8;
    var delay = 650;
    for (var i = 0; i < maxTry; i++) {
      var ok = await refreshRiwayat({ preserveValid: true, requireKind: kind });
      if (ok) {
        state.optimisticUntil = 0;
        setText('absDeviceNote', (successMsg || 'Absensi berhasil') + ' Data terbaru sudah tampil.');
        return true;
      }
      await sleep(delay + (i * 120));
    }
    // Coba lagi di belakang layar tanpa mengganggu tombol / tampilan.
    scheduleSilentRiwayatRefresh(kind, successMsg);
    setText('absDeviceNote', (successMsg || 'Absensi berhasil') + ' Data tersimpan. Tampilan akan sinkron otomatis.');
    return false;
  }

  function scheduleSilentRiwayatRefresh(kind, successMsg){
    clearTimeout(window.__apjAbsensiSilentSyncTimer);
    var attempts = 0;
    var tick = async function(){
      attempts += 1;
      var ok = await refreshRiwayat({ preserveValid: true, requireKind: kind });
      if (ok) {
        setText('absDeviceNote', (successMsg || 'Absensi berhasil') + ' Data terbaru sudah tampil.');
        return;
      }
      if (attempts < 8) window.__apjAbsensiSilentSyncTimer = setTimeout(tick, 2500);
    };
    window.__apjAbsensiSilentSyncTimer = setTimeout(tick, 1800);
  }



  function openModal(id){
    var modal = $(id); if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(function(){
      var overlay = modal.querySelector('.modal-overlay');
      var content = modal.querySelector('.modal-content');
      if (overlay) overlay.classList.add('opacity-100');
      if (content) { content.classList.remove('scale-95','opacity-0'); content.classList.add('scale-100','opacity-100'); }
    }, 10);
  }
  function closeModal(id){
    var modal = $(id); if (!modal) return;
    var overlay = modal.querySelector('.modal-overlay');
    var content = modal.querySelector('.modal-content');
    if (overlay) overlay.classList.remove('opacity-100');
    if (content) { content.classList.remove('scale-100','opacity-100'); content.classList.add('scale-95','opacity-0'); }
    setTimeout(function(){ modal.classList.add('hidden'); modal.classList.remove('flex'); }, 180);
  }
  function openAbsensiHelpModal(autoOpen){ if (autoOpen) apjMarkGuideSeen('absensi.html'); openModal('absensiHelpModal'); }
  function closeAbsensiHelpModal(){ apjMarkGuideSeen('absensi.html'); closeModal('absensiHelpModal'); }
  function showLogoutModal(){ openModal('logoutModal'); }
  function closeLogoutModal(){ closeModal('logoutModal'); }
  function executeLogout(){ if (window.APJAuth && APJAuth.logout) APJAuth.logout(); else { localStorage.clear(); sessionStorage.clear(); window.location.href = (cfg().loginPage || 'index.html'); } }
  function openMobileSidebar(){ var sidebar=$('sidebar'), backdrop=$('sidebarBackdrop'); if(sidebar) sidebar.classList.remove('-translate-x-full'); if(backdrop) backdrop.classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function closeMobileSidebar(){ var sidebar=$('sidebar'), backdrop=$('sidebarBackdrop'); if(sidebar && window.innerWidth < 1024) sidebar.classList.add('-translate-x-full'); if(backdrop) backdrop.classList.add('hidden'); document.body.style.overflow=''; }
  function initSidebar(){
    document.querySelectorAll('[data-menu-toggle]').forEach(function(btn){
      if (btn.dataset.apjBound === 'Y') return;
      btn.dataset.apjBound = 'Y';
      btn.addEventListener('click', function(){
        var group = btn.closest('.nav-group');
        if (!group) return;
        group.classList.toggle('open');
        btn.setAttribute('aria-expanded', group.classList.contains('open') ? 'true' : 'false');
      });
    });
    document.querySelectorAll('#sidebar a').forEach(function(a){ a.addEventListener('click', closeMobileSidebar); });
    var toggle = $('sidebarToggle');
    if (toggle && !toggle.dataset.apjBound) {
      toggle.dataset.apjBound = 'Y';
      toggle.addEventListener('click', function(){
        var sidebar = $('sidebar'); if (!sidebar) return;
        sidebar.classList.toggle('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed-active', sidebar.classList.contains('sidebar-collapsed'));
      });
    }
    document.querySelectorAll('.nav-coming-soon,[data-coming-soon-menu]').forEach(function(link){
      link.addEventListener('click', function(e){ e.preventDefault(); toast('info', (link.getAttribute('data-coming-soon-menu') || 'Menu') + ' segera hadir.'); });
    });
  }

  function bind(){
    var btnIn = $('btnCheckIn');
    var btnOut = $('btnCheckOut');
    var btnLoc = $('btnRefreshLocation');
    if (btnIn) btnIn.addEventListener('click', function(){ doAbsensi('in'); });
    if (btnOut) btnOut.addEventListener('click', function(){ doAbsensi('out'); });
    if (btnLoc) btnLoc.addEventListener('click', getLocation);
  }

  async function init(){
    initSidebar();
    clearLegacyAbsensiCaches();
    if (!initUser()) return;
    bind();
    // V124: bootstrap harus selesai dulu supaya GPS memakai outlet/radius asli dari APJ_CORE_USER,
    // bukan fallback radius lama. Ini memperbaiki tampilan awal yang salah sampai tombol Refresh Lokasi ditekan.
    await loadBootstrap();
    startCamera();
    getLocation();
    setTimeout(function(){ if (!apjHasSeenGuide('absensi.html')) openAbsensiHelpModal(true); }, 500);
  }

  window.openMobileSidebar = openMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;
  window.openAbsensiHelpModal = openAbsensiHelpModal;
  window.closeAbsensiHelpModal = closeAbsensiHelpModal;
  window.showLogoutModal = showLogoutModal;
  window.closeLogoutModal = closeLogoutModal;
  window.executeLogout = executeLogout;

  document.addEventListener('DOMContentLoaded', init);
})();
