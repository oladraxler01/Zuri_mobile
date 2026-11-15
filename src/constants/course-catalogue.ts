/**
 * Sample course catalogue by department and level, used for "Import from
 * catalogue" during onboarding. Replaced by the university's official
 * catalogue once the student records integration is connected.
 */

export interface CatalogueCourse {
  code: string;
  title: string;
  units: number;
  lecturer?: string;
}

type Catalogue = Record<string, Record<string, CatalogueCourse[]>>;

export const COURSE_CATALOGUE: Catalogue = {
  'Computer Science': {
    '100L': [
      { code: 'CSC 101', title: 'Introduction to Computer Science', units: 3 },
      { code: 'CSC 102', title: 'Introduction to Programming', units: 3 },
      { code: 'MTH 101', title: 'Elementary Mathematics I', units: 3 },
      { code: 'GST 101', title: 'Use of English I', units: 2 },
    ],
    '200L': [
      { code: 'CSC 201', title: 'Data Structures & Algorithms', units: 3, lecturer: 'Dr. Adeyemi' },
      { code: 'CSC 205', title: 'Operating Systems Architecture', units: 3, lecturer: 'Prof. Okafor' },
      { code: 'CSC 207', title: 'Computer Architecture', units: 3 },
      { code: 'MTH 201', title: 'Mathematical Methods & Linear Algebra', units: 3, lecturer: 'Dr. Bello' },
      { code: 'STA 201', title: 'Probability & Statistics', units: 3 },
      { code: 'GST 201', title: 'Entrepreneurship Studies', units: 2 },
    ],
    '300L': [
      { code: 'CSC 301', title: 'Design & Analysis of Algorithms', units: 3, lecturer: 'Dr. Ibrahim' },
      { code: 'CSC 305', title: 'Software Engineering Methods', units: 3, lecturer: 'Dr. Nwosu' },
      { code: 'CSC 307', title: 'Database Systems', units: 3 },
      { code: 'CSC 309', title: 'Computer Networks', units: 3 },
      { code: 'GST 304', title: 'Peace and Conflict Resolution', units: 2 },
    ],
    '400L': [
      { code: 'CSC 401', title: 'Artificial Intelligence', units: 3 },
      { code: 'CSC 403', title: 'Compiler Construction', units: 3 },
      { code: 'CSC 499', title: 'Final Year Project', units: 6 },
    ],
  },
  Mathematics: {
    '200L': [
      { code: 'MTH 201', title: 'Mathematical Methods & Linear Algebra', units: 3 },
      { code: 'MTH 203', title: 'Real Analysis I', units: 3 },
      { code: 'MTH 205', title: 'Differential Equations', units: 3 },
    ],
    '300L': [
      { code: 'MTH 302', title: 'Abstract Algebra', units: 3 },
      { code: 'MTH 304', title: 'Complex Analysis', units: 3 },
    ],
  },
  'Electrical Engineering': {
    '200L': [
      { code: 'GET 203', title: 'Engineering Mathematics II', units: 2, lecturer: 'Engr. Nnamdi' },
      { code: 'EEE 211', title: 'Circuit Theory', units: 3 },
      { code: 'EEE 213', title: 'Electronic Devices', units: 3 },
    ],
  },
  Accounting: {
    '200L': [
      { code: 'ACC 201', title: 'Financial Accounting II', units: 3 },
      { code: 'ACC 203', title: 'Cost Accounting', units: 3 },
      { code: 'ECO 201', title: 'Principles of Economics', units: 2 },
    ],
  },
};

/** Courses for a department + level; falls back to the closest department name. */
export function catalogueFor(department: string, level: string): CatalogueCourse[] {
  const key =
    Object.keys(COURSE_CATALOGUE).find((d) => d.toLowerCase() === department.trim().toLowerCase()) ??
    Object.keys(COURSE_CATALOGUE).find((d) => department.toLowerCase().includes(d.toLowerCase().split(' ')[0]));
  if (!key) return [];
  return COURSE_CATALOGUE[key][level] ?? [];
}

export const FACULTY_OPTIONS = [
  'Faculty of Natural & Applied Sciences',
  'Faculty of Engineering',
  'Faculty of Social & Management Sciences',
  'Faculty of Arts & Humanities',
  'Faculty of Law',
  'Faculty of Health Sciences',
];
