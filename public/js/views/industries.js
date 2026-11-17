// Қазақстан өндірістері: тізім → ақпараттық бет → кейс тапсырмалары (жауап өрістерімен).
import { INDUSTRIES, LEVELS, industryById } from "../data/industries.js";
import { store } from "../store.js";
import { parseNumber, answerText } from "../evaluator.js";
import { ensureProfile } from "../profile.js";
import { submitWork, statusHtml, bindStatusActions, lastSubmission } from "../submit.js";
import { esc, toast, bar } from "../ui.js";

const words = (s) => (String(s || "").match(/[\p{L}\p{N}]+/gu) || []).length;
const data = (id) => store.get().industries?.[id] || { answers: {} };
const answered = (t, a) => (t.type === "number" ? String(a?.[t.id] ?? "").trim() !== "" : words(a?.[t.id]) > 0);
export const industryProgress = (ind) => {
  const a = data(ind.id).answers || {};
  return { done: (ind.tasks || []).filter((t) => answered(t, a)).length, total: (ind.tasks || []).length };
};

const fragments = new Map();
async function loadFragment(id) {
  if (fragments.has(id)) return fragments.get(id);
  const res = await fetch(`industries/${id}.html`, { cache: "no-cache" });
  if (!res.ok) throw new Error(res.status);
  const html = await res.text();
  fragments.set(id, html);
  return html;
}

export function render(el, params) {
  const ind = industryById(params[0]);
  if (!ind) {
    renderList(el);
    return "";
  }
  if (params[1] === "cases" && ind.tasks?.length) renderCases(el, ind);
  else renderInfo(el, ind);
  return `№${ind.n}. ${ind.title}`;
}

export function cardsHtml() {
  return INDUSTRIES.map((ind) => {
    const pr = industryProgress(ind);
    const sub = data(ind.id).submittedAt;
    const status = !ind.ready
      ? `<span class="pill gray">Дайындалуда</span>`
      : sub
      ? `<span class="pill">📨 Тапсырылды</span>`
      : pr.done
      ? `<span class="pill yellow">✎ ${pr.done}/${pr.total} жауап</span>`
      : `<span class="pill">Ашық · ${pr.total} кейс</span>`;
    return `<a class="card ind-card ${ind.ready ? "" : "soon"}" href="#/industries/${ind.id}">
      <div class="ind-top"><span class="ind-num">№${ind.n}</span><span class="ind-ico">${ind.icon}</span></div>
      <h3>${esc(ind.title)}</h3>
      <div class="org">${esc(ind.enterprise)}, ${esc(ind.region)}</div>
      <p class="small muted" style="margin:0">${esc(ind.focus)}</p>
      <div style="margin-top:auto">${status}</div>
    </a>`;
  }).join("");
}

function renderList(el) {
  el.innerHTML = `
    <div class="center-head" style="margin-top:6px">
      <span class="kicker">Жеке зерттеу кейстері</span>
      <h1>Қазақстан өндірістері</h1>
      <p>15 отандық өндіріс: процестің химиясы, масса мен энергия балансы, 12 қағида бойынша талдау және әр өндіріске арналған кейс тапсырмалары.</p>
    </div>
    <div class="grid grid-3">${cardsHtml()}</div>`;
}

function header(ind, active) {
  const pr = industryProgress(ind);
  const idx = INDUSTRIES.indexOf(ind);
  const prev = INDUSTRIES[idx - 1];
  const next = INDUSTRIES[idx + 1];
  return `
    <div class="btn-row" style="justify-content:space-between">
      <a class="btn ghost sm" href="#/industries">← Барлық өндірістер</a>
      <span class="btn-row">
        ${prev ? `<a class="btn ghost sm" href="#/industries/${prev.id}" title="${esc(prev.title)}">‹ №${prev.n}</a>` : ""}
        ${next ? `<a class="btn ghost sm" href="#/industries/${next.id}" title="${esc(next.title)}">№${next.n} ›</a>` : ""}
      </span>
    </div>
    <div class="ind-head">
      <span class="ind-num">№${ind.n} өндіріс</span>
      <h1>${esc(ind.title)}</h1>
      <p class="lead">${esc(ind.enterprise)}, ${esc(ind.region)}.${ind.lead ? ` ${esc(ind.lead)}` : ""}</p>
      ${ind.ready ? `<div class="tabs" role="tablist">
        <a class="tab ${active === "info" ? "active" : ""}" href="#/industries/${ind.id}" role="tab" aria-selected="${active === "info"}">📖 Ақпарат</a>
        ${ind.tasks?.length ? `<a class="tab ${active === "cases" ? "active" : ""}" href="#/industries/${ind.id}/cases" role="tab" aria-selected="${active === "cases"}">✍️ Кейс тапсырмалары <span class="done">${pr.done}/${pr.total}</span></a>` : ""}
      </div>` : ""}
    </div>`;
}

