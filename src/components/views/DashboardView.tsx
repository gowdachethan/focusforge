import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  Flame,
  Pause,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer as TimerIcon,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { useStudyTimer } from '../../hooks/useStudyTimer';
import {
  diffISTDateDays,
  formatDurationMMSS,
  formatHHMM12Hour,
  formatMinutesHuman,
  getISTDateString,
  getISTDayOfWeek,
  getISTTimeParts,
  parseHHMMToMinutes,
} from '../../utils/date';
import { getDailyMotivation } from '../../data/motivationData';
import { CircularProgress } from '../common/CircularProgress';
import { StudyCategory } from '../../types';

export const DashboardView: React.FC = () => {
  const {
    now,
    settings,
    timetable,
    gateSubjects,
    gateTopics,
    roboticsSkills,
    revisions,
    studySessions,
    testAttempts,
    dailyReflections,
    missedRecovery,
    achievements,
    analytics,
    recommendations,
    setActiveNav,
    launchStartStudyWith,
    launchTestWith,
    saveDailyReflection,
    saveMissedRecovery,
    pushToast,
  } = useFocusForge();

  const { timer, remainingSeconds, progressPercent, pauseTimer, resumeTimer } = useStudyTimer();

  const todayIST = getISTDateString(now);
  const istDay = getISTDayOfWeek(now);
  const istTime = getISTTimeParts(now);
  const nowMinutes = istTime.minutesSinceMidnight;

  // Override Recommendation State
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideCat, setOverrideCat] = useState<StudyCategory>(
    recommendations.nextStudy.category
  );
  const [overrideSubjectId, setOverrideSubjectId] = useState<string>(
    recommendations.nextStudy.subjectId
  );
  const [overrideTopicId, setOverrideTopicId] = useState<string>(
    recommendations.nextStudy.topicId
  );

  // Daily Reflection Quick State
  const existingReflection = dailyReflections.find((r) => r.dateIST === todayIST);
  const [winsInput, setWinsInput] = useState(existingReflection?.wins ?? '');
  const [nextStepInput, setNextStepInput] = useState(
    existingReflection?.blockersOrNextStep ?? ''
  );
  const [clarityRating, setClarityRating] = useState<1 | 2 | 3 | 4 | 5>(
    existingReflection?.clarityRating ?? 4
  );

  const todaySlots = useMemo(() => {
    return timetable
      .filter((s) => s.day === istDay)
      .sort((a, b) => parseHHMMToMinutes(a.startTime) - parseHHMMToMinutes(b.startTime));
  }, [timetable, istDay]);

  const currentSlot = useMemo(() => {
    return todaySlots.find((s) => {
      const start = parseHHMMToMinutes(s.startTime);
      const end = parseHHMMToMinutes(s.endTime);
      return nowMinutes >= start && nowMinutes < end;
    });
  }, [todaySlots, nowMinutes]);

  const nextSlot = useMemo(() => {
    return todaySlots.find((s) => parseHHMMToMinutes(s.startTime) > nowMinutes);
  }, [todaySlots, nowMinutes]);

  // Missed-task gentle recovery for today's study blocks whose end time has passed without a logged session
  const missedStudySlotsToday = useMemo(() => {
    const todaySessionCount = studySessions.filter((s) => s.dateIST === todayIST).length;
    if (todaySessionCount > 0) return [];
    return todaySlots.filter((s) => {
      const isStudyBlock =
        s.category === 'GATE' ||
        s.category === 'Robotics & AI' ||
        s.category === 'Revision' ||
        s.category === 'Mock Test';
      if (!isStudyBlock) return false;
      const endMin = parseHHMMToMinutes(s.endTime);
      const handled = missedRecovery.some(
        (m) => m.dateIST === todayIST && m.slotId === s.id
      );
      return nowMinutes >= endMin && !handled;
    });
  }, [todaySlots, studySessions, todayIST, nowMinutes, missedRecovery]);

  const dueRevisions = useMemo(() => {
    return revisions
      .filter((r) => r.status === 'active' && r.nextDueDateIST <= todayIST)
      .sort((a, b) => a.nextDueDateIST.localeCompare(b.nextDueDateIST));
  }, [revisions, todayIST]);

  const daysToExam = Math.max(0, diffISTDateDays(todayIST, settings.examTargetDateIST));
  const dailyMessage = getDailyMotivation(todayIST);

  const activeFocusTarget = useMemo(() => {
    if (overrideOpen) {
      if (overrideCat === 'GATE') {
        const subj = gateSubjects.find((s) => s.id === overrideSubjectId) ?? gateSubjects[0];
        const top =
          gateTopics.find((t) => t.id === overrideTopicId && t.subjectId === subj?.id) ??
          gateTopics.find((t) => t.subjectId === subj?.id) ??
          gateTopics[0];
        return {
          category: 'GATE' as StudyCategory,
          subjectId: subj?.id ?? 'gate-robotics',
          subjectName: subj?.name ?? 'GATE Subject',
          topicId: top?.id ?? '',
          topicName: top?.title ?? 'Topic',
        };
      } else {
        const sk = roboticsSkills.find((s) => s.id === overrideSubjectId) ?? roboticsSkills[0];
        const rm =
          sk?.roadmap.find((r) => r.id === overrideTopicId) ?? sk?.roadmap[0];
        return {
          category: 'Robotics & AI' as StudyCategory,
          subjectId: sk?.id ?? 'skill-ros2',
          subjectName: sk?.name ?? 'ROS 2',
          topicId: rm?.id ?? sk?.id ?? 'ros2-b1',
          topicName: rm?.title ?? sk?.name ?? 'Skill Module',
        };
      }
    }
    return recommendations.nextStudy;
  }, [overrideOpen, overrideCat, overrideSubjectId, overrideTopicId, gateSubjects, gateTopics, roboticsSkills, recommendations.nextStudy]);

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winsInput.trim()) {
      pushToast('Add a quick note', 'Enter at least one win or focus reflection before saving.', 'info');
      return;
    }
    await saveDailyReflection({
      id: `refl-${todayIST}`,
      dateIST: todayIST,
      wins: winsInput.trim(),
      clarityRating,
      blockersOrNextStep: nextStepInput.trim(),
      updatedAt: new Date().toISOString(),
    });
    pushToast('Daily Reflection Saved', 'Your evening log is stored safely in IndexedDB.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner: Positive Motivation + Primary Launch CTA + Live Schedule */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 dark:from-navy-900 dark:via-navy-850 dark:to-navy-800/80 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daily Consistency Mindframe</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Streak: <strong className="text-slate-900 dark:text-white">{analytics.streakDays}d</strong>
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Award className="w-3.5 h-3.5 text-blue-500" />
                Badges: <strong className="text-slate-900 dark:text-white">{achievements.length}</strong>
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {daysToExam} days to GATE 2027
              </span>
            </div>
          </div>

          <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            “{dailyMessage}”
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Recommended Study Next */}
            <div className="rounded-xl bg-white/80 dark:bg-navy-950/60 border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Recommended Next Study
                </span>
                <button
                  type="button"
                  onClick={() => setOverrideOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-500 dark:text-slate-400"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  {overrideOpen ? 'Use Smart Pick' : 'Override'}
                </button>
              </div>

              {!overrideOpen ? (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                    {recommendations.nextStudy.subjectName}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Topic: {recommendations.nextStudy.topicName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {recommendations.nextStudy.reason}
                  </p>
                  {recommendations.nextStudy.revisitBeforeAdvancing && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Revisit concepts before advancing
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideCat('GATE');
                        const s = gateSubjects[0];
                        setOverrideSubjectId(s.id);
                        const t = gateTopics.find((gt) => gt.subjectId === s.id);
                        if (t) setOverrideTopicId(t.id);
                      }}
                      className={`flex-1 py-1 rounded text-xs font-semibold ${
                        overrideCat === 'GATE'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      GATE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideCat('Robotics & AI');
                        const sk = roboticsSkills[0];
                        setOverrideSubjectId(sk.id);
                        if (sk.roadmap[0]) setOverrideTopicId(sk.roadmap[0].id);
                      }}
                      className={`flex-1 py-1 rounded text-xs font-semibold ${
                        overrideCat === 'Robotics & AI'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Robotics & AI
                    </button>
                  </div>
                  <select
                    value={overrideSubjectId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOverrideSubjectId(val);
                      if (overrideCat === 'GATE') {
                        const t = gateTopics.find((gt) => gt.subjectId === val);
                        if (t) setOverrideTopicId(t.id);
                      } else {
                        const sk = roboticsSkills.find((s) => s.id === val);
                        if (sk?.roadmap[0]) setOverrideTopicId(sk.roadmap[0].id);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 px-2.5 py-1.5 text-xs"
                  >
                    {overrideCat === 'GATE'
                      ? gateSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))
                      : roboticsSkills.map((sk) => (
                          <option key={sk.id} value={sk.id}>
                            {sk.name}
                          </option>
                        ))}
                  </select>
                  <select
                    value={overrideTopicId}
                    onChange={(e) => setOverrideTopicId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 px-2.5 py-1.5 text-xs"
                  >
                    {overrideCat === 'GATE'
                      ? gateTopics
                          .filter((t) => t.subjectId === overrideSubjectId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))
                      : (
                          roboticsSkills.find((s) => s.id === overrideSubjectId)?.roadmap ?? []
                        ).map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            [{rm.level}] {rm.title}
                          </option>
                        ))}
                  </select>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    launchStartStudyWith({
                      category: activeFocusTarget.category,
                      subjectId: activeFocusTarget.subjectId,
                      topicId: activeFocusTarget.topicId,
                      objective: `Complete focused work on ${activeFocusTarget.topicName}`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Study Session
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('gate-subjects')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
                >
                  View Syllabus
                </button>
              </div>
            </div>

            {/* Current Schedule Block (Asia/Kolkata) */}
            <div className="rounded-xl bg-white/80 dark:bg-navy-950/60 border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Current Schedule ({istDay})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveNav('timetable')}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit Timetable
                  </button>
                </div>

                {currentSlot ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {formatHHMM12Hour(currentSlot.startTime)} – {formatHHMM12Hour(currentSlot.endTime)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {currentSlot.title}
                    </p>
                    {currentSlot.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {currentSlot.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Outside active timetable slot. You can launch an open focus session anytime.
                  </p>
                )}

                {nextSlot && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Next up:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[68%]">
                      {formatHHMM12Hour(nextSlot.startTime)} · {nextSlot.title}
                    </span>
                  </div>
                )}
              </div>

              {(currentSlot?.category === 'GATE' ||
                currentSlot?.category === 'Robotics & AI' ||
                currentSlot?.category === 'Revision') && (
                <button
                  type="button"
                  onClick={() => {
                    const cat: StudyCategory =
                      currentSlot.category === 'Robotics & AI' ? 'Robotics & AI' : 'GATE';
                    launchStartStudyWith({
                      category: cat,
                      subjectId:
                        currentSlot.subjectId ??
                        (cat === 'GATE' ? 'gate-robotics' : 'skill-ros2'),
                      topicId:
                        currentSlot.topicId ??
                        (cat === 'GATE' ? 'robo-classification-kinematics' : 'ros2-b1'),
                      objective: currentSlot.title,
                    });
                  }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  Launch Current Scheduled Block
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Timer & Daily / Weekly Progress Rings */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TimerIcon className="w-4 h-4 text-blue-500" />
              Study & Break Timer
            </h3>
            <button
              type="button"
              onClick={() => setActiveNav('timer')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Full Console
            </button>
          </div>

          {timer ? (
            <div className="my-4 flex flex-col items-center text-center">
              <CircularProgress
                percent={progressPercent}
                size={132}
                strokeWidth={10}
                progressColor={timer.phase === 'study' ? 'stroke-blue-500' : 'stroke-emerald-500'}
              >
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatDurationMMSS(remainingSeconds)}
                </span>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-500">
                  {timer.phase}
                </span>
              </CircularProgress>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-3 truncate max-w-full">
                {timer.subjectName} · {timer.topicName}
              </p>
              <div className="mt-3 flex gap-2">
                {timer.status === 'running' ? (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resumeTimer}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveNav('start-study')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                >
                  Focus View
                </button>
              </div>
            </div>
          ) : (
            <div className="my-4 flex items-center justify-around gap-3">
              <div className="flex flex-col items-center">
                <CircularProgress
                  percent={analytics.dailyGoalPercent}
                  size={104}
                  strokeWidth={9}
                  progressColor="stroke-blue-500"
                  label={`${analytics.dailyGoalPercent}%`}
                  sublabel="Daily Goal"
                />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 tabular-nums">
                  {formatMinutesHuman(analytics.todayStudyMinutes)} / {formatMinutesHuman(settings.dailyStudyTargetMinutes)}
                </p>
              </div>
              <div className="flex flex-col items-center">
                <CircularProgress
                  percent={analytics.weeklyGoalPercent}
                  size={104}
                  strokeWidth={9}
                  progressColor="stroke-emerald-500"
                  label={`${analytics.weeklyGoalPercent}%`}
                  sublabel="Weekly"
                />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 tabular-nums">
                  {(analytics.weeklyStudyMinutes / 60).toFixed(1)}h / {settings.weeklyStudyTargetHours}h
                </p>
              </div>
            </div>
          )}

          {/* 75/25 Real Allocation Split Bar */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Real Study Split (Target {settings.gateAllocationTargetPercent}% / {settings.skillsAllocationTargetPercent}%)
              </span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {analytics.totalStudyMinutes > 0
                  ? `${analytics.gateSharePercent}% / ${analytics.skillsSharePercent}%`
                  : 'No sessions yet'}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-navy-800 overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${analytics.totalStudyMinutes > 0 ? analytics.gateSharePercent : 75}%` }}
              />
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${analytics.totalStudyMinutes > 0 ? analytics.skillsSharePercent : 25}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gentle Missed-Task Recovery Strip */}
      {missedStudySlotsToday.length > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Gentle Catch-Up Option · {missedStudySlotsToday[0].title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Earlier block ({formatHHMM12Hour(missedStudySlotsToday[0].startTime)}) passed — even a calm 20-minute catch-up protects your rhythm.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const slot = missedStudySlotsToday[0];
                saveMissedRecovery({
                  id: `mr-${todayIST}-${slot.id}`,
                  slotId: slot.id,
                  slotTitle: slot.title,
                  dateIST: todayIST,
                  action: 'rescheduled',
                });
                launchStartStudyWith({
                  category: slot.category === 'Robotics & AI' ? 'Robotics & AI' : 'GATE',
                  subjectId: slot.subjectId ?? 'gate-robotics',
                  topicId: slot.topicId ?? 'robo-classification-kinematics',
                  objective: `Calm catch-up: ${slot.title}`,
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              Do 20m Catch-Up Now
            </button>
            <button
              type="button"
              onClick={() => {
                const slot = missedStudySlotsToday[0];
                saveMissedRecovery({
                  id: `mr-${todayIST}-${slot.id}`,
                  slotId: slot.id,
                  slotTitle: slot.title,
                  dateIST: todayIST,
                  action: 'dismissed',
                });
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-navy-800"
            >
              Adjust & Move Forward
            </button>
          </div>
        </div>
      )}

      {/* Middle Stats Grid: Real Metrics Only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>GATE 2027 Syllabus</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
            {analytics.completedTopicsCount} / {analytics.totalTopicsCount}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {analytics.topicCompletionPercent}% topics completed
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Focused Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
            {formatMinutesHuman(analytics.totalStudyMinutes)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Today: {formatMinutesHuman(analytics.todayStudyMinutes)} · Week: {formatMinutesHuman(analytics.weeklyStudyMinutes)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Test Accuracy</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
            {analytics.totalTestAttempts > 0 ? `${analytics.overallAccuracyPercent}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {analytics.totalTestAttempts} {analytics.totalTestAttempts === 1 ? 'test' : 'tests'} recorded
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Revision Queue</span>
            <RefreshCw className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
            {dueRevisions.length} due
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {analytics.upcomingRevisionsCount} upcoming · {analytics.revisionCompletedCount} reviews logged
          </p>
        </div>
      </div>

      {/* Action Cards: Revision Tasks, Upcoming Tests & Daily Reflection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revision Tasks */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                Revision Tasks
              </h3>
              <button
                type="button"
                onClick={() => setActiveNav('revision')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Open Manager <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {dueRevisions.length > 0 ? (
              <div className="space-y-2">
                {dueRevisions.slice(0, 3).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {rev.topicTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {rev.subjectName} · Due {rev.nextDueDateIST}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 shrink-0">
                      Day {rev.intervals[rev.currentStepIndex] ?? 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {recommendations.nextRevision.statusLabel}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {recommendations.nextRevision.reason}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveNav('revision')}
            className="mt-4 w-full py-2 rounded-lg bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
          >
            Review Spaced Repetition Schedule
          </button>
        </div>

        {/* Upcoming & Recommended Tests */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-500" />
                Upcoming Tests & Mocks
              </h3>
              <button
                type="button"
                onClick={() => setActiveNav('mock-exams')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Mock Simulator <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Smart Test Pick
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                  {recommendations.nextTest.subjectName} · {recommendations.nextTest.topicName}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {recommendations.nextTest.reason}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Sunday Weekly Mock Slot
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    8:00 PM – 9:00 PM IST · {testAttempts.filter((t) => t.mode === 'mock-exam').length} mocks completed
                  </p>
                </div>
                <BookOpen className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() =>
                launchTestWith({
                  subjectId: recommendations.nextTest.subjectId,
                  topicId: recommendations.nextTest.topicId,
                })
              }
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              Take Topic Test
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('mock-exams')}
              className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
            >
              Weekly Mock
            </button>
          </div>
        </div>

        {/* Daily Reflection */}
        <form
          onSubmit={handleSaveReflection}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Reflection ({todayIST})
              </h3>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                10:00 PM Review
              </span>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Today's study win or key takeaway
                </label>
                <textarea
                  rows={2}
                  value={winsInput}
                  onChange={(e) => setWinsInput(e.target.value)}
                  placeholder="e.g., Derived 2D/3D rotation matrices cleanly and solved 5 NATs..."
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Clarity</span>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, 5] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setClarityRating(r)}
                      className={`w-6 h-6 rounded text-xs font-bold ${
                        clarityRating === r
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-navy-800 text-slate-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={nextStepInput}
                onChange={(e) => setNextStepInput(e.target.value)}
                placeholder="Tomorrow morning's first step..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-3 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
          >
            {existingReflection ? 'Update Today\'s Reflection' : 'Save Daily Reflection'}
          </button>
        </form>
      </div>
    </div>
  );
};

