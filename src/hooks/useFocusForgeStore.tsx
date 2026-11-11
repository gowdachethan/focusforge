import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AchievementUnlock,
  ActiveTimerState,
  DailyReflection,
  FocusForgeBackupPayload,
  GateSubject,
  GateTopic,
  MissedRecoveryEntry,
  NavSectionId,
  QuestionItem,
  RevisionItem,
  RoboticsSkill,
  StudyCategory,
  StudyNote,
  StudySessionRecord,
  TestAttemptRecord,
  TimetableSlot,
  TopicLearningStatus,
  UserSettings,
  WeeklyReview,
} from '../types';
import {
  deleteFromStore,
  exportFullBackup,
  initializeAndLoadDatabase,
  putInStore,
  putManyInStore,
  replaceStoreContents,
  resetAllDataToDefaults,
  restoreFullBackup,
  saveActiveTimerState,
} from '../db/indexedDb';
import { DEFAULT_USER_SETTINGS, buildInitialTimetable } from '../db/seedData';
import { addDaysToISTDateString, getISTDateString, getISTWeekStartMonday } from '../utils/date';
import { generateId } from '../utils/id';
import { computeRealAnalytics, generateSmartRecommendations, RealAnalyticsSummary, StudyRecommendation } from '../engine/recommendations';
import { ACHIEVEMENT_BADGES } from '../data/motivationData';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'info' | 'achievement';
}

export interface StudyLaunchPreset {
  category: StudyCategory;
  subjectId: string;
  topicId: string;
  objective?: string;
}

export interface TestLaunchPreset {
  subjectId: string;
  topicId: string;
}

interface FocusForgeContextValue {
  isReady: boolean;
  activeNav: NavSectionId;
  setActiveNav: (nav: NavSectionId) => void;
  focusMode: boolean;
  setFocusMode: (val: boolean) => void;
  now: Date;
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
  initialTimerState: ActiveTimerState | null;
  analytics: RealAnalyticsSummary;
  recommendations: StudyRecommendation;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  pushToast: (title: string, message: string, tone?: ToastNotification['tone']) => void;
  studyPreset: StudyLaunchPreset | null;
  setStudyPreset: (preset: StudyLaunchPreset | null) => void;
  testPreset: TestLaunchPreset | null;
  setTestPreset: (preset: TestLaunchPreset | null) => void;
  launchStartStudyWith: (preset: StudyLaunchPreset) => void;
  launchTestWith: (preset: TestLaunchPreset) => void;

  // Mutators backed directly by IndexedDB
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  saveTimetableSlot: (slot: TimetableSlot) => Promise<void>;
  saveTimetableSlotsBulk: (slots: TimetableSlot[]) => Promise<void>;
  deleteTimetableSlot: (id: string) => Promise<void>;
  resetTimetableToDefault: () => Promise<void>;
  updateGateTopic: (topicId: string, patch: Partial<GateTopic>) => Promise<void>;
  toggleGateSubtopic: (topicId: string, subtopicId: string) => Promise<void>;
  markTopicStatus: (topicId: string, status: TopicLearningStatus) => Promise<void>;
  updateRoboticsSkill: (skillId: string, patch: Partial<RoboticsSkill>) => Promise<void>;
  recordStudySession: (session: StudySessionRecord) => Promise<boolean>;
  addQuestion: (question: QuestionItem) => Promise<void>;
  importQuestions: (questions: QuestionItem[]) => Promise<number>;
  deleteQuestion: (id: string) => Promise<void>;
  recordTestAttempt: (attempt: TestAttemptRecord) => Promise<void>;
  advanceRevisionItem: (revisionId: string, outcome: 'revised' | 'restudy') => Promise<void>;
  addManualRevisionItem: (params: {
    topicId: string;
    subjectId: string;
    subjectName: string;
    topicTitle: string;
    category: StudyCategory;
    needsRetest?: boolean;
  }) => Promise<void>;
  saveNote: (note: StudyNote) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  saveDailyReflection: (reflection: DailyReflection) => Promise<void>;
  saveWeeklyReview: (review: WeeklyReview) => Promise<void>;
  saveMissedRecovery: (entry: MissedRecoveryEntry) => Promise<void>;
  persistTimerState: (timer: ActiveTimerState | null) => Promise<void>;
  exportBackupJson: () => Promise<FocusForgeBackupPayload>;
  restoreFromBackup: (payload: FocusForgeBackupPayload) => Promise<void>;
  resetDatabaseAll: () => Promise<void>;
}

