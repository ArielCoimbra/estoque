/* ==========================================================================
   CONFIGURAÇÕES GERAIS E VARIÁVEIS DE ESTADO
   ========================================================================== */
const PLANILHA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT497aMvO-qP2dOn4WqT2T-y3S-6Y4eZ4N6z5Z0/pub?output=csv"; // Insira a URL do seu CSV publicado

let todosVeiculos = [];
let veiculosFiltrados = [];
let blocoAtual = 0;
const ITENS_POR_BLOCO = 12;
let modoLojaAtivo = false;
let filtroMargemAtivo = false;

/* ==========================================================================
   INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosCSV();
    configurarEventosFiltros();
    configurarEventosModais();
    verificarModoLojaSalvo();
});

/* ==========================================================================
   CARREGAMENTO E PARSING DO CSV (PAPA PARSE)
   ========================================================================== */
function carregarDadosCSV() {
    exibirSkeletons();

    Papa.parse(PLANILHA_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            processarDadosPlanilha(results.data);
        },
        error: function (error) {
            console.error("Erro ao carregar CSV:", error);
            const container = document.getElementById("lista-carros");
            if (container) {
                container.innerHTML = `<div class="col-12 text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1"></i>
                    <p class="mt-2 fw-bold">Não foi possível carregar o estoque no momento.</p>
                </div>`;
            }
        }
    });
}

function processarDadosPlanilha(dados) {
    todosVeiculos = dados.map((item, index) => {
        const id = index + 1;
        const modelo = (item.Modelo || item.modelo || "Veículo não identificado").trim();
        const marca = (item.Marca || item.marca || "").trim();
        const placa = (item.Placa || item.placa || "N/A").trim().toUpperCase();
        const cor = (item.Cor || item.cor || "N/A").trim();
        const km = (item.KM || item.km || item.Quilometragem || "N/A").trim();
        const valorRaw = (item.Valor || item.valor || item.Preco || "0").toString();
        const fipeRaw = (item.Fipe || item.fipe || "0").toString();
        const margemRaw = (item.Margem || item.margem || "0").toString();
        
        const valorNum = parseMoedaNum(valorRaw);
        const fipeNum = parseMoedaNum(fipeRaw);
        const margemNum = parseMoedaNum(margemRaw);

        const status = (item.Status || item.status || "disponivel").toLowerCase().trim();
        const carroceria = (item.Carroceria || item.carroceria || item.Tipo || "outros").toLowerCase().trim();
        
        const novidade = (item.Novidade || item.novidade || "").toString().toLowerCase() === "sim";
        const baixou = (item.Baixou || item.baixou || "").toString().toLowerCase() === "sim";
        const laudo = (item.Laudo || item.laudo || "").trim();
        const video = (item.Video || item.video || "").trim();
        const descricao = (item.Descricao || item.descricao || item.Observacoes || "Veículo em excelente estado para repasse.").trim();

        // Fotos
        const foto1 = (item.Foto1 || item.foto1 || item.Imagem || "").trim();
        const foto2 = (item.Foto2 || item.foto2 || "").trim();
        const foto3 = (item.Foto3 || item.foto3 || "").trim();
        const foto4 = (item.Foto4 || item.foto4 || "").trim();
        const fotos = [foto1, foto2, foto3, foto4].filter(url => url !== "");

        return {
            id,
            modelo,
            marca,
            placa,
            cor,
            km,
            valorRaw,
            valorNum,
            valor: formatarMoeda(valorNum),
            fipeNum,
            fipe: formatarMoeda(fipeNum),
            margemNum,
            margem: formatarMoeda(margemNum),
            status,
            carroceria,
            novidade,
            baixou,
            laudo,
            video,
            descricao,
            fotos
        };
    });

    veiculosFiltrados = [...todosVeiculos];
    blocoAtual = 0;
    renderizarProximoBloco(true);
    atualizarContador();
}

