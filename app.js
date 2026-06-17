const urlPlanilha = 'https://docs.google.com/spreadsheets/d/1xzN1JBC-5Li7csrGOTDq_wADj0AOAafVfCtVYeo99eI/export?format=csv&gid=0';

let todosOsCarros = []; 
let listaFiltradaGlobal = [];
let categoriaAtiva = 'todos';
let filtroPrecoAtivo = 'todos';
let ordenarPorMargemAtivo = false;
let termoPesquisa = '';
let hashSenhaMestre = ''; 

let itensExibidosAtualmente = 0;
const tamanhoDoBlocoPagina = 12;

document.addEventListener("DOMContentLoaded", () => {
    exibirSkeletonsIniciais();
    configurarEventosInterface();
    carregarEstoqueComCache();
});

function configurarEventosInterface() {
    document.getElementById('campo-pesquisa').addEventListener('input', (e) => {
        termoPesquisa = e.target.value.toLowerCase().trim();
        processarEstoque();
    });

    document.getElementById('filtro-preco').addEventListener('change', (e) => {
        filtroPrecoAtivo = e.target.value;
        processarEstoque();
    });

    document.querySelectorAll('.btn-filter-pill:not(.btn-margem-toggle)').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-filter-pill:not(.btn-margem-toggle)').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            categoriaAtiva = this.getAttribute('data-cat');
            processarEstoque();
        });
    });

    document.querySelector('.btn-margem-toggle').addEventListener('click', function() {
        ordenarPorMargemAtivo = !ordenarPorMargemAtivo;
        this.classList.toggle('active-margem', ordenarPorMargemAtivo);
        processarEstoque();
    });

    document.getElementById('btn-autenticar-loja').addEventListener('click', verificarSenhaLoja);
    document.getElementById('btn-desconectar-loja').addEventListener('click', sairModoLoja);
    document.getElementById('btn-consultar-placa').addEventListener('click', buscarCarroPorPlacaLoja);

    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            renderizarProximoBloco();
        }
    });
}

function exibirSkeletonsIniciais() {
    const container = document.getElementById('lista-carros');
    let htmlSkeleton = '';
    for (let i = 0; i < 6; i++) {
        htmlSkeleton += `
            <div class="col">
                <div class="card border-0 bg-white p-2 rounded-4 shadow-sm" style="height: 260px;">
                    <div class="skeleton skeleton-img mb-2"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>
        `;
    }
    container.innerHTML = htmlSkeleton;
}

async function carregarEstoqueComCache() {
    const CHAVE_CACHE = 'estoque_unidas_data';
    const CHAVE_TEMPO = 'estoque_unidas_timestamp';
    const CINCO_MINUTOS = 5 * 60 * 1000;

    const cacheSalvo = localStorage.getItem(CHAVE_CACHE);
    const tempoSalvo = localStorage.getItem(CHAVE_TEMPO);
    const agora = new Date().getTime();

    if (cacheSalvo && tempoSalvo && (agora - tempoSalvo < CINCO_MINUTOS)) {
        parsearDadosPlanilha(cacheSalvo);
    } else {
        try {
            const resposta = await fetch(urlPlanilha + '&nocache=' + agora);
            if (!resposta.ok) throw new Error();
            const textoCsv = await resposta.text();
            
            localStorage.setItem(CHAVE_CACHE, textoCsv);
            localStorage.setItem(CHAVE_TEMPO, agora.toString());
            
            parsearDadosPlanilha(textoCsv);
        } catch (erro) {
            if (cacheSalvo) {
                parsearDadosPlanilha(cacheSalvo);
            } else {
                document.getElementById('lista-carros').innerHTML = '<div class="text-center w-100 my-5 text-danger"><h6>⚠️ Falha ao sincronizar banco de dados.</h6></div>';
            }
        }
    }
}

