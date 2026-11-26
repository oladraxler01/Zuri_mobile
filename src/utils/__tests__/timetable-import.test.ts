import { findClashes, normaliseCode, parseTimetableText } from '../timetable-import';
import type { TimetableSlot } from '@/context/academic-context';

const courses = [{ code: 'CSC 201' }, { code: 'MTH201' }];

describe('normaliseCode', () => {
  it.each([
    ['csc201', 'CSC 201'],
    ['CSC 201', 'CSC 201'],
    ['csc-201', 'CSC 201'],
    ['GST 111', 'GST 111'],
  ])('%s → %s', (raw, code) => {
    expect(normaliseCode(raw)).toBe(code);
  });
});

describe('parseTimetableText', () => {
  it('reads CSV lines with 12-hour times', () => {
    const r = parseTimetableText('CSC 201, Mon, 09:00 AM, 11:00 AM, Faculty Lab 2', courses);
    expect(r.slots).toEqual([
      { courseCode: 'CSC 201', day: 'Mon', startTime: '09:00 AM', endTime: '11:00 AM', venue: 'Faculty Lab 2' },
    ]);
    expect(r.unknownCodes).toEqual([]);
    expect(r.skipped).toEqual([]);
  });

  it('reads free-form lines in any order', () => {
    const r = parseTimetableText('Monday 9-11 CSC201 LT B', courses);
    expect(r.slots[0]).toMatchObject({ courseCode: 'CSC 201', day: 'Mon', startTime: '09:00 AM', endTime: '11:00 AM', venue: 'LT B' });
  });

  it('reads semicolon-separated lines with 24-hour times', () => {
    const r = parseTimetableText('Wed;10:00;12:00;MTH 201;Auditorium 1', courses);
    expect(r.slots[0]).toMatchObject({ courseCode: 'MTH 201', day: 'Wed', startTime: '10:00 AM', endTime: '12:00 PM', venue: 'Auditorium 1' });
  });

  it('treats bare 1–6 o’clock as afternoon', () => {
    const r = parseTimetableText('Thu 2-4 CSC 201', courses);
    expect(r.slots[0]).toMatchObject({ startTime: '02:00 PM', endTime: '04:00 PM', venue: 'Venue not given' });
  });

  it('respects explicit am/pm', () => {
    const r = parseTimetableText('Fri 4pm-6pm CSC 201 Hall A', courses);
    expect(r.slots[0]).toMatchObject({ startTime: '04:00 PM', endTime: '06:00 PM' });
  });

  it('lists course codes the student doesn’t have yet', () => {
    const r = parseTimetableText('PHY 101, Tue, 08:00, 10:00, Physics Lab', courses);
    expect(r.unknownCodes).toEqual(['PHY 101']);
    expect(r.slots).toHaveLength(1);
  });

  it('skips headers and blank lines silently, and explains half-matches', () => {
    const r = parseTimetableText(
      ['Course, Day, Start, End, Venue', '', 'CSC 201, 09:00, 11:00', 'Monday 9-11 Hall', 'MTH 201 Tue no times'].join('\n'),
      courses,
    );
    expect(r.slots).toEqual([]);
    expect(r.skipped.map((s) => s.reason)).toEqual([
      'No day found',
      'No course code found',
      'Couldn’t find a start and end time',
    ]);
  });

  it('handles Windows line endings', () => {
    const r = parseTimetableText('CSC 201, Mon, 09:00, 11:00, A\r\nMTH 201, Tue, 10:00, 12:00, B\r\n', courses);
    expect(r.slots.map((s) => s.day)).toEqual(['Mon', 'Tue']);
  });
});

describe('findClashes', () => {
  const slot = (id: string, day: TimetableSlot['day'], startTime: string, endTime: string): TimetableSlot => ({
    id,
    courseId: id,
    courseCode: id,
    day,
    startTime,
    endTime,
    venue: '',
  });

  it('finds overlapping classes on the same day', () => {
    const a = slot('a', 'Mon', '09:00 AM', '11:00 AM');
    const b = slot('b', 'Mon', '10:00 AM', '12:00 PM');
    expect(findClashes([a, b])).toEqual([[a, b]]);
  });

  it('ignores back-to-back classes and other days', () => {
    const a = slot('a', 'Mon', '09:00 AM', '11:00 AM');
    const b = slot('b', 'Mon', '11:00 AM', '01:00 PM');
    const c = slot('c', 'Tue', '09:00 AM', '11:00 AM');
    expect(findClashes([a, b, c])).toEqual([]);
  });

  it('handles 12 PM and 12 AM correctly', () => {
    const noon = slot('a', 'Wed', '12:00 PM', '02:00 PM');
    const morning = slot('b', 'Wed', '10:00 AM', '12:30 PM');
    expect(findClashes([noon, morning])).toHaveLength(1);
  });
});

describe('keepStudentsClasses', () => {
  const { parseTimetableText, keepStudentsClasses } = require('../timetable-import');
  const dept = [
    'CSC 101, Monday, 08:00 AM, 10:00 AM, LT 1',
    'MTH 101, Tuesday, 10:00 AM, 12:00 PM, LT 2',
    'CSC 201, Monday, 12:00 PM, 02:00 PM, Lab 1',
    'CSC 301, Friday, 02:00 PM, 04:00 PM, Lab 2',
    'GST 205, Sunday, 04:00 PM, 06:00 PM, Hall',
  ].join('\n');

  it('keeps only the student’s level from a department timetable', () => {
    const out = keepStudentsClasses(parseTimetableText(dept, []), '100L', []);
    expect(out.slots.map((s: any) => s.courseCode).sort()).toEqual(['CSC 101', 'MTH 101']);
  });

  it('also keeps courses the student already has', () => {
    const out = keepStudentsClasses(parseTimetableText(dept, []), '100L', [{ code: 'GST 205' }]);
    expect(out.slots.find((s: any) => s.courseCode === 'GST 205')?.day).toBe('Sun');
  });

  it('keeps everything in a personal timetable', () => {
    const mine = 'CSC 201, Mon, 9:00 AM, 11:00 AM, LT\nMTH 201, Wed, 9:00 AM, 11:00 AM, LT';
    expect(keepStudentsClasses(parseTimetableText(mine, []), '100L', []).slots).toHaveLength(2);
  });
});
