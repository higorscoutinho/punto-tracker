// ==========================================================================
// utils.js — helpers used across pages
// ==========================================================================

const fmtBRL = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtDate = (isoStr) => {
  if (!isoStr) return '—';
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateShort = (isoStr) => {
  if (!isoStr) return '—';
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addMonthsISO = (isoStr, months) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, (m - 1) + months, d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const isPastISO = (isoStr) => {
  if (!isoStr) return false;
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, (m - 1), d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime() < today.getTime();
};

function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Compress an image File into a small base64 data URL (JPEG), so receipts
// stay light enough to live inside a gist file.
function compressImageFile(file, maxDim = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') {
      // Keep PDFs as-is (base64), just size-check them.
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result, isPdf: true, name: file.name });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), isPdf: false, name: file.name });
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function approxBytesOfDataUrl(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round(base64.length * 0.75);
}

// ---------- Toasts ----------
function ensureToastWrap() {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  return wrap;
}

function toast(msg, type = '') {
  const wrap = ensureToastWrap();
  const el = document.createElement('div');
  el.className = `toast ${type}`.trim();
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

// ---------- Active nav highlighting ----------
function markActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .bottom-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', markActiveNav);

// ---------- Sync status pill (sidebar + bottom nav badge) ----------
function initSyncPill() {
  const pill = document.getElementById('syncPill');
  if (!pill) return;
  const textEl = document.getElementById('syncPillText');

  const render = (detail) => {
    const state = detail.status || 'off';
    pill.dataset.state = state;
    const labels = {
      off: 'Só neste navegador',
      ok: 'Sincronizado',
      pending: 'Sincronizando…',
      error: 'Erro ao sincronizar',
    };
    if (textEl) textEl.textContent = labels[state] || 'Local';
    pill.title = detail.error ? detail.error : (detail.lastSync ? `Última sync: ${new Date(detail.lastSync).toLocaleString('pt-BR')}` : '');
  };

  window.addEventListener('pt:sync-status', (e) => render(e.detail));
  if (window.PTSync) render(window.PTSync.getStatus());
}

document.addEventListener('DOMContentLoaded', initSyncPill);
