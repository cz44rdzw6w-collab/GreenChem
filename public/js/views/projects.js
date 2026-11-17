// Жобалық кейстер («AI-Зертхана» әдістемесі): Мәселе → AI кеңесі → Ғылыми тексеру → Өз шешімің → Рубрика.
import { PROJECTS, PROJECT_CRITERIA, STAGES } from "../data/projects.js";
import { store } from "../store.js";
import { ask, aiEvaluate, renderMarkdown, checkAi } from "../assistant-engine.js";
import { ensureProfile } from "../profile.js";
import { submitWork, statusHtml, bindStatusActions, lastSubmission } from "../submit.js";
import { esc, toast } from "../ui.js";

const words = (s) => (String(s || "").match(/[\p{L}\p{N}]+/gu) || []).length;
export const projectDone = (id) => {
  const st = store.get().projects?.[id]?.stages || {};
  return STAGES.filter((x) => st[x.n]).length;
};

export function listHtml() {
  return PROJECTS.map(
    (p) => `<a class="card case-row" href="#/cases/${p.id}">
      <span class="case-ic">${p.icon}</span>
      <div><h3>${esc(p.title)}</h3><div class="org">${esc(p.org)}</div></div>
      <span class="case-progress">${store.get().projects?.[p.id]?.submittedAt ? "✓ " : ""}${projectDone(p.id)}/5</span>
    </a>`
  ).join("");
}

