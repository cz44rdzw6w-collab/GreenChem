// Тест пен кейс нәтижелерін курс ұйымдастырушысына жіберу.
// Негізгі арна: Google Apps Script → Google Sheets кестесі + ұйымдастырушыға хат.
// Желі болмаса, жұмыс кезекке (outbox) қойылып, кейін автоматты қайта жіберіледі.
import { CONFIG, submissionEnabled } from "./config.js";
import { store } from "./store.js";
import { esc, toast } from "./ui.js";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function profile() {
  const s = store.get();
  return { name: s.student || "", group: s.group || "", email: s.email || "" };
}

/** Мәтіндік қысқаша есеп (хат пен mailto үшін). */
export function summaryText(p) {
  const lines = [
    `Курс: ${p.course}`,
    `Жұмыс: ${p.title}`,
    `Студент: ${p.student.name}${p.student.group ? `, ${p.student.group}` : ""}${p.student.email ? ` <${p.student.email}>` : ""}`,
    `Нәтиже: ${p.percent}%${p.score ? ` (${p.score})` : ""}${p.passed === undefined ? "" : p.passed ? " — өтті" : " — өтпеді"}${p.level ? ` · ${p.level}` : ""}`,
    p.attempt ? `Талпыныс: ${p.attempt}` : "",
    p.durationSec != null ? `Уақыт: ${Math.floor(p.durationSec / 60)} мин ${p.durationSec % 60} с` : "",
    `Тапсырылды: ${new Date(p.submittedAt).toLocaleString("ru-RU")}`,
    "",
    ...(p.criteria || []).map((c) => `• ${c.name}: ${c.percent}%`),
    "",
    ...p.details.map((d) => `${d.n}. ${d.question}\n   Жауап: ${d.answer || "—"}\n   ${d.result}`),
  ];
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}

/**
 * Жұмысты тапсыру. payload: { kind, itemId, title, percent, ... details[] }
 * Қайтарады: submission жазбасы { id, status: "sent" | "pending" | "local" }.
 */
export async function submitWork(payload) {
  const full = {
    id: uid(),
    course: CONFIG.courseName,
    student: profile(),
    submittedAt: new Date().toISOString(),
    ...payload,
  };
  full.summary = summaryText(full);
  const record = { id: full.id, kind: full.kind, itemId: full.itemId, title: full.title, percent: full.percent, at: Date.now(), status: "local" };

  if (!submissionEnabled()) {
    store.update((st) => {
      st.submissions.unshift({ ...record, payload: full });
      st.submissions = st.submissions.slice(0, 40);
    });
    return record;
  }

  record.status = "pending";
  store.update((st) => {
    st.submissions.unshift({ ...record, payload: full });
    st.submissions = st.submissions.slice(0, 40);
  });
  await flushOutbox();
  return store.get().submissions.find((x) => x.id === record.id) || record;
}

async function post(payload) {
  const body = JSON.stringify(payload);
  try {
    const res = await fetch(CONFIG.submitUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      redirect: "follow",
    });
    const data = await res.json().catch(() => ({ ok: res.ok }));
    if (!data.ok) throw new Error(data.error || "Сервер жауабы қате");
    return true;
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    // CORS жауабын оқу мүмкін болмаса — «no-cors» режимінде қайта жібереміз (кесте ID бойынша қайталануды сүзеді).
    await fetch(CONFIG.submitUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
    return true;
  }
}

let flushing = null;
/** Кезектегі жұмыстарды жіберу. */
export function flushOutbox() {
  if (!submissionEnabled()) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    const pending = store.get().submissions.filter((x) => x.status === "pending");
    for (const sub of pending) {
      try {
        await post(sub.payload);
        store.update((st) => {
          const x = st.submissions.find((y) => y.id === sub.id);
          if (x) { x.status = "sent"; x.sentAt = Date.now(); x.error = ""; }
        });
      } catch (err) {
        store.update((st) => {
          const x = st.submissions.find((y) => y.id === sub.id);
          if (x) x.error = String(err.message || err);
        });
      }
    }
  })().finally(() => (flushing = null));
  return flushing;
}

export function lastSubmission(kind, itemId) {
  return store.get().submissions.find((x) => x.kind === kind && x.itemId === itemId);
}

function mailtoHref(sub) {
  const subject = `GreenChemAI: ${sub.title} — ${sub.payload.student.name || "студент"}`;
  let body = sub.payload.summary;
  if (body.length > 1700) body = body.slice(0, 1700) + "\n…(толық есеп JSON файлында)";
  return `mailto:${encodeURIComponent(CONFIG.organizerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Жіберу күйінің HTML блогы. */
export function statusHtml(sub) {
  if (!sub) return "";
  const when = new Date(sub.sentAt || sub.at).toLocaleString("ru-RU");
  if (sub.status === "sent")
    return `<div class="sub-status sent">📨 Ұйымдастырушыға жіберілді · ${when}${CONFIG.organizerName ? ` · ${esc(CONFIG.organizerName)}` : ""}</div>`;
  if (sub.status === "pending")
    return `<div class="sub-status pending">⏳ Жіберу кезегінде${sub.error ? ` (${esc(sub.error)})` : ""} <button class="btn ghost sm" data-sub-retry>Қайта жіберу</button></div>`;
  return `<div class="sub-status local">💾 Нәтиже осы құрылғыда сақталды. Автоматты жіберу әлі бапталмаған.
    <span class="btn-row" style="margin-top:8px">
      ${CONFIG.organizerEmail ? `<a class="btn secondary sm" href="${esc(mailtoHref(sub))}">📧 Поштамен жіберу</a>` : ""}
      <button class="btn secondary sm" data-sub-download="${esc(sub.id)}">⬇ Файл ретінде жүктеу</button>
    </span></div>`;
}

/** statusHtml батырмаларын іске қосу (делегирленген). */
export function bindStatusActions(root, onChange) {
  root.addEventListener("click", async (e) => {
    const dl = e.target.closest("[data-sub-download]");
    if (dl) {
      const sub = store.get().submissions.find((x) => x.id === dl.dataset.subDownload);
      if (!sub) return;
      const blob = new Blob([JSON.stringify(sub.payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `greenchemai-${sub.itemId}-${new Date(sub.at).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (e.target.closest("[data-sub-retry]")) {
      await flushOutbox();
      toast("Қайта жіберу аяқталды");
      onChange?.();
    }
  });
}

window.addEventListener("online", () => flushOutbox());
