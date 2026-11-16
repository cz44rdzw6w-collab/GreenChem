// Студент профилі: аты-жөні, тобы, email. Жұмыс тапсыру алдында міндетті.
import { store } from "./store.js";
import { esc } from "./ui.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function profileComplete(s = store.get()) {
  return Boolean(s.student?.trim() && s.group?.trim() && (!s.email || EMAIL_RE.test(s.email)));
}

export function profileFieldsHtml(s = store.get(), prefix = "pf") {
  return `
    <div class="form-row">
      <div class="field"><label for="${prefix}-name">Аты-жөні *</label><input class="input" id="${prefix}-name" data-pf="student" autocomplete="name" placeholder="Мысалы: Әлия Серікқызы" value="${esc(s.student)}" required></div>
      <div class="field"><label for="${prefix}-group">Тобы *</label><input class="input" id="${prefix}-group" data-pf="group" placeholder="Мысалы: ХТ-21" value="${esc(s.group)}" required></div>
    </div>
    <div class="field"><label for="${prefix}-email">Email (міндетті емес)</label><input class="input" id="${prefix}-email" data-pf="email" type="email" autocomplete="email" placeholder="student@university.kz" value="${esc(s.email)}"></div>`;
}

/** Өрістердің өзгерісін store-ға жазады. */
export function bindProfileFields(root) {
  root.querySelectorAll("[data-pf]").forEach((inp) =>
    inp.addEventListener("change", () => store.update((st) => (st[inp.dataset.pf] = inp.value.trim())))
  );
}

/** Профиль толық болмаса, диалог ашып толтыруды сұрайды. Promise<boolean>. */
export function ensureProfile() {
  if (profileComplete()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML = `
      <form method="dialog" novalidate>
        <h2>👤 Студент профилі</h2>
        <p class="muted small">Нәтиже курс ұйымдастырушысына осы деректермен жіберіледі.</p>
        ${profileFieldsHtml(store.get(), "dlg")}
        <p class="bad small" id="dlg-err" hidden></p>
        <div class="btn-row">
          <button class="btn" value="ok">Сақтап, жалғастыру</button>
          <button class="btn ghost" value="cancel" formnovalidate>Болдырмау</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    const err = dlg.querySelector("#dlg-err");
    dlg.querySelector("form").addEventListener("submit", (e) => {
      if (e.submitter?.value !== "ok") return;
      const v = (k) => dlg.querySelector(`[data-pf="${k}"]`).value.trim();
      const data = { student: v("student"), group: v("group"), email: v("email") };
      const msg = !data.student ? "Аты-жөніңізді енгізіңіз." : !data.group ? "Тобыңызды енгізіңіз." : data.email && !EMAIL_RE.test(data.email) ? "Email форматы дұрыс емес." : "";
      if (msg) {
        e.preventDefault();
        err.textContent = msg;
        err.hidden = false;
        return;
      }
      store.update((st) => Object.assign(st, data));
    });
    dlg.addEventListener("close", () => {
      const ok = dlg.returnValue === "ok" && profileComplete();
      dlg.remove();
      resolve(ok);
    });
    dlg.showModal();
    dlg.querySelector("input").focus();
  });
}
