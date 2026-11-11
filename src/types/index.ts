export type NavSectionId =
  | 'dashboard'
  | 'timetable'
  | 'start-study'
  | 'timer'
  | 'gate-subjects'
  | 'robotics-skills'
  | 'practice-tests'
  | 'mock-exams'
  | 'revision'
  | 'notes'
  | 'analytics'
  | 'settings';

export type StudyCategory = 'GATE' | 'Robotics & AI';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type TimetableSlotCategory =
  | 'GATE'
  | 'Robotics & AI'
  | 'Revision'
  | 'Mock Test'
  | 'Break'
  | 'Routine';

export interface TimetableSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // HH:mm 24-hour format in Asia/Kolkata
  endTime: string; // HH:mm 24-hour format
  title: string;
  category: TimetableSlotCategory;
  subjectId?: string;
  topicId?: string;
  notes?: string;
}

export type TopicLearningStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'needs-review';

export interface GateSubtopic {
  id: string;
  title: string;
  completed: boolean;
}

export interface GateTopic {
  id: string;
  subjectId: string;
  sectionCode: string; // e.g., 'GA.1', 'A.1', 'A.2', 'A.3', 'B1.3', 'B2.1'
  title: string;
  officialSummary: string;
  subtopics: GateSubtopic[];
  status: TopicLearningStatus;
  formulaNotes: string;
  conceptNotes: string;
  practiceLinks: { id: string; label: string; url: string }[];
  completedAt?: string; // ISO string
  lastStudiedAt?: string;
  studyMinutes: number;
  flaggedWeak: boolean;
}

export interface GateSubject {
  id: string;
  name: string;
  shortName: string;
  officialSection: string;
  partGroup: 'GA' | 'Part A' | 'Part B1' | 'Part B2';
  marksWeightage: string;
  description: string;
  isPrimaryTrack: boolean;
  accentColor: string;
}

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface SkillRoadmapItem {
  id: string;
  level: SkillLevel;
  title: string;
  completed: boolean;
}

