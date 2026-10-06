const SUPABASE_URL = 'https://tsuwhyrzqjsfarfmllfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fb4VQ7iVCvkfY4o9Nfwx_g_rQYnRR3N';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Instâncias de Gráficos
let chartDestinosObj = null;
let chartComparativoObj = null;
let chartEvolucaoObj = null;
let chartMotoristasObj = null;
let chartDestinosValoresObj = null;
let chartDestinosFretesObj = null;

// INICIALIZAÇÃO DA APLICAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initDefaultData();
    setupNavigation();
    setupEventListeners();
    updateDate();
    populateMotoristasSelects();
    renderDashboard();
    renderTransferenciasTable();
    renderMotoristasTable();
});

// DADOS INICIAIS DE DEMONSTRAÇÃO (Caso o banco esteja vazio)
function initDefaultData() {
    if (motoristas.length === 0) {
        motoristas = [
            { id: 1, nome: "João Silva", cpf: "111.222.333-44", telefone: "(17) 99111-2233", tipo_veiculo: "Truck", placa: "ABC-1234", status: "Ativo" },
            { id: 2, nome: "Marcos Oliveira", cpf: "222.333.444-55", telefone: "(16) 99222-3344", tipo_veiculo: "Carreta", placa: "XYZ-5678", status: "Ativo" },
            { id: 3, nome: "Roberto Costa", cpf: "333.444.555-66", telefone: "(17) 99333-4455", tipo_veiculo: "Toco", placa: "DEF-9012", status: "Ativo" }
        ];
        saveMotoristas();
    }

    if (transferencias.length === 0) {
        transferencias = [
            {
                id: "TRF-1001",
                data: "2026-10-01",
                hora_saida: "08:30",
                origem: "MATRIZ",
                destino: "São José do Rio Preto",
                motorista_id: 1,
                motorista_nome: "João Silva",
                veiculo: "Truck",
                placa: "ABC-1234",
                valor_mercadoria: 85450.00,
                valor_frete: 2500.00,
                forma_pagamento: "PIX",
                status_pagamento: "Pago",
                data_pagamento: "2026-10-01",
                observacoes: "Carga entregue sem avarias"
            },
            {
                id: "TRF-1002",
                data: "2026-10-03",
                hora_saida: "10:00",
                origem: "MATRIZ",
                destino: "Jardinópolis",
                motorista_id: 2,
                motorista_nome: "Marcos Oliveira",
                veiculo: "Carreta",
                placa: "XYZ-5678",
                valor_mercadoria: 120000.00,
                valor_frete: 3200.00,
                forma_pagamento: "Transferência Bancária",
                status_pagamento: "Pendente",
                data_pagamento: "",
                observacoes: "Aguardando confirmação do financeiro"
            }
        ];
        saveTransferencias();
    }
}

function saveTransferencias() {
    localStorage.setItem(STORAGE_TRANSFERENCIAS, JSON.stringify(transferencias));
}

function saveMotoristas() {
    localStorage.setItem(STORAGE_MOTORISTAS, JSON.stringify(motoristas));
}

// FORMATADORES FINANCEIROS BRASILEIROS
function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDateBR(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', options);
}

// NAVEGAÇÃO ENTRE PÁGINAS
function setupNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateTo(page);
        });
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });
}

function navigateTo(pageId) {
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    const activeLi = document.querySelector(`.sidebar-menu li[data-page="${pageId}"]`);
    if (activeLi) activeLi.classList.add('active');

    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`page-${pageId}`);
    if (targetSection) targetSection.classList.add('active');

    // Atualiza Título
    const titleMap = {
        'dashboard': 'Dashboard Principal',
        'nova-transferencia': 'Nova Transferência de Carga',
        'transferencias': 'Histórico de Transferências',
        'motoristas': 'Controle de Motoristas',
        'destinos': 'Acompanhamento por Destino',
        'relatorios': 'Relatórios Gerenciais',
        'configuracoes': 'Configurações do Sistema'
    };
    document.getElementById('page-title').textContent = titleMap[pageId] || 'LOGIX';

    // Ações ao abrir página
    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'destinos') renderDestinosPage();
    if (pageId === 'transferencias') renderTransferenciasTable();
    if (pageId === 'motoristas') renderMotoristasTable();
}

