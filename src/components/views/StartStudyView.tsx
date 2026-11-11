import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coffee,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  SkipForward,
  Square,
  StickyNote,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { useStudyTimer } from '../../hooks/useStudyTimer';
import { StudyCategory, TimerMode } from '../../types';
import { CircularProgress } from '../common/CircularProgress';
import { formatDurationMMSS } from '../../utils/date';
import { generateId } from '../../utils/id';

export const StartStudyView: React.FC = () => {
  const {
    settings,
    gateSubjects,
    gateTopics,
    roboticsSkills,
    studyPreset,
    setStudyPreset,
    markTopicStatus,
    updateRoboticsSkill,
    saveNote,
    pushToast,
    setFocusMode,
  } = useFocusForge();

  const {
    timer,
    remainingSeconds,
    progressPercent,
    startSession,
    pauseTimer,
    resumeTimer,
    transitionToBreakNow,
    skipBreak,
    extendBreak,
    endAndRecordSession,
    setFocusScreenOpen,
    phaseCompletionBanner,
    clearPhaseCompletionBanner,
  } = useStudyTimer();

  // Launcher form state
  const [category, setCategory] = useState<StudyCategory>(
    studyPreset?.category ?? 'GATE'
  );
  const [subjectId, setSubjectId] = useState<string>(
    studyPreset?.subjectId ?? 'gate-robotics'
  );
  const [topicId, setTopicId] = useState<string>(
    studyPreset?.topicId ?? 'robo-classification-kinematics'
  );
  const [objective, setObjective] = useState<string>(studyPreset?.objective ?? '');
  const [timerMode, setTimerMode] = useState<TimerMode>('standard');
  const [customStudyMinutes, setCustomStudyMinutes] = useState<number>(
    settings.standardStudyMin
  );
  const [customBreakMinutes, setCustomBreakMinutes] = useState<number>(
    settings.standardBreakMin
  );
  const [formError, setFormError] = useState<string>('');

  // In-session scratch/persistent notes
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [topicMarkedDone, setTopicMarkedDone] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync preset if triggered from Dashboard / Timetable / Subjects
  useEffect(() => {
    if (!studyPreset) return;
    setCategory(studyPreset.category);
    setSubjectId(studyPreset.subjectId);
    setTopicId(studyPreset.topicId);
    if (studyPreset.objective) setObjective(studyPreset.objective);
    setStudyPreset(null);
  }, [studyPreset, setStudyPreset]);

  // Keep default study/break durations aligned when mode chips are clicked
  const selectMode = (m: TimerMode) => {
    setTimerMode(m);
    if (m === 'pomodoro') {
      setCustomStudyMinutes(settings.pomodoroStudyMin);
      setCustomBreakMinutes(settings.pomodoroBreakMin);
    } else if (m === 'standard') {
      setCustomStudyMinutes(settings.standardStudyMin);
      setCustomBreakMinutes(settings.standardBreakMin);
    } else if (m === 'deep-work') {
      setCustomStudyMinutes(settings.deepWorkStudyMin);
      setCustomBreakMinutes(settings.deepWorkBreakMin);
    } else {
      setCustomStudyMinutes(settings.customStudyMin);
      setCustomBreakMinutes(settings.customBreakMin);
    }
  };

  const subjectOptions = useMemo(() => {
    return category === 'GATE'
      ? gateSubjects.map((s) => ({ id: s.id, name: s.name }))
      : roboticsSkills.map((sk) => ({ id: sk.id, name: sk.name }));
  }, [category, gateSubjects, roboticsSkills]);

  const topicOptions = useMemo(() => {
    if (category === 'GATE') {
      return gateTopics
        .filter((t) => t.subjectId === subjectId)
        .map((t) => ({
          id: t.id,
          name: t.title,
          badge: t.status === 'completed' ? 'Done' : t.flaggedWeak ? 'Weak' : undefined,
        }));
    }
    const sk = roboticsSkills.find((s) => s.id === subjectId);
    return (
      sk?.roadmap.map((r) => ({
        id: r.id,
        name: `[${r.level}] ${r.title}`,
        badge: r.completed ? 'Done' : undefined,
      })) ?? []
    );
  }, [category, subjectId, gateTopics, roboticsSkills]);

  const handleCategoryChange = (nextCat: StudyCategory) => {
    setCategory(nextCat);
    if (nextCat === 'GATE') {
      const s = gateSubjects[0];
      setSubjectId(s.id);
      const t = gateTopics.find((gt) => gt.subjectId === s.id);
      setTopicId(t?.id ?? '');
    } else {
      const sk = roboticsSkills[0];
      setSubjectId(sk.id);
      setTopicId(sk.roadmap[0]?.id ?? sk.id);
    }
  };

  const handleSubjectChange = (nextSubjId: string) => {
    setSubjectId(nextSubjId);
    if (category === 'GATE') {
      const t = gateTopics.find((gt) => gt.subjectId === nextSubjId);
      setTopicId(t?.id ?? '');
    } else {
      const sk = roboticsSkills.find((s) => s.id === nextSubjId);
      setTopicId(sk?.roadmap[0]?.id ?? nextSubjId);
    }
  };

  const handleLaunchFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !topicId) {
      setFormError('Please select both a subject and topic.');
      return;
    }
    if (!objective.trim()) {
      setFormError("Please enter today's learning objective before starting.");
      return;
    }
    if (customStudyMinutes < 1 || customStudyMinutes > 360) {
      setFormError('Study duration must be between 1 and 360 minutes.');
      return;
    }
    setFormError('');
    setTopicMarkedDone(false);
    setSessionNotes('');

    const subjName =
      subjectOptions.find((s) => s.id === subjectId)?.name ?? subjectId;
    const topName =
      topicOptions.find((t) => t.id === topicId)?.name ?? topicId;

    startSession({
      mode: timerMode,
      studyMinutes: customStudyMinutes,
      breakMinutes: Math.max(1, customBreakMinutes),
      category,
      subjectId,
      subjectName: subjName,
      topicId,
      topicName: topName,
      objective: objective.trim(),
      autoTransition: false,
      openFocusScreen: true,
    });
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen restricted by browser policy
    }
  };

  const handleSaveSessionNote = async () => {
    if (!timer || !sessionNotes.trim()) {
      pushToast('Empty Note', 'Write something in the session notes first.', 'info');
      return;
    }
    await saveNote({
      id: generateId('note'),
      category: timer.category,
      subjectId: timer.subjectId,
      subjectName: timer.subjectName,
      topicId: timer.topicId,
      topicName: timer.topicName,
      title: `Session Note: ${timer.topicName}`,
      explanation: sessionNotes.trim(),
      formulas: '',
      youtubeLinks: [],
      nptelLinks: [],
      attachments: [],
      tags: ['focus-session', timer.category],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    pushToast('Note Saved', 'Added to Notes & Resources under this topic.', 'success');
  };

  const handleMarkTopicCompletedInSession = async () => {
    if (!timer) return;
    if (timer.category === 'GATE') {
      await markTopicStatus(timer.topicId, 'completed');
    } else {
      const sk = roboticsSkills.find((s) => s.id === timer.subjectId);
      if (sk) {
        await updateRoboticsSkill(sk.id, {
          roadmap: sk.roadmap.map((r) =>
            r.id === timer.topicId ? { ...r, completed: true } : r
          ),
        });
        pushToast('Roadmap Step Completed', `${timer.topicName} checked off!`, 'success');
      }
    }
    setTopicMarkedDone(true);
  };

  const handleEndSession = async () => {
    if (sessionNotes.trim() && timer) {
      await saveNote({
        id: generateId('note'),
        category: timer.category,
        subjectId: timer.subjectId,
        subjectName: timer.subjectName,
        topicId: timer.topicId,
        topicName: timer.topicName,
        title: `Session Note: ${timer.topicName}`,
        explanation: sessionNotes.trim(),
        formulas: '',
        youtubeLinks: [],
        nptelLinks: [],
        attachments: [],
        tags: ['focus-session'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await endAndRecordSession({
      markTopicCompleted: topicMarkedDone,
      notesSnapshot: sessionNotes.trim() || undefined,
    });
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ==================== DISTRACTION-FREE FOCUS SCREEN ====================
  if (timer) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-2">
        {phaseCompletionBanner && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-emerald-200">
                {phaseCompletionBanner.message}
              </p>
            </div>
            <button
              type="button"
              onClick={clearPhaseCompletionBanner}
              className="text-xs font-semibold text-emerald-300 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 sm:p-8 shadow-xl">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  timer.phase === 'study'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                }`}
              >
                {timer.phase === 'study' ? 'Deep Focus Session' : 'Restorative Break'}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {timer.subjectName} — {timer.topicName}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Objective: <span className="font-semibold text-slate-800 dark:text-slate-100">{timer.objective}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !timer.isFocusScreenOpen;
                  setFocusScreenOpen(nextOpen);
                  setFocusMode(nextOpen);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {timer.isFocusScreenOpen ? 'Show Sidebar' : 'Hide Sidebar'}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300"
                title="Toggle Fullscreen"
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Large Circular Timer */}
          <div className="flex flex-col items-center justify-center py-4">
            <CircularProgress
              percent={progressPercent}
              size={250}
              strokeWidth={14}
              progressColor={timer.phase === 'study' ? 'stroke-blue-500' : 'stroke-emerald-500'}
            >
              <span className="text-5xl font-extrabold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatDurationMMSS(remainingSeconds)}
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-2">
                {timer.status === 'running' ? 'In Progress' : 'Paused'}
              </span>
            </CircularProgress>

            {/* Primary Timer Controls */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {timer.status === 'running' ? (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeTimer}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </button>
              )}

              {timer.phase === 'study' ? (
                <button
                  type="button"
                  onClick={transitionToBreakNow}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition"
                >
                  <Coffee className="w-4 h-4" />
                  Take Break Now
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => extendBreak(5)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-navy-800 text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Extend Break +5m
                  </button>
                  <button
                    type="button"
                    onClick={skipBreak}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 text-sm font-semibold"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip Break
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleMarkTopicCompletedInSession}
                disabled={topicMarkedDone}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  topicMarkedDone
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-100 dark:bg-navy-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {topicMarkedDone ? 'Topic Completed!' : 'Mark Topic Completed'}
              </button>

              <button
                type="button"
                onClick={handleEndSession}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-navy-800 dark:hover:bg-navy-700 text-white text-sm font-semibold transition"
              >
                <Square className="w-4 h-4 fill-current" />
                End & Record Session
              </button>
            </div>
          </div>

          {/* Integrated Focus Notes */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-blue-500" />
                Session Notes & Key Formulas
              </label>
              <button
                type="button"
                onClick={handleSaveSessionNote}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Save to Notes Manager now
              </button>
            </div>
            <textarea
              rows={4}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Capture derivations, formulas, tricky edge cases, or doubts while staying in focus..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }

  // ==================== PRE-SESSION LAUNCHER ====================
  return (
    <div className="max-w-3xl mx-auto">
      <form
        onSubmit={handleLaunchFocus}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Smart Study Session Launcher
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Set a clear target before starting your clock. Completed sessions are automatically persisted and credited to your real analytics.
          </p>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-500">
            {formError}
          </div>
        )}

        {/* 1. Category */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            1. Select Study Category
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['GATE', 'Robotics & AI'] as StudyCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition ${
                  category === cat
                    ? cat === 'GATE'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
                      : 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat === 'GATE' ? 'GATE 2027 RA (75% Core)' : 'Robotics & AI Skills (25% Practical)'}
              </button>
            ))}
          </div>
        </div>

        {/* 2 & 3. Subject & Topic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              2. Select {category === 'GATE' ? 'Subject' : 'Skill'}
            </label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              3. Select {category === 'GATE' ? 'Topic' : 'Roadmap Module'}
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {topicOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.badge ? `(${t.badge})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Objective */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            4. Today's Learning Objective *
          </label>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g., Master 3D homogeneous transformation matrices and solve 10 practice problems"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              'Complete concept notes & derivations',
              'Solve 15 numerical problems',
              'Build & verify code implementation',
              'Formula recall & weak-topic review',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setObjective(preset)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-[11px] font-medium text-slate-600 dark:text-slate-300"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* 5 & 6. Timer Mode & Duration */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            5. Timer Mode & Study Duration
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            {(
              [
                { id: 'pomodoro', label: 'Pomodoro', sub: `${settings.pomodoroStudyMin}m / ${settings.pomodoroBreakMin}m` },
                { id: 'standard', label: 'Standard', sub: `${settings.standardStudyMin}m / ${settings.standardBreakMin}m` },
                { id: 'deep-work', label: 'Deep Work', sub: `${settings.deepWorkStudyMin}m / ${settings.deepWorkBreakMin}m` },
                { id: 'custom', label: 'Custom', sub: 'Any duration' },
              ] as { id: TimerMode; label: string; sub: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMode(m.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  timerMode === m.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">{m.label}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{m.sub}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Study Duration (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={360}
                value={customStudyMinutes}
                onChange={(e) => {
                  setCustomStudyMinutes(Number(e.target.value));
                  setTimerMode('custom');
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-sm font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={customBreakMinutes}
                onChange={(e) => {
                  setCustomBreakMinutes(Number(e.target.value));
                  setTimerMode('custom');
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-sm font-mono font-semibold"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 inline-flex items-center justify-center gap-2 transition"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Focus Session
        </button>
      </form>
    </div>
  );
};