/* ==========================================================================
   RENDERIZAÇÃO DOS CARDS DE VEÍCULOS
   ========================================================================== */
function renderizarProximoBloco(limparAnterior = false) {
    const container = document.getElementById("lista-carros");
    if (!container) return;

    if (limparAnterior) {
        container.innerHTML = "";
        blocoAtual = 0;
    }

    if (veiculosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search fs-1 text-muted"></i>
                <h6 class="fw-bold mt-2 text-secondary">Nenhum veículo encontrado com os filtros selecionados.</h6>
            </div>`;
        return;
    }

    const inicio = blocoAtual * ITENS_POR_BLOCO;
    const fim = inicio + ITENS_POR_BLOCO;
    const bloco = veiculosFiltrados.slice(inicio, fim);

    bloco.forEach(carro => {
        const fotoUrl = carro.fotos.length > 0 ? carro.fotos[0] : "https://via.placeholder.com/400x300?text=Sem+Foto";
        
        const badgeNovidade = carro.novidade ? `<span class="tag-feature tag-feature-novidade">✨ Novidade</span>` : "";
        const badgeBaixou = carro.baixou ? `<span class="tag-feature tag-feature-baixou">🔥 Baixou</span>` : "";
        const badgeLaudo = carro.laudo ? `<span class="tag-feature tag-feature-laudo">📋 Laudo</span>` : "";
        const badgeVideo = carro.video ? `<span class="tag-feature tag-feature-video">🎥 Vídeo</span>` : "";

        const isVendido = carro.status === "vendido";
        const classeStatus = isVendido ? "tag-status-vendido" : "tag-status-disponivel";
        const textoStatus = isVendido ? "Vendido" : "Disponível";

        const cardHtml = `
            <div class="col animation-fade-in" onclick="abrirModalDetalhesDirect(${carro.id})">
                <div class="card-vehicle ${isVendido ? 'opacity-75' : ''}">
                    <div class="img-vehicle-wrapper">
                        <span class="tag-status ${classeStatus}">${textoStatus}</span>
                        <div class="badges-container-card">
                            ${badgeNovidade}
                            ${badgeBaixou}
                            ${badgeVideo}
                            ${badgeLaudo}
                        </div>
                        <img src="${fotoUrl}" class="img-vehicle" loading="lazy" alt="${carro.modelo}" onerror="tratarImagemQuebrada(this)">
                    </div>
                    <div class="card-vehicle-body">
                        <div>
                            <h5 class="vehicle-title text-truncate" title="${carro.modelo}">${carro.modelo}</h5>
                            <div class="specs-grid">
                                <div class="spec-pill"><span>Placa</span>${modoLojaAtivo ? carro.placa : '***-***'}</div>
                                <div class="spec-pill text-truncate"><span>Cor</span>${carro.cor}</div>
                                <div class="spec-pill text-truncate"><span>KM</span>${carro.km}</div>
                                <div class="spec-pill text-truncate"><span>Margem</span><span class="text-success fw-bold p-0 m-0" style="font-size:0.68rem;">${carro.margem}</span></div>
                            </div>
                        </div>
                        <div class="price-container">
                            <div><span class="price-label">REPASSE</span><span class="price-value">${carro.valor}</span></div>
                            <span class="btn btn-sm btn-outline-dark rounded-pill btn-acessar-card fw-bold">Ver</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML("beforeend", cardHtml);
    });

    blocoAtual++;
}

// Efeito Ghost Skeleton enquanto carrega
function exibirSkeletons() {
    const container = document.getElementById("lista-carros");
    if (!container) return;

    let skeletonsHtml = "";
    for (let i = 0; i < 6; i++) {
        skeletonsHtml += `
            <div class="col">
                <div class="card-vehicle p-2">
                    <div class="skeleton skeleton-img mb-2"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>`;
    }
    container.innerHTML = skeletonsHtml;
}

/* ==========================================================================
   FILTROS E PESQUISA
   ========================================================================== */
