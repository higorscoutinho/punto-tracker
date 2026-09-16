// ==========================================================================
// painel.js — dashboard page + inline settings (vehicle, carnê, sync)
// ==========================================================================

let dashboardMode = null; // null | 'empty' | 'full' — tracks which skeleton is currently in the DOM

function renderDashboard() {
  const data = getData();
  const el = document.getElementById('dashboard');

  if (!data.financiamento.configurado || !data.parcelas.length) {
    if (dashboardMode !== 'empty') {
      el.innerHTML = `
        <div class="card empty-state">
          <div class="emoji">🚗</div>
          <h3 style="margin:0 0 6px;">Vamos configurar seu carnê</h3>
          <p style="margin:0 0 18px;">Abra "Configurações" acima e cadastre o valor da parcela, a data de início e o número de parcelas.</p>
        </div>`;
      dashboardMode = 'empty';
    }
    return;
  }

  if (dashboardMode !== 'full') {
    el.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div class="section-title">Progresso do financiamento</div>
        <div class="section-sub" id="dashProgressSub">—</div>
        <div class="progress-wrap">
          <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
          <div class="progress-pct" id="progressPct">0%</div>
        </div>
      </div>

      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-label">💰 Valor pago</div>
          <div class="stat-value" id="statValorPago">—</div>
          <div class="stat-sub" id="statValorTotalSub">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🏁 Falta pagar</div>
          <div class="stat-value" id="statValorRestante">—</div>
          <div class="stat-sub" id="statParcelasRestantesSub">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📅 Próxima parcela</div>
          <div class="stat-value" id="statProxima" style="font-size:16px;">—</div>
          <div class="stat-sub" id="statProximaSub">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">⚠️ Em atraso</div>
          <div class="stat-value" id="statAtrasadas">0</div>
          <div class="stat-sub" id="statAtrasadasSub">tudo em dia</div>
        </div>
      </div>

      <div class="card">
        <a href="pagamentos.html" class="btn btn-navy">🧾 Ver todas as parcelas</a>
      </div>
    `;
    dashboardMode = 'full';
  }

  updateDashboardValues(data);
}

function updateDashboardValues(data) {
  const stats = computeStats(data);
  const v = data.veiculo;

  document.getElementById('subtitle').textContent =
    `${v.modelo || 'Carro'} ${v.cor || ''}${v.apelido ? ' · "' + v.apelido + '"' : ''}`.trim();
  document.getElementById('sidebarFooter').textContent = `${data.financiamento.totalParcelas}x · carnê pessoal`;

  const proximaTxt = stats.proxima
    ? `${fmtDate(stats.proxima.vencimento)} · ${fmtBRL(stats.proxima.valor)}`
    : 'Tudo pago 🎉';

  document.getElementById('dashProgressSub').textContent = `${stats.pagas} de ${stats.total} parcelas quitadas`;
  document.getElementById('progressFill').style.width = stats.pct + '%';
  document.getElementById('progressPct').textContent = stats.pct + '%';

  document.getElementById('statValorPago').textContent = fmtBRL(stats.valorPago);
  document.getElementById('statValorTotalSub').textContent = `de ${fmtBRL(stats.valorTotal)}`;
  document.getElementById('statValorRestante').textContent = fmtBRL(stats.valorRestante);
  document.getElementById('statParcelasRestantesSub').textContent = `${stats.total - stats.pagas} parcela(s)`;
  document.getElementById('statProxima').textContent = proximaTxt;
  document.getElementById('statProximaSub').textContent = stats.proxima ? 'Nº ' + stats.proxima.numero : '—';
  const atrasadasEl = document.getElementById('statAtrasadas');
  atrasadasEl.textContent = stats.atrasadas;
  atrasadasEl.style.color = stats.atrasadas ? 'var(--red)' : 'inherit';
  document.getElementById('statAtrasadasSub').textContent = stats.atrasadas ? 'verifique em Pagamentos' : 'tudo em dia';
}

// ---------- settings (config section) ----------
function fillConfigForm() {
  const data = getData();
  document.getElementById('fModelo').value = data.veiculo.modelo || '';
  document.getElementById('fCor').value = data.veiculo.cor || '';
  document.getElementById('fApelido').value = data.veiculo.apelido || '';
  document.getElementById('fTotal').value = data.financiamento.totalParcelas || 36;
  document.getElementById('fValor').value = data.financiamento.valorParcela || '';
  document.getElementById('fInicio').value = data.financiamento.dataInicio || todayISO();
  document.getElementById('fDia').value = data.financiamento.vencimentoDia || 10;
}

function salvarVeiculo() {
  const data = getData();
  data.veiculo = {
    modelo: document.getElementById('fModelo').value.trim() || 'Fiat Punto',
    cor: document.getElementById('fCor').value.trim() || 'Preto',
    apelido: document.getElementById('fApelido').value.trim(),
  };
  saveData(data);
  toast('Veículo salvo ✅', 'success');
}

function gerarParcelas() {
  const data = getData();
  const total = Math.max(1, Math.min(120, Number(document.getElementById('fTotal').value || 36)));
  const valor = Number(document.getElementById('fValor').value || 0);
  const dataInicio = document.getElementById('fInicio').value || todayISO();
  const vencimentoDia = Math.max(1, Math.min(31, Number(document.getElementById('fDia').value || 10)));

  if (!valor) return toast('Informe o valor da parcela.', 'error');

  if (data.parcelas.length && !confirm(`Gerar ${total} parcelas? Quem já estiver paga (mesmo número) continua paga.`)) return;

  data.financiamento = { totalParcelas: total, valorParcela: valor, dataInicio, vencimentoDia, configurado: true };
  data.parcelas = generateParcelas({ count: total, valor, dataInicio, vencimentoDia }, data.parcelas);
  saveData(data);
  toast(`${total} parcelas geradas 🚗`, 'success');
  document.getElementById('config').style.display = 'none';
}

function renderSyncCard() {
  const card = document.getElementById('syncCard');
  const status = PTSync.getStatus();
  document.getElementById('btnSyncNow').style.display = status.configured ? 'inline-flex' : 'none';

  if (!status.configured) {
    card.innerHTML = `
      <div class="section-title">🔗 Sincronizar entre celular e PC</div>
      <div class="section-sub">Opcional. Usa um Gist privado da sua conta do GitHub como "banco de dados". O token fica só neste navegador.</div>
      <ol class="step-list">
        <li>GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token.</li>
        <li>Marque só o escopo <b>gist</b> e gere.</li>
        <li>Cole o token abaixo e clique em criar.</li>
      </ol>
      <div class="field" style="margin-top:14px;">
        <label>Token (escopo "gist")</label>
        <input type="password" id="fToken" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
      </div>
      <div class="tag-row" style="margin-bottom:14px;">
        <button class="btn btn-gold" id="btnCriarGist">✨ Criar (1º aparelho)</button>
      </div>
      <div class="field">
        <label>ID do Gist (pra conectar um 2º aparelho)</label>
        <input type="text" id="fGistId" placeholder="ex: 3a1f9c2e8b7d4f5061a2..." />
      </div>
      <button class="btn btn-navy" id="btnConectarGist">🔌 Conectar</button>
    `;

    document.getElementById('btnCriarGist').addEventListener('click', async () => {
      const token = document.getElementById('fToken').value.trim();
      if (!token) return toast('Cole o token primeiro.', 'error');
      const btn = document.getElementById('btnCriarGist');
      btn.disabled = true; btn.textContent = 'Criando…';
      try {
        await PTSync.connectNew(token);
        toast('Conectado! Anote o ID do Gist pra usar no outro aparelho.', 'success');
        renderSyncCard();
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = '✨ Criar (1º aparelho)';
      }
    });

    document.getElementById('btnConectarGist').addEventListener('click', async () => {
      const token = document.getElementById('fToken').value.trim();
      const gistId = document.getElementById('fGistId').value.trim();
      if (!token || !gistId) return toast('Preencha token e ID do Gist.', 'error');
      const btn = document.getElementById('btnConectarGist');
      btn.disabled = true; btn.textContent = 'Conectando…';
      try {
        await PTSync.connectExisting(token, gistId);
        toast('Conectado e sincronizado ✅', 'success');
        fillConfigForm();
        renderDashboard();
        renderSyncCard();
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = '🔌 Conectar';
      }
    });
    return;
  }

  const { gistId } = PTSync.getConfig();
  const lastSyncTxt = status.lastSync ? new Date(status.lastSync).toLocaleString('pt-BR') : 'nunca';
  const stateLabel = { ok: '✅ Conectado', pending: '🔄 Sincronizando…', error: '⚠️ Erro na última sync' }[status.status] || 'Conectado';

  card.innerHTML = `
    <div class="section-title">🔗 Sincronização</div>
    <div class="section-sub">${stateLabel} · última sync: ${lastSyncTxt}</div>
    ${status.error ? `<div class="hint" style="color:var(--red);margin-bottom:10px;">${status.error}</div>` : ''}
    <div class="field">
      <label>ID do Gist (use pra conectar outro aparelho)</label>
      <input type="text" readonly value="${gistId}" onclick="this.select()" />
    </div>
    <div class="tag-row">
      <button class="btn btn-danger" id="btnDesconectar">Desconectar</button>
    </div>
  `;

  document.getElementById('btnDesconectar').addEventListener('click', () => {
    if (!confirm('Desconectar a sincronização neste navegador?')) return;
    PTSync.disconnect();
    toast('Desconectado. Os dados continuam salvos localmente.');
    renderSyncCard();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  fillConfigForm();
  renderSyncCard();

  // A little parked toy car in the corner of the screen — pure decoration,
  // not tied to the carnê at all. Drag it to spin it around.
  const carCorner = document.getElementById('carCorner');
  if (carCorner) createPuntoToy(carCorner);

  window.addEventListener('pt:data-changed', () => { renderDashboard(); fillConfigForm(); });
  window.addEventListener('pt:sync-status', renderSyncCard);

  // Cross-tab liveliness: if Painel and Pagamentos are open in two tabs on the
  // same device, a payment marked in one updates the dashboard values in the other.
  window.addEventListener('storage', (e) => {
    if (e.key === DATA_KEY) { renderDashboard(); fillConfigForm(); }
  });

  const data = getData();
  const configEl = document.getElementById('config');
  if (!data.financiamento.configurado) configEl.style.display = 'block';

  document.getElementById('btnToggleConfig').addEventListener('click', () => {
    configEl.style.display = configEl.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btnSalvarVeiculo').addEventListener('click', salvarVeiculo);
  document.getElementById('btnGerarParcelas').addEventListener('click', gerarParcelas);

  document.getElementById('btnSyncNow').addEventListener('click', async () => {
    try {
      await PTSync.pull();
      toast('Sincronizado ✅', 'success');
    } catch (e) {
      toast('Falha ao sincronizar: ' + e.message, 'error');
    }
  });
});
