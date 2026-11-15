// AI көмекші: сервердегі Claude (бар болса) немесе офлайн білім базасы + химиялық есептеуіш.
import { KNOWLEDGE } from "./data/knowledge.js";
import { parseEquation, molarMass, fmt } from "./chem.js";

let aiStatus = null; // null — тексерілмеген, true/false

export async function checkAi() {
  if (aiStatus !== null) return aiStatus;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch("./api/health", { signal: ctrl.signal });
    clearTimeout(timer);
    const j = r.ok ? await r.json() : null;
    aiStatus = Boolean(j && j.ai);
  } catch {
    aiStatus = false;
  }
  return aiStatus;
}

export async function ask(history, mode = "explain", context = "") {
  const last = history[history.length - 1]?.content || "";
  // Есептеулерді әрқашан дәл (детерминистік) жергілікті модуль орындайды.
  const calc = calculatorReply(last);
  if (calc) return { text: calc, source: "calc" };

  if (await checkAi()) {
    try {
      const r = await fetch("./api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode, context }),
      });
      const j = await r.json();
      if (r.ok && j.reply) return { text: j.reply, source: "ai" };
      if (j.offline) aiStatus = false;
    } catch {
      /* офлайн режимге ауысамыз */
    }
  }
  return { text: localReply(last, mode), source: "local" };
}