// RESUMO DO CÁLCULO EM TEMPO REAL NO FORMULÁRIO
function setupEventListeners() {
    const valMerc = document.getElementById('transf-valor-mercadoria');
    const valFrete = document.getElementById('transf-valor-frete');

    const updateCalc = () => {
        const vMerc = parseFloat(valMerc.value) || 0;
        const vFrete = parseFloat(valFrete.value) || 0;
        const percentual = vMerc > 0 ? (vFrete / vMerc) * 100 : 0;
        const liquido = vMerc - vFrete;

        document.getElementById('calc-val-mercadoria').textContent = formatMoney(vMerc);
        document.getElementById('calc-val-frete').textContent = formatMoney(vFrete);
        document.getElementById('calc-percentual').textContent = percentual.toFixed(2) + '%';
        document.getElementById('calc-liquido').textContent = formatMoney(liquido);
    };

    valMerc.addEventListener('input', updateCalc);
    valFrete.addEventListener('input', updateCalc);

    // Salvar Transferência
    document.getElementById('form-transferencia').addEventListener('submit', handleSaveTransferencia);
    // Salvar Motorista
    document.getElementById('form-motorista').addEventListener('submit', handleSaveMotorista);

    // Ao selecionar motorista, auto-preencher veículo/placa se existir
    document.getElementById('transf-motorista-select').addEventListener('change', (e) => {
        const motoId = e.target.value;
        const moto = motoristas.find(m => m.id == motoId);
        if (moto) {
            document.getElementById('transf-veiculo').value = moto.tipo_veiculo || '';
            document.getElementById('transf-placa').value = moto.placa || '';
        }
    });
}

