import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Plus,
  RefreshCw,
  RotateCcw,
  Target,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { diffISTDateDays, getISTDateString } from '../../utils/date';

type RevTab = 'queue' | 'weak' | 'formulas';

export const RevisionManagerView: React.FC = () => {
  const {
    now,
    gateSubjects,
    gateTopics,
    revisions,
    analytics,
    advanceRevisionItem,
    addManualRevisionItem,
    launchTestWith,
    pushToast,
  } = useFocusForge();

  const [tab, setTab] = useState<RevTab>('queue');
  const [selectedTopicToAdd, setSelectedTopicToAdd] = useState<string>(
    gateTopics[0]?.id ?? ''
  );

  const todayIST = getISTDateString(now);

  const categorized = useMemo(() => {
    const overdue = revisions
      .filter((r) => r.status === 'active' && r.nextDueDateIST < todayIST)
      .sort((a, b) => a.nextDueDateIST.localeCompare(b.nextDueDateIST));
    const dueToday = revisions.filter(
      (r) => r.status === 'active' && r.nextDueDateIST === todayIST
    );
    const upcoming = revisions
      .filter((r) => r.status === 'active' && r.nextDueDateIST > todayIST)
      .sort((a, b) => a.nextDueDateIST.localeCompare(b.nextDueDateIST));
    const mastered = revisions.filter((r) => r.status === 'mastered');
    return { overdue, dueToday, upcoming, mastered };
  }, [revisions, todayIST]);

  const weakSubjects = useMemo(() => {
    return analytics.subjectBreakdown
      .filter((s) => s.attempted > 0 && s.accuracyPercent < 65)
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent);
  }, [analytics.subjectBreakdown]);

  const topicsNeedingRetest = useMemo(() => {
    return analytics.topicAccuracyList.filter(
      (t) => t.isWeak || revisions.some((r) => r.topicId === t.topicId && r.needsRetest)
    );
  }, [analytics.topicAccuracyList, revisions]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = gateTopics.find((t) => t.id === selectedTopicToAdd);
    if (!topic) return;
    const subj = gateSubjects.find((s) => s.id === topic.subjectId);
    await addManualRevisionItem({
      topicId: topic.id,
      subjectId: topic.subjectId,
      subjectName: subj?.shortName ?? topic.subjectId,
      topicTitle: topic.title,
      category: 'GATE',
    });
    pushToast('Added to Revision Queue', `"${topic.title}" scheduled for today.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Stats + Manual Scheduler */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-500" />
            Spaced Repetition Manager (Day 1 · 3 · 7 · 14 · 30)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Completed topics enter the queue automatically. Overdue: {categorized.overdue.length} · Due Today: {categorized.dueToday.length} · Upcoming: {categorized.upcoming.length} · Mastered: {categorized.mastered.length}
          </p>
        </div>

        <form onSubmit={handleManualAdd} className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTopicToAdd}
            onChange={(e) => setSelectedTopicToAdd(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs max-w-xs"
          >
            {gateTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.sectionCode} · {t.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule Topic Today
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            {
              id: 'queue',
              label: `Revision Queue (${categorized.overdue.length + categorized.dueToday.length} Due)`,
            },
            {
              id: 'weak',
              label: `Weak Subjects & Retest (${topicsNeedingRetest.length})`,
            },
            { id: 'formulas', label: 'Formula Revision Deck' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div className="space-y-5">
          {/* Overdue */}
          {categorized.overdue.length > 0 && (
            <div className="rounded-2xl border border-amber-500/35 bg-amber-500/5 p-5 space-y-3">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-300 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Overdue Catch-Up ({categorized.overdue.length})
              </h4>
              <div className="space-y-2.5">
                {categorized.overdue.map((item) => {
                  const daysLate = Math.abs(diffISTDateDays(item.nextDueDateIST, todayIST));
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold">{item.topicTitle}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.subjectName} · Step Day {item.intervals[item.currentStepIndex] ?? 1} · {daysLate}d catch-up window
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => advanceRevisionItem(item.id, 'revised')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Revised
                        </button>
                        <button
                          type="button"
                          onClick={() => advanceRevisionItem(item.id, 'restudy')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset to Day 1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Revision List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Today's Revision List ({categorized.dueToday.length})
            </h4>
            {categorized.dueToday.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No revisions due today ({todayIST}). Complete topics in GATE 2027 Subjects or schedule one above!
              </p>
            ) : (
              <div className="space-y-2.5">
                {categorized.dueToday.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.topicTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.subjectName} · Interval Day {item.intervals[item.currentStepIndex] ?? 1} · Completed {item.revisionCount} reviews
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => advanceRevisionItem(item.id, 'revised')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Revised · Next Step
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          launchTestWith({
                            subjectId: item.subjectId,
                            topicId: item.topicId,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                      >
                        <Target className="w-3.5 h-3.5" />
                        Quick Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Revisions */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Upcoming Revision Schedule ({categorized.upcoming.length})
            </h4>
            {categorized.upcoming.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming items scheduled yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {categorized.upcoming.map((item) => {
                  const daysAhead = diffISTDateDays(todayIST, item.nextDueDateIST);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{item.topicTitle}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.subjectName} · Next: {item.nextDueDateIST} (in {daysAhead}d)
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 text-[10px] font-bold shrink-0">
                        Day {item.intervals[item.currentStepIndex] ?? 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'weak' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Topics Requiring Another Test / Conceptual Review
            </h4>
            {topicsNeedingRetest.length === 0 ? (
              <p className="text-xs text-slate-500">
                No weak topics flagged right now. Take topic tests or mock exams to identify gaps automatically.
              </p>
            ) : (
              <div className="space-y-2.5">
                {topicsNeedingRetest.map((t) => (
                  <div
                    key={t.topicId}
                    className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold">{t.topicTitle}</p>
                      <p className="text-[11px] text-slate-500">
                        {t.subjectName} ·{' '}
                        {t.attempted > 0
                          ? `Accuracy: ${t.accuracyPercent}% (${t.correct}/${t.attempted})`
                          : 'Manually flagged for review'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        launchTestWith({
                          subjectId: t.subjectId,
                          topicId: t.topicId,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                    >
                      Retest Topic
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3">
            <h4 className="text-sm font-bold">Weak Subjects (&lt; 65% Test Accuracy)</h4>
            {weakSubjects.length === 0 ? (
              <p className="text-xs text-slate-500">
                No weak subjects flagged yet based on completed tests.
              </p>
            ) : (
              <div className="space-y-2">
                {weakSubjects.map((s) => (
                  <div
                    key={s.subjectId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold">{s.subjectName}</p>
                      <p className="text-[11px] text-slate-500">
                        {s.correct}/{s.attempted} correct
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-amber-500 tabular-nums">
                      {s.accuracyPercent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'formulas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gateTopics
            .filter((t) => t.formulaNotes.trim().length > 0)
            .map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-500">{t.sectionCode}</span>
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold">{t.title}</h4>
                <pre className="whitespace-pre-wrap font-mono text-xs bg-slate-50 dark:bg-navy-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                  {t.formulaNotes}
                </pre>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

