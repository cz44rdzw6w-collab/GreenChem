// Курс баптаулары. Мұғалім/ұйымдастырушы осы файлды GitHub-та өңдей алады.
export const CONFIG = {
  courseName: "Жасыл химияға кіріспе",

  // Курс ұйымдастырушысы (студенттерге көрсетіледі; «Поштамен жіберу» резерві үшін де қолданылады).
  organizerName: "",
  organizerEmail: "",

  // Google Apps Script веб-қосымшасының URL-і (…/exec). Нұсқаулық: docs/teacher-guide.md
  // Бос болса, жауаптар тек студенттің браузерінде сақталады, ал студентке
  // «Поштамен жіберу» және «Файл ретінде жүктеу» батырмалары ұсынылады.
  submitUrl: "",
};

export const submissionEnabled = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(CONFIG.submitUrl);