export interface SkillAssignment {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface SkillMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface SkillResource {
  id: string;
  label: string;
  url: string;
  kind: 'Official Docs' | 'Course' | 'Video' | 'Guide' | 'Reference';
}

export interface RoboticsSkill {
  id: string;
  name: string;
  category: string;
  summary: string;
  roadmap: SkillRoadmapItem[];
  resources: SkillResource[];
  assignments: SkillAssignment[];
  milestones: SkillMilestone[];
  notes: string;
  referenceLinks: { id: string; label: string; url: string }[];
  studyMinutes: number;
  lastStudiedAt?: string;
}

export type TimerMode = 'pomodoro' | 'standard' | 'deep-work' | 'custom';
export type TimerPhase = 'study' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface ActiveTimerState {
  sessionInstanceId: string;
  mode: TimerMode;
  phase: TimerPhase;
  status: TimerStatus;
  studyDurationMinutes: number;
  breakDurationMinutes: number;
  phaseDurationMs: number;
  targetEndTimestamp: number | null; // epoch ms when running
  pausedRemainingMs: number | null; // ms remaining when paused
  phaseStartedAt: number | null; // epoch ms when current study/break phase began
  accumulatedActiveMs: number; // active study ms before pauses (to record real study time)
  lastResumeTimestamp: number | null;
  category: StudyCategory;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  objective: string;
  autoTransition: boolean;
  isFocusScreenOpen: boolean;
  recordedPhaseKeys: string[]; // prevents duplicate session logs
}

export interface StudySessionRecord {
  id: string;
  sessionInstanceId: string;
  category: StudyCategory;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  objective: string;
  timerMode: TimerMode;
  plannedMinutes: number;
  actualMinutes: number;
  actualSeconds: number;
  startedAt: string; // ISO
  endedAt: string; // ISO
  dateIST: string; // YYYY-MM-DD in Asia/Kolkata
  completedFull: boolean;
  markedTopicCompleted: boolean;
  notesSnapshot?: string;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'NAT';
export type QuestionNature = 'Conceptual' | 'Numerical';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionSourceTag =
  | 'Original Practice'
  | 'Self-Entered Reference'
  | 'Imported Dataset';

export interface QuestionItem {
  id: string;
  subjectId: string;
  topicId: string;
  examSection: 'GA' | 'Part A' | 'Part B1' | 'Part B2';
  type: QuestionType;
  nature: QuestionNature;
  difficulty: QuestionDifficulty;
  marks: 1 | 2;
  prompt: string;
  options?: string[]; // 4 options for MCQ/MSQ
  correctOptionIndex?: number; // MCQ (0-3)
  correctOptionIndices?: number[]; // MSQ (sorted 0-3)
  natMin?: number; // NAT lower bound
  natMax?: number; // NAT upper bound
  natUnit?: string;
  explanation: string;
  sourceTag: QuestionSourceTag;
  sourceReference?: string; // e.g., user-entered source label
  createdAt: string;
}

export interface QuestionAttemptResponse {
  questionId: string;
  subjectId: string;
  topicId: string;
  type: QuestionType;
  marks: 1 | 2;
  selectedOptionIndex?: number | null;
  selectedOptionIndices?: number[];
  natAnswer?: string;
  markedForReview: boolean;
  visited: boolean;
  timeSpentSeconds: number;
  isCorrect: boolean;
  isAttempted: boolean;
  marksAwarded: number;
}

export interface TestAttemptRecord {
  id: string;
  mode: 'topic-test' | 'mock-exam';
  title: string;
  partBTrack?: 'Part B1' | 'Part B2';
  subjectFilter: string;
  topicFilter: string;
  dateIST: string;
  startedAt: string;
  submittedAt: string;
  durationMinutes: number;
  actualTimeSeconds: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  maxMarks: number;
  score: number;
  accuracyPercent: number;
  responses: QuestionAttemptResponse[];
  weakTopicIds: string[];
}

export interface RevisionItem {
  id: string;
  topicId: string;
  subjectId: string;
  subjectName: string;
  topicTitle: string;
  category: StudyCategory;
  completedDateIST: string; // YYYY-MM-DD
  intervals: number[]; // default [1, 3, 7, 14, 30]
  currentStepIndex: number; // 0..intervals.length-1
  nextDueDateIST: string; // YYYY-MM-DD
  lastRevisedDateIST?: string;
  revisionCount: number;
  needsRetest: boolean;
  status: 'active' | 'mastered';
}

export interface NoteAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface StudyNote {
  id: string;
  category: StudyCategory;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  title: string;
  explanation: string;
  formulas: string;
  youtubeLinks: { id: string; label: string; url: string }[];
  nptelLinks: { id: string; label: string; url: string }[];
  attachments: NoteAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyReflection {
  id: string;
  dateIST: string; // YYYY-MM-DD
  wins: string;
  clarityRating: 1 | 2 | 3 | 4 | 5;
  blockersOrNextStep: string;
  updatedAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStartIST: string; // Monday YYYY-MM-DD
  summary: string;
  nextWeekFocus: string;
  hoursLoggedSnapshot: number;
  updatedAt: string;
}

export interface UserSettings {
  id: 'user-settings';
  theme: 'dark' | 'light';
  focusModeDefault: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  preferredPartBTrack: 'Part B2' | 'Part B1';
  showAllOfficialSections: boolean;
  gateAllocationTargetPercent: number; // default 75
  skillsAllocationTargetPercent: number; // default 25
  dailyStudyTargetMinutes: number; // default 150 (2h 30m Mon-Sat)
  weeklyStudyTargetHours: number; // default 22
  pomodoroStudyMin: number;
  pomodoroBreakMin: number;
  standardStudyMin: number;
  standardBreakMin: number;
  deepWorkStudyMin: number;
  deepWorkBreakMin: number;
  customStudyMin: number;
  customBreakMin: number;
  spacedRepetitionIntervals: number[]; // [1, 3, 7, 14, 30]
  examTargetDateIST: string; // '2027-02-06'
}

export interface MissedRecoveryEntry {
  id: string;
  slotId: string;
  slotTitle: string;
  dateIST: string;
  action: 'rescheduled' | 'dismissed' | 'completed';
  rescheduledNote?: string;
}

export interface AchievementUnlock {
  id: string;
  unlockedAt: string;
}

export interface FocusForgeBackupPayload {
  app: 'FOCUSFORGE-GATE-2027';
  schemaVersion: number;
  exportedAt: string;
  data: {
    settings: UserSettings;
    timetable: TimetableSlot[];
    gateSubjects: GateSubject[];
    gateTopics: GateTopic[];
    roboticsSkills: RoboticsSkill[];
    studySessions: StudySessionRecord[];
    questions: QuestionItem[];
    testAttempts: TestAttemptRecord[];
    revisions: RevisionItem[];
    notes: StudyNote[];
    dailyReflections: DailyReflection[];
    weeklyReviews: WeeklyReview[];
    missedRecovery: MissedRecoveryEntry[];
    achievements: AchievementUnlock[];
  };
}

