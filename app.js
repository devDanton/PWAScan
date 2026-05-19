/* State */
let allowlist = new Set();
let registros = [];
let scanner = null;
let scannerRunning = false;
let awaitingNext = false;

(function initState() {
  try {
    const al = localStorage.getItem('sc_al');
    const rg = localStorage.getItem('sc_rg');
    if (al) allowlist = new Set(JSON.parse(al));
    if (rg) registros = JSON.parse(rg);
  } catch (e) { }
})();

function persist() {
  try {
    localStorage.setItem('sc_al', JSON.stringify([...allowlist]));
    localStorage.setItem('sc_rg', JSON.stringify(registros));
  } catch (e) { }
}

/* Theme */
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.setAttribute('data-theme', d);
  function upd() {
    t.innerHTML = d === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    t.setAttribute('aria-label', 'Modo ' + (d === 'dark' ? 'claro' : 'escuro'));
  }
  upd();
  t.addEventListener('click', () => { d = d === 'dark' ? 'light' : 'dark'; r.setAttribute('data-theme', d); upd(); });
})();

/* Tabs */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
    const p = document.getElementById('panel-' + btn.dataset.tab);
    if (p) p.classList.add('active');
    if (btn.dataset.tab === 'registros') renderRegistros();
  });
});

/* Toast */
function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  const colors = { ok: 'var(--color-success)', err: 'var(--color-error)', info: 'var(--color-primary)' };
  el.style.cssText = 'border-left:3px solid ' + (colors[type] || colors.info);
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.animation = 'toast-out .3s forwards'; setTimeout(() => el.remove(), 300); }, 3000);
}

/* Stats */
function updateStats() {
  document.getElementById('stat-lista').textContent = allowlist.size.toLocaleString('pt-BR');
  document.getElementById('stat-lidos').textContent = registros.length.toLocaleString('pt-BR');
  document.getElementById('stat-liberados').textContent = registros.filter(r => r.status === 'liberado').length.toLocaleString('pt-BR');
}

/* Validate */
function validateChassi(chassi, silent = false) {
  console.log('Validando chassi:', chassi)
  if (!chassi || chassi.trim() === '') return;
  chassi = chassi.trim().toUpperCase();
  const found = allowlist.has(chassi);
  const status = found ? 'liberado' : 'bloqueado';

  if (!silent) {
    const banner = document.getElementById('result-banner');
    document.getElementById('result-icon').textContent = found ? '✅' : '🚫';
    const st = document.getElementById('result-status');
    st.textContent = found ? 'LIBERADO' : 'BLOQUEADO';
    st.className = 'result-status ' + status;
    document.getElementById('result-chassi').textContent = chassi;
    banner.className = 'show ' + status;
    banner.style.display = 'flex';
    document.getElementById('scanner-card').style.display = 'none';
    awaitingNext = true;
  }

  if (found) {
    registros.unshift({ chassi, data_hora: new Date().toISOString(), status: 'liberado' });
    persist();
    updateStats();
    toast('✅ Liberado: ' + chassi, 'ok');
  } else {
    toast('🚫 Bloqueado: ' + chassi, 'err');
  }
}

document.getElementById('btn-continuar').addEventListener('click', () => {
  document.getElementById('result-banner').style.display = 'none';
  document.getElementById('result-banner').className = '';
  document.getElementById('scanner-card').style.display = '';
  awaitingNext = false;
  if (scannerRunning) resumeScanner();
});

/* Manual */
document.getElementById('btn-validar').addEventListener('click', () => {
  const v = document.getElementById('manual-input').value;
  if (!v.trim()) { toast('Digite um chassi'); return; }
  validateChassi(v);
  document.getElementById('manual-input').value = '';
});
document.getElementById('manual-input').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-validar').click(); });

/* Scanner */
function resumeScanner() {
  if (scanner && scanner.getState && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
    try { scanner.resume(); } catch (e) { }
  }
}

function startScanner() {
  if (scanner) return;
  const cfg = {
    fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
  };
  scanner = new Html5Qrcode('reader');
  scanner.start({ facingMode: 'environment' }, cfg,
    (decoded) => {
      if (awaitingNext) return;
      try { scanner.pause(); } catch (e) { }
      validateChassi(decoded);
    },
    () => { }
  ).then(() => {
    scannerRunning = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
  }).catch(err => {
    scanner = null;
    toast('Câmera: ' + err, 'err');
  });
}

function stopScanner() {
  if (!scanner) return;
  scanner.stop().then(() => {
    scanner = null; scannerRunning = false;
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
  });
}

document.getElementById('btn-start').addEventListener('click', startScanner);
document.getElementById('btn-stop').addEventListener('click', stopScanner);

/* Import */
function parseFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 10_000_000) { reject('Arquivo maior que 10 MB'); return; }
    const r = new FileReader();
    r.onload = e => {
      const txt = e.target.result;
      try {
        let items = [];
        if (file.name.endsWith('.json')) {
          const p = JSON.parse(txt);
          if (Array.isArray(p)) items = p.map(s => String(s).trim().toUpperCase()).filter(Boolean);
          else items = Object.values(p).map(s => String(s).trim().toUpperCase()).filter(Boolean);
        } else {
          items = txt.split(/[\r\n,;]+/).map(s => s.trim().toUpperCase()).filter(s => s.length > 2);
        }
        resolve(items);
      } catch (err) { reject('Formato inválido: ' + err.message); }
    };
    r.onerror = () => reject('Erro ao ler arquivo');
    r.readAsText(file, 'utf-8');
  });
}

