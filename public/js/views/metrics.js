import { parseEquation, molarMass, parseFormula, fmt, formulaHtml, ATOMIC_MASS } from "../chem.js";
import { store } from "../store.js";
import { esc, toast } from "../ui.js";

const TABS = [
  { id: "ae", name: "Атомдық үнемділік" },
  { id: "ef", name: "E-фактор" },
  { id: "pmi", name: "PMI" },
  { id: "rme", name: "RME" },
  { id: "mm", name: "Молярлық масса" },
];

const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const num = (v) => {
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : NaN;
};

function markDone(key, label) {
  const s = store.get();
  if (!s.metrics[key]) {
    store.update((st) => (st.metrics[key] = Date.now()), `${label} калькуляторы қолданылды`);
    toast(`${label}: тапсырма орындалды ✓`);
  }
}

export function render(el, params, query) {
  let tab = query.get("tab") || "ae";
  if (!TABS.some((t) => t.id === tab)) tab = "ae";

  const draw = () => {
    const s = store.get();
    el.innerHTML = `
      <div class="section-head">
        <div>
          <div class="eyebrow">Сандық бағалау</div>
          <h1>Жасыл химия метрикалары</h1>
          <p>Процестің «жасылдығын» сандық бағалау: формулалар, шығарылған мысалдар және автоматты калькуляторлар.</p>
        </div>
      </div>
      <div class="tabs" role="tablist">
        ${TABS.map((t) => `<button class="tab ${t.id === tab ? "active" : ""}" role="tab" aria-selected="${t.id === tab}" data-tab="${t.id}">${t.name}${s.metrics[t.id] ? '<span class="done">✓</span>' : ""}</button>`).join("")}
      </div>
      <div id="panel"></div>`;
    el.querySelectorAll(".tab").forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        history.replaceState(null, "", `#/metrics?tab=${tab}`);
        draw();
      })
    );
    const panel = el.querySelector("#panel");
    ({ ae: aePanel, ef: efPanel, pmi: pmiPanel, rme: rmePanel, mm: mmPanel })[tab](panel);
  };
  draw();
  return TABS.find((t) => t.id === tab).name;
}

// ---------------- Атомдық үнемділік ----------------
const AE_PRESETS = [
  { name: "Этилацетат (этерификация)", eq: "CH3COOH + C2H5OH -> CH3COOC2H5 + H2O" },
  { name: "Этиленді гидратациялау", eq: "C2H4 + H2O -> C2H5OH" },
  { name: "Ибупрофен (BHC процесі)", eq: "C10H14 + C4H6O3 + H2 + CO -> C13H18O2 + CH3COOH" },
  { name: "Аспирин синтезі", eq: "C7H6O3 + C4H6O3 -> C9H8O4 + CH3COOH" },
  { name: "Аммиак синтезі (Габер–Бош)", eq: "N2 + 3H2 -> 2NH3" },
  { name: "Фосгенді поликарбонат", eq: "C15H16O2 + COCl2 + 2NaOH -> C16H14O3 + 2NaCl + 2H2O" },
];

