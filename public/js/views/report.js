import { levelFor, LEVELS } from "../data/cases.js";
import { esc, ring, bar } from "../ui.js";
import { renderMarkdown } from "../assistant-engine.js";

export function resultHtml(result, caseDef, { compact = false } = {}) {
  const lvl = levelFor(result.percent);
  return `
    <div class="score-head">
      ${ring(result.percent, "Кейс нәтижесі")}
      <div>
        <div class="eyebrow">${caseDef.stage}-модуль · ${esc(caseDef.stageName)}</div>
        <h3 style="margin:0">${esc(caseDef.title)}</h3>
        <p style="margin:4px 0 0"><strong class="${lvl.cls}">${lvl.name}</strong> · ${result.points} / ${result.maxPoints} балл</p>
        <p class="small muted" style="margin:2px 0 0">${lvl.text}</p>
      </div>
    </div>
    <div style="margin-top:16px">
      ${result.criteria
        .map((c) => {
          const l = levelFor(c.percent);
          return `<div class="crit-row"><div class="row-lbl"><span>${esc(c.name)} <span class="muted small">(${c.weight}%)</span></span><span class="${l.cls}"><strong>${c.percent}%</strong> · ${l.name}</span></div>${bar(c.percent, c.percent < 50 ? "pink" : "")}</div>`;
        })
        .join("")}
    </div>
    ${
      compact
        ? ""
        : `<div class="fb-cols">
      <div class="fb strong"><h4>💪 Күшті жақтары</h4><ul>${(result.strengths.length ? result.strengths : ["Әзірге айқын күшті жақ анықталмады — бағыттаушы кеңестерді пайдаланыңыз."]).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      <div class="fb improve"><h4>🎯 Жетілдіру бағыттары</h4><ul>${(result.improvements.length ? result.improvements : ["Барлық критерий бойынша жоғары нәтиже. Жарайсыз!"]).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
    </div>`
    }
    ${result.aiReview ? `<div class="ai-review"><h4>🤖 AI бағалаушының пікірі</h4>${renderMarkdown(result.aiReview)}</div>` : ""}`;
}

export function levelsLegend() {
  return `<div class="table-wrap"><table><thead><tr><th>Деңгей</th><th>Балл</th><th>Сипаттама</th></tr></thead><tbody>
    ${LEVELS.map((l, i) => `<tr><td class="${l.cls}"><strong>${l.name}</strong></td><td>${l.min}–${i === 0 ? 100 : LEVELS[i - 1].min - 1}%</td><td>${l.text}</td></tr>`).join("")}
  </tbody></table></div>`;
}