function configurarEventosFiltros() {
    const campoPesquisa = document.getElementById("campo-pesquisa");
    if (campoPesquisa) {
        campoPesquisa.addEventListener("input", aplicarFiltrosGerais);
    }

    const filtroPreco = document.getElementById("filtro-preco");
    if (filtroPreco) {
        filtroPreco.addEventListener("change", aplicarFiltrosGerais);
    }

    const botoesPill = document.querySelectorAll(".btn-filter-pill:not(.btn-margem-toggle)");
    botoesPill.forEach(btn => {
        btn.addEventListener("click", function () {
            botoesPill.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            aplicarFiltrosGerais();
        });
    });

    const btnMargem = document.querySelector(".btn-margem-toggle");
    if (btnMargem) {
        btnMargem.addEventListener("click", function () {
            filtroMargemAtivo = !filtroMargemAtivo;
            this.classList.toggle("active-margem", filtroMargemAtivo);
            aplicarFiltrosGerais();
        });
    }

    // Scroll Infinito para carregar mais itens
    window.addEventListener("scroll", () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (blocoAtual * ITENS_POR_BLOCO < veiculosFiltrados.length) {
                renderizarProximoBloco(false);
            }
        }
    });
}

function aplicarFiltrosGerais() {
    const termo = (document.getElementById("campo-pesquisa")?.value || "").toLowerCase().trim();
    const faixaPreco = document.getElementById("filtro-preco")?.value || "todos";
    const categoriaAtiva = document.querySelector(".btn-filter-pill.active")?.getAttribute("data-cat") || "todos";

    veiculosFiltrados = todosVeiculos.filter(carro => {
        // Busca texto
        const bateTexto = carro.modelo.toLowerCase().includes(termo) ||
                          carro.marca.toLowerCase().includes(termo) ||
                          carro.cor.toLowerCase().includes(termo) ||
                          carro.placa.toLowerCase().includes(termo);

        // Busca Preço
        let batePreco = true;
        if (faixaPreco === "ate-50k") batePreco = carro.valorNum <= 50000;
        else if (faixaPreco === "50k-80k") batePreco = carro.valorNum > 50000 && carro.valorNum <= 80000;
        else if (faixaPreco === "acima-80k") batePreco = carro.valorNum > 80000;

        // Categoria / Pill
        let bateCategoria = true;
        if (categoriaAtiva === "novidades") bateCategoria = carro.novidade;
        else if (categoriaAtiva === "baixou") bateCategoria = carro.baixou;
        else if (categoriaAtiva !== "todos") bateCategoria = carro.carroceria.includes(categoriaAtiva);

        // Filtro Margem
        let bateMargem = true;
        if (filtroMargemAtivo) bateMargem = carro.margemNum > 0;

        return bateTexto && batePreco && bateCategoria && bateMargem;
    });

    if (filtroMargemAtivo) {
        veiculosFiltrados.sort((a, b) => b.margemNum - a.margemNum);
    }

    renderizarProximoBloco(true);
    atualizarContador();
}

function atualizarContador() {
    const contador = document.getElementById("contador-veiculos");
    if (contador) {
        contador.textContent = `${veiculosFiltrados.length} veículo(s) encontrado(s)`;
    }
}

/* ==========================================================================
   MODAIS E DETALHES DO VEÍCULO
   ========================================================================== */