function populateMotoristasSelects() {
    const selects = ['transf-motorista-select', 'filter-motorista', 'rel-motorista'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const valAnterior = select.value;
        select.innerHTML = id.startsWith('filter') || id.startsWith('rel') ? '<option value="">Todos os Motoristas</option>' : '<option value="">Selecione um motorista</option>';
        
        motoristas.filter(m => m.status === 'Ativo' || id !== 'transf-motorista-select').forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.nome} (${m.placa || 'Sem placa'})`;
            select.appendChild(opt);
        });
        select.value = valAnterior;
    });
}

// GERENCIAMENTO DE TRANSFERÊNCIAS (CRUD)
function handleSaveTransferencia(e) {
    e.preventDefault();

    const idEdit = document.getElementById('transf-id-edit').value;
    const motoristaId = document.getElementById('transf-motorista-select').value;
    const motoristaObj = motoristas.find(m => m.id == motoristaId);

    const dataObj = {
        id: idEdit ? idEdit : 'TRF-' + Math.floor(1000 + Math.random() * 9000),
        data: document.getElementById('transf-data').value,
        hora_saida: document.getElementById('transf-hora').value,
        origem: 'MATRIZ',
        destino: document.getElementById('transf-destino').value,
        motorista_id: motoristaId,
        motorista_nome: motoristaObj ? motoristaObj.nome : 'Não informado',
        veiculo: document.getElementById('transf-veiculo').value,
        placa: document.getElementById('transf-placa').value,
        valor_mercadoria: parseFloat(document.getElementById('transf-valor-mercadoria').value) || 0,
        valor_frete: parseFloat(document.getElementById('transf-valor-frete').value) || 0,
        forma_pagamento: document.getElementById('transf-forma-pagamento').value,
        status_pagamento: document.getElementById('transf-status-pagamento').value,
        data_pagamento: document.getElementById('transf-data-pagamento').value,
        observacoes: document.getElementById('transf-observacoes').value
    };

    if (idEdit) {
        const index = transferencias.findIndex(t => t.id === idEdit);
        if (index !== -1) transferencias[index] = dataObj;
        showToast("Transferência atualizada com sucesso!");
    } else {
        transferencias.push(dataObj);
        showToast("Nova transferência gravada com sucesso!");
    }

    saveTransferencias();
    resetFormTransferencia();
    navigateTo('transferencias');
}

function resetFormTransferencia() {
    document.getElementById('form-transferencia').reset();
    document.getElementById('transf-id-edit').value = '';
    document.getElementById('transf-codigo').value = 'Auto-gerado';
    document.getElementById('calc-val-mercadoria').textContent = 'R$ 0,00';
    document.getElementById('calc-val-frete').textContent = 'R$ 0,00';
    document.getElementById('calc-percentual').textContent = '0.00%';
    document.getElementById('calc-liquido').textContent = 'R$ 0,00';
}

function editarTransferencia(id) {
    const item = transferencias.find(t => t.id === id);
    if (!item) return;

    document.getElementById('transf-id-edit').value = item.id;
    document.getElementById('transf-codigo').value = item.id;
    document.getElementById('transf-data').value = item.data;
    document.getElementById('transf-hora').value = item.hora_saida;
    document.getElementById('transf-destino').value = item.destino;
    document.getElementById('transf-valor-mercadoria').value = item.valor_mercadoria;
    document.getElementById('transf-motorista-select').value = item.motorista_id;
    document.getElementById('transf-veiculo').value = item.veiculo;
    document.getElementById('transf-placa').value = item.placa;
    document.getElementById('transf-valor-frete').value = item.valor_frete;
    document.getElementById('transf-forma-pagamento').value = item.forma_pagamento;
    document.getElementById('transf-status-pagamento').value = item.status_pagamento;
    document.getElementById('transf-data-pagamento').value = item.data_pagamento;
    document.getElementById('transf-observacoes').value = item.observacoes;

    navigateTo('nova-transferencia');
}

function excluirTransferencia(id) {
    if (confirm(`Tem certeza que deseja excluir a transferência ${id}?`)) {
        transferencias = transferencias.filter(t => t.id !== id);
        saveTransferencias();
        renderTransferenciasTable();
        showToast("Transferência excluída.");
    }
}

function marcarFretePago(id) {
    const item = transferencias.find(t => t.id === id);
    if (item) {
        item.status_pagamento = 'Pago';
        item.data_pagamento = new Date().toISOString().split('T')[0];
        saveTransferencias();
        renderTransferenciasTable();
        showToast(`Frete da transferência ${id} marcado como PAGO.`);
    }
}

function visualizarTransferencia(id) {
    const t = transferencias.find(item => item.id === id);
    if (!t) return;

    const body = document.getElementById('modal-body-content');
    const percent = t.valor_mercadoria > 0 ? ((t.valor_frete / t.valor_mercadoria) * 100).toFixed(2) : 0;

    body.innerHTML = `
        <p><strong>Código ID:</strong> ${t.id}</p>
        <p><strong>Data/Hora Saída:</strong> ${formatDateBR(t.data)} às ${t.hora_saida}</p>
        <p><strong>Origem:</strong> ${t.origem} | <strong>Destino:</strong> ${t.destino}</p>
        <hr><br>
        <p><strong>Motorista:</strong> ${t.motorista_nome}</p>
        <p><strong>Veículo/Placa:</strong> ${t.veiculo} (${t.placa})</p>
        <hr><br>
        <p><strong>Valor Total da Mercadoria:</strong> ${formatMoney(t.valor_mercadoria)}</p>
        <p><strong>Valor do Frete Pago:</strong> ${formatMoney(t.valor_frete)} (${percent}% do valor total)</p>
        <p><strong>Status Pagamento:</strong> <span class="badge ${t.status_pagamento === 'Pago' ? 'badge-success' : 'badge-warning'}">${t.status_pagamento}</span></p>
        <p><strong>Observações:</strong> ${t.observacoes || 'Nenhuma'}</p>
    `;
    document.getElementById('modal-visualizar').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-visualizar').style.display = 'none';
}

// RENDERIZAÇÃO DA TABELA DE HISTÓRICO
function renderTransferenciasTable(lista = transferencias) {
    const tbody = document.querySelector('#table-transferencias tbody');
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Nenhuma transferência registrada.</td></tr>';
        return;
    }

    lista.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.id}</strong></td>
            <td>${formatDateBR(t.data)} ${t.hora_saida}</td>
            <td><span class="badge badge-blue">${t.origem}</span></td>
            <td><strong>${t.destino}</strong></td>
            <td>${t.motorista_nome}</td>
            <td>${t.veiculo} (${t.placa})</td>
            <td>${formatMoney(t.valor_mercadoria)}</td>
            <td>${formatMoney(t.valor_frete)}</td>
            <td><span class="badge ${t.status_pagamento === 'Pago' ? 'badge-success' : 'badge-warning'}">${t.status_pagamento}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="visualizarTransferencia('${t.id}')" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-primary btn-sm" onclick="editarTransferencia('${t.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                ${t.status_pagamento === 'Pendente' ? `<button class="btn btn-excel btn-sm" onclick="marcarFretePago('${t.id}')" title="Pagar"><i class="fa-solid fa-check"></i></button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="excluirTransferencia('${t.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarTransferencias() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const destino = document.getElementById('filter-destino').value;
    const motorista = document.getElementById('filter-motorista').value;
    const status = document.getElementById('filter-status-pagamento').value;
    const dtInicio = document.getElementById('filter-data-inicio').value;
    const dtFim = document.getElementById('filter-data-fim').value;

    const filtrado = transferencias.filter(t => {
        const matchesSearch = t.id.toLowerCase().includes(search) || t.placa.toLowerCase().includes(search) || t.observacoes.toLowerCase().includes(search);
        const matchesDestino = !destino || t.destino === destino;
        const matchesMotorista = !motorista || t.motorista_id == motorista;
        const matchesStatus = !status || t.status_pagamento === status;
        const matchesData = (!dtInicio || t.data >= dtInicio) && (!dtFim || t.data <= dtFim);

        return matchesSearch && matchesDestino && matchesMotorista && matchesStatus && matchesData;
    });

    renderTransferenciasTable(filtrado);
}

