
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, BarChart3, Flame, Target, TrendingUp } from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { ACHIEVEMENT_BADGES } from '../../data/motivationData';
import { formatMinutesHuman, getISTDateString, getISTWeekStartMonday } from '../../utils/date';
import { CircularProgress } from '../common/CircularProgress';

const CHART_COLORS = ['#3B82F6', '#10B981', '#38BDF8', '#6366F1', '#F59E0B', '#14B8A6', '#8B5CF6'];

export const AnalyticsView: React.FC = () => {
  const {
    now,
    settings,
    analytics,
    achievements,
    weeklyReviews,
    dailyReflections,
    saveWeeklyReview,
    launchTestWith,
    pushToast,
  } = useFocusForge();

  const todayIST = getISTDateString(now);
  const weekStartIST = getISTWeekStartMonday(todayIST);
  const existingWeekly = weeklyReviews.find((w) => w.weekStartIST === weekStartIST);

  const [weeklySummary, setWeeklySummary] = useState(existingWeekly?.summary ?? '');
  const [nextWeekFocus, setNextWeekFocus] = useState(existingWeekly?.nextWeekFocus ?? '');

  const unlockedSet = new Set(achievements.map((a) => a.id));

  const subjectHoursPie = analytics.subjectBreakdown
    .filter((s) => s.studyMinutes > 0)
    .map((s) => ({
      name: s.subjectName,
      value: Number((s.studyMinutes / 60).toFixed(2)),
    }));

  const handleSaveWeeklyReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weeklySummary.trim()) {
      pushToast('Add Review Notes', 'Write a short weekly takeaway before saving.', 'info');
      return;
    }
    await saveWeeklyReview({
      id: `wrev-${weekStartIST}`,
      weekStartIST,
      summary: weeklySummary.trim(),
      nextWeekFocus: nextWeekFocus.trim(),
      hoursLoggedSnapshot: Number((analytics.weeklyStudyMinutes / 60).toFixed(2)),
      updatedAt: new Date().toISOString(),
    });
    pushToast('Weekly Review Saved', `Saved review for week of ${weekStartIST}.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards — Strictly from Real Study & Test Records */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <p className="text-[11px] font-medium text-slate-500">Total Focus Hours</p>
          <p className="text-xl font-extrabold text-blue-500 mt-1 tabular-nums">
            {(analytics.totalStudyMinutes / 60).toFixed(1)}h
          </p>
          <p className="text-[11px] text-slate-400">{formatMinutesHuman(analytics.totalStudyMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <p className="text-[11px] font-medium text-slate-500">Daily / Weekly</p>
          <p className="text-xl font-extrabold mt-1 tabular-nums">
            {(analytics.todayStudyMinutes / 60).toFixed(1)}h / {(analytics.weeklyStudyMinutes / 60).toFixed(1)}h
          </p>
          <p className="text-[11px] text-slate-400">
            Month: {(analytics.monthlyStudyMinutes / 60).toFixed(1)}h
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <p className="text-[11px] font-medium text-slate-500">Syllabus Complete</p>
          <p className="text-xl font-extrabold text-emerald-500 mt-1 tabular-nums">
            {analytics.topicCompletionPercent}%
          </p>
          <p className="text-[11px] text-slate-400">
            {analytics.completedTopicsCount}/{analytics.totalTopicsCount} GATE topics
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <p className="text-[11px] font-medium text-slate-500">Test Accuracy</p>
          <p className="text-xl font-extrabold mt-1 tabular-nums">
            {analytics.totalTestAttempts > 0 ? `${analytics.overallAccuracyPercent}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-400">{analytics.totalTestAttempts} attempts</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4">
          <p className="text-[11px] font-medium text-slate-500">Study Streak</p>
          <p className="text-xl font-extrabold text-amber-500 mt-1 tabular-nums flex items-center gap-1">
            <Flame className="w-4 h-4" />
            {analytics.streakDays}d
          </p>
          <p className="text-[11px] text-slate-400">Asia/Kolkata days</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Weekly Goal</p>
            <p className="text-lg font-extrabold tabular-nums mt-1">
              {analytics.weeklyGoalPercent}%
            </p>
            <p className="text-[11px] text-slate-400">Target {settings.weeklyStudyTargetHours}h</p>
          </div>
          <CircularProgress
            percent={analytics.weeklyGoalPercent}
            size={48}
            strokeWidth={5}
            progressColor="stroke-emerald-500"
            label={`${analytics.weeklyGoalPercent}%`}
          />
        </div>
      </div>

      {/* Charts Row 1: Daily Hours (14 days) + Subject Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5">
          <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Daily Focused Study Hours (Last 14 Days · IST)
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailyHoursSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="gateHours" name="GATE 2027 (h)" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="skillHours" name="Robotics & AI (h)" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5">
          <h4 className="text-sm font-bold mb-4">Subject Study Distribution</h4>
          {subjectHoursPie.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-500">
              <p>No completed study sessions logged yet.</p>
              <p className="mt-1">Real subject hours will appear here once you complete your first focus session.</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectHoursPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {subjectHoursPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Test Score & Accuracy Trends + Topic Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5">
          <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Test Score % & Accuracy Trends
          </h4>
          {analytics.testTrendSeries.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-500">
              Complete a Practice Test or Mock Examination to visualize your accuracy trend.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.testTrendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="scorePercent" name="Score %" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="accuracyPercent" name="Accuracy %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weakest Topics + Subject Completion Area */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            Weakest Topics & Conceptual Focus Needed
          </h4>
          {analytics.weakestTopics.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 text-center">
              No weak topics detected yet. Any topic below 60% test accuracy or manually flagged will appear here.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {analytics.weakestTopics.map((wt) => (
                <div
                  key={wt.topicId}
                  className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold">{wt.topicTitle}</p>
                    <p className="text-[11px] text-slate-500">
                      {wt.subjectName} · {wt.attempted > 0 ? `${wt.accuracyPercent}% (${wt.correct}/${wt.attempted})` : 'Needs Review'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      launchTestWith({ subjectId: wt.subjectId, topicId: wt.topicId })
                    }
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    Retest
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievement Badges + Weekly Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Achievement Milestones ({achievements.length}/{ACHIEVEMENT_BADGES.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {ACHIEVEMENT_BADGES.map((b) => {
              const unlocked = unlockedSet.has(b.id);
              return (
                <div
                  key={b.id}
                  className={`p-3 rounded-xl border text-xs transition ${unlocked
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-850/50 opacity-60'
                    }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white">{b.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {b.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleSaveWeeklyReview}
          className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">Weekly Review (Week of {weekStartIST})</h4>
            <span className="text-xs text-slate-400">{dailyReflections.length} daily logs</span>
          </div>
          <textarea
            rows={3}
            value={weeklySummary}
            onChange={(e) => setWeeklySummary(e.target.value)}
            placeholder="Summarize what went well this week, mock exam insights, and steady habits..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 p-3 text-xs"
          />
          <input
            type="text"
            value={nextWeekFocus}
            onChange={(e) => setNextWeekFocus(e.target.value)}
            placeholder="Top 1–2 priorities for next week..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            Save Weekly Review
          </button>
        </form>
      </div>
    </div>
  );
};

