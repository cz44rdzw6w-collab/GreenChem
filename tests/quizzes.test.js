import test from "node:test";
import assert from "node:assert/strict";
import { TESTS, questionPool } from "../public/js/data/quizzes.js";
import { gradeQuestion } from "../public/js/evaluator.js";
import { molarMass } from "../public/js/chem.js";

test("тест құрылымы дұрыс", () => {
  const ids = new Set();
  for (const t of TESTS) {
    assert.ok(t.passPercent > 0 && t.passPercent <= 100, t.id);
    assert.ok(t.attempts >= 1, t.id);
    const pool = questionPool(t);
    assert.ok(pool.length >= (t.count || 1), `${t.id}: сұрақ жеткіліксіз`);
    for (const q of t.questions) {
      assert.ok(!ids.has(q.id), `қайталанған id ${q.id}`);
      ids.add(q.id);
      if (q.type === "single") assert.ok(q.options[q.correct], q.id);
      if (q.type === "multi") q.correct.forEach((i) => assert.ok(q.options[i], q.id));
      if (q.type === "number") assert.ok(Number.isFinite(q.answer) && q.tol > 0, q.id);
    }
  }
});

test("сұрақтарды бағалау", () => {
  const all = TESTS.flatMap((t) => t.questions);
  for (const q of all) {
    const right = q.type === "number" ? String(q.answer).replace(".", ",") : q.correct;
    assert.equal(gradeQuestion(q, right), 1, q.id);
  }
  const multi = all.find((q) => q.type === "multi");
  assert.ok(gradeQuestion(multi, [multi.correct[0]]) < 1);
  assert.equal(gradeQuestion(multi, []), 0);
});

test("сандық жауаптар химиялық есептеуге сәйкес", () => {
  const ae = (molarMass("CH3COOC2H5") / (molarMass("CH3COOH") + molarMass("C2H5OH"))) * 100;
  assert.ok(Math.abs(ae - 83.02) < 0.05);
  const ferm = ((2 * molarMass("C2H5OH")) / molarMass("C6H12O6")) * 100;
  assert.ok(Math.abs(ferm - 51.14) < 0.05);
});