function limparFiltros() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-destino').value = '';
    document.getElementById('filter-motorista').value = '';
    document.getElementById('filter-status-pagamento').value = '';
    document.getElementById('filter-data-inicio').value = '';
    document.getElementById('filter-data-fim').value = '';
    renderTransferenciasTable();
}

// GERENCIAMENTO DE MOTORISTAS (CRUD)
function handleSaveMotorista(e) {
    e.preventDefault();
    const idEdit = document.getElementById('moto-id-edit').value;

    const motoData = {
        id: idEdit ? parseInt(idEdit) : Date.now(),
        nome: document.getElementById('moto-nome').value,
        cpf: document.getElementById('moto-cpf').value,
        telefone: document.getElementById('moto-telefone').value,
        tipo_veiculo: document.getElementById('moto-tipo-veiculo').value,
        placa: document.getElementById('moto-placa').value,
        status: document.getElementById('moto-status').value
    };

    if (idEdit) {
        const index = motoristas.findIndex(m => m.id == idEdit);
        if (index !== -1) motoristas[index] = motoData;
        showToast("Motorista atualizado!");
    } else {
        motoristas.push(motoData);
        showToast("Motorista cadastrado com sucesso!");
    }

    saveMotoristas();
    resetFormMotorista();
    populateMotoristasSelects();
    renderMotoristasTable();
}

function resetFormMotorista() {
    document.getElementById('form-motorista').reset();
    document.getElementById('moto-id-edit').value = '';
}

