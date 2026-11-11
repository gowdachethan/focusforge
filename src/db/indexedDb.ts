import {
  AchievementUnlock,
  ActiveTimerState,
  DailyReflection,
  FocusForgeBackupPayload,
  GateSubject,
  GateTopic,
  MissedRecoveryEntry,
  QuestionItem,
  RevisionItem,
  RoboticsSkill,
  StudyNote,
  StudySessionRecord,
  TestAttemptRecord,
  TimetableSlot,
  UserSettings,
  WeeklyReview,
} from '../types';
import { INITIAL_GATE_SUBJECTS, INITIAL_GATE_TOPICS } from '../data/gateSyllabus';
import { INITIAL_ROBOTICS_SKILLS } from '../data/roboticsSkills';
import { INITIAL_QUESTION_BANK } from '../data/questionBankSeed';
import { buildInitialTimetable, DEFAULT_USER_SETTINGS } from './seedData';

const DB_NAME = 'focusforge_gate_2027_db';
const DB_VERSION = 1;

export const STORE_NAMES = [
  'settings',
  'timetable',
  'gateSubjects',
  'gateTopics',
  'roboticsSkills',
  'studySessions',
  'questions',
  'testAttempts',
  'revisions',
  'notes',
  'dailyReflections',
  'weeklyReviews',
  'missedRecovery',
  'achievements',
  'timerState',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openFocusForgeDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORE_NAMES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openFocusForgeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function getFromStore<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openFocusForgeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function putInStore<T extends { id: string }>(
  storeName: StoreName,
  item: T
): Promise<void> {
  const db = await openFocusForgeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putManyInStore<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  const db = await openFocusForgeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openFocusForgeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function replaceStoreContents<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  const db = await openFocusForgeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface HydratedDatabaseState {
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
  timerState: ActiveTimerState | null;
}

export async function initializeAndLoadDatabase(): Promise<HydratedDatabaseState> {
  const [
    settingsArr,
    timetable,
    gateSubjects,
    gateTopics,
    roboticsSkills,
    studySessions,
    questions,
    testAttempts,
    revisions,
    notes,
    dailyReflections,
    weeklyReviews,
    missedRecovery,
    achievements,
    timerArr,
  ] = await Promise.all([
    getAllFromStore<UserSettings>('settings'),
    getAllFromStore<TimetableSlot>('timetable'),
    getAllFromStore<GateSubject>('gateSubjects'),
    getAllFromStore<GateTopic>('gateTopics'),
    getAllFromStore<RoboticsSkill>('roboticsSkills'),
    getAllFromStore<StudySessionRecord>('studySessions'),
    getAllFromStore<QuestionItem>('questions'),
    getAllFromStore<TestAttemptRecord>('testAttempts'),
    getAllFromStore<RevisionItem>('revisions'),
    getAllFromStore<StudyNote>('notes'),
    getAllFromStore<DailyReflection>('dailyReflections'),
    getAllFromStore<WeeklyReview>('weeklyReviews'),
    getAllFromStore<MissedRecoveryEntry>('missedRecovery'),
    getAllFromStore<AchievementUnlock>('achievements'),
    getAllFromStore<ActiveTimerState & { id: string }>('timerState'),
  ]);

  let finalSettings = settingsArr[0];
  if (!finalSettings) {
    finalSettings = DEFAULT_USER_SETTINGS;
    await putInStore('settings', finalSettings);
  }

  let finalTimetable = timetable;
  if (finalTimetable.length === 0) {
    finalTimetable = buildInitialTimetable();
    await putManyInStore('timetable', finalTimetable);
  }

  let finalSubjects = gateSubjects;
  if (finalSubjects.length === 0) {
    finalSubjects = INITIAL_GATE_SUBJECTS;
    await putManyInStore('gateSubjects', finalSubjects);
  }

  let finalTopics = gateTopics;
  if (finalTopics.length === 0) {
    finalTopics = INITIAL_GATE_TOPICS;
    await putManyInStore('gateTopics', finalTopics);
  }

  let finalSkills = roboticsSkills;
  if (finalSkills.length === 0) {
    finalSkills = INITIAL_ROBOTICS_SKILLS;
    await putManyInStore('roboticsSkills', finalSkills);
  }

  let finalQuestions = questions;
  if (finalQuestions.length === 0) {
    finalQuestions = INITIAL_QUESTION_BANK;
    await putManyInStore('questions', finalQuestions);
  }

  const savedTimer = timerArr.find((t) => t.id === 'active-timer') ?? null;

  return {
    settings: finalSettings,
    timetable: finalTimetable,
    gateSubjects: finalSubjects,
    gateTopics: finalTopics,
    roboticsSkills: finalSkills,
    studySessions,
    questions: finalQuestions,
    testAttempts,
    revisions,
    notes,
    dailyReflections,
    weeklyReviews,
    missedRecovery,
    achievements,
    timerState: savedTimer,
  };
}

export async function saveActiveTimerState(timer: ActiveTimerState | null): Promise<void> {
  if (!timer) {
    await deleteFromStore('timerState', 'active-timer');
    return;
  }
  await putInStore('timerState', { ...timer, id: 'active-timer' });
}

export async function exportFullBackup(): Promise<FocusForgeBackupPayload> {
  const state = await initializeAndLoadDatabase();
  return {
    app: 'FOCUSFORGE-GATE-2027',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings: state.settings,
      timetable: state.timetable,
      gateSubjects: state.gateSubjects,
      gateTopics: state.gateTopics,
      roboticsSkills: state.roboticsSkills,
      studySessions: state.studySessions,
      questions: state.questions,
      testAttempts: state.testAttempts,
      revisions: state.revisions,
      notes: state.notes,
      dailyReflections: state.dailyReflections,
      weeklyReviews: state.weeklyReviews,
      missedRecovery: state.missedRecovery,
      achievements: state.achievements,
    },
  };
}

export function validateBackupPayload(raw: unknown): raw is FocusForgeBackupPayload {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Partial<FocusForgeBackupPayload>;
  if (obj.app !== 'FOCUSFORGE-GATE-2027' || !obj.data || typeof obj.data !== 'object') {
    return false;
  }
  const d = obj.data;
  return (
    Boolean(d.settings) &&
    Array.isArray(d.timetable) &&
    Array.isArray(d.gateSubjects) &&
    Array.isArray(d.gateTopics) &&
    Array.isArray(d.roboticsSkills) &&
    Array.isArray(d.studySessions) &&
    Array.isArray(d.questions) &&
    Array.isArray(d.testAttempts) &&
    Array.isArray(d.revisions) &&
    Array.isArray(d.notes)
  );
}

export async function restoreFullBackup(payload: FocusForgeBackupPayload): Promise<void> {
  const { data } = payload;
  await Promise.all([
    replaceStoreContents('settings', [{ ...DEFAULT_USER_SETTINGS, ...data.settings, id: 'user-settings' }]),
    replaceStoreContents('timetable', data.timetable),
    replaceStoreContents('gateSubjects', data.gateSubjects),
    replaceStoreContents('gateTopics', data.gateTopics),
    replaceStoreContents('roboticsSkills', data.roboticsSkills),
    replaceStoreContents('studySessions', data.studySessions),
    replaceStoreContents('questions', data.questions),
    replaceStoreContents('testAttempts', data.testAttempts),
    replaceStoreContents('revisions', data.revisions),
    replaceStoreContents('notes', data.notes),
    replaceStoreContents('dailyReflections', data.dailyReflections ?? []),
    replaceStoreContents('weeklyReviews', data.weeklyReviews ?? []),
    replaceStoreContents('missedRecovery', data.missedRecovery ?? []),
    replaceStoreContents('achievements', data.achievements ?? []),
    deleteFromStore('timerState', 'active-timer'),
  ]);
}

export async function resetAllDataToDefaults(): Promise<void> {
  await Promise.all([
    replaceStoreContents('settings', [DEFAULT_USER_SETTINGS]),
    replaceStoreContents('timetable', buildInitialTimetable()),
    replaceStoreContents('gateSubjects', INITIAL_GATE_SUBJECTS),
    replaceStoreContents('gateTopics', INITIAL_GATE_TOPICS),
    replaceStoreContents('roboticsSkills', INITIAL_ROBOTICS_SKILLS),
    replaceStoreContents('studySessions', []),
    replaceStoreContents('questions', INITIAL_QUESTION_BANK),
    replaceStoreContents('testAttempts', []),
    replaceStoreContents('revisions', []),
    replaceStoreContents('notes', []),
    replaceStoreContents('dailyReflections', []),
    replaceStoreContents('weeklyReviews', []),
    replaceStoreContents('missedRecovery', []),
    replaceStoreContents('achievements', []),
    deleteFromStore('timerState', 'active-timer'),
  ]);
}

