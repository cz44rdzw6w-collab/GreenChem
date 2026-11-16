// GreenChemAI — статикалық файлдар сервері + Claude AI көмекшісіне арналған API.
// ANTHROPIC_API_KEY орнатылмаса, платформа толық жұмыс істейді, ал AI көмекші
// браузердегі офлайн білім базасы режиміне ауысады.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { buildManifest } from "./scripts/lectures-manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.GREENCHEM_MODEL || "claude-opus-5-5";

const aiConfigured = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
);
let client = null;
if (aiConfigured) {
  try {
    client = new Anthropic();
  } catch (err) {
    console.warn("Anthropic клиентін іске қосу мүмкін болмады:", err.message);
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const SYSTEM_PROMPT = `Сен — GreenChemAI платформасындағы «Жасыл химияға кіріспе» университеттік курсының AI көмекшісісің.
Әрқашан қазақ тілінде, ғылыми дәл химиялық терминологиямен жауап бер (қажет болса, терминнің ағылшынша баламасын жақша ішінде көрсет).
Пәндік аясы: жасыл химияның 12 қағидасы (Анастас пен Уорнер, 1998), атомдық үнемділік, E-фактор, PMI, реакция массасының тиімділігі (RME), катализ, еріткіштерді таңдау, өмірлік цикл бағалауы, Case Study талдауы.
Формулаларды нақты жаз: AE = M(өнім)/ΣM(реагенттер)·100%; E = m(қалдық)/m(өнім); PMI = Σm(кіріс)/m(өнім) = E + 1; RME = m(өнім)/Σm(реагенттер)·100%.
Жауапты қысқа әрі құрылымды бер (тақырыпшалар, тізімдер, есептеу қадамдары). Есептеулерде молярлық массаларды көрсет.
Сенімсіз болсаң, мұны ашық айт; деректерді ойдан шығарма.
Режимдер:
- "explain": түсінікті түсіндірме және нақты мысал бер.
- "hint": дайын жауапты берме; студентті жауапқа жетелейтін 2–3 бағыттаушы кеңес не сұрақ қой (Сократ әдісі).
- "feedback": студенттің жауабын бағала: күшті жақтары, жетілдіретін тұстары, ғылыми қателер және нақты ұсыныстар.`;

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("Сұраныс тым үлкен");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

async function askClaude(system, messages) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages,
    output_config: { effort: "low" },
    // Қауіпсіздік классификаторы бас тартса, сервер жағындағы резервтік модельге ауысады.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") {
    return "Кешіріңіз, бұл сұраққа жауап бере алмаймын. Сұрақты жасыл химия тақырыбы аясында қайта тұжырымдап көріңіз.";
  }
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "Жауап бос болды. Сұрақты қайталап көріңіз.";
}

function apiErrorMessage(err) {
  if (err instanceof Anthropic.RateLimitError)
    return [429, "AI сервисі уақытша бос емес. Бірнеше секундтан кейін қайталаңыз."];
  if (err instanceof Anthropic.AuthenticationError)
    return [503, "AI кілті жарамсыз. Әкімшіге хабарласыңыз."];
  if (err instanceof Anthropic.APIConnectionError)
    return [503, "AI сервисіне қосылу мүмкін болмады."];
  if (err instanceof Anthropic.APIError)
    return [502, "AI сервисінде қате орын алды."];
  return [500, "Сервер қатесі."];
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, ai: Boolean(client), model: client ? MODEL : null });
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "Әдіс рұқсат етілмеген" });
  if (!client) return sendJson(res, 503, { error: "AI режимі қосылмаған", offline: true });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "Жарамсыз JSON" });
  }

  try {
    if (pathname === "/api/chat") {
      const mode = ["explain", "hint", "feedback"].includes(body.mode) ? body.mode : "explain";
      const messages = sanitizeMessages(body.messages);
      if (!messages.length) return sendJson(res, 400, { error: "Хабарлама бос" });
      const context = typeof body.context === "string" ? body.context.slice(0, 2000) : "";
      const system = `${SYSTEM_PROMPT}\n\nАғымдағы режим: "${mode}".${context ? `\nСтуденттің қазіргі тапсырмасы: ${context}` : ""}`;
      const reply = await askClaude(system, messages);
      return sendJson(res, 200, { reply });
    }

    if (pathname === "/api/evaluate") {
      const { caseTitle, criteria, answers } = body;
      if (!Array.isArray(answers) || !answers.length)
        return sendJson(res, 400, { error: "Жауаптар жоқ" });
      const prompt = [
        `Кейс: ${String(caseTitle || "").slice(0, 300)}`,
        `Бағалау критерийлері:\n${(Array.isArray(criteria) ? criteria : [])
          .slice(0, 8)
          .map((c) => `- ${String(c.name).slice(0, 120)}: ${String(c.description).slice(0, 400)}`)
          .join("\n")}`,
        `Студент жауаптары:\n${answers
          .slice(0, 12)
          .map((a, i) => `${i + 1}) Сұрақ: ${String(a.question).slice(0, 500)}\nЖауап: ${String(a.answer).slice(0, 3000)}`)
          .join("\n\n")}`,
        `Әр критерий бойынша 0–100 балл қой, қысқа негіздеме бер, содан кейін «Күшті жақтары», «Жетілдіру қажет» және «Келесі қадам» бөлімдерін жаз.`,
      ].join("\n\n");
      const reply = await askClaude(
        `${SYSTEM_PROMPT}\n\nАғымдағы режим: "feedback". Сен рубрика бойынша әділ, нақты және жігерлендіретін бағалаушысың.`,
        [{ role: "user", content: prompt }]
      );
      return sendJson(res, 200, { reply });
    }
  } catch (err) {
    console.error("AI қатесі:", err?.status ?? "", err?.message);
    const [status, message] = apiErrorMessage(err);
    return sendJson(res, status, { error: message });
  }

  return sendJson(res, 404, { error: "Табылмады" });
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
    });
    res.end(data);
  } catch {
    const index = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(index);
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname.startsWith("/api/")) return handleApi(req, res, pathname);
  if (pathname === "/lectures/index.json") {
    // Жергілікті серверде тізім әр сұраныста қалтадан жаңадан құрастырылады.
    return sendJson(res, 200, await buildManifest());
  }
  return serveStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log(`GreenChemAI іске қосылды: http://localhost:${PORT}`);
  console.log(client ? `AI режимі: қосулы (${MODEL})` : "AI режимі: офлайн білім базасы (ANTHROPIC_API_KEY орнатылмаған)");
});
