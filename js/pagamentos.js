// ==========================================================================
// pagamentos.js — parcelas list page (simple: no modals, direct actions)
// ==========================================================================

let currentFilter = 'todas';
let pendingUploadNumero = null;

function statusLabel(s) {
  return { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' }[s];
}

function findParcela(data, numero) {
  return data.parcelas.find((p) => p.numero === Number(numero));
}

function render() {
  const data = getData();
  document.getElementById('sidebarFooter').textContent = `${data.financiamento.totalParcelas || 36}x · carnê pessoal`;

  if (!data.financiamento.configurado || !data.parcelas.length) {
    document.getElementById('content').innerHTML = `
      <div class="card empty-state">
        <div class="emoji">🧾</div>
        <h3 style="margin:0 0 6px;">Nenhuma parcela cadastrada ainda</h3>
        <p style="margin:0;">Abra o Painel e configure o carnê primeiro.</p>
      </div>`;
    return;
  }

  document.getElementById('subtitle').textContent =
    `${data.financiamento.totalParcelas} parcelas · ${data.veiculo.modelo || ''} ${data.veiculo.cor || ''}`.trim();

  let parcelas = [...data.parcelas];
  if (currentFilter !== 'todas') parcelas = parcelas.filter((p) => parcelaStatus(p) === currentFilter);

  if (!parcelas.length) {
    document.getElementById('content').innerHTML = `<div class="card empty-state"><p style="margin:0;">Nenhuma parcela nesse filtro.</p></div>`;
    return;
  }

  const rows = parcelas.map((p) => {
    const st = parcelaStatus(p);
    const dueOrPaid = p.pago ? `Pago em ${fmtDate(p.dataPagamento)}` : `Vence em ${fmtDate(p.vencimento)}`;
    const receiptIcon = p.temComprovante ? '📎' : '📷';
    const receiptTitle = p.temComprovante ? 'Ver comprovante' : 'Anexar comprovante';
    const payBtn = p.pago
      ? `<button class="icon-btn" data-action="desfazer" data-num="${p.numero}" title="Desfazer">↩️</button>`
      : `<button class="btn btn-gold btn-sm" data-action="pagar" data-num="${p.numero}">Marcar pago</button>`;
    return `
      <div class="parcela-row ${st}">
        <div class="parcela-num">${String(p.numero).padStart(2, '0')}</div>
        <div class="parcela-info">
          <b>Parcela ${p.numero} · ${fmtBRL(p.valor)}</b>
          <div>${dueOrPaid}</div>
        </div>
        <span class="badge ${st}">${statusLabel(st)}</span>
        <div class="row-actions">
          <button class="icon-btn" data-action="boleto" data-num="${p.numero}" title="${p.linhaDigitavel ? 'Copiar código do boleto' : 'Adicionar código do boleto'}">🧾</button>
          <button class="icon-btn" data-action="comprovante" data-num="${p.numero}" title="${receiptTitle}">${receiptIcon}</button>
          ${payBtn}
        </div>
      </div>`;
  }).join('');

  document.getElementById('content').innerHTML = `<div class="parcelas-list">${rows}</div>`;
}

function marcarPago(numero) {
  const data = getData();
  const p = findParcela(data, numero);
  if (!p) return;
  p.pago = true;
  p.dataPagamento = todayISO();
  saveData(data);
  toast(`Parcela ${numero} paga 🎉`, 'success');
  render();
}

function desfazerPagamento(numero) {
  if (!confirm(`Desfazer o pagamento da parcela ${numero}?`)) return;
  const data = getData();
  const p = findParcela(data, numero);
  if (!p) return;
  p.pago = false;
  p.dataPagamento = null;
  saveData(data);
  toast(`Pagamento da parcela ${numero} desfeito.`);
  render();
}

// ---------- boleto: código de barras (linha digitável) — ver/copiar ou colar ----------
function formatLinhaDigitavel(code) {
  return code.replace(/(.{5})/g, '$1 ').trim();
}

function onBoletoClick(numero) {
  const data = getData();
  const p = findParcela(data, numero);
  if (!p) return;
  document.getElementById('boletoModalTitle').textContent = `Boleto da parcela ${p.numero}`;
  if (p.linhaDigitavel) {
    renderBoletoView(p);
  } else {
    renderBoletoPasteForm(p);
  }
  document.getElementById('boletoModal').style.display = 'flex';
}

function renderBoletoView(p) {
  const body = document.getElementById('boletoModalBody');
  body.innerHTML = `
    <p style="margin:0 0 10px;">Cole esse código no app do seu banco (pagar boleto → digitar código) pra pagar direto.</p>
    <div class="linha-digitavel">${formatLinhaDigitavel(p.linhaDigitavel)}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnFecharBoleto">Fechar</button>
      <button class="btn btn-ghost" id="btnEditarBoleto">Colar novo código</button>
      <button class="btn btn-navy" id="btnCopiarBoleto">📋 Copiar código</button>
    </div>`;
  document.getElementById('btnFecharBoleto').onclick = () => { document.getElementById('boletoModal').style.display = 'none'; };
  document.getElementById('btnEditarBoleto').onclick = () => renderBoletoPasteForm(p);
  document.getElementById('btnCopiarBoleto').onclick = () => copyBoletoCode(p.linhaDigitavel);
}

function renderBoletoPasteForm(p) {
  const body = document.getElementById('boletoModalBody');
  body.innerHTML = `
    <p style="margin:0 0 10px;">Cole aqui a linha digitável (os números) do boleto dessa parcela.</p>
    <input type="text" id="linhaInput" placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000" style="width:100%;box-sizing:border-box;" />
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancelarBoleto">Cancelar</button>
      <button class="btn btn-navy" id="btnSalvarBoleto">Salvar</button>
    </div>`;
  document.getElementById('btnCancelarBoleto').onclick = () => { document.getElementById('boletoModal').style.display = 'none'; };
  document.getElementById('btnSalvarBoleto').onclick = () => salvarBoletoCode(p.numero);
  document.getElementById('linhaInput').focus();
}

function salvarBoletoCode(numero) {
  const input = document.getElementById('linhaInput');
  const digits = (input.value || '').replace(/\D/g, '');
  if (digits.length < 40 || digits.length > 48) return toast('Isso não parece um código de boleto válido.', 'error');
  const data = getData();
  const p = findParcela(data, numero);
  if (!p) return;
  p.linhaDigitavel = digits;
  saveData(data);
  toast('Código salvo ✅', 'success');
  document.getElementById('boletoModal').style.display = 'none';
  render();
}

async function copyBoletoCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    toast('Código copiado! Cole no app do seu banco.', 'success');
  } catch (e) {
    toast('Não consegui copiar automaticamente — selecione o código na tela.', 'error');
  }
}

