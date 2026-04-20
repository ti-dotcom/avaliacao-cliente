// ================= VARIÁVEIS GLOBAIS =================
let graficoMelhores = null;
let graficoPiores = null;
let token = null;
let usuarioLogado = null;

// ================= INICIALIZAÇÃO DOM =================
document.addEventListener("DOMContentLoaded", function () {

    token = localStorage.getItem('token');
    if (!token) {
        window.location.href = "login-index.html";
        return;
    }

    try {
        const payloadBase64 = token.split('.')[1];
        usuarioLogado = JSON.parse(atob(payloadBase64));
    } catch (e) {
        logout();
        return;
    }

    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const btnLogout = document.getElementById('btnLogout');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const filtroLoja = document.getElementById('filtroLoja');
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    const btnFiltrarPeriodo = document.getElementById('btnFiltrarPeriodo');
    const btnLimparFiltro = document.getElementById('btnLimparFiltro');
    const btnLogoutGerente = document.getElementById('btnLogoutGerente');

    if (usuarioLogado.cargo === 'admin') {

        menuBtn?.addEventListener("click", function () {
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
        });

        overlay?.addEventListener("click", function () {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });

        const btnLogoutGerente = document.getElementById('btnLogoutGerente');
        btnLogoutGerente?.parentElement?.remove();

    } else if (usuarioLogado.cargo === 'gerente') {

        sidebar?.remove();
        overlay?.remove();
        menuBtn?.remove();

        const btnLogoutGerente = document.getElementById('btnLogoutGerente');

        if (btnLogoutGerente) {
            btnLogoutGerente.style.display = "block";

            btnLogoutGerente.addEventListener("click", () => {
                logout();
            });
        }

    }

    btnLogout?.addEventListener('click', logout);
    btnFecharModal?.addEventListener('click', fecharModal);
    filtroLoja?.addEventListener('change', carregarDashboard);
    btnFiltrarPeriodo?.addEventListener('click', carregarDashboard);

    btnLimparFiltro?.addEventListener('click', () => {
        filtroLoja.value = "todas";
        dataInicio.value = "";
        dataFim.value = "";
        carregarDashboard();
    });

    window.addEventListener('click', function (e) {
        if (e.target.id === 'modalComentario') fecharModal();
    });

    carregarLojasFiltro();
    carregarDashboard();
    setInterval(carregarDashboard, 60000);
});

// ================= FUNÇÕES =================

function logout() {
    localStorage.removeItem('token');
    window.location.href = "login-index.html";
}

function fecharModal() {
    document.getElementById('modalComentario').style.display = 'none';
}

function verComentario(texto, data) {
    document.getElementById('dataComentario').innerText =
        `Enviado em: ${formatarData(data)}`;
    document.getElementById('textoComentario').innerText =
        texto || 'Sem comentário.';
    document.getElementById('modalComentario').style.display = 'block';
}

function formatarData(dataStr) {
    if (!dataStr) return "SEM DATA";
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return "SEM DATA";
    return d.toLocaleString('pt-BR');
}

function extrairData(obj) {
    return obj.data || obj.created_at || obj.data_avaliacao || null;
}

// ================= CARREGAMENTO DE LOJAS =================
async function carregarLojasFiltro() {
    try {
        const res = await fetch('/lojas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!res.ok) {
            logout();
            return;
        }

        const lojas = await res.json();
        const filtroLoja = document.getElementById('filtroLoja');

        filtroLoja.innerHTML = '<option value="todas">Todas</option>';

        lojas.forEach(loja => {
            const option = document.createElement('option');
            option.value = loja.id;
            option.textContent = loja.nome;
            filtroLoja.appendChild(option);
        });

    } catch (err) {
        console.error("Erro ao carregar lojas:", err);
    }
}

