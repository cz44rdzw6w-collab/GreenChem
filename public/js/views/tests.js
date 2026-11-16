// Бағаланатын тесттер: шолу → талпыныс (таймермен) → нәтиже және талдау.
import { TESTS, testById, questionPool, questionById } from "../data/quizzes.js";
import { store } from "../store.js";
import { gradeQuestion, answerText } from "../evaluator.js";
import { ensureProfile } from "../profile.js";
import { submitWork, statusHtml, bindStatusActions } from "../submit.js";
import { submissionEnabled, CONFIG } from "../config.js";
import { esc, toast, ring } from "../ui.js";

let timer = null;
export function cleanup() {
  clearInterval(timer);
  timer = null;
}

const TYPE_LABEL = { single: "Бір жауап", multi: "Бірнеше жауап", number: "Есептеу" };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const stats = (id) => store.get().tests[id] || { attempts: [], best: 0, passed: false };
const attemptsLeft = (t) => t.attempts - stats(t.id).attempts.length;
const qCount = (t) => t.count || questionPool(t).length;
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, "0")}`;

export function render(el, params, query) {
  cleanup();
  const t = testById(params[0]);
  if (!t) {
    renderList(el);
    return "";
  }
  const run = store.get().testRun[t.id];
  if (run) renderRun(el, t);
  else renderOverview(el, t, query.get("review"));
  return t.final ? "Қорытынды емтихан" : t.title.split(".")[0];
}

function statusPill(t) {
  const s = stats(t.id);
  if (store.get().testRun[t.id]) return `<span class="pill yellow">⏱ Талпыныс жалғасуда</span>`;
  if (s.passed) return `<span class="pill">✓ Өтті · ең жақсы нәтиже ${s.best}%</span>`;
  if (s.attempts.length && attemptsLeft(t) <= 0) return `<span class="pill pink">Өтпеді · ${s.best}% · талпыныс қалмады</span>`;
  if (s.attempts.length) return `<span class="pill pink">Өтпеді · ${s.best}% · ${attemptsLeft(t)} талпыныс қалды</span>`;
  return `<span class="pill gray">Тапсырылмаған</span>`;
}

function renderList(el) {
  el.innerHTML = `
    <div class="section-head">
      <div>
        <div class="eyebrow">Бағаланатын тапсырмалар</div>
        <h1>Тесттер</h1>
        <p>Әр тестте уақыт шегі, өту шегі және талпыныстар саны бар. Ең жақсы нәтиже есептеледі. Тапсырылған нәтиже ${submissionEnabled() ? "курс ұйымдастырушысына автоматты жіберіледі" : "осы құрылғыда сақталады"}.</p>
      </div>
    </div>
    <div class="grid grid-2">
      ${TESTS.map((t) => `
        <a class="card case-card" href="#/tests/${t.id}">
          <div class="stage"><span class="m-ico ${t.final ? "bg-pink" : "bg-green"}">${t.final ? "🎓" : "📝"}</span><div><div class="eyebrow" style="margin:0">${esc(t.module)}</div><strong>${esc(t.title)}</strong></div></div>
          <p class="muted small" style="margin:0">${esc(t.description)}</p>
          <div class="test-facts">
            <span>❓ ${qCount(t)} сұрақ</span>
            <span>⏱ ${t.timeLimit ? `${t.timeLimit} мин` : "шектеусіз"}</span>
            <span>🎯 өту шегі ${t.passPercent}%</span>
            <span>🔁 ${t.attempts} талпыныс</span>
          </div>
          <div style="margin-top:auto">${statusPill(t)}</div>
        </a>`).join("")}
    </div>
    <div class="card" style="margin-top:22px">
      <h2>Тест ережелері</h2>
      <ul class="qlist">
        <li>Тестті бастамас бұрын профиліңізді (аты-жөні, тобы) толтырыңыз.</li>
        <li>Таймер «Бастау» батырмасын басқанда іске қосылады. Бетті жапсаңыз да, уақыт тоқтамайды. Уақыт біткенде жауаптар автоматты тапсырылады.</li>
        <li>Бірнеше жауапты сұрақта қате таңдалған нұсқа дұрыс таңдалған нұсқаның балын азайтады.</li>
        <li>Сандық жауаптарда ±1% дәлдік қабылданады. Ондық бөлшекті үтірмен де, нүктемен де жазуға болады.</li>
        <li>Дұрыс жауаптар мен түсіндірмелер тестті сәтті тапсырғаннан кейін немесе барлық талпыныс біткенде ашылады.</li>
      </ul>
    </div>`;
}

function renderOverview(el, t, reviewIdx) {
  const s = stats(t.id);
  const left = attemptsLeft(t);
  const review = reviewIdx !== null && s.attempts[Number(reviewIdx)] ? s.attempts[Number(reviewIdx)] : s.attempts[s.attempts.length - 1];
  const reveal = s.passed || left <= 0;

  el.innerHTML = `<div id="testOverview">
    <a class="btn ghost sm" href="#/tests">← Барлық тесттер</a>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card">
        <div class="eyebrow">${esc(t.module)}</div>
        <h1>${t.final ? "🎓" : "📝"} ${esc(t.title)}</h1>
        <p class="muted">${esc(t.description)}</p>
        <div class="table-wrap"><table><tbody>
          <tr><th scope="row">Сұрақтар саны</th><td>${qCount(t)}</td></tr>
          <tr><th scope="row">Уақыт шегі</th><td>${t.timeLimit ? `${t.timeLimit} минут` : "шектеусіз"}</td></tr>
          <tr><th scope="row">Өту шегі</th><td>${t.passPercent}%</td></tr>
          <tr><th scope="row">Талпыныстар</th><td>${s.attempts.length} / ${t.attempts} пайдаланылды</td></tr>
          <tr><th scope="row">Ең жақсы нәтиже</th><td>${s.attempts.length ? `<strong class="${s.passed ? "ok" : "bad"}">${s.best}%</strong>` : "—"}</td></tr>
        </tbody></table></div>
        <div class="btn-row" style="margin-top:14px">
          ${left > 0 && !s.passed ? `<button class="btn" id="start">▶ ${s.attempts.length ? "Қайта тапсыру" : "Тестті бастау"}</button>` : ""}
          ${left > 0 && s.passed ? `<button class="btn secondary" id="start">↻ Нәтижені жақсарту (${left} талпыныс)</button>` : ""}
          ${t.related ? `<a class="btn secondary" href="${t.related}">📖 Тақырыпты қайталау</a>` : ""}
        </div>
        ${left <= 0 ? `<p class="small muted" style="margin-top:10px">Барлық талпыныс пайдаланылды. Қосымша талпыныс қажет болса, курс ұйымдастырушысына хабарласыңыз${CONFIG.organizerEmail ? ` (${esc(CONFIG.organizerEmail)})` : ""}.</p>` : ""}
      </div>
      <div class="card">
        <h2>Талпыныстар тарихы</h2>
        ${s.attempts.length ? `<ul class="activity">${s.attempts.map((a, i) => `
          <li><a href="#/tests/${t.id}?review=${i}">${i + 1}-талпыныс · ${new Date(a.at).toLocaleString("ru-RU")}</a>
          <span><strong class="${a.passed ? "ok" : "bad"}">${a.percent}%</strong> ${a.passed ? "✓" : "✗"}</span></li>`).join("")}</ul>`
          : `<p class="muted">Әзірге талпыныс жоқ.</p>`}
      </div>
    </div>
    ${review ? reviewHtml(t, review, reveal, s.attempts.indexOf(review)) : ""}</div>`;

  bindStatusActions(el.querySelector("#testOverview"), () => renderOverview(el, t, reviewIdx));
  el.querySelector("#start")?.addEventListener("click", async () => {
    if (!(await ensureProfile())) return toast("Тестті бастау үшін профильді толтырыңыз");
    const pool = questionPool(t);
    const picked = shuffle(pool).slice(0, t.count || pool.length);
    store.update((st) => {
      st.testRun[t.id] = {
        startedAt: Date.now(),
        items: picked.map((q) => ({ id: q.id, perm: q.options ? shuffle(q.options.map((_, i) => i)) : null })),
        answers: {},
      };
    }, `«${t.title}» басталды`);
    renderRun(el, t);
  });
}

function reviewHtml(t, a, reveal, idx) {
  const sub = a.subId ? store.get().submissions.find((x) => x.id === a.subId) : null;
  return `
    <div class="card">
      <div class="score-head">
        ${ring(a.percent, "Тест нәтижесі")}
        <div>
          <div class="eyebrow">${idx + 1}-талпыныс</div>
          <h2 style="margin:0">${a.passed ? "✓ Тест сәтті тапсырылды" : "✗ Өту шегіне жетпеді"}</h2>
          <p class="small muted" style="margin:4px 0 0">${a.correct} / ${a.total} балл · өту шегі ${t.passPercent}% · уақыт ${fmtTime(a.durationSec)}</p>
        </div>
      </div>
      ${statusHtml(sub)}
      ${reveal ? "" : `<p class="hint-box small" style="margin-top:12px">💡 Дұрыс жауаптар мен түсіндірмелер тестті сәтті тапсырғанда немесе барлық талпыныс біткенде ашылады. Қате сұрақтардың тақырыбын қайталап, қайта көріңіз.</p>`}
      <ol class="review-list">
        ${a.items.map((it) => {
          const q = questionById(it.id);
          if (!q) return "";
          const cls = it.score >= 0.99 ? "ok" : it.score > 0 ? "partial" : "wrong";
          const mark = it.score >= 0.99 ? "✓ Дұрыс" : it.score > 0 ? `◐ Ішінара (${Math.round(it.score * 100)}%)` : "✗ Дұрыс емес";
          const correctText = q.type === "number" ? `${String(q.answer).replace(".", ",")} ${q.unit}` : q.type === "multi" ? q.correct.map((i) => q.options[i]).join("; ") : q.options[q.correct];
          return `<li class="task ${cls}">
            <div class="task-head"><strong>${esc(q.q)}</strong><span class="pill gray">${TYPE_LABEL[q.type]}</span></div>
            <div class="small">Сіздің жауабыңыз: <strong>${esc(answerText(q, it.value) || "— жауап берілмеген")}</strong> · <span class="${cls === "ok" ? "ok" : "bad"}">${mark}</span></div>
            ${reveal ? `<div class="small" style="margin-top:6px">Дұрыс жауап: <strong>${esc(correctText)}</strong></div><div class="small muted" style="margin-top:4px">${esc(q.explain || "")}</div>` : ""}
          </li>`;
        }).join("")}
      </ol>
    </div>`;
}

function questionHtml(q, item, value, n) {
  const order = item.perm || [];
  let body = "";
  if (q.type === "single")
    body = `<div class="options">${order.map((i) => `<label class="check ${String(value) === String(i) ? "selected" : ""}"><input type="radio" name="q-${q.id}" data-q="${q.id}" value="${i}" ${String(value) === String(i) ? "checked" : ""}>${esc(q.options[i])}</label>`).join("")}</div>`;
  else if (q.type === "multi") {
    const sel = Array.isArray(value) ? value.map(Number) : [];
    body = `<div class="options">${order.map((i) => `<label class="check ${sel.includes(i) ? "selected" : ""}"><input type="checkbox" data-q="${q.id}" value="${i}" ${sel.includes(i) ? "checked" : ""}>${esc(q.options[i])}</label>`).join("")}</div>`;
  } else if (q.type === "number")
    body = `<div class="input-unit" style="max-width:340px"><input class="input" data-q="${q.id}" inputmode="decimal" placeholder="Мысалы: 12,5" value="${esc(value ?? "")}" aria-label="Жауап"><span>${esc(q.unit)}</span></div>`;
  return `<div class="task" id="q-${q.id}">
    <div class="task-head"><strong>${n}. ${esc(q.q)}</strong><span class="pill gray">${TYPE_LABEL[q.type]}</span></div>
    ${body}
  </div>`;
}

const answered = (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length);

function renderRun(el, t) {
  const run = store.get().testRun[t.id];
  const items = run.items.map((it) => ({ it, q: questionById(it.id) })).filter((x) => x.q);
  const deadline = t.timeLimit ? run.startedAt + t.timeLimit * 60000 : null;

  el.innerHTML = `
    <div class="test-bar">
      <div><strong>${esc(t.title)}</strong><div class="small muted"><span id="answeredCount"></span> · өту шегі ${t.passPercent}%</div></div>
      ${deadline ? `<div class="timer" id="timer" aria-live="off">⏱ --:--</div>` : ""}
    </div>
    <form id="testForm" class="card" novalidate>
      ${items.map(({ it, q }, i) => questionHtml(q, it, run.answers[q.id], i + 1)).join("")}
      <div class="btn-row">
        <button class="btn" type="submit">📤 Тестті тапсыру</button>
        <span class="small muted">Жауаптар автоматты сақталады.</span>
      </div>
    </form>`;

  const form = el.querySelector("#testForm");
  const counter = el.querySelector("#answeredCount");
  const updateCount = () => {
    const a = store.get().testRun[t.id]?.answers || {};
    counter.textContent = `${items.filter(({ q }) => answered(a[q.id])).length} / ${items.length} сұраққа жауап берілді`;
  };
  updateCount();

  form.addEventListener("input", (e) => {
    const id = e.target.dataset.q;
    if (!id) return;
    const q = questionById(id);
    const value = q.type === "multi" ? [...form.querySelectorAll(`input[data-q="${id}"]:checked`)].map((x) => Number(x.value)) : e.target.value;
    if (q.type !== "number") form.querySelectorAll(`input[data-q="${id}"]`).forEach((x) => x.closest(".check").classList.toggle("selected", x.checked));
    store.update((st) => st.testRun[t.id] && (st.testRun[t.id].answers[id] = value));
    updateCount();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const a = store.get().testRun[t.id]?.answers || {};
    const missing = items.filter(({ q }) => !answered(a[q.id])).length;
    if (missing && !confirm(`${missing} сұраққа жауап берілмеген. Тестті тапсырасыз ба?`)) return;
    finish(el, t);
  });

  if (deadline) {
    const timerEl = el.querySelector("#timer");
    const tick = () => {
      const sec = Math.round((deadline - Date.now()) / 1000);
      timerEl.textContent = `⏱ ${fmtTime(Math.max(0, sec))}`;
      timerEl.classList.toggle("low", sec <= 60);
      if (sec <= 0) {
        cleanup();
        toast("Уақыт бітті — жауаптар автоматты тапсырылды");
        finish(el, t);
      }
    };
    tick();
    if (store.get().testRun[t.id]) timer = setInterval(tick, 1000);
  }
}

async function finish(el, t) {
  cleanup();
  const run = store.get().testRun[t.id];
  if (!run) return;
  const items = run.items.map((it) => {
    const q = questionById(it.id);
    const value = run.answers[it.id];
    return { id: it.id, value: value ?? null, score: q ? gradeQuestion(q, value) : 0 };
  });
  const sum = items.reduce((a, x) => a + x.score, 0);
  const percent = Math.round((sum / items.length) * 100);
  const passed = percent >= t.passPercent;
  const deadline = t.timeLimit ? run.startedAt + t.timeLimit * 60000 : Infinity;
  const durationSec = Math.round((Math.min(Date.now(), deadline) - run.startedAt) / 1000);
  const attempt = { at: Date.now(), percent, passed, correct: +sum.toFixed(2), total: items.length, durationSec, items };
  const attemptNo = stats(t.id).attempts.length + 1;

  store.update((st) => {
    const cur = st.tests[t.id] || { attempts: [], best: 0, passed: false };
    cur.attempts.push(attempt);
    cur.best = Math.max(cur.best, percent);
    cur.passed = cur.passed || passed;
    st.tests[t.id] = cur;
    delete st.testRun[t.id];
  }, `«${t.title}»: ${percent}% ${passed ? "(өтті)" : "(өтпеді)"}`);

  const sub = await submitWork({
    kind: "test",
    itemId: t.id,
    title: t.title,
    percent,
    passed,
    score: `${attempt.correct}/${attempt.total}`,
    attempt: `${attemptNo}/${t.attempts}`,
    durationSec,
    details: items.map((x, i) => {
      const q = questionById(x.id);
      return { n: i + 1, question: q.q, answer: answerText(q, x.value), result: x.score >= 0.99 ? "✓ дұрыс" : x.score > 0 ? `◐ ${Math.round(x.score * 100)}%` : "✗ қате" };
    }),
  });
  store.update((st) => {
    const list = st.tests[t.id].attempts;
    list[list.length - 1].subId = sub.id;
  });
  toast(`${percent}% — ${passed ? "тест сәтті тапсырылды!" : "өту шегіне жетпеді"}${sub.status === "sent" ? " · ұйымдастырушыға жіберілді" : ""}`);
  if (location.hash.startsWith(`#/tests/${t.id}`)) renderOverview(el, t, null);
}
