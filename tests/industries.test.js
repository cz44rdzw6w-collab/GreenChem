import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { INDUSTRIES } from "../public/js/data/industries.js";

test("ҚР өндірістері: 15 өндіріс, дайындарының беті мен тапсырмалары бар", () => {
  assert.equal(INDUSTRIES.length, 15);
  for (const ind of INDUSTRIES.filter((x) => x.ready)) {
    assert.ok(fs.existsSync(new URL(`../public/industries/${ind.id}.html`, import.meta.url)), ind.id);
    const keys = new Set();
    for (const t of ind.tasks) {
      assert.ok(["A", "B", "C"].includes(t.level), `${ind.id}/${t.id}`);
      if (t.type === "number") {
        assert.ok(t.parts?.length, `${ind.id}/${t.id}: parts`);
        for (const p of t.parts) {
          assert.ok(Number.isFinite(p.answer) && p.tol > 0 && p.unit, `${ind.id}/${p.key}`);
          assert.ok(!keys.has(p.key), `қайталанған кілт ${p.key}`);
          keys.add(p.key);
        }
      }
    }
  }
});

test("№2 өндірістің сандық жауаптары есептеуге сәйкес", () => {
  const ae = (63.012 / (17.031 + 2 * 31.998)) * 100;
  assert.ok(Math.abs(ae - 77.8) < 0.1);
  assert.ok(Math.abs(17.031 / 63.012 - 0.27) < 0.005);
  const n2o = (360000 * 7) / 1000 / 1000; // мың т
  assert.ok(Math.abs(n2o - 2.52) < 1e-9);
  assert.ok(Math.abs(n2o * 265 - 668) < 1);
});

test("№3 өндірістің сандық жауаптары есептеуге сәйкес", () => {
  const M = 80.043;
  assert.ok(Math.abs((2 * 14.007) / M * 100 - 35) < 0.1);
  assert.ok(Math.abs(400 * (2 * 17.031) / M - 170) < 1);
  const water = (63.012 / 0.58 - 63.012) / 18.015;
  assert.ok(Math.abs(water - 2.5) < 0.05);
  assert.ok(Math.abs(water * 44 - 111) < 1);
});

test("№4 өндірістің сандық жауаптары есептеуге сәйкес", () => {
  const M = 98.079;
  assert.ok(Math.abs((500 * 32.06) / M - 163) < 1);
  const so2 = ((500e6 / M) * (0.003 / 0.997) * 64.066) / 1e6; // мың т
  assert.ok(Math.abs(so2 - 0.98) < 0.02);
  const gj = (526 * 1e6) / M / 1e6; // ГДж/т
  assert.ok(Math.abs((500e3 * gj) / 1e6 - 2.68) < 0.02);
  assert.ok(Math.abs((500e3 * gj * 0.3) / 3.6 / 1e3 - 223) < 2);
});

test("№5 өндірістің сандық жауаптары есептеуге сәйкес", () => {
  const M = 98.079, S = 32.06;
  assert.ok(Math.abs(M / S - 3.06) < 0.01);
  const sulfur = (180 * S) / M;
  assert.ok(Math.abs(sulfur - 59) < 0.5);
  assert.ok(Math.abs(((180 - sulfur) * 1000) / 60 - 2000) < 50);
});

