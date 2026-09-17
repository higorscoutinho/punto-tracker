// ==========================================================================
// storage.js — local data model & cache (localStorage), independent of sync
// ==========================================================================

const DATA_KEY = 'pt_data_v1';

function defaultData() {
  return {
    veiculo: { modelo: 'Fiat Punto', cor: 'Preto', apelido: '', placa: '' },
    financiamento: {
      totalParcelas: 36,
      valorParcela: 0,
      dataInicio: todayISO(),
      vencimentoDia: 10,
      banco: '',
      configurado: false,
    },
    parcelas: [],
    atualizadoEm: null,
  };
}

function getData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // basic shape safety
    if (!parsed.veiculo || !parsed.financiamento || !Array.isArray(parsed.parcelas)) {
      return defaultData();
    }
    return parsed;
  } catch (e) {
    console.warn('Falha ao ler dados locais, usando padrão.', e);
    return defaultData();
  }
}

// silent = true skips triggering a sync push (used when applying data that
// just came FROM sync, to avoid an immediate loop).
function saveData(data, opts = {}) {
  data.atualizadoEm = new Date().toISOString();
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('pt:data-changed', { detail: { data, silent: !!opts.silent } }));
  if (!opts.silent && window.PTSync && window.PTSync.isConfigured()) {
    window.PTSync.schedulePush(data);
  }
  return data;
}

function generateParcelas({ count, valor, dataInicio, vencimentoDia }, existing = []) {
  const list = [];
  const existingByNum = {};
  existing.forEach((p) => { existingByNum[p.numero] = p; });

  for (let i = 1; i <= count; i++) {
    const prev = existingByNum[i];
    // vencimento: start date + (i-1) months, but snapped to the chosen due day
    const base = addMonthsISO(dataInicio, i - 1);
    const [y, m] = base.split('-').map(Number);
    const pad = (n) => String(n).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    const day = Math.min(vencimentoDia || 1, lastDay);
    const vencimento = `${y}-${pad(m)}-${pad(day)}`;

    list.push({
      numero: i,
      vencimento: prev ? prev.vencimento : vencimento,
      valor: prev ? prev.valor : Number(valor || 0),
      pago: prev ? !!prev.pago : false,
      dataPagamento: prev ? prev.dataPagamento || null : null,
      temComprovante: prev ? !!prev.temComprovante : false,
      comprovanteTipo: prev ? prev.comprovanteTipo || null : null, // 'imagem' | 'pdf'
      linhaDigitavel: prev ? prev.linhaDigitavel || null : null, // código do boleto (só dígitos), pra copiar e pagar no banco
    });
  }
  return list;
}

function parcelaStatus(p) {
  if (p.pago) return 'pago';
  if (isPastISO(p.vencimento)) return 'atrasado';
  return 'pendente';
}

function computeStats(data) {
  const parcelas = data.parcelas || [];
  const total = parcelas.length;
  const pagas = parcelas.filter((p) => p.pago).length;
  const valorTotal = parcelas.reduce((s, p) => s + Number(p.valor || 0), 0);
  const valorPago = parcelas.filter((p) => p.pago).reduce((s, p) => s + Number(p.valor || 0), 0);
  const valorRestante = Math.max(valorTotal - valorPago, 0);
  const atrasadas = parcelas.filter((p) => parcelaStatus(p) === 'atrasado').length;
  const proxima = parcelas.filter((p) => !p.pago).sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] || null;
  const pct = total ? Math.round((pagas / total) * 100) : 0;
  return { total, pagas, valorTotal, valorPago, valorRestante, atrasadas, proxima, pct };
}

// Merge incoming data (e.g. from a remote gist pull) with local, remote wins
// on conflict since it's assumed to be the freshest write from any device.
function mergeIncoming(local, incoming) {
  if (!incoming) return local;
  return {
    veiculo: { ...local.veiculo, ...incoming.veiculo },
    financiamento: { ...local.financiamento, ...incoming.financiamento },
    parcelas: Array.isArray(incoming.parcelas) && incoming.parcelas.length ? incoming.parcelas : local.parcelas,
    atualizadoEm: incoming.atualizadoEm || local.atualizadoEm,
  };
}

// Bulk-import boleto "linha digitável" codes pasted from a carnê, one per
// line, formatted as "<nº da parcela> <código>" (dots/spaces in the code are
// ignored). Only touches parcelas that already exist; everything else about
// the parcela (pago, comprovante, etc.) is left alone.
function importarLinhasDigitaveis(data, text) {
  const lines = String(text || '').split('\n');
  let applied = 0;
  let skipped = 0;
  lines.forEach((line) => {
    const m = line.match(/^\s*(\d{1,3})\D/);
    if (!m) { if (line.trim()) skipped++; return; }
    const numero = Number(m[1]);
    const digits = line.slice(m[0].length - 1).replace(/\D/g, '');
    if (digits.length < 40 || digits.length > 48) { skipped++; return; }
    const p = data.parcelas.find((x) => x.numero === numero);
    if (!p) { skipped++; return; }
    p.linhaDigitavel = digits;
    applied++;
  });
  return { applied, skipped };
}

// ---------- Receipt (comprovante) bytes — kept out of the main JSON so
// syncing the financing data stays light. Cached per-device; on a fresh
// device they're fetched lazily from the gist on demand. ----------
const RECEIPTS_KEY = 'pt_receipts_v1';

function getAllReceipts() {
  try { return JSON.parse(localStorage.getItem(RECEIPTS_KEY) || '{}'); } catch (e) { return {}; }
}

function getReceipt(numero) {
  return getAllReceipts()[String(numero)] || null;
}

function setReceipt(numero, receipt) {
  const all = getAllReceipts();
  all[String(numero)] = receipt; // { dataUrl, isPdf, name }
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(all));
}

function removeReceiptLocal(numero) {
  const all = getAllReceipts();
  delete all[String(numero)];
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(all));
}