function aePanel(panel) {
  panel.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Атомдық үнемділік (Atom Economy, AE)</h2>
        <p>Б. Трост (1991) ұсынған көрсеткіш теңестірілген теңдеу бойынша реагенттер массасының қандай үлесі мақсатты өнімге енетінін көрсетеді.</p>
        <div class="formula">AE = ${frac("ν<sub>p</sub> · M(мақсатты өнім)", "Σ ν<sub>i</sub> · M(реагенттер)")} × 100%</div>
        <p class="small muted">ν — стехиометриялық коэффициент, M — молярлық масса (г/моль). AE шығымды, артық реагентті және еріткіштерді ескермейді.</p>
        <h3>Шығарылған мысал: этилацетат синтезі</h3>
        <div class="reaction">CH<sub>3</sub>COOH + C<sub>2</sub>H<sub>5</sub>OH → CH<sub>3</sub>COOC<sub>2</sub>H<sub>5</sub> + H<sub>2</sub>O</div>
        <ol class="steps" style="margin-top:10px">
          <li>M(CH<sub>3</sub>COOH) = 2·12,011 + 4·1,008 + 2·15,999 = 60,05 г/моль</li>
          <li>M(C<sub>2</sub>H<sub>5</sub>OH) = 46,07 г/моль; Σ M(реагенттер) = 106,12 г/моль</li>
          <li>M(CH<sub>3</sub>COOC<sub>2</sub>H<sub>5</sub>) = 88,11 г/моль</li>
          <li>AE = 88,11 / 106,12 × 100% = <strong>83,0%</strong> — массаның 17%-ы суға кетеді.</li>
        </ol>
        <p class="small muted">Салыстыру: Boots ибупрофен процесі ≈ 40%, BHC процесі ≈ 77%; қосылу реакциялары — 100%.</p>
      </div>
      <div class="card">
        <h2>Калькулятор</h2>
        <div class="field">
          <label for="aeEq">Теңестірілген реакция теңдеуі</label>
          <input class="input" id="aeEq" value="CH3COOH + C2H5OH -> CH3COOC2H5 + H2O" autocomplete="off" spellcheck="false" />
          <div class="small muted" style="margin-top:6px">Формат: <code>2H2 + O2 -> 2H2O</code>. Элементтерді бас әріппен, жақшаларды <code>Ca(OH)2</code> түрінде жазыңыз.</div>
        </div>
        <div class="field">
          <label for="aePreset">Немесе дайын мысалды таңдаңыз</label>
          <select id="aePreset"><option value="">— таңдаңыз —</option>${AE_PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join("")}</select>
        </div>
        <div class="field"><label for="aeTarget">Мақсатты өнім</label><select id="aeTarget"></select></div>
        <button class="btn" id="aeCalc">Есептеу</button>
        <div id="aeOut" style="margin-top:14px"></div>
      </div>
    </div>`;

  const eqIn = panel.querySelector("#aeEq");
  const target = panel.querySelector("#aeTarget");
  const out = panel.querySelector("#aeOut");

  const refreshTargets = () => {
    try {
      const eq = parseEquation(eqIn.value);
      const prev = target.value;
      target.innerHTML = eq.products.map((p, i) => `<option value="${i}">${esc(p.formula)}</option>`).join("");
      if (prev && Number(prev) < eq.products.length) target.value = prev;
    } catch {
      target.innerHTML = "";
    }
  };

  const calc = (record) => {
    try {
      const eq = parseEquation(eqIn.value);
      const ti = Number(target.value) || 0;
      const prod = eq.products[ti];
      const sumR = eq.reactants.reduce((a, r) => a + r.total, 0);
      const ae = (prod.total / sumR) * 100;
      const row = (s, role) => `<tr><td>${role}</td><td>${formulaHtml(s.formula)}</td><td>${fmt(s.coef, 3)}</td><td>${fmt(s.M, 2)}</td><td>${fmt(s.total, 2)}</td></tr>`;
      const cls = ae >= 80 ? "" : ae >= 50 ? "warn" : "err";
      out.innerHTML = `
        ${eq.balance.balanced ? "" : `<div class="result-box warn" style="margin-bottom:10px">⚠️ Теңдеу теңестірілмеген: ${eq.balance.diff.map((d) => `${d.el}: ${d.left} → ${d.right}`).join("; ")}. Коэффициенттерді тексеріңіз.</div>`}
        <div class="result-box ${cls}"><div class="muted small">Атомдық үнемділік</div><div class="big">${fmt(ae, 1)}%</div>
          <div class="small">${ae >= 99.9 ? "Идеал: барлық атомдар өнімге енеді." : ae >= 80 ? "Жоғары атомдық үнемділік." : ae >= 50 ? "Орташа: жанама өнімдерді пайдалану жолдарын қарастырыңыз." : "Төмен: реагенттер массасының басым бөлігі қалдыққа кетеді."}</div></div>
        <div class="table-wrap" style="margin-top:12px"><table>
          <thead><tr><th>Рөлі</th><th>Зат</th><th>ν</th><th>M, г/моль</th><th>ν·M</th></tr></thead>
          <tbody>${eq.reactants.map((r) => row(r, "Реагент")).join("")}${eq.products.map((p, i) => row(p, i === ti ? "<strong>Мақсатты өнім</strong>" : "Жанама өнім")).join("")}</tbody>
        </table></div>
        <p class="small" style="margin-top:10px">AE = ${fmt(prod.total, 2)} / ${fmt(sumR, 2)} × 100% = <strong>${fmt(ae, 2)}%</strong></p>`;
      if (record) markDone("ae", "Атомдық үнемділік");
    } catch (e) {
      out.innerHTML = `<div class="result-box err">${esc(e.message)}</div>`;
    }
  };

  eqIn.addEventListener("input", refreshTargets);
  panel.querySelector("#aePreset").addEventListener("change", (e) => {
    if (e.target.value === "") return;
    eqIn.value = AE_PRESETS[Number(e.target.value)].eq;
    refreshTargets();
    target.value = "0";
    calc(false);
  });
  panel.querySelector("#aeCalc").addEventListener("click", () => calc(true));
  eqIn.addEventListener("keydown", (e) => e.key === "Enter" && calc(true));
  refreshTargets();
  calc(false);
}

// ---------------- Массалық баланс (E-фактор, PMI) ----------------
const MASS_FIELDS = [
  { id: "reactants", label: "Реагенттер (шикізат)", color: "#6E7D45" },
  { id: "reagents", label: "Көмекші заттар (катализатор, негіз, қышқыл)", color: "#F4C230" },
  { id: "solvents", label: "Органикалық еріткіштер", color: "#ee9aac" },
  { id: "water", label: "Су (реакция, өңдеу, жуу)", color: "#8fc3e8" },
];
const EXAMPLE = { reactants: 120, reagents: 30, solvents: 500, water: 1000, product: 80, recovery: 0 };

function massInputs(prefix, withRecovery) {
  return `
    <div class="form-row">
      ${MASS_FIELDS.map((f) => `<div class="field"><label for="${prefix}-${f.id}">${f.label}</label><div class="input-unit"><input class="input" type="number" min="0" step="any" inputmode="decimal" id="${prefix}-${f.id}" value="${EXAMPLE[f.id]}"><span>кг</span></div></div>`).join("")}
      <div class="field"><label for="${prefix}-product">Мақсатты өнім</label><div class="input-unit"><input class="input" type="number" min="0" step="any" inputmode="decimal" id="${prefix}-product" value="${EXAMPLE.product}"><span>кг</span></div></div>
      ${withRecovery ? `<div class="field"><label for="${prefix}-recovery">Еріткіш регенерациясы</label><div class="input-unit"><input class="input" type="number" min="0" max="100" step="any" inputmode="decimal" id="${prefix}-recovery" value="0"><span>%</span></div></div>` : ""}
    </div>`;
}

function readMass(panel, prefix) {
  const v = {};
  for (const f of [...MASS_FIELDS.map((f) => f.id), "product", "recovery"]) {
    const input = panel.querySelector(`#${prefix}-${f}`);
    v[f] = input ? num(input.value || 0) : 0;
  }
  return v;
}

