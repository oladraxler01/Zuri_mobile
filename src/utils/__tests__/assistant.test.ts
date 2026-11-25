import { answerLocally, summaryAnswer, type AssistantData } from '@/utils/assistant';

// Wednesday 25 Nov 2026, 10:00
const now = new Date(2026, 10, 25, 10, 0);

const data: AssistantData = {
  courses: [
    { id: 'a', code: 'CSC 301', title: 'Data Structures', units: 3 },
    { id: 'b', code: 'MTH 202', title: 'Linear Algebra', units: 3 },
  ],
  timetable: [
    { id: 's1', courseId: 'a', courseCode: 'CSC 301', day: 'Wed', startTime: '02:00 PM', endTime: '04:00 PM', venue: 'LT A' },
    { id: 's2', courseId: 'b', courseCode: 'MTH 202', day: 'Wed', startTime: '08:00 AM', endTime: '10:00 AM', venue: 'LT B' },
    { id: 's3', courseId: 'b', courseCode: 'MTH 202', day: 'Sun', startTime: '04:00 PM', endTime: '06:00 PM', venue: '' },
  ],
  assessments: [
    {
      id: 't1', kind: 'test', courseId: 'a', courseCode: 'CSC 301', title: 'CA 1',
      dueAt: new Date(2026, 10, 25, 15, 0).toISOString(), status: 'todo', steps: [], createdAt: '',
    },
    {
      id: 't2', kind: 'assignment', courseId: 'b', courseCode: 'MTH 202', title: 'Problem set 3',
      dueAt: new Date(2026, 10, 27, 23, 59).toISOString(), status: 'todo', steps: [], createdAt: '',
    },
  ],
  lectures: [],
};

describe('answerLocally', () => {
  it('lists today’s classes in time order', () => {
    const a = answerLocally('What classes am I having today?', data, now)!;
    expect(a).toContain('2 classes today');
    expect(a.indexOf('MTH 202')).toBeLessThan(a.indexOf('CSC 301'));
  });

  it('treats "lectures today" as classes', () => {
    expect(answerLocally('what lectures do I have today', data, now)).toContain('2 classes today');
  });

  it('finds Sunday classes', () => {
    expect(answerLocally('any classes on Sunday?', data, now)).toContain('MTH 202');
  });

  it('answers whether there is a test today', () => {
    const a = answerLocally('Do I have a test today?', data, now)!;
    expect(a).toMatch(/^Yes/);
    expect(a).toContain('CA 1');
  });

  it('says no and points to the next deadline', () => {
    const a = answerLocally('any assignment due today?', data, now)!;
    expect(a).toMatch(/^No assignments due today/);
    expect(a).toContain('Problem set 3');
  });

  it('leaves general questions to the AI', () => {
    expect(answerLocally('Explain dynamic programming', data, now)).toBeNull();
  });

  it('summarises the day', () => {
    const s = summaryAnswer(data, now);
    expect(s).toContain('1 class left today');
    expect(s).toContain('Due today');
    expect(s).toContain('Problem set 3');
  });
});