function renderInfo(el, ind) {
  if (!ind.ready) {
    el.innerHTML = `<div class="ind">${header(ind, "info")}
      <div class="card"><h2>Талдаудың негізгі түйіндері</h2><p>${esc(ind.focus)}</p></div>
      <div class="ph">📄 Бұл өндіріс бойынша ақпарат пен кейс тапсырмалары дайындалуда.</div></div>`;
    return;
  }
  el.innerHTML = `<div class="ind">${header(ind, "info")}<div id="indBody"><div class="card muted">Жүктелуде…</div></div></div>`;
  loadFragment(ind.id)
    .then((html) => {
      const body = el.querySelector("#indBody");
      if (!body) return;
      body.innerHTML = html + (ind.tasks?.length
        ? `<div class="card cta"><div><h2 style="margin:0">✍️ Кейс тапсырмалары</h2><p class="muted" style="margin:4px 0 0">${ind.tasks.length} тапсырма: білу, талдау және шешім деңгейлері. Жауаптарыңыз сақталып, оқытушыға тапсырылады.</p></div><a class="btn yellow" href="#/industries/${ind.id}/cases">Тапсырмаларға өту →</a></div>`
        : "");
      store.update((st) => {
        st.industries = st.industries || {};
        st.industries[ind.id] = { answers: {}, ...st.industries[ind.id], viewedAt: Date.now() };
      });
    })
    .catch(() => {
      const body = el.querySelector("#indBody");
      if (body) body.innerHTML = `<div class="card bad">Материалды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.</div>`;
    });
}

function taskHtml(t, i, a, checked) {
  const lv = LEVELS[t.level];
  const v = a[t.id] ?? "";
  let field;
  if (t.type === "number") {
    const res = checked?.[t.id];
    field = `
      <label class="small" for="ans-${t.id}">Жауап</label>
      <div class="input-unit" style="max-width:360px"><input class="input" id="ans-${t.id}" data-ans="${t.id}" inputmode="decimal" placeholder="Мысалы: 1,25" value="${esc(v)}"><span>${esc(t.unit)}</span></div>
      ${res ? `<div class="small ${res === "ok" ? "ok" : "bad"}" style="margin-top:6px">${res === "ok" ? "✓ Сандық жауап дұрыс" : `✗ Сандық жауап сәйкес емес (күтілетін мән ≈ ${String(t.answer).replace(".", ",")} ${esc(t.unit)})`}</div>` : ""}
      <label class="small" for="ans-${t.id}-work" style="margin-top:10px;display:block">Есептеу жолы</label>
      <textarea id="ans-${t.id}-work" data-ans="${t.id}_work" placeholder="Молярлық массаларды, теңдеуді және есептеу қадамдарын жазыңыз…">${esc(a[t.id + "_work"] ?? "")}</textarea>`;
  } else {
    field = `<textarea id="ans-${t.id}" data-ans="${t.id}" placeholder="Жауабыңызды осында жазыңыз…" ${t.level === "C" ? 'style="min-height:160px"' : ""}>${esc(v)}</textarea>`;
  }
  const wcKey = t.type === "number" ? `${t.id}_work` : t.id;
  return `<div class="task ind-task" id="task-${t.id}">
    <div class="task-head"><label for="ans-${t.id}"><span class="lv ${lv.cls}">${t.level}, ${lv.name.toLowerCase()}</span> ${i + 1}. ${esc(t.q)}</label></div>
    ${field}
    <div class="task-meta">
      <span data-wc="${wcKey}">${words(a[wcKey])} сөз</span>${t.minWords ? `<span>· ұсынылатын көлем ≥ ${t.minWords} сөз</span>` : ""}
      ${t.ai ? `<a class="btn ghost sm" href="#/assistant?q=${encodeURIComponent(t.q)}" target="_blank" rel="noopener">🤖 AI-кеңесшіден сұрау ↗</a>` : ""}
    </div>
  </div>`;
}

