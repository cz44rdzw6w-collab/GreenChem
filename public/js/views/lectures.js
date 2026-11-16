// Лекциялар: мұғалім public/lectures/ қалтасына жүктеген материалдар.
import { store } from "../store.js";
import { esc } from "../ui.js";

const TYPE_INFO = {
  pdf: { icon: "📕", label: "PDF" },
  slides: { icon: "📊", label: "Презентация" },
  doc: { icon: "📄", label: "Құжат" },
  sheet: { icon: "📈", label: "Кесте" },
  video: { icon: "🎬", label: "Бейне" },
  audio: { icon: "🎧", label: "Аудио" },
  image: { icon: "🖼", label: "Сурет" },
  archive: { icon: "🗜", label: "Архив" },
  youtube: { icon: "▶️", label: "YouTube" },
  link: { icon: "🔗", label: "Сілтеме" },
};

let cache = null;

async function loadManifest() {
  if (cache) return cache;
  try {
    const res = await fetch("lectures/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    cache = await res.json();
  } catch {
    cache = { items: [] };
  }
  setTimeout(() => (cache = null), 60000);
  return cache;
}

const fileUrl = (item) => `lectures/${encodeURIComponent(item.file)}`;
const absUrl = (item) => new URL(fileUrl(item), location.href).href;
const publicHost = () => location.protocol === "https:" && !/^(localhost|127\.|\[::1\])/.test(location.hostname);

function fmtSize(b) {
  if (!b && b !== 0) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} КБ`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

function canPreview(item) {
  if (["pdf", "video", "audio", "image", "youtube"].includes(item.type)) return true;
  return ["slides", "doc", "sheet"].includes(item.type) && ["pptx", "ppt", "docx", "doc", "xlsx", "xls"].includes(item.ext) && publicHost();
}

function viewerHtml(item) {
  const src = item.file ? fileUrl(item) : "";
  switch (item.type) {
    case "pdf":
      return `<iframe class="viewer" src="${src}#view=FitH" title="${esc(item.title)}"></iframe>`;
    case "video":
      return `<video class="viewer" src="${src}" controls preload="metadata" playsinline></video>`;
    case "audio":
      return `<audio src="${src}" controls style="width:100%"></audio>`;
    case "image":
      return `<img src="${src}" alt="${esc(item.title)}" style="width:100%;border-radius:12px">`;
    case "youtube":
      return `<iframe class="viewer video" src="https://www.youtube-nocookie.com/embed/${esc(item.youtube)}" title="${esc(item.title)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    default:
      return `<iframe class="viewer" src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absUrl(item))}" title="${esc(item.title)}"></iframe>`;
  }
}

function itemHtml(item, seen) {
  const info = TYPE_INFO[item.type] || TYPE_INFO.link;
  const meta = [info.label + (item.ext ? ` · .${item.ext}` : ""), fmtSize(item.size), item.updated ? new Date(item.updated).toLocaleDateString("ru-RU") : ""].filter(Boolean).join(" · ");
  const open = item.url
    ? item.type === "youtube"
      ? `<button class="btn sm" data-preview="${esc(item.id)}">▶ Көру</button><a class="btn secondary sm" href="${esc(item.url)}" target="_blank" rel="noopener" data-seen="${esc(item.id)}">YouTube-та ашу ↗</a>`
      : `<a class="btn sm" href="${esc(item.url)}" target="_blank" rel="noopener" data-seen="${esc(item.id)}">Ашу ↗</a>`
    : `${canPreview(item) ? `<button class="btn sm" data-preview="${esc(item.id)}">👁 Қарау</button>` : ""}
       <a class="btn secondary sm" href="${fileUrl(item)}" download data-seen="${esc(item.id)}">⬇ Жүктеу</a>
       ${item.type === "pdf" ? `<a class="btn ghost sm" href="${fileUrl(item)}" target="_blank" rel="noopener" data-seen="${esc(item.id)}">Жаңа бетте ↗</a>` : ""}`;
  return `<div class="lecture" id="lec-${esc(item.id)}">
    <span class="lec-ico">${info.icon}</span>
    <div class="lec-body">
      <div class="lec-title"><strong>${esc(item.title)}</strong>${seen ? `<span class="pill">✓ Қаралды</span>` : ""}</div>
      ${item.description ? `<p class="small muted" style="margin:2px 0 0">${esc(item.description)}</p>` : ""}
      <div class="small muted">${esc(meta)}</div>
      <div class="btn-row" style="margin-top:8px">${open}</div>
      <div class="lec-viewer" data-viewer="${esc(item.id)}" hidden></div>
    </div>
  </div>`;
}