function abrirModalDetalhesDirect(id) {
    const carro = todosVeiculos.find(v => v.id === id);
    if (!carro) return;

    document.getElementById("modalModelo").textContent = carro.modelo;
    document.getElementById("modalValor").textContent = carro.valor;
    document.getElementById("modalMargem").textContent = carro.margem;
    document.getElementById("modalFipe").textContent = carro.fipe;
    document.getElementById("modalPlaca").textContent = modoLojaAtivo ? carro.placa : "Consulte";
    document.getElementById("modalCor").textContent = carro.cor;
    document.getElementById("modalKm").textContent = carro.km;
    document.getElementById("modalCarroceria").textContent = carro.carroceria;
    document.getElementById("modalDescricao").textContent = carro.descricao;

    // Carrossel de Fotos
    const containerFotos = document.getElementById("modalFotosContainer");
    if (containerFotos) {
        containerFotos.innerHTML = "";
        const listaFotos = carro.fotos.length > 0 ? carro.fotos : ["https://via.placeholder.com/600x400?text=Sem+Foto"];

        listaFotos.forEach((foto, index) => {
            const activeClass = index === 0 ? "active" : "";
            containerFotos.innerHTML += `
                <div class="carousel-item ${activeClass}">
                    <img src="${foto}" class="d-block modal-carousel-img" alt="Foto do veículo" onerror="tratarImagemQuebrada(this)">
                </div>`;
        });
    }

    // Container de Laudo / Vídeo
    const containerLaudo = document.getElementById("modalLaudoContainer");
    if (containerLaudo) {
        let laudoHtml = "";
        if (carro.laudo) {
            laudoHtml += `<a href="${carro.laudo}" target="_blank" class="btn btn-sm btn-outline-primary w-100 mb-2 fw-bold"><i class="bi bi-file-earmark-pdf-fill"></i> Visualizar Laudo Cautelar</a>`;
        }
        if (carro.video) {
            laudoHtml += `<button onclick="abrirVideo('${carro.video}')" class="btn btn-sm btn-danger w-100 fw-bold"><i class="bi bi-play-circle-fill"></i> Assistir Vídeo de Apresentação</button>`;
        }
        containerLaudo.innerHTML = laudoHtml;
    }

    // Botão WhatsApp
    const containerWpp = document.getElementById("modalBotaoWppContainer");
    if (containerWpp) {
        const textoMsg = encodeURIComponent(`Olá Ariel, tenho interesse no veículo: ${carro.modelo} (${carro.placa}) - Valor: ${carro.valor}`);
        containerWpp.innerHTML = `
            <a href="https://wa.me/5551986597751?text=${textoMsg}" target="_blank" class="btn btn-success fw-bold w-100 rounded-3 py-2 d-flex align-items-center justify-content-center gap-2">
                <i class="bi bi-whatsapp"></i> Tenho Interesse
            </a>`;
    }

    // Botão Compartilhar
    const btnShare = document.getElementById("btn-compartilhar-nativo");
    if (btnShare) {
        btnShare.onclick = () => {
            if (navigator.share) {
                navigator.share({
                    title: carro.modelo,
                    text: `Confira este ${carro.modelo} por ${carro.valor} na Ariel Unidas Atacado!`,
                    url: window.location.href
                }).catch(console.error);
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link do catálogo copiado para a área de transferência!");
            }
        };
    }

    const modal = new bootstrap.Modal(document.getElementById("modalDetalhes"));
    modal.show();
}

function configurarEventosModais() {
    const btnAutenticar = document.getElementById("btn-autenticar-loja");
    if (btnAutenticar) {
        btnAutenticar.addEventListener("click", autenticarModoLoja);
    }

    const btnDesconectar = document.getElementById("btn-desconectar-loja");
    if (btnDesconectar) {
        btnDesconectar.addEventListener("click", desconectarModoLoja);
    }

    const btnConsultar = document.getElementById("btn-consultar-placa");
    if (btnConsultar) {
        btnConsultar.addEventListener("click", consultarPlacaModoLoja);
    }
}

/* ==========================================================================
   MODO LOJA (ÁREA DO CLIENTE / SENHA)
   ========================================================================== */
function abrirModalLoja() {
    const modal = new bootstrap.Modal(document.getElementById("modalLoja"));
    modal.show();
}

function abrirModalEndereco() {
    const modal = new bootstrap.Modal(document.getElementById("modalEndereco"));
    modal.show();
}