function renderMotoristasTable() {
    const tbody = document.querySelector('#table-motoristas tbody');
    tbody.innerHTML = '';

    motoristas.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.nome}</strong><br><small>${m.cpf || ''}</small></td>
            <td>${m.tipo_veiculo || '-'} (${m.placa || '-'})</td>
            <td><span class="badge ${m.status === 'Ativo' ? 'badge-success' : 'badge-danger'}">${m.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="verDetalhesMotorista(${m.id})"><i class="fa-solid fa-chart-line"></i></button>
                <button class="btn btn-primary btn-sm" onclick="editarMotorista(${m.id})"><i class="fa-solid fa-pen"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarMotorista(id) {
    const m = motoristas.find(item => item.id == id);
    if (!m) return;

    document.getElementById('moto-id-edit').value = m.id;
    document.getElementById('moto-nome').value = m.nome;
    document.getElementById('moto-cpf').value = m.cpf;
    document.getElementById('moto-telefone').value = m.telefone;
    document.getElementById('moto-tipo-veiculo').value = m.tipo_veiculo;
    document.getElementById('moto-placa').value = m.placa;
    document.getElementById('moto-status').value = m.status;
}

function verDetalhesMotorista(id) {
    const m = motoristas.find(item => item.id == id);
    if (!m) return;

    const viagens = transferencias.filter(t => t.motorista_id == id);
    const totalCarga = viagens.reduce((acc, t) => acc + t.valor_mercadoria, 0);
    const totalFrete = viagens.reduce((acc, t) => acc + t.valor_frete, 0);
    const mediaFrete = viagens.length > 0 ? totalFrete / viagens.length : 0;

    // Destino mais Frequente
    const contagemDestinos = {};
    viagens.forEach(v => contagemDestinos[v.destino] = (contagemDestinos[v.destino] || 0) + 1);
    let freqDestino = '-';
    let max = 0;
    for (const d in contagemDestinos) {
        if (contagemDestinos[d] > max) { max = contagemDestinos[d]; freqDestino = d; }
    }

    document.getElementById('detalhe-moto-nome').innerHTML = `<i class="fa-solid fa-id-card"></i> Desempenho: ${m.nome}`;
    document.getElementById('detalhe-moto-qtd').textContent = viagens.length;
    document.getElementById('detalhe-moto-mercadoria').textContent = formatMoney(totalCarga);
    document.getElementById('detalhe-moto-frete').textContent = formatMoney(totalFrete);
    document.getElementById('detalhe-moto-media').textContent = formatMoney(mediaFrete);
    document.getElementById('detalhe-moto-frequente').textContent = freqDestino;

    const tbody = document.querySelector('#table-historico-motorista tbody');
    tbody.innerHTML = '';
    viagens.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.id}</td>
            <td>${formatDateBR(v.data)}</td>
            <td>${v.destino}</td>
            <td>${formatMoney(v.valor_mercadoria)}</td>
            <td>${formatMoney(v.valor_frete)}</td>
            <td><span class="badge ${v.status_pagamento === 'Pago' ? 'badge-success' : 'badge-warning'}">${v.status_pagamento}</span></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('card-detalhes-motorista').style.display = 'block';
}

function fecharDetalhesMotorista() {
    document.getElementById('card-detalhes-motorista').style.display = 'none';
}

// DASHBOARD E CÁLCULOS AUTOMÁTICOS
function renderDashboard() {
    const totalTransf = transferencias.length;
    const totalMercadoria = transferencias.reduce((acc, t) => acc + t.valor_mercadoria, 0);
    const totalFrete = transferencias.reduce((acc, t) => acc + t.valor_frete, 0);
    const custoMedio = totalTransf > 0 ? totalFrete / totalTransf : 0;
    const percentualFrete = totalMercadoria > 0 ? (totalFrete / totalMercadoria) * 100 : 0;

    document.getElementById('dash-total-transferencias').textContent = totalTransf;
    document.getElementById('dash-total-mercadoria').textContent = formatMoney(totalMercadoria);
    document.getElementById('dash-total-frete').textContent = formatMoney(totalFrete);
    document.getElementById('dash-percentual-frete').textContent = percentualFrete.toFixed(2) + '%';
    document.getElementById('dash-custo-medio').textContent = formatMoney(custoMedio);

    // Métricas por Destino
    const sjrp = transferencias.filter(t => t.destino === 'São José do Rio Preto');
    const jard = transferencias.filter(t => t.destino === 'Jardinópolis');

    document.getElementById('dash-sjrp-qtd').textContent = `${sjrp.length} viagens`;
    document.getElementById('dash-sjrp-valor').textContent = formatMoney(sjrp.reduce((a, b) => a + b.valor_mercadoria, 0));
    document.getElementById('dash-sjrp-frete').textContent = formatMoney(sjrp.reduce((a, b) => a + b.valor_frete, 0));

    document.getElementById('dash-jard-qtd').textContent = `${jard.length} viagens`;
    document.getElementById('dash-jard-valor').textContent = formatMoney(jard.reduce((a, b) => a + b.valor_mercadoria, 0));
    document.getElementById('dash-jard-frete').textContent = formatMoney(jard.reduce((a, b) => a + b.valor_frete, 0));

    renderCharts(sjrp, jard);
}

