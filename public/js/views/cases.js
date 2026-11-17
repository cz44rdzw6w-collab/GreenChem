// Кейс-стади: А — Қазақстан өндірістері, Б — жобалық кейстер.
import * as projects from "./projects.js";
import { cardsHtml as industryCards } from "./industries.js";

export function render(el, params) {
  const pr = projects.projectById(params[0]);
  if (pr) {
    projects.render(el, pr);
    return pr.title;
  }
  if (params[0]) history.replaceState(null, "", "#/cases");
  el.innerHTML = `
    <div class="center-head" style="margin-top:6px">
      <span class="kicker">Кейс-стади әдістемесі</span>
      <h1>Шынайы өндірістік мәселелер</h1>
      <p><strong>Қазақстан өндірістері</strong> — 15 отандық кәсіпорын бойынша жеке зерттеу кейстері; <strong>жобалық кейстер</strong> AI-мен бірлесіп шешіледі. Жауаптар оқытушыға тапсырылып, ол бағалайды.</p>
    </div>
    <h2>А. Қазақстан өндірістері <span class="pill">15 жеке зерттеу кейсі</span></h2>
    <p class="muted small">Әр өндірістің ақпараттық беті мен жауап өрістері бар кейс тапсырмалары.</p>
    <div class="grid grid-3">${industryCards()}</div>
    <h2 style="margin-top:30px">Б. Жобалық кейстер <span class="pill pink">AI + оқытушы бағасы</span></h2>
    <p class="muted small">Әр кейс 5 кезеңнен тұрады: мәселе → AI-дан кеңес → ғылыми тексеру → өз шешімің → рубрика бойынша бағалау.</p>
    <div class="grid grid-2">${projects.listHtml()}</div>`;
  return "";
}
