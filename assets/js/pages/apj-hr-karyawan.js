
/* APJ HR KARYAWAN V177 - Shift Full Form */
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

  var MENU_GROUP_KEY='APJ_DASHBOARD_MENU_GROUPS_V31';
  var SIDEBAR_KEY='APJ_SIDEBAR_COLLAPSED';
  var state={session:null, users:[], shifts:[], jadwal:[], outlets:[], activeTab:'karyawan', loaded:false, offline:false, detailUser:null, detailEditing:false, jadwalEdit:null, shiftEdit:null};
  function $(id){ return document.getElementById(id); }
  function cfg(){ return window.APJ_CONFIG || {}; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function setText(id,v){ var el=$(id); if(el) el.textContent = (v === undefined || v === null || v === '') ? '-' : String(v); }
  function toast(type,msg){ if(window.APJToast && APJToast[type]) APJToast[type](msg); else if(window.APJToast) APJToast.info(msg); else console.log(type,msg); }
  function getSession(){ return window.APJAuth ? APJAuth.getSession() : {}; }
  function payload(extra){ var s=state.session||getSession(); return Object.assign({ username:s.username||'', nama:s.name||'', name:s.name||'', level:s.level||'', outletUser:s.outlet||'', outletAkses:s.outletAccess||'', sessionToken:s.token||'', device:navigator.userAgent||'' }, extra||{}); }
  async function hr(action,data){ if(!window.APJApi || !APJApi.absensi) throw new Error('APJApi Absensi belum siap.'); return APJApi.absensi(action,payload(data||{})); }
  function val(obj, keys){ obj=obj||{}; for(var i=0;i<keys.length;i++){ var k=keys[i]; if(obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k]; } return ''; }
  function normStatus(v){ var s=String(v||'').trim().toUpperCase(); if(!s) return 'AKTIF'; if(['ACTIVE','YA','Y','TRUE','1'].indexOf(s)>=0) return 'AKTIF'; if(['NONAKTIF','NON AKTIF','INACTIVE','N','FALSE','0'].indexOf(s)>=0) return 'NONAKTIF'; return s; }
  function splitAccess(v){ if(Array.isArray(v)) return v.map(String).map(function(x){return x.trim();}).filter(Boolean); return String(v||'').split(/[;,|]/).map(function(x){return x.trim();}).filter(Boolean); }
  function uniq(arr){ var seen={}; return (arr||[]).map(function(x){return String(x||'').trim();}).filter(function(x){ if(!x || seen[x.toUpperCase()]) return false; seen[x.toUpperCase()]=true; return true; }); }
  function initials(name){ return String(name||'APJ').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w.charAt(0).toUpperCase();}).join('')||'APJ'; }
  function normalizeUser(u){
    var nama=val(u,['nama','NAMA','name','Name','Nama','namaKaryawan','NAMA_KARYAWAN']);
    var username=val(u,['username','USERNAME','userName','USER_NAME','USER ID','userId','USER_ID']);
    var outlet=val(u,['outlet','OUTLET','outletUtama','OUTLET_UTAMA','Outlet Utama','OUTLET UTAMA']);
    var akses=val(u,['outletAkses','OUTLET_AKSES','aksesOutlet','AKSES_OUTLET','Akses Outlet','OUTLET_ACCESS']);
    return {
      raw:u||{}, rowNumber:val(u,['rowNumber','ROW_NUMBER','row','ROW'])||'', nama:nama||username||'-', username:username||'', level:val(u,['level','LEVEL','Level','jabatan','JABATAN'])||'-',
      outlet:outlet||'-', outletAkses:splitAccess(akses||outlet), status:normStatus(val(u,['status','STATUS','Status','aktif','AKTIF'])),
      email:val(u,['email','EMAIL','Email']), telepon:val(u,['telepon','TELEPON','noHp','NO_HP','HP'])
    };
  }
  function normalizeShift(s){
    var nama=val(s,['namaShift','NAMA_SHIFT','Nama Shift','NAMA SHIFT','shift','SHIFT','nama','NAMA']);
    var outlet=val(s,['outlet','OUTLET','Outlet']);
    var masuk=val(s,['jamMasuk','JAM_MASUK','Jam Masuk','JAM MASUK','masuk','MASUK']);
    var pulang=val(s,['jamPulang','JAM_PULANG','Jam Pulang','JAM PULANG','jamKeluar','JAM_KELUAR','pulang','PULANG']);
    return {
      raw:s||{},
      kode:val(s,['kodeShift','KODE_SHIFT','ID_SHIFT','idShift','Kode Shift','KODE','kode'])||nama||'-',
      nama:nama||'-',
      outlet:outlet||'-',
      masuk:masuk||'-',
      pulang:pulang||'-',
      toleransi:val(s,['toleransi','TOLERANSI','Toleransi','Toleransi Keterlambatan','TOLERANSI_KETERLAMBATAN','Toleransi Menit','TOLERANSI_MENIT'])||'0 Menit',
      istirahat:val(s,['istirahat','ISTIRAHAT','Istirahat'])||'0 Jam',
      lemburAwal:val(s,['hitungLemburAwal','HITUNG_LEMBUR_AWAL','Hitung Lembur Awal','LEMBUR_AWAL','Lembur Awal'])||'TIDAK',
      lemburAkhir:val(s,['hitungLemburAkhir','HITUNG_LEMBUR_AKHIR','Hitung Lembur Akhir','LEMBUR_AKHIR','Lembur Akhir'])||'TIDAK',
      minimalLembur:val(s,['minimalLemburMenit','MINIMAL_LEMBUR_MENIT','Minimal Lembur Menit','Minimal Lembur','MINIMAL_LEMBUR'])||'60 Menit',
      pembulatanMenit:val(s,['pembulatanLemburMenit','PEMBULATAN_LEMBUR_MENIT','Pembulatan Lembur Menit','Pembulatan Lembur','PEMBULATAN_LEMBUR'])||'60 Menit',
      metodePembulatan:val(s,['metodePembulatanLembur','METODE_PEMBULATAN_LEMBUR','Metode Pembulatan Lembur','Metode Pembulatan','METODE_PEMBULATAN'])||'TURUN',
      lembur:val(s,['lembur','LEMBUR','Hitung Lembur','HITUNG_LEMBUR'])||val(s,['Hitung Lembur Akhir','HITUNG_LEMBUR_AKHIR'])||'-',
      status:normStatus(val(s,['status','STATUS','aktif','AKTIF'])||'AKTIF')
    };
  }
  function normalizeJadwal(j){ return { raw:j||{}, nama:val(j,['nama','NAMA','namaKaryawan','NAMA_KARYAWAN','user','USER'])||'-', username:val(j,['username','USERNAME','USER_ID','userId']), outlet:val(j,['outlet','OUTLET','Outlet'])||'-', hari:val(j,['hari','HARI','day','DAY'])||'-', shift:val(j,['shift','SHIFT','namaShift','NAMA_SHIFT','kodeShift','KODE_SHIFT'])||'-', jam:val(j,['jam','JAM','jamKerja','JAM_KERJA'])||'-', status:normStatus(val(j,['status','STATUS','aktif','AKTIF'])), catatan:val(j,['catatan','CATATAN','note','NOTE'])||'-' }; }
  function normalizeOutlet(o){ if(typeof o==='string') return o; return val(o,['outlet','OUTLET','namaOutlet','NAMA_OUTLET','kodeOutlet','KODE_OUTLET','nama','NAMA'])||''; }
  function userFilterKey(u){ return String((u&&u.username)||'') || String((u&&u.nama)||'') || '-'; }
  function userFilterLabel(u){
    var parts=[u&&u.nama,u&&u.username,u&&u.level].filter(function(x){ return x !== undefined && x !== null && String(x).trim() !== ''; });
    return parts.join(' • ') || 'Karyawan';
  }
  var MONTHS_ID=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function shiftValue(s){ return String((s&&s.kode)||'') || String((s&&s.nama)||'') || '-'; }
  function shiftLabel(s){
    if(!s) return 'Shift';
    var jam=(s.masuk||s.pulang)?[s.masuk||'',s.pulang||''].filter(Boolean).join(' - '):'';
    return [s.nama||s.kode||'Shift', jam].filter(Boolean).join(' • ');
  }
  function shiftShortLabel(s){
    if(!s) return 'Shift';
    return String(s.nama||s.namaShift||s.kode||s.kodeShift||'Shift');
  }
  function shiftByValue(value){
    var v=String(value||'').trim().toLowerCase();
    return (state.shifts||[]).find(function(s){ return [s.kode,s.nama,s.namaShift,s.kodeShift].some(function(x){ return String(x||'').trim().toLowerCase()===v; }); });
  }
  function findUserByKey(key){
    var k=String(key||'').trim().toLowerCase();
    return (state.users||[]).find(function(u){ return userFilterKey(u).toLowerCase()===k || String(u.nama||'').toLowerCase()===k || String(u.username||'').toLowerCase()===k; });
  }
  function filteredUsers(){
    var fk=String(($('filterCari')||{}).value||'').trim().toLowerCase();
    var fo=String(($('filterOutlet')||{}).value||'').trim().toLowerCase();
    var fs=String(($('filterStatus')||{}).value||'').trim().toUpperCase();
    var fl=String(($('filterLevel')||{}).value||'').trim().toLowerCase();
    return (state.users||[]).filter(function(u){
      var outlets=[u.outlet].concat(u.outletAkses||[]).join(' ').toLowerCase();
      if(fk && userFilterKey(u).toLowerCase() !== fk) return false;
      if(fo && outlets.indexOf(fo)<0) return false;
      if(fs && u.status !== fs) return false;
      if(fl && String(u.level||'').toLowerCase() !== fl) return false;
      return true;
    });
  }
  function renderSummary(){
    var users=state.users||[], active=users.filter(function(u){return u.status==='AKTIF';}).length;
    setText('hrSumTotal',users.length); setText('hrSumAktif',active); setText('hrSumOutlet',(state.outlets||[]).length); setText('hrSumShift',(state.shifts||[]).length); setText('hrSumJadwal',groupedJadwal().length);
  }
  function renderFilters(){
    var karyawanSel=$('filterCari'), outletSel=$('filterOutlet'), levelSel=$('filterLevel'), formOutlet=$('formOutlet'), detailOutlet=$('detailOutlet'), jadwalNama=$('jadwalNama'), jadwalOutlet=$('jadwalOutlet'), jadwalShift=$('jadwalShift');
    var users=state.users||[];
    var userOptions=users.map(function(u){ var key=userFilterKey(u); return '<option value="'+esc(key)+'">'+esc(userFilterLabel(u))+'</option>'; }).join('');
    if(karyawanSel){
      var curK=karyawanSel.value;
      karyawanSel.innerHTML='<option value="">Semua Karyawan</option>'+userOptions;
      karyawanSel.value=Array.prototype.some.call(karyawanSel.options,function(opt){ return opt.value===curK; })?curK:'';
    }
    if(jadwalNama){
      var curJ=jadwalNama.value;
      jadwalNama.innerHTML='<option value="">Pilih Karyawan</option>'+userOptions;
      jadwalNama.value=Array.prototype.some.call(jadwalNama.options,function(opt){ return opt.value===curJ; })?curJ:'';
    }
    var outlets=uniq((state.outlets||[]).concat(users.map(function(u){return u.outlet;}).filter(Boolean)));
    if(outletSel){ var cur=outletSel.value; outletSel.innerHTML='<option value="">Semua Outlet</option>'+outlets.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join(''); outletSel.value=cur; }
    if(formOutlet){ var cur2=formOutlet.value; formOutlet.innerHTML='<option value="">Pilih Outlet</option>'+outlets.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join(''); formOutlet.value=cur2; }
    if(detailOutlet){ var cur4=detailOutlet.value; detailOutlet.innerHTML='<option value="">Pilih Outlet</option>'+outlets.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join(''); detailOutlet.value=cur4; }
    if(jadwalOutlet){ var cur5=jadwalOutlet.value; jadwalOutlet.innerHTML='<option value="">Pilih Outlet</option>'+outlets.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join(''); jadwalOutlet.value=cur5; }
    if(jadwalShift){
      var cur6=jadwalShift.value;
      jadwalShift.innerHTML='<option value="">Pilih Shift</option><option value="LIBUR">LIBUR</option><option value="ALPA">ALPA</option><option value="IZIN">IZIN</option><option value="KOSONGKAN">Kosongkan / Hapus Jadwal</option>'+(state.shifts||[]).map(function(sh){ var key=shiftValue(sh); return '<option value="'+esc(key)+'">'+esc(shiftLabel(sh))+'</option>'; }).join('');
      jadwalShift.value=Array.prototype.some.call(jadwalShift.options,function(opt){ return opt.value===cur6; })?cur6:'';
    }
    var levels=uniq(users.map(function(u){return u.level;}).filter(Boolean));
    if(levelSel){ var cur3=levelSel.value; levelSel.innerHTML='<option value="">Semua Level</option>'+levels.map(function(l){return '<option value="'+esc(l)+'">'+esc(l)+'</option>';}).join(''); levelSel.value=cur3; }
    syncJadwalShiftJam(); updateSelectedDaysInfo(); refreshSegmentOptions();
  }
  function renderShiftOutletOptions(){
    var sel=$('shiftOutlet'); if(!sel) return;
    var current=sel.value;
    var outlets=uniq((state.outlets||[]).concat((state.shifts||[]).map(function(s){return s.outlet;})).filter(Boolean));
    sel.innerHTML='<option value="">Pilih Outlet</option>'+outlets.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join('')+'<option value="-">-</option>';
    if(current) sel.value=current;
  }
  function pillStatus(status){ var cls=status==='AKTIF'?'is-active':'is-off'; return '<span class="hr-pill '+cls+'">'+esc(status||'-')+'</span>'; }
  function pillLevel(level){ var admin=/OWNER|SUPERADMIN|SUPERVISOR|HR/i.test(String(level||'')); return '<span class="hr-pill '+(admin?'is-admin':'')+'">'+esc(level||'-')+'</span>'; }
  function renderKaryawan(){
    var body=$('karyawanTableBody'); if(!body) return; var rows=filteredUsers();
    setText('karyawanInfoText',(state.offline?'Mode tampilan awal • ':'')+rows.length+' karyawan ditampilkan dari '+(state.users||[]).length+' data.');
    if(!rows.length){ body.innerHTML='<tr><td colspan="7" class="hr-empty">Belum ada data karyawan sesuai filter.</td></tr>'; return; }
    body.innerHTML=rows.map(function(u,idx){ var access=u.outletAkses&&u.outletAkses.length?u.outletAkses.join(', '):'-'; return '<tr>'+ '<td><div class="hr-name-cell"><div class="hr-avatar">'+esc(initials(u.nama))+'</div><div><div class="hr-name-main">'+esc(u.nama)+'</div><div class="hr-name-sub">'+esc(u.email||u.telepon||'Data kontak belum diisi')+'</div></div></div></td>'+ '<td>'+esc(u.username||'-')+'</td>'+ '<td>'+pillLevel(u.level)+'</td>'+ '<td>'+esc(u.outlet||'-')+'</td>'+ '<td>'+esc(access)+'</td>'+ '<td>'+pillStatus(u.status)+'</td>'+ '<td><div class="hr-actions"><button class="hr-action-btn" type="button" data-detail-user="'+idx+'">Detail</button></div></td>'+ '</tr>'; }).join('');
  }
  function renderShift(){
    var body=$('shiftTableBody'); if(!body) return; var rows=state.shifts||[]; setText('shiftInfoText',rows.length+' shift kerja terdeteksi dari ID_SHIFT.');
    if(!rows.length){ body.innerHTML='<tr><td colspan="13" class="hr-empty">Belum ada data shift. Tambahkan master shift dari tombol Tambah Shift.</td></tr>'; return; }
    body.innerHTML=rows.map(function(s,idx){
      return '<tr>'+
        '<td class="hr-shift-name">'+esc(s.nama)+'</td>'+
        '<td>'+esc(s.outlet||'-')+'</td>'+
        '<td>'+esc(s.masuk)+'</td>'+
        '<td>'+esc(s.pulang)+'</td>'+
        '<td>'+esc(s.toleransi)+'</td>'+
        '<td>'+esc(s.istirahat)+'</td>'+
        '<td>'+esc(s.lemburAwal)+'</td>'+
        '<td>'+esc(s.lemburAkhir)+'</td>'+
        '<td>'+esc(s.minimalLembur)+'</td>'+
        '<td>'+esc(s.pembulatanMenit)+'</td>'+
        '<td>'+esc(s.metodePembulatan)+'</td>'+
        '<td>'+pillStatus(s.status)+'</td>'+
        '<td><div class="hr-actions"><button class="hr-action-btn" type="button" data-edit-shift="'+idx+'">Edit</button></div></td>'+
      '</tr>'; }).join('');
  }
  function monthNumber(name){ var k=String(name||'').trim().toLowerCase(); var idx=MONTHS_ID.map(function(m){return m.toLowerCase();}).indexOf(k); return idx>=0?idx+1:0; }
  function daysInMonthId(bulan,tahun){
    var m=monthNumber(bulan)||((new Date()).getMonth()+1);
    var y=Number(tahun)||((new Date()).getFullYear());
    return new Date(y,m,0).getDate();
  }
  function currentJadwalMaxDay(){ return daysInMonthId(($('jadwalBulan')||{}).value,($('jadwalTahun')||{}).value); }

