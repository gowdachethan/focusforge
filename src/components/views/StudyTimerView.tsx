import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { useStudyTimer } from '../../hooks/useStudyTimer';
import { useIsMobile } from '../../hooks/useIsMobile';
import { TimerMode } from '../../types';
import { CircularProgress } from '../common/CircularProgress';
import { formatDurationMMSS, formatMinutesHuman, getISTTimeParts } from '../../utils/date';
import { requestBrowserNotificationPermission } from '../../utils/audio';

export const StudyTimerView: React.FC = () => {
  const {
    settings,
    updateSettings,
    gateSubjects,
    gateTopics,
    studySessions,
    pushToast,
  } = useFocusForge();

  const {
    timer,
    remainingSeconds,
    progressPercent,
    startSession,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipBreak,
    extendBreak,
    endAndRecordSession,
    toggleAutoTransition,
  } = useStudyTimer();
  const isMobile = useIsMobile();

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [customStudy, setCustomStudy] = useState<number>(settings.pomodoroStudyMin);
  const [customBreak, setCustomBreak] = useState<number>(settings.pomodoroBreakMin);
  const [subjectId, setSubjectId] = useState<string>('gate-robotics');
  const [topicId, setTopicId] = useState<string>('robo-classification-kinematics');
  const [autoTransition, setAutoTransition] = useState<boolean>(true);
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const selectPreset = (m: TimerMode) => {
    setMode(m);
    if (m === 'pomodoro') {
      setCustomStudy(settings.pomodoroStudyMin);
      setCustomBreak(settings.pomodoroBreakMin);
    } else if (m === 'standard') {
      setCustomStudy(settings.standardStudyMin);
      setCustomBreak(settings.standardBreakMin);
    } else if (m === 'deep-work') {
      setCustomStudy(settings.deepWorkStudyMin);
      setCustomBreak(settings.deepWorkBreakMin);
    } else {
      setCustomStudy(settings.customStudyMin);
      setCustomBreak(settings.customBreakMin);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    const res = await requestBrowserNotificationPermission();
    setNotifStatus(res);
    if (res === 'granted') {
      await updateSettings({ browserNotificationsEnabled: true });
      pushToast('Notifications Enabled', 'You will receive alerts when a study or break timer completes.', 'success');
    } else {
      await updateSettings({ browserNotificationsEnabled: false });
      pushToast('Permission Status', `Browser notification state: ${res}`, 'info');
    }
  };

  const handleStartStandalone = () => {
    const subj = gateSubjects.find((s) => s.id === subjectId);
    const top = gateTopics.find((t) => t.id === topicId);
    startSession({
      mode,
      studyMinutes: Math.max(1, customStudy),
      breakMinutes: Math.max(1, customBreak),
      category: 'GATE',
      subjectId,
      subjectName: subj?.shortName ?? 'GATE 2027',
      topicId,
      topicName: top?.title ?? 'Focused Study',
      objective: `Timed ${mode} focus block`,
      autoTransition,
      openFocusScreen: false,
    });
  };

  const endClockIST =
    timer?.status === 'running' && timer.targetEndTimestamp
      ? getISTTimeParts(new Date(timer.targetEndTimestamp)).hhmmss
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timer Display */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 flex flex-col items-center justify-between">
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clock-Anchored Study & Break Timer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uses actual system end timestamp so inactive browser tabs stay 100% accurate.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className="p-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300"
                title={settings.soundEnabled ? 'Sound On' : 'Sound Muted'}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  notifStatus === 'granted' && settings.browserNotificationsEnabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {notifStatus === 'granted' ? 'Alerts Ready' : 'Enable Alerts'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                className="p-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="my-8 flex flex-col items-center">
            <CircularProgress
              percent={timer ? progressPercent : 0}
              size={240}
              strokeWidth={14}
              progressColor={
                timer?.phase === 'break' ? 'stroke-emerald-500' : 'stroke-blue-500'
              }
            >
              <span className="text-5xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                {timer
                  ? formatDurationMMSS(remainingSeconds)
                  : formatDurationMMSS(customStudy * 60)}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500 mt-2">
                {timer ? `${timer.phase} · ${timer.mode}` : `${mode} ready`}
              </span>
              {endClockIST && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  Ends {endClockIST} IST
                </span>
              )}
            </CircularProgress>
          </div>

          {timer ? (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {timer.status === 'running' ? (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeTimer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={resetTimer}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              {timer.phase === 'break' && (
                <>
                  <button
                    type="button"
                    onClick={() => extendBreak(5)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    +5m Break
                  </button>
                  <button
                    type="button"
                    onClick={skipBreak}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 text-xs font-semibold"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip Break
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => endAndRecordSession()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 dark:bg-navy-800 text-white text-xs font-semibold"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop & Save
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={timer.autoTransition}
                  onChange={toggleAutoTransition}
                  className="rounded"
                />
                Auto-start next phase
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartStandalone}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 inline-flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              Start {mode === 'custom' ? `${customStudy}m` : mode} Timer
            </button>
          )}
        </div>

        {/* Timer Mode Configuration */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Timer Modes & Binding
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'pomodoro', title: 'Pomodoro', desc: '25m + 5m' },
                { id: 'standard', title: 'Standard', desc: '50m + 10m' },
                { id: 'deep-work', title: 'Deep Work', desc: '90m + 15m' },
                { id: 'custom', title: 'Custom', desc: 'Flexible' },
              ] as { id: TimerMode; title: string; desc: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectPreset(item.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === item.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850'
                }`}
              >
                <div className="text-xs font-bold">{item.title}</div>
                <div className="text-[11px] opacity-75">{item.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Study (min)
              </label>
              <input
                type="number"
                min={1}
                max={360}
                value={customStudy}
                onChange={(e) => {
                  setCustomStudy(Number(e.target.value));
                  setMode('custom');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Break (min)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={customBreak}
                onChange={(e) => {
                  setCustomBreak(Number(e.target.value));
                  setMode('custom');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Subject for Session Log
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                const v = e.target.value;
                setSubjectId(v);
                const t = gateTopics.find((gt) => gt.subjectId === v);
                if (t) setTopicId(t.id);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
            >
              {gateSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Topic for Session Log
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
            >
              {gateTopics
                .filter((t) => t.subjectId === subjectId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={autoTransition}
              onChange={(e) => setAutoTransition(e.target.checked)}
              className="rounded"
            />
            Automatically start break/next session
          </label>
        </div>
      </div>

      {/* Recorded Timer Session History */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-500" />
          Recorded Focus History (Deduplicated in IndexedDB)
        </h4>

        {studySessions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No study sessions recorded yet. Start a timer above or via Start Study to begin tracking real hours.
          </p>
        ) : isMobile ? (
          <div className="space-y-2">
            {studySessions.slice(0, 12).map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {s.subjectName} · {s.topicName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {s.dateIST} · {s.category} · <span className="capitalize">{s.timerMode}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-blue-500">
                    {s.actualSeconds < 60 ? `${s.actualSeconds}s` : formatMinutesHuman(s.actualMinutes)}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-semibold">
                    {s.completedFull ? 'Completed' : 'Logged'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3">Date (IST)</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Subject & Topic</th>
                  <th className="py-2 pr-3">Mode</th>
                  <th className="py-2 pr-3">Actual</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {studySessions.slice(0, 12).map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-3 font-mono">{s.dateIST}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.category === 'GATE'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                        }`}
                      >
                        {s.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-200">
                      {s.subjectName} · {s.topicName}
                    </td>
                    <td className="py-2.5 pr-3 capitalize">{s.timerMode}</td>
                    <td className="py-2.5 pr-3 font-mono font-semibold">
                      {s.actualSeconds < 60 ? `${s.actualSeconds}s` : formatMinutesHuman(s.actualMinutes)}
                    </td>
                    <td className="py-2.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {s.completedFull ? 'Completed' : 'Logged'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

