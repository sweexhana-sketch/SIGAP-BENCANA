// layout.js — Kerangka sidebar & topbar yang dipakai di semua halaman

const ICONS = {
  dashboard: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  bencana: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 2 21h20L12 2Z"/><path d="M12 9v5"/><circle cx="12" cy="17.5" r=".6" fill="currentColor"/></svg>',
  korban: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
  logistik: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
  distribusi: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="13" height="9" rx="1.5"/><path d="M15 10h3.5L21 13v3h-6z"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17.5" cy="18.5" r="1.6"/></svg>',
  sop: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h5M9.5 16.5h5"/></svg>',
  laporan: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5a1 1 0 0 1 1-1h8l6 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M9 12h6M9 16h6M9 8h2"/></svg>',
  users: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7.5" r="3"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="18" cy="8.5" r="2.4"/><path d="M15.7 14.3c2.6.5 4.3 2.3 4.3 5.7"/></svg>'
};

const NAV_ITEMS = [
  { key:'dashboard', href:'/dashboard.html', label:'Dashboard', icon:'dashboard', roles:['admin','kepala_bidang','petugas'] },
  { key:'bencana', href:'/bencana.html', label:'Kejadian Bencana', icon:'bencana', roles:['admin','kepala_bidang','petugas'] },
  { key:'korban', href:'/korban.html', label:'Data & Assessment Korban', icon:'korban', roles:['admin','kepala_bidang','petugas'] },
  { key:'logistik', href:'/logistik.html', label:'Inventori Logistik', icon:'logistik', roles:['admin','kepala_bidang','petugas'] },
  { key:'distribusi', href:'/distribusi.html', label:'Distribusi & Tanda Terima', icon:'distribusi', roles:['admin','kepala_bidang','petugas'] },
  { key:'sop', href:'/sop.html', label:'Dokumen SOP', icon:'sop', roles:['admin','kepala_bidang','petugas'] },
  { key:'laporan', href:'/laporan.html', label:'Laporan & Rekap', icon:'laporan', roles:['admin','kepala_bidang','petugas'] },
  { key:'users', href:'/users.html', label:'Kelola Akun Petugas', icon:'users', roles:['admin'] }
];

const ROLE_LABEL = { admin:'Administrator', kepala_bidang:'Kepala Bidang', petugas:'Petugas Lapangan' };

function renderShell(activeKey, pageTitle, pageSub){
  const user = Auth.getUser();
  if (!user) { window.location.href = '/login.html'; return; }

  const navHtml = NAV_ITEMS.filter(n => n.roles.includes(user.role)).map(n => `
    <div class="nav-item ${n.key===activeKey?'active':''}" onclick="window.location.href='${n.href}'">
      ${ICONS[n.icon]}<span class="label">${n.label}</span>
      <span class="badge-count hidden" id="badge-${n.key}"></span>
    </div>
  `).join('');

  document.getElementById('shell-root').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">SB</div>
          <div class="brand-text">
            <div class="t1">SIGAP BENCANA</div>
            <div class="t2">Dinsos PPPA Papua Barat Daya</div>
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-label">Menu Operasional</div>
          ${navHtml}
        </nav>
        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="user-avatar">${Auth.initials(user.nama)}</div>
            <div class="user-info">
              <div class="un">${user.nama}</div>
              <div class="ur">${ROLE_LABEL[user.role] || user.role}</div>
            </div>
          </div>
          <button class="btn-logout" onclick="doLogout()">Keluar Sistem</button>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <div class="topbar-title">
            <h1>${pageTitle}</h1>
            <div class="sub">${pageSub || ''}</div>
          </div>
          <div class="status-ticker"><span class="pulse-dot"></span> Sistem Aktif — Papua Barat Daya</div>
        </div>
        <div class="content" id="page-content"></div>
      </div>
    </div>
    <div id="toast-root"></div>
  `;

  loadNavBadges();
}

async function loadNavBadges(){
  try{
    const s = await api('/dashboard/summary');
    setBadge('korban', s.korban_belum_terverifikasi);
    setBadge('logistik', s.stok_kritis);
  }catch(e){ /* diam saja jika gagal, badge bersifat sekunder */ }
}
function setBadge(key, val){
  const el = document.getElementById(`badge-${key}`);
  if (!el) return;
  if (val > 0){ el.textContent = val; el.classList.remove('hidden'); } else { el.classList.add('hidden'); }
}

function doLogout(){
  Auth.clear();
  window.location.href = '/login.html';
}