function parsearDadosPlanilha(textoCsv) {
    Papa.parse(textoCsv, {
        skipEmptyLines: true,
        complete: function(resultados) {
            const linhas = resultados.data;
            if (linhas.length === 0) return;

            if (linhas.length > 2 && linhas[2][11]) {
                const senhaLimpa = linhas[2][11].trim();
                hashSenhaMestre = CryptoJS.SHA256(senhaLimpa).toString();
            }

            let fraseDestaque = (linhas[0] && linhas[0][11]) ? linhas[0][11].trim() : "";
            let linkGrupoWpp = (linhas[1] && linhas[1][11]) ? lines[1][11].trim() : "";

            gerenciarBannerDestaque(fraseDestaque, linkGrupoWpp);

            linhas.shift();

            let disponiveis = [];
            let vendidos = [];
            let novidadesParaLetreiro = [];

            linhas.forEach((linha, index) => {
                if (linha.length < 2 || !linha[1] || linha[1].trim() === "") return;

                const txtStatusH = linha[7] ? linha[7].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'disponivel';
                const txtStatusI = linha[8] ? linha[8].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
                
                const ehNovidade = txtStatusH.includes('novidade') || txtStatusI.includes('novidade');
                const ehBaixou = txtStatusH.includes('baixou') || txtStatusI.includes('baixou') || txtStatusH.includes('preco');

                const modeloTexto = linha[1].trim();

                const carro = {
                    id: index,
                    placaReal: linha[0] ? linha[0].toUpperCase().trim() : 'N/I',
                    placa: linha[0] ? '*****' + linha[0].trim().slice(-2) : 'N/I',
                    modelo: modeloTexto.replace(/novidade/i, '').replace(/baixou o preco/i, '').replace(/baixou/i, '').trim(),
                    cor: staticSanitize(linha[2]),
                    km: formatarKM(linha[3]),
                    fipe: staticSanitize(linha[4]),
                    valor: staticSanitize(linha[5]),
                    valorNumerico: converterPrecoParaNumero(linha[5]),
                    margem: staticSanitize(linha[6]),
                    status: txtStatusH,
                    fotoCapa: linha[8] ? linha[8].trim() : '',
                    fotosCarrossel: linha[9] || '',
                    descricao: linha[10] || 'Nenhuma observação técnica cadastrada.',
                    carroceria: identificarCarroceria(modeloTexto),
                    novidade: ehNovidade,
                    baixouPreco: ehBaixou
                };

                if (carro.status.includes('vendido')) {
                    vendidos.push(carro);
                } else {
                    disponiveis.push(carro);
                    if (ehNovidade) novidadesParaLetreiro.push(carro);
                }
            });

            todosOsCarros = [...disponiveis, ...vendidos];
            montarFaixaLetreiro(novidadesParaLetreiro);
            processarEstoque();
        }
    });
}

