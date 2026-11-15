/**
 * Sample institution data for the admin dashboard. Replaced by the
 * university's real data once the backend and integrations are connected.
 */

export interface DeptCourse {
  id: string;
  code: string;
  title: string;
  lecturer: string;
  enrolled: number;
  lecturesCaptured: number;
  /** average topic mastery % */
  mastery: number;
  /** % of enrolled students active this week */
  engagement: number;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  students: number;
  lecturers: number;
  courses: DeptCourse[];
}

export interface Faculty {
  id: string;
  name: string;
  dean: string;
  departments: Department[];
}

const c = (
  id: string,
  code: string,
  title: string,
  lecturer: string,
  enrolled: number,
  lecturesCaptured: number,
  mastery: number,
  engagement: number
): DeptCourse => ({ id, code, title, lecturer, enrolled, lecturesCaptured, mastery, engagement });

export const FACULTIES: Faculty[] = [
  {
    id: 'f-sci',
    name: 'Faculty of Natural & Applied Sciences',
    dean: 'Prof. A. Okonkwo',
    departments: [
      {
        id: 'd-csc',
        name: 'Computer Science',
        head: 'Dr. F. Adeyemi',
        students: 642,
        lecturers: 18,
        courses: [
          c('ic1', 'CSC 201', 'Data Structures & Algorithms', 'Dr. Adeyemi', 186, 22, 64, 78),
          c('ic2', 'CSC 205', 'Operating Systems Architecture', 'Prof. Okafor', 171, 18, 58, 71),
          c('ic3', 'CSC 301', 'Design & Analysis of Algorithms', 'Dr. Ibrahim', 154, 20, 61, 74),
          c('ic4', 'CSC 305', 'Software Engineering Methods', 'Dr. Nwosu', 149, 12, 72, 66),
        ],
      },
      {
        id: 'd-mth',
        name: 'Mathematics',
        head: 'Dr. K. Bello',
        students: 388,
        lecturers: 12,
        courses: [
          c('ic5', 'MTH 201', 'Mathematical Methods & Linear Algebra', 'Dr. Bello', 212, 19, 52, 69),
          c('ic6', 'MTH 302', 'Abstract Algebra', 'Dr. Eze', 96, 9, 49, 58),
        ],
      },
    ],
  },
  {
    id: 'f-eng',
    name: 'Faculty of Engineering',
    dean: 'Prof. O. Danjuma',
    departments: [
      {
        id: 'd-eee',
        name: 'Electrical & Electronic Engineering',
        head: 'Engr. P. Nnamdi',
        students: 512,
        lecturers: 15,
        courses: [
          c('ic7', 'GET 203', 'Engineering Mathematics II', 'Engr. Nnamdi', 240, 16, 55, 72),
          c('ic8', 'EEE 211', 'Circuit Theory', 'Dr. Lawal', 178, 14, 60, 68),
        ],
      },
    ],
  },
  {
    id: 'f-soc',
    name: 'Faculty of Social & Management Sciences',
    dean: 'Prof. H. Usman',
    departments: [
      {
        id: 'd-acc',
        name: 'Accounting',
        head: 'Dr. R. Ogunleye',
        students: 455,
        lecturers: 11,
        courses: [
          c('ic9', 'ACC 201', 'Financial Accounting II', 'Dr. Ogunleye', 230, 11, 66, 63),
          c('ic10', 'GST 304', 'Peace and Conflict Resolution', 'Dr. Ahmed', 420, 6, 74, 41),
        ],
      },
    ],
  },
];

export const allDepartments = () => FACULTIES.flatMap((f) => f.departments.map((d) => ({ ...d, faculty: f.name })));
export const allCourses = () => FACULTIES.flatMap((f) => f.departments.flatMap((d) => d.courses.map((x) => ({ ...x, department: d.name }))));

export const WEEKLY_ACTIVE = [61, 64, 63, 68, 71, 69, 74, 77]; // % of students active per week, last 8 weeks
export const WEEKLY_LECTURES = [96, 104, 101, 118, 122, 117, 131, 138]; // lectures captured per week

export const AI_USAGE = {
  minutesTranscribed: 18420,
  questionsAnswered: 9310,
  documentsProcessed: 1284,
  /** USD this month */
  costThisMonth: 41.6,
  budget: 120,
  /** USD per week, last 8 weeks */
  weeklyCost: [7.2, 8.1, 8.4, 9.6, 10.2, 9.8, 10.9, 11.4],
};

