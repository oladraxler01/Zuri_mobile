/**
 * Sample class intelligence for a lecturer's course.
 *
 * Real numbers need students on the platform and the backend; until then
 * these are generated deterministically from the course code so a course
 * always shows the same figures. Screens label them as sample data.
 */

export interface TopicMastery {
  topic: string;
  /** % of students who answered questions on this topic correctly */
  mastery: number;
}

export interface Misconception {
  topic: string;
  statement: string;
  /** % of students showing it */
  share: number;
}

export interface ClassInsights {
  cohortSize: number;
  activeThisWeek: number;
  /** % of enrolled students engaging each week, oldest first (8 weeks) */
  weeklyEngagement: number[];
  avgMastery: number;
  topics: TopicMastery[];
  misconceptions: Misconception[];
  faqs: { question: string; count: number }[];
  /** latest assessment: how many students in each grade band */
  gradeBands: { band: string; count: number }[];
  /** cohort split by how they're doing */
  cohort: { label: string; count: number; status: 'good' | 'warning' | 'critical' }[];
  trend: string;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const DEFAULT_TOPICS: Record<string, string[]> = {
  CSC: ['Recursion', 'Memoization', 'Tabulation', 'Big-O analysis', 'Linked lists', 'Optimal substructure'],
  MTH: ['Matrices', 'Determinants', 'Eigenvalues', 'Vector spaces', 'Linear maps'],
  GET: ['Differential equations', 'Laplace transforms', 'Series', 'Complex numbers'],
};

export function classInsights(course: { code: string }, conceptTitles: string[] = []): ClassInsights {
  const rand = seeded(course.code);
  const prefix = course.code.split(' ')[0];
  const topics = (conceptTitles.length ? conceptTitles : DEFAULT_TOPICS[prefix] ?? DEFAULT_TOPICS.CSC).slice(0, 6);
  const cohortSize = 60 + Math.round(rand() * 140);

  let e = 55 + rand() * 20;
  const weeklyEngagement = Array.from({ length: 8 }, () => {
    e = Math.max(35, Math.min(95, e + (rand() - 0.42) * 12));
    return Math.round(e);
  });

  const topicMastery = topics
    .map((topic) => ({ topic, mastery: Math.round(38 + rand() * 55) }))
    .sort((a, b) => a.mastery - b.mastery);
  const avgMastery = Math.round(topicMastery.reduce((s, t) => s + t.mastery, 0) / topicMastery.length);
  const weak = topicMastery.slice(0, 3);

  const misconceptions: Misconception[] = weak.map((t, i) => ({
    topic: t.topic,
    statement: [
      `Treat ${t.topic.toLowerCase()} as the same thing as a related idea from earlier in the course`,
      `Apply ${t.topic.toLowerCase()} without checking the conditions it needs`,
      `Confuse the order of steps when working through ${t.topic.toLowerCase()}`,
    ][i % 3],
    share: Math.round(18 + rand() * 30),
  }));

  const faqs = [
    { question: `When should I use ${topics[0]?.toLowerCase() ?? 'this method'}?`, count: 8 + Math.round(rand() * 25) },
    { question: `Can you go over ${weak[0]?.topic.toLowerCase() ?? 'the last topic'} with another example?`, count: 6 + Math.round(rand() * 20) },
    { question: 'Will this be in the test?', count: 5 + Math.round(rand() * 18) },
    { question: `How is ${topics[1]?.toLowerCase() ?? 'this'} different from ${topics[2]?.toLowerCase() ?? 'that'}?`, count: 4 + Math.round(rand() * 14) },
  ].sort((a, b) => b.count - a.count);

  const weights = [0.14, 0.24, 0.27, 0.18, 0.1, 0.07].map((w) => w * (0.8 + rand() * 0.4));
  const total = weights.reduce((s, w) => s + w, 0);
  const gradeBands = ['A', 'B', 'C', 'D', 'E', 'F'].map((band, i) => ({
    band,
    count: Math.round((weights[i] / total) * cohortSize),
  }));

  const atRisk = Math.round(cohortSize * (0.08 + rand() * 0.1));
  const watch = Math.round(cohortSize * (0.15 + rand() * 0.12));
  const cohort = [
    { label: 'On track', count: cohortSize - atRisk - watch, status: 'good' as const },
    { label: 'Needs a nudge', count: watch, status: 'warning' as const },
    { label: 'At risk', count: atRisk, status: 'critical' as const },
  ];

  const last = weeklyEngagement[7];
  const prev = weeklyEngagement[6];
  const trend =
    last >= prev
      ? `Engagement is up ${last - prev} points this week. ${weak[0]?.topic ?? 'One topic'} is still the weakest area.`
      : `Engagement dropped ${prev - last} points this week, mostly after the ${weak[0]?.topic ?? 'latest'} lecture.`;

  return {
    cohortSize,
    activeThisWeek: Math.round((last / 100) * cohortSize),
    weeklyEngagement,
    avgMastery,
    topics: topicMastery,
    misconceptions,
    faqs,
    gradeBands,
    cohort,
    trend,
  };
}

/**
 * Sample class response to one lecture (lecturer view): how the class did
 * on each of the lecture's quiz questions and which misconceptions showed
 * up per concept. Deterministic per lecture so it doesn't change on reload.
 */
export function lectureResponse(
  lecture: { id: string; analysis?: { concepts: { title: string }[]; questions: { id: string; question: string; options: string[]; correctIndex: number }[] } },
  cohortSize: number
) {
  const rand = seeded(lecture.id);
  const responded = Math.round(cohortSize * (0.45 + rand() * 0.4));
  const questions = (lecture.analysis?.questions ?? []).map((q) => {
    const correct = Math.round(35 + rand() * 55);
    // the most common wrong option
    const wrongOptions = q.options.map((o, i) => ({ o, i })).filter((x) => x.i !== q.correctIndex);
    const commonWrong = wrongOptions[Math.floor(rand() * wrongOptions.length)]?.o;
    return { id: q.id, question: q.question, correct, commonWrong, commonWrongShare: Math.round((100 - correct) * (0.4 + rand() * 0.4)) };
  });
  const misconceptions = (lecture.analysis?.concepts ?? [])
    .map((c) => ({ concept: c.title, share: Math.round(10 + rand() * 40) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 3)
    .map((m, i) => ({
      ...m,
      statement: [
        `confuse ${m.concept.toLowerCase()} with a closely related idea from the same lecture`,
        `can state ${m.concept.toLowerCase()} but can’t apply it to a new example`,
        `apply ${m.concept.toLowerCase()} without checking when it holds`,
      ][i % 3],
    }));
  return { responded, questions, misconceptions };
}
