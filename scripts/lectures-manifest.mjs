// public/lectures/ қалтасындағы файлдардан lectures/index.json тізімін құрастырады.
// Мұғалім тек файлды жүктейді; қаласа, lectures.json арқылы атауын, аптасын,
// сипаттамасын көрсетеді немесе YouTube / Google Drive сілтемесін қосады.
//
//   node scripts/lectures-manifest.mjs        → public/lectures/index.json жазады
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const LECTURES_DIR = path.join(here, "..", "public", "lectures");

const TYPES = {
  pdf: "pdf", ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
  doc: "doc", docx: "doc", odt: "doc", rtf: "doc", txt: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet",
  mp4: "video", webm: "video", mov: "video", m4v: "video",
  mp3: "audio", m4a: "audio", wav: "audio", ogg: "audio",
  png: "image", jpg: "image", jpeg: "image", webp: "image", svg: "image",
  zip: "archive",
};
const SKIP = new Set(["index.json", "lectures.json", "readme.md", ".gitkeep"]);

function titleFromFile(name) {
  const base = name.replace(/\.[^.]+$/, "");
  const m = base.match(/^(\d{1,3})[\s._-]+(.*)$/);
  const text = (m ? m[2] : base).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return { order: m ? Number(m[1]) : null, title: text ? text[0].toUpperCase() + text.slice(1) : base };
}

function gitDate(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { cwd: path.dirname(file), stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return out || null;
  } catch {
    return null;
  }
}

function youtubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export async function buildManifest(dir = LECTURES_DIR) {
  let names = [];
  try {
    names = (await fs.readdir(dir, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
  } catch {
    return { generatedAt: new Date().toISOString(), items: [] };
  }

  let meta = { items: [] };
  try {
    meta = JSON.parse(await fs.readFile(path.join(dir, "lectures.json"), "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") console.warn("lectures.json оқылмады:", err.message);
  }
  const metaItems = Array.isArray(meta.items) ? meta.items : [];
  const byFile = new Map(metaItems.filter((m) => m.file).map((m) => [m.file, m]));

  const items = [];
  for (const name of names) {
    if (SKIP.has(name.toLowerCase()) || name.startsWith(".")) continue;
    const ext = name.split(".").pop().toLowerCase();
    if (!TYPES[ext]) continue;
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    const auto = titleFromFile(name);
    const m = byFile.get(name) || {};
    items.push({
      id: name,
      file: name,
      type: TYPES[ext],
      ext,
      size: stat.size,
      updated: gitDate(full) || stat.mtime.toISOString(),
      title: m.title || auto.title,
      module: m.module || "",
      description: m.description || "",
      order: m.order ?? auto.order,
    });
  }

  // Сыртқы сілтемелер (YouTube, Google Drive т.б.)
  for (const m of metaItems) {
    if (m.file || !m.url) continue;
    const yt = youtubeId(m.url);
    items.push({
      id: `url:${m.url}`,
      url: m.url,
      type: yt ? "youtube" : "link",
      youtube: yt,
      title: m.title || m.url,
      module: m.module || "",
      description: m.description || "",
      order: m.order ?? null,
      updated: m.date || null,
    });
  }

  items.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.title.localeCompare(b.title, "kk"));
  return { generatedAt: new Date().toISOString(), modules: meta.modules || null, items };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildManifest();
  await fs.mkdir(LECTURES_DIR, { recursive: true });
  await fs.writeFile(path.join(LECTURES_DIR, "index.json"), JSON.stringify(manifest, null, 2));
  console.log(`lectures/index.json: ${manifest.items.length} материал`);
}