// RENDERIZAÇÃO DE GRÁFICOS (Chart.js)
function renderCharts(sjrp, jard) {
    // 1. Gráfico de Pizza: Transferências por Destino
    const ctxDestinos = document.getElementById('chartDestinos').getContext('2d');
    if (chartDestinosObj) chartDestinosObj.destroy();
    chartDestinosObj = new Chart(ctxDestinos, {
        type: 'doughnut',
        data: {
            labels: ['São José do Rio Preto', 'Jardinópolis'],
            datasets: [{
                data: [sjrp.length, jard.length],
                backgroundColor: ['#2563eb', '#8b5cf6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Gráfico de Barras: Comparativo Fretes vs Mercadoria por Destino
    const ctxComp = document.getElementById('chartComparativo').getContext('2d');
    if (chartComparativoObj) chartComparativoObj.destroy();
    chartComparativoObj = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: ['São José do Rio Preto', 'Jardinópolis'],
            datasets: [{
                label: 'Total Gasto em Frete (R$)',
                data: [
                    sjrp.reduce((a, b) => a + b.valor_frete, 0),
                    jard.reduce((a, b) => a + b.valor_frete, 0)
                ],
                backgroundColor: ['#2563eb', '#8b5cf6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 3. Gráfico de Evolução Temporária
    const ctxEvolucao = document.getElementById('chartEvolucao').getContext('2d');
    if (chartEvolucaoObj) chartEvolucaoObj.destroy();
    chartEvolucaoObj = new Chart(ctxEvolucao, {
        type: 'line',
        data: {
            labels: transferencias.map(t => formatDateBR(t.data)),
            datasets: [
                {
                    label: 'Valor da Carga (R$)',
                    data: transferencias.map(t => t.valor_mercadoria),
                    borderColor: '#10b981',
                    fill: false
                },
                {
                    label: 'Valor do Frete (R$)',
                    data: transferencias.map(t => t.valor_frete),
                    borderColor: '#f59e0b',
                    fill: false
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 4. Gastos por Motorista
    const fretePorMotorista = {};
    transferencias.forEach(t => {
        fretePorMotorista[t.motorista_nome] = (fretePorMotorista[t.motorista_nome] || 0) + t.valor_frete;
    });

    const ctxMotoristas = document.getElementById('chartMotoristas').getContext('2d');
    if (chartMotoristasObj) chartMotoristasObj.destroy();
    chartMotoristasObj = new Chart(ctxMotoristas, {
        type: 'bar',
        data: {
            labels: Object.keys(fretePorMotorista),
            datasets: [{
                label: 'Total Pago ao Motorista em Frete (R$)',
                data: Object.values(fretePorMotorista),
                backgroundColor: '#14b8a6'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// CONTROLE EXCLUSIVO DA PÁGINA DESTINOS
function renderDestinosPage() {
    const sjrp = transferencias.filter(t => t.destino === 'São José do Rio Preto');
    const jard = transferencias.filter(t => t.destino === 'Jardinópolis');

    // SJRP
    const valSjrp = sjrp.reduce((a, b) => a + b.valor_mercadoria, 0);
    const freteSjrp = sjrp.reduce((a, b) => a + b.valor_frete, 0);
    document.getElementById('dest-sjrp-qtd').textContent = sjrp.length;
    document.getElementById('dest-sjrp-mercadoria').textContent = formatMoney(valSjrp);
    document.getElementById('dest-sjrp-fretes').textContent = formatMoney(freteSjrp);
    document.getElementById('dest-sjrp-media').textContent = formatMoney(sjrp.length > 0 ? freteSjrp / sjrp.length : 0);
    document.getElementById('dest-sjrp-top-motorista').textContent = getTopMotorista(sjrp);

    // Jardinópolis
    const valJard = jard.reduce((a, b) => a + b.valor_mercadoria, 0);
    const freteJard = jard.reduce((a, b) => a + b.valor_frete, 0);
    document.getElementById('dest-jard-qtd').textContent = jard.length;
    document.getElementById('dest-jard-mercadoria').textContent = formatMoney(valJard);
    document.getElementById('dest-jard-fretes').textContent = formatMoney(freteJard);
    document.getElementById('dest-jard-media').textContent = formatMoney(jard.length > 0 ? freteJard / jard.length : 0);
    document.getElementById('dest-jard-top-motorista').textContent = getTopMotorista(jard);

    // Gráficos da Tela Destinos
    const ctxVal = document.getElementById('chartDestinosValores').getContext('2d');
    if (chartDestinosValoresObj) chartDestinosValoresObj.destroy();
    chartDestinosValoresObj = new Chart(ctxVal, {
        type: 'bar',
        data: {
            labels: ['São José do Rio Preto', 'Jardinópolis'],
            datasets: [{ label: 'Valor Total Transportado (R$)', data: [valSjrp, valJard], backgroundColor: '#2563eb' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxFrete = document.getElementById('chartDestinosFretes').getContext('2d');
    if (chartDestinosFretesObj) chartDestinosFretesObj.destroy();
    chartDestinosFretesObj = new Chart(ctxFrete, {
        type: 'bar',
        data: {
            labels: ['São José do Rio Preto', 'Jardinópolis'],
            datasets: [{ label: 'Total Gasto com Frete (R$)', data: [freteSjrp, freteJard], backgroundColor: '#8b5cf6' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function getTopMotorista(lista) {
    if (lista.length === 0) return 'Nenhum registro';
    const cont = {};
    lista.forEach(item => cont[item.motorista_nome] = (cont[item.motorista_nome] || 0) + 1);
    let top = ''; let max = 0;
    for (const m in cont) { if (cont[m] > max) { max = cont[m]; top = m; } }
    return `${top} (${max} viagens)`;
}

// RELATÓRIOS E EXPORTAÇÃO
function gerarRelatorio() {
    const dtInicio = document.getElementById('rel-data-inicio').value;
    const dtFim = document.getElementById('rel-data-fim').value;
    const destino = document.getElementById('rel-destino').value;
    const motorista = document.getElementById('rel-motorista').value;

    const filtrado = transferencias.filter(t => {
        const matchesDestino = !destino || t.destino === destino;
        const matchesMotorista = !motorista || t.motorista_id == motorista;
        const matchesData = (!dtInicio || t.data >= dtInicio) && (!dtFim || t.data <= dtFim);
        return matchesDestino && matchesMotorista && matchesData;
    });

    const totCarga = filtrado.reduce((a, b) => a + b.valor_mercadoria, 0);
    const totFrete = filtrado.reduce((a, b) => a + b.valor_frete, 0);
    const percent = totCarga > 0 ? (totFrete / totCarga) * 100 : 0;

    document.getElementById('rel-total-transf').textContent = filtrado.length;
    document.getElementById('rel-total-carga').textContent = formatMoney(totCarga);
    document.getElementById('rel-total-frete').textContent = formatMoney(totFrete);
    document.getElementById('rel-percentual').textContent = percent.toFixed(2) + '%';
    document.getElementById('report-periodo-text').textContent = `Período: ${dtInicio ? formatDateBR(dtInicio) : 'Início'} até ${dtFim ? formatDateBR(dtFim) : 'Atual'}`;

    const tbody = document.querySelector('#table-relatorio tbody');
    tbody.innerHTML = '';
    filtrado.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.id}</td>
            <td>${formatDateBR(t.data)}</td>
            <td>${t.destino}</td>
            <td>${t.motorista_nome}</td>
            <td>${t.veiculo} (${t.placa})</td>
            <td>${formatMoney(t.valor_mercadoria)}</td>
            <td>${formatMoney(t.valor_frete)}</td>
            <td>${t.status_pagamento}</td>
        `;
        tbody.appendChild(tr);
    });
}

function imprimirRelatorio() {
    window.print();
}

function exportarExcel() {
    let csv = 'ID;Data;Origem;Destino;Motorista;Veiculo;Placa;Valor Mercadoria;Valor Frete;Status Pagamento\n';
    transferencias.forEach(t => {
        csv += `${t.id};${formatDateBR(t.data)};${t.origem};${t.destino};${t.motorista_nome};${t.veiculo};${t.placa};${t.valor_mercadoria};${t.valor_frete};${t.status_pagamento}\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `relatorio_transferencias_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// CONFIGURAÇÕES E BANCO DE DADOS
function limparBancoDados() {
    if (confirm("ATENÇÃO: Deseja apagar todos os dados registrados? Essa ação não pode ser desfeita.")) {
        localStorage.removeItem(STORAGE_TRANSFERENCIAS);
        localStorage.removeItem(STORAGE_MOTORISTAS);
        transferencias = [];
        motoristas = [];
        location.reload();
    }
}

function carregarDadosExemplo() {
    localStorage.removeItem(STORAGE_TRANSFERENCIAS);
    localStorage.removeItem(STORAGE_MOTORISTAS);
    initDefaultData();
    location.reload();
}

function showToast(mensagem) {
    const toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}