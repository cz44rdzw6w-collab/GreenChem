/**
 * GreenChemAI → Google Sheets + email.
 * Студент тест немесе кейс тапсырғанда сайт осы веб-қосымшаға нәтижені жібереді:
 *   1) «Жауаптар» парағына жаңа жол қосылады;
 *   2) ұйымдастырушыға хат жіберіледі.
 *
 * Орнату нұсқаулығы: docs/teacher-guide.md
 */

// ===== БАПТАУЛАР =====
const ORGANIZER_EMAIL = "teacher@example.edu"; // ← хат келетін адрес (бірнеше болса, үтірмен бөліңіз)
const SEND_EMAIL = true;                        // false — тек кестеге жазу, хат жібермеу
const SEND_COPY_TO_STUDENT = false;             // true — студентке де көшірме жіберу (email енгізген болса)
const SHEET_NAME = "Жауаптар";
// ======================

const HEADERS = [
  "Уақыты", "Түрі", "Жұмыс", "Аты-жөні", "Тобы", "Email",
  "Нәтиже, %", "Балл", "Өтті ме", "Талпыныс", "Ұзақтығы, мин", "Толық есеп", "ID",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || !data.id || !data.title || !data.student || !Array.isArray(data.details)) {
      return json_({ ok: false, error: "Деректер толық емес" });
    }

    const sheet = getSheet_();
    // Бір жұмыс екі рет жіберілсе (қайта жіберу кезінде), қайталамаймыз.
    const idCol = HEADERS.length;
    if (sheet.getLastRow() > 1) {
      const found = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).createTextFinder(String(data.id)).matchEntireCell(true).findNext();
      if (found) return json_({ ok: true, duplicate: true });
    }

    const s = data.student;
    sheet.appendRow([
      new Date(data.submittedAt || Date.now()),
      data.kind === "test" ? "Тест" : data.kind === "case" ? "Кейс" : String(data.kind || ""),
      safe_(data.title),
      safe_(s.name),
      safe_(s.group),
      safe_(s.email),
      Number(data.percent) || 0,
      safe_(data.score || ""),
      data.passed === undefined ? "" : data.passed ? "Иә" : "Жоқ",
      safe_(data.attempt || ""),
      data.durationSec ? Math.round(data.durationSec / 6) / 10 : "",
      safe_(String(data.summary || "").slice(0, 45000)),
      String(data.id),
    ]);

    if (SEND_EMAIL) {
      const subject = `GreenChemAI: ${data.title} — ${s.name || "студент"} (${data.percent}%)`;
      const options = { name: "GreenChemAI", htmlBody: emailHtml_(data) };
      if (isEmail_(s.email)) options.replyTo = s.email;
      MailApp.sendEmail(ORGANIZER_EMAIL, subject, String(data.summary || ""), options);
      if (SEND_COPY_TO_STUDENT && isEmail_(s.email)) {
        MailApp.sendEmail(s.email, `Сіздің нәтижеңіз: ${data.title}`, String(data.summary || ""), { name: "GreenChemAI", htmlBody: emailHtml_(data) });
      }
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "GreenChemAI submissions" });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e6f4ea");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function emailHtml_(d) {
  const s = d.student || {};
  const row = (k, v) => `<tr><td style="padding:4px 10px;color:#4a5a51">${esc_(k)}</td><td style="padding:4px 10px"><b>${esc_(v)}</b></td></tr>`;
  const crit = (d.criteria || []).map((c) => `<li>${esc_(c.name)}: <b>${esc_(c.percent)}%</b></li>`).join("");
  const items = d.details.map((x) =>
    `<li style="margin-bottom:8px">${esc_(x.question)}<br><span style="color:#4a5a51">Жауап:</span> ${esc_(x.answer || "—")}<br><span style="color:#2f7d4f">${esc_(x.result)}</span></li>`
  ).join("");
  return `<div style="font-family:Arial,sans-serif;color:#1f2a24;max-width:680px">
    <h2 style="color:#2f7d4f;margin:0 0 8px">${esc_(d.title)}</h2>
    <table style="border-collapse:collapse;background:#f3faf5;border-radius:8px">
      ${row("Студент", s.name)}${row("Тобы", s.group)}${s.email ? row("Email", s.email) : ""}
      ${row("Нәтиже", `${d.percent}%${d.score ? ` (${d.score})` : ""}`)}
      ${d.passed === undefined ? "" : row("Өтті ме", d.passed ? "Иә" : "Жоқ")}
      ${d.level ? row("Деңгей", d.level) : ""}${d.attempt ? row("Талпыныс", d.attempt) : ""}
      ${row("Уақыты", new Date(d.submittedAt).toLocaleString("ru-RU"))}
    </table>
    ${crit ? `<h3>Критерийлер</h3><ul>${crit}</ul>` : ""}
    <h3>Жауаптар</h3><ol>${items}</ol>
  </div>`;
}

// Кестеде формула ретінде орындалмауы үшін (=, +, -, @ басталатын мәтін).
function safe_(v) {
  const s = String(v == null ? "" : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function esc_(v) {
  return String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function isEmail_(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Бапталуды тексеру: Apps Script редакторында осы функцияны бір рет іске қосыңыз (рұқсат береді, сынақ хат жібереді). */
function testSetup() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        id: "test-" + Date.now(), kind: "test", title: "Сынақ жіберу", percent: 100, passed: true, score: "1/1",
        submittedAt: new Date().toISOString(),
        student: { name: "Сынақ Студент", group: "ХТ-00", email: "" },
        details: [{ n: 1, question: "Байланыс жұмыс істей ме?", answer: "Иә", result: "✓ дұрыс" }],
        summary: "GreenChemAI сынақ хабарламасы.",
      }),
    },
  };
  Logger.log(doPost(fake).getContent());
}