function autenticarModoLoja() {
    const senhaInput = document.getElementById("input-loja-senha")?.value;
    // Senha padrão demo "1234" ou configurada
    if (senhaInput === "1234" || senhaInput === "unidas2026") {
        modoLojaAtivo = true;
        localStorage.setItem("modoLojaAtivo", "true");
        atualizarInterfaceModoLoja();
        renderizarProximoBloco(true);
    } else {
        alert("Senha incorreta! Tente novamente.");
    }
}

function desconectarModoLoja() {
    modoLojaAtivo = false;
    localStorage.removeItem("modoLojaAtivo");
    atualizarInterfaceModoLoja();
    renderizarProximoBloco(true);
}

function verificarModoLojaSalvo() {
    if (localStorage.getItem("modoLojaAtivo") === "true") {
        modoLojaAtivo = true;
        atualizarInterfaceModoLoja();
    }
}

function atualizarInterfaceModoLoja() {
    const etapaSenha = document.getElementById("etapa-loja-senha");
    const etapaPlaca = document.getElementById("etapa-loja-placa");

    if (etapaSenha && etapaPlaca) {
        if (modoLojaAtivo) {
            etapaSenha.style.display = "none";
            etapaPlaca.style.display = "block";
        } else {
            etapaSenha.style.display = "block";
            etapaPlaca.style.display = "none";
        }
    }
}

function consultarPlacaModoLoja() {
    const placaInput = (document.getElementById("input-loja-placa")?.value || "").toUpperCase().trim();
    const resultadoContainer = document.getElementById("resultado-busca-loja");
    if (!resultadoContainer) return;

    const carro = todosVeiculos.find(v => v.placa === placaInput);
    if (carro) {
        resultadoContainer.innerHTML = `
            <div class="alert alert-success text-start rounded-3 mt-2">
                <h6 class="fw-bold mb-1">${carro.modelo}</h6>
                <p class="mb-1 small"><strong>Valor:</strong> ${carro.valor} | <strong>Margem:</strong> ${carro.margem}</p>
                <button class="btn btn-sm btn-dark w-100 mt-2 fw-bold" onclick="fecharModalEVisualizar(${carro.id})">Abrir Ficha Completa</button>
            </div>`;
    } else {
        resultadoContainer.innerHTML = `<div class="alert alert-warning small mt-2">Veículo com placa ${placaInput} não localizado no pátio.</div>`;
    }
}

function fecharModalEVisualizar(id) {
    const modalLojaEl = document.getElementById("modalLoja");
    const modalLoja = bootstrap.Modal.getInstance(modalLojaEl);
    if (modalLoja) modalLoja.hide();
    
    setTimeout(() => {
        abrirModalDetalhesDirect(id);
    }, 400);
}

/* ==========================================================================
   FUNÇÕES DO PLAYER DE VÍDEO CUSTOMIZADO
   ========================================================================== */
function abrirVideo(url) {
    const modal = document.getElementById("videoModal");
    const player = document.getElementById("videoPlayer");
    if (modal && player) {
        // Converte link do YouTube para formato Embed se necessário
        let embedUrl = url;
        if (url.includes("youtube.com/watch?v=")) {
            embedUrl = url.replace("watch?v=", "embed/");
        } else if (url.includes("youtu.be/")) {
            embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
        }

        player.src = embedUrl;
        modal.style.display = "flex";
    }
}

function fecharVideo() {
    const modal = document.getElementById("videoModal");
    const player = document.getElementById("videoPlayer");
    if (modal && player) {
        player.src = "";
        modal.style.display = "none";
    }
}

/* ==========================================================================
   FUNÇÕES AUXILIARES E FORMATADORES
   ========================================================================== */
function parseMoedaNum(valor) {
    if (!valor) return 0;
    const limpo = valor.toString().replace(/[^\d,-]/g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tratarImagemQuebrada(img) {
    img.onerror = null;
    img.src = "https://via.placeholder.com/400x300?text=Foto+Indisponivel";
}