function staticSanitize(val) {
    if (!val) return 'N/I';
    return String(val).replace(/^["']|["']$/g, '').trim();
}

function formatarKM(val) {
    if(!val || val === 'N/I') return 'N/I';
    let clean = staticSanitize(val);
    return clean.toLowerCase().includes('km') ? clean : clean + ' KM';
}

function converterPrecoParaNumero(texto) {
    if (!texto) return 0;
    let limpo = texto.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

function identificarCarroceria(modelo) {
    const m = modelo.toLowerCase();
    if (['hilux','s10','toro','ranger','oroch','saveiro','strada','montana','fiorino','frontier','amarok','l200','ram','titano'].some(p => m.includes(p))) return 'picape';
    if (['compass','creta','renegade','kicks','tracker','hr-v','duster','t-cross','nivus','pulse','fastback','ix35','sportage','captur'].some(s => m.includes(s))) return 'suv';
    if (['corolla','civic','prisma','sentra','cronos','logan','virtus','voyage','city','versa','siena','cruze'].some(s => m.includes(s))) return 'sedan';
    if (['onix','gol','hb20','uno','palio','sandero','ka','argo','polo','mobi','up','fiesta','fox','c3','208'].some(h => m.includes(h))) return 'hatch';
    return 'outros';
}

function gerenciarBannerDestaque(frase, link) {
    const box = document.getElementById('box-banner-destaque');
    const textoBanner = document.getElementById('texto-banner-destaque');
    const containerBotao = document.getElementById('container-botao-banner');
    
    if (box && textoBanner && containerBotao) {
        if (frase && frase !== "" && frase.toLowerCase() !== "null") {
            textoBanner.innerText = frase;
            if (link && link.startsWith('http')) {
                containerBotao.innerHTML = `<a href="${link}" target="_blank" class="btn btn-warning btn-sm fw-bold px-4 py-2 rounded-pill shadow-sm"><i class="bi bi-whatsapp"></i> Acessar Grupo</a>`;
            } else {
                containerBotao.innerHTML = "";
            }
            box.style.display = "block";
        } else {
            box.style.display = "none";
        }
    }

    const overlayBloqueio = document.getElementById('bloqueio-grupo-overlay');
    const btnEntrarGrupo = document.getElementById('btn-bloqueio-entrar-grupo');
    
    if (overlayBloqueio && btnEntrarGrupo) {
        const dispositivoLiberado = localStorage.getItem('catalogo_grupo_liberado') === 'true';

        if (!dispositivoLiberado && link && link.startsWith('http')) {
            btnEntrarGrupo.href = link;
            document.body.style.overflow = 'hidden';
            overlayBloqueio.style.display = 'flex';

            btnEntrarGrupo.onclick = function() {
                localStorage.setItem('catalogo_grupo_liberado', 'true');
                setTimeout(() => {
                    overlayBloqueio.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }, 800);
            };
        } else {
            overlayBloqueio.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

function montarFaixaLetreiro(listaNovidades) {
    const divFaixa = document.getElementById('faixa-letreiro-container');
    const conteudoFaixa = document.getElementById('faixa-letreiro-conteudo');
    if (listaNovidades.length === 0) { divFaixa.style.display = 'none'; return; }

    let htmlLetreiro = "";
    const triplicado = [...listaNovidades, ...listaNovidades, ...listaNovidades];
    triplicado.forEach(carro => {
        htmlLetreiro += `<span class="item-ticker" onclick="abrirModalDetalhesDirect(${carro.id})"><span class="text-warning fw-bold">⚡ NOVIDADE:</span> ${carro.modelo} → <span class="text-success fw-bold">Lucro: ${carro.margem}</span></span>`;
    });
    conteudoFaixa.innerHTML = htmlLetreiro;
    divFaixa.style.display = 'block';
}

function processarEstoque() {
    let filtrados = [...todosOsCarros];

    if (categoriaAtiva === 'novidades') {
        filtrados = filtrados.filter(c => c.novidade && !c.status.includes('vendido'));
    } else if (categoriaAtiva === 'baixou') {
        filtrados = filtrados.filter(c => c.baixouPreco && !c.status.includes('vendido'));
    } else if (categoriaAtiva !== 'todos') {
        filtrados = filtrados.filter(c => c.carroceria === categoriaAtiva);
    }

    if (filtroPrecoAtivo === 'ate-50k') {
        filtrados = filtrados.filter(c => c.valorNumerico > 0 && c.valorNumerico <= 50000);
    } else if (filtroPrecoAtivo === '50k-80k') {
        filtrados = filtrados.filter(c => c.valorNumerico > 50000 && c.valorNumerico <= 80000);
    } else if (filtroPrecoAtivo === 'acima-80k') {
        filtrados = filtrados.filter(c => c.valorNumerico > 80000);
    }

    if (termoPesquisa !== '') {
        filtrados = filtrados.filter(c => 
            c.modelo.toLowerCase().includes(termoPesquisa) ||
            c.cor.toLowerCase().includes(termoPesquisa) ||
            c.placaReal.toLowerCase().includes(termoPesquisa)
        );
    }

    if (ordenarPorMargemAtivo) {
        filtrados.sort((a, b) => converterPrecoParaNumero(b.margem) - converterPrecoParaNumero(a.margem));
    }

    listaFiltradaGlobal = filtrados;
    document.getElementById('contador-veiculos').innerText = `${listaFiltradaGlobal.length} veículos encontrados`;

    itensExibidosAtualmente = 0;
    document.getElementById('lista-carros').innerHTML = '';
    renderizarProximoBloco();
}

function renderizarProximoBloco() {
    if (itensExibidosAtualmente >= listaFiltradaGlobal.length) return;

    const container = document.getElementById('lista-carros');
    const limite = Math.min(itensExibidosAtualmente + tamanhoDoBlocoPagina, listaFiltradaGlobal.length);

    for (let i = itensExibidosAtualmente; i < limite; i++) {
        const carro = listaFiltradaGlobal[i];
        const esVendido = carro.status.includes('vendido');
        const classeStatus = esVendido ? 'tag-status-vendido' : 'tag-status-disponivel';
        const textoStatus = esVendido ? 'RESERVADO' : 'DISPONÍVEL';
        
        const fotoUrl = carro.fotoCapa.startsWith('http') ? converterLinkDrive(carro.fotoCapa) : 'https://placehold.co/600x400/0f172a/ffffff?text=ARIEL_UNIDAS';
        
        const badgeNovidade = (carro.novidade && !esVendido) ? `<span class="tag-feature tag-feature-novidade">✨ NOVIDADE</span>` : '';
        const badgeBaixou = (carro.baixouPreco && !esVendido) ? `<span class="tag-feature tag-feature-baixou">🔥 BAIXOU</span>` : '';

        const cardHtml = `
            <div class="col" onclick="abrirModalDetalhesDirect(${carro.id})">
                <div class="card-vehicle">
                    <div class="img-vehicle-wrapper">
                        <span class="tag-status ${classeStatus}">${textoStatus}</span>
                        ${badgeNovidade} ${badgeBaixou}
                        <img src="${fotoUrl}" class="img-vehicle" loading="lazy" alt="${carro.modelo}" onerror="tratarImagemQuebrada(this)">
                    </div>
                    <div class="card-vehicle-body">
                        <div>
                            <h5 class="vehicle-title text-truncate" title="${carro.modelo}">${carro.modelo}</h5>
                            <div class="specs-grid">
                                <div class="spec-pill"><span>Placa</span>${carro.placa}</div>
                                <div class="spec-pill text-truncate"><span>Cor</span>${carro.cor}</div>
                                <div class="spec-pill text-truncate"><span>KM</span>${carro.km}</div>
                                <div class="spec-pill text-truncate"><span>Margem</span><span class="text-success fw-bold p-0 m-0" style="font-size:0.68rem;">${carro.margem}</span></div>
                            </div>
                        </div>
                        <div class="price-container">
                            <div><span class="price-label">REPASSE</span><span class="price-value">${carro.valor}</span></div>
                            <span class="btn btn-sm btn-outline-dark rounded-pill fw-bold">Ver</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    }
    itensExibidosAtualmente = limite;
}

// Tratamento de imagem quebrada do Drive modificado para retornar nulo de forma limpa
function tratarImagemQuebrada(imagemElemento) {
    imagemElemento.onerror = null; 
    imagemElemento.src = 'https://placehold.co/600x400/090d16/ffffff?text=Imagem+em+Atualização';
}

function converterLinkDrive(link) {
    if (link.includes('drive.google.com')) {
        let id = '';
        if (link.includes('id=')) {
            id = link.split('id=')[1].split('&')[0];
        } else if (link.includes('/d/')) {
            id = link.split('/d/')[1].split('/')[0];
        }
        return 'https://lh3.googleusercontent.com/d/' + id;
    }
    return link;
}

function abrirModalDetalhesDirect(idCarro) {
    const carro = todosOsCarros.find(c => c.id === idCarro);
    if (!carro) return;

    document.getElementById('modalModelo').innerText = carro.modelo;
    document.getElementById('modalValor').innerText = carro.valor;
    document.getElementById('modalMargem').innerText = carro.margem;
    document.getElementById('modalFipe').innerText = carro.fipe;
    document.getElementById('modalPlaca').innerText = carro.placa; 
    document.getElementById('modalCor').innerText = carro.cor;
    document.getElementById('modalKm').innerText = carro.km;
    document.getElementById('modalCarroceria').innerText = carro.carroceria;
    document.getElementById('modalDescricao').innerText = carro.descricao;

    const containerFotos = document.getElementById('modalFotosContainer');
    containerFotos.innerHTML = '';
    
    let arrFotos = [];
    if (carro.fotoCapa !== '') arrFotos.push(carro.fotoCapa);
    if (carro.fotosCarrossel !== '') {
        arrFotos = arrFotos.concat(carro.fotosCarrossel.split(',').map(f => f.trim()).filter(f => f !== ''));
    }
    if (arrFotos.length === 0) arrFotos.push('https://placehold.co/600x400/0f172a/ffffff?text=ARIEL_UNIDAS');

    arrFotos.forEach((foto, index) => {
        const urlLimpa = converterLinkDrive(foto);
        containerFotos.innerHTML += `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${urlLimpa}" class="modal-carousel-img" alt="Foto" onerror="tratarImagemQuebrada(this)">
            </div>
        `;
    });

    document.getElementById('btn-compartilhar-nativo').onclick = function() {
        const payloadTexto = `🔥 Ficha de Repasse: *${carro.modelo}*\n💰 Valor de Lote: ${carro.valor}\n📈 Tabela FIPE: ${carro.fipe}\n🎨 Cor: ${carro.cor} | 🧭 KM: ${carro.km}\n\nConfira as imagens direto no catálogo completo!`;
        if (navigator.share) {
            navigator.share({ title: carro.modelo, text: payloadTexto, url: window.location.href }).catch(() => {});
        } else {
            navigator.clipboard.writeText(payloadTexto);
            alert('Ficha copiada!');
        }
    };

    const esVendido = carro.status.includes('vendido');
    const containerBotao = document.getElementById('modalBotaoWppContainer');
    if (!esVendido) {
        const msg = encodeURIComponent(`Olá Ariel Coimbra, estou avaliando o veículo *${carro.modelo}* no catálogo digital e gostaria de iniciar a negociação.`);
        containerBotao.innerHTML = `<a href="https://wa.me/5551986597751?text=${msg}" target="_blank" class="btn btn-success w-100 py-1.5 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-1.5 small"><i class="bi bi-whatsapp"></i> Negociar</a>`;
    } else {
        containerBotao.innerHTML = `<button class="btn btn-secondary w-100 py-1.5 rounded-3 small" disabled>Reservado</button>`;
    }

    new bootstrap.Modal(document.getElementById('modalDetalhes')).show();
}

function abrirModalLoja() {
    document.getElementById('input-loja-senha').value = '';
    document.getElementById('input-loja-placa').value = '';
    document.getElementById('resultado-busca-loja').innerHTML = '';
    const permitido = localStorage.getItem('modoLojaPermitido') === 'true';
    document.getElementById('etapa-loja-senha').style.display = permitido ? 'none' : 'block';
    document.getElementById('etapa-loja-placa').style.display = permitido ? 'block' : 'none';
    new bootstrap.Modal(document.getElementById('modalLoja')).show();
}

function verificarSenhaLoja() {
    const digitada = document.getElementById('input-loja-senha').value.trim();
    if(!digitada) return alert('Digite a senha!');
    
    const hashDigitado = CryptoJS.SHA256(digitada).toString();
    if (hashDigitado === hashSenhaMestre) {
        localStorage.setItem('modoLojaPermitido', 'true');
        document.getElementById('etapa-loja-senha').style.display = 'none';
        document.getElementById('etapa-loja-placa').style.display = 'block';
    } else {
        alert('Código de segurança incorreto.');
    }
}

function sairModoLoja() {
    localStorage.removeItem('modoLojaPermitido');
    document.getElementById('etapa-loja-senha').style.display = 'block';
    document.getElementById('etapa-loja-placa').style.display = 'none';
    document.getElementById('resultado-busca-loja').innerHTML = '';
}

function buscarCarroPorPlacaLoja() {
    const placaBuscada = document.getElementById('input-loja-placa').value.toUpperCase().trim();
    const divResultado = document.getElementById('resultado-busca-loja');
    if(!placaBuscada) return alert('Insira a placa para pesquisa.');

    const carro = todosOsCarros.find(c => c.placaReal === placaBuscada);
    if(carro) {
        divResultado.innerHTML = `
            <div class="card border-0 text-start rounded-4 shadow-sm bg-light">
                <div class="card-body p-3">
                    <h6 class="fw-bold text-dark mb-2">${carro.modelo}</h6>
                    <p class="mb-1 small"><strong>Placa:</strong> <span class="badge bg-dark rounded-2">${carro.placaReal}</span></p>
                    <p class="mb-1 small"><strong>Margem:</strong> <span class="text-success fw-bold">${carro.margem}</span></p>
                    <p class="mb-3 small"><strong>Lote:</strong> <span class="text-primary fw-bold">${carro.valor}</span></p>
                    <button class="btn btn-premium-action w-100 btn-sm" onclick="fecharLojaEVerCarroDireto(${carro.id})">Visualizar Fotos</button>
                </div>
            </div>
        `;
    } else {
        divResultado.innerHTML = `<div class="alert alert-danger py-2 small rounded-3">Nenhum veículo com a placa "${placaBuscada}".</div>`;
    }
}

function fecharLojaEVerCarroDireto(idCarro) {
    bootstrap.Modal.getInstance(document.getElementById('modalLoja')).hide();
    const carro = todosOsCarros.find(c => c.id === idCarro);
    abrirModalDetalhesDirect(idCarro);
    document.getElementById('modalPlaca').innerHTML = `<span class="badge bg-warning text-dark px-2 py-1 fw-bold">${carro.placaReal}</span>`;
}