// ================= DASHBOARD =================
async function carregarDashboard() {
    try {
        const res = await fetch('/avaliacoes-detalhadas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!res.ok) {
            logout();
            return;
        }

        let avaliacoes = await res.json();

        const filtroLoja = document.getElementById('filtroLoja');
        const dataInicio = document.getElementById('dataInicio');
        const dataFim = document.getElementById('dataFim');

        const lojaSelecionada = filtroLoja.value;

        if (lojaSelecionada !== "todas") {
            avaliacoes = avaliacoes.filter(a => a.loja_id == lojaSelecionada);
        }

        if (dataInicio.value) {
            const inicio = new Date(dataInicio.value);
            avaliacoes = avaliacoes.filter(a => {
                const dataAvaliacao = new Date(extrairData(a));
                return dataAvaliacao >= inicio;
            });
        }

        if (dataFim.value) {
            const fim = new Date(dataFim.value);
            fim.setHours(23, 59, 59, 999);
            avaliacoes = avaliacoes.filter(a => {
                const dataAvaliacao = new Date(extrairData(a));
                return dataAvaliacao <= fim;
            });
        }

        const tabela = document.getElementById('corpoTabela');
        tabela.innerHTML = '';

        let somaTodasNotas = 0;
        let totalNotas = 0;

        const controleLojas = {};
        const mediasPorLoja = {};

        avaliacoes.forEach(a => {

            const mediaIndividual =
                (a.nota_atendimento + a.nota_organizacao + a.nota_produtos) / 3;

            if (!mediasPorLoja[a.nome]) {
                mediasPorLoja[a.nome] = { total: 0, quantidade: 0 };
            }

            mediasPorLoja[a.nome].total += mediaIndividual;
            mediasPorLoja[a.nome].quantidade++;

            somaTodasNotas += a.nota_atendimento + a.nota_organizacao + a.nota_produtos;
            totalNotas += 3;

            if (!controleLojas[a.nome]) {
                controleLojas[a.nome] = { boas: 0, ruins: 0 };
            }

            [a.nota_atendimento, a.nota_organizacao, a.nota_produtos].forEach(nota => {
                if (nota >= 4) controleLojas[a.nome].boas++;
                if (nota <= 3) controleLojas[a.nome].ruins++;
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.nome}</td>
                <td>${a.nota_atendimento}</td>
                <td>${a.nota_organizacao}</td>
                <td>${a.nota_produtos}</td>
                <td>${formatarData(extrairData(a))}</td>
            `;

            const tdBtn = document.createElement('td');
            const btn = document.createElement('button');
            btn.className = 'btn-comentario';
            btn.innerText = 'Ver Comentário';
            btn.addEventListener('click', () =>
                verComentario(a.comentario, extrairData(a))
            );

            tdBtn.appendChild(btn);
            tr.appendChild(tdBtn);
            tabela.appendChild(tr);
        });

        const mediaGeral = totalNotas ? (somaTodasNotas / totalNotas) : 0;
        document.getElementById("mediaGeral").innerText = mediaGeral.toFixed(2);
        document.getElementById("totalAvaliacoes").innerText = avaliacoes.length;

        let melhorLoja = "-";
        let maiorBoas = -1;
        let piorLoja = "-";
        let maiorRuins = -1;

        Object.keys(controleLojas).forEach(nome => {
            if (controleLojas[nome].boas > maiorBoas) {
                maiorBoas = controleLojas[nome].boas;
                melhorLoja = nome;
            }
            if (controleLojas[nome].ruins > maiorRuins) {
                maiorRuins = controleLojas[nome].ruins;
                piorLoja = nome;
            }
        });

        document.getElementById("melhorLoja").innerText = melhorLoja;
        document.getElementById("piorLoja").innerText = piorLoja;

        const ranking = Object.keys(mediasPorLoja).map(nome => ({
            nome,
            media: mediasPorLoja[nome].total / mediasPorLoja[nome].quantidade
        }));

        // 🔥 FILTRO APLICADO AQUI

        // Melhores: média >= 4
        const melhores = ranking
            .filter(r => r.media >= 4)
            .sort((a, b) => b.media - a.media)
            .slice(0, 5);

        // Piores: média <= 3
        const piores = ranking
            .filter(r => r.media <= 3)
            .sort((a, b) => a.media - b.media)
            .slice(0, 5);

        atualizarGrafico("graficoMelhores", melhores, true);
        atualizarGrafico("graficoPiores", piores, false);

    } catch (err) {
        console.error("Erro no dashboard:", err);
    }
}

// ================= ATUALIZAR GRÁFICO =================
function atualizarGrafico(canvasId, dados, isMelhor) {

    const ctx = document.getElementById(canvasId).getContext('2d');

    if (canvasId === "graficoMelhores" && graficoMelhores)
        graficoMelhores.destroy();

    if (canvasId === "graficoPiores" && graficoPiores)
        graficoPiores.destroy();

    const corBarra = isMelhor
        ? 'rgba(5, 193, 120, 0.8)'
        : 'rgba(251, 65, 54, 0.8)';

    const corBorda = isMelhor
        ? 'rgba(5, 193, 120, 1)'
        : 'rgba(251, 65, 54, 1)';

    const novoGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.map(d => d.nome),
            datasets: [{
                label: 'Média',
                data: dados.map(d => d.media.toFixed(2)),
                backgroundColor: corBarra,
                borderColor: corBorda,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 5 } }
        }
    });

    if (canvasId === "graficoMelhores")
        graficoMelhores = novoGrafico;
    else
        graficoPiores = novoGrafico;
}