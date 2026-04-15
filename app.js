let allowlist = [];
let scanHistory = JSON.parse(localStorage.getItem('chassi_history')) || [];
let html5QrCode;
let isScanning = false;

document.addEventListener("DOMContentLoaded", () => {
    // Tenta carregar a lista do cache local ao abrir
    const savedList = localStorage.getItem('chassi_allowlist');
    if (savedList) {
        allowlist = JSON.parse(savedList);
        updateStatusList();
    }

    // Event Listeners
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('startScanBtn').addEventListener('click', startScanner);
    document.getElementById('stopScanBtn').addEventListener('click', stopScanner);
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
});

// 1. Carregar a lista de Chassis
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            allowlist = JSON.parse(e.target.result);
            localStorage.setItem('chassi_allowlist', JSON.stringify(allowlist));
            updateStatusList();
            alert("Lista carregada com sucesso!");
        } catch (error) {
            alert("Erro ao ler o arquivo JSON. Verifique a formatação.");
        }
    };
    reader.readAsText(file);
}

function updateStatusList() {
    document.getElementById('listStatus').innerText = `${allowlist.length} veículos na lista de liberação.`;
}

// 2. Lógica do Scanner
function startScanner() {
    if (allowlist.length === 0) {
        alert("Carregue uma lista de liberação antes de iniciar a câmera.");
        return;
    }

    document.getElementById('reader').style.display = 'block';
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'inline-block';

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 100 } }; // Formato retangular bom para código de barras

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => isScanning = true)
        .catch(err => alert("Erro ao acessar câmera: " + err));
}

function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader').style.display = 'none';
            document.getElementById('startScanBtn').style.display = 'inline-block';
            document.getElementById('stopScanBtn').style.display = 'none';
            isScanning = false;
        });
    }
}

// 3. Validação e Feedback Visual
function onScanSuccess(decodedText) {
    if (!isScanning) return;
    
    // Pausa a leitura para não ler o mesmo código dezenas de vezes em 1 segundo
    stopScanner();

    const chassi = decodedText.trim();
    const isAllowed = allowlist.includes(chassi);
    
    showFeedback(isAllowed, chassi);

    if (isAllowed) {
        saveRecord(chassi);
    }

    // Retorna a câmera após 3 segundos
    setTimeout(() => {
        hideFeedback();
        startScanner();
    }, 3000);
}

function showFeedback(isAllowed, chassi) {
    const feedbackEl = document.getElementById('feedback');
    const msgEl = document.getElementById('feedbackMsg');
    const chassiEl = document.getElementById('feedbackChassi');

    feedbackEl.className = isAllowed ? 'bg-success' : 'bg-danger';
    msgEl.innerText = isAllowed ? 'LIBERADO' : 'BLOQUEADO';
    chassiEl.innerText = chassi;
    feedbackEl.style.display = 'flex';
}

function hideFeedback() {
    document.getElementById('feedback').style.display = 'none';
}

// 4. Gravação e Exportação
function saveRecord(chassi) {
    const record = {
        chassi: chassi,
        data_hora: new Date().toISOString(),
        status: "LIBERADO"
    };
    scanHistory.push(record);
    localStorage.setItem('chassi_history', JSON.stringify(scanHistory));
}

function exportJSON() {
    if (scanHistory.length === 0) {
        alert("Nenhum registro para exportar.");
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scanHistory, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "registros_lidos.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}