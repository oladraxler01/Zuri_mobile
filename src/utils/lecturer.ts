import type { TimetableSlot } from '@/context/academic-context';
import type { TaughtCourse } from '@/context/lecturer-context';
import type { Lecture } from '@/types/lecture';
import { classInsights } from '@/data/sample-class-insights';

/** The lecturer's teaching slots in the shared timetable shape (for countdowns, "today"). */
export function teachingTimetable(courses: TaughtCourse[]): TimetableSlot[] {
  return courses.flatMap((c) =>
    c.slots.map((s) => ({
      id: s.id,
      courseId: c.id,
      courseCode: c.code,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      venue: s.venue,
    }))
  );
}

/** Concepts from the lecturer's own processed lectures for a course. */
export function courseConcepts(courseId: string, lectures: Lecture[]): string[] {
  return Array.from(
    new Set(lectures.filter((l) => l.courseId === courseId && l.analysis).flatMap((l) => l.analysis!.concepts.map((c) => c.title)))
  );
}

/** Class insights for a taught course, using real lecture topics when available. */
export function insightsFor(course: TaughtCourse, lectures: Lecture[]) {
  const i = classInsights(course, courseConcepts(course.id, lectures));
  // Keep the sample cohort consistent with the class size the lecturer entered.
  if (course.cohortSize > 0 && course.cohortSize !== i.cohortSize) {
    const k = course.cohortSize / i.cohortSize;
    i.cohortSize = course.cohortSize;
    i.activeThisWeek = Math.round(i.activeThisWeek * k);
    i.gradeBands = i.gradeBands.map((b) => ({ ...b, count: Math.round(b.count * k) }));
    i.cohort = i.cohort.map((c) => ({ ...c, count: Math.round(c.count * k) }));
  }
  return i;
}