const FocusForgeContext = createContext<FocusForgeContextValue | null>(null);

export const FocusForgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSectionId>('dashboard');
  const [focusMode, setFocusMode] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [gateSubjects, setGateSubjects] = useState<GateSubject[]>([]);
  const [gateTopics, setGateTopics] = useState<GateTopic[]>([]);
  const [roboticsSkills, setRoboticsSkills] = useState<RoboticsSkill[]>([]);
  const [studySessions, setStudySessions] = useState<StudySessionRecord[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [testAttempts, setTestAttempts] = useState<TestAttemptRecord[]>([]);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [dailyReflections, setDailyReflections] = useState<DailyReflection[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [missedRecovery, setMissedRecovery] = useState<MissedRecoveryEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementUnlock[]>([]);
  const [initialTimerState, setInitialTimerState] = useState<ActiveTimerState | null>(null);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [studyPreset, setStudyPreset] = useState<StudyLaunchPreset | null>(null);
  const [testPreset, setTestPreset] = useState<TestLaunchPreset | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, message: string, tone: ToastNotification['tone'] = 'info') => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, title, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);
    },
    []
  );

  const reloadAllFromDb = useCallback(async () => {
    const hydrated = await initializeAndLoadDatabase();
    setSettings(hydrated.settings);
    setTimetable(hydrated.timetable);
    setGateSubjects(hydrated.gateSubjects);
    setGateTopics(hydrated.gateTopics);
    setRoboticsSkills(hydrated.roboticsSkills);
    setStudySessions(hydrated.studySessions);
    setQuestions(hydrated.questions);
    setTestAttempts(hydrated.testAttempts);
    setRevisions(hydrated.revisions);
    setNotes(hydrated.notes);
    setDailyReflections(hydrated.dailyReflections);
    setWeeklyReviews(hydrated.weeklyReviews);
    setMissedRecovery(hydrated.missedRecovery);
    setAchievements(hydrated.achievements);
    setInitialTimerState(hydrated.timerState);
    setFocusMode(hydrated.settings.focusModeDefault);
    setIsReady(true);
  }, []);

  useEffect(() => {
    reloadAllFromDb().catch((err) => {
      console.error('Failed to hydrate FocusForge IndexedDB:', err);
      setIsReady(true);
    });
  }, [reloadAllFromDb]);

  // Live clock tick every second for Asia/Kolkata display & schedule alignment
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Apply light/dark theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const analytics = useMemo(
    () =>
      computeRealAnalytics({
        sessions: studySessions,
        gateSubjects,
        gateTopics,
        roboticsSkills,
        testAttempts,
        revisions,
        settings,
        now,
      }),
    [studySessions, gateSubjects, gateTopics, roboticsSkills, testAttempts, revisions, settings, now]
  );

  const recommendations = useMemo(
    () =>
      generateSmartRecommendations({
        analytics,
        gateSubjects,
        gateTopics,
        roboticsSkills,
        revisions,
        settings,
        todayIST: getISTDateString(now),
      }),
    [analytics, gateSubjects, gateTopics, roboticsSkills, revisions, settings, now]
  );

  // Check and unlock positive achievement badges based on real state
  const evaluateAchievements = useCallback(
    async (nextSessions: StudySessionRecord[], nextTopics: GateTopic[], nextTests: TestAttemptRecord[], nextRevs: RevisionItem[]) => {
      const unlockedSet = new Set(achievements.map((a) => a.id));
      const candidates: string[] = [];

      const totalMinutes = nextSessions.reduce((acc, s) => acc + s.actualMinutes, 0);
      const streak = computeRealAnalytics({
        sessions: nextSessions,
        gateSubjects,
        gateTopics: nextTopics,
        roboticsSkills,
        testAttempts: nextTests,
        revisions: nextRevs,
        settings,
      }).streakDays;

      if (nextSessions.length >= 1) candidates.push('first-session');
      if (totalMinutes >= 300) candidates.push('five-hours');
      if (totalMinutes >= 1500) candidates.push('twenty-five-hours');
      if (streak >= 3) candidates.push('streak-3');
      if (streak >= 7) candidates.push('streak-7');
      if (nextTopics.some((t) => t.status === 'completed')) candidates.push('first-topic-done');
      if (nextTests.length >= 1) candidates.push('first-test');
      if (nextTests.some((t) => t.totalQuestions >= 5 && t.accuracyPercent >= 80)) {
        candidates.push('accuracy-80');
      }
      if (nextRevs.reduce((acc, r) => acc + r.revisionCount, 0) >= 5) {
        candidates.push('revision-pro');
      }

      const newlyUnlocked = candidates.filter((id) => !unlockedSet.has(id));
      if (newlyUnlocked.length === 0) return;

      const records: AchievementUnlock[] = newlyUnlocked.map((id) => ({
        id,
        unlockedAt: new Date().toISOString(),
      }));
      await putManyInStore('achievements', records);
      setAchievements((prev) => [...prev, ...records]);
      for (const id of newlyUnlocked) {
        const def = ACHIEVEMENT_BADGES.find((b) => b.id === id);
        if (def) {
          pushToast(`Badge Unlocked: ${def.title}`, def.description, 'achievement');
        }
      }
    },
    [achievements, gateSubjects, roboticsSkills, settings, pushToast]
  );

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated: UserSettings = { ...prev, ...patch, id: 'user-settings' };
      putInStore('settings', updated).catch(console.error);
      return updated;
    });
  }, []);

  const saveTimetableSlot = useCallback(async (slot: TimetableSlot) => {
    await putInStore('timetable', slot);
    setTimetable((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      return exists ? prev.map((s) => (s.id === slot.id ? slot : s)) : [...prev, slot];
    });
  }, []);

  const saveTimetableSlotsBulk = useCallback(async (slots: TimetableSlot[]) => {
    await putManyInStore('timetable', slots);
    setTimetable((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      slots.forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    });
  }, []);

  const deleteTimetableSlot = useCallback(async (id: string) => {
    await deleteFromStore('timetable', id);
    setTimetable((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const resetTimetableToDefault = useCallback(async () => {
    const defaults = buildInitialTimetable();
    await replaceStoreContents('timetable', defaults);
    setTimetable(defaults);
    pushToast('Timetable Restored', 'Your Mon–Sat & Sunday study schedule has been reset.', 'info');
  }, [pushToast]);

  const scheduleRevisionForTopic = useCallback(
    async (topic: GateTopic) => {
      const existing = revisions.find((r) => r.topicId === topic.id);
      if (existing) return existing;
      const todayIST = getISTDateString();
      const intervals = settings.spacedRepetitionIntervals.length
        ? settings.spacedRepetitionIntervals
        : [1, 3, 7, 14, 30];
      const subj = gateSubjects.find((s) => s.id === topic.subjectId);
      const rev: RevisionItem = {
        id: `rev-${topic.id}`,
        topicId: topic.id,
        subjectId: topic.subjectId,
        subjectName: subj?.shortName ?? topic.subjectId,
        topicTitle: topic.title,
        category: 'GATE',
        completedDateIST: todayIST,
        intervals,
        currentStepIndex: 0,
        nextDueDateIST: addDaysToISTDateString(todayIST, intervals[0] ?? 1),
        revisionCount: 0,
        needsRetest: false,
        status: 'active',
      };
      await putInStore('revisions', rev);
      setRevisions((prev) => [...prev, rev]);
      return rev;
    },
    [revisions, settings.spacedRepetitionIntervals, gateSubjects]
  );

  const updateGateTopic = useCallback(async (topicId: string, patch: Partial<GateTopic>) => {
    let updatedTopic: GateTopic | undefined;
    setGateTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        updatedTopic = { ...t, ...patch };
        return updatedTopic;
      })
    );
    if (updatedTopic) {
      await putInStore('gateTopics', updatedTopic);
    }
  }, []);

  const markTopicStatus = useCallback(
    async (topicId: string, status: TopicLearningStatus) => {
      const target = gateTopics.find((t) => t.id === topicId);
      if (!target) return;
      const nowIso = new Date().toISOString();
      const updated: GateTopic = {
        ...target,
        status,
        completedAt: status === 'completed' ? nowIso : target.completedAt,
        flaggedWeak: status === 'needs-review' ? true : target.flaggedWeak,
      };
      await putInStore('gateTopics', updated);
      const nextTopics = gateTopics.map((t) => (t.id === topicId ? updated : t));
      setGateTopics(nextTopics);

      let nextRevs = revisions;
      if (status === 'completed') {
        const created = await scheduleRevisionForTopic(updated);
        if (!revisions.some((r) => r.id === created.id)) {
          nextRevs = [...revisions, created];
        }
        pushToast(
          'Topic Completed & Revision Scheduled',
          `"${updated.title}" added to Spaced Repetition (Day 1, 3, 7, 14, 30).`,
          'success'
        );
      }
      await evaluateAchievements(studySessions, nextTopics, testAttempts, nextRevs);
    },
    [gateTopics, revisions, scheduleRevisionForTopic, pushToast, evaluateAchievements, studySessions, testAttempts]
  );

  const toggleGateSubtopic = useCallback(
    async (topicId: string, subtopicId: string) => {
      const target = gateTopics.find((t) => t.id === topicId);
      if (!target) return;
      const updatedSubtopics = target.subtopics.map((st) =>
        st.id === subtopicId ? { ...st, completed: !st.completed } : st
      );
      const allDone = updatedSubtopics.length > 0 && updatedSubtopics.every((s) => s.completed);
      const anyDone = updatedSubtopics.some((s) => s.completed);
      const nextStatus: TopicLearningStatus = allDone
        ? 'completed'
        : anyDone && target.status === 'not-started'
          ? 'in-progress'
          : target.status;

      const updated: GateTopic = {
        ...target,
        subtopics: updatedSubtopics,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : target.completedAt,
      };
      await putInStore('gateTopics', updated);
      const nextTopics = gateTopics.map((t) => (t.id === topicId ? updated : t));
      setGateTopics(nextTopics);

      if (nextStatus === 'completed' && target.status !== 'completed') {
        await scheduleRevisionForTopic(updated);
        pushToast(
          'All Subtopics Checked!',
          `"${updated.title}" marked complete and scheduled for spaced repetition.`,
          'success'
        );
      }
    },
    [gateTopics, scheduleRevisionForTopic, pushToast]
  );

  const updateRoboticsSkill = useCallback(async (skillId: string, patch: Partial<RoboticsSkill>) => {
    const existing = roboticsSkills.find((s) => s.id === skillId);
    if (!existing) return;
    const updated = { ...existing, ...patch };
    await putInStore('roboticsSkills', updated);
    setRoboticsSkills((prev) => prev.map((s) => (s.id === skillId ? updated : s)));
  }, [roboticsSkills]);

  const recordStudySession = useCallback(
    async (session: StudySessionRecord): Promise<boolean> => {
      // Prevent duplicate session records by checking both id and sessionInstanceId
      const duplicate = studySessions.some(
        (s) => s.id === session.id || s.sessionInstanceId === session.sessionInstanceId
      );
      if (duplicate) return false;

      await putInStore('studySessions', session);
      const nextSessions = [session, ...studySessions];
      setStudySessions(nextSessions);

      // Update topic or skill studyMinutes and status
      let nextTopics = gateTopics;
      if (session.category === 'GATE') {
        const topic = gateTopics.find((t) => t.id === session.topicId);
        if (topic) {
          const updatedTopic: GateTopic = {
            ...topic,
            studyMinutes: topic.studyMinutes + session.actualMinutes,
            lastStudiedAt: session.endedAt,
            status:
              session.markedTopicCompleted
                ? 'completed'
                : topic.status === 'not-started'
                  ? 'in-progress'
                  : topic.status,
            completedAt: session.markedTopicCompleted ? session.endedAt : topic.completedAt,
          };
          await putInStore('gateTopics', updatedTopic);
          nextTopics = gateTopics.map((t) => (t.id === topic.id ? updatedTopic : t));
          setGateTopics(nextTopics);
          if (session.markedTopicCompleted) {
            await scheduleRevisionForTopic(updatedTopic);
          }
        }
      } else {
        const skill = roboticsSkills.find((s) => s.id === session.subjectId);
        if (skill) {
          const updatedSkill: RoboticsSkill = {
            ...skill,
            studyMinutes: skill.studyMinutes + session.actualMinutes,
            lastStudiedAt: session.endedAt,
          };
          await putInStore('roboticsSkills', updatedSkill);
          setRoboticsSkills((prev) => prev.map((s) => (s.id === skill.id ? updatedSkill : s)));
        }
      }

      await evaluateAchievements(nextSessions, nextTopics, testAttempts, revisions);
      return true;
    },
    [
      studySessions,
      gateTopics,
      roboticsSkills,
      scheduleRevisionForTopic,
      evaluateAchievements,
      testAttempts,
      revisions,
    ]
  );

  const addQuestion = useCallback(async (question: QuestionItem) => {
    await putInStore('questions', question);
    setQuestions((prev) => [question, ...prev]);
  }, []);

  const importQuestions = useCallback(
    async (incoming: QuestionItem[]): Promise<number> => {
      if (incoming.length === 0) return 0;
      await putManyInStore('questions', incoming);
      setQuestions((prev) => {
        const map = new Map(prev.map((q) => [q.id, q]));
        incoming.forEach((q) => map.set(q.id, q));
        return Array.from(map.values());
      });
      return incoming.length;
    },
    []
  );

  const deleteQuestion = useCallback(async (id: string) => {
    await deleteFromStore('questions', id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const recordTestAttempt = useCallback(
    async (attempt: TestAttemptRecord) => {
      await putInStore('testAttempts', attempt);
      const nextTests = [attempt, ...testAttempts];
      setTestAttempts(nextTests);

      // Update weak-topic flags & revision triggers based on real performance
      const topicResults = new Map<string, { attempted: number; correct: number }>();
      for (const r of attempt.responses) {
        if (!r.isAttempted) continue;
        const curr = topicResults.get(r.topicId) ?? { attempted: 0, correct: 0 };
        curr.attempted += 1;
        if (r.isCorrect) curr.correct += 1;
        topicResults.set(r.topicId, curr);
      }

      const updatedTopics: GateTopic[] = [];
      for (const t of gateTopics) {
        const res = topicResults.get(t.id);
        if (!res || res.attempted === 0) continue;
        const acc = (res.correct / res.attempted) * 100;
        if (acc < 60 && !t.flaggedWeak) {
          const flagged = { ...t, flaggedWeak: true };
          updatedTopics.push(flagged);
        } else if (acc >= 80 && t.flaggedWeak) {
          const cleared = { ...t, flaggedWeak: false };
          updatedTopics.push(cleared);
        }
      }
      if (updatedTopics.length > 0) {
        await putManyInStore('gateTopics', updatedTopics);
        const updMap = new Map(updatedTopics.map((u) => [u.id, u]));
        setGateTopics((prev) => prev.map((t) => updMap.get(t.id) ?? t));
      }

      // Flag any revision item for weak topics as needing retest
      const weakSet = new Set(attempt.weakTopicIds);
      const revUpdates: RevisionItem[] = [];
      for (const r of revisions) {
        if (weakSet.has(r.topicId) && !r.needsRetest) {
          revUpdates.push({ ...r, needsRetest: true });
        }
      }
      if (revUpdates.length > 0) {
        await putManyInStore('revisions', revUpdates);
        const rMap = new Map(revUpdates.map((r) => [r.id, r]));
        setRevisions((prev) => prev.map((r) => rMap.get(r.id) ?? r));
      }

      await evaluateAchievements(studySessions, gateTopics, nextTests, revisions);
    },
    [testAttempts, gateTopics, revisions, evaluateAchievements, studySessions]
  );

  const advanceRevisionItem = useCallback(
    async (revisionId: string, outcome: 'revised' | 'restudy') => {
      const item = revisions.find((r) => r.id === revisionId);
      if (!item) return;
      const todayIST = getISTDateString();
      let updated: RevisionItem;

      if (outcome === 'restudy') {
        const firstInterval = item.intervals[0] ?? 1;
        updated = {
          ...item,
          currentStepIndex: 0,
          nextDueDateIST: addDaysToISTDateString(todayIST, firstInterval),
          lastRevisedDateIST: todayIST,
          revisionCount: item.revisionCount + 1,
          status: 'active',
        };
      } else {
        const nextStep = item.currentStepIndex + 1;
        if (nextStep >= item.intervals.length) {
          updated = {
            ...item,
            currentStepIndex: item.intervals.length - 1,
            lastRevisedDateIST: todayIST,
            revisionCount: item.revisionCount + 1,
            needsRetest: false,
            status: 'mastered',
          };
        } else {
          const daysGap = item.intervals[nextStep] ?? 7;
          updated = {
            ...item,
            currentStepIndex: nextStep,
            nextDueDateIST: addDaysToISTDateString(todayIST, daysGap),
            lastRevisedDateIST: todayIST,
            revisionCount: item.revisionCount + 1,
            needsRetest: false,
            status: 'active',
          };
        }
      }

      await putInStore('revisions', updated);
      const nextRevs = revisions.map((r) => (r.id === revisionId ? updated : r));
      setRevisions(nextRevs);
      await evaluateAchievements(studySessions, gateTopics, testAttempts, nextRevs);
      pushToast(
        outcome === 'revised' ? 'Revision Logged' : 'Scheduled for Fresh Review',
        outcome === 'revised'
          ? updated.status === 'mastered'
            ? `"${item.topicTitle}" completed full spaced-repetition cycle!`
            : `Next review for "${item.topicTitle}" set for ${updated.nextDueDateIST}.`
          : `"${item.topicTitle}" reset to Day 1 interval (${updated.nextDueDateIST}).`,
        'success'
      );
    },
    [revisions, evaluateAchievements, studySessions, gateTopics, testAttempts, pushToast]
  );

  const addManualRevisionItem = useCallback(
    async (params: {
      topicId: string;
      subjectId: string;
      subjectName: string;
      topicTitle: string;
      category: StudyCategory;
      needsRetest?: boolean;
    }) => {
      const todayIST = getISTDateString();
      const existing = revisions.find((r) => r.topicId === params.topicId);
      const intervals = settings.spacedRepetitionIntervals.length
        ? settings.spacedRepetitionIntervals
        : [1, 3, 7, 14, 30];

      const item: RevisionItem = existing
        ? {
            ...existing,
            status: 'active',
            currentStepIndex: 0,
            nextDueDateIST: todayIST,
            needsRetest: params.needsRetest ?? existing.needsRetest,
          }
        : {
            id: `rev-${params.topicId}`,
            topicId: params.topicId,
            subjectId: params.subjectId,
            subjectName: params.subjectName,
            topicTitle: params.topicTitle,
            category: params.category,
            completedDateIST: todayIST,
            intervals,
            currentStepIndex: 0,
            nextDueDateIST: todayIST,
            revisionCount: 0,
            needsRetest: params.needsRetest ?? false,
            status: 'active',
          };

      await putInStore('revisions', item);
      setRevisions((prev) => {
        const exists = prev.some((r) => r.id === item.id);
        return exists ? prev.map((r) => (r.id === item.id ? item : r)) : [...prev, item];
      });
    },
    [revisions, settings.spacedRepetitionIntervals]
  );

  const saveNote = useCallback(async (note: StudyNote) => {
    await putInStore('notes', note);
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      return exists ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev];
    });
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    await deleteFromStore('notes', noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  const saveDailyReflection = useCallback(async (reflection: DailyReflection) => {
    await putInStore('dailyReflections', reflection);
    setDailyReflections((prev) => {
      const exists = prev.some((r) => r.id === reflection.id);
      return exists
        ? prev.map((r) => (r.id === reflection.id ? reflection : r))
        : [reflection, ...prev];
    });
  }, []);

  const saveWeeklyReview = useCallback(async (review: WeeklyReview) => {
    await putInStore('weeklyReviews', review);
    setWeeklyReviews((prev) => {
      const exists = prev.some((r) => r.id === review.id);
      return exists
        ? prev.map((r) => (r.id === review.id ? review : r))
        : [review, ...prev];
    });
  }, []);

  const saveMissedRecovery = useCallback(async (entry: MissedRecoveryEntry) => {
    await putInStore('missedRecovery', entry);
    setMissedRecovery((prev) => {
      const exists = prev.some((m) => m.id === entry.id);
      return exists ? prev.map((m) => (m.id === entry.id ? entry : m)) : [...prev, entry];
    });
  }, []);

  const persistTimerState = useCallback(async (timer: ActiveTimerState | null) => {
    await saveActiveTimerState(timer);
  }, []);

  const exportBackupJson = useCallback(async () => {
    return exportFullBackup();
  }, []);

  const restoreFromBackup = useCallback(
    async (payload: FocusForgeBackupPayload) => {
      await restoreFullBackup(payload);
      await reloadAllFromDb();
      pushToast('Backup Restored', 'All FocusForge data was restored from your backup file.', 'success');
    },
    [reloadAllFromDb, pushToast]
  );

  const resetDatabaseAll = useCallback(async () => {
    await resetAllDataToDefaults();
    await reloadAllFromDb();
    pushToast('Workspace Reset', 'FocusForge has been restored to a fresh clean state.', 'info');
  }, [reloadAllFromDb, pushToast]);

  const launchStartStudyWith = useCallback((preset: StudyLaunchPreset) => {
    setStudyPreset(preset);
    setActiveNav('start-study');
  }, []);

  const launchTestWith = useCallback((preset: TestLaunchPreset) => {
    setTestPreset(preset);
    setActiveNav('practice-tests');
  }, []);

  // Expose helper to get current IST week start cleanly if needed
  void getISTWeekStartMonday;

  return (
    <FocusForgeContext.Provider
      value={{
        isReady,
        activeNav,
        setActiveNav,
        focusMode,
        setFocusMode,
        now,
        settings,
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
        initialTimerState,
        analytics,
        recommendations,
        toasts,
        dismissToast,
        pushToast,
        studyPreset,
        setStudyPreset,
        testPreset,
        setTestPreset,
        launchStartStudyWith,
        launchTestWith,
        updateSettings,
        saveTimetableSlot,
        saveTimetableSlotsBulk,
        deleteTimetableSlot,
        resetTimetableToDefault,
        updateGateTopic,
        toggleGateSubtopic,
        markTopicStatus,
        updateRoboticsSkill,
        recordStudySession,
        addQuestion,
        importQuestions,
        deleteQuestion,
        recordTestAttempt,
        advanceRevisionItem,
        addManualRevisionItem,
        saveNote,
        deleteNote,
        saveDailyReflection,
        saveWeeklyReview,
        saveMissedRecovery,
        persistTimerState,
        exportBackupJson,
        restoreFromBackup,
        resetDatabaseAll,
      }}
    >
      {children}
    </FocusForgeContext.Provider>
  );
};

export function useFocusForge(): FocusForgeContextValue {
  const ctx = useContext(FocusForgeContext);
  if (!ctx) throw new Error('useFocusForge must be used inside FocusForgeProvider');
  return ctx;
}

