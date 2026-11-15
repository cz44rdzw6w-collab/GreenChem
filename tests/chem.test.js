import test from "node:test";
import assert from "node:assert/strict";
import { molarMass, parseEquation, atomEconomy, eFactor, pmi, rme } from "../public/js/chem.js";

const close = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("молярлық масса", () => {
  close(molarMass("H2O"), 18.015);
  close(molarMass("C13H18O2"), 206.285);
  close(molarMass("Ca(OH)2"), 74.092);
  close(molarMass("CuSO4·5H2O"), 249.68, 0.05);
  close(molarMass("CH3COOH"), 60.052);
  assert.throws(() => molarMass("Xx2"));
});

test("теңдеу және теңгерім", () => {
  const eq = parseEquation("2H2 + O2 -> 2H2O");
  assert.equal(eq.balance.balanced, true);
  assert.equal(eq.reactants[0].coef, 2);
  const bad = parseEquation("H2 + O2 → H2O");
  assert.equal(bad.balance.balanced, false);
});

test("BHC ибупрофен атомдық үнемділігі ≈ 77,4 %", () => {
  const eq = parseEquation("C10H14 + C4H6O3 + H2 + CO -> C13H18O2 + CH3COOH");
  assert.equal(eq.balance.balanced, true);
  const ae = atomEconomy(eq.products[0].total, eq.reactants.map((r) => r.total));
  close(ae, 77.45, 0.1);
});

test("аспирин кейсі: AE, RME, PMI, E", () => {
  const eq = parseEquation("C7H6O3 + C4H6O3 -> C9H8O4 + CH3COOH");
  close(atomEconomy(eq.products[0].total, eq.reactants.map((r) => r.total)), 75.0, 0.05);
  close(rme(2.1, [2.0, 5.4]), 28.38, 0.01);
  close(pmi(87.65, 2.1), 41.74, 0.01);
  close(eFactor(87.65, 2.1), 40.74, 0.01);
});

test("поликарбонат (Asahi Kasei) таза реакциясы", () => {
  const eq = parseEquation("C2H4O + CO2 + C15H16O2 -> C16H14O3 + C2H6O2");
  assert.equal(eq.balance.balanced, true);
  close(atomEconomy(eq.products[0].total, eq.reactants.map((r) => r.total)), 80.38, 0.05);
});
