// CONTROLE DO PLAYER DE VÍDEO CUSTOMIZADO
function abrirVideo(url) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    if (modal && player) {
        player.src = url;
        modal.style.display = 'flex';
    }
}

function fecharVideo() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    if (modal && player) {
        player.src = '';
        modal.style.display = 'none';
    }
}
