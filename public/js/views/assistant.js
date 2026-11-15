import { ask, renderMarkdown, checkAi } from "../assistant-engine.js";
import { SUGGESTIONS } from "../data/knowledge.js";
import { store } from "../store.js";
import { esc } from "../ui.js";

const MODES = [
  { id: "explain", name: "📘 Түсіндірме", hint: "Ұғымды мысалмен түсіндіреді" },
  { id: "hint", name: "💡 Кеңес", hint: "Дайын жауапсыз бағыттаушы сұрақтар береді" },
  { id: "feedback", name: "📝 Кері байланыс", hint: "Сіздің жауабыңызды бағалайды" },
];

const HKEY = "greenchemai.chat.v1";
let history = loadHistory();
let mode = "explain";

function loadHistory() {
  try {
    return JSON.parse(sessionStorage.getItem(HKEY)) || [];
  } catch {
    return [];
  }
}
function saveHistory() {
  try {
    sessionStorage.setItem(HKEY, JSON.stringify(history.slice(-40)));
  } catch {
    /* елемеу */
  }
}

const WELCOME =
  "Сәлем! Мен — **GreenChemAI көмекшісімін**. Жасыл химия бойынша сұрақтарыңызға жауап беремін.\n\n" +
  "- **Түсіндірме** режимі — ұғымдар мен мысалдар;\n- **Кеңес** режимі — кейс тапсырмаларына бағыт (дайын жауапсыз);\n- **Кері байланыс** режимі — өз жауабыңызды жазыңыз, мен оны бағалаймын.\n\n" +
  "Теңдеу жазсаңыз (`N2 + 3H2 -> 2NH3`), атомдық үнемділікті бірден есептеймін.";

export function render(el, params, query) {
  el.innerHTML = `
    <div class="section-head">
      <div>
        <div class="eyebrow">5-бөлім</div>
        <h1>AI көмекші</h1>
        <p>Химия бойынша сұрақ қойыңыз, кейс тапсырмаларына кеңес алыңыз немесе жауабыңызға кері байланыс сұраңыз.</p>
      </div>
    </div>
    <div class="chat-wrap">
      <div class="card chat">
        <div class="chat-head">
          <div class="modes" role="radiogroup" aria-label="Көмекші режимі">
            ${MODES.map((m) => `<button role="radio" aria-checked="${m.id === mode}" class="${m.id === mode ? "active" : ""}" data-mode="${m.id}" title="${m.hint}">${m.name}</button>`).join("")}
          </div>
          <button class="btn ghost sm" id="clearChat">🗑 Тазарту</button>
        </div>
        <div class="messages" id="messages" aria-live="polite"></div>
        <form class="chat-input" id="chatForm">
          <textarea id="chatIn" class="input" placeholder="Сұрағыңызды жазыңыз… (Enter — жіберу, Shift+Enter — жаңа жол)" aria-label="Хабарлама"></textarea>
          <button class="btn" type="submit" aria-label="Жіберу">➤</button>
        </form>
      </div>
      <aside>
        <div class="card">
          <h3>Жылдам сұрақтар</h3>
          <div class="chips">${SUGGESTIONS.map((s) => `<button class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>
        </div>
        <div class="card">
          <h3>Режим туралы</h3>
          <p class="small" id="modeInfo"></p>
          <p class="small muted" id="engineInfo">Қозғалтқыш тексерілуде…</p>
        </div>
        <div class="card">
          <h3>AI-ды жауапкершілікпен пайдалану</h3>
          <ul class="small qlist" style="padding-left:18px">
            <li>AI жауабын оқулық және деректермен салыстырып тексеріңіз.</li>
            <li>Кейс жауаптарын өз сөзіңізбен жазыңыз — AI тек бағыт береді.</li>
            <li>Есептеулерде молярлық массалар мен бірліктерді қайта тексеріңіз.</li>
          </ul>
        </div>
      </aside>
    </div>`;

  const msgs = el.querySelector("#messages");
  const input = el.querySelector("#chatIn");
  const form = el.querySelector("#chatForm");

  const updateModeInfo = () => {
    const m = MODES.find((x) => x.id === mode);
    el.querySelector("#modeInfo").innerHTML = `<strong>${m.name}</strong> — ${m.hint}.`;
    input.placeholder =
      mode === "feedback"
        ? "Кейс тапсырмасына жазған жауабыңызды осында қойыңыз…"
        : mode === "hint"
        ? "Қай тапсырмаға бағыт керек? Мысалы: «Boots процесінің AE неге төмен?»"
        : "Сұрағыңызды жазыңыз… (Enter — жіберу, Shift+Enter — жаңа жол)";
  };

  const bubble = (m) => {
    const d = document.createElement("div");
    d.className = `msg ${m.role === "user" ? "user" : "bot"}`;
    if (m.role === "user") d.textContent = m.content;
    else {
      const src = m.source === "ai" ? "Claude AI" : m.source === "calc" ? "Химиялық есептеуіш" : m.source === "local" ? "Офлайн білім базасы" : "";
      d.innerHTML = renderMarkdown(m.content) + (src ? `<span class="src">${src}</span>` : "");
    }
    return d;
  };

  const drawAll = () => {
    msgs.innerHTML = "";
    msgs.appendChild(bubble({ role: "assistant", content: WELCOME }));
    history.forEach((m) => msgs.appendChild(bubble(m)));
    msgs.scrollTop = msgs.scrollHeight;
  };

  let busy = false;
  const send = async (text) => {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    history.push({ role: "user", content: text });
    msgs.appendChild(bubble({ role: "user", content: text }));
    const typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.textContent = "Көмекші жауап дайындауда…";
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
    const apiHistory = history.map(({ role, content }) => ({ role, content }));
    const { text: reply, source } = await ask(apiHistory, mode);
    typing.remove();
    const m = { role: "assistant", content: reply, source };
    history.push(m);
    saveHistory();
    msgs.appendChild(bubble(m));
    msgs.scrollTop = msgs.scrollHeight;
    store.update((st) => (st.assistant.questions = (st.assistant.questions || 0) + 1));
    busy = false;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    send(v);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  el.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      el.querySelectorAll("[data-mode]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-checked", x === b);
      });
      updateModeInfo();
      input.focus();
    })
  );
  el.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => send(b.dataset.q)));
  el.querySelector("#clearChat").addEventListener("click", () => {
    history = [];
    saveHistory();
    drawAll();
  });

  checkAi().then((on) => {
    el.querySelector("#engineInfo").textContent = on
      ? "Қозғалтқыш: Claude AI (сервер). Химиялық есептеулерді дәл жергілікті модуль орындайды."
      : "Қозғалтқыш: офлайн білім базасы + химиялық есептеуіш. Толық AI режимі үшін серверде ANTHROPIC_API_KEY орнатыңыз.";
  });

  updateModeInfo();
  drawAll();
  const q = query.get("q");
  if (q) {
    send(q);
    window.history.replaceState(null, "", "#/assistant");
  }
  return "";
}
