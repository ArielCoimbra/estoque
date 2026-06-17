function gerenciarBannerDestaque(frase, link) {
    const box = document.getElementById('box-banner-destaque');
    const textoBanner = document.getElementById('texto-banner-destaque');
    const containerBotao = document.getElementById('container-botao-banner');
    
    // 1. Gerencia o banner normal do topo do site (Protegido)
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

    // 2. LOGICA DA TELA DE BLOQUEIO (Protegido contra erros de elementos nulos)
    const overlayBloqueio = document.getElementById('bloqueio-grupo-overlay');
    const btnEntrarGrupo = document.getElementById('btn-bloqueio-entrar-grupo');
    
    // Se por acaso você esqueceu de salvar o index.html com o novo bloco, o JS não vai travar
    if (!overlayBloqueio || !btnEntrarGrupo) {
        console.warn("Aviso: Elementos da tela de bloqueio não foram encontrados no index.html");
        return; 
    }
    
    // Verifica se o dispositivo já foi liberado no passado
    const dispositivoLiberado = localStorage.getItem('catalogo_grupo_liberado') === 'true';

    // Se NÃO for liberado E houver um link válido de grupo na planilha, bloqueia a tela
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