function validateMass(v) {
  if (Object.values(v).some((x) => !Number.isFinite(x) || x < 0)) return "Барлық мәндер теріс емес сан болуы керек.";
  if (!(v.product > 0)) return "Өнім массасы нөлден үлкен болуы керек.";
  const total = v.reactants + v.reagents + v.solvents + v.water;
  if (v.product > total) return "Өнім массасы кіріс материалдарының жалпы массасынан үлкен бола алмайды.";
  if (v.recovery > 100) return "Регенерация 100%-дан аспауы керек.";
  return null;
}

function efPanel(panel) {
  panel.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>E-фактор (экологиялық фактор)</h2>
        <p>Р. Шелдон (1992) ұсынған: өнімнің бір килограмына шаққандағы қалдық массасы. Идеал мән — 0.</p>
        <div class="formula">E = ${frac("m(қалдық)", "m(өнім)")} = ${frac("Σm(кіріс) − m(өнім)", "m(өнім)")}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Сала</th><th>Өндіріс көлемі, т/жыл</th><th>E, кг/кг</th></tr></thead>
          <tbody><tr><td>Мұнай өңдеу</td><td>10⁶–10⁸</td><td>&lt; 0,1</td></tr><tr><td>Ірі тоннажды химия</td><td>10⁴–10⁶</td><td>&lt; 1–5</td></tr><tr><td>Нәзік химия</td><td>10²–10⁴</td><td>5–50</td></tr><tr><td>Фармацевтика</td><td>10–10³</td><td>25–&gt;100</td></tr></tbody>
        </table></div>
        <h3 style="margin-top:14px">Шығарылған мысал</h3>
        <ol class="steps">
          <li>Кіріс: реагенттер 120 кг, көмекші заттар 30 кг, еріткіштер 500 кг, су 1000 кг; өнім 80 кг.</li>
          <li>Суды есептемегенде: қалдық = 650 − 80 = 570 кг → <strong>E = 7,1</strong></li>
          <li>Суды қосқанда (толық E): қалдық = 1650 − 80 = 1570 кг → <strong>E = 19,6</strong></li>
          <li>Еріткіштің 90%-ы регенерацияланса: қалдық = 650 − 450 − 80 = 120 кг → E = 1,5 (сусыз).</li>
        </ol>
        <p class="small muted">Шектеуі: E-фактор қалдықтың тек мөлшерін бағалайды; қауіптілігін ескеру үшін экологиялық квоциент EQ = E × Q қолданылады.</p>
      </div>
      <div class="card">
        <h2>Калькулятор</h2>
        ${massInputs("ef", true)}
        <div class="btn-row"><button class="btn" id="efCalc">Есептеу</button><button class="btn secondary" id="efEx">Мысалды жүктеу</button></div>
        <div id="efOut" style="margin-top:14px"></div>
      </div>
    </div>`;

  const out = panel.querySelector("#efOut");
  const calc = (record) => {
    const v = readMass(panel, "ef");
    const err = validateMass(v);
    if (err) return (out.innerHTML = `<div class="result-box err">${err}</div>`);
    const solventWaste = v.solvents * (1 - v.recovery / 100);
    const nonWaterIn = v.reactants + v.reagents + solventWaste;
    const eSimple = (nonWaterIn - v.product) / v.product;
    const eComplete = (nonWaterIn + v.water - v.product) / v.product;
    const bands = [
      ["< 0,1", "мұнай өңдеу", eSimple < 0.1],
      ["0,1–5", "ірі тоннажды", eSimple >= 0.1 && eSimple < 5],
      ["5–50", "нәзік химия", eSimple >= 5 && eSimple < 50],
      ["> 25–100", "фармацевтика", eSimple >= 50],
    ];
    out.innerHTML = `
      <div class="grid grid-2">
        <div class="result-box ${eSimple < 5 ? "" : eSimple < 50 ? "warn" : "err"}"><div class="muted small">E-фактор (сусыз)</div><div class="big">${fmt(eSimple, 2)}</div><div class="small">кг қалдық / кг өнім</div></div>
        <div class="result-box warn"><div class="muted small">Толық E-фактор (сумен)</div><div class="big">${fmt(eComplete, 2)}</div><div class="small">кг қалдық / кг өнім</div></div>
      </div>
      <p class="small" style="margin-top:10px">Қалдық (сусыз) = ${fmt(nonWaterIn, 2)} − ${fmt(v.product, 2)} = ${fmt(nonWaterIn - v.product, 2)} кг${v.recovery ? ` (еріткіштің ${fmt(v.recovery, 1)}%-ы регенерацияланды)` : ""}.</p>
      <div class="scale">${bands.map(([r, n, hit]) => `<div class="${hit ? "hit" : ""}">${r}<br>${n}</div>`).join("")}</div>
      <p class="small muted" style="margin-top:8px">Сусыз E-фактор бойынша процесс деңгейі сарғыш түспен белгіленген.</p>`;
    if (record) markDone("ef", "E-фактор");
  };
  panel.querySelector("#efCalc").addEventListener("click", () => calc(true));
  panel.querySelector("#efEx").addEventListener("click", () => {
    for (const [k, val] of Object.entries(EXAMPLE)) { const i = panel.querySelector(`#ef-${k}`); if (i) i.value = val; }
    panel.querySelector("#ef-recovery").value = 90;
    calc(false);
  });
  calc(false);
}

