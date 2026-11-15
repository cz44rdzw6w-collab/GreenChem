// Ортақ UI көмекшілері
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

export function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "жаңа ғана";
  if (s < 3600) return `${Math.round(s / 60)} мин бұрын`;
  if (s < 86400) return `${Math.round(s / 3600)} сағ бұрын`;
  return new Date(t).toLocaleDateString("kk-KZ");
}

export function ring(percent, label = "") {
  return `<div class="ring" style="--p:${percent}" role="img" aria-label="${esc(label)} ${percent}%"><div>${percent}%</div></div>`;
}

export function bar(percent, cls = "") {
  return `<div class="bar ${cls}"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div>`;
}
