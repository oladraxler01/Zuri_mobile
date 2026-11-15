import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  units: number;
  lecturer?: string;
  color?: string;
}

export interface TimetableSlot {
  id: string;
  courseId: string;
  courseCode: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  startTime: string; // e.g. "09:00 AM"
  endTime: string;   // e.g. "11:00 AM"
  venue: string;     // e.g. "Lecture Theatre B"
}

export interface StudentPreferences {
  targetGpa: string;
  weeklyStudyHours: number;
  lectureReminders: boolean;
  reminderLeadMinutes: number; // 15, 30, 45
  examCountdown: boolean;
  assignmentAlerts: boolean;
}

export interface StudentAcademicState {
  /** Name entered at sign-up; empty until set */
  studentName: string;
  /** Matriculation / student ID number, used for student verification */
  matricNumber: string;
  verification: 'unverified' | 'pending' | 'verified';
  faculty: string;
  university: string;
  department: string;
  level: string; // "100L", "200L", "300L", "400L", "500L"
  semester: 'First Semester' | 'Second Semester';
  courses: CourseItem[];
  timetable: TimetableSlot[];
  preferences: StudentPreferences;
}

interface AcademicContextType {
  state: StudentAcademicState;
  /** true once saved data has been read from the device */
  hydrated: boolean;
  setAcademicInfo: (info: {
    studentName?: string;
    matricNumber?: string;
    verification?: 'unverified' | 'pending' | 'verified';
    faculty?: string;
    university?: string;
    department?: string;
    level?: string;
    semester?: 'First Semester' | 'Second Semester';
  }) => void;
  addCourse: (course: Omit<CourseItem, 'id'>) => string;
  removeCourse: (id: string) => void;
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  removeTimetableSlot: (id: string) => void;
  setTimetableSlots: (slots: TimetableSlot[]) => void;
  updatePreferences: (prefs: Partial<StudentPreferences>) => void;
}

const DEFAULT_COURSES: CourseItem[] = [
  { id: '1', code: 'CSC 201', title: 'Data Structures & Algorithms', units: 3, lecturer: 'Dr. Adeyemi', color: '#2c3930' },
  { id: '2', code: 'CSC 205', title: 'Operating Systems Architecture', units: 3, lecturer: 'Prof. Okafor', color: '#735c00' },
  { id: '3', code: 'MTH 201', title: 'Mathematical Methods & Linear Algebra', units: 3, lecturer: 'Dr. Bello', color: '#17231b' },
  { id: '4', code: 'GET 203', title: 'Engineering Mathematics II', units: 2, lecturer: 'Engr. Nnamdi', color: '#546257' },
];

const DEFAULT_TIMETABLE: TimetableSlot[] = [
  { id: 's1', courseId: '1', courseCode: 'CSC 201', day: 'Mon', startTime: '09:00 AM', endTime: '11:00 AM', venue: 'Faculty Lab 2' },
  { id: 's2', courseId: '2', courseCode: 'CSC 205', day: 'Mon', startTime: '01:00 PM', endTime: '03:00 PM', venue: 'LT B' },
  { id: 's3', courseId: '3', courseCode: 'MTH 201', day: 'Wed', startTime: '10:00 AM', endTime: '12:00 PM', venue: 'Auditorium 1' },
  { id: 's4', courseId: '1', courseCode: 'CSC 201', day: 'Thu', startTime: '02:00 PM', endTime: '04:00 PM', venue: 'Faculty Lab 2' },
  { id: 's5', courseId: '4', courseCode: 'GET 203', day: 'Fri', startTime: '08:00 AM', endTime: '10:00 AM', venue: 'Engineering Hall 3' },
];

const initialState: StudentAcademicState = {
  studentName: '',
  matricNumber: '',
  verification: 'unverified',
  faculty: 'Faculty of Natural & Applied Sciences',
  university: 'Veritas University',
  department: 'Computer Science',
  level: '200L',
  semester: 'First Semester',
  courses: DEFAULT_COURSES,
  timetable: DEFAULT_TIMETABLE,
  preferences: {
    targetGpa: '4.50+ (First Class)',
    weeklyStudyHours: 16,
    lectureReminders: true,
    reminderLeadMinutes: 15,
    examCountdown: true,
    assignmentAlerts: true,
  },
};

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudentAcademicState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  // Restore saved courses, timetable and preferences, then keep them saved.
  useEffect(() => {
    loadJSON<StudentAcademicState>(STORAGE_KEYS.academic).then((saved) => {
      if (saved) {
        setState({
          ...initialState,
          ...saved,
          preferences: { ...initialState.preferences, ...saved.preferences },
        });
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.academic, state);
  }, [state, hydrated]);

  const setAcademicInfo: AcademicContextType['setAcademicInfo'] = (info) => {
    setState((prev) => ({
      ...prev,
      ...info,
    }));
  };

  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  const addCourse = (course: Omit<CourseItem, 'id'>) => {
    const newCourse: CourseItem = {
      ...course,
      id: uid(),
      color: course.color || '#2c3930',
    };
    setState((prev) => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }));
    return newCourse.id;
  };

  const removeCourse = (id: string) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      timetable: prev.timetable.filter((t) => t.courseId !== id),
    }));
  };

  const addTimetableSlot = (slot: Omit<TimetableSlot, 'id'>) => {
    const newSlot: TimetableSlot = {
      ...slot,
      id: uid(),
    };
    setState((prev) => ({
      ...prev,
      timetable: [...prev.timetable, newSlot],
    }));
  };

  const removeTimetableSlot = (id: string) => {
    setState((prev) => ({
      ...prev,
      timetable: prev.timetable.filter((t) => t.id !== id),
    }));
  };

  const setTimetableSlots = (slots: TimetableSlot[]) => {
    setState((prev) => ({
      ...prev,
      timetable: slots,
    }));
  };

  const updatePreferences = (prefs: Partial<StudentPreferences>) => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...prefs,
      },
    }));
  };

  return (
    <AcademicContext.Provider
      value={{
        state,
        hydrated,
        setAcademicInfo,
        addCourse,
        removeCourse,
        addTimetableSlot,
        removeTimetableSlot,
        setTimetableSlots,
        updatePreferences,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
}

export const useAcademicContext = useAcademic;
