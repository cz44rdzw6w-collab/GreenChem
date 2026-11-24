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