export function render(el, p) {
  const data = () => store.get().projects?.[p.id] || {};
  const save = (fn, activity) =>
    store.update((st) => {
      st.projects = st.projects || {};
      const cur = st.projects[p.id] || { stages: {}, rubric: {} };
      cur.stages = cur.stages || {};
      cur.rubric = cur.rubric || {};
      fn(cur);
      st.projects[p.id] = cur;
    }, activity);

  const d = data();
  const rubric = d.rubric || {};
  const bodies = {
    1: `<p class="desc"><strong>${esc(p.role)}</strong></p>
        <p class="desc" style="margin-top:8px">${esc(p.situation)}</p>
        <ul class="desc" style="margin:10px 0 0 18px">${p.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`,
    2: `<p class="desc">AI-дан жасыл химия тұрғысынан кеңес сұраңыз. Бірақ оның жауабын дайын шешім емес, гипотеза ретінде қабылдаңыз.</p>
        <div class="btn-row" style="margin-top:10px"><button class="btn yellow sm" id="ask2">✨ AI-дан кеңес сұрау</button></div>
        <div class="ai-response" id="resp2" ${d.resp2 ? "" : "hidden"}>${d.resp2 ? renderMarkdown(d.resp2) : ""}</div>`,
    3: `<p class="desc">AI ұсынған кеңесті ғылыми әдебиетпен, дәрістермен және деректермен салыстырыңыз. Қандай сәйкестік немесе қайшылық таптыңыз? Дереккөздерді көрсетіңіз.</p>
        <textarea id="field3" data-field="field3" aria-label="Ғылыми тексеру" placeholder="Ескертпелеріңізді осында жазыңыз…">${esc(d.field3 || "")}</textarea>
        <div class="task-meta"><span data-wc="field3">${words(d.field3)} сөз</span></div>`,
    4: `<p class="desc">Барлық ақпаратқа сүйеніп, өз шешіміңізді ұсыныңыз: не өзгертесіз, неліктен, қандай нәтиже күтесіз (мүмкін болса, сандық бағалаумен).</p>
        <textarea id="field4" data-field="field4" style="min-height:150px" aria-label="Өз шешіміңіз" placeholder="Шешіміңізді осында жазыңыз…">${esc(d.field4 || "")}</textarea>
        <div class="task-meta"><span data-wc="field4">${words(d.field4)} сөз</span><span>· ұсынылатын көлем ≥ 120 сөз</span></div>`,
    5: `<p class="desc">Жұмысыңызды әр критерий бойынша 1–5 жұлдызбен өзіңіз бағалаңыз, содан кейін AI бағасын алып, оқытушыға тапсырыңыз.</p>
        <div id="rubric" style="margin-top:8px">${PROJECT_CRITERIA.map(
          (c, ri) => `<div class="rubric-item"><span>${esc(c)}</span><span class="stars" role="radiogroup" aria-label="${esc(c)}">${[1, 2, 3, 4, 5]
            .map((v) => `<button type="button" class="star ${v <= (rubric[ri] || 0) ? "on" : ""}" data-crit="${ri}" data-val="${v}" aria-label="${v} жұлдыз">★</button>`)
            .join("")}</span></div>`
        ).join("")}</div>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn yellow sm" id="ask5">✨ AI-дан бағалау сұрау</button>
          <button class="btn sm" id="submitProj">📤 Оқытушыға тапсыру</button>
        </div>
        <div class="ai-response" id="resp5" ${d.resp5 ? "" : "hidden"}>${d.resp5 ? renderMarkdown(d.resp5) : ""}</div>
        <div id="projStatus">${d.submittedAt ? statusHtml(lastSubmission("project", p.id)) : ""}</div>`,
  };

  el.innerHTML = `
    <a class="btn ghost sm" href="#/cases">← Кейстерге оралу</a>
    <div class="center-head" style="margin-top:8px">
      <span class="kicker">${esc(p.org)} · жобалық кейс</span>
      <h1 style="margin:0">${p.icon} ${esc(p.title)}</h1>
    </div>
    <div class="path" id="stagePath">
      ${STAGES.map((sg) => {
        const done = !!d.stages?.[sg.n];
        return `<div class="station ${done ? "done" : ""}" data-stage="${sg.n}">
          <div class="node"><span class="num">${sg.n}</span>${sg.icon}</div>
          <div class="card">
            <h3>${sg.title} <span class="tag">${sg.n}-кезең</span></h3>
            <div style="margin-top:8px">${bodies[sg.n]}</div>
            <button class="mark-btn ${done ? "done" : ""}" data-done="${sg.n}" style="margin-top:12px">${done ? "Аяқталды ✓" : "Аяқталды деп белгілеу"}</button>
          </div>
        </div>`;
      }).join("")}
    </div>`;

  let timer;
  const path = el.querySelector("#stagePath");
  // Кідіріспен сақталмаған мәтінді бірден жазу
  const flush = () => {
    clearTimeout(timer);
    const f3 = path.querySelector("#field3").value.slice(0, 8000);
    const f4 = path.querySelector("#field4").value.slice(0, 8000);
    if (f3 !== (data().field3 || "") || f4 !== (data().field4 || "")) save((c) => { c.field3 = f3; c.field4 = f4; });
  };

  path.addEventListener("input", (e) => {
    const f = e.target.dataset.field;
    if (!f) return;
    path.querySelector(`[data-wc="${f}"]`).textContent = `${words(e.target.value)} сөз`;
    clearTimeout(timer);
    const v = e.target.value.slice(0, 8000);
    timer = setTimeout(() => save((c) => (c[f] = v)), 400);
  });

  path.addEventListener("click", async (e) => {
    const star = e.target.closest(".star");
    if (star) {
      const ri = star.dataset.crit;
      const v = Number(star.dataset.val);
      save((c) => (c.rubric[ri] = v));
      star.parentElement.querySelectorAll(".star").forEach((s) => s.classList.toggle("on", Number(s.dataset.val) <= v));
      return;
    }
    const doneBtn = e.target.closest("[data-done]");
    if (doneBtn) {
      const n = doneBtn.dataset.done;
      const on = !data().stages?.[n];
      save((c) => (c.stages[n] = on), on ? `«${p.title}»: ${n}-кезең аяқталды` : "");
      doneBtn.classList.toggle("done", on);
      doneBtn.textContent = on ? "Аяқталды ✓" : "Аяқталды деп белгілеу";
      doneBtn.closest(".station").classList.toggle("done", on);
    }
  });

  // 2-кезең: AI кеңесі
  const ask2 = el.querySelector("#ask2");
  ask2.addEventListener("click", async () => {
    ask2.disabled = true;
    ask2.textContent = "AI ойлануда…";
    const box = el.querySelector("#resp2");
    let text;
    if (await checkAi()) {
      const q = `Жағдай: ${p.situation} ${p.role}\nТапсырмалар: ${p.tasks.join(" ")}\nЖасыл химияның қай қағидалары бұзылғанын көрсет және ықтимал шешім бағыттарын құрылымды түрде, 150–200 сөзбен ұсын. Дайын толық шешім жазба.`;
      const r = await ask([{ role: "user", content: q }], "explain", `${p.org}: ${p.title}`);
      text = r.source === "ai" ? r.text : p.offlineAdvice;
    } else text = p.offlineAdvice;
    save((c) => (c.resp2 = text), `«${p.title}»: AI кеңесі алынды`);
    store.update((st) => (st.assistant.questions = (st.assistant.questions || 0) + 1));
    box.innerHTML = renderMarkdown(text);
    box.hidden = false;
    ask2.disabled = false;
    ask2.textContent = "✨ AI-дан қайта сұрау";
  });

  // 5-кезең: AI бағасы
  const ask5 = el.querySelector("#ask5");
  ask5.addEventListener("click", async () => {
    flush();
    const cur = data();
    if (words(cur.field4) < 15) return toast("Алдымен 4-кезеңде өз шешіміңізді жазыңыз");
    ask5.disabled = true;
    ask5.textContent = "AI бағалауда…";
    const review = await aiEvaluate({
      caseTitle: `${p.title} (${p.org})`,
      criteria: PROJECT_CRITERIA.map((name) => ({ name, description: "1–5 шкаласы бойынша" })),
      answers: [
        { question: `Жағдай: ${p.situation}`, answer: "" },
        { question: "AI кеңесін ғылыми тексеру", answer: cur.field3 || "" },
        { question: "Студенттің шешімі", answer: cur.field4 || "" },
      ],
    });
    let text = review;
    if (!text) {
      const r = await ask([{ role: "user", content: cur.field4 }], "feedback", p.title);
      text = `${r.text}\n\n*Офлайн режим: толық сапалық бағаны оқытушы береді.*`;
    }
    save((c) => (c.resp5 = text), `«${p.title}»: AI бағасы алынды`);
    const box = el.querySelector("#resp5");
    box.innerHTML = renderMarkdown(text);
    box.hidden = false;
    ask5.disabled = false;
    ask5.textContent = "✨ AI-дан бағалау сұрау";
  });

  // Тапсыру
  bindStatusActions(el.querySelector("#projStatus"), () => {
    el.querySelector("#projStatus").innerHTML = statusHtml(lastSubmission("project", p.id));
  });
  el.querySelector("#submitProj").addEventListener("click", async () => {
    flush();
    const cur = data();
    if (words(cur.field4) < 15) return toast("Тапсыру үшін 4-кезеңде шешіміңізді жазыңыз");
    const rated = Object.values(cur.rubric || {}).filter((x) => x > 0);
    if (rated.length < PROJECT_CRITERIA.length) return toast("5-кезеңде барлық критерий бойынша өзіңізді бағалаңыз");
    if (!(await ensureProfile())) return toast("Тапсыру үшін профильді толтырыңыз");
    const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
    const btn = el.querySelector("#submitProj");
    btn.disabled = true;
    const sub = await submitWork({
      kind: "project",
      itemId: p.id,
      title: `Жобалық кейс: ${p.title}`,
      percent: Math.round((avg / 5) * 100),
      score: `өзін-өзі бағалау ${avg.toFixed(1)}/5`,
      criteria: PROJECT_CRITERIA.map((name, i) => ({ name, percent: (cur.rubric[i] || 0) * 20 })),
      details: [
        { n: 1, question: "AI кеңесі", answer: cur.resp2 || "", result: "" },
        { n: 2, question: "Ғылыми тексеру", answer: cur.field3 || "", result: `${words(cur.field3)} сөз` },
        { n: 3, question: "Студенттің шешімі", answer: cur.field4 || "", result: `${words(cur.field4)} сөз` },
        { n: 4, question: "AI бағасы", answer: cur.resp5 || "", result: "" },
      ],
    });
    save((c) => {
      c.submittedAt = Date.now();
      c.stages[5] = true;
    }, `Жобалық кейс тапсырылды: ${p.title}`);
    btn.disabled = false;
    el.querySelector("#projStatus").innerHTML = statusHtml(sub.status ? store.get().submissions.find((x) => x.id === sub.id) : null);
    const st5 = path.querySelector('[data-stage="5"]');
    st5.classList.add("done");
    const mb = st5.querySelector("[data-done]");
    mb.classList.add("done");
    mb.textContent = "Аяқталды ✓";
    toast(sub.status === "sent" ? "Жұмыс оқытушыға жіберілді 📨" : "Жұмыс сақталды");
  });
}

export const projectById = (id) => PROJECTS.find((x) => x.id === id);
