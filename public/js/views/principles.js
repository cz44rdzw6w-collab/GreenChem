import { PRINCIPLES } from "../data/principles.js";
import { store } from "../store.js";
import { esc, bar, toast } from "../ui.js";

export function render(el, params) {
  const selectedId = Number(params[0]) || null;

  const draw = (activeId) => {
    const s = store.get();
    const answered = Object.keys(s.quiz).length;
    const correct = Object.values(s.quiz).filter((q) => q.correct).length;
    el.innerHTML = `
      <div class="section-head">
        <div>
          <div class="eyebrow">Анастас пен Уорнер, 1998</div>
          <h1>Жасыл химияның 12 қағидасы</h1>
          <p>П. Анастас пен Дж. Уорнер (1998) тұжырымдаған қағидалар. Қағиданы таңдап, түсіндірмені оқып, білімді тексеру сұрағына жауап беріңіз.</p>
        </div>
        <div class="card" style="min-width:240px;padding:14px 18px">
          <div class="row-lbl" style="display:flex;justify-content:space-between;font-size:.9rem"><span>Жауап берілді</span><strong>${answered}/12</strong></div>
          ${bar((answered / 12) * 100)}
          <div class="muted small" style="margin-top:6px">Дұрыс жауап: ${correct} · ${answered ? Math.round((correct / answered) * 100) : 0}%</div>
        </div>
      </div>
      <div class="principle-grid">
        ${PRINCIPLES.map((p) => {
          const q = s.quiz[p.id];
          const status = q ? (q.correct ? `<span class="status lvl-high">✓ Дұрыс жауап</span>` : `<span class="status lvl-low">✗ Қайталау керек</span>`) : `<span class="status muted">Сұрақ күтуде</span>`;
          return `<button class="principle ${activeId === p.id ? "active" : ""}" data-id="${p.id}" aria-expanded="${activeId === p.id}">
            <div class="p-top"><span class="p-num">${p.id}</span><span class="p-ico" aria-hidden="true">${p.icon}</span></div>
            <h3>${p.title}</h3><span class="en">${p.en}</span>
            <p>${p.short}</p>${status}
          </button>`;
        }).join("")}
      </div>
      <div id="detail" class="detail-panel"></div>`;

    el.querySelectorAll(".principle").forEach((b) =>
      b.addEventListener("click", () => {
        const id = Number(b.dataset.id);
        history.replaceState(null, "", `#/principles/${id}`);
        draw(id);
        el.querySelector("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );
    if (activeId) drawDetail(el.querySelector("#detail"), PRINCIPLES.find((p) => p.id === activeId), () => draw(activeId));
  };

  draw(selectedId);
  return selectedId ? `${selectedId}-қағида` : "";
}

function drawDetail(box, p, redraw) {
  if (!p) return;
  const prev = store.get().quiz[p.id];
  box.innerHTML = `
    <div class="card">
      <div class="grid grid-2">
        <div>
          <span class="pill">${p.id}-қағида · ${esc(p.en)}</span>
          <h2 style="margin-top:10px">${p.icon} ${p.title}</h2>
          <p><strong>${p.short}</strong></p>
          <p>${p.explanation}</p>
          <div class="example-box"><strong>Практикалық мысал: ${p.example.title}</strong><p style="margin:6px 0 0">${p.example.text}</p></div>
          <div class="btn-row" style="margin-top:14px">
            <a class="btn secondary sm" href="#/assistant?q=${encodeURIComponent(p.title + " қағидасын мысалмен түсіндірші")}">🤖 AI-дан толығырақ сұрау</a>
            ${p.id > 1 ? `<a class="btn ghost sm" href="#/principles/${p.id - 1}">← ${p.id - 1}-қағида</a>` : ""}
            ${p.id < 12 ? `<a class="btn ghost sm" href="#/principles/${p.id + 1}">${p.id + 1}-қағида →</a>` : ""}
          </div>
        </div>
        <div class="quiz-box">
          <div class="kicker">Білімді тексеру</div>
          <h3>${p.quiz.q}</h3>
          <div id="opts">${p.quiz.options.map((o, i) => `<button class="quiz-opt" data-i="${i}">${String.fromCharCode(65 + i)}) ${o}</button>`).join("")}</div>
          <div id="qfb"></div>
        </div>
      </div>
    </div>`;

  const opts = [...box.querySelectorAll(".quiz-opt")];
  const showResult = (choice, fresh) => {
    const ok = choice === p.quiz.correct;
    opts.forEach((b, i) => {
      b.disabled = true;
      if (i === p.quiz.correct) b.classList.add("correct");
      if (i === choice && !ok) b.classList.add("wrong");
    });
    box.querySelector("#qfb").innerHTML = `
      <div class="feedback-msg ${ok ? "ok" : "bad"}"><strong>${ok ? "Дұрыс! 🎉" : "Дұрыс емес."}</strong> ${p.quiz.explain}</div>
      <button class="btn ghost sm" id="retry" style="margin-top:8px">↻ Қайта жауап беру</button>`;
    box.querySelector("#retry").addEventListener("click", () => {
      store.update((s) => delete s.quiz[p.id]);
      redraw();
    });
    if (fresh) {
      store.update((s) => (s.quiz[p.id] = { answer: choice, correct: ok }), `${p.id}-қағида сұрағы: ${ok ? "дұрыс" : "қате"}`);
      toast(ok ? "Жауап сақталды ✓" : "Жауап сақталды. Түсіндірмені оқыңыз.");
    }
  };
  if (prev) showResult(prev.answer, false);
  opts.forEach((b) => b.addEventListener("click", () => {
    showResult(Number(b.dataset.i), true);
    // карточкадағы статусты жаңарту
    setTimeout(redraw, 1400);
  }));
}
