// ====== ESTADO LOCAL ======
let btn = null;
let conversaAtual = null;
let ultimaMsgId = null;
let openedAt = null; // 🔹 guarda a hora de abertura da conversa

// ====== LOG
function log(...args) {
  console.log("[Chamados]", ...args);
}

// ====== HELPERS ======
function getCurrentJid() {
  const chat = document.querySelector("div[data-id^='false_']");
  if (!chat) return null;
  const dataId = chat.getAttribute("data-id");
  if (!dataId) return null;
  const parts = dataId.split("_");
  return parts.length > 1 ? parts[1] : null;
}

// 🔹 Verifica status do último chamado
async function verificarChamado(numero) {
  try {
    const res = await fetch(`http://localhost:9000/api/chamados/${numero}`);
    const data = await res.json();

    if (data && data.status) return data.status;
    log("Resposta inesperada do backend:", data);
    return "finalizado";
  } catch (err) {
    log("Erro verificarChamado", err);
    return "finalizado";
  }
}

// 🔹 Abrir chamado somente se não houver aberto
async function abrirChamado() {
  if (!conversaAtual) return;
  try {
    const res = await fetch("http://localhost:9000/api/chamados/abrir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: conversaAtual }),
    });
    const data = await res.json();
    log("abrirChamado ->", data);
    pintarBotao("aberto");
  } catch (err) {
    log("Erro abrirChamado", err);
  }
}

// 🔹 Finalizar chamado atual
async function finalizarChamado() {
  if (!conversaAtual) return;
  try {
    const res = await fetch("http://localhost:9000/api/chamados/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: conversaAtual }),
    });
    const data = await res.json();
    log("finalizarChamado ->", data);
    pintarBotao("finalizado");
  } catch (err) {
    log("Erro finalizarChamado", err);
  }
}

// 🔹 Cria botão fixo na tela
function criarBotao() {
  if (btn) return;
  btn = document.createElement("button");
  btn.id = "finalizar-fixo";
  btn.style.cssText = `
    position: fixed;
    top: 14px;
    right: 180px;
    z-index: 9999;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
  `;
  btn.addEventListener("click", () => {
    if (btn.innerText === "Finalizar") finalizarChamado();
  });
  document.body.appendChild(btn);
}

// 🔹 Atualiza visual do botão conforme status
function pintarBotao(status) {
  if (!btn) return;
  if (status === "aberto") {
    btn.innerText = "Finalizar";
    btn.style.background = "#e74c3c";
    btn.style.color = "#fff";
  } else {
    btn.innerText = "Finalizado";
    btn.style.background = "#2ecc71";
    btn.style.color = "#fff";
  }
}

// 🔹 Sincroniza conversa atual e botão
async function syncConversaAtual() {
  const jid = getCurrentJid();
  if (!jid) {
    conversaAtual = null;
    if (btn) btn.style.display = "none";
    return;
  }

  if (jid !== conversaAtual) {
    conversaAtual = jid;
    openedAt = Date.now();

    // Pega última mensagem da conversa
    const allMsgs = [...document.querySelectorAll('div[data-id*="@c.us"], div[data-id*="@g.us"]')];
    if (allMsgs.length > 0) {
      const last = allMsgs[allMsgs.length - 1];
      ultimaMsgId = last.getAttribute("data-id") || null;
      log("Última msg registrada ao abrir conversa:", ultimaMsgId);
    }

    const status = await verificarChamado(conversaAtual);
    pintarBotao(status);
    if (btn) btn.style.display = "block";
    log("Conversa atual:", conversaAtual, "status:", status);
  }
}

// 🔹 Observa novas mensagens para criar chamado apenas na interação
function bindMessagesObserver() {
  // Painel de mensagens (novos WA costumam usar esses data-testids)
  const messagesPanel =
    document.querySelector('[data-testid="conversation-panel-body"]') ||
    document.querySelector('[data-testid="conversation-panel-messages"]') ||
    document.body; // fallback

  const obs = new MutationObserver((mutations) => {
    if (!conversaAtual) return;

    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;

        // pega um candidato com data-id (o id da mensagem do WA)
        let msgEl = null;
        if (n.matches?.('div[data-id*="@c.us"], div[data-id*="@g.us"]')) {
          msgEl = n;
        } else {
          msgEl = n.querySelector?.('div[data-id*="@c.us"], div[data-id*="@g.us"]');
        }
        if (!msgEl) continue;

        const msgId = msgEl.getAttribute("data-id");
        if (!msgId) continue;

        // trava para não disparar múltiplas vezes na mesma msg
        if (msgId === ultimaMsgId) continue;
        ultimaMsgId = msgId;

        // Confirma que a msg é da conversa atual (confere JID dentro do data-id)
        const jidMatch = msgId.match(/(\d+@(?:c|g)\.us)/);
        const jidNaMsg = jidMatch ? jidMatch[1] : null;
        if (!jidNaMsg || jidNaMsg !== conversaAtual) continue;

        log("📩 Nova mensagem detectada (data-id):", msgId);
        debouncedAbrirChamado();
      }
    }
  });

  obs.observe(messagesPanel, { childList: true, subtree: true });
}

function bindInboxObserver() {
  const inboxPanel = document.querySelector("#pane-side"); // painel lateral de conversas
  if (!inboxPanel) {
    console.log("[Chamados] Painel de inbox não encontrado, tentando novamente em 1s...");
    setTimeout(bindInboxObserver, 1000);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;

        // procura badge de mensagens não lidas
        const badge = n.querySelector('span[aria-label*="mensagem"]');
        if (!badge) continue;

        // pega JID do chat a partir do atributo data-id
        const dataIdEl = n.querySelector("div[data-id^='false_']");
        if (!dataIdEl) continue;

        const dataId = dataIdEl.getAttribute("data-id");
        const parts = dataId.split("_");
        const jid = parts.length > 1 ? parts[1] : null;
        if (!jid) continue;

        console.log("[Chamados] Nova mensagem recebida no inbox:", jid);

        // 🔹 Abre chamado automaticamente para este JID
        conversaAtual = jid;
        debouncedAbrirChamado();
      }
    }
  });

  observer.observe(inboxPanel, { childList: true, subtree: true });
  console.log("[Chamados] Observador da inbox ativo");
}


// 🔹 Debounce para evitar múltiplas chamadas
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
const debouncedAbrirChamado = debounce(abrirChamado, 500);

// 🔹 Inicialização
function start() {
  criarBotao();
  setInterval(syncConversaAtual, 1000);
  bindMessagesObserver();
}

start();