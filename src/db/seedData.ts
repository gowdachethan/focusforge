import { DayOfWeek, TimetableSlot, UserSettings } from '../types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'user-settings',
  theme: 'dark',
  focusModeDefault: false,
  soundEnabled: true,
  browserNotificationsEnabled: false,
  preferredPartBTrack: 'Part B2',
  showAllOfficialSections: true,
  gateAllocationTargetPercent: 75,
  skillsAllocationTargetPercent: 25,
  dailyStudyTargetMinutes: 165, // 2h 45m daily core focus (Mon-Sat study blocks = 90 + 30 + 45 + 15 = 180m)
  weeklyStudyTargetHours: 25,
  pomodoroStudyMin: 25,
  pomodoroBreakMin: 5,
  standardStudyMin: 50,
  standardBreakMin: 10,
  deepWorkStudyMin: 90,
  deepWorkBreakMin: 15,
  customStudyMin: 45,
  customBreakMin: 10,
  spacedRepetitionIntervals: [1, 3, 7, 14, 30],
  examTargetDateIST: '2027-02-06',
};

const MON_TO_SAT: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WORKDAY_TEMPLATE: Omit<TimetableSlot, 'id' | 'day'>[] = [
  {
    startTime: '06:00',
    endTime: '06:15',
    title: 'Wake up & Freshen Up',
    category: 'Routine',
    notes: 'Hydrate and settle into desk setup calmly.',
  },
  {
    startTime: '06:15',
    endTime: '07:45',
    title: 'GATE Preparation (Morning Deep Block)',
    category: 'GATE',
    subjectId: 'gate-robotics',
    topicId: 'robo-classification-kinematics',
    notes: 'Core concepts, derivations & syllabus progress.',
  },
  {
    startTime: '07:45',
    endTime: '08:00',
    title: 'Morning Break',
    category: 'Break',
    notes: 'Stretch, eye rest, quick breather.',
  },
  {
    startTime: '08:00',
    endTime: '08:30',
    title: 'GATE Question Practice',
    category: 'GATE',
    subjectId: 'gate-math',
    topicId: 'math-linear-algebra',
    notes: 'Timed MCQ/MSQ/NAT problem solving.',
  },
  {
    startTime: '08:30',
    endTime: '09:30',
    title: 'Breakfast and Preparation',
    category: 'Routine',
  },
  {
    startTime: '09:30',
    endTime: '10:30',
    title: 'Travel to Office',
    category: 'Routine',
    notes: 'Optional mental recall or audio notes.',
  },
  {
    startTime: '10:30',
    endTime: '20:00',
    title: 'Office Hours',
    category: 'Routine',
  },
  {
    startTime: '20:00',
    endTime: '20:45',
    title: 'Return Home and Relaxation',
    category: 'Break',
    notes: 'Decompress after work commute.',
  },
  {
    startTime: '20:45',
    endTime: '21:15',
    title: 'Dinner',
    category: 'Routine',
  },
  {
    startTime: '21:15',
    endTime: '22:00',
    title: 'Robotics and AI Practical Learning',
    category: 'Robotics & AI',
    subjectId: 'skill-ros2',
    notes: 'Hands-on ROS 2, Python/C++, OpenCV, Gazebo or AI skill building.',
  },
  {
    startTime: '22:00',
    endTime: '22:15',
    title: 'Daily Review & Spaced Repetition',
    category: 'Revision',
    notes: 'Formula recall, spaced-repetition check & daily reflection.',
  },
  {
    startTime: '22:15',
    endTime: '23:59',
    title: 'Sleep (Lights Out 10:15 PM)',
    category: 'Routine',
  },
];

const SUNDAY_TEMPLATE: Omit<TimetableSlot, 'id' | 'day'>[] = [
  {
    startTime: '07:00',
    endTime: '09:00',
    title: 'GATE Deep Study',
    category: 'GATE',
    subjectId: 'gate-mech-b2',
    topicId: 'mech-b2-1-mom',
    notes: 'Deep work on core Part A or Part B2 topics.',
  },
  {
    startTime: '09:00',
    endTime: '09:30',
    title: 'Breakfast',
    category: 'Routine',
  },
  {
    startTime: '09:30',
    endTime: '11:30',
    title: 'Numerical Problem Solving',
    category: 'GATE',
    subjectId: 'gate-control',
    topicId: 'ctrl-time-stability',
    notes: 'NAT & multi-step numerical drills.',
  },
  {
    startTime: '11:30',
    endTime: '12:00',
    title: 'Mid-Morning Break',
    category: 'Break',
  },
  {
    startTime: '12:00',
    endTime: '13:00',
    title: 'Previous Year Questions Practice',
    category: 'GATE',
    subjectId: 'gate-ga',
    topicId: 'ga-quant',
    notes: 'Solve verified PYQ sets and analyze patterns.',
  },
  {
    startTime: '13:00',
    endTime: '14:00',
    title: 'Lunch and Rest',
    category: 'Routine',
  },
  {
    startTime: '14:00',
    endTime: '15:30',
    title: 'Robotics and AI Learning',
    category: 'Robotics & AI',
    subjectId: 'skill-ros2',
    notes: 'Structured roadmap progress in Robotics & AI.',
  },
  {
    startTime: '15:30',
    endTime: '16:00',
    title: 'Afternoon Break',
    category: 'Break',
  },
  {
    startTime: '16:00',
    endTime: '17:00',
    title: 'Practical Coding',
    category: 'Robotics & AI',
    subjectId: 'skill-python',
    notes: 'Hands-on implementation, assignments & mini-projects.',
  },
  {
    startTime: '17:00',
    endTime: '18:00',
    title: 'Personal Time',
    category: 'Break',
  },
  {
    startTime: '18:00',
    endTime: '19:00',
    title: 'GATE Revision',
    category: 'Revision',
    notes: 'Clear today\'s spaced repetition queue & formula sheets.',
  },
  {
    startTime: '19:00',
    endTime: '20:00',
    title: 'Dinner and Rest',
    category: 'Routine',
  },
  {
    startTime: '20:00',
    endTime: '21:00',
    title: 'Weekly Mock Test and Analysis',
    category: 'Mock Test',
    notes: 'Timed mock examination + weak-topic diagnostics.',
  },
];

export function buildInitialTimetable(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  for (const day of MON_TO_SAT) {
    WORKDAY_TEMPLATE.forEach((slot, idx) => {
      slots.push({
        ...slot,
        id: `tt-${day.toLowerCase()}-${idx + 1}`,
        day,
      });
    });
  }
  SUNDAY_TEMPLATE.forEach((slot, idx) => {
    slots.push({
      ...slot,
      id: `tt-sunday-${idx + 1}`,
      day: 'Sunday',
    });
  });
  return slots;
}

