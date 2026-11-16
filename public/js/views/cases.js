import { CASES } from "../data/cases.js";
import { store } from "../store.js";
import { evaluateCase, evaluateTask } from "../evaluator.js";
import { ask, aiEvaluate, renderMarkdown, checkAi } from "../assistant-engine.js";
import { esc, toast } from "../ui.js";
import { resultHtml, levelsLegend } from "./report.js";
import { ensureProfile } from "../profile.js";
import { submitWork, statusHtml, bindStatusActions, lastSubmission } from "../submit.js";
import { answerText } from "../evaluator.js";

const COLORS = { green: "bg-green", yellow: "bg-yellow", pink: "bg-pink" };

export function render(el, params) {
  const c = CASES.find((x) => x.id === params[0]);
  if (c) {
    renderCase(el, c);
    return `${c.stage}-модуль`;
  }
  renderList(el);
  return "";
}

function renderList(el) {
  const s = store.get();
  el.innerHTML = `
    <div class="section-head">
      <div>
        <div class="eyebrow">4-бөлім</div>
        <h1>Case Study модульдері</h1>
        <p>Бес прогрессивті модуль ғылыми зерттеу циклін қайталайды: мәселені анықтаудан бастап, экологиялық таза шешімді жобалауға дейін.</p>
      </div>
    </div>
    <div class="grid grid-3">
      ${CASES.map((c, i) => {
        const r = s.cases[c.id];
        const prevDone = i === 0 || s.cases[CASES[i - 1].id];
        const draft = s.drafts[c.id] && Object.keys(s.drafts[c.id]).length;
        const status = r
          ? `<span class="pill">✓ Аяқталды · ${r.percent}%</span>`
          : draft
          ? `<span class="pill yellow">✎ Жалғастыру</span>`
          : prevDone
          ? `<span class="pill gray">Бастауға дайын</span>`
          : `<span class="pill pink">Алдымен ${c.stage - 1}-модуль ұсынылады</span>`;
        return `<a class="card case-card" href="#/cases/${c.id}">
          <div class="stage"><span class="m-ico ${COLORS[c.color]}">${c.icon}</span><div><div class="eyebrow" style="margin:0">${c.stage}-кезең · ${c.duration}</div><strong>${c.stageName}</strong></div></div>
          <h3 style="margin:0">${c.title}</h3>
          <p class="muted small" style="margin:0">${c.summary}</p>
          <div style="margin-top:auto">${status}</div>
        </a>`;
      }).join("")}
    </div>
    <div class="card" style="margin-top:22px">
      <h2>Бағалау шкаласы</h2>
      <p class="muted">Әр кейс өз рубрикасымен бағаланады: сандық жауаптар дәлдікпен (±1–2%), ашық жауаптар негізгі ғылыми ұғымдардың қамтылуы мен дәлелдеу толықтығы бойынша тексеріледі.</p>
      ${levelsLegend()}
    </div>`;
}

function taskInput(task, value) {
  const v = value ?? "";
  if (task.type === "text")
    return `<textarea id="in-${task.id}" data-task="${task.id}" placeholder="Жауабыңызды осында жазыңыз…">${esc(v)}</textarea><div class="task-meta"><span id="wc-${task.id}">${(String(v).match(/[\p{L}\p{N}]+/gu) || []).length} сөз</span><span>· ұсынылатын көлем: ≥ ${task.minWords} сөз</span></div>`;
  if (task.type === "number")
    return `<div class="input-unit" style="max-width:340px"><input class="input" id="in-${task.id}" data-task="${task.id}" inputmode="decimal" placeholder="Мысалы: 12,5" value="${esc(v)}"><span>${task.unit}</span></div>`;
  if (task.type === "choice")
    return `<div class="options">${task.options.map((o, i) => `<label class="check ${String(v) === String(i) ? "selected" : ""}"><input type="radio" name="in-${task.id}" data-task="${task.id}" value="${i}" ${String(v) === String(i) ? "checked" : ""}>${esc(o)}</label>`).join("")}</div>`;
  if (task.type === "multi") {
    const sel = Array.isArray(v) ? v.map(Number) : [];
    return `<div class="options">${task.options.map((o, i) => `<label class="check ${sel.includes(i) ? "selected" : ""}"><input type="checkbox" data-task="${task.id}" value="${i}" ${sel.includes(i) ? "checked" : ""}>${esc(o)}</label>`).join("")}</div>`;
  }
  return "";
}