const TEACHER_HELP = `
  <details class="card teacher-help">
    <summary><strong>👩‍🏫 Мұғалімге: лекцияны қалай қосуға болады?</strong></summary>
    <ol class="qlist small" style="margin-top:10px">
      <li>GitHub-та репозиторийді ашып, <code>public/lectures</code> қалтасына өтіңіз.</li>
      <li><strong>Add file → Upload files</strong> батырмасын басып, PDF, PPTX, DOCX немесе MP4 файлын сүйреп әкеліңіз.</li>
      <li>Төменде <strong>Commit changes</strong> батырмасын басыңыз. 1–2 минуттан кейін файл осы бетте пайда болады.</li>
      <li>Файл атауының басына нөмір қойсаңыз, тізім сол ретпен көрсетіледі. Мысалы: <code>01-zhasyl-himiya-kirispe.pdf</code>.</li>
      <li>Атауды, аптаны, сипаттаманы көрсету немесе YouTube сілтемесін қосу үшін <code>public/lectures/lectures.json</code> файлын өңдеңіз.</li>
    </ol>
    <p class="small muted">Браузер арқылы жүктелетін бір файлдың көлемі 25 МБ-тан аспауы керек. Ұзақ бейнелерді YouTube-қа жүктеп, сілтемесін қосқан дұрыс.</p>
  </details>`;

export function render(el) {
  el.innerHTML = `
    <div class="section-head">
      <div>
        <div class="eyebrow">Оқу материалдары</div>
        <h1>Лекциялар</h1>
        <p>Дәріс слайдтары, конспектілер және бейнелер. Материалдарды сайтта қарауға немесе жүктеп алуға болады.</p>
      </div>
    </div>
    <div id="lecList"><div class="card muted">Жүктелуде…</div></div>
    ${TEACHER_HELP}`;

  loadManifest().then((m) => {
    const list = el.querySelector("#lecList");
    if (!list) return;
    const seen = store.get().lectures || {};
    if (!m.items.length) {
      list.innerHTML = `<div class="card"><p class="muted" style="margin:0">Әзірге лекция материалдары жүктелмеген.</p></div>`;
      return;
    }
    const groups = new Map();
    for (const it of m.items) {
      const g = it.module || "Курс материалдары";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    }
    const viewed = m.items.filter((x) => seen[x.id]).length;
    list.innerHTML = `
      <p class="small muted">Қаралған материалдар: ${viewed} / ${m.items.length}</p>
      ${[...groups].map(([g, items]) => `<div class="card"><h2>${esc(g)}</h2>${items.map((it) => itemHtml(it, seen[it.id])).join("")}</div>`).join("")}`;

    const markSeen = (id) => {
      if (store.get().lectures?.[id]) return;
      const item = m.items.find((x) => x.id === id);
      store.update((st) => (st.lectures = { ...(st.lectures || {}), [id]: Date.now() }), `Лекция қаралды: ${item?.title || id}`);
      const title = list.querySelector(`[id="lec-${CSS.escape(id)}"] .lec-title`);
      if (title && !title.querySelector(".pill")) title.insertAdjacentHTML("beforeend", `<span class="pill">✓ Қаралды</span>`);
    };

    list.addEventListener("click", (e) => {
      const pv = e.target.closest("[data-preview]");
      if (pv) {
        const id = pv.dataset.preview;
        const item = m.items.find((x) => x.id === id);
        const box = list.querySelector(`[data-viewer="${CSS.escape(id)}"]`);
        if (box.hidden) {
          box.innerHTML = viewerHtml(item);
          box.hidden = false;
          pv.textContent = "✕ Жабу";
          markSeen(id);
        } else {
          box.hidden = true;
          box.innerHTML = "";
          pv.textContent = item.type === "youtube" ? "▶ Көру" : "👁 Қарау";
        }
        return;
      }
      const s = e.target.closest("[data-seen]");
      if (s) markSeen(s.dataset.seen);
    });
  });
  return "";
}
