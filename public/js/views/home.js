import { store, progressSummary, TOTALS } from "../store.js";
import { ring, bar, esc, timeAgo } from "../ui.js";
import { CASES } from "../data/cases.js";
import { profileFieldsHtml, bindProfileFields } from "../profile.js";

const OBJECTIVES = [
  "Жасыл химияның тарихын, анықтамасын және 12 қағидасын түсіндіру.",
  "Атомдық үнемділік, E-фактор, PMI және RME метрикаларын есептеп, түсіндіру.",
  "Химиялық процестердің қоршаған ортаға және денсаулыққа әсерін өмірлік цикл тұрғысынан бағалау.",
  "Нақты өнеркәсіптік кейстерді талдап, экологиялық таза баламаларды жобалау.",
  "Жасанды интеллект құралдарын сыни тұрғыдан пайдаланып, ғылыми аргумент құру.",
];

const MODULES = [
  { href: "#/lectures", icon: "🎓", bg: "bg-pink", title: "Лекциялар", text: "Мұғалім жүктеген дәріс слайдтары, конспектілер мен бейнелер: сайтта қарау немесе жүктеп алу." },
  { href: "#/principles", icon: "🌿", bg: "bg-green", title: "12 қағида", text: "Әр қағиданың түсіндірмесі, өнеркәсіптік мысалдар және білімді тексеру сұрақтары." },
  { href: "#/metrics", icon: "📐", bg: "bg-yellow", title: "Жасыл метрикалар", text: "AE, E-фактор, PMI, RME: формулалар, шығарылған мысалдар және автоматты калькуляторлар." },
  { href: "#/cases", icon: "📂", bg: "bg-pink", title: "Case Study", text: "Мәселені анықтаудан шешімді жобалауға дейінгі бес прогрессивті модуль." },
  { href: "#/tests", icon: "📝", bg: "bg-pink", title: "Тесттер", text: "Уақыт шегі, өту шегі және талпыныстары бар бағаланатын модуль тесттері мен қорытынды емтихан." },
  { href: "#/assistant", icon: "🤖", bg: "bg-green", title: "AI көмекші", text: "Түсіндірме, бағыттаушы кеңес және жауапқа кері байланыс беретін интеллектуалды көмекші." },
  { href: "#/assessment", icon: "📊", bg: "bg-yellow", title: "Бағалау", text: "Рубрика бойынша нәтижелер, күшті жақтар, жетілдіру бағыттары және прогресс." },
];

const HERO_ART = `<svg viewBox="0 0 320 260" aria-hidden="true">
  <circle cx="160" cy="130" r="110" fill="#fff" opacity=".7"/>
  <g fill="none" stroke="#2f7d4f" stroke-width="3">
    <polygon points="160,62 205,88 205,140 160,166 115,140 115,88" fill="#e6f4ea"/>
    <polygon points="160,78 191,96 191,132 160,150 129,132 129,96" stroke-dasharray="6 6" opacity=".6"/>
    <line x1="205" y1="88" x2="248" y2="64"/><line x1="115" y1="140" x2="72" y2="164"/><line x1="160" y1="166" x2="160" y2="212"/>
  </g>
  <circle cx="248" cy="64" r="15" fill="#f6c945"/><text x="248" y="69" text-anchor="middle" font-size="13" font-weight="700" fill="#3d2e00">OH</text>
  <circle cx="72" cy="164" r="15" fill="#f7c6d0"/><text x="72" y="169" text-anchor="middle" font-size="13" font-weight="700" fill="#6b1f33">O</text>
  <circle cx="160" cy="212" r="15" fill="#2f7d4f"/><text x="160" y="217" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">CO₂</text>
  <path d="M232 170c22-6 40 8 44 30-22 6-40-8-44-30z" fill="#3a9a62"/><path d="M234 172c14 6 28 16 40 28" stroke="#e6f4ea" stroke-width="2" fill="none"/>
  <path d="M70 70c-4-20 10-36 30-38 4 20-10 36-30 38z" fill="#f6c945"/>
</svg>`;

