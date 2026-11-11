import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActiveTimerState, StudyCategory, TimerMode, TimerPhase } from '../types';
import { useFocusForge } from './useFocusForgeStore';
import { getISTDateString } from '../utils/date';
import { generateId } from '../utils/id';
import { playCompletionChime, sendBrowserNotification } from '../utils/audio';

export interface StartSessionParams {
  mode: TimerMode;
  studyMinutes: number;
  breakMinutes: number;
  category: StudyCategory;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  objective: string;
  autoTransition?: boolean;
  openFocusScreen?: boolean;
}

interface StudyTimerContextValue {
  timer: ActiveTimerState | null;
  remainingMs: number;
  remainingSeconds: number;
  progressPercent: number;
  startSession: (params: StartSessionParams) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipBreak: () => void;
  extendBreak: (extraMinutes?: number) => void;
  transitionToBreakNow: () => void;
  endAndRecordSession: (opts?: { markTopicCompleted?: boolean; notesSnapshot?: string }) => Promise<boolean>;
  toggleAutoTransition: () => void;
  setFocusScreenOpen: (open: boolean) => void;
  phaseCompletionBanner: { phase: TimerPhase; message: string } | null;
  clearPhaseCompletionBanner: () => void;
}

const StudyTimerContext = createContext<StudyTimerContextValue | null>(null);