// ---------- comprovante: paperclip = ver (se existe) ou anexar (se não) ----------
async function onComprovanteClick(numero) {
  const data = getData();
  const p = findParcela(data, numero);
  if (!p) return;

  if (!p.temComprovante) {
    pendingUploadNumero = numero;
    document.getElementById('hiddenFileInput').click();
    return;
  }

  let receipt = getReceipt(numero);
  if (!receipt && window.PTSync.isConfigured()) {
    try {
      const content = await PTSync.fetchComprovante(numero);
      if (content) {
        receipt = { dataUrl: content, isPdf: content.startsWith('data:application/pdf') };
        setReceipt(numero, receipt);
      }
    } catch (e) {
      toast('Não achei o comprovante: ' + e.message, 'error');
      return;
    }
  }
  if (!receipt) return toast('Comprovante não encontrado neste dispositivo.', 'error');
  openLightbox(numero, receipt);
}

function openLightbox(numero, receipt) {
  const body = document.getElementById('lightboxBody');
  if (receipt.isPdf) {
    body.innerHTML = `<p>Comprovante em PDF.</p><a class="btn btn-navy" href="${receipt.dataUrl}" download="comprovante-${numero}.pdf">📄 Baixar PDF</a>`;
  } else {
    body.innerHTML = `<div class="receipt-preview"><img src="${receipt.dataUrl}" alt="Comprovante ${numero}" /></div>`;
  }
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn btn-danger btn-sm';
  removeBtn.style.marginTop = '12px';
  removeBtn.textContent = 'Remover comprovante';
  removeBtn.onclick = () => removerComprovante(numero);
  body.appendChild(removeBtn);
  document.getElementById('lightbox').style.display = 'flex';
}

async function onFileChosen(file) {
  const numero = pendingUploadNumero;
  if (!numero || !file) return;
  try {
    const { dataUrl, isPdf } = await compressImageFile(file);
    setReceipt(numero, { dataUrl, isPdf, name: file.name });
    const data = getData();
    const p = findParcela(data, numero);
    p.temComprovante = true;
    p.comprovanteTipo = isPdf ? 'pdf' : 'imagem';
    saveData(data);
    if (window.PTSync.isConfigured()) {
      PTSync.uploadComprovante(numero, dataUrl).catch((e) => toast('Salvo aqui, mas falhou ao sincronizar: ' + e.message, 'error'));
    }
    toast('Comprovante anexado ✅', 'success');
    render();
  } catch (e) {
    toast('Erro ao anexar: ' + e.message, 'error');
  } finally {
    pendingUploadNumero = null;
  }
}

async function removerComprovante(numero) {
  if (!confirm('Remover este comprovante?')) return;
  removeReceiptLocal(numero);
  const data = getData();
  const p = findParcela(data, numero);
  p.temComprovante = false;
  p.comprovanteTipo = null;
  saveData(data);
  if (window.PTSync.isConfigured()) {
    try { await PTSync.removeComprovante(numero); } catch (e) { toast('Removido aqui; falhou ao remover do sync: ' + e.message, 'error'); }
  }
  toast('Comprovante removido.');
  document.getElementById('lightbox').style.display = 'none';
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  window.addEventListener('pt:data-changed', render);

  document.getElementById('filterRow').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#filterRow .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    render();
  });

  document.getElementById('content').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const numero = Number(btn.dataset.num);
    const action = btn.dataset.action;
    if (action === 'pagar') marcarPago(numero);
    if (action === 'desfazer') desfazerPagamento(numero);
    if (action === 'comprovante') onComprovanteClick(numero);
    if (action === 'boleto') onBoletoClick(numero);
  });

  document.getElementById('boletoModal').addEventListener('click', (e) => {
    if (e.target.id === 'boletoModal') e.target.style.display = 'none';
  });

  document.getElementById('hiddenFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    onFileChosen(file);
    e.target.value = '';
  });

  document.getElementById('btnFecharLightbox').addEventListener('click', () => {
    document.getElementById('lightbox').style.display = 'none';
  });
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') e.target.style.display = 'none';
  });
});