function pmiPanel(panel) {
  panel.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Процесс массасының қарқындылығы (PMI)</h2>
        <p>ACS GCI Фармацевтикалық дөңгелек үстелі ұсынған негізгі метрика: 1 кг өнім алу үшін жұмсалған барлық материалдардың (реагенттер, еріткіштер, су, катализаторлар) массасы.</p>
        <div class="formula">PMI = ${frac("Σ m(барлық кіріс материалдары)", "m(өнім)")}  ;  PMI = E + 1</div>
        <p class="small muted">Идеал мән — 1. Фармацевтикада PMI көбіне 100-ден асады; оның 50–80%-ын еріткіштер құрайды.</p>
        <h3>Шығарылған мысал</h3>
        <ol class="steps">
          <li>Σm(кіріс) = 120 + 30 + 500 + 1000 = 1650 кг</li>
          <li>PMI = 1650 / 80 = <strong>20,6 кг/кг</strong></li>
          <li>Тексеру: E (толық) = PMI − 1 = 19,6 ✓</li>
          <li>Ең үлкен үлес: су (61%) және еріткіштер (30%) → оңтайландырудың басты нысаны.</li>
        </ol>
      </div>
      <div class="card">
        <h2>Калькулятор</h2>
        ${massInputs("pmi", false)}
        <div class="btn-row"><button class="btn" id="pmiCalc">Есептеу</button><button class="btn secondary" id="pmiEx">Мысалды жүктеу</button></div>
        <div id="pmiOut" style="margin-top:14px"></div>
      </div>
    </div>`;
  const out = panel.querySelector("#pmiOut");
  const calc = (record) => {
    const v = readMass(panel, "pmi");
    const err = validateMass(v);
    if (err) return (out.innerHTML = `<div class="result-box err">${err}</div>`);
    const total = v.reactants + v.reagents + v.solvents + v.water;
    const value = total / v.product;
    const shares = MASS_FIELDS.map((f) => ({ ...f, pct: (v[f.id] / total) * 100 }));
    const top = [...shares].sort((a, b) => b.pct - a.pct)[0];
    out.innerHTML = `
      <div class="grid grid-2">
        <div class="result-box ${value < 10 ? "" : value < 50 ? "warn" : "err"}"><div class="muted small">PMI</div><div class="big">${fmt(value, 2)}</div><div class="small">кг кіріс / кг өнім</div></div>
        <div class="result-box"><div class="muted small">Сәйкес E-фактор</div><div class="big">${fmt(value - 1, 2)}</div><div class="small">E = PMI − 1</div></div>
      </div>
      <h3 style="margin-top:14px">Кіріс материалдарының құрылымы</h3>
      <div class="stack" role="img" aria-label="Массалық үлестер">${shares.map((s) => `<span style="width:${s.pct}%;background:${s.color}" title="${s.label}: ${fmt(s.pct, 1)}%"></span>`).join("")}</div>
      <div class="legend">${shares.map((s) => `<span><i style="background:${s.color}"></i>${s.label}: ${fmt(s.pct, 1)}%</span>`).join("")}</div>
      <p class="small" style="margin-top:10px">💡 PMI-ге ең көп үлес қосатын ағын — <strong>${top.label.toLowerCase()}</strong> (${fmt(top.pct, 1)}%). Оңтайландыруды осыдан бастаңыз.</p>`;
    if (record) markDone("pmi", "PMI");
  };
  panel.querySelector("#pmiCalc").addEventListener("click", () => calc(true));
  panel.querySelector("#pmiEx").addEventListener("click", () => {
    for (const [k, val] of Object.entries(EXAMPLE)) { const i = panel.querySelector(`#pmi-${k}`); if (i) i.value = val; }
    calc(false);
  });
  calc(false);
}

