// Студенттің прогресін браузерде (localStorage) сақтау.
const KEY = "greenchemai.progress.v1";

const blank = () => ({
  student: "",
  group: "",
  email: "",
  quiz: {}, // { [principleId]: { answer, correct } }
  metrics: {}, // { ae|ef|pmi|rme|mm: timestamp }
  drafts: {}, // { [caseId]: { [taskId]: value } }
  cases: {}, // { [caseId]: result }
  tests: {}, // { [testId]: { attempts: [{ at, percent, passed, correct, total, durationSec }], best } }
  testRun: {}, // { [testId]: ағымдағы талпыныс }
  lectures: {}, // { [lectureId]: оқылған уақыт }
  journey: {}, // { [0..5]: true } — AI әдістеме жолының кезеңдері
  industries: {}, // { [indId]: { answers:{}, checked:{}, submittedAt, viewedAt } }
  projects: {}, // { [projId]: { stages:{1..5}, resp2, field3, field4, rubric:{}, resp5 } }
  submissions: [], // ұйымдастырушыға жіберілген жұмыстар
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

export const TOTALS = { quiz: 12, metrics: 4, cases: 5, tests: 4 };
export const WEIGHTS = { tests: 0.3, cases: 0.5, quiz: 0.1, metrics: 0.1 };

export function progressSummary(s = state) {
  const quizDone = Object.keys(s.quiz).length;
  const quizCorrect = Object.values(s.quiz).filter((q) => q.correct).length;
  const metricsDone = ["ae", "ef", "pmi", "rme"].filter((k) => s.metrics[k]).length;
  const caseResults = Object.values(s.cases);
  const casesDone = caseResults.length;
  const caseAvg = casesDone ? caseResults.reduce((a, r) => a + r.percent, 0) / casesDone : 0;
  const testBests = Object.values(s.tests || {}).filter((t) => t.attempts?.length);
  const testsDone = testBests.length;
  const testsPassed = testBests.filter((t) => t.passed).length;
  const testsSum = testBests.reduce((a, t) => a + (t.best || 0), 0);
  const testsAvg = testsDone ? testsSum / testsDone : 0;
  const done = quizDone + metricsDone + casesDone + testsDone;
  const total = TOTALS.quiz + TOTALS.metrics + TOTALS.cases + TOTALS.tests;
  const overall = Math.round(
    (testsSum / TOTALS.tests) * WEIGHTS.tests +
      (caseResults.reduce((a, r) => a + r.percent, 0) / TOTALS.cases) * WEIGHTS.cases +
      (quizCorrect / TOTALS.quiz) * 100 * WEIGHTS.quiz +
      (metricsDone / TOTALS.metrics) * 100 * WEIGHTS.metrics
  );
  return {
    quizDone, quizCorrect, metricsDone, casesDone, caseAvg, testsDone, testsPassed, testsAvg, overall,
    done, total, percent: Math.round((done / total) * 100),
  };
}