const TYPE_LABEL = { text: "Ашық жауап", number: "Есептеу", choice: "Бір жауап", multi: "Бірнеше жауап" };

function renderCase(el, c) {
  const s = store.get();
  const answers = { ...(s.drafts[c.id] || {}) };
  const result = s.cases[c.id];
  const idx = CASES.indexOf(c);

  el.innerHTML = `
    <nav class="timeline" aria-label="Модульдер">
      ${CASES.map((x) => `<a href="#/cases/${x.id}" class="${x.id === c.id ? "current" : ""} ${s.cases[x.id] ? "done" : ""}">${x.stage}. ${x.stageName}</a>`).join("")}
    </nav>
    <div class="case-layout">
      <div>
        <div class="card">
          <div class="eyebrow">${c.stage}-модуль · ${c.stageName} · ${c.duration}</div>
          <h1>${c.icon} ${c.title}</h1>
          <p class="muted">${c.summary}</p>
          <h3>Нақты әлемдегі мәселе</h3>
          <div class="context">${c.context.map((p) => `<p>${p}</p>`).join("")}</div>
          <div class="reaction">${c.reaction}</div>
        </div>
        <div class="card">
          <h2>📊 Деректер</h2>
          <div class="table-wrap"><table><tbody>${c.data.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join("")}</tbody></table></div>
          <h3 style="margin-top:16px">🧭 Бағыттаушы сұрақтар</h3>
          <ol class="qlist">${c.questions.map((q) => `<li>${q}</li>`).join("")}</ol>
        </div>
        <div class="card">
          <div class="section-head" style="margin-bottom:8px"><h2 style="margin:0">✍️ Тапсырмалар</h2><span class="muted small" id="saveState">Жауаптар автоматты сақталады</span></div>
          <form id="caseForm" novalidate>
            ${c.tasks.map((t, i) => {
              const tr = result?.taskResults?.[t.id];
              const crit = c.criteria.find((k) => k.id === t.criterion);
              return `<div class="task ${tr ? tr.status : ""}" id="task-${t.id}">
                <div class="task-head"><label for="in-${t.id}">${i + 1}. ${t.label}</label><span class="pill gray">${TYPE_LABEL[t.type]}</span></div>
                ${taskInput(t, answers[t.id])}
                <div class="task-meta"><span>Критерий: ${crit ? esc(crit.name) : ""}</span>
                  <button type="button" class="btn ghost sm" data-hint="${t.id}">💡 Кеңес</button>
                  <button type="button" class="btn ghost sm" data-aihint="${t.id}">🤖 AI-дан бағыт сұрау</button>
                  ${t.type === "text" ? `<button type="button" class="btn ghost sm" data-check="${t.id}">✓ Жауапты алдын ала тексеру</button>` : ""}
                </div>
                <div id="hint-${t.id}"></div>
                <div class="task-feedback" id="fb-${t.id}">${tr ? taskFeedback(t, tr) : ""}</div>
              </div>`;
            }).join("")}
            <div class="btn-row">
              <button class="btn" type="submit">📤 Жауаптарды тапсыру</button>
              <button class="btn secondary" type="button" id="clearDraft">Жауаптарды тазарту</button>
            </div>
          </form>
        </div>
        <div class="card" id="resultCard" ${result ? "" : "hidden"}>
          <h2>📋 Бағалау нәтижесі</h2>
          <div id="resultBody">${result ? resultHtml(result, c) : ""}</div>
          <div id="subStatus">${result ? statusHtml(lastSubmission("case", c.id)) : ""}</div>
          <div class="btn-row" style="margin-top:14px">
            <button class="btn pink" id="aiReview">🤖 AI арқылы терең бағалау</button>
            ${idx < CASES.length - 1 ? `<a class="btn" href="#/cases/${CASES[idx + 1].id}">Келесі модуль →</a>` : `<a class="btn" href="#/assessment">Қорытынды есепке өту →</a>`}
          </div>
        </div>
      </div>
      <aside class="sticky-side">
        <div class="card">
          <h3>📏 Бағалау критерийлері</h3>
          <div class="table-wrap"><table class="rubric"><thead><tr><th>Критерий</th><th>Салмағы</th></tr></thead><tbody>
            ${c.criteria.map((k) => `<tr><td>${k.name}<div class="small muted" style="font-weight:400">${k.description}</div></td><td>${k.weight}%</td></tr>`).join("")}
          </tbody></table></div>
        </div>
        <div class="card">
          <h3>Жұмыс алгоритмі</h3>
          <ol class="qlist small">
            <li>Мәтін мен деректерді мұқият оқыңыз.</li>
            <li>Бағыттаушы сұрақтарға жауап іздеңіз.</li>
            <li>Қажет болса, «💡 Кеңес» немесе AI көмекшіні пайдаланыңыз.</li>
            <li>Ашық жауаптарды алдын ала тексеріп, жетілдіріңіз.</li>
            <li>Жауаптарды бағалауға жіберіңіз.</li>
          </ol>
          <a class="btn secondary sm" href="#/metrics">📐 Метрика калькуляторлары</a>
        </div>
      </aside>
    </div>`;

  const form = el.querySelector("#caseForm");
  const saveState = el.querySelector("#saveState");
  let saveTimer;
  const persist = () => {
    clearTimeout(saveTimer);
    saveState.textContent = "Сақталуда…";
    saveTimer = setTimeout(() => {
      store.update((st) => (st.drafts[c.id] = { ...answers }));
      saveState.textContent = "✓ Жоба сақталды";
    }, 400);
  };

  form.addEventListener("input", (e) => {
    const t = e.target;
    const id = t.dataset.task;
    if (!id) return;
    const task = c.tasks.find((x) => x.id === id);
    if (task.type === "multi") {
      answers[id] = [...form.querySelectorAll(`input[data-task="${id}"]:checked`)].map((x) => Number(x.value));
    } else {
      answers[id] = t.value;
    }
    if (t.type === "radio" || t.type === "checkbox") {
      form.querySelectorAll(`input[data-task="${id}"]`).forEach((x) => x.closest(".check").classList.toggle("selected", x.checked));
    }
    if (task.type === "text") el.querySelector(`#wc-${id}`).textContent = `${(t.value.match(/[\p{L}\p{N}]+/gu) || []).length} сөз`;
    persist();
  });

  el.querySelectorAll("[data-hint]").forEach((b) =>
    b.addEventListener("click", () => {
      const t = c.tasks.find((x) => x.id === b.dataset.hint);
      el.querySelector(`#hint-${t.id}`).innerHTML = `<div class="hint-box"><strong>💡 Кеңес:</strong> ${t.hint}</div>`;
    })
  );

  el.querySelectorAll("[data-aihint]").forEach((b) =>
    b.addEventListener("click", async () => {
      const t = c.tasks.find((x) => x.id === b.dataset.aihint);
      const box = el.querySelector(`#hint-${t.id}`);
      box.innerHTML = `<div class="hint-box muted">🤖 AI көмекші ойлануда…</div>`;
      b.disabled = true;
      const online = await checkAi();
      const current = answers[t.id] ? `\nМенің қазіргі жауабым: ${Array.isArray(answers[t.id]) ? answers[t.id].map((i) => t.options[i]).join(", ") : answers[t.id]}` : "";
      const question = online
        ? `Кейс: «${c.title}». Тапсырма: ${t.label}${current}\nМаған дайын жауапты айтпа, тек бағыт бер.`
        : `${c.title} ${t.label}`;
      const { text, source } = await ask([{ role: "user", content: question }], "hint", `${c.title}: ${t.label}`);
      box.innerHTML = `<div class="hint-box">${renderMarkdown(source === "local" ? `${text}\n\n**Тапсырмаға нақты кеңес:** ${t.hint}` : text)}</div>`;
      b.disabled = false;
      store.update((st) => (st.assistant.questions = (st.assistant.questions || 0) + 1));
    })
  );

  el.querySelectorAll("[data-check]").forEach((b) =>
    b.addEventListener("click", () => {
      const t = c.tasks.find((x) => x.id === b.dataset.check);
      const r = evaluateTask(t, answers[t.id]);
      el.querySelector(`#fb-${t.id}`).innerHTML = taskFeedback(t, r, true);
    })
  );

  el.querySelector("#clearDraft").addEventListener("click", () => {
    if (!confirm("Осы кейстегі барлық жауаптар өшіріледі. Жалғастырасыз ба?")) return;
    store.update((st) => { delete st.drafts[c.id]; delete st.cases[c.id]; });
    renderCase(el, c);
  });

  bindStatusActions(el.querySelector("#resultCard"), () => {
    const box = el.querySelector("#subStatus");
    if (box) box.innerHTML = statusHtml(lastSubmission("case", c.id));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!(await ensureProfile())) return toast("Жұмысты тапсыру үшін профильді толтырыңыз");
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const r = evaluateCase(c, answers);
    store.update((st) => { st.drafts[c.id] = { ...answers }; st.cases[c.id] = r; }, `${c.stage}-кейс тапсырылды: ${r.percent}%`);
    const sub = await submitWork({
      kind: "case",
      itemId: c.id,
      title: `${c.stage}-модуль. ${c.title}`,
      percent: r.percent,
      score: `${r.points}/${r.maxPoints}`,
      level: r.level,
      criteria: r.criteria.map((k) => ({ name: k.name, percent: k.percent, weight: k.weight })),
      details: c.tasks.map((t, i) => {
        const tr = r.taskResults[t.id];
        return { n: i + 1, question: t.label, answer: answerText(t, answers[t.id]), result: `${Math.round(tr.score * 100)}%` };
      }),
    });
    toast(`Бағалау: ${r.percent}% (${r.level})${sub.status === "sent" ? " · ұйымдастырушыға жіберілді" : ""}`);
    renderCase(el, c);
    el.querySelector("#resultCard").scrollIntoView({ behavior: "smooth" });
  });

  const aiBtn = el.querySelector("#aiReview");
  if (aiBtn) {
    checkAi().then((on) => {
      if (!on) aiBtn.title = "Серверде AI кілті орнатылмаған — офлайн рубрикалық бағалау қолданылады";
    });
    aiBtn.addEventListener("click", async () => {
      const cur = store.get().cases[c.id];
      if (!cur) return;
      aiBtn.disabled = true;
      aiBtn.textContent = "🤖 Бағалануда…";
      const payload = {
        caseTitle: c.title,
        criteria: c.criteria,
        answers: c.tasks.map((t) => ({
          question: t.label,
          answer: Array.isArray(answers[t.id]) ? answers[t.id].map((i) => t.options[i]).join("; ") : t.type === "choice" && answers[t.id] !== undefined ? t.options[answers[t.id]] : answers[t.id] ?? "",
        })),
      };
      const review = await aiEvaluate(payload);
      if (review) {
        store.update((st) => (st.cases[c.id].aiReview = review), `${c.stage}-кейс AI арқылы бағаланды`);
        el.querySelector("#resultBody").innerHTML = resultHtml(store.get().cases[c.id], c);
      } else {
        toast("AI бағалау қолжетімсіз: серверде ANTHROPIC_API_KEY орнатылмаған. Рубрикалық бағалау жарамды.");
      }
      aiBtn.disabled = false;
      aiBtn.textContent = "🤖 AI арқылы терең бағалау";
    });
  }
}

function taskFeedback(task, r, preview = false) {
  const head = preview ? "<strong>Алдын ала тексеру:</strong> " : "";
  const pct = Math.round(r.score * 100);
  const parts = [];
  if (task.type === "text") parts.push(`${head}<strong>${pct}%</strong>`);
  else if (r.status === "ok") parts.push(`${head}<span class="ok">✓ Дұрыс</span>`);
  else if (r.status === "partial") parts.push(`${head}<span class="bad">◐ Ішінара дұрыс (${pct}%)</span>`);
  else if (r.status === "wrong") parts.push(`${head}<span class="bad">✗ Дұрыс емес</span>`);
  if (r.strengths.length) parts.push(`<div class="ok">${r.strengths.map(esc).join("<br>")}</div>`);
  if (r.improvements.length) parts.push(`<div class="bad">${r.improvements.map(esc).join("<br>")}</div>`);
  if (!preview && r.note) parts.push(`<div class="muted">${esc(r.note)}</div>`);
  if (!preview && task.type === "number" && r.status !== "ok") parts.push(`<div class="muted">Күтілетін мән: ≈ ${String(task.answer).replace(".", ",")} ${task.unit}</div>`);
  return parts.join("");
}