// ---------------- RME ----------------
function rmePanel(panel) {
  let rows = [
    { name: "Салицил қышқылы", mass: 2.0 },
    { name: "Сірке ангидриді", mass: 5.4 },
  ];
  panel.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Реакция массасының тиімділігі (RME)</h2>
        <p>Реагенттер массасының қандай үлесі нақты алынған өнімге айналғанын көрсетеді. RME атомдық үнемділікті, шығымды және реагенттердің артық мөлшерін бірге ескереді.</p>
        <div class="formula">RME = ${frac("m(өнім)", "Σ m(реагенттер)")} × 100%  ≈  AE × ε × ${frac("1", "SF")}</div>
        <p class="small muted">ε — шығым (үлес), SF — стехиометриялық фактор (артық реагентті ескереді). Еріткіштер мен катализаторлар RME-ге кірмейді.</p>
        <h3>Шығарылған мысал: аспирин синтезі</h3>
        <ol class="steps">
          <li>2,00 г салицил қышқылы + 5,40 г сірке ангидриді → 2,10 г аспирин</li>
          <li>RME = 2,10 / (2,00 + 5,40) × 100% = <strong>28,4%</strong></li>
          <li>Салыстыру: AE = 75,0%, шығым = 80,5% → айырмашылықтың негізгі себебі сірке ангидридінің ≈3,7 есе артық алынуы.</li>
        </ol>
      </div>
      <div class="card">
        <h2>Калькулятор</h2>
        <label>Реагенттер</label>
        <div class="rows-editor" id="rows"></div>
        <button class="btn ghost sm" id="addRow">+ Реагент қосу</button>
        <div class="form-row" style="margin-top:10px">
          <div class="field"><label for="rmeProd">Алынған өнім массасы</label><div class="input-unit"><input class="input" id="rmeProd" type="number" min="0" step="any" inputmode="decimal" value="2.10"><span>г</span></div></div>
          <div class="field"><label for="rmeAe">AE (міндетті емес)</label><div class="input-unit"><input class="input" id="rmeAe" type="number" min="0" max="100" step="any" inputmode="decimal" value="75.0"><span>%</span></div></div>
          <div class="field"><label for="rmeYield">Шығым (міндетті емес)</label><div class="input-unit"><input class="input" id="rmeYield" type="number" min="0" max="100" step="any" inputmode="decimal" value="80.5"><span>%</span></div></div>
        </div>
        <button class="btn" id="rmeCalc">Есептеу</button>
        <div id="rmeOut" style="margin-top:14px"></div>
      </div>
    </div>`;

  const rowsEl = panel.querySelector("#rows");
  const drawRows = () => {
    rowsEl.innerHTML = rows
      .map((r, i) => `<div class="r"><input class="input" aria-label="Реагент атауы" data-i="${i}" data-k="name" value="${esc(r.name)}"><div class="input-unit"><input class="input" aria-label="Масса, г" type="number" min="0" step="any" inputmode="decimal" data-i="${i}" data-k="mass" value="${r.mass}"><span>г</span></div><button class="icon-btn" data-del="${i}" aria-label="Жою" ${rows.length < 2 ? "disabled" : ""}>×</button></div>`)
      .join("");
    rowsEl.querySelectorAll("input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const r = rows[Number(inp.dataset.i)];
        r[inp.dataset.k] = inp.dataset.k === "mass" ? num(inp.value) : inp.value;
      })
    );
    rowsEl.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { rows.splice(Number(b.dataset.del), 1); drawRows(); }));
  };
  drawRows();
  panel.querySelector("#addRow").addEventListener("click", () => { rows.push({ name: `Реагент ${rows.length + 1}`, mass: 1 }); drawRows(); });

  const out = panel.querySelector("#rmeOut");
  const calc = (record) => {
    const masses = rows.map((r) => num(r.mass));
    const prod = num(panel.querySelector("#rmeProd").value);
    if (masses.some((m) => !Number.isFinite(m) || m < 0) || !(prod > 0)) return (out.innerHTML = `<div class="result-box err">Массалар оң сан болуы керек.</div>`);
    const sum = masses.reduce((a, b) => a + b, 0);
    if (prod > sum) return (out.innerHTML = `<div class="result-box err">Өнім массасы реагенттер массасынан аспауы керек (масса сақталу заңы).</div>`);
    const value = (prod / sum) * 100;
    const ae = num(panel.querySelector("#rmeAe").value);
    const y = num(panel.querySelector("#rmeYield").value);
    let extra = "";
    if (ae > 0 && y > 0) {
      const sf = ((ae / 100) * (y / 100)) / (value / 100);
      extra = `<p class="small" style="margin-top:10px">Ыдырату: AE × ε = ${fmt(ae, 1)}% × ${fmt(y, 1)}% = ${fmt((ae * y) / 100, 1)}%. Нақты RME ${fmt(value, 1)}% → стехиометриялық фактор <strong>SF ≈ ${fmt(sf, 2)}</strong>${sf > 1.05 ? " (реагенттің артық мөлшері RME-ні төмендетеді)" : ""}.</p>`;
    }
    out.innerHTML = `
      <div class="result-box ${value >= 60 ? "" : value >= 30 ? "warn" : "err"}"><div class="muted small">RME</div><div class="big">${fmt(value, 1)}%</div>
      <div class="small">${fmt(prod, 3)} г / ${fmt(sum, 3)} г × 100%</div></div>${extra}`;
    if (record) markDone("rme", "RME");
  };
  panel.querySelector("#rmeCalc").addEventListener("click", () => calc(true));
  calc(false);
}

// ---------------- Молярлық масса ----------------
function mmPanel(panel) {
  panel.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Молярлық масса калькуляторы</h2>
        <p>Метрикаларды есептеуге қажетті молярлық массаларды IUPAC стандартты атомдық массалары бойынша анықтаңыз.</p>
        <div class="field"><label for="mmIn">Химиялық формула</label><input class="input" id="mmIn" value="C13H18O2" spellcheck="false" autocomplete="off"></div>
        <div class="chips">${["H2SO4", "Ca(OH)2", "C6H12O6", "CuSO4·5H2O", "C9H8O4", "C16H14O3"].map((f) => `<button class="chip" data-f="${f}">${formulaHtml(f)}</button>`).join("")}</div>
        <div id="mmOut" style="margin-top:14px"></div>
      </div>
      <div class="card">
        <h3>Есептеу принципі</h3>
        <div class="formula">M = Σ n<sub>i</sub> · A<sub>r</sub>(i)  г/моль</div>
        <p>Мысалы, ибупрофен C<sub>13</sub>H<sub>18</sub>O<sub>2</sub>: 13·12,011 + 18·1,008 + 2·15,999 = <strong>206,28 г/моль</strong>.</p>
        <p class="small muted">Жақшалар <code>Ca(OH)2</code>, тік жақшалар <code>[Cu(NH3)4]SO4</code> және гидраттар <code>CuSO4·5H2O</code> (немесе <code>CuSO4*5H2O</code>) қолдау табады.</p>
      </div>
    </div>`;
  const inp = panel.querySelector("#mmIn");
  const out = panel.querySelector("#mmOut");
  const calc = () => {
    try {
      const counts = parseFormula(inp.value);
      const M = molarMass(inp.value);
      out.innerHTML = `<div class="result-box"><div class="muted small">M(${formulaHtml(inp.value)})</div><div class="big">${fmt(M, 3)} г/моль</div></div>
        <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Элемент</th><th>Атом саны</th><th>Массалық үлес</th></tr></thead><tbody>
        ${Object.entries(counts).map(([el, n]) => `<tr><td>${el}</td><td>${n}</td><td>${fmt((n * ATOMIC_MASS[el] * 100) / M, 2)}%</td></tr>`).join("")}
        </tbody></table></div>`;
    } catch (e) {
      out.innerHTML = `<div class="result-box err">${esc(e.message)}</div>`;
    }
  };
  inp.addEventListener("input", calc);
  panel.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { inp.value = c.dataset.f; calc(); }));
  calc();
}

