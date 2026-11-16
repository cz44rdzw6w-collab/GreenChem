// Рубрика негізінде автоматты бағалау: сандық, таңдау және ашық жауаптар.
import { levelFor } from "./data/cases.js";

const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
const wordCount = (s) => (String(s || "").trim().match(/[\p{L}\p{N}]+/gu) || []).length;

function hasTerm(text, term) {
  const t = norm(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${t}`, "u").test(text);
}

export function parseNumber(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(/\s/g, "").replace(",", ".").replace(/[^0-9.eE+-]/g, "");
  return s ? Number(s) : NaN;
}

/** Бір тапсырманы бағалайды → { score 0..1, strengths[], improvements[] } */
export function evaluateTask(task, value) {
  const res = { score: 0, strengths: [], improvements: [], status: "empty" };

  if (task.type === "number") {
    const x = parseNumber(value);
    if (!Number.isFinite(x)) {
      res.improvements.push(`«${task.label}» — сандық жауап енгізілмеген.`);
      return res;
    }
    const rel = Math.abs(x - task.answer) / Math.abs(task.answer);
    if (rel <= task.tol) {
      res.score = 1;
      res.status = "ok";
      res.strengths.push(`${task.label}: дұрыс есептелді (${x} ${task.unit}).`);
    } else if (rel <= task.tol * 4) {
      res.score = 0.5;
      res.status = "partial";
      res.improvements.push(`${task.label}: нәтиже жақын, бірақ дәл емес. Молярлық массалар мен дөңгелектеуді тексеріңіз.`);
    } else {
      res.status = "wrong";
      res.improvements.push(`${task.label}: нәтиже дұрыс емес. Кеңес: ${task.hint}`);
    }
    res.expected = task.answer;
    return res;
  }

  if (task.type === "choice") {
    if (value === undefined || value === null || value === "") {
      res.improvements.push(`«${task.label}» — жауап таңдалмаған.`);
      return res;
    }
    if (Number(value) === task.correct) {
      res.score = 1;
      res.status = "ok";
      res.strengths.push(`Дұрыс таңдау: ${task.options[task.correct]}.`);
    } else {
      res.status = "wrong";
      res.improvements.push(`«${task.label}» — дұрыс жауап: ${task.options[task.correct]}. ${task.explain || ""}`);
    }
    return res;
  }

  if (task.type === "multi") {
    const sel = Array.isArray(value) ? value.map(Number) : [];
    if (!sel.length) {
      res.improvements.push(`«${task.label}» — ешбір нұсқа таңдалмаған.`);
      return res;
    }
    const hits = sel.filter((i) => task.correct.includes(i));
    const wrong = sel.filter((i) => !task.correct.includes(i) && !(task.neutral || []).includes(i));
    const missed = task.correct.filter((i) => !sel.includes(i));
    res.score = Math.max(0, (hits.length - wrong.length) / task.correct.length);
    res.status = res.score >= 0.99 ? "ok" : res.score > 0 ? "partial" : "wrong";
    if (hits.length) res.strengths.push(`Дұрыс анықталған қағидалар: ${hits.map((i) => task.options[i]).join("; ")}.`);
    if (missed.length) res.improvements.push(`Назардан тыс қалды: ${missed.map((i) => task.options[i]).join("; ")}.`);
    if (wrong.length) res.improvements.push(`Сәйкес емес таңдау: ${wrong.map((i) => task.options[i]).join("; ")}.`);
    if (task.explain) res.note = task.explain;
    return res;
  }

  // text
  const text = norm(value);
  const words = wordCount(value);
  if (!words) {
    res.improvements.push(`«${shorten(task.label)}» — жауап жазылмаған.`);
    return res;
  }
  const matched = task.keywords.filter((k) => k.terms.some((t) => hasTerm(text, t)));
  const missing = task.keywords.filter((k) => !matched.includes(k));
  const need = Math.min(task.keywords.length, Math.max(3, Math.ceil(task.keywords.length * 0.8)));
  let score = Math.min(1, matched.length / need);
  const lengthFactor = Math.min(1, words / (task.minWords || 20));
  score *= 0.6 + 0.4 * lengthFactor;
  res.score = score;
  res.status = score >= 0.85 ? "ok" : score >= 0.4 ? "partial" : "wrong";
  res.words = words;
  if (matched.length) res.strengths.push(`Негізгі ұғымдар қамтылған: ${matched.map((k) => k.label).join(", ")}.`);
  if (missing.length) res.improvements.push(`Жауапты толықтырыңыз: ${missing.map((k) => k.label).join(", ")}.`);
  if (lengthFactor < 1) res.improvements.push(`Жауап тым қысқа (${words} сөз). Кемінде ${task.minWords} сөзбен дәлелдеп жазыңыз.`);
  return res;
}

const shorten = (s, n = 60) => (s.length > n ? s.slice(0, n) + "…" : s);

/** Кейсті толық бағалау. */
export function evaluateCase(caseDef, answers) {
  const taskResults = {};
  for (const task of caseDef.tasks) taskResults[task.id] = evaluateTask(task, answers[task.id]);

  const criteria = caseDef.criteria.map((c) => {
    const tasks = caseDef.tasks.filter((t) => t.criterion === c.id);
    const avg = tasks.length ? tasks.reduce((a, t) => a + taskResults[t.id].score, 0) / tasks.length : 0;
    const percent = Math.round(avg * 100);
    return { id: c.id, name: c.name, weight: c.weight, percent, points: +(avg * c.weight).toFixed(1), level: levelFor(percent).name };
  });
  const maxPoints = caseDef.criteria.reduce((a, c) => a + c.weight, 0);
  const points = criteria.reduce((a, c) => a + c.points, 0);
  const percent = Math.round((points / maxPoints) * 100);

  const strengths = [];
  const improvements = [];
  for (const t of caseDef.tasks) {
    strengths.push(...taskResults[t.id].strengths);
    improvements.push(...taskResults[t.id].improvements);
  }
  const best = [...criteria].sort((a, b) => b.percent - a.percent)[0];
  const worst = [...criteria].sort((a, b) => a.percent - b.percent)[0];
  if (best && best.percent >= 70) strengths.unshift(`Ең мықты критерий: «${best.name}» (${best.percent}%).`);
  if (worst && worst.percent < 70) improvements.unshift(`Басым назар аударатын критерий: «${worst.name}» (${worst.percent}%).`);

  return {
    caseId: caseDef.id,
    percent, points: +points.toFixed(1), maxPoints,
    level: levelFor(percent).name,
    criteria, taskResults, strengths, improvements,
    submittedAt: Date.now(),
  };
}

/** Тест сұрағын бағалау → 0..1 */
export function gradeQuestion(q, value) {
  if (q.type === "single") return value !== undefined && value !== null && value !== "" && Number(value) === q.correct ? 1 : 0;
  if (q.type === "multi") {
    const sel = Array.isArray(value) ? value.map(Number) : [];
    if (!sel.length) return 0;
    const hits = sel.filter((i) => q.correct.includes(i)).length;
    const wrong = sel.length - hits;
    return Math.max(0, (hits - wrong) / q.correct.length);
  }
  if (q.type === "number") {
    const x = parseNumber(value);
    if (!Number.isFinite(x)) return 0;
    return Math.abs(x - q.answer) / Math.abs(q.answer) <= q.tol ? 1 : 0;
  }
  return 0;
}

/** Студент жауабын мәтінге айналдыру (есеп үшін). */
export function answerText(q, value) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return "";
  if (q.type === "single" || q.type === "choice") return q.options[Number(value)] ?? "";
  if (q.type === "multi") return value.map((i) => q.options[Number(i)]).join("; ");
  if (q.type === "number") return `${value}${q.unit ? " " + q.unit : ""}`;
  return String(value);
}
