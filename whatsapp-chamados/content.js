let btn = null;
let conversaAtual = null; // armazena o número da conversa atual

function criarBotaoFixo() {
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'finalizar-fixo';
    btn.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: none;
      color: white;
      border: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(btn);

    btn.onclick = async () => {
      if (!conversaAtual) return;

      try {
        const response = await fetch('http://localhost:9000/api/chamados/finalizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero: conversaAtual })
        });
        const result = await response.json();
        if (result.message) {
          alert(`Chamado de ${conversaAtual} finalizado!`);
          btn.innerText = 'Finalizado';
          btn.disabled = true;
          btn.style.background = '#999';
        }
      } catch (err) {
        console.error('Erro ao finalizar chamado:', err);
        alert('Erro ao finalizar chamado.');
      }
    };
  }

  // Detecta a conversa aberta
  const msgEl = document.querySelector('div[data-id]');
  if (!msgEl) {
    btn.style.display = 'none';
    conversaAtual = null;
    return;
  }

  const dataId = msgEl.getAttribute('data-id');
  const match = dataId.match(/(\d+@(c|g)\.us)/);
  if (!match) {
    btn.style.display = 'none';
    conversaAtual = null;
    return;
  }

  const numeroId = match[1];

  // Só faz requisição se a conversa mudou
  if (numeroId !== conversaAtual) {
    conversaAtual = numeroId;
    verificarChamado(numeroId).then(status => {
      if (status === 'finalizado') {
        btn.innerText = 'Finalizado';
        btn.disabled = true;
        btn.style.background = '#999';
      } else {
        btn.innerText = 'Finalizar';
        btn.disabled = false;
        btn.style.background = '#25D366';
      }
      btn.style.display = 'block';
    });
  }
}

// Observa mudanças no DOM
const observer = new MutationObserver(criarBotaoFixo);
observer.observe(document.body, { childList: true, subtree: true });

// Inicializa
criarBotaoFixo();

async function verificarChamado(numeroId) {
  try {
    const response = await fetch(`http://localhost:9000/api/chamados/${numeroId}`);
    const chamado = await response.json();

    if (!chamado) {
      await fetch('http://localhost:9000/api/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: numeroId })
      });
      return 'aberto';
    }

    return chamado.status;
  } catch (err) {
    console.error('Erro ao verificar chamado:', err);
    return null;
  }
}


