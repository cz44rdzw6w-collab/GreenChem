import { checkAi } from "./assistant-engine.js";
import * as home from "./views/home.js";
import * as principles from "./views/principles.js";
import * as metrics from "./views/metrics.js";
import * as cases from "./views/cases.js";
import * as assistant from "./views/assistant.js";
import * as assessment from "./views/assessment.js";
import * as lectures from "./views/lectures.js";
import * as tests from "./views/tests.js";
import { flushOutbox } from "./submit.js";

const ROUTES = {
  "": { view: home, title: "Басты бет", key: "home" },
  lectures: { view: lectures, title: "Лекциялар", key: "lectures" },
  principles: { view: principles, title: "Жасыл химияның 12 қағидасы", key: "principles" },
  metrics: { view: metrics, title: "Жасыл химия метрикалары", key: "metrics" },
  cases: { view: cases, title: "Case Study", key: "cases" },
  tests: { view: tests, title: "Тесттер", key: "tests" },
  assistant: { view: assistant, title: "AI көмекші", key: "assistant" },
  assessment: { view: assessment, title: "Бағалау және кері байланыс", key: "assessment" },
};

const viewEl = document.getElementById("view");
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
  viewEl.style.animation = "none";
  void viewEl.offsetWidth;
  viewEl.style.animation = "";
  const extraTitle = route.view.render(viewEl, params, query);
  cleanup = route.view.cleanup || null;
  document.title = `${extraTitle || route.title} — GreenChemAI`;
  document.querySelectorAll(".nav a").forEach((a) => {
    const on = a.dataset.route === route.key;
    a.classList.toggle("active", on);
    if (on) {
      a.setAttribute("aria-current", "page");
      a.scrollIntoView({ block: "nearest", inline: "nearest" });
    } else a.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0 });
  viewEl.focus({ preventScroll: true });
}

window.addEventListener("hashchange", render);
render();
flushOutbox();

checkAi().then((on) => {
  const badge = document.getElementById("aiBadge");
  badge.classList.add(on ? "on" : "off");
  badge.textContent = on ? "● Claude AI" : "● Офлайн AI";
  badge.title = on
    ? "AI көмекші серверде Claude моделімен жұмыс істейді"
    : "AI көмекші браузердегі білім базасы мен химиялық есептеуішпен жұмыс істейді";
});
