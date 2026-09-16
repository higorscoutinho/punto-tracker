// ==========================================================================
// sync.js — optional cross-device sync using a private GitHub Gist as the
// "database". Nothing here ever leaves the browser except direct calls to
// api.github.com using the token the user pasted in Ajustes.
// ==========================================================================

const GH_API = 'https://api.github.com';
const MAIN_FILE = 'financiamento.json';

const PTSync = (() => {
  const TOKEN_KEY = 'pt_sync_token';
  const GIST_KEY = 'pt_sync_gistid';
  const LAST_KEY = 'pt_sync_last';

  let pushTimer = null;
  let status = 'off'; // off | ok | pending | error
  let lastError = '';

  function getConfig() {
    return {
      token: localStorage.getItem(TOKEN_KEY) || '',
      gistId: localStorage.getItem(GIST_KEY) || '',
    };
  }

  function isConfigured() {
    const c = getConfig();
    return !!(c.token && c.gistId);
  }

  function setStatus(s, err = '') {
    status = s;
    lastError = err;
    window.dispatchEvent(new CustomEvent('pt:sync-status', {
      detail: { status: s, error: err, lastSync: localStorage.getItem(LAST_KEY) },
    }));
  }

  function getStatus() {
    return { status, error: lastError, lastSync: localStorage.getItem(LAST_KEY), configured: isConfigured() };
  }

  function headers(token) {
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  }

  async function ghFetch(path, options = {}) {
    const { token } = getConfig();
    const res = await fetch(`${GH_API}${path}`, {
      ...options,
      headers: { ...headers(token), ...(options.headers || {}) },
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).message || ''; } catch (e) { /* ignore */ }
      throw new Error(`GitHub API ${res.status}${detail ? ': ' + detail : ''}`);
    }
    return res.json();
  }

  async function testToken(token) {
    const res = await fetch(`${GH_API}/user`, { headers: headers(token) });
    if (!res.ok) throw new Error('Token inválido ou sem permissão.');
    const data = await res.json();
    return data.login;
  }

  async function createGist(token, data) {
    const body = {
      description: 'Punto Tracker — dados do financiamento (não editar manualmente)',
      public: false,
      files: { [MAIN_FILE]: { content: JSON.stringify(data, null, 2) } },
    };
    const res = await fetch(`${GH_API}/gists`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Não foi possível criar o Gist. Verifique o token (escopo "gist").');
    return res.json();
  }

  async function connectNew(token) {
    setStatus('pending');
    try {
      await testToken(token);
      const local = getData();
      const gist = await createGist(token, local);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(GIST_KEY, gist.id);
      localStorage.setItem(LAST_KEY, new Date().toISOString());
      setStatus('ok');
      return gist.id;
    } catch (e) {
      setStatus('error', e.message);
      throw e;
    }
  }

  async function connectExisting(token, gistId) {
    setStatus('pending');
    try {
      await testToken(token);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(GIST_KEY, gistId.trim());
      const remote = await pull({ silentSave: true });
      localStorage.setItem(LAST_KEY, new Date().toISOString());
      setStatus('ok');
      return remote;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(GIST_KEY);
      setStatus('error', e.message);
      throw e;
    }
  }

  function disconnect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GIST_KEY);
    localStorage.removeItem(LAST_KEY);
    setStatus('off');
  }

  async function pull(opts = {}) {
    const { gistId } = getConfig();
    if (!gistId) return null;
    setStatus('pending');
    try {
      const gist = await ghFetch(`/gists/${gistId}`);
      const file = gist.files && gist.files[MAIN_FILE];
      if (!file) throw new Error(`Arquivo ${MAIN_FILE} não encontrado no Gist.`);
      let content = file.content;
      if (file.truncated) {
        const raw = await fetch(file.raw_url);
        content = await raw.text();
      }
      const remote = JSON.parse(content);
      const local = getData();
      const merged = mergeIncoming(local, remote);
      saveData(merged, { silent: true });
      localStorage.setItem(LAST_KEY, new Date().toISOString());
      setStatus('ok');
      return merged;
    } catch (e) {
      setStatus('error', e.message);
      throw e;
    }
  }

  async function pushNow(data) {
    const { gistId } = getConfig();
    if (!gistId) return;
    setStatus('pending');
    try {
      await ghFetch(`/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [MAIN_FILE]: { content: JSON.stringify(data, null, 2) } } }),
      });
      localStorage.setItem(LAST_KEY, new Date().toISOString());
      setStatus('ok');
    } catch (e) {
      setStatus('error', e.message);
      throw e;
    }
  }

  function schedulePush(data) {
    if (!isConfigured()) return;
    clearTimeout(pushTimer);
    setStatus('pending');
    pushTimer = setTimeout(() => {
      pushNow(data).catch(() => { /* status already set */ });
    }, 1200);
  }

  function comprovanteFilename(numero) {
    return `comprovante-${String(numero).padStart(2, '0')}.txt`;
  }

  async function uploadComprovante(numero, dataUrl) {
    const { gistId } = getConfig();
    const filename = comprovanteFilename(numero);
    if (gistId) {
      setStatus('pending');
      try {
        await ghFetch(`/gists/${gistId}`, {
          method: 'PATCH',
          body: JSON.stringify({ files: { [filename]: { content: dataUrl } } }),
        });
        localStorage.setItem(LAST_KEY, new Date().toISOString());
        setStatus('ok');
      } catch (e) {
        setStatus('error', e.message);
        throw e;
      }
    }
    return filename;
  }

  async function removeComprovante(numero) {
    const { gistId } = getConfig();
    const filename = comprovanteFilename(numero);
    if (gistId) {
      setStatus('pending');
      try {
        await ghFetch(`/gists/${gistId}`, {
          method: 'PATCH',
          body: JSON.stringify({ files: { [filename]: null } }),
        });
        localStorage.setItem(LAST_KEY, new Date().toISOString());
        setStatus('ok');
      } catch (e) {
        setStatus('error', e.message);
        throw e;
      }
    }
  }

  // A comprovante's content already comes down with a full pull() (GitHub
  // returns every file's content in the gist payload), so viewing it is a
  // fresh fetch of the gist filtered to just that filename.
  async function fetchComprovante(numero) {
    const { gistId } = getConfig();
    if (!gistId) return null;
    const filename = comprovanteFilename(numero);
    const gist = await ghFetch(`/gists/${gistId}`);
    const file = gist.files && gist.files[filename];
    if (!file) return null;
    if (file.truncated) {
      const raw = await fetch(file.raw_url);
      return raw.text();
    }
    return file.content;
  }

  function init() {
    if (isConfigured()) {
      setStatus('ok');
      pull().catch(() => { /* keep local data, banner will show error */ });
    } else {
      setStatus('off');
    }
  }

  return {
    isConfigured, getConfig, getStatus, testToken,
    connectNew, connectExisting, disconnect,
    pull, pushNow, schedulePush,
    uploadComprovante, removeComprovante, fetchComprovante,
    comprovanteFilename, init,
  };
})();

window.PTSync = PTSync;
document.addEventListener('DOMContentLoaded', () => PTSync.init());