function renderCases(el, ind) {
  const d = data(ind.id);
  const a = { ...(d.answers || {}) };
  const pr = industryProgress(ind);
  el.innerHTML = `<div class="ind">${header(ind, "cases")}
    <div class="card">
      <div class="section-head" style="margin-bottom:6px"><h2 style="margin:0">✍️ Кейс тапсырмалары</h2><span class="small muted" id="saveState">Жауаптар автоматты сақталады</span></div>
      <p class="muted small" style="margin:0 0 6px">Деңгейлер: <span class="lv lv-a">A, білу</span> <span class="lv lv-b">B, талдау</span> <span class="lv lv-c">C, шешім</span>. Ақпарат бетіндегі сызбалар мен кестелерге сүйеніңіз.</p>
      <div id="progBar">${bar((pr.done / pr.total) * 100)}</div>
      <form id="indForm" novalidate style="margin-top:14px">
        ${ind.tasks.map((t, i) => taskHtml(t, i, a, d.checked)).join("")}
        <div class="btn-row">
          <button class="btn" type="submit">📤 Оқытушыға тапсыру</button>
          <a class="btn secondary" href="#/industries/${ind.id}">📖 Ақпаратқа оралу</a>
        </div>
      </form>
      <div id="indStatus">${d.submittedAt ? statusHtml(lastSubmission("industry", ind.id)) : ""}</div>
    </div></div>`;

  const form = el.querySelector("#indForm");
  const saveState = el.querySelector("#saveState");
  let timer;
  const persist = () => {
    clearTimeout(timer);
    store.update((st) => {
      st.industries = st.industries || {};
      st.industries[ind.id] = { ...(st.industries[ind.id] || {}), answers: { ...a } };
    });
    saveState.textContent = "✓ Сақталды";
    const p = industryProgress(ind);
    el.querySelector("#progBar").innerHTML = bar((p.done / p.total) * 100);
    const tab = el.querySelector('.tab.active .done');
    if (tab) tab.textContent = `${p.done}/${p.total}`;
  };
  form.addEventListener("input", (e) => {
    const k = e.target.dataset.ans;
    if (!k) return;
    a[k] = e.target.value.slice(0, 8000);
    const wc = el.querySelector(`[data-wc="${k}"]`);
    if (wc) wc.textContent = `${words(a[k])} сөз`;
    saveState.textContent = "Сақталуда…";
    clearTimeout(timer);
    timer = setTimeout(persist, 400);
  });

  bindStatusActions(el.querySelector("#indStatus"), () => {
    el.querySelector("#indStatus").innerHTML = statusHtml(lastSubmission("industry", ind.id));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    persist();
    const p = industryProgress(ind);
    if (!p.done) return toast("Алдымен кем дегенде бір тапсырмаға жауап жазыңыз");
    if (p.done < p.total && !confirm(`${p.total - p.done} тапсырмаға жауап жазылмаған. Тапсыра бересіз бе?`)) return;
    if (!(await ensureProfile())) return toast("Тапсыру үшін профильді толтырыңыз");
    const checked = {};
    for (const t of ind.tasks.filter((x) => x.type === "number")) {
      const x = parseNumber(a[t.id]);
      checked[t.id] = Number.isFinite(x) && Math.abs(x - t.answer) / Math.abs(t.answer) <= t.tol ? "ok" : "wrong";
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const nums = Object.values(checked);
    const sub = await submitWork({
      kind: "industry",
      itemId: ind.id,
      title: `№${ind.n}. ${ind.title} — кейс тапсырмалары`,
      percent: Math.round((p.done / p.total) * 100),
      score: `${p.done}/${p.total} тапсырмаға жауап берілді${nums.length ? ` · есептеу: ${nums.filter((x) => x === "ok").length}/${nums.length} дұрыс` : ""}`,
      level: "Ашық жауаптарды оқытушы бағалайды",
      details: ind.tasks.map((t, i) => ({
        n: i + 1,
        question: `[${t.level}] ${t.q}`,
        answer: t.type === "number" ? `${answerText({ type: "number", unit: t.unit }, a[t.id]) || "—"}\nЕсептеу жолы: ${a[t.id + "_work"] || "—"}` : a[t.id] || "",
        result: t.type === "number" ? (checked[t.id] === "ok" ? "✓ сандық жауап дұрыс" : "✗ сандық жауап сәйкес емес") : `${words(a[t.id])} сөз`,
      })),
    });
    store.update((st) => {
      st.industries[ind.id] = { ...st.industries[ind.id], checked, submittedAt: Date.now() };
    }, `№${ind.n} өндіріс бойынша кейс тапсырылды`);
    toast(sub.status === "sent" ? "Жауаптар оқытушыға жіберілді 📨" : "Жауаптар сақталды");
    renderCases(el, ind);
    el.querySelector("#indStatus").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