export const INTERVENTIONS = [
  { id: 'i1', course: 'MTH 201', issue: 'Eigenvalues mastery at 38% before the test', students: 64, status: 'open' as const },
  { id: 'i2', course: 'GST 304', issue: 'Engagement below 45% for 3 weeks', students: 248, status: 'open' as const },
  { id: 'i3', course: 'CSC 205', issue: 'Deadlock misconception in 41% of quiz answers', students: 70, status: 'in-progress' as const },
  { id: 'i4', course: 'CSC 201', issue: 'Recursion revision pack sent; mastery +14 pts', students: 52, status: 'resolved' as const },
];

export const COMMON_DIFFICULTIES = [
  { concept: 'Recursion & base cases', courses: ['CSC 201', 'CSC 301'], mastery: 47 },
  { concept: 'Eigenvalues & eigenvectors', courses: ['MTH 201', 'GET 203'], mastery: 41 },
  { concept: 'Laplace transforms', courses: ['GET 203', 'EEE 211'], mastery: 49 },
  { concept: 'Deadlock conditions', courses: ['CSC 205'], mastery: 52 },
  { concept: 'Accrual vs cash basis', courses: ['ACC 201'], mastery: 56 },
];

export const SHARED_CONCEPTS = [
  { concept: 'Matrices', courses: ['MTH 201', 'GET 203', 'CSC 301', 'EEE 211'] },
  { concept: 'Recursion', courses: ['CSC 201', 'CSC 301', 'MTH 302'] },
  { concept: 'Complexity analysis', courses: ['CSC 201', 'CSC 301', 'CSC 205'] },
  { concept: 'Differential equations', courses: ['GET 203', 'EEE 211'] },
  { concept: 'Graph theory', courses: ['CSC 301', 'MTH 302'] },
];

export const SYSTEM_HEALTH = [
  { name: 'Mobile app & API', status: 'good' as const, detail: '99.9% uptime this month' },
  { name: 'Transcription service', status: 'good' as const, detail: 'Average 11 s per lecture hour' },
  { name: 'Document processing', status: 'warning' as const, detail: 'Queue at 34 files, ~6 min wait' },
  { name: 'Notifications', status: 'good' as const, detail: 'All reminders delivered' },
  { name: 'SIS sync', status: 'critical' as const, detail: 'Last sync failed 3 h ago' },
];

export const AUDIT_SEED = [
  { id: 'l1', at: -2, actor: 'Dr. F. Adeyemi', action: 'Published quiz', target: 'CSC 201 · Recursion check' },
  { id: 'l2', at: -5, actor: 'Registry', action: 'Imported enrollment', target: 'MTH 201 (212 students)' },
  { id: 'l3', at: -9, actor: 'You', action: 'Changed role', target: 'Dr. Eze → Course lecturer' },
  { id: 'l4', at: -26, actor: 'System', action: 'Retention cleanup', target: '312 recordings older than 2 years' },
  { id: 'l5', at: -30, actor: 'Prof. Okafor', action: 'Uploaded material', target: 'CSC 205 · Past questions 2024' },
];

export const STAFF_SEED = [
  { id: 's1', name: 'Dr. F. Adeyemi', email: 'f.adeyemi@university.edu', role: 'Head of department', department: 'Computer Science', status: 'active' as const },
  { id: 's2', name: 'Prof. C. Okafor', email: 'c.okafor@university.edu', role: 'Lecturer', department: 'Computer Science', status: 'active' as const },
  { id: 's3', name: 'Dr. K. Bello', email: 'k.bello@university.edu', role: 'Head of department', department: 'Mathematics', status: 'active' as const },
  { id: 's4', name: 'Engr. P. Nnamdi', email: 'p.nnamdi@university.edu', role: 'Lecturer', department: 'Electrical & Electronic Engineering', status: 'active' as const },
  { id: 's5', name: 'Mrs. T. Afolabi', email: 't.afolabi@university.edu', role: 'Registry officer', department: 'Registry', status: 'invited' as const },
];

export const ROLES = ['Administrator', 'Head of department', 'Lecturer', 'Registry officer'] as const;
export const PERMISSIONS = [
  'View analytics',
  'Manage courses & enrollment',
  'Manage timetable & calendar',
  'Manage staff & roles',
  'Publish content',
  'Export data',
] as const;
