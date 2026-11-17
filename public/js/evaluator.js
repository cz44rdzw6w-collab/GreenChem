// Тест сұрақтары мен сандық жауаптарды бағалау.

export function parseNumber(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(/\s/g, "").replace(",", ".").replace(/[^0-9.eE+-]/g, "");
  return s ? Number(s) : NaN;
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