export function render(el) {
  const s = store.get();
  const p = progressSummary(s);
  const nextCase = CASES.find((c) => !s.cases[c.id]);

  el.innerHTML = `
  <section class="hero">
    <div>
      <div class="eyebrow">Университеттік курс · Case Study · AI</div>
      <h1>Жасыл химияға кіріспе</h1>
      <p class="lead"><strong>Жасыл химия</strong> — химиялық өнімдер мен процестерді жобалау, өндіру және қолдану кезінде қауіпті заттардың пайдаланылуы мен түзілуін азайтатын немесе толық жоятын химия саласы (П. Анастас, Дж. Уорнер, 1998). GreenChemAI платформасы бұл пәнді <strong>Case Study</strong> әдістемесі мен <strong>жасанды интеллект</strong> құралдары арқылы оқытады.</p>
      <div class="btn-row">
        <a class="btn" href="${nextCase ? `#/cases/${nextCase.id}` : "#/assessment"}">${nextCase ? `▶ ${nextCase.stage}-модульді бастау` : "📊 Нәтижелерді қарау"}</a>
        <a class="btn secondary" href="#/principles">12 қағиданы оқу</a>
        <a class="btn pink" href="#/assistant">🤖 AI-дан сұрау</a>
      </div>
    </div>
    <div class="hero-art">${HERO_ART}</div>
  </section>

  <section class="section grid grid-4">
    <div class="card stat"><span class="num">12</span><span class="lbl">жасыл химия қағидасы</span></div>
    <div class="card stat"><span class="num">4</span><span class="lbl">сандық метрика мен калькулятор</span></div>
    <div class="card stat"><span class="num">5</span><span class="lbl">прогрессивті кейс-модуль</span></div>
    <div class="card stat"><span class="num">4</span><span class="lbl">бағаланатын тест пен емтихан</span></div>
  </section>

  <section class="section grid grid-2">
    <div class="card">
      <h2>Оқу мақсаттары</h2>
      <p class="muted">Курсты аяқтағанда студент:</p>
      <ul class="objectives">${OBJECTIVES.map((o, i) => `<li><span class="n">${i + 1}</span><span>${o}</span></li>`).join("")}</ul>
    </div>
    <div class="card">
      <h2>Менің прогресім</h2>
      ${profileFieldsHtml(s, "home")}
      <div class="progress-overview">
        ${ring(p.percent, "Жалпы прогресс")}
        <div class="rows">
          <div><div class="row-lbl"><span>Бағаланатын тесттер</span><span>${p.testsDone}/${TOTALS.tests}${p.testsDone ? ` · ${p.testsPassed} өтті` : ""}</span></div>${bar((p.testsDone / TOTALS.tests) * 100, "pink")}</div>
          <div><div class="row-lbl"><span>Қағидалар бойынша тест</span><span>${p.quizDone}/${TOTALS.quiz} · ${p.quizCorrect} дұрыс</span></div>${bar((p.quizDone / TOTALS.quiz) * 100)}</div>
          <div><div class="row-lbl"><span>Метрикалар калькуляторы</span><span>${p.metricsDone}/${TOTALS.metrics}</span></div>${bar((p.metricsDone / TOTALS.metrics) * 100)}</div>
          <div><div class="row-lbl"><span>Case Study модульдері</span><span>${p.casesDone}/${TOTALS.cases}${p.casesDone ? ` · орт. ${Math.round(p.caseAvg)}%` : ""}</span></div>${bar((p.casesDone / TOTALS.cases) * 100, "pink")}</div>
        </div>
      </div>
      <h3 style="margin-top:18px">Соңғы әрекеттер</h3>
      ${
        s.activity.length
          ? `<ul class="activity">${s.activity.slice(0, 5).map((a) => `<li><span>${esc(a.text)}</span><time>${timeAgo(a.t)}</time></li>`).join("")}</ul>`
          : `<p class="muted small">Әзірге әрекет жоқ. Бірінші тапсырмадан бастаңыз!</p>`
      }
    </div>
  </section>

  <section class="section">
    <div class="section-head"><div><h2>Курс модульдері</h2><p>Тақырыптарды кез келген ретпен оқуға болады, бірақ кейстерді ретімен орындау ұсынылады.</p></div></div>
    <div class="grid grid-3">
      ${MODULES.map((m) => `<a class="card module-card" href="${m.href}"><span class="m-ico ${m.bg}">${m.icon}</span><h3>${m.title}</h3><p class="muted">${m.text}</p></a>`).join("")}
    </div>
  </section>

  <section class="section card">
    <h2>Оқыту әдістемесі: Case Study + AI</h2>
    <div class="grid grid-3" style="margin-top:10px">
      <div><span class="pill">1-қадам</span><h3 style="margin-top:8px">Теорияны меңгеру</h3><p class="muted">12 қағида мен метрикаларды оқып, білімді тексеру сұрақтарына жауап беріңіз.</p></div>
      <div><span class="pill yellow">2-қадам</span><h3 style="margin-top:8px">Кейсті шешу</h3><p class="muted">Нақты өнеркәсіптік мәселені деректер мен бағыттаушы сұрақтар арқылы талдаңыз.</p></div>
      <div><span class="pill pink">3-қадам</span><h3 style="margin-top:8px">Кері байланыс алу</h3><p class="muted">Рубрика бойынша автоматты бағалау мен AI көмекшінің ұсыныстарын пайдаланып, жауапты жетілдіріңіз.</p></div>
    </div>
  </section>`;

  bindProfileFields(el);
}
