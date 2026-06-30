
/* APJ HR REKAP ABSENSI V146 */
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

  var state = { session:null, user:null, isAdmin:false, rows:[], users:[], outlets:[], summary:null, busy:false, exportBusy:false };
  function $(id){ return document.getElementById(id); }
  function cfg(){ return window.APJ_CONFIG || {}; }
  function apiUrl(){ return cfg().absensiApiUrl || (cfg().apis && cfg().apis.absensi) || ''; }
  function escapeHtml(v){ return String(v == null ? '' : v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];}); }
  function setText(id,v){ var el=$(id); if(el) el.textContent = (v === undefined || v === null || v === '') ? '-' : String(v); }
  function toast(type,msg){ if(window.APJToast && APJToast[type]) APJToast[type](msg); else if(window.APJToast) APJToast.info(msg); else console.log(type,msg); }
  function todayKey(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function firstDayKey(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01'; }
  function getSession(){ return window.APJAuth ? APJAuth.getSession() : {}; }
  function payload(extra){ var s=state.session||getSession(); return Object.assign({ username:s.username||'', nama:s.name||'', name:s.name||'', level:s.level||'', outletUser:s.outlet||'', outletAkses:s.outletAccess||'', sessionToken:s.token||'', device:navigator.userAgent||'' }, extra||{}); }
  async function hr(action, data){ if(!apiUrl()) throw new Error('URL API HR Absensi belum diatur.'); return APJApi.absensi(action, payload(data||{})); }
  function minutesLabel(n){ n=Number(n||0); if(!n || n<0) return '0 jam 0 menit'; n=Math.round(n); return Math.floor(n/60)+' jam '+(n%60)+' menit'; }
  function hoursLabel(n){ n=Number(n||0); if(!n) return '0 jam'; if(Math.abs(n-Math.round(n))<0.001) return Math.round(n)+' jam'; return String(Math.round(n*100)/100).replace('.',',')+' jam'; }
  function statusClass(row){ var s=String((row.statusMasuk||'')+' '+(row.statusPulang||'')).toUpperCase(); if(s.indexOf('TERLAMBAT')>=0) return 'is-late'; if(s.indexOf('PULANG CEPAT')>=0 || s.indexOf('TIDAK')>=0) return 'is-warn'; if(s.indexOf('TEPAT')>=0 || s.indexOf('PULANG')>=0) return 'is-ok'; return ''; }
  function combinedStatus(row){ var a=row.statusMasuk||''; var b=row.statusPulang||''; if(a && b) return a+' / '+b; return a || b || row.status || '-'; }
  function initUser(){ if(window.APJAuth && !APJAuth.requireLogin()) return false; state.session=getSession(); var name=state.session.name||state.session.username||'Pengguna'; var initial=(name.trim().charAt(0)||'U').toUpperCase(); setText('displayNama',name); setText('displayLevel',state.session.level||'--'); setText('displayInisial',initial); return true; }
  function populateUserSelect(select, includeAll){
    if(!select) return;
    var current=select.value;
    select.innerHTML='';
    if(state.isAdmin){
      if(includeAll) select.insertAdjacentHTML('beforeend','<option value="">Semua Karyawan</option>');
      else select.insertAdjacentHTML('beforeend','<option value="">Pilih Karyawan</option>');
      state.users.forEach(function(u){ select.insertAdjacentHTML('beforeend','<option value="'+escapeHtml(u.username||u.nama)+'">'+escapeHtml(u.nama||u.username)+'</option>'); });
      select.disabled=false;
    } else {
      select.insertAdjacentHTML('beforeend','<option value="'+escapeHtml((state.user&&state.user.username)||state.session.username||'')+'">'+escapeHtml((state.user&&state.user.nama)||state.session.name||state.session.username||'Saya')+'</option>');
      select.disabled=true;
    }
    if(current) select.value=current;
  }
  function populateFilters(data){
    state.user=data.user||null; state.isAdmin=!!data.isAdmin; state.users=data.users||[]; state.outlets=data.outlets||[];
    var pill=$('rekapAccessPill'); if(pill) pill.textContent = state.isAdmin ? 'Akses semua karyawan' : 'Akses rekap pribadi';
    var userWrap=$('filterUserWrap'), userSel=$('filterUser');
    populateUserSelect(userSel, true);
    if(userWrap) userWrap.style.display='flex';
    populateUserSelect($('exportUser'), false);
    var allBtn=$('btnDoExportAllPdf'); if(allBtn) allBtn.style.display = state.isAdmin ? 'inline-flex' : 'none';
    var outletSel=$('filterOutlet'); if(outletSel){ var current=outletSel.value; outletSel.innerHTML='<option value="">Semua Outlet</option>'; state.outlets.forEach(function(o){ var name=o.outlet||o.namaOutlet||o.kodeOutlet||''; if(name) outletSel.insertAdjacentHTML('beforeend','<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>'); }); outletSel.value=current; }
  }
  function collectFilter(){ return { tanggalAwal:($('filterTanggalAwal')||{}).value||'', tanggalAkhir:($('filterTanggalAkhir')||{}).value||'', userFilter:($('filterUser')||{}).value||'', outlet:($('filterOutlet')||{}).value||'', status:($('filterStatus')||{}).value||'', limit:1000 }; }
  function collectExportFilter(){ return { tanggalAwal:($('exportTanggalAwal')||{}).value||'', tanggalAkhir:($('exportTanggalAkhir')||{}).value||'', userFilter:($('exportUser')||{}).value||'', outlet:($('filterOutlet')||{}).value||'', status:($('filterStatus')||{}).value||'' }; }
  function applySummary(summary){ summary=summary||{}; setText('sumRows',summary.totalRows||0); setText('sumHadir',summary.hadir||0); setText('sumTerlambat',summary.terlambat||0); setText('sumTidakCheckout',summary.tidakCheckout||0); setText('sumLembur',hoursLabel(summary.totalLemburJam||0)); setText('sumKerja',minutesLabel(summary.totalKerjaMenit||0)); }
  function renderRows(rows){
    var body=$('rekapTableBody'); if(!body) return; rows=rows||[];
    if(!rows.length){ body.innerHTML='<tr><td colspan="10" class="rekap-empty">Tidak ada data absensi pada filter ini.</td></tr>'; return; }
    body.innerHTML=rows.map(function(r){ return '<tr>'+ '<td>'+escapeHtml(r.tanggal||r.tanggalKey||'-')+'</td>'+ '<td>'+escapeHtml(r.nama||'-')+'</td>'+ '<td>'+escapeHtml(r.outlet||'-')+'</td>'+ '<td>'+escapeHtml(r.shift||'-')+'</td>'+ '<td>'+escapeHtml(r.jamMasuk||'-')+'</td>'+ '<td>'+escapeHtml(r.jamPulang||'-')+'</td>'+ '<td><span class="rekap-status '+statusClass(r)+'">'+escapeHtml(combinedStatus(r))+'</span></td>'+ '<td>'+escapeHtml((Number(r.terlambatMenit||0)||0)+' menit')+'</td>'+ '<td>'+escapeHtml(r.totalKerjaBersih||minutesLabel(r.totalKerjaBersihMenit||r.totalKerjaMenit||0))+'</td>'+ '<td>'+escapeHtml(r.totalLemburLabel||hoursLabel(r.totalLemburJam||0))+'</td>'+ '</tr>'; }).join('');
  }
  async function loadRekap(showMessage){
    if(state.busy) return; state.busy=true; var btn=$('btnLoadRekap'); if(btn) btn.textContent='Memuat...';
    try{
      var res=await hr('getRekapAbsensiV133', collectFilter());
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Gagal memuat rekap.');
      populateFilters(res); state.rows=res.rows||[]; state.summary=res.summary||{}; applySummary(state.summary); renderRows(state.rows);
      setText('rekapInfoText',(res.scopeText||'')+' • '+state.rows.length+' baris ditampilkan');
      if(showMessage) toast('success','Rekap absensi berhasil dimuat.');
    }catch(err){ renderRows([]); setText('rekapInfoText',err.message||'Gagal memuat rekap.'); toast('error',err.message||'Gagal memuat rekap.'); }
    finally{ state.busy=false; if(btn) btn.textContent='Tampilkan Rekap'; }
  }
  function resetFilters(){ var a=$('filterTanggalAwal'), b=$('filterTanggalAkhir'), u=$('filterUser'), o=$('filterOutlet'), st=$('filterStatus'); if(a) a.value=firstDayKey(); if(b) b.value=todayKey(); if(u && state.isAdmin) u.value=''; if(o) o.value=''; if(st) st.value=''; loadRekap(false); }
  function csvCell(v){ v=String(v==null?'':v); return '"'+v.replace(/"/g,'""')+'"'; }
  function exportCsv(){ var rows=state.rows||[]; if(!rows.length){ toast('warning','Tidak ada data untuk diexport.'); return; } var header=['Tanggal','Nama','Outlet','Shift','Masuk','Pulang','Status','Terlambat Menit','Total Kerja','Total Lembur']; var lines=[header.map(csvCell).join(',')]; rows.forEach(function(r){ lines.push([r.tanggal||r.tanggalKey||'',r.nama||'',r.outlet||'',r.shift||'',r.jamMasuk||'',r.jamPulang||'',combinedStatus(r),r.terlambatMenit||0,r.totalKerjaBersih||minutesLabel(r.totalKerjaBersihMenit||0),r.totalLemburLabel||hoursLabel(r.totalLemburJam||0)].map(csvCell).join(',')); }); var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='rekap-absensi-apj.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  function renderExportResult(res){
    var box=$('exportPdfResult'); if(!box) return;
    var files=(res&&res.files)||((res&&res.file)?[res.file]:[]);
    if(!files.length){ box.innerHTML='<p>PDF belum tersedia.</p>'; return; }
    var folderLink=res.folderUrl?'<a href="'+escapeHtml(res.folderUrl)+'" target="_blank" rel="noopener">Buka Folder Drive</a>':'';
    box.innerHTML='<p class="export-result-title">PDF berhasil dibuat '+(res.folderName?('di folder '+escapeHtml(res.folderName)):'')+'</p>'+ (folderLink?'<p>'+folderLink+'</p>':'') + '<div class="export-result-list">'+files.map(function(f){ return '<a href="'+escapeHtml(f.url||'#')+'" target="_blank" rel="noopener">'+escapeHtml(f.fileName||('PDF '+(f.nama||'')))+'</a>'; }).join('')+'</div>';
  }
  function prepareExportModal(){
    var fa=$('filterTanggalAwal'), fb=$('filterTanggalAkhir'), ea=$('exportTanggalAwal'), eb=$('exportTanggalAkhir');
    if(ea) ea.value=(fa&&fa.value)||firstDayKey();
    if(eb) eb.value=(fb&&fb.value)||todayKey();
    populateUserSelect($('exportUser'), false);
    var fu=$('filterUser'), eu=$('exportUser');
    if(eu && fu && fu.value) eu.value=fu.value;
    var res=$('exportPdfResult'); if(res) res.innerHTML='<p>Pilih periode dan karyawan, lalu tekan Export.</p>';
  }
  function openExportPdfModal(){ prepareExportModal(); openModal('exportPdfModal'); }
  function closeExportPdfModal(){ closeModal('exportPdfModal'); }
  async function exportPdf(all){
    if(state.exportBusy) return;
    var params=collectExportFilter();
    if(!params.tanggalAwal || !params.tanggalAkhir){ toast('warning','Tanggal awal dan akhir wajib diisi.'); return; }
    if(!all && state.isAdmin && !params.userFilter){ toast('warning','Pilih karyawan terlebih dahulu, atau gunakan Export Semua.'); return; }
    state.exportBusy=true;
    var btn=all?$('btnDoExportAllPdf'):$('btnDoExportPdf');
    var old=btn?btn.textContent:''; if(btn) btn.textContent=all?'Mengekspor semua...':'Mengekspor...';
    var box=$('exportPdfResult'); if(box) box.innerHTML='<p>PDF sedang dibuat dan disimpan ke Drive. Mohon tunggu...</p>';
    try{
      var res=await hr(all?'exportSemuaRekapAbsensiPdfV153':'exportRekapAbsensiPdfV153', params);
      if(!res || !(res.sukses||res.success)) throw new Error((res&&res.pesan)||'Export PDF gagal.');
      renderExportResult(res);
      toast('success',res.pesan||'Export PDF berhasil.');
    }catch(err){ if(box) box.innerHTML='<p class="export-error">'+escapeHtml(err.message||'Export PDF gagal.')+'</p>'; toast('error',err.message||'Export PDF gagal.'); }
    finally{ state.exportBusy=false; if(btn) btn.textContent=old; }
  }

  function openModal(id){ var modal=$(id); if(!modal) return; modal.classList.remove('hidden'); modal.classList.add('flex'); setTimeout(function(){ var overlay=modal.querySelector('.modal-overlay'); var content=modal.querySelector('.modal-content'); if(overlay) overlay.classList.add('opacity-100'); if(content){ content.classList.remove('scale-95','opacity-0'); content.classList.add('scale-100','opacity-100'); } },10); }
  function closeModal(id){ var modal=$(id); if(!modal) return; var overlay=modal.querySelector('.modal-overlay'); var content=modal.querySelector('.modal-content'); if(overlay) overlay.classList.remove('opacity-100'); if(content){ content.classList.remove('scale-100','opacity-100'); content.classList.add('scale-95','opacity-0'); } setTimeout(function(){ modal.classList.add('hidden'); modal.classList.remove('flex'); },180); }
  function showLogoutModal(){ openModal('logoutModal'); }
  function closeLogoutModal(){ closeModal('logoutModal'); }
  function executeLogout(){ if(window.APJAuth && APJAuth.logout) APJAuth.logout(); else { localStorage.clear(); sessionStorage.clear(); window.location.href=(cfg().loginPage||'index.html'); } }
  function openMobileSidebar(){ var sidebar=$('sidebar'), backdrop=$('sidebarBackdrop'); if(sidebar) sidebar.classList.remove('-translate-x-full'); if(backdrop) backdrop.classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function closeMobileSidebar(){ var sidebar=$('sidebar'), backdrop=$('sidebarBackdrop'); if(sidebar && window.innerWidth < 1024) sidebar.classList.add('-translate-x-full'); if(backdrop) backdrop.classList.add('hidden'); document.body.style.overflow=''; }
  function openAbsensiHelpModal(autoOpen){ if (autoOpen) apjMarkGuideSeen('rekap-absensi.html'); openModal('absensiHelpModal'); }
  function closeAbsensiHelpModal(){ apjMarkGuideSeen('rekap-absensi.html'); closeModal('absensiHelpModal'); }
  function initSidebar(){
    document.querySelectorAll('[data-menu-toggle]').forEach(function(btn){ if(btn.dataset.apjBound==='Y') return; btn.dataset.apjBound='Y'; btn.addEventListener('click',function(){ var group=btn.closest('.nav-group'); if(!group) return; group.classList.toggle('open'); btn.setAttribute('aria-expanded',group.classList.contains('open')?'true':'false'); }); });
    document.querySelectorAll('#sidebar a').forEach(function(a){ a.addEventListener('click', closeMobileSidebar); });
    var toggle=$('sidebarToggle'); if(toggle && !toggle.dataset.apjBound){ toggle.dataset.apjBound='Y'; toggle.addEventListener('click',function(){ var sidebar=$('sidebar'); if(!sidebar) return; sidebar.classList.toggle('sidebar-collapsed'); document.body.classList.toggle('sidebar-collapsed-active', sidebar.classList.contains('sidebar-collapsed')); }); }
    document.querySelectorAll('.nav-coming-soon,[data-coming-soon-menu]').forEach(function(link){ link.addEventListener('click',function(e){ e.preventDefault(); toast('info',(link.getAttribute('data-coming-soon-menu')||'Menu')+' segera hadir.'); }); });
  }

  function bind(){
    var ids=['btnLoadRekap','btnRefreshRekap']; ids.forEach(function(id){ var el=$(id); if(el) el.addEventListener('click',function(){loadRekap(true);}); });
    var reset=$('btnRekapReset'); if(reset) reset.addEventListener('click',resetFilters);
    var exp=$('btnExportCsv'); if(exp) exp.addEventListener('click',exportCsv);
    var openPdf=$('btnOpenExportPdf'); if(openPdf) openPdf.addEventListener('click',openExportPdfModal);
    var doPdf=$('btnDoExportPdf'); if(doPdf) doPdf.addEventListener('click',function(){ exportPdf(false); });
    var doAll=$('btnDoExportAllPdf'); if(doAll) doAll.addEventListener('click',function(){ exportPdf(true); });
    var closePdf=$('btnCloseExportPdf'); if(closePdf) closePdf.addEventListener('click',closeExportPdfModal);
    ['filterTanggalAwal','filterTanggalAkhir','filterUser','filterOutlet','filterStatus'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('change',function(){ loadRekap(false); }); });
  }
  function setDefaults(){ var a=$('filterTanggalAwal'), b=$('filterTanggalAkhir'); if(a&&!a.value) a.value=firstDayKey(); if(b&&!b.value) b.value=todayKey(); }
  document.addEventListener('DOMContentLoaded',function(){ initSidebar(); if(!initUser()) return; setDefaults(); bind(); loadRekap(false); });

  window.openMobileSidebar=openMobileSidebar;
  window.closeMobileSidebar=closeMobileSidebar;
  window.showLogoutModal=showLogoutModal;
  window.closeLogoutModal=closeLogoutModal;
  window.executeLogout=executeLogout;
  window.openAbsensiHelpModal=openAbsensiHelpModal;
  window.closeAbsensiHelpModal=closeAbsensiHelpModal;
  window.openExportPdfModal=openExportPdfModal;
  window.closeExportPdfModal=closeExportPdfModal;
})();