export async function aiEvaluate(payload) {
  if (!(await checkAi())) return null;
  try {
    const r = await fetch("./api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    return r.ok ? j.reply : null;
  } catch {
    return null;
  }
}

// ---------------- Есептеуіш ----------------
function calculatorReply(text) {
  if (/->|→|⟶|=>/.test(text)) {
    const eqText = (text.match(/[A-Za-z0-9()[\]·.+\s]*(?:->|→|⟶|=>)[A-Za-z0-9()[\]·.+\s]*/) || [text])[0];
    try {
      const eq = parseEquation(eqText.trim());
      const sumR = eq.reactants.reduce((a, r) => a + r.total, 0);
      const target = eq.products[0];
      const ae = (target.total / sumR) * 100;
      const rows = [...eq.reactants.map((s) => ["реагент", s]), ...eq.products.map((s) => ["өнім", s])]
        .map(([role, s]) => `- ${role}: ${s.coef !== 1 ? s.coef + " × " : ""}${s.formula} — M = ${fmt(s.M, 2)} г/моль${s.coef !== 1 ? ` (ν·M = ${fmt(s.total, 2)})` : ""}`)
        .join("\n");
      const bal = eq.balance.balanced
        ? "✅ Теңдеу теңестірілген."
        : `⚠️ Теңдеу теңестірілмеген: ${eq.balance.diff.map((d) => `${d.el} (сол жақта ${d.left}, оң жақта ${d.right})`).join(", ")}. Нәтиже дұрыс болуы үшін алдымен коэффициенттерді қойыңыз.`;
      return (
        `**Теңдеу талдауы**\n${rows}\n\n${bal}\n\n` +
        `**Атомдық үнемділік** (мақсатты өнім — ${target.formula}):\nAE = ${fmt(target.total, 2)} / ${fmt(sumR, 2)} × 100% = **${fmt(ae, 1)}%**\n\n` +
        (eq.products.length > 1
          ? `Жанама өнім(дер): ${eq.products.slice(1).map((p) => p.formula).join(", ")} — реагент массасының ${fmt(100 - ae, 1)}%-ы осыларға кетеді. Оларды пайдалы өнім ретінде қолдануға бола ма?`
          : "Барлық реагент атомдары бір өнімге енеді — бұл қосылу реакциясына тән идеал жағдай.")
      );
    } catch (e) {
      return `Теңдеуді талдау мүмкін болмады: ${e.message}. Үлгі: \`C2H4 + H2O -> C2H5OH\` (элемент белгілерін бас әріппен жазыңыз).`;
    }
  }
  if (/молярлық масса|мольдік масса|молекулалық масса|molar mass|\bM\s*\(/i.test(text)) {
    const tokens = text.match(/[A-Z][A-Za-z0-9()[\]·]*/g) || [];
    const results = [];
    for (const t of tokens) {
      try {
        if (!/\d|[A-Z].*[A-Z]/.test(t)) continue;
        results.push(`- M(${t}) = **${fmt(molarMass(t), 3)} г/моль**`);
      } catch {
        /* формула емес */
      }
    }
    if (results.length) return `**Молярлық масса** (IUPAC атомдық массалары бойынша):\n${results.join("\n")}`;
  }
  return null;
}

// ---------------- Офлайн жауаптар ----------------
const low = (s) => s.toLowerCase();

function findEntry(text) {
  const t = low(text);
  let best = null;
  let bestScore = 0;
  for (const e of KNOWLEDGE) {
    let score = 0;
    for (const k of e.keys) if (t.includes(low(k))) score += k.length * (e.weight || 1);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

function localReply(text, mode) {
  if (mode === "feedback") return feedbackReply(text);
  const entry = findEntry(text);
  if (!entry) {
    return (
      "Бұл сұраққа офлайн білім базасында дайын жауап табылмады. Келесі тақырыптар бойынша сұраңыз:\n" +
      "- жасыл химия анықтамасы және 12 қағида\n- атомдық үнемділік, E-фактор, PMI, RME, шығым\n- катализ, еріткіштер, жаңартылатын шикізат, LCA\n- кейстер: сынап (Нұра), ибупрофен, адипин қышқылы, аспирин, поликарбонат\n\n" +
      "Сондай-ақ теңдеу жазсаңыз (`C2H4 + H2O -> C2H5OH`), атомдық үнемділікті есептеймін, ал «H2SO4 молярлық массасы» деп жазсаңыз — молярлық массаны."
    );
  }
  if (mode === "hint") {
    return `💡 **Кеңес: ${entry.title}**\n\n${entry.hint}\n\nТолық түсіндірме қажет болса, «Түсіндірме» режиміне ауысыңыз.`;
  }
  return `**${entry.title}**\n\n${entry.answer}`;
}

function feedbackReply(text) {
  const words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  const t = low(text);
  const strengths = [];
  const improve = [];
  if (words < 25) improve.push(`Жауап қысқа (${words} сөз). Дәлелдер мен мысалдар қосып, кемінде 40–60 сөзге дейін кеңейтіңіз.`);
  else strengths.push(`Жауап жеткілікті көлемде (${words} сөз).`);

  const principles = ["қағида", "алдын алу", "атомдық үнемділік", "катализ", "еріткіш", "жаңартылатын", "қауіпсіз", "энергия", "ыдырау"];
  const pHits = principles.filter((p) => t.includes(p));
  if (pHits.length >= 2) strengths.push(`Жасыл химия ұғымдары қолданылған: ${pHits.join(", ")}.`);
  else improve.push("Жауапты нақты жасыл химия қағидаларымен байланыстырыңыз (мысалы, «9-қағида — катализ»).");

  const metrics = ["e-фактор", "е-фактор", "pmi", "rme", "атомдық үнемділік", "ae", "шығым", "%"];
  if (metrics.some((m) => t.includes(m)) || /\d/.test(t)) strengths.push("Сандық көрсеткіштер немесе метрикалар келтірілген.");
  else improve.push("Тұжырымды сандық метрикамен (AE, E-фактор, PMI немесе RME) дәлелдеңіз.");

  if (/себебі|өйткені|сондықтан|нәтижесінде|себептен|салдарынан/.test(t)) strengths.push("Себеп-салдар байланысы көрсетілген.");
  else improve.push("Себеп-салдар байланысын айқын көрсетіңіз («себебі…», «сондықтан…»).");

  if (/[A-Z][a-z]?\d/.test(text) || /[₀-₉]/.test(text)) strengths.push("Химиялық формулалар қолданылған.");
  else improve.push("Тиісті химиялық формулаларды немесе реакция теңдеуін келтіріңіз.");

  if (/балама|орнына|ұсын|алмастыр/.test(t)) strengths.push("Баламалы шешім ұсынылған.");
  else improve.push("Мәселені шешетін нақты баламаны ұсыныңыз.");

  const entry = findEntry(text);
  return (
    `**Кері байланыс (офлайн рубрикалық талдау)**\n\n**Күшті жақтары:**\n${strengths.map((s) => "- " + s).join("\n") || "- Әзірге анықталмады."}\n\n` +
    `**Жетілдіру қажет:**\n${improve.map((s) => "- " + s).join("\n") || "- Айтарлықтай кемшілік табылмады — тамаша!"}` +
    (entry ? `\n\n**Тақырып бойынша еске сала кетейік — ${entry.title}:** ${entry.hint}` : "")
  );
}

// ---------------- Қарапайым markdown ----------------
export function renderMarkdown(src) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  const lines = String(src).split("\n");
  let html = "";
  let list = null;
  const close = () => {
    if (list) html += `</${list}>`;
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^\s*[-•*]\s+(.*)/))) {
      if (list !== "ul") { close(); html += "<ul>"; list = "ul"; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      if (list !== "ol") { close(); html += "<ol>"; list = "ol"; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^#{1,4}\s+(.*)/))) {
      close();
      html += `<h4>${inline(m[1])}</h4>`;
    } else if (!line.trim()) {
      close();
    } else {
      close();
      html += `<p>${inline(line)}</p>`;
    }
  }
  close();
  return html;
}