export const StudyTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isReady,
    initialTimerState,
    persistTimerState,
    recordStudySession,
    settings,
    pushToast,
    setFocusMode,
  } = useFocusForge();

  const [timer, setTimer] = useState<ActiveTimerState | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [phaseCompletionBanner, setPhaseCompletionBanner] = useState<{
    phase: TimerPhase;
    message: string;
  } | null>(null);

  const hydratedRef = useRef(false);
  const handlingCompletionRef = useRef(false);

  const updateAndPersist = useCallback(
    (next: ActiveTimerState | null) => {
      setTimer(next);
      persistTimerState(next).catch(console.error);
    },
    [persistTimerState]
  );

  // Hydrate timer once IndexedDB loads
  useEffect(() => {
    if (!isReady || hydratedRef.current) return;
    hydratedRef.current = true;
    if (initialTimerState) {
      setTimer(initialTimerState);
      if (initialTimerState.status === 'running' && initialTimerState.targetEndTimestamp) {
        setRemainingMs(Math.max(0, initialTimerState.targetEndTimestamp - Date.now()));
      } else if (initialTimerState.status === 'paused' && initialTimerState.pausedRemainingMs !== null) {
        setRemainingMs(initialTimerState.pausedRemainingMs);
      } else {
        setRemainingMs(initialTimerState.phaseDurationMs);
      }
    }
  }, [isReady, initialTimerState]);

  const computeActualStudySeconds = useCallback((state: ActiveTimerState, nowMs: number): number => {
    if (state.phase !== 'study') {
      return Math.round(state.accumulatedActiveMs / 1000);
    }
    let activeMs = state.accumulatedActiveMs;
    if (state.status === 'running' && state.lastResumeTimestamp) {
      activeMs += Math.max(0, nowMs - state.lastResumeTimestamp);
    }
    // Cap at planned phase duration to prevent inflated numbers if computer slept for hours
    return Math.min(
      Math.round(state.phaseDurationMs / 1000),
      Math.max(0, Math.round(activeMs / 1000))
    );
  }, []);

  const handlePhaseReachedZero = useCallback(
    async (current: ActiveTimerState) => {
      if (handlingCompletionRef.current) return;
      handlingCompletionRef.current = true;

      try {
        const nowMs = Date.now();
        const phaseKey = `${current.sessionInstanceId}:${current.phase}`;

        if (current.phase === 'study') {
          if (!current.recordedPhaseKeys.includes(phaseKey)) {
            const actualSeconds = Math.max(
              60,
              computeActualStudySeconds(current, current.targetEndTimestamp ?? nowMs)
            );
            const actualMinutes = Math.max(1, Math.round(actualSeconds / 60));
            await recordStudySession({
              id: generateId('sess'),
              sessionInstanceId: current.sessionInstanceId,
              category: current.category,
              subjectId: current.subjectId,
              subjectName: current.subjectName,
              topicId: current.topicId,
              topicName: current.topicName,
              objective: current.objective,
              timerMode: current.mode,
              plannedMinutes: current.studyDurationMinutes,
              actualMinutes,
              actualSeconds,
              startedAt: new Date(current.phaseStartedAt ?? nowMs - actualSeconds * 1000).toISOString(),
              endedAt: new Date(nowMs).toISOString(),
              dateIST: getISTDateString(new Date(nowMs)),
              completedFull: true,
              markedTopicCompleted: false,
            });
          }

          if (settings.soundEnabled) playCompletionChime('study-done');
          if (settings.browserNotificationsEnabled) {
            sendBrowserNotification(
              'Focus Session Complete — Great Work!',
              `Completed ${current.studyDurationMinutes}m on ${current.topicName}. Time for a ${current.breakDurationMinutes}m break.`
            );
          }

          pushToast(
            'Study Block Complete!',
            `${current.studyDurationMinutes}m logged for ${current.topicName}.`,
            'success'
          );

          const breakMs = current.breakDurationMinutes * 60_000;
          const nextKeys = current.recordedPhaseKeys.includes(phaseKey)
            ? current.recordedPhaseKeys
            : [...current.recordedPhaseKeys, phaseKey];

          const nextState: ActiveTimerState = {
            ...current,
            phase: 'break',
            status: current.autoTransition ? 'running' : 'paused',
            phaseDurationMs: breakMs,
            targetEndTimestamp: current.autoTransition ? nowMs + breakMs : null,
            pausedRemainingMs: current.autoTransition ? null : breakMs,
            phaseStartedAt: nowMs,
            accumulatedActiveMs: 0,
            lastResumeTimestamp: current.autoTransition ? nowMs : null,
            recordedPhaseKeys: nextKeys,
          };

          setPhaseCompletionBanner({
            phase: 'study',
            message: `Study session complete! ${current.breakDurationMinutes}-minute break ready.`,
          });
          setRemainingMs(breakMs);
          updateAndPersist(nextState);
        } else {
          // Break finished -> prepare fresh study cycle
          if (settings.soundEnabled) playCompletionChime('break-done');
          if (settings.browserNotificationsEnabled) {
            sendBrowserNotification(
              'Break Complete',
              `Ready for your next focus block on ${current.topicName}.`
            );
          }
          pushToast('Break Complete', 'Ready for the next focused study block.', 'info');

          const newSessionId = generateId('sessinst');
          const studyMs = current.studyDurationMinutes * 60_000;
          const nextState: ActiveTimerState = {
            ...current,
            sessionInstanceId: newSessionId,
            phase: 'study',
            status: current.autoTransition ? 'running' : 'paused',
            phaseDurationMs: studyMs,
            targetEndTimestamp: current.autoTransition ? nowMs + studyMs : null,
            pausedRemainingMs: current.autoTransition ? null : studyMs,
            phaseStartedAt: nowMs,
            accumulatedActiveMs: 0,
            lastResumeTimestamp: current.autoTransition ? nowMs : null,
            recordedPhaseKeys: [],
          };

          setPhaseCompletionBanner({
            phase: 'break',
            message: 'Break complete! Start your next study block whenever you are ready.',
          });
          setRemainingMs(studyMs);
          updateAndPersist(nextState);
        }
      } finally {
        handlingCompletionRef.current = false;
      }
    },
    [
      computeActualStudySeconds,
      recordStudySession,
      settings.soundEnabled,
      settings.browserNotificationsEnabled,
      pushToast,
      updateAndPersist,
    ]
  );

  // Clock-anchored timer sync (accurate even when browser tab was throttled or inactive)
  useEffect(() => {
    if (!timer) {
      setRemainingMs(0);
      return;
    }

    const syncFromSystemClock = () => {
      if (timer.status === 'running' && timer.targetEndTimestamp !== null) {
        const diff = timer.targetEndTimestamp - Date.now();
        if (diff <= 0) {
          setRemainingMs(0);
          handlePhaseReachedZero(timer);
        } else {
          setRemainingMs(diff);
        }
      } else if (timer.status === 'paused' && timer.pausedRemainingMs !== null) {
        setRemainingMs(timer.pausedRemainingMs);
      } else {
        setRemainingMs(timer.phaseDurationMs);
      }
    };

    syncFromSystemClock();
    const interval = window.setInterval(syncFromSystemClock, 250);
    const onVisibilityOrFocus = () => {
      syncFromSystemClock();
    };
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [timer, handlePhaseReachedZero]);

  const startSession = useCallback(
    (params: StartSessionParams) => {
      const nowMs = Date.now();
      const studyMs = Math.max(1, params.studyMinutes) * 60_000;
      const openFocus = params.openFocusScreen ?? false;
      const next: ActiveTimerState = {
        sessionInstanceId: generateId('sessinst'),
        mode: params.mode,
        phase: 'study',
        status: 'running',
        studyDurationMinutes: params.studyMinutes,
        breakDurationMinutes: params.breakMinutes,
        phaseDurationMs: studyMs,
        targetEndTimestamp: nowMs + studyMs,
        pausedRemainingMs: null,
        phaseStartedAt: nowMs,
        accumulatedActiveMs: 0,
        lastResumeTimestamp: nowMs,
        category: params.category,
        subjectId: params.subjectId,
        subjectName: params.subjectName,
        topicId: params.topicId,
        topicName: params.topicName,
        objective: params.objective,
        autoTransition: params.autoTransition ?? false,
        isFocusScreenOpen: openFocus,
        recordedPhaseKeys: [],
      };
      setPhaseCompletionBanner(null);
      setRemainingMs(studyMs);
      if (openFocus) setFocusMode(true);
      updateAndPersist(next);
    },
    [setFocusMode, updateAndPersist]
  );

  const pauseTimer = useCallback(() => {
    if (!timer || timer.status !== 'running' || timer.targetEndTimestamp === null) return;
    const nowMs = Date.now();
    const rem = Math.max(0, timer.targetEndTimestamp - nowMs);
    const deltaActive =
      timer.phase === 'study' && timer.lastResumeTimestamp
        ? Math.max(0, nowMs - timer.lastResumeTimestamp)
        : 0;
    const next: ActiveTimerState = {
      ...timer,
      status: 'paused',
      targetEndTimestamp: null,
      pausedRemainingMs: rem,
      accumulatedActiveMs: timer.accumulatedActiveMs + deltaActive,
      lastResumeTimestamp: null,
    };
    setRemainingMs(rem);
    updateAndPersist(next);
  }, [timer, updateAndPersist]);

  const resumeTimer = useCallback(() => {
    if (!timer || timer.status !== 'paused') return;
    const nowMs = Date.now();
    const rem = timer.pausedRemainingMs ?? timer.phaseDurationMs;
    const next: ActiveTimerState = {
      ...timer,
      status: 'running',
      targetEndTimestamp: nowMs + rem,
      pausedRemainingMs: null,
      lastResumeTimestamp: nowMs,
    };
    setPhaseCompletionBanner(null);
    updateAndPersist(next);
  }, [timer, updateAndPersist]);

  const resetTimer = useCallback(() => {
    if (!timer) return;
    const durMs =
      (timer.phase === 'study' ? timer.studyDurationMinutes : timer.breakDurationMinutes) * 60_000;
    const next: ActiveTimerState = {
      ...timer,
      status: 'paused',
      phaseDurationMs: durMs,
      targetEndTimestamp: null,
      pausedRemainingMs: durMs,
      accumulatedActiveMs: 0,
      lastResumeTimestamp: null,
    };
    setPhaseCompletionBanner(null);
    setRemainingMs(durMs);
    updateAndPersist(next);
  }, [timer, updateAndPersist]);

  const skipBreak = useCallback(() => {
    if (!timer) return;
    const nowMs = Date.now();
    const studyMs = timer.studyDurationMinutes * 60_000;
    const next: ActiveTimerState = {
      ...timer,
      sessionInstanceId: generateId('sessinst'),
      phase: 'study',
      status: 'paused',
      phaseDurationMs: studyMs,
      targetEndTimestamp: null,
      pausedRemainingMs: studyMs,
      phaseStartedAt: nowMs,
      accumulatedActiveMs: 0,
      lastResumeTimestamp: null,
      recordedPhaseKeys: [],
    };
    setPhaseCompletionBanner(null);
    setRemainingMs(studyMs);
    updateAndPersist(next);
  }, [timer, updateAndPersist]);

  const extendBreak = useCallback(
    (extraMinutes = 5) => {
      if (!timer || timer.phase !== 'break') return;
      const extraMs = extraMinutes * 60_000;
      const nowMs = Date.now();
      const currentRem =
        timer.status === 'running' && timer.targetEndTimestamp
          ? Math.max(0, timer.targetEndTimestamp - nowMs)
          : timer.pausedRemainingMs ?? 0;
      const newRem = currentRem + extraMs;
      const next: ActiveTimerState = {
        ...timer,
        phaseDurationMs: timer.phaseDurationMs + extraMs,
        targetEndTimestamp: timer.status === 'running' ? nowMs + newRem : null,
        pausedRemainingMs: timer.status === 'paused' ? newRem : null,
      };
      setRemainingMs(newRem);
      updateAndPersist(next);
    },
    [timer, updateAndPersist]
  );

  const transitionToBreakNow = useCallback(async () => {
    if (!timer || timer.phase !== 'study') return;
    const nowMs = Date.now();
    const phaseKey = `${timer.sessionInstanceId}:study`;
    const actualSeconds = computeActualStudySeconds(timer, nowMs);

    if (actualSeconds >= 60 && !timer.recordedPhaseKeys.includes(phaseKey)) {
      await recordStudySession({
        id: generateId('sess'),
        sessionInstanceId: timer.sessionInstanceId,
        category: timer.category,
        subjectId: timer.subjectId,
        subjectName: timer.subjectName,
        topicId: timer.topicId,
        topicName: timer.topicName,
        objective: timer.objective,
        timerMode: timer.mode,
        plannedMinutes: timer.studyDurationMinutes,
        actualMinutes: Math.max(1, Math.round(actualSeconds / 60)),
        actualSeconds,
        startedAt: new Date(timer.phaseStartedAt ?? nowMs - actualSeconds * 1000).toISOString(),
        endedAt: new Date(nowMs).toISOString(),
        dateIST: getISTDateString(new Date(nowMs)),
        completedFull: false,
        markedTopicCompleted: false,
      });
    }

    const breakMs = timer.breakDurationMinutes * 60_000;
    const next: ActiveTimerState = {
      ...timer,
      phase: 'break',
      status: 'running',
      phaseDurationMs: breakMs,
      targetEndTimestamp: nowMs + breakMs,
      pausedRemainingMs: null,
      phaseStartedAt: nowMs,
      accumulatedActiveMs: 0,
      lastResumeTimestamp: nowMs,
      recordedPhaseKeys: [...timer.recordedPhaseKeys, phaseKey],
    };
    setRemainingMs(breakMs);
    updateAndPersist(next);
  }, [timer, computeActualStudySeconds, recordStudySession, updateAndPersist]);

  const endAndRecordSession = useCallback(
    async (opts?: { markTopicCompleted?: boolean; notesSnapshot?: string }): Promise<boolean> => {
      if (!timer) return false;
      const nowMs = Date.now();
      const phaseKey = `${timer.sessionInstanceId}:study`;
      let saved = false;

      if (timer.phase === 'study' && !timer.recordedPhaseKeys.includes(phaseKey)) {
        const actualSeconds = computeActualStudySeconds(timer, nowMs);
        if (actualSeconds >= 1 || opts?.markTopicCompleted) {
          const actualMinutes = Math.max(1, Math.round(actualSeconds / 60));
          saved = await recordStudySession({
            id: generateId('sess'),
            sessionInstanceId: timer.sessionInstanceId,
            category: timer.category,
            subjectId: timer.subjectId,
            subjectName: timer.subjectName,
            topicId: timer.topicId,
            topicName: timer.topicName,
            objective: timer.objective,
            timerMode: timer.mode,
            plannedMinutes: timer.studyDurationMinutes,
            actualMinutes,
            actualSeconds,
            startedAt: new Date(timer.phaseStartedAt ?? nowMs - actualSeconds * 1000).toISOString(),
            endedAt: new Date(nowMs).toISOString(),
            dateIST: getISTDateString(new Date(nowMs)),
            completedFull: remainingMs <= 0,
            markedTopicCompleted: Boolean(opts?.markTopicCompleted),
            notesSnapshot: opts?.notesSnapshot,
          });
        }
      }

      setFocusMode(false);
      setPhaseCompletionBanner(null);
      setRemainingMs(0);
      updateAndPersist(null);

      if (saved) {
        pushToast(
          'Session Recorded',
          `Saved your focus progress on ${timer.topicName}.`,
          'success'
        );
      }
      return saved;
    },
    [timer, computeActualStudySeconds, recordStudySession, remainingMs, setFocusMode, updateAndPersist, pushToast]
  );

  const toggleAutoTransition = useCallback(() => {
    if (!timer) return;
    updateAndPersist({ ...timer, autoTransition: !timer.autoTransition });
  }, [timer, updateAndPersist]);

  const setFocusScreenOpen = useCallback(
    (open: boolean) => {
      if (!timer) return;
      setFocusMode(open);
      updateAndPersist({ ...timer, isFocusScreenOpen: open });
    },
    [timer, setFocusMode, updateAndPersist]
  );

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressPercent =
    timer && timer.phaseDurationMs > 0
      ? Math.min(100, Math.max(0, ((timer.phaseDurationMs - remainingMs) / timer.phaseDurationMs) * 100))
      : 0;

  return (
    <StudyTimerContext.Provider
      value={{
        timer,
        remainingMs,
        remainingSeconds,
        progressPercent,
        startSession,
        pauseTimer,
        resumeTimer,
        resetTimer,
        skipBreak,
        extendBreak,
        transitionToBreakNow,
        endAndRecordSession,
        toggleAutoTransition,
        setFocusScreenOpen,
        phaseCompletionBanner,
        clearPhaseCompletionBanner: () => setPhaseCompletionBanner(null),
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
};

export function useStudyTimer(): StudyTimerContextValue {
  const ctx = useContext(StudyTimerContext);
  if (!ctx) throw new Error('useStudyTimer must be used inside StudyTimerProvider');
  return ctx;
}

