// Химиялық есептеулер: формуланы талдау, молярлық масса, теңдеу, жасыл метрикалар.
// Атомдық массалар — IUPAC стандартты (конвенционалды) мәндері, г/моль.
export const ATOMIC_MASS = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974,
  S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Ti: 47.867, V: 50.942,
  Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971, Br: 79.904, Rb: 85.468, Sr: 87.62,
  Zr: 91.224, Mo: 95.95, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41,
  Sn: 118.71, Sb: 121.76, I: 126.90, Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12,
  W: 183.84, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2,
  Bi: 208.98, U: 238.03,
};

/** Формуланы элементтер санына талдайды: "Ca(OH)2" → {Ca:1,O:2,H:2}. Гидраттар: "CuSO4·5H2O". */
export function parseFormula(formula) {
  const src = String(formula).replace(/\s+/g, "");
  if (!src) throw new Error("Формула бос");
  const parts = src.split(/[·*•.]/);
  const total = {};
  for (const part of parts) {
    const m = part.match(/^(\d+)(.*)$/);
    const mult = m ? Number(m[1]) : 1;
    const body = m ? m[2] : part;
    const counts = parseGroup(body);
    for (const [el, n] of Object.entries(counts)) total[el] = (total[el] || 0) + n * mult;
  }
  return total;
}

function parseGroup(str) {
  let i = 0;
  const OPEN = { "(": ")", "[": "]", "{": "}" };
  function readNumber() {
    let s = "";
    while (i < str.length && /\d/.test(str[i])) s += str[i++];
    return s ? Number(s) : 1;
  }
  function parse(closing) {
    const counts = {};
    while (i < str.length) {
      const ch = str[i];
      if (OPEN[ch]) {
        i++;
        const inner = parse(OPEN[ch]);
        const n = readNumber();
        for (const [el, c] of Object.entries(inner)) counts[el] = (counts[el] || 0) + c * n;
      } else if (ch === closing) {
        i++;
        return counts;
      } else if (/[A-Z]/.test(ch)) {
        let el = ch;
        i++;
        while (i < str.length && /[a-z]/.test(str[i])) el += str[i++];
        if (!(el in ATOMIC_MASS)) throw new Error(`Белгісіз элемент: ${el}`);
        const n = readNumber();
        counts[el] = (counts[el] || 0) + n;
      } else {
        throw new Error(`Формуладағы жарамсыз таңба: «${ch}»`);
      }
    }
    if (closing) throw new Error("Жақша жабылмаған");
    return counts;
  }
  return parse(null);
}

export function molarMass(formula) {
  const counts = parseFormula(formula);
  let m = 0;
  for (const [el, n] of Object.entries(counts)) m += ATOMIC_MASS[el] * n;
  return m;
}

/** "2H2 + O2 -> 2H2O" теңдеуін талдайды. */
export function parseEquation(eq) {
  const normalized = String(eq).replace(/→|⟶|=>|==|=/g, "->");
  const sides = normalized.split("->");
  if (sides.length !== 2) throw new Error("Теңдеуде «→» (немесе ->) белгісі бір рет болуы керек");
  const side = (s) =>
    s
      .split("+")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/);
        const coef = m ? Number(m[1].replace(",", ".")) : 1;
        const formula = m ? m[2] : t;
        const M = molarMass(formula);
        return { coef, formula, M, total: coef * M, atoms: parseFormula(formula) };
      });
  const reactants = side(sides[0]);
  const products = side(sides[1]);
  if (!reactants.length || !products.length) throw new Error("Реагенттер мен өнімдер көрсетілуі керек");
  return { reactants, products, balance: checkBalance(reactants, products) };
}

export function checkBalance(reactants, products) {
  const sum = (list) => {
    const t = {};
    for (const s of list) for (const [el, n] of Object.entries(s.atoms)) t[el] = (t[el] || 0) + n * s.coef;
    return t;
  };
  const L = sum(reactants);
  const R = sum(products);
  const els = new Set([...Object.keys(L), ...Object.keys(R)]);
  const diff = [];
  for (const el of els) {
    const a = L[el] || 0;
    const b = R[el] || 0;
    if (Math.abs(a - b) > 1e-9) diff.push({ el, left: a, right: b });
  }
  return { balanced: diff.length === 0, diff };
}

// ---------- Жасыл химия метрикалары ----------
export const atomEconomy = (productMass, reactantMasses) =>
  (productMass / reactantMasses.reduce((a, b) => a + b, 0)) * 100;
export const eFactor = (totalInput, productMass) => (totalInput - productMass) / productMass;
export const pmi = (totalInput, productMass) => totalInput / productMass;
export const rme = (productMass, reactantMasses) =>
  (productMass / reactantMasses.reduce((a, b) => a + b, 0)) * 100;

export function fmt(x, digits = 2) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/** Формуладағы цифрларды төменгі индекске айналдырады (HTML). */
export function formulaHtml(f) {
  return String(f)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/([A-Za-z)\]])(\d+)/g, "$1<sub>$2</sub>");
}
