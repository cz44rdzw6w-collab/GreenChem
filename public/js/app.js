import { store, progressSummary } from "./store.js";
import { checkAi } from "./assistant-engine.js";
import * as home from "./views/home.js";
import * as principles from "./views/principles.js";
import * as metrics from "./views/metrics.js";
import * as cases from "./views/cases.js";
import * as assistant from "./views/assistant.js";
import * as assessment from "./views/assessment.js";

const ROUTES = {
  "": { view: home, title: "Басты бет", key: "home" },
  principles: { view: principles, title: "Жасыл химияның 12 қағидасы", key: "principles" },
  metrics: { view: metrics, title: "Жасыл химия метрикалары", key: "metrics" },
  cases: { view: cases, title: "Case Study", key: "cases" },
  assistant: { view: assistant, title: "AI көмекші", key: "assistant" },
  assessment: { view: assessment, title: "Бағалау және кері байланыс", key: "assessment" },
};

const viewEl = document.getElementById("view");
const crumb = document.getElementById("crumb");
const sidebar = document.getElementById("sidebar");
const scrim = document.getElementById("scrim");
const menuBtn = document.getElementById("menuBtn");
let cleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "", params: parts.slice(1), query: new URLSearchParams(query) };
}

function render() {
  const { name, params, query } = parseHash();
  const route = ROUTES[name] || ROUTES[""];
  if (typeof cleanup === "function") cleanup();
  cleanup = null;
  viewEl.innerHTML = "";
  const extraTitle = route.view.render(viewEl, params, query);
  crumb.textContent = extraTitle ? `${route.title} · ${extraTitle}` : route.title;
  cleanup = route.view.cleanup || null;
  document.title = `${extraTitle || route.title} — GreenChemAI`;
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route.key));
  closeMenu();
  window.scrollTo({ top: 0 });
  viewEl.focus({ preventScroll: true });
}

function renderSidebarProgress() {
  const p = progressSummary();
  document.getElementById("sidebarProgress").innerHTML = `
    <strong>Курс бойынша прогресс</strong>
    <div class="bar"><span style="width:${p.percent}%"></span></div>
    <div class="muted small">${p.done} / ${p.total} тапсырма · ${p.percent}%</div>`;
}

function openMenu() {
  sidebar.classList.add("open");
  scrim.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  sidebar.classList.remove("open");
  scrim.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}
menuBtn.addEventListener("click", () => (sidebar.classList.contains("open") ? closeMenu() : openMenu()));
scrim.addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

window.addEventListener("hashchange", render);
store.subscribe(renderSidebarProgress);
renderSidebarProgress();
render();

checkAi().then((on) => {
  const badge = document.getElementById("aiBadge");
  badge.classList.add(on ? "on" : "off");
  badge.textContent = on ? "● Claude AI қосулы" : "● Офлайн AI режимі";
  badge.title = on
    ? "AI көмекші серверде Claude моделімен жұмыс істейді"
    : "AI көмекші браузердегі білім базасы мен химиялық есептеуішпен жұмыс істейді";
});
