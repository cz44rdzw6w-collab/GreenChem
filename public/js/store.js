// Студенттің прогресін браузерде (localStorage) сақтау.
const KEY = "greenchemai.progress.v1";

const blank = () => ({
  student: "",
  quiz: {}, // { [principleId]: { answer, correct } }
  metrics: {}, // { ae|ef|pmi|rme|mm: timestamp }
  drafts: {}, // { [caseId]: { [taskId]: value } }
  cases: {}, // { [caseId]: result }
  assistant: { questions: 0 },
  activity: [], // [{ t, text }]
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    return blank();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* жеке режимде сақтау мүмкін болмауы мүмкін */
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  update(mutator, activityText) {
    mutator(state);
    if (activityText) {
      state.activity.unshift({ t: Date.now(), text: activityText });
      state.activity = state.activity.slice(0, 30);
    }
    save();
  },
  reset() {
    state = blank();
    save();
  },
  exportJson() {
    return JSON.stringify(state, null, 2);
  },
};

export const TOTALS = { quiz: 12, metrics: 4, cases: 5 };

export function progressSummary(s = state) {
  const quizDone = Object.keys(s.quiz).length;
  const quizCorrect = Object.values(s.quiz).filter((q) => q.correct).length;
  const metricsDone = ["ae", "ef", "pmi", "rme"].filter((k) => s.metrics[k]).length;
  const caseResults = Object.values(s.cases);
  const casesDone = caseResults.length;
  const caseAvg = casesDone ? caseResults.reduce((a, r) => a + r.percent, 0) / casesDone : 0;
  const done = quizDone + metricsDone + casesDone;
  const total = TOTALS.quiz + TOTALS.metrics + TOTALS.cases;
  return {
    quizDone, quizCorrect, metricsDone, casesDone, caseAvg,
    done, total, percent: Math.round((done / total) * 100),
  };
}
