function gerenciarBannerDestaque(frase, link) {
    const box = document.getElementById('box-banner-destaque');
    
    // 1. Gerencia o banner normal do topo do site
    if (frase && frase !== "" && frase.toLowerCase() !== "null") {
        document.getElementById('texto-banner-destaque').innerText = frase;
        const containerBotao = document.getElementById('container-botao-banner');
        if (link && link.startsWith('http')) {
            containerBotao.innerHTML = `<a href="${link}" target="_blank" class="btn btn-warning btn-sm fw-bold px-4 py-2 rounded-pill shadow-sm"><i class="bi bi-whatsapp"></i> Acessar Grupo</a>`;
        } else {
            containerBotao.innerHTML = "";
        }
        box.style.display = "block";
    } else {
        box.style.display = "none";
    }

    // 2. LOGICA DA TELA DE BLOQUEIO (NOVO DISPOSITIVO)
    const overlayBloqueio = document.getElementById('bloqueio-grupo-overlay');
    const btnEntrarGrupo = document.getElementById('btn-bloqueio-entrar-grupo');
    
    // Verifica se o dispositivo já foi liberado no passado
    const dispositivoLiberado = localStorage.getItem('catalogo_grupo_liberado') === 'true';

    // Se NÃO for liberado E houver um link válido de grupo na planilha, bloqueia a tela
    if (!dispositivoLiberado && link && link.startsWith('http')) {
        // Aplica o link da planilha diretamente no botão de bloqueio
        btnEntrarGrupo.href = link;
        
        // Remove a rolagem do site de trás enquanto estiver bloqueado
        document.body.style.overflow = 'hidden';
        overlayBloqueio.style.display = 'flex';

        // Quando o cliente clicar para entrar no grupo, o site grava a liberação definitiva
        btnEntrarGrupo.onclick = function() {
            localStorage.setItem('catalogo_grupo_liberado', 'true');
            
            // Aguarda um pequeno delay e some com o bloqueio (libera o site)
            setTimeout(() => {
                overlayBloqueio.style.display = 'none';
                document.body.style.overflow = 'auto'; // Devolve a rolagem do site
            }, 800);
        };
    } else {
        // Se já for um cliente antigo liberado, garante que a tela fique oculta
        overlayBloqueio.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}
