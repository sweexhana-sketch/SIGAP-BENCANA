// api.js — Klien API terpusat untuk SIGAP BENCANA

const API_BASE = '/api';

const Auth = {
  getToken(){ return localStorage.getItem('sigap_token'); },
  getUser(){
    try { return JSON.parse(localStorage.getItem('sigap_user') || 'null'); }
    catch(e){ return null; }
  },
  setSession(token, user){
    localStorage.setItem('sigap_token', token);
    localStorage.setItem('sigap_user', JSON.stringify(user));
  },
  clear(){
    localStorage.removeItem('sigap_token');
    localStorage.removeItem('sigap_user');
  },
  requireLogin(){
    if(!this.getToken()){ window.location.href = '/login.html'; }
  },
  initials(nama){
    if(!nama) return '?';
    const parts = nama.replace(/,.*/,'').trim().split(' ');
    return ((parts[0]?.[0]||'') + (parts[1]?.[0]||'')).toUpperCase();
  }
};

async function api(path, { method = 'GET', body, isForm = false } = {}){
  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined)
  });

  if (res.status === 401) {
    Auth.clear();
    window.location.href = '/login.html';
    return;
  }

  let data = null;
  try { data = await res.json(); } catch(e){ /* respons kosong */ }

  if (!res.ok) {
    const message = (data && data.message) || `Terjadi kesalahan (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---------- Toast ----------
function toast(message, type = 'success'){
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'error' ? '⛔' : type === 'warn' ? '⚠️' : '✅';
  el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250); }, 3600);
}

function formatTanggal(iso, withTime=false){
  if (!iso) return '-';
  const d = new Date(iso);
  const opts = { day:'2-digit', month:'short', year:'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleDateString('id-ID', opts).replace(/\./g,'');
}

function formatWaktuRelatif(iso){
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff/60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff/3600)} jam lalu`;
  return `${Math.floor(diff/86400)} hari lalu`;
}

function escapeHtml(str){
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
