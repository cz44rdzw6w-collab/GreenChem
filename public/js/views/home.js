import { store, progressSummary, TOTALS } from "../store.js";
import { bar, esc, timeAgo, toast } from "../ui.js";
import { TESTS } from "../data/quizzes.js";
import { JOURNEY } from "../data/projects.js";
import { INDUSTRIES } from "../data/industries.js";
import { profileFieldsHtml, bindProfileFields } from "../profile.js";

const OBJECTIVES = [
  "Жасыл химияның тарихын, анықтамасын және 12 қағидасын түсіндіру.",
  "Атомдық үнемділік, E-фактор, PMI және RME метрикаларын есептеп, түсіндіру.",
  "Химиялық процестердің қоршаған ортаға және денсаулыққа әсерін өмірлік цикл тұрғысынан бағалау.",
  "Нақты өнеркәсіптік кейстерді талдап, экологиялық таза баламаларды жобалау.",
  "Жасанды интеллект құралдарын сыни тұрғыдан пайдаланып, ғылыми аргумент құру.",
];

const MODULES = [
  { href: "#/lectures", icon: "📚", bg: "bg-pink", title: "Дәрістер", text: "Дәріс слайдтары, конспектілер мен бейнелер: сайтта қарау немесе жүктеп алу." },
  { href: "#/principles", icon: "🌿", bg: "bg-green", title: "12 қағида", text: "Әр қағиданың түсіндірмесі, өнеркәсіптік мысалдар және білімді тексеру сұрақтары." },
  { href: "#/metrics", icon: "📐", bg: "bg-yellow", title: "Метрикалар", text: "AE, E-фактор, PMI, RME: формулалар, шығарылған мысалдар және калькуляторлар." },
  { href: "#/industries", icon: "🏭", bg: "bg-yellow", title: "ҚР өндірістері", text: "15 отандық өндіріс: процестің химиясы, масса мен энергия балансы, жауап өрістері бар кейстер." },
  { href: "#/cases", icon: "📂", bg: "bg-pink", title: "Кейс-стади", text: "Қазақстанның 15 өндірісі бойынша жеке зерттеу кейстері және AI-мен шешілетін 5 жобалық кейс." },
  { href: "#/tests", icon: "📝", bg: "bg-green", title: "Тесттер", text: "Уақыт шегі мен өту шегі бар модуль тесттері және қорытынды емтихан." },
  { href: "#/assistant", icon: "🤖", bg: "bg-yellow", title: "AI-кеңесші", text: "Түсіндірме, бағыттаушы кеңес және жауапқа кері байланыс." },
];

/** Курс белестері → белгілер (badges). */
function milestones(s, p) {
  const passed = (id) => s.tests[id]?.passed;
  return [
    { icon: "🌸", title: "Бірінші дәріс қаралды", ok: Object.keys(s.lectures || {}).length > 0 },
    { icon: "🍃", title: "12 қағиданың бәріне жауап берілді", ok: p.quizDone >= TOTALS.quiz },
    { icon: "☀️", title: "4 метрика калькуляторы орындалды", ok: p.metricsDone >= TOTALS.metrics },
    { icon: "🧪", title: TESTS[0].title, ok: passed("test1") },
    { icon: "⚗️", title: TESTS[1].title, ok: passed("test2") },
    { icon: "🧫", title: TESTS[2].title, ok: passed("test3") },
    { icon: "🏭", title: "ҚР өндірісі бойынша кейс тапсырылды", ok: p.industriesDone > 0 },
    { icon: "🌱", title: "Жобалық кейс тапсырылды", ok: p.projectsDone > 0 },
    { icon: "🏆", title: "Қорытынды емтихан тапсырылды", ok: passed("final") },
  ];
}

