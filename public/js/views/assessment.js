import { store, progressSummary, TOTALS, WEIGHTS } from "../store.js";
import { TESTS } from "../data/quizzes.js";
import { CONFIG, submissionEnabled } from "../config.js";
import { flushOutbox } from "../submit.js";
import { PROJECTS, JOURNEY } from "../data/projects.js";
import { projectDone } from "./projects.js";
import { levelFor, LEVELS } from "../data/levels.js";
import { INDUSTRIES } from "../data/industries.js";
import { industryProgress } from "./industries.js";
import { PRINCIPLES } from "../data/principles.js";
import { esc, ring, bar, toast, timeAgo } from "../ui.js";

const METRIC_NAMES = { ae: "Атомдық үнемділік", ef: "E-фактор", pmi: "PMI", rme: "RME" };

export function render(el) {
  const s = store.get();
  const p = progressSummary(s);
  const readyInd = INDUSTRIES.filter((x) => x.tasks?.length);
  const passedTests = TESTS.filter((t) => s.tests[t.id]?.passed);
  const strong = [
    ...passedTests.map((t) => `${t.title}: ${s.tests[t.id].best}%`),
    ...readyInd.filter((x) => s.industries?.[x.id]?.submittedAt).map((x) => `№${x.n} өндіріс бойынша кейс тапсырылды`),
    ...PROJECTS.filter((x) => s.projects?.[x.id]?.submittedAt).map((x) => `Жобалық кейс тапсырылды: ${x.title}`),
  ].slice(0, 6);
  const wrongPrinciples = PRINCIPLES.filter((pr) => s.quiz[pr.id] && !s.quiz[pr.id].correct);
  const unanswered = PRINCIPLES.filter((pr) => !s.quiz[pr.id]);
  const missingMetrics = Object.keys(METRIC_NAMES).filter((k) => !s.metrics[k]);

  const overall = p.overall;
  const W = (k) => Math.round(WEIGHTS[k] * 100);
  const lvl = levelFor(overall);

  const recs = [];
  if (unanswered.length) recs.push(`${unanswered.length} қағида бойынша тест сұрағына әлі жауап берілмеген.`);
  if (wrongPrinciples.length) recs.push(`Қайталау: ${wrongPrinciples.map((x) => `${x.id}-қағида (${x.title})`).join(", ")}.`);
  if (missingMetrics.length) recs.push(`Калькуляторда жаттығыңыз: ${missingMetrics.map((k) => METRIC_NAMES[k]).join(", ")}.`);
  const failedTests = TESTS.filter((t) => s.tests[t.id]?.attempts?.length && !s.tests[t.id].passed);
  const nextTest = TESTS.find((t) => !s.tests[t.id]?.attempts?.length);
  if (failedTests.length) recs.push(`Өтпеген тесттер: ${failedTests.map((t) => t.title).join("; ")}. Тақырыпты қайталап, қайта тапсырыңыз.`);
  if (nextTest) recs.push(`Бағаланатын тест: «${nextTest.title}».`);
  const nextInd = readyInd.find((x) => !s.industries?.[x.id]?.submittedAt);
  if (nextInd) recs.push(`Келесі кейс: №${nextInd.n} «${nextInd.title}».`);
  if (!recs.length) recs.push("Барлық тапсырма орындалды! Оқытушының кері байланысын күтіңіз.");

  el.innerHTML = `
    <div class="section-head">
      <div>
        <div class="eyebrow">Нәтижелер</div>
        <h1>Бағалау және кері байланыс</h1>
        <p>Тест нәтижелері, тапсырылған кейстер, жетілдіру бағыттары және оқу прогресі.</p>
      </div>
      <div class="btn-row no-print">
        <button class="btn secondary sm" id="print">🖨 Есепті басып шығару</button>
        <button class="btn secondary sm" id="export">⬇ JSON экспорт</button>
        <button class="btn ghost sm" id="reset">↺ Прогресті тазарту</button>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2>Жалпы нәтиже${s.student ? ` — ${esc(s.student)}${s.group ? `, ${esc(s.group)}` : ""}` : ""}</h2>
        <div class="score-head">
          ${ring(overall, "Жалпы баға")}
          <div>
            <p style="margin:0"><strong class="${lvl.cls}" style="font-size:1.2rem">${lvl.name}</strong></p>
            <p class="small muted" style="margin:4px 0 0">Салмақтар: тесттер ${W("tests")}% · кейстер ${W("cases")}% · қағида сұрақтары ${W("quiz")}% · метрикалар ${W("metrics")}%</p>
            <p class="small muted" style="margin:2px 0 0">Орындалған тапсырмалар: ${p.done} / ${p.total}</p>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:14px"><table>
          <thead><tr><th>Компонент</th><th>Орындалды</th><th>Нәтиже</th></tr></thead>
          <tbody>
            <tr><td>Бағаланатын тесттер</td><td>${p.testsDone}/${TOTALS.tests}</td><td>${p.testsDone ? `${p.testsPassed} өтті · орт. ${Math.round(p.testsAvg)}%` : "—"}</td></tr>
            <tr><td>12 қағида бойынша сұрақтар</td><td>${p.quizDone}/${TOTALS.quiz}</td><td>${p.quizCorrect} дұрыс</td></tr>
            <tr><td>Метрика калькуляторлары</td><td>${p.metricsDone}/${TOTALS.metrics}</td><td>${p.metricsDone === 4 ? "✓ толық" : "жалғасуда"}</td></tr>
            <tr><td>Кейстер (ҚР өндірістері + жобалық)</td><td>${p.casesDone}/${TOTALS.cases}</td><td>${p.casesDone ? "тапсырылды · сапасын оқытушы бағалайды" : "—"}</td></tr>
            <tr><td>AI көмекшіге сұрақтар</td><td colspan="2">${s.assistant.questions || 0}</td></tr>
          </tbody>
        </table></div>
      </div>
      <div class="card">
        <h2>Жеке ұсыныстар</h2>
        <div class="fb-cols" style="margin-top:0">
          <div class="fb strong"><h4>💪 Күшті жақтары</h4><ul>${
            strong.length
              ? strong.map((k) => `<li>${esc(k)}</li>`).join("")
              : p.quizCorrect >= 6
              ? `<li>Қағидалар бойынша тест: ${p.quizCorrect} дұрыс жауап.</li>`
              : "<li>Кейстерді орындағаннан кейін мұнда күшті жақтарыңыз көрсетіледі.</li>"
          }</ul></div>
          <div class="fb improve"><h4>🎯 Жетілдіру бағыттары</h4><ul>${recs.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Тапсырмаларды бақылау</h2>
      <div class="grid grid-2" style="margin-bottom:18px">
        <div>
          <h3>Бағаланатын тесттер</h3>
          <ul class="activity">${TESTS.map((t) => {
            const r = s.tests[t.id];
            return `<li><a href="#/tests/${t.id}">${esc(t.title)}</a><span>${r?.attempts?.length ? `<strong class="${r.passed ? "ok" : "bad"}">${r.best}% ${r.passed ? "✓" : "✗"}</strong> · ${r.attempts.length}/${t.attempts}` : "○"}</span></li>`;
          }).join("")}</ul>
        </div>
        <div>
          <h3>Ұйымдастырушыға жіберілген жұмыстар</h3>
          <p class="small muted" style="margin:0 0 6px">${submissionEnabled() ? `Нәтижелер автоматты жіберіледі${CONFIG.organizerName ? `: ${esc(CONFIG.organizerName)}` : ""}.` : "Автоматты жіберу бапталмаған: нәтижелер осы құрылғыда сақталады."}</p>
          ${s.submissions.length ? `<ul class="activity">${s.submissions.slice(0, 8).map((x) => `<li><span>${esc(x.title)} · ${x.percent}%</span><span>${x.status === "sent" ? "📨 жіберілді" : x.status === "pending" ? "⏳ кезекте" : "💾 сақталды"}</span></li>`).join("")}</ul>${s.submissions.some((x) => x.status === "pending") ? `<button class="btn secondary sm" id="retry">↻ Кезектегілерді қайта жіберу</button>` : ""}` : `<p class="muted small">Әзірге тапсырылған жұмыс жоқ.</p>`}
        </div>
      </div>
      <div class="grid grid-3">
        <div>
          <h3>Қағидалар бойынша сұрақтар</h3>
          <div class="chips">${PRINCIPLES.map((pr) => {
            const q = s.quiz[pr.id];
            const cls = q ? (q.correct ? "background:#DCE3C4;border-color:#B9C691" : "background:#F8D2D8;border-color:#F0A8B8") : "";
            return `<a class="chip" style="${cls};text-decoration:none" href="#/principles/${pr.id}" title="${esc(pr.title)}">${q ? (q.correct ? "✓" : "✗") : "○"} ${pr.id}</a>`;
          }).join("")}</div>
        </div>
        <div>
          <h3>Метрикалар</h3>
          <ul class="activity">${Object.entries(METRIC_NAMES).map(([k, n]) => `<li><a href="#/metrics?tab=${k}">${n}</a><span>${s.metrics[k] ? "✓ " + timeAgo(s.metrics[k]) : "○ орындалмаған"}</span></li>`).join("")}</ul>
        </div>
        <div>
          <h3>ҚР өндірістері</h3>
          <ul class="activity">${readyInd.map((x) => { const pr = industryProgress(x); return `<li><a href="#/industries/${x.id}/cases">№${x.n}. ${esc(x.title)}</a><span>${s.industries?.[x.id]?.submittedAt ? "📨 тапсырылды" : `${pr.done}/${pr.total}`}</span></li>`; }).join("")}</ul>
          <h3 style="margin-top:14px">Жобалық кейстер</h3>
          <ul class="activity">${PROJECTS.map((x) => `<li><a href="#/cases/${x.id}">${x.icon} ${esc(x.title)}</a><span>${s.projects?.[x.id]?.submittedAt ? "📨 тапсырылды" : `${projectDone(x.id)}/5`}</span></li>`).join("")}</ul>
          <p class="small muted" style="margin-top:8px">Әдістеме жолы: ${JOURNEY.filter((_, i) => s.journey?.[i]).length} / ${JOURNEY.length} кезең</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Бағалау деңгейлері</h2>
      <p class="muted">Тест сұрақтары мен сандық жауаптар автоматты тексеріледі. Кейстердің ашық жауаптары тапсырылған соң оқытушыға жіберіледі, ал олардың сапасын оқытушы бағалайды. Жалпы нәтижеде кейстердің тапсырылуы ескеріледі.</p>
      <div class="table-wrap"><table><thead><tr><th>Деңгей</th><th>Балл</th><th>Сипаттама</th></tr></thead><tbody>
        ${LEVELS.map((l, i) => `<tr><td class="${l.cls}"><strong>${l.name}</strong></td><td>${l.min}–${i === 0 ? 100 : LEVELS[i - 1].min - 1}%</td><td>${l.text}</td></tr>`).join("")}
      </tbody></table></div>
    </div>`;

  el.querySelector("#retry")?.addEventListener("click", async () => {
    await flushOutbox();
    toast("Қайта жіберу аяқталды");
    render(el);
  });
  el.querySelector("#print").addEventListener("click", () => window.print());
  el.querySelector("#export").addEventListener("click", () => {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `greenchemai-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Прогресс файлы жүктелді");
  });
  el.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("Барлық прогресс пен жауаптар өшіріледі. Жалғастырасыз ба?")) return;
    store.reset();
    toast("Прогресс тазартылды");
    render(el);
  });
  return "";
}
