import {
  clock12,
  dayFromNumber,
  dayToNumber,
  isStudentsRow,
  parseClockTime,
  rowFromServer,
  rowProblem,
  rowToConfirm,
  type ReviewRow,
} from '@/utils/timetable-review';
import { importMimeType } from '@/services/timetable-import-api';

const base: ReviewRow = {
  key: 'k',
  code: 'CSC 301',
  title: 'Data Structures',
  day: 'Mon',
  start: '08:00',
  end: '10:00',
  venue: 'LT 1',
  match: { kind: 'enrolled', course_id: 'course_csc301', code: 'CSC 301' },
  warnings: [],
};

describe('parseClockTime', () => {
  it.each([
    ['08:00', '08:00'],
    ['14:00', '14:00'],
    ['8', '08:00'],
    ['2', '14:00'],
    ['2:30', '14:30'],
    ['02:00', '02:00'],
    ['2pm', '14:00'],
    ['8.30am', '08:30'],
    ['12:00 PM', '12:00'],
    ['12:00 AM', '00:00'],
    ['09:00:00', '09:00'],
  ])('%s → %s', (input, out) => expect(parseClockTime(input)).toBe(out));

  it.each(['', 'noon', '25:00', '13pm', '9:75'])('rejects %s', (input) => expect(parseClockTime(input)).toBeNull());
});

it('formats 12-hour times', () => {
  expect(clock12('14:05')).toBe('02:05 PM');
  expect(clock12('00:30')).toBe('12:30 AM');
});

it('maps days both ways, Sunday as 0', () => {
  expect(dayFromNumber(1)).toBe('Mon');
  expect(dayFromNumber(0)).toBe('Sun');
  expect(dayFromNumber(7)).toBe('Sun');
  expect(dayToNumber('Sat')).toBe(6);
  expect(dayToNumber('Sun')).toBe(0);
});

it('reads a server row', () => {
  const row = rowFromServer({
    key: 'x',
    course_code: 'CSC 301',
    course_title: 'Data Structures',
    day_of_week: 2,
    start_time: '14:00',
    end_time: '16:00',
    venue: null,
    course_match: { kind: 'new', course_id: null, code: 'CSC 301' },
  });
  expect(row).toMatchObject({ day: 'Tue', start: '14:00', end: '16:00', venue: '', warnings: [] });
});

describe('rowProblem', () => {
  it('passes a good row', () => expect(rowProblem(base)).toBeNull());
  it('needs a code', () => expect(rowProblem({ ...base, code: ' ' })).toMatch(/code/));
  it('needs real times', () => expect(rowProblem({ ...base, start: 'soon' })).toMatch(/times/));
  it('needs end after start', () => expect(rowProblem({ ...base, end: '07:00' })).toMatch(/end after/));
});

describe('rowToConfirm', () => {
  it('sends the matched course id', () => {
    expect(rowToConfirm(base)).toEqual({
      course_id: 'course_csc301',
      course_code: 'CSC 301',
      course_title: 'Data Structures',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '10:00',
      venue: 'LT 1',
      recurrence: 'weekly',
    });
  });

  it('drops the course id once the code is changed', () => {
    expect(rowToConfirm({ ...base, code: 'CSC 305' }).course_id).toBeUndefined();
  });

  it('keeps the id when only spacing differs, and leaves out empty fields', () => {
    const out = rowToConfirm({ ...base, code: 'csc301', title: '', venue: '' });
    expect(out.course_id).toBe('course_csc301');
    expect(out).not.toHaveProperty('venue');
    expect(out).not.toHaveProperty('course_title');
  });

  it('leaves out the id for new rows', () => {
    expect(rowToConfirm({ ...base, match: null })).not.toHaveProperty('course_id');
  });
});

it('picks out the student’s own classes by level or course', () => {
  expect(isStudentsRow({ ...base, code: 'MTH 305', match: null }, '300L')).toBe(true);
  expect(isStudentsRow({ ...base, code: 'MTH 205', match: null }, '300L')).toBe(false);
  expect(isStudentsRow({ ...base, code: 'GST 101', match: { kind: 'enrolled', course_id: 'g', code: 'GST 101' } }, '300L')).toBe(true);
});

it('knows which files the server reads', () => {
  expect(importMimeType('IMG_1.HEIC', 'image/heic')).toBe('heic');
  expect(importMimeType('scan.pdf', null)).toBe('application/pdf');
  expect(importMimeType('shot.png', 'image/png')).toBe('image/png');
  expect(importMimeType('photo.jpg', '')).toBe('image/jpeg');
  expect(importMimeType('sheet.xlsx', 'application/vnd.ms-excel')).toBeNull();
});