function flaskSvg(pct) {
  const h = Math.round(140 * pct);
  return `<svg class="flask-svg" viewBox="0 0 120 160" role="img" aria-label="Курс прогресі: ${Math.round(pct * 100)}%">
    <defs>
      <clipPath id="flaskClip"><path d="M48 10 H72 V45 L100 130 Q104 145 88 148 H32 Q16 145 20 130 L48 45 Z"/></clipPath>
      <linearGradient id="liquidGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#E0A400"/><stop offset="55%" stop-color="#F4C230"/><stop offset="100%" stop-color="#F0A8B8"/></linearGradient>
    </defs>
    <path d="M48 10 H72 V45 L100 130 Q104 145 88 148 H32 Q16 145 20 130 L48 45 Z" fill="#FFFFFF" stroke="#DCE3C4" stroke-width="3"/>
    <rect class="liquid" clip-path="url(#flaskClip)" x="10" y="${158 - h}" width="100" height="${h}" fill="url(#liquidGrad)"/>
    <rect x="44" y="4" width="32" height="10" rx="3" fill="#6E7D45"/>
  </svg>`;
}

export function render(el) {
  const s = store.get();
  const p = progressSummary(s);
  const nextInd = INDUSTRIES.find((x) => x.tasks?.length && !s.industries?.[x.id]?.submittedAt);
  const ms = milestones(s, p);
  const earned = ms.filter((m) => m.ok).length;

  el.innerHTML = `
  <section class="hero">
    <div class="eyebrow">Университеттік курс · Case Study · AI</div>
    <h1>«Жасыл химияға кіріспе» пәнін жасанды интеллектпен оқу</h1>
    <p class="lead"><strong>Жасыл химия</strong> — химиялық өнімдер мен процестерді жобалау, өндіру және қолдану кезінде қауіпті заттардың пайдаланылуы мен түзілуін азайтатын немесе толық жоятын химия саласы (П. Анастас, Дж. Уорнер, 1998).</p>
    <div class="flask-wrap">
      ${flaskSvg(p.percent / 100)}
      <div class="progress-label"><b>${p.done}</b> / ${p.total} тапсырма · ${p.percent}%</div>
    </div>
    <div class="badge-strip" aria-label="Белгілер: ${earned} / ${ms.length}">
      ${ms.map((m) => `<div class="badge ${m.ok ? "earned" : ""}" title="${esc(m.title)}${m.ok ? " ✓" : ""}">${m.icon}</div>`).join("")}
    </div>
    ${earned === ms.length ? `<div class="celebrate">🎉 Барлық белес аяқталды! Сен — AI-жасыл химиксің!</div>` : ""}
    <div class="btn-row">
      <a class="btn yellow" href="${nextInd ? `#/industries/${nextInd.id}` : "#/industries"}">▶ ${nextInd ? `№${nextInd.n} өндірісті бастау` : "ҚР өндірістері"}</a>
      <a class="btn secondary" href="#/lectures">📚 Дәрістер</a>
      <a class="btn pink" href="#/assistant">🤖 AI-дан сұрау</a>
    </div>
  </section>

  <section class="section grid grid-2">
    <div class="card">
      <h2>👤 Профиль және прогресс</h2>
      ${profileFieldsHtml(s, "home")}
      <div class="rows" style="display:grid;gap:12px;margin-top:6px">
        <div><div class="row-lbl"><span>Бағаланатын тесттер</span><span>${p.testsDone}/${TOTALS.tests}${p.testsDone ? ` · ${p.testsPassed} өтті` : ""}</span></div>${bar((p.testsDone / TOTALS.tests) * 100, "pink")}</div>
        <div><div class="row-lbl"><span>Кейстер (ҚР өндірістері + жобалық)</span><span>${p.casesDone}/${TOTALS.cases} тапсырылды</span></div>${bar((p.casesDone / TOTALS.cases) * 100)}</div>
        <div><div class="row-lbl"><span>12 қағида сұрақтары</span><span>${p.quizDone}/${TOTALS.quiz} · ${p.quizCorrect} дұрыс</span></div>${bar((p.quizDone / TOTALS.quiz) * 100)}</div>
        <div><div class="row-lbl"><span>Метрика калькуляторлары</span><span>${p.metricsDone}/${TOTALS.metrics}</span></div>${bar((p.metricsDone / TOTALS.metrics) * 100)}</div>
      </div>
    </div>
    <div class="card">
      <h2>🎯 Оқу мақсаттары</h2>
      <ul class="objectives">${OBJECTIVES.map((o, i) => `<li><span class="n">${i + 1}</span><span>${o}</span></li>`).join("")}</ul>
      <h3 style="margin-top:18px">Соңғы әрекеттер</h3>
      ${
        s.activity.length
          ? `<ul class="activity">${s.activity.slice(0, 4).map((a) => `<li><span>${esc(a.text)}</span><time>${timeAgo(a.t)}</time></li>`).join("")}</ul>`
          : `<p class="muted small">Әзірге әрекет жоқ. Бірінші тапсырмадан бастаңыз!</p>`
      }
    </div>
  </section>

  <div class="center-head"><span class="kicker">Әдістеме жолы</span><h2>AI-ды оқуда қолданудың 6 кезеңі</h2><p>Әр кезеңді ашып, мысал сұранысты AI-кеңесшіге жіберіп көріңіз.</p></div>
  <div class="path" id="journey">
    ${JOURNEY.map((j, i) => `
      <div class="station ${s.journey?.[i] ? "done" : ""}" data-i="${i}">
        <div class="node"><span class="num">${i + 1}</span>${j.icon}</div>
        <div class="card clickable" data-toggle="${i}" role="button" tabindex="0" aria-expanded="false">
          <h3>${esc(j.title)} <span class="tag">${esc(j.tag)}</span></h3>
          <p class="desc">${esc(j.desc)}</p>
          <div class="detail">
            <div class="prompt-box">💬 Мысал сұраныс: «${esc(j.prompt)}»</div>
            <p class="desc" style="margin-bottom:12px">${esc(j.detail)}</p>
            <div class="btn-row">
              <a class="btn yellow sm" href="#/assistant?q=${encodeURIComponent(j.prompt)}">✨ AI-кеңесшіден сұрау</a>
              ${j.link ? `<a class="btn secondary sm" href="${j.link}">Бөлімге өту →</a>` : ""}
              <button class="mark-btn ${s.journey?.[i] ? "done" : ""}" data-mark="${i}">${s.journey?.[i] ? "Аяқталды ✓" : "Аяқтадым ✓"}</button>
            </div>
          </div>
        </div>
      </div>`).join("")}
  </div>

  <div class="center-head"><span class="kicker">Курс құрылымы</span><h2>Модульдер</h2></div>
  <div class="grid grid-3">
    ${MODULES.map((m) => `<a class="card module-card" href="${m.href}"><span class="m-ico ${m.bg}">${m.icon}</span><h3>${m.title}</h3><p class="muted small" style="margin:0">${m.text}</p></a>`).join("")}
  </div>`;

  bindProfileFields(el);

  const journey = el.querySelector("#journey");
  journey.addEventListener("click", (e) => {
    const mark = e.target.closest("[data-mark]");
    if (mark) {
      const i = Number(mark.dataset.mark);
      const on = !store.get().journey?.[i];
      store.update((st) => (st.journey = { ...(st.journey || {}), [i]: on }), on ? `Әдістеме кезеңі: ${JOURNEY[i].title}` : "");
      mark.classList.toggle("done", on);
      mark.textContent = on ? "Аяқталды ✓" : "Аяқтадым ✓";
      mark.closest(".station").classList.toggle("done", on);
      if (on && JOURNEY.every((_, k) => store.get().journey[k])) toast("🎉 Әдістеме жолының барлық кезеңі аяқталды!");
      return;
    }
    if (e.target.closest("a, button, input")) return;
    const card = e.target.closest("[data-toggle]");
    if (card) toggle(card);
  });
  journey.addEventListener("keydown", (e) => {
    const card = e.target.closest("[data-toggle]");
    if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      toggle(card);
    }
  });
  function toggle(card) {
    const st = card.closest(".station");
    st.classList.toggle("open");
    card.setAttribute("aria-expanded", st.classList.contains("open"));
  }
}