function initJadwalExportControls(){
  var now=new Date();
  var bulan=$('exportJadwalBulan');
  var tahun=$('exportJadwalTahun');
  if(bulan && !bulan.value) bulan.value=MONTHS_ID[now.getMonth()]||'Januari';
  if(tahun && !tahun.value) tahun.value=String(now.getFullYear());
}
function currentExportPeriod(){
  var now=new Date();
  var bulan=String(($('exportJadwalBulan')||{}).value||MONTHS_ID[now.getMonth()]||'').trim();
  var tahun=String(($('exportJadwalTahun')||{}).value||now.getFullYear()).trim();
  return {bulan:bulan,tahun:tahun};
}


  function parseJadwalDateText(text){
    var str=String(text||'').trim();
    var m=str.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
    if(!m) return {day:0,bulan:'',tahun:''};
    return {day:Number(m[1]),bulan:m[2],tahun:m[3]};
  }
  function groupedJadwal(){
    var rows=state.jadwal||[];
    var fk=String(($('filterCari')||{}).value||'').trim().toLowerCase();
    var fo=String(($('filterOutlet')||{}).value||'').trim().toLowerCase();
    var fs=String(($('filterStatus')||{}).value||'').trim().toUpperCase();
    var map={};
    rows.forEach(function(j){
      var parsed=parseJadwalDateText(j.hari||j.tanggal);
      var bulan=parsed.bulan || val(j.raw||{},['Bulan','BULAN']) || '';
      var tahun=parsed.tahun || val(j.raw||{},['Tahun','TAHUN']) || '';
      var day=parsed.day || Number(val(j.raw||{},['Tanggal','TANGGAL','Day','DAY'])) || 0;
      var key=[j.username||j.nama,j.outlet,bulan,tahun].map(function(x){return String(x||'').toLowerCase();}).join('|');
      if(fk && String(j.username||j.nama||'').toLowerCase()!==fk && String(j.nama||'').toLowerCase()!==fk) return;
      if(fo && String(j.outlet||'').toLowerCase().indexOf(fo)<0) return;
      if(fs && j.status !== fs) return;
      if(!map[key]) map[key]={nama:j.nama,username:j.username,outlet:j.outlet,bulan:bulan,tahun:tahun,status:j.status,catatan:j.catatan,rows:[],days:{},workDays:[],liburDays:[],alpaDays:[],izinDays:[],shiftCounts:{},shiftDays:{}};
      var g=map[key]; g.rows.push(j);
      var shift=String(j.shift||'').trim()||'-';
      var shiftUp=shift.toUpperCase();
      if(day){
        g.days[day]=shift;
        if(shiftUp==='LIBUR') g.liburDays.push(day);
        else if(shiftUp==='ALPA') g.alpaDays.push(day);
        else if(shiftUp==='IZIN') g.izinDays.push(day);
        else g.workDays.push(day);
        if(!g.shiftDays[shift]) g.shiftDays[shift]=[];
        g.shiftDays[shift].push(day);
      }
      g.shiftCounts[shift]=(g.shiftCounts[shift]||0)+1;
    });
    return Object.keys(map).map(function(k){ var g=map[k]; g.workDays.sort(function(a,b){return a-b;}); g.liburDays.sort(function(a,b){return a-b;}); g.alpaDays.sort(function(a,b){return a-b;}); g.izinDays.sort(function(a,b){return a-b;}); return g; })
      .sort(function(a,b){ return String(a.nama||'').localeCompare(String(b.nama||'')) || String(a.outlet||'').localeCompare(String(b.outlet||'')) || (Number(a.tahun)-Number(b.tahun)) || (monthNumber(a.bulan)-monthNumber(b.bulan)); });
  }
  function renderShiftSummary(g){
    var items=Object.keys(g.shiftCounts||{}).sort(function(a,b){ return (g.shiftCounts[b]||0)-(g.shiftCounts[a]||0); });
    if(!items.length) return '-';
    return items.slice(0,2).map(function(name){ return '<span class="hr-shift-chip" title="'+esc(name)+' · '+esc(g.shiftCounts[name])+' hari">'+esc(name)+' · '+esc(g.shiftCounts[name])+' hari</span>'; }).join(' ')+(items.length>2?' <span class="hr-more-chip">+'+(items.length-2)+' shift</span>':'');
  }
  function renderJadwal(){
    var body=$('jadwalTableBody'); if(!body) return;
    var groups=groupedJadwal();
    setText('jadwalInfoText',groups.length+' periode jadwal ditampilkan dari '+(state.jadwal||[]).length+' tanggal terisi.');
    if(!groups.length){ body.innerHTML='<tr><td colspan="9" class="hr-empty">Belum ada data jadwal sesuai filter. Isi jadwal dari tombol Tambah Jadwal.</td></tr>'; return; }
    body.innerHTML=groups.map(function(g,idx){
      return '<tr>'+        '<td class="hr-col-name"><div class="hr-name-main" title="'+esc(g.nama||'-')+'">'+esc(g.nama||'-')+'</div></td>'+        '<td class="hr-col-outlet" title="'+esc(g.outlet||'-')+'">'+esc(g.outlet||'-')+'</td>'+        '<td class="hr-col-period">'+esc([g.bulan,g.tahun].filter(Boolean).join(' ')||'-')+'</td>'+        '<td class="hr-col-count"><strong>'+esc(g.workDays.length)+'</strong><span>hari</span></td>'+        '<td class="hr-col-count"><strong>'+esc(g.liburDays.length)+'</strong><span>hari</span></td>'+        '<td class="hr-col-count hr-col-alpa"><strong>'+esc(g.alpaDays.length)+'</strong><span>hari</span></td>'+        '<td class="hr-col-count hr-col-izin"><strong>'+esc(g.izinDays.length)+'</strong><span>hari</span></td>'+        '<td class="hr-col-status">'+pillStatus(g.status)+'</td>'+        '<td class="hr-col-action"><div class="hr-actions hr-actions-inline"><button class="hr-action-btn" type="button" data-detail-jadwal="'+idx+'">Detail</button><button class="hr-action-btn" type="button" data-edit-jadwal="'+idx+'">Edit</button></div></td>'+      '</tr>';
    }).join('');
  }
  function renderAkses(){
    var body=$('aksesTableBody'); if(!body) return; var rows=filteredUsers(); setText('aksesInfoText',rows.length+' baris akses outlet ditampilkan.');
    if(!rows.length){ body.innerHTML='<tr><td colspan="6" class="hr-empty">Belum ada akses outlet sesuai filter.</td></tr>'; return; }
    body.innerHTML=rows.map(function(u){ var access=u.outletAkses&&u.outletAkses.length?u.outletAkses.join(', '):'-'; return '<tr><td>'+esc(u.nama)+'</td><td>'+pillLevel(u.level)+'</td><td>'+esc(u.outlet||'-')+'</td><td>'+esc(access)+'</td><td>'+esc((u.outletAkses||[]).length||0)+'</td><td>'+pillStatus(u.status)+'</td></tr>'; }).join('');
  }
  function renderAll(){ renderSummary(); renderFilters(); renderKaryawan(); renderShift(); renderJadwal(); renderAkses(); }
  function normalizeResponse(res){
    var users=res.users||res.karyawan||res.dataKaryawan||res.data||[];
    var shifts=res.shifts||res.shift||res.idShift||res.ID_SHIFT||[];
    var jadwal=res.jadwal||res.schedules||res.idJadwal||res.ID_JADWAL||[];
    var outlets=res.outlets||res.outlet||res.OUTLET||[];
    state.users=(Array.isArray(users)?users:[]).map(normalizeUser);
    state.shifts=(Array.isArray(shifts)?shifts:[]).map(normalizeShift);
    state.jadwal=(Array.isArray(jadwal)?jadwal:[]).map(normalizeJadwal);
    state.outlets=uniq((Array.isArray(outlets)?outlets:[]).map(normalizeOutlet).filter(Boolean));
  }
  function seedFromSession(){
    var s=state.session||getSession();
    state.users=s.username||s.name?[normalizeUser({nama:s.name||s.username,username:s.username,level:s.level,outlet:s.outlet,outletAkses:s.outletAccess,status:'AKTIF'})]:[];
    state.outlets=uniq(splitAccess(s.outletAccess).concat([s.outlet]).filter(Boolean));
    state.shifts=[]; state.jadwal=[]; state.offline=true;
  }
  async function loadData(showToast){
    setText('hrStatusText','Memuat data HR dari Apps Script...');
    try{
      var action=(cfg().actions&&cfg().actions.absensi&&cfg().actions.absensi.hrKaryawanData)||'getHrKaryawanDataV167';
      var res=await hr(action,{});
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Endpoint HR Karyawan belum tersedia.');
      normalizeResponse(res); state.offline=false; renderAll();
      setText('hrStatusText','Data HR berhasil dimuat dari APJ_CORE_USER. '+(state.users||[]).length+' karyawan tersedia.');
      if(showToast) toast('success','Data HR Karyawan berhasil dimuat.');
    }catch(err){
      seedFromSession(); renderAll();
      setText('hrStatusText','Data HR gagal dimuat dari APJ_CORE_USER: '+(err.message||'gagal memuat data.'));
      if(showToast) toast('warning','Gagal memuat data HR real. Cek deployment Code.gs HR Absensi.');
    }
  }
  function setTab(tab){ state.activeTab=tab||'karyawan'; document.querySelectorAll('.hr-tab').forEach(function(btn){ btn.classList.toggle('is-active',btn.getAttribute('data-tab')===state.activeTab); }); document.querySelectorAll('.hr-tab-pane').forEach(function(pane){ pane.classList.toggle('is-active',pane.id==='tab-'+state.activeTab); }); }

  function setValue(id,v){ var el=$(id); if(el) el.value = (v === undefined || v === null) ? '' : String(v); }
  function ensureOption(selectId,value){
    var el=$(selectId), val=String(value||'').trim(); if(!el || !val) return;
    var exists=Array.prototype.some.call(el.options,function(opt){ return String(opt.value||opt.textContent).toLowerCase()===val.toLowerCase(); });
    if(!exists){ var opt=document.createElement('option'); opt.value=val; opt.textContent=val; el.appendChild(opt); }
  }
  function setSelectValueLoose(selectId,value){
    var el=$(selectId), val=String(value||'').trim();
    if(!el) return;
    if(!val){ el.value=''; return; }
    ensureOption(selectId,val);
    var found='';
    Array.prototype.some.call(el.options,function(opt){
      var ov=String(opt.value||'').trim(), ot=String(opt.textContent||'').trim();
      if(ov===val || ov.toLowerCase()===val.toLowerCase() || ot.toLowerCase()===val.toLowerCase()){
        found=opt.value; return true;
      }
      return false;
    });
    el.value=found || val;
  }
  function niceKey(key){ return String(key||'').replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').trim(); }
  function renderRawDetails(user){
    var grid=$('detailRawGrid'); if(!grid) return;
    var raw=user && user.raw ? user.raw : {};
    var skip={}; ['nama','NAMA','name','Name','Nama','namaKaryawan','NAMA_KARYAWAN','username','USERNAME','userName','USER_NAME','USER ID','userId','USER_ID','level','LEVEL','Level','jabatan','JABATAN','outlet','OUTLET','outletUtama','OUTLET_UTAMA','Outlet Utama','OUTLET UTAMA','outletAkses','OUTLET_AKSES','aksesOutlet','AKSES_OUTLET','Akses Outlet','OUTLET_ACCESS','status','STATUS','Status','aktif','AKTIF','email','EMAIL','Email','telepon','TELEPON','noHp','NO_HP','HP'].forEach(function(k){ skip[k]=true; });
    var items=Object.keys(raw||{}).filter(function(k){ var v=raw[k]; return !skip[k] && v !== undefined && v !== null && String(v).trim() !== ''; }).slice(0,24);
    if(!items.length){ grid.innerHTML='<div class="hr-detail-raw-empty">Belum ada data tambahan dari source.</div>'; return; }
    grid.innerHTML=items.map(function(k){ return '<div class="hr-detail-raw-item"><span>'+esc(niceKey(k))+'</span><strong>'+esc(raw[k])+'</strong></div>'; }).join('');
  }
  function setDetailEditing(active){
    state.detailEditing=!!active;
    var grid=document.querySelector('.hr-detail-grid'); if(grid) grid.classList.toggle('is-editing',state.detailEditing);
    document.querySelectorAll('#hrDetailModal [data-detail-field]').forEach(function(el){ el.disabled=!state.detailEditing; });
    setText('detailModeText',state.detailEditing?'Mode edit aktif':'Mode lihat data');
    var edit=$('btnDetailEdit'); if(edit) edit.textContent=state.detailEditing?'Batal Edit':'Edit';
    var save=$('btnDetailSave'); if(save) save.disabled=!state.detailEditing;
  }
  function populateDetail(user){
    user=user||{};
    var access=(user.outletAkses&&user.outletAkses.length)?user.outletAkses.join(', '):'';
    setText('detailInitials',initials(user.nama));
    setText('detailTitle',user.nama||'-');
    setText('detailSubtitle',[(user.username||'-'),(user.level||'-'),(user.status||'-')].join(' • '));
    ensureOption('detailLevel',user.level); ensureOption('detailOutlet',user.outlet);
    setValue('detailNama',user.nama); setValue('detailUsername',user.username); setValue('detailLevel',user.level);
    setValue('detailOutlet',user.outlet); setValue('detailStatus',user.status || 'AKTIF'); setValue('detailEmail',user.email);
    setValue('detailTelepon',user.telepon); setValue('detailOutletAkses',access);
    renderRawDetails(user);
  }
  function openUserDetail(index){
    var rows=filteredUsers(); var user=rows[Number(index)];
    if(!user){ toast('warning','Data karyawan tidak ditemukan.'); return; }
    state.detailUser=user; populateDetail(user); setDetailEditing(false); openModal('hrDetailModal');
  }
  async function saveDetailLocal(){
    var user=state.detailUser; if(!user){ toast('warning','Tidak ada data karyawan yang dipilih.'); return; }
    if(!state.detailEditing){ toast('info','Klik Edit dulu untuk mengubah data.'); return; }
    var patch={
      targetUsername:user.username||'',
      nama:String(($('detailNama')||{}).value||'').trim()||user.nama,
      username:String(($('detailUsername')||{}).value||'').trim()||user.username,
      level:String(($('detailLevel')||{}).value||'').trim()||'-',
      outlet:String(($('detailOutlet')||{}).value||'').trim()||'-',
      outletUtama:String(($('detailOutlet')||{}).value||'').trim()||'-',
      status:normStatus(($('detailStatus')||{}).value||'AKTIF'),
      email:String(($('detailEmail')||{}).value||'').trim(),
      telepon:String(($('detailTelepon')||{}).value||'').trim(),
      outletAkses:String(($('detailOutletAkses')||{}).value||'').trim()
    };
    var save=$('btnDetailSave'); if(save){ save.disabled=true; save.textContent='Menyimpan...'; }
    try{
      if(state.offline){ throw new Error('Backend belum aktif.'); }
      var action=(cfg().actions&&cfg().actions.absensi&&cfg().actions.absensi.saveHrKaryawanUser)||'saveHrKaryawanUserV157';
      var res=await hr(action,patch);
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Gagal menyimpan ke USER.');
      normalizeResponse(res); state.offline=false; renderAll();
      var updated=(state.users||[]).find(function(u){ return (patch.username && userFilterKey(u).toLowerCase()===patch.username.toLowerCase()) || (patch.targetUsername && userFilterKey(u).toLowerCase()===patch.targetUsername.toLowerCase()); }) || normalizeUser(patch);
      state.detailUser=updated; populateDetail(updated); setDetailEditing(false);
      toast('success','Data karyawan berhasil disimpan ke APJ_CORE_USER.USER.');
    }catch(err){
      user.nama=patch.nama; user.username=patch.username; user.level=patch.level; user.outlet=patch.outlet; user.status=patch.status; user.email=patch.email; user.telepon=patch.telepon; user.outletAkses=splitAccess(patch.outletAkses||patch.outlet);
      state.outlets=uniq((state.outlets||[]).concat([user.outlet]).concat(user.outletAkses||[])); renderAll(); populateDetail(user); setDetailEditing(false);
      toast('warning','Belum tersimpan ke Google Sheet: '+(err.message||'gagal simpan')+'. Perubahan hanya tampil sementara.');
    }finally{
      if(save){ save.textContent='Save'; save.disabled=!state.detailEditing; }
    }
  }

  function resetFilter(){ ['filterCari','filterOutlet','filterStatus','filterLevel'].forEach(function(id){ var el=$(id); if(el) el.value=''; }); renderKaryawan(); renderAkses(); }
  function toTimeValue(v){
    var s=String(v||'').trim();
    var m=s.match(/(\d{1,2}):(\d{2})/);
    if(!m) return '';
    return String(m[1]).padStart(2,'0')+':'+m[2];
  }
  function getShiftPayload(){
    return {
      targetKodeShift: state.shiftEdit && state.shiftEdit.shift ? state.shiftEdit.shift.kode : '',
      targetNamaShift: state.shiftEdit && state.shiftEdit.shift ? state.shiftEdit.shift.nama : '',
      namaShift: String(($('shiftNama')||{}).value||'').trim(),
      outlet: String(($('shiftOutlet')||{}).value||'').trim(),
      jamMasuk: String(($('shiftMasuk')||{}).value||'').trim(),
      jamPulang: String(($('shiftPulang')||{}).value||'').trim(),
      toleransiKeterlambatan: String(($('shiftToleransi')||{}).value||'').trim(),
      istirahat: String(($('shiftIstirahat')||{}).value||'0 Jam').trim(),
      hitungLemburAwal: String(($('shiftLemburAwal')||{}).value||'TIDAK').trim(),
      hitungLemburAkhir: String(($('shiftLemburAkhir')||{}).value||'TIDAK').trim(),
      minimalLemburMenit: String(($('shiftMinimalLembur')||{}).value||'60 Menit').trim(),
      pembulatanLemburMenit: String(($('shiftPembulatanMenit')||{}).value||'60 Menit').trim(),
      metodePembulatanLembur: String(($('shiftMetodePembulatan')||{}).value||'TURUN').trim(),
      status: String(($('shiftStatus')||{}).value||'AKTIF').trim(),
      catatan: String(($('shiftCatatan')||{}).value||'').trim()
    };
  }
  function setHrFormMode(mode){
    var modal=$('hrFormModal'); if(modal) modal.dataset.mode=mode||'karyawan';
    var formK=$('hrKaryawanGenericForm'), formS=$('hrShiftForm'), note=$('hrShiftFormNote');
    if(formK) formK.classList.toggle('hidden', mode==='shift');
    if(formS) formS.classList.toggle('hidden', mode!=='shift');
    if(note) note.classList.toggle('hidden', mode!=='shift');
    var box=modal?modal.querySelector('.hr-form-modal'):null;
    if(box) box.classList.toggle('is-shift-mode', mode==='shift');
  }
  function ensureOption(selectId,value){
    var el=$(selectId), v=String(value||'').trim(); if(!el || !v) return;
    var ok=Array.prototype.some.call(el.options,function(opt){ return String(opt.value||opt.text).toLowerCase()===v.toLowerCase(); });
    if(!ok){ var opt=document.createElement('option'); opt.value=v; opt.textContent=v; el.appendChild(opt); }
  }
  function openShiftModal(shift,idx){
    state.shiftEdit={shift:shift||null,index:(idx==null?-1:idx)};
    setHrFormMode('shift');
    setText('hrFormTitle', shift?'Edit Shift Kerja':'Tambah Shift Kerja');
    setText('hrFormSubtitle', shift?'Ubah master ID_SHIFT lengkap: outlet, jam kerja, toleransi, istirahat, dan aturan lembur.':'Isi master ID_SHIFT sesuai header sheet: Nama Shift, Outlet, Jam Masuk/Pulang, Toleransi, Istirahat, dan aturan lembur.');
    renderShiftOutletOptions();
    var s=shift||{};
    var set=function(id,val){ var el=$(id); if(el) el.value=val==null?'':String(val); };
    set('shiftNama', s.nama&&s.nama!=='-'?s.nama:'');
    ensureOption('shiftOutlet', s.outlet&&s.outlet!=='-'?s.outlet:''); set('shiftOutlet', s.outlet&&s.outlet!=='-'?s.outlet:'');
    set('shiftMasuk', toTimeValue(s.masuk));
    set('shiftPulang', toTimeValue(s.pulang));
    set('shiftToleransi', s.toleransi&&s.toleransi!=='-'?s.toleransi:'5 Menit');
    set('shiftIstirahat', s.istirahat&&s.istirahat!=='-'?s.istirahat:'0 Jam');
    set('shiftLemburAwal', /YA|TRUE/i.test(String(s.lemburAwal||''))?'YA':'TIDAK');
    set('shiftLemburAkhir', /YA|TRUE/i.test(String(s.lemburAkhir||''))?'YA':'TIDAK');
    set('shiftMinimalLembur', s.minimalLembur&&s.minimalLembur!=='-'?s.minimalLembur:'60 Menit');
    set('shiftPembulatanMenit', s.pembulatanMenit&&s.pembulatanMenit!=='-'?s.pembulatanMenit:'60 Menit');
    set('shiftMetodePembulatan', s.metodePembulatan&&s.metodePembulatan!=='-'?String(s.metodePembulatan).toUpperCase():'TURUN');
    set('shiftStatus', normStatus(s.status||'AKTIF'));
    set('shiftCatatan', val(s.raw||{},['CATATAN','Catatan','catatan','NOTE','Note'])||'');
    openModal('hrFormModal');
  }
  async function submitShiftForm(){
    var payload=getShiftPayload();
    if(!payload.namaShift){ toast('warning','Nama shift wajib diisi.'); return; }
    if(!payload.outlet){ toast('warning','Outlet shift wajib dipilih.'); return; }
    if(!payload.jamMasuk || !payload.jamPulang){ toast('warning','Jam masuk dan jam pulang wajib diisi.'); return; }
    var btn=$('btnSubmitHrForm'); if(btn){ btn.disabled=true; btn.textContent='Menyimpan...'; }
    try{
      var action=(cfg().actions&&cfg().actions.absensi&&cfg().actions.absensi.saveHrShift)||'saveHrShiftV177';
      var res=await hr(action,payload);
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Gagal menyimpan shift.');
      normalizeResponse(res); renderAll(); closeHrFormModal(); toast('success','Shift kerja berhasil disimpan ke ID_SHIFT.');
    }catch(err){
      var local=normalizeShift({'Nama Shift':payload.namaShift,'Outlet':payload.outlet,'Jam Masuk':payload.jamMasuk,'Jam Pulang':payload.jamPulang,'Toleransi Keterlambatan':payload.toleransiKeterlambatan,'Istirahat':payload.istirahat,'Hitung Lembur Awal':payload.hitungLemburAwal,'Hitung Lembur Akhir':payload.hitungLemburAkhir,'Minimal Lembur Menit':payload.minimalLemburMenit,'Pembulatan Lembur Menit':payload.pembulatanLemburMenit,'Metode Pembulatan Lembur':payload.metodePembulatanLembur,STATUS:payload.status,CATATAN:payload.catatan});
      var idx=state.shiftEdit&&state.shiftEdit.index;
      if(idx!=null && idx>=0 && state.shifts[idx]) state.shifts[idx]=local;
      else state.shifts.push(local);
      renderAll(); closeHrFormModal(); toast('warning','Belum tersimpan ke Google Sheet: '+(err.message||'gagal simpan')+'. Perubahan tampil sementara.');
    }finally{ if(btn){ btn.disabled=false; btn.textContent='Simpan'; } }
  }
  function openForm(type){
    if(type==='jadwal'){ openJadwalModal(); return; }
    if(type==='shift'){ openShiftModal(); return; }
    setHrFormMode('karyawan');
    setText('hrFormTitle','Tambah Karyawan');
    setText('hrFormSubtitle','Form karyawan disiapkan. Pengaturan user login tetap mengikuti APJ_CORE_USER.');
    openModal('hrFormModal');
  }
  function buildDayGrid(){
    var grid=$('jadwalDayGrid'); if(!grid) return;
    var max=currentJadwalMaxDay();
    grid.innerHTML='';
    for(var d=1; d<=max; d++){
      var btn=document.createElement('button');
      btn.type='button'; btn.className='hr-day-btn'; btn.setAttribute('data-jadwal-day',String(d)); btn.setAttribute('data-day-state','off'); btn.textContent=String(d);
      btn.addEventListener('click',function(){ cycleDayState(this); });
      grid.appendChild(btn);
    }
    updateSelectedDaysInfo();
  }
  function getJadwalDayStates(){
    return Array.prototype.slice.call(document.querySelectorAll('#jadwalDayGrid [data-jadwal-day]')).map(function(btn){ return { day:Number(btn.getAttribute('data-jadwal-day')), state:String(btn.getAttribute('data-day-state')||'off') }; }).filter(function(x){ return x.day; });
  }
  function selectedJadwalDays(){ return getJadwalDayStates().filter(function(x){ return x.state!=='off'; }).map(function(x){ return x.day; }).sort(function(a,b){ return a-b; }); }
  function selectedJadwalWorkDays(){ return getJadwalDayStates().filter(function(x){ return x.state==='work'; }).map(function(x){ return x.day; }).sort(function(a,b){ return a-b; }); }
  function selectedJadwalLiburDays(){ return getJadwalDayStates().filter(function(x){ return x.state==='libur'; }).map(function(x){ return x.day; }).sort(function(a,b){ return a-b; }); }
  function selectedJadwalAlpaDays(){ return getJadwalDayStates().filter(function(x){ return x.state==='alpa'; }).map(function(x){ return x.day; }).sort(function(a,b){ return a-b; }); }
  function selectedJadwalIzinDays(){ return getJadwalDayStates().filter(function(x){ return x.state==='izin'; }).map(function(x){ return x.day; }).sort(function(a,b){ return a-b; }); }
  function applyDayState(btn,state){
    if(!btn) return;
    state=['work','libur','alpa','izin'].indexOf(state)>=0?state:'off';
    btn.setAttribute('data-day-state',state);
    btn.classList.toggle('is-work',state==='work');
    btn.classList.toggle('is-libur',state==='libur');
    btn.classList.toggle('is-alpa',state==='alpa');
    btn.classList.toggle('is-izin',state==='izin');
    btn.setAttribute('aria-pressed',state==='off'?'false':'true');
    btn.title=state==='work'?'Masuk kerja':(state==='libur'?'LIBUR':(state==='alpa'?'ALPA':(state==='izin'?'IZIN':'Belum dipilih')));
  }
  function cycleDayState(btn){
    var cur=String(btn.getAttribute('data-day-state')||'off');
    var next=cur==='off'?'work':(cur==='work'?'libur':(cur==='libur'?'alpa':(cur==='alpa'?'izin':'off')));
    applyDayState(btn,next);
    updateSelectedDaysInfo();
  }
  function updateSelectedDaysInfo(){
    var work=selectedJadwalWorkDays().length;
    var libur=selectedJadwalLiburDays().length;
    var alpa=selectedJadwalAlpaDays().length;
    var izin=selectedJadwalIzinDays().length;
    var total=work+libur+alpa+izin;
    var el=$('jadwalDaysInfo'); if(!el) return;
    el.textContent=total ? (work+' kerja, '+libur+' libur, '+alpa+' alpa, '+izin+' izin dipilih. Klik: biru→abu→merah→kuning→kosong.') : 'Belum ada tanggal dipilih.';
  }
  function setDaysPreset(mode){
    var max=currentJadwalMaxDay();
    document.querySelectorAll('#jadwalDayGrid [data-jadwal-day]').forEach(function(btn){
      var d=Number(btn.getAttribute('data-jadwal-day'));
      var on = mode==='all' ? d<=max : mode==='1-15' ? d>=1 && d<=Math.min(15,max) : mode==='16-31' ? d>=16 && d<=max : false;
      applyDayState(btn,on?'work':'off');
    });
    updateSelectedDaysInfo();
  }
  function setDayStates(dayMapOrDays){
    var map={};
    if(Array.isArray(dayMapOrDays)) dayMapOrDays.forEach(function(d){ map[Number(d)]='work'; });
    else Object.keys(dayMapOrDays||{}).forEach(function(d){ var v=String(dayMapOrDays[d]||'').trim(); var up=v.toUpperCase(); map[Number(d)]=up==='LIBUR'?'libur':(up==='ALPA'?'alpa':(up==='IZIN'?'izin':(v?'work':'off'))); });
    document.querySelectorAll('#jadwalDayGrid [data-jadwal-day]').forEach(function(btn){ var d=Number(btn.getAttribute('data-jadwal-day')); applyDayState(btn,map[d]||'off'); });
    updateSelectedDaysInfo();
  }
  function refreshDayGridKeepState(){
    var prev={}; getJadwalDayStates().forEach(function(x){ if(x.state!=='off') prev[x.day]=x.state; });
    buildDayGrid(); setDayStates(prev);
  }
  function syncJadwalUser(){
    var user=findUserByKey(($('jadwalNama')||{}).value||'');
    if(!user) return;
    var outlet=$('jadwalOutlet');
    if(outlet && !outlet.value){
      var userOutlet=(user.outlet&&user.outlet!=='-'?user.outlet:'') || ((user.outletAkses||[])[0]||'');
      setSelectValueLoose('jadwalOutlet',userOutlet);
    }
  }
  function syncJadwalShiftJam(){
    var valShift=String(($('jadwalShift')||{}).value||'').trim();
    var jam=$('jadwalJam'); if(!jam) return;
    if(['LIBUR','ALPA','IZIN'].indexOf(valShift.toUpperCase())>=0){ jam.value=valShift.toUpperCase(); return; }
    if(valShift.toUpperCase()==='KOSONGKAN'){ jam.value='Tanggal dipilih akan dikosongkan'; return; }
    var sh=shiftByValue(valShift);
    jam.value=sh && (sh.masuk || sh.pulang) ? [sh.masuk||'',sh.pulang||''].filter(Boolean).join(' - ') : '';
  }
  function selectJadwalUserForGroup(group){
    var sel=$('jadwalNama'); if(!sel) return;
    if(!group){ sel.value=''; return; }
    var candidates=[group.username,group.nama].filter(Boolean).map(function(x){ return String(x).trim().toLowerCase(); });
    var found='';
    Array.prototype.some.call(sel.options,function(opt){
      var v=String(opt.value||'').trim().toLowerCase();
      var t=String(opt.textContent||'').trim().toLowerCase();
      if(candidates.some(function(c){ return c && (v===c || t.indexOf(c)>=0); })){ found=opt.value; return true; }
      return false;
    });
    sel.value=found;
  }

  function selectOptionsHtml(items,selected,placeholder){
    selected=String(selected||'').trim();
    var opts='<option value="">'+esc(placeholder||'Pilih')+'</option>';
    (items||[]).forEach(function(item){
      var value=String(item.value!==undefined?item.value:item).trim();
      var label=String(item.label!==undefined?item.label:item).trim();
      var sel=value.toLowerCase()===selected.toLowerCase() || label.toLowerCase()===selected.toLowerCase() ? ' selected' : '';
      opts+='<option value="'+esc(value)+'"'+sel+'>'+esc(label)+'</option>';
    });
    return opts;
  }
  function segmentOutletItems(){
    var users=state.users||[];
    return uniq((state.outlets||[]).concat(users.map(function(u){return u.outlet;}).filter(Boolean))).map(function(o){ return {value:o,label:o}; });
  }
  function segmentShiftItems(){
    var arr=[{value:'LIBUR',label:'LIBUR'},{value:'ALPA',label:'ALPA'},{value:'IZIN',label:'IZIN'},{value:'KOSONGKAN',label:'Kosongkan / Hapus Jadwal'}];
    return arr.concat((state.shifts||[]).map(function(sh){ return {value:shiftValue(sh),label:shiftShortLabel(sh)}; }));
  }
  function setSelectLooseElement(el,value){
    if(!el) return; var val=String(value||'').trim();
    if(!val){ el.value=''; return; }
    var found='';
    Array.prototype.some.call(el.options,function(opt){
      var ov=String(opt.value||'').trim(), ot=String(opt.textContent||'').trim();
      if(ov===val || ov.toLowerCase()===val.toLowerCase() || ot.toLowerCase()===val.toLowerCase()){ found=opt.value; return true; }
      return false;
    });
    if(!found){ var opt=document.createElement('option'); opt.value=val; opt.textContent=val; el.appendChild(opt); found=val; }
    el.value=found;
  }
  function refreshSegmentOptions(){
    document.querySelectorAll('#jadwalSegmentRows [data-segment-row]').forEach(function(row){
      var outlet=row.querySelector('[data-segment-outlet]'), shift=row.querySelector('[data-segment-shift]');
      var ov=outlet?outlet.value:'', sv=shift?shift.value:'';
      if(outlet){ outlet.innerHTML=selectOptionsHtml(segmentOutletItems(),ov,'Pilih Outlet'); setSelectLooseElement(outlet,ov); }
      if(shift){ shift.innerHTML=selectOptionsHtml(segmentShiftItems(),sv,'Pilih Shift'); setSelectLooseElement(shift,sv); }
    });
  }
  function renderSegmentEmpty(){
    var box=$('jadwalSegmentRows'); if(!box) return;
    if(!box.querySelector('[data-segment-row]')) box.innerHTML='<div class="hr-segment-empty">Belum ada baris langsung. Klik <strong>+ Baris</strong> untuk input beberapa shift/outlet sekaligus, atau pakai grid tanggal di kanan seperti biasa.</div>';
  }
  function clearJadwalSegments(){ var box=$('jadwalSegmentRows'); if(box) box.innerHTML=''; renderSegmentEmpty(); }
  function addJadwalSegment(data){
    var box=$('jadwalSegmentRows'); if(!box) return;
    data=data||{};
    var empty=box.querySelector('.hr-segment-empty'); if(empty) empty.remove();
    var row=document.createElement('div'); row.className='hr-segment-row'; row.setAttribute('data-segment-row','1');
    row.innerHTML=''+
      '<label><span>Outlet</span><select data-segment-outlet>'+selectOptionsHtml(segmentOutletItems(),data.outlet||(($('jadwalOutlet')||{}).value||''),'Pilih Outlet')+'</select></label>'+      '<label><span>Shift / Libur</span><select data-segment-shift>'+selectOptionsHtml(segmentShiftItems(),data.shift||'','Pilih Shift')+'</select></label>'+      '<label><span>Dari</span><input data-segment-start type="number" min="1" max="31" value="'+esc(data.start||'')+'" placeholder="1"/></label>'+      '<label><span>Sampai</span><input data-segment-end type="number" min="1" max="31" value="'+esc(data.end||'')+'" placeholder="7"/></label>'+      '<button class="hr-segment-remove" type="button" data-remove-segment aria-label="Hapus baris jadwal">×</button>';
    box.appendChild(row);
    setSelectLooseElement(row.querySelector('[data-segment-outlet]'),data.outlet||(($('jadwalOutlet')||{}).value||''));
    setSelectLooseElement(row.querySelector('[data-segment-shift]'),data.shift||'');
  }
  function compressDaysToRanges(days){
    days=(days||[]).map(Number).filter(Boolean).sort(function(a,b){return a-b;});
    var out=[]; if(!days.length) return out;
    var start=days[0], prev=days[0];
    for(var i=1;i<days.length;i++){
      if(days[i]===prev+1){ prev=days[i]; continue; }
      out.push({start:start,end:prev}); start=prev=days[i];
    }
    out.push({start:start,end:prev}); return out;
  }
  function initSegmentsForGroup(group){
    clearJadwalSegments();
    if(!group){ return; }
    var added=0;
    Object.keys(group.shiftDays||{}).forEach(function(shiftName){
      compressDaysToRanges(group.shiftDays[shiftName]||[]).forEach(function(r){ addJadwalSegment({outlet:group.outlet,shift:shiftName,start:r.start,end:r.end}); added++; });
    });
    if(!added) renderSegmentEmpty();
  }
  function readJadwalSegments(){
    var max=currentJadwalMaxDay();
    var rows=Array.prototype.slice.call(document.querySelectorAll('#jadwalSegmentRows [data-segment-row]'));
    var segments=[];
    rows.forEach(function(row){
      var outlet=String((row.querySelector('[data-segment-outlet]')||{}).value||'').trim();
      var shiftVal=String((row.querySelector('[data-segment-shift]')||{}).value||'').trim();
      var start=Number((row.querySelector('[data-segment-start]')||{}).value||0);
      var end=Number((row.querySelector('[data-segment-end]')||{}).value||0);
      if(!outlet && !shiftVal && !start && !end) return;
      if(!outlet || !shiftVal || !start || !end) throw new Error('Lengkapi outlet, shift, tanggal awal, dan tanggal akhir pada semua baris jadwal langsung.');
      if(start<1 || end<1 || start>max || end>max) throw new Error('Tanggal baris jadwal langsung harus berada di 1 sampai '+max+' sesuai bulan/tahun.');
      if(end<start) throw new Error('Tanggal akhir tidak boleh lebih kecil dari tanggal awal.');
      var days=[]; for(var d=start; d<=end; d++) days.push(d);
      var sh=shiftByValue(shiftVal);
      var up=shiftVal.toUpperCase();
      var shiftName=['LIBUR','ALPA','IZIN'].indexOf(up)>=0?up:(up==='KOSONGKAN'?'KOSONGKAN':((sh&&(sh.nama||sh.kode))||shiftVal));
      segments.push({outlet:outlet,shift:shiftName,kodeShift:(sh&&sh.kode)||shiftVal,startDay:start,endDay:end,tanggal:days,days:days});
    });
    return segments;
  }
  function applySegmentsLocal(data,segments){
    (segments||[]).forEach(function(seg){
      var selectedSet={}; (seg.days||seg.tanggal||[]).forEach(function(d){ selectedSet[Number(d)]=true; });
      var clearMode=String(seg.shift||'').toUpperCase()==='KOSONGKAN';
      state.jadwal=(state.jadwal||[]).filter(function(j){ var p=parseJadwalDateText(j.hari||j.tanggal); return !(String(j.username||'').toLowerCase()===String(data.usernameKaryawan||'').toLowerCase() && String(j.outlet||'').toLowerCase()===String(seg.outlet||'').toLowerCase() && String(p.bulan||'').toLowerCase()===String(data.bulan||'').toLowerCase() && String(p.tahun||'')===String(data.tahun||'') && selectedSet[Number(p.day)]); });
      if(clearMode) return;
      var jam=''; var sh=shiftByValue(seg.kodeShift||seg.shift); if(sh) jam=[sh.masuk||'',sh.pulang||''].filter(Boolean).join(' - ');
      (seg.days||seg.tanggal||[]).forEach(function(d){ state.jadwal.push(normalizeJadwal({nama:data.namaKaryawan,username:data.usernameKaryawan,outlet:seg.outlet,hari:d+' '+data.bulan+' '+data.tahun,shift:seg.shift,jam:['LIBUR','ALPA','IZIN'].indexOf(String(seg.shift||'').toUpperCase())>=0?'-':jam,status:data.status,catatan:data.catatan||'-'})); });
    });
  }
  function cleanupLocalPreviousJadwal(data){
    var userKey=String(data.usernameKaryawan||data.namaKaryawan||'').toLowerCase();
    var bulan=String(data.bulan||'').toLowerCase();
    var tahun=String(data.tahun||'');
    if(!userKey || !bulan || !tahun) return;
    state.jadwal=(state.jadwal||[]).filter(function(j){
      var p=parseJadwalDateText(j.hari||j.tanggal);
      var sameUser=String(j.username||j.nama||'').toLowerCase()===userKey || String(j.nama||'').toLowerCase()===String(data.namaKaryawan||'').toLowerCase();
      if(!sameUser) return true;
      return String(p.bulan||'').toLowerCase()===bulan && String(p.tahun||'')===tahun;
    });
  }
  function openJadwalModal(group){
    renderFilters();
    var now=new Date();
    state.jadwalEdit=group||null;
    setText('jadwalFormTitle', group?'Edit Jadwal Karyawan':'Tambah Jadwal Karyawan');
    setText('jadwalFormSubtitle', group?'Edit baris jadwal langsung, atau pakai grid tanggal untuk koreksi manual: kerja, libur, alpa, izin.':'Isi beberapa baris langsung: outlet, shift/status, tanggal awal, tanggal akhir. Cocok untuk 1 orang dengan banyak shift/outlet.');
    setText('btnSubmitJadwalForm', group?'Update Jadwal':'Simpan Jadwal');
    setValue('jadwalBulan',group?(group.bulan||MONTHS_ID[now.getMonth()]):MONTHS_ID[now.getMonth()]||'Januari');
    setValue('jadwalTahun',group?(group.tahun||now.getFullYear()):now.getFullYear());
    buildDayGrid();
    selectJadwalUserForGroup(group);
    if(group){ setSelectValueLoose('jadwalOutlet',group.outlet||''); }
    else { setSelectValueLoose('jadwalOutlet',''); syncJadwalUser(); }
    setValue('jadwalShift',''); setValue('jadwalStatus',group?(group.status||'AKTIF'):'AKTIF'); setValue('jadwalCatatan',group?(group.catatan&&group.catatan!=='-'?group.catatan:''):''); setValue('jadwalJam','');
    setDayStates(group?(group.days||{}):{});
    initSegmentsForGroup(group);
    openModal('hrJadwalModal');
  }

  function getSelectedJadwalUser(){
    var sel=$('jadwalNama');
    var key=String((sel||{}).value||'').trim();
    var user=findUserByKey(key);
    if(!user && sel && sel.selectedIndex>=0){
      var txt=String(sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent || '').toLowerCase();
      user=(state.users||[]).find(function(u){ return (u.nama && txt.indexOf(String(u.nama).toLowerCase())>=0) || (u.username && txt.indexOf(String(u.username).toLowerCase())>=0); });
    }
    if(!user && state.jadwalEdit){
      user=findUserByKey(state.jadwalEdit.username||state.jadwalEdit.nama) || normalizeUser({nama:state.jadwalEdit.nama,username:state.jadwalEdit.username,level:'',outlet:state.jadwalEdit.outlet,status:'AKTIF'});
    }
    return user;
  }

  async function submitJadwalForm(){
    var user=getSelectedJadwalUser();
    var segments=[];
    try{ segments=readJadwalSegments(); }catch(segErr){ toast('warning',segErr.message||'Periksa baris jadwal langsung.'); return; }
    var selected=selectedJadwalDays();
    var workDays=selectedJadwalWorkDays();
    var liburDays=selectedJadwalLiburDays();
    var alpaDays=selectedJadwalAlpaDays();
    var izinDays=selectedJadwalIzinDays();
    var shiftVal=String(($('jadwalShift')||{}).value||'').trim();
    var shift=shiftByValue(shiftVal);
    var clearMode=shiftVal.toUpperCase()==='KOSONGKAN';
    var forceLibur=shiftVal.toUpperCase()==='LIBUR';
    var forceAlpa=shiftVal.toUpperCase()==='ALPA';
    var forceIzin=shiftVal.toUpperCase()==='IZIN';
    var shiftName=forceLibur ? 'LIBUR' : (forceAlpa ? 'ALPA' : (forceIzin ? 'IZIN' : (clearMode ? 'KOSONGKAN' : ((shift && (shift.nama||shift.namaShift||shift.kode||shift.kodeShift)) || shiftVal))));
    if(forceLibur){ liburDays=selected.slice(); workDays=[]; alpaDays=[]; izinDays=[]; }
    if(forceAlpa){ alpaDays=selected.slice(); workDays=[]; liburDays=[]; izinDays=[]; }
    if(forceIzin){ izinDays=selected.slice(); workDays=[]; liburDays=[]; alpaDays=[]; }
    if(clearMode){ workDays=selected.slice(); liburDays=[]; alpaDays=[]; izinDays=[]; }
    var jadwalMap={};
    selected.forEach(function(d){
      if(clearMode) jadwalMap[d]='';
      else if(forceLibur || liburDays.indexOf(d)>=0) jadwalMap[d]='LIBUR';
      else if(forceAlpa || alpaDays.indexOf(d)>=0) jadwalMap[d]='ALPA';
      else if(forceIzin || izinDays.indexOf(d)>=0) jadwalMap[d]='IZIN';
      else jadwalMap[d]=shiftName;
    });
    var data={
      usernameKaryawan:user&&user.username||'',
      namaKaryawan:user&&user.nama||'',
      outlet:String(($('jadwalOutlet')||{}).value||'').trim(),
      bulan:String(($('jadwalBulan')||{}).value||'').trim(),
      tahun:String(($('jadwalTahun')||{}).value||'').trim(),
      shift:shiftName,
      kodeShift:shift&&shift.kode||shiftVal,
      tanggal:selected,
      days:selected,
      workDays:workDays,
      liburDays:liburDays,
      alpaDays:alpaDays,
      izinDays:izinDays,
      jadwalMap:jadwalMap,
      segments:segments,
      multiSegments:segments.length>0,
      replaceOldJadwal:true,
      replaceMode:'same-user-keep-current-period',
      status:String(($('jadwalStatus')||{}).value||'AKTIF').trim(),
      catatan:String(($('jadwalCatatan')||{}).value||'').trim()
    };
    if(!user){ toast('warning','Pilih nama karyawan dari dropdown dulu.'); return; }
    if(!data.bulan || !data.tahun){ toast('warning','Bulan dan tahun wajib diisi.'); return; }
    if(segments.length){
      var hasSegDays=segments.some(function(seg){ return (seg.days||[]).length; });
      if(!hasSegDays){ toast('warning','Isi minimal satu baris jadwal langsung.'); return; }
    }else{
      if(!data.outlet){ toast('warning','Pilih outlet jadwal.'); return; }
      if(!selected.length){ toast('warning','Pilih minimal satu tanggal. Biru=kerja, abu=libur, merah=alpa, kuning=izin.'); return; }
      if(!clearMode && workDays.length && !shiftName){ toast('warning','Pilih shift kerja untuk tanggal biru. Tanggal status tetap mengikuti warnanya.'); return; }
    }
    var btn=$('btnSubmitJadwalForm'); if(btn){ btn.disabled=true; btn.textContent='Menyimpan...'; }
    try{
      if(state.offline) throw new Error('Backend belum aktif.');
      var action=(cfg().actions&&cfg().actions.absensi&&cfg().actions.absensi.saveHrJadwal)||'saveHrJadwalV167';
      var res=await hr(action,data);
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Gagal menyimpan jadwal.');
      normalizeResponse(res); state.offline=false; renderAll(); closeHrJadwalModal(); setTab('jadwal');
      toast('success',segments.length?'Jadwal langsung berhasil disimpan ke ID_JADWAL.':'Jadwal berhasil disimpan ke ID_JADWAL.');
    }catch(err){
      cleanupLocalPreviousJadwal(data);
      if(segments.length){
        applySegmentsLocal(data,segments);
      }else{
        var selectedSet={}; selected.forEach(function(d){ selectedSet[d]=true; });
        state.jadwal=(state.jadwal||[]).filter(function(j){ var p=parseJadwalDateText(j.hari||j.tanggal); return !(String(j.username||'').toLowerCase()===String(data.usernameKaryawan||'').toLowerCase() && String(j.outlet||'').toLowerCase()===String(data.outlet||'').toLowerCase() && String(p.bulan||'').toLowerCase()===String(data.bulan||'').toLowerCase() && String(p.tahun||'')===String(data.tahun||'') && selectedSet[Number(p.day)]); });
        if(!clearMode){ Object.keys(jadwalMap).forEach(function(d){ var v=jadwalMap[d]; if(!v) return; state.jadwal.push(normalizeJadwal({nama:data.namaKaryawan,username:data.usernameKaryawan,outlet:data.outlet,hari:d+' '+data.bulan+' '+data.tahun,shift:v,jam:['LIBUR','ALPA','IZIN'].indexOf(String(v||'').toUpperCase())>=0?'-':(($('jadwalJam')||{}).value||''),status:data.status,catatan:data.catatan||'-'})); }); }
      }
      renderAll(); closeHrJadwalModal(); setTab('jadwal');
      toast('warning','Belum tersimpan ke Google Sheet: '+(err.message||'gagal simpan')+'. Jadwal hanya tampil sementara.');
    }finally{
      if(btn){ btn.disabled=false; btn.textContent=state.jadwalEdit?'Update Jadwal':'Simpan Jadwal'; }
    }
  }
  function listDays(days){ return (days||[]).length ? days.join(', ') : '-'; }
  function renderShiftDetail(g){
    var keys=Object.keys((g&&g.shiftDays)||{}).sort(function(a,b){ return ((g.shiftDays[b]||[]).length)-((g.shiftDays[a]||[]).length); });
    if(!keys.length) return '<div class="hr-detail-raw-empty">Belum ada rincian shift.</div>';
    return keys.map(function(k){ return '<div class="hr-schedule-detail-line"><strong>'+esc(k)+'</strong><span>'+esc((g.shiftDays[k]||[]).length)+' hari: '+esc(listDays(g.shiftDays[k]||[]))+'</span></div>'; }).join('');
  }
  function openJadwalDetail(index){
    var g=groupedJadwal()[Number(index)]; if(!g) return;
    state.jadwalDetail=g; state.jadwalDetailIndex=Number(index);
    setText('jadwalDetailTitle',(g.nama||'-')+' · '+(g.outlet||'-'));
    setText('jadwalDetailSubtitle',[g.bulan,g.tahun].filter(Boolean).join(' ')||'-');
    var meta=$('jadwalDetailMeta');
    if(meta) meta.innerHTML='<span class="hr-pill is-active">'+esc(g.status||'-')+'</span><span class="hr-status-note hr-status-note-soft">Kerja '+esc(g.workDays.length)+' hari</span><span class="hr-status-note hr-status-note-soft">Libur '+esc(g.liburDays.length)+' hari</span><span class="hr-status-note hr-status-note-danger">Alpa '+esc((g.alpaDays||[]).length)+' hari</span><span class="hr-status-note hr-status-note-warn">Izin '+esc((g.izinDays||[]).length)+' hari</span>';
    var work=$('jadwalDetailWorkList'); if(work) work.textContent=listDays(g.workDays||[]);
    var libur=$('jadwalDetailLiburList'); if(libur) libur.textContent=listDays(g.liburDays||[]);
    var alpa=$('jadwalDetailAlpaList'); if(alpa) alpa.textContent=listDays(g.alpaDays||[]);
    var izin=$('jadwalDetailIzinList'); if(izin) izin.textContent=listDays(g.izinDays||[]);
    var shift=$('jadwalDetailShiftList'); if(shift) shift.innerHTML=renderShiftDetail(g);
    openModal('hrJadwalDetailModal');
  }
  function closeHrJadwalDetailModal(){ closeModal('hrJadwalDetailModal'); }
  async function exportJadwalPdf(){
    var period=currentExportPeriod();
    if(!period.bulan || !period.tahun){ toast('warning','Pilih bulan dan tahun untuk export PDF jadwal.'); return; }
    var btn=$('btnExportJadwalPdf');
    if(btn){ btn.disabled=true; btn.textContent='Membuat PDF...'; }
    try{
      var action=(cfg().actions&&cfg().actions.absensi&&cfg().actions.absensi.exportHrJadwalPdf)||'exportHrJadwalPdfV167';
      var res=await hr(action,{bulan:period.bulan,tahun:period.tahun});
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Gagal membuat PDF jadwal.');
      toast('success','PDF jadwal berhasil dibuat di Drive: '+(res.fileName||''));
      if(res.url){ window.open(res.url,'_blank'); }
    }catch(err){
      toast('warning','Export PDF gagal: '+(err.message||'cek backend/deployment Apps Script.'));
    }finally{
      if(btn){ btn.disabled=false; btn.textContent='Export PDF'; }
    }
  }
  function exportCsv(){
    var rows=filteredUsers(); if(!rows.length){ toast('warning','Tidak ada data karyawan untuk diexport.'); return; }
    var header=['Nama','Username','Level','Outlet Utama','Akses Outlet','Status'];
    var lines=[header.map(csvCell).join(',')];
    rows.forEach(function(u){ lines.push([u.nama,u.username,u.level,u.outlet,(u.outletAkses||[]).join('|'),u.status].map(csvCell).join(',')); });
    var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='data-karyawan-apj.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function csvCell(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; }
  function bind(){
    document.querySelectorAll('.hr-tab').forEach(function(btn){ btn.addEventListener('click',function(){ setTab(btn.getAttribute('data-tab')); }); });
    ['filterCari','filterOutlet','filterStatus','filterLevel'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('change',function(){ renderKaryawan(); renderAkses(); }); });
    var reset=$('btnResetFilter'); if(reset) reset.addEventListener('click',resetFilter);
    var refresh=$('btnRefreshHr'); if(refresh) refresh.addEventListener('click',function(){ loadData(true); });
    var addK=$('btnOpenKaryawanModal'); if(addK) addK.addEventListener('click',function(){ openForm('karyawan'); });
    var addS=$('btnOpenShiftModal'); if(addS) addS.addEventListener('click',function(){ openForm('shift'); });
    var addJ=$('btnOpenJadwalModal'); if(addJ) addJ.addEventListener('click',function(){ openJadwalModal(); });
    var submit=$('btnSubmitHrForm'); if(submit) submit.addEventListener('click',function(){ var modal=$('hrFormModal'); if(modal && modal.dataset.mode==='shift') submitShiftForm(); else toast('info','Tambah karyawan baru belum diaktifkan dari form ini. Edit data karyawan melalui tombol Detail.'); });
    var submitJ=$('btnSubmitJadwalForm'); if(submitJ) submitJ.addEventListener('click',submitJadwalForm);
    var addSeg=$('btnAddJadwalSegment'); if(addSeg) addSeg.addEventListener('click',function(){ addJadwalSegment({start:1,end:Math.min(7,currentJadwalMaxDay())}); });
    var clearSeg=$('btnClearJadwalSegments'); if(clearSeg) clearSeg.addEventListener('click',clearJadwalSegments);
    var jNama=$('jadwalNama'); if(jNama) jNama.addEventListener('change',syncJadwalUser);
    var jShift=$('jadwalShift'); if(jShift) jShift.addEventListener('change',syncJadwalShiftJam);
    var jBulan=$('jadwalBulan'); if(jBulan) jBulan.addEventListener('change',refreshDayGridKeepState);
    var jTahun=$('jadwalTahun'); if(jTahun) jTahun.addEventListener('input',refreshDayGridKeepState);
    document.querySelectorAll('[data-days-preset]').forEach(function(btn){ btn.addEventListener('click',function(){ setDaysPreset(btn.getAttribute('data-days-preset')); }); });
    var detailEdit=$('btnDetailEdit'); if(detailEdit) detailEdit.addEventListener('click',function(){ setDetailEditing(!state.detailEditing); if(state.detailUser && !state.detailEditing) populateDetail(state.detailUser); });
    var detailSave=$('btnDetailSave'); if(detailSave) detailSave.addEventListener('click',saveDetailLocal);
    var csv=$('btnExportKaryawanCsv'); if(csv) csv.addEventListener('click',exportCsv);
    var expJ=$('btnExportJadwalPdf'); if(expJ) expJ.addEventListener('click',exportJadwalPdf);
    var note=$('btnCopyAccessNote'); if(note) note.addEventListener('click',function(){ toast('info','Akses outlet dibaca dari OUTLET_UTAMA dan OUTLET_AKSES pada data user.'); });
    document.addEventListener('click',function(e){
      var removeSeg=e.target.closest('[data-remove-segment]'); if(removeSeg){ var row=removeSeg.closest('[data-segment-row]'); if(row) row.remove(); renderSegmentEmpty(); return; }
      var btn=e.target.closest('[data-detail-user]'); if(btn){ openUserDetail(btn.getAttribute('data-detail-user')); return; }
      var detailJ=e.target.closest('[data-detail-jadwal]'); if(detailJ){ openJadwalDetail(detailJ.getAttribute('data-detail-jadwal')); return; }
      var editShift=e.target.closest('[data-edit-shift]'); if(editShift){ var si=Number(editShift.getAttribute('data-edit-shift')); if(state.shifts[si]) openShiftModal(state.shifts[si],si); return; }
      var edit=e.target.closest('[data-edit-jadwal]'); if(edit){ var g=groupedJadwal()[Number(edit.getAttribute('data-edit-jadwal'))]; if(g) openJadwalModal(g); }
    });
  }
  function initUser(){ if(window.APJAuth && !APJAuth.requireLogin()) return false; state.session=getSession(); var name=state.session.name||state.session.username||'Pengguna'; setText('displayNama',name); setText('displayLevel',state.session.level||'--'); setText('displayInisial',(name.trim().charAt(0)||'U').toUpperCase()); return true; }
  function initSidebar(){ document.querySelectorAll('[data-menu-toggle]').forEach(function(btn){ if(btn.dataset.apjBound==='Y') return; btn.dataset.apjBound='Y'; btn.addEventListener('click',function(){ var group=btn.closest('.nav-group'); if(!group) return; group.classList.toggle('open'); btn.setAttribute('aria-expanded',group.classList.contains('open')?'true':'false'); }); }); applySidebarState(); document.querySelectorAll('#sidebar a[href]:not(.nav-coming-soon)').forEach(function(link){ if(link.dataset.closeBound==='Y') return; link.dataset.closeBound='Y'; link.addEventListener('click',function(){ closeMobileSidebar(); }); }); }
  function openMobileSidebar(){ var sidebar=$('sidebar'), backdrop=$('sidebarBackdrop'); if(sidebar) sidebar.classList.remove('-translate-x-full'); if(backdrop) backdrop.classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function closeMobileSidebar(){ var sidebar=$('sidebar'), backdrop=$('sidebarBackdrop'); if(sidebar) sidebar.classList.add('-translate-x-full'); if(backdrop) backdrop.classList.add('hidden'); document.body.style.overflow=''; }
  function applySidebarState(){ var sidebar=$('sidebar'); if(!sidebar) return; var collapsed=localStorage.getItem(SIDEBAR_KEY)==='true' && window.innerWidth>=1024; sidebar.classList.toggle('sidebar-collapsed',collapsed); document.body.classList.toggle('sidebar-collapsed-active',collapsed); }
  function toggleSidebarCollapse(){ var sidebar=$('sidebar'); if(!sidebar || window.innerWidth<1024) return; var next=!sidebar.classList.contains('sidebar-collapsed'); localStorage.setItem(SIDEBAR_KEY,next?'true':'false'); applySidebarState(); }
  function openModal(id){ var modal=$(id); if(!modal) return; modal.classList.remove('hidden'); requestAnimationFrame(function(){ var overlay=modal.querySelector('.modal-overlay'); var content=modal.querySelector('.modal-content'); if(overlay) overlay.classList.remove('opacity-0'); if(content) content.classList.remove('opacity-0','scale-95'); }); }
  function closeModal(id){ var modal=$(id); if(!modal) return; var overlay=modal.querySelector('.modal-overlay'); var content=modal.querySelector('.modal-content'); if(overlay) overlay.classList.add('opacity-0'); if(content) content.classList.add('opacity-0','scale-95'); setTimeout(function(){ modal.classList.add('hidden'); },160); }
  function openHrKaryawanHelpModal(autoOpen){ if (autoOpen) apjMarkGuideSeen('hr-karyawan.html'); openModal('hrKaryawanHelpModal'); }
  function closeHrKaryawanHelpModal(){ apjMarkGuideSeen('hr-karyawan.html'); closeModal('hrKaryawanHelpModal'); }
  function closeHrFormModal(){ closeModal('hrFormModal'); }
  function closeHrJadwalModal(){ closeModal('hrJadwalModal'); }
  function closeHrDetailModal(){ closeModal('hrDetailModal'); }
  function showLogoutModal(){ openModal('logoutModal'); }
  function closeLogoutModal(){ closeModal('logoutModal'); }
  async function executeLogout(){ try{ if(window.APJApi && APJApi.logout) await APJApi.logout(); }catch(e){} if(window.APJAuth && APJAuth.logout) APJAuth.logout(); else { localStorage.clear(); window.location.href=(cfg().loginPage||'index.html'); } }
  function init(){ if(!initUser()) return; initSidebar(); bind(); initJadwalExportControls(); loadData(false); }
  document.addEventListener('DOMContentLoaded',init);
  document.addEventListener('keydown',function(event){ if(event.key==='Escape'){ closeMobileSidebar(); closeHrKaryawanHelpModal(); closeHrFormModal(); closeHrJadwalModal(); closeHrJadwalDetailModal(); closeHrDetailModal(); closeLogoutModal(); } });
  window.addEventListener('resize',function(){ if(window.innerWidth>=1024) closeMobileSidebar(); applySidebarState(); });
  window.openMobileSidebar=openMobileSidebar; window.closeMobileSidebar=closeMobileSidebar; window.showLogoutModal=showLogoutModal; window.closeLogoutModal=closeLogoutModal; window.executeLogout=executeLogout; window.openHrKaryawanHelpModal=openHrKaryawanHelpModal; window.closeHrKaryawanHelpModal=closeHrKaryawanHelpModal; window.closeHrFormModal=closeHrFormModal; window.closeHrJadwalModal=closeHrJadwalModal; window.closeHrJadwalDetailModal=closeHrJadwalDetailModal; window.closeHrDetailModal=closeHrDetailModal; window.toggleSidebarCollapse=toggleSidebarCollapse;
})();