test("№6–13 өндірістердің сандық жауаптары есептеуге сәйкес", () => {
  const near = (a, b, rel) => Math.abs(a - b) / Math.abs(b) <= rel;
  // №6: 100 мың т P₂O₅ → H₂SO₄ және S (10/3 моль H₂SO₄ / моль P₂O₅)
  const acid = (100 / 141.944) * (10 / 3) * 98.079;
  assert.ok(near(acid, 230, 0.01) && near((acid * 32.06) / 98.079, 75, 0.01));
  // №7: 638/800; SO₂ 99,5% және 99,8%
  assert.ok(near((638 / 800) * 100, 80, 0.01));
  const so2 = (c) => ((800e6 / 98.079) * ((1 - c) / c) * 64.066) / 1e6;
  assert.ok(near(so2(0.995), 2.63, 0.01) && near(so2(0.998), 1.05, 0.01) && near(so2(0.995) / so2(0.998), 2.5, 0.01));
  // №8: 2Ca₃(PO₄)₂ + 6SiO₂ + 10C → 6CaSiO₃ + 10CO + P₄
  assert.ok(near((10 * 28.01) / 123.895, 2.26, 0.01) && near((6 * 116.16) / 123.895, 5.63, 0.01));
  assert.ok(near(14 * (30.974 / 97.994), 4.42, 0.01));
  // №9: Ca₅(PO₄)₃F + 5H₂SO₄ + 10H₂O → 3H₃PO₄ + 5CaSO₄·2H₂O + HF
  assert.ok(near((5 * 172.17) / (1.5 * 141.944), 4.04, 0.01));
  assert.ok(near((3 * 97.994) / (504.3 + 5 * 98.079 + 10 * 18.015) * 100, 25, 0.01));
  assert.ok(near((220 * 5 * 172.17) / (3 * 97.994), 644, 0.01));
  // №10: 2NaCl + 2H₂O → 2NaOH + Cl₂ + H₂; 3 В
  assert.ok(near((30 * 70.906) / 80.0, 26.6, 0.01) && near((30 * 2.016) / 80.0, 0.756, 0.01));
  assert.ok(near(((1e6 / 39.997) * 96485 * 3) / 3.6e6, 2010, 0.01));
  // №11: Cr(VI) + 3Fe²⁺; 4FeCr₂O₄ + 8Na₂CO₃ + 7O₂ → 8Na₂CrO₄ + 2Fe₂O₃ + 8CO₂
  assert.ok(near((1000 / 51.996) * 3 * 151.91 / 1000, 8.77, 0.01) && near((121.8 / 161.97) * 44.01, 33.1, 0.01));
  // №12: 4Au + 8NaCN + O₂ + 2H₂O → 4Na[Au(CN)₂] + 4NaOH
  assert.ok(near((1000 / 196.97) * 2 * 49.007 / 1000, 0.497, 0.01) && near(15000 / 150, 100, 0.001) && near(150 / 0.497, 300, 0.01));
  // №13: C₃H₈ → C₃H₆ + H₂
  assert.ok(near((629 * 42.081) / 44.097, 600, 0.01) && near((503 / 600.24) * 100, 84, 0.01) && near((503 * 2.016) / 42.081, 24, 0.01));
  assert.ok(near((24e6 * 120) / 1e9, 2.88, 0.01));
});

test("№14–15 өндірістердің сандық жауаптары есептеуге сәйкес", () => {
  const near = (a, b, rel) => Math.abs(a - b) / Math.abs(b) <= rel;
  // №14: 2CuFeS₂ + 5O₂ + SiO₂ → 2Cu + Fe₂SiO₄ + 4SO₂ (2 SO₂ / Cu)
  assert.ok(near((2 * 64.066) / 63.546, 2.02, 0.01) && near((2 * 98.079) / 63.546, 3.09, 0.01));
  assert.ok(near(1100 / 220, 5, 0.001) && near((70 * 98.079) / 64.066, 107, 0.01));
  // №15: 0,37% Cu, 70% алыну; 2CuSO₄ + 2H₂O → 2Cu + 2H₂SO₄ + O₂
  assert.ok(near(1 / (0.0037 * 0.7), 386, 0.01));
  assert.ok(near(98.079 / 63.546, 1.54, 0.01) && near((20 * 98.079) / 63.546, 30.9, 0.01));
  // Электролиз энергиясы, 2 В
  assert.ok(near(((1e6 / 63.546) * 2 * 96485 * 2) / 3.6e9, 1.7, 0.01));
});

test("Метрика калькуляторының өндіріс реакциялары теңестірілген", async () => {
  const { INDUSTRY_REACTIONS } = await import("../public/js/data/industry-metrics.js");
  const { parseEquation } = await import("../public/js/chem.js");
  assert.equal(Object.keys(INDUSTRY_REACTIONS).length, 15);
  for (const [id, list] of Object.entries(INDUSTRY_REACTIONS)) {
    for (const r of list) {
      const eq = parseEquation(r.eq);
      assert.ok(eq.balance.balanced, `${id}: ${r.eq}`);
      assert.ok(eq.products[r.target], `${id}: target`);
      assert.ok(r.capacity > 0 && r.used.every((i) => i !== r.target && eq.products[i]), `${id}: used/capacity`);
    }
  }
  // №1: 1 т NH₃-ке ≈0,97 т CO₂
  const e1 = parseEquation(INDUSTRY_REACTIONS.ind1[0].eq);
  assert.ok(Math.abs(e1.products[1].total / e1.products[0].total - 0.97) < 0.01);
});

test("Дәріс курсы: 15 тақырып, дайындарының файлы бар", async () => {
  const { COURSE_LECTURES } = await import("../public/js/data/course-lectures.js");
  assert.equal(COURSE_LECTURES.length, 15);
  for (const l of COURSE_LECTURES.filter((x) => x.ready)) {
    const html = fs.readFileSync(new URL(`../public/course/${l.id}.html`, import.meta.url), "utf8");
    assert.ok(html.includes("Өзін-өзі тексеру") && html.includes("Оқу мақсаттары"), l.id);
  }
});