async function handleFile(file) {
  const st = document.getElementById('import-status');
  st.textContent = 'Lendo arquivo…';
  try {
    const items = await parseFile(file);
    if (!items.length) { st.textContent = '⚠️ Nenhum chassi encontrado.'; return; }
    allowlist = new Set([...allowlist, ...items]);
    persist(); updateStats(); renderListaPreview();
    st.textContent = `✅ ${items.length} chassis importados. Total: ${allowlist.size}.`;
    toast(items.length + ' chassis adicionados', 'ok');
  } catch (e) { st.textContent = '❌ ' + e; toast('Erro: ' + e, 'err'); }
}

const dz = document.getElementById('drop-zone');
const fi = document.getElementById('file-input');
dz.addEventListener('click', () => fi.click());
dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fi.click(); });
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
fi.addEventListener('change', () => { if (fi.files[0]) handleFile(fi.files[0]); fi.value = ''; });

function renderListaPreview() {
  const panel = document.getElementById('lista-preview');
  const container = document.getElementById('lista-items');
  document.getElementById('lista-count').textContent = allowlist.size;
  if (!allowlist.size) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  const arr = [...allowlist].slice(0, 60);
  container.innerHTML = arr.map(c => `<div class="allowlist-item"><span>${c}</span></div>`).join('');
  if (allowlist.size > 60) container.innerHTML += `<div class="allowlist-item" style="justify-content:center;color:var(--color-text-faint)">… e mais ${allowlist.size - 60} chassis</div>`;
}

document.getElementById('btn-limpar-lista').addEventListener('click', () => {
  if (!confirm('Limpar toda a allowlist?')) return;
  allowlist = new Set(); persist(); updateStats(); renderListaPreview();
  document.getElementById('import-status').textContent = '';
  toast('Lista limpa');
});

/* Registros */
function renderRegistros() {
  const empty = document.getElementById('registros-empty');
  const wrap = document.getElementById('registros-table-wrap');
  const body = document.getElementById('registros-body');
  if (!registros.length) { empty.style.display = 'flex'; wrap.style.display = 'none'; return; }
  empty.style.display = 'none'; wrap.style.display = '';
  body.innerHTML = registros.map((r, i) => `
<tr>
<td style="color:var(--color-text-faint)">${registros.length - i}</td>
<td>${r.chassi}</td>
<td><span class="badge ${r.status === 'liberado' ? 'badge-ok' : 'badge-fail'}">${r.status}</span></td>
<td style="color:var(--color-text-muted)">${new Date(r.data_hora).toLocaleString('pt-BR')}</td>
</tr>`).join('');
}

document.getElementById('btn-exportar').addEventListener('click', () => {
  if (!registros.length) { toast('Nenhum registro'); return; }
  const blob = new Blob([JSON.stringify(registros, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leituras_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); toast('JSON exportado ✅', 'ok');
});

document.getElementById('btn-exportar-csv').addEventListener('click', () => {
  if (!registros.length) { toast('Nenhum registro'); return; }
  const csv = 'chassi,status,data_hora\n' + registros.map(r => `${r.chassi},${r.status},${r.data_hora}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leituras_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click(); toast('CSV exportado ✅', 'ok');
});

document.getElementById('btn-limpar-registros').addEventListener('click', () => {
  if (!registros.length) return;
  if (!confirm('Apagar todos os registros?')) return;
  registros = []; persist(); updateStats(); renderRegistros();
  toast('Registros apagados');
});

/* Offline */
function chkOnline() { document.getElementById('offline-badge').style.display = navigator.onLine ? 'none' : ''; }
window.addEventListener('online', chkOnline); window.addEventListener('offline', chkOnline); chkOnline();

/* Init */
updateStats(); renderListaPreview();

/* ScannerHID */
class ScannerHidGlobal {
  constructor(callbackLeitura) {
    this.buffer = '';
    this.ultimoTempo = 0;
    this.tempoLimite = 50;
    this.onLeituraConcluida = callbackLeitura;
    this.iniciar();
  }

  iniciar() {
    document.addEventListener('keydown', (event) => {
      const tempoAtual = Date.now();

      if (tempoAtual - this.ultimoTempo > this.tempoLimite) {
        this.buffer = '';
      }

      this.ultimoTempo = tempoAtual;


      if (event.key === 'Enter') {
        if (this.buffer.length > 0) {

          if (document.activeElement.tagName !== 'INPUT') {
            event.preventDefault();
          }

          this.onLeituraConcluida(this.buffer);
          this.buffer = '';
        }
        return;
      }

      if (event.key.length === 1) {
        this.buffer += event.key;
      }
    });
  }
}

const leitorBluetooth = new ScannerHidGlobal((chassiLido) => {

  if (scannerRunning && scanner) {
    try { scanner.pause(); } catch (e) { }
  }

  validateChassi(chassiLido);
});

(function initImageScanner() {
  const fileInput = document.getElementById('img-scan-input');
  if (!fileInput) return;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;


    const tempScanner = new Html5Qrcode('img-scan-worker');
    try {
      const decoded = await tempScanner.scanFile(file, false);
      validateChassi(decoded, true);
    } catch (err) {
      toast('Imagem: código não encontrado', 'err');
    } finally {
      try { await tempScanner.clear(); } catch (e) { }
    }
  });
})();