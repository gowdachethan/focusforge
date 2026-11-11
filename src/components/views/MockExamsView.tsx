import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Calculator,
  Clock,
  Maximize2,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { QuestionItem, TestAttemptRecord } from '../../types';
import { DraftAnswerState, evaluateQuestionResponse, roundScore } from '../../utils/evaluation';
import { formatDurationMMSS, getISTDateString } from '../../utils/date';
import { generateId } from '../../utils/id';
import { ScientificCalculator } from '../common/ScientificCalculator';

export const MockExamsView: React.FC = () => {
  const {
    settings,
    gateSubjects,
    questions,
    testAttempts,
    recordTestAttempt,
    setFocusMode,
    pushToast,
  } = useFocusForge();

  const [partBTrack, setPartBTrack] = useState<'Part B2' | 'Part B1'>(
    settings.preferredPartBTrack
  );
  const [mockDurationMin, setMockDurationMin] = useState<number>(60);
  const [mockTitle, setMockTitle] = useState<string>('Weekly GATE 2027 RA Mock Test');

  // Active CBT Runner State
  const [examQuestions, setExamQuestions] = useState<QuestionItem[] | null>(null);
  const [activeSection, setActiveSection] = useState<'GA' | 'Part A' | 'Part B'>('GA');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [drafts, setDrafts] = useState<Record<string, DraftAnswerState>>({});
  const [endTimestamp, setEndTimestamp] = useState<number | null>(null);
  const [startedAtIso, setStartedAtIso] = useState<string>('');
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [showCalc, setShowCalc] = useState<boolean>(false);
  const [report, setReport] = useState<TestAttemptRecord | null>(null);

  const lastTickRef = useRef<number>(Date.now());

  const mockHistory = useMemo(
    () => testAttempts.filter((t) => t.mode === 'mock-exam'),
    [testAttempts]
  );

  // Build balanced exam paper from Question Bank respecting GA + Part A + chosen Part B
  const eligibleQuestions = useMemo(() => {
    const ga = questions.filter((q) => q.examSection === 'GA');
    const partA = questions.filter((q) => q.examSection === 'Part A');
    const partB = questions.filter((q) => q.examSection === partBTrack);
    return [...ga, ...partA, ...partB];
  }, [questions, partBTrack]);

  useEffect(() => {
    if (!examQuestions || !endTimestamp) return;
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      const nowMs = Date.now();
      const delta = Math.max(0, (nowMs - lastTickRef.current) / 1000);
      lastTickRef.current = nowMs;
      const curQ = examQuestions[currentIdx];
      if (curQ && delta > 0 && delta < 5) {
        setDrafts((prev) => {
          const cur = prev[curQ.id];
          if (!cur) return prev;
          return {
            ...prev,
            [curQ.id]: {
              ...cur,
              visited: true,
              timeSpentSeconds: cur.timeSpentSeconds + delta,
            },
          };
        });
      }
      const rem = Math.max(0, Math.ceil((endTimestamp - nowMs) / 1000));
      setRemainingSec(rem);
      if (rem <= 0) submitMock(true);
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examQuestions, endTimestamp, currentIdx]);

  const startMockExam = () => {
    if (eligibleQuestions.length === 0) {
      pushToast('Question Bank Empty', 'Add questions before launching a mock exam.', 'info');
      return;
    }
    const init: Record<string, DraftAnswerState> = {};
    eligibleQuestions.forEach((q, idx) => {
      init[q.id] = {
        selectedOptionIndex: null,
        selectedOptionIndices: [],
        natAnswer: '',
        markedForReview: false,
        visited: idx === 0,
        timeSpentSeconds: 0,
      };
    });
    const durSec = Math.max(5, mockDurationMin) * 60;
    setExamQuestions(eligibleQuestions);
    setDrafts(init);
    setCurrentIdx(0);
    setActiveSection('GA');
    setReport(null);
    setStartedAtIso(new Date().toISOString());
    setEndTimestamp(Date.now() + durSec * 1000);
    setRemainingSec(durSec);
    setFocusMode(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const submitMock = async (timeout = false) => {
    if (!examQuestions) return;
    const responses = examQuestions.map((q) =>
      evaluateQuestionResponse(
        q,
        drafts[q.id] ?? { markedForReview: false, visited: false, timeSpentSeconds: 0 }
      )
    );
    const maxMarks = examQuestions.reduce((acc, q) => acc + q.marks, 0);
    const score = roundScore(responses.reduce((acc, r) => acc + r.marksAwarded, 0));
    const attemptedCount = responses.filter((r) => r.isAttempted).length;
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const incorrectCount = attemptedCount - correctCount;
    const accuracyPercent =
      attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

    const topicPerf = new Map<string, { att: number; cor: number }>();
    responses.forEach((r) => {
      if (!r.isAttempted) return;
      const p = topicPerf.get(r.topicId) ?? { att: 0, cor: 0 };
      p.att += 1;
      if (r.isCorrect) p.cor += 1;
      topicPerf.set(r.topicId, p);
    });
    const weakTopicIds: string[] = [];
    topicPerf.forEach((v, tid) => {
      if (v.att > 0 && (v.cor / v.att) * 100 < 60) weakTopicIds.push(tid);
    });

    const rec: TestAttemptRecord = {
      id: generateId('mock'),
      mode: 'mock-exam',
      title: mockTitle.trim() || `GATE 2027 RA Mock (${partBTrack})`,
      partBTrack,
      subjectFilter: 'all',
      topicFilter: 'all',
      dateIST: getISTDateString(),
      startedAt: startedAtIso,
      submittedAt: new Date().toISOString(),
      durationMinutes: mockDurationMin,
      actualTimeSeconds: Math.round(
        responses.reduce((acc, r) => acc + r.timeSpentSeconds, 0)
      ),
      totalQuestions: examQuestions.length,
      attemptedCount,
      correctCount,
      incorrectCount,
      unattemptedCount: examQuestions.length - attemptedCount,
      maxMarks,
      score,
      accuracyPercent,
      responses,
      weakTopicIds,
    };

    await recordTestAttempt(rec);
    setExamQuestions(null);
    setEndTimestamp(null);
    setShowCalc(false);
    setFocusMode(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setReport(rec);
    pushToast(
      timeout ? 'Mock Exam Time Up' : 'Mock Exam Submitted',
      `Score: ${score}/${maxMarks} · Accuracy: ${accuracyPercent}%`,
      'success'
    );
  };

  // ==================== FULLSCREEN CBT SIMULATOR ====================
  if (examQuestions) {
    const q = examQuestions[currentIdx];
    const draft = drafts[q.id] ?? {
      markedForReview: false,
      visited: true,
      timeSpentSeconds: 0,
    };

    const setDraftField = (patch: Partial<DraftAnswerState>) => {
      setDrafts((prev) => ({
        ...prev,
        [q.id]: { ...draft, visited: true, ...patch },
      }));
    };

    const jumpSection = (sec: 'GA' | 'Part A' | 'Part B') => {
      setActiveSection(sec);
      const targetIdx = examQuestions.findIndex((item) =>
        sec === 'Part B' ? item.examSection === partBTrack : item.examSection === sec
      );
      if (targetIdx >= 0) setCurrentIdx(targetIdx);
    };

    return (
      <div className="space-y-4">
        {/* CBT Header */}
        <div className="rounded-2xl border border-slate-700 bg-navy-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-blue-600 text-xs font-extrabold">
              GATE 2027 RA CBT
            </span>
            {(['GA', 'Part A', 'Part B'] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => jumpSection(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSection === sec
                    ? 'bg-emerald-600 text-white'
                    : 'bg-navy-800 text-slate-300 hover:bg-navy-700'
                }`}
              >
                {sec === 'Part B' ? `${partBTrack}` : sec}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCalc((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 text-xs font-semibold"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              Calculator
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-navy-950 border border-blue-500/40 font-mono font-bold text-sm text-blue-300 tabular-nums">
              {formatDurationMMSS(remainingSec)}
            </div>
            <button
              type="button"
              onClick={() => submitMock(false)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
            >
              Submit Exam
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Question Workspace */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-bold">
                  Question {currentIdx + 1} · {q.examSection} ·{' '}
                  {gateSubjects.find((s) => s.id === q.subjectId)?.shortName}
                </span>
                <span className="font-semibold text-emerald-500">
                  {q.type} | +{q.marks} / {q.type === 'MCQ' ? `-${q.marks}/3` : '0'}
                </span>
              </div>

              <p className="text-sm sm:text-base font-medium whitespace-pre-line leading-relaxed">
                {q.prompt}
              </p>

              {q.type === 'MCQ' && q.options && (
                <div className="space-y-2 pt-2">
                  {q.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer ${
                        draft.selectedOptionIndex === idx
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`mock-${q.id}`}
                        checked={draft.selectedOptionIndex === idx}
                        onChange={() => setDraftField({ selectedOptionIndex: idx })}
                      />
                      <span className="text-sm">
                        <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'MSQ' && q.options && (
                <div className="space-y-2 pt-2">
                  {q.options.map((opt, idx) => {
                    const checked = (draft.selectedOptionIndices ?? []).includes(idx);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer ${
                          checked
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const cur = draft.selectedOptionIndices ?? [];
                            setDraftField({
                              selectedOptionIndices: checked
                                ? cur.filter((x) => x !== idx)
                                : [...cur, idx],
                            });
                          }}
                        />
                        <span className="text-sm">
                          <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'NAT' && (
                <div className="pt-2 max-w-xs">
                  <input
                    type="number"
                    step="any"
                    value={draft.natAnswer ?? ''}
                    onChange={(e) => setDraftField({ natAnswer: e.target.value })}
                    placeholder="Enter numerical answer..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3.5 py-2.5 text-sm font-mono font-bold"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraftField({ markedForReview: !draft.markedForReview })}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    draft.markedForReview
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-navy-800'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Mark for Review & Next
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraftField({
                      selectedOptionIndex: null,
                      selectedOptionIndices: [],
                      natAnswer: '',
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
                >
                  Clear Response
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 disabled:opacity-40 text-xs font-semibold"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentIdx < examQuestions.length - 1) {
                      setCurrentIdx((i) => i + 1);
                    } else {
                      submitMock(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
                >
                  {currentIdx < examQuestions.length - 1 ? 'Save & Next' : 'Finish Exam'}
                </button>
              </div>
            </div>
          </div>

          {/* GATE CBT Palette */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              CBT Navigation ({examQuestions.length} Questions)
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {examQuestions.map((item, idx) => {
                const d = drafts[item.id];
                const answered =
                  item.type === 'MCQ'
                    ? d?.selectedOptionIndex !== null && d?.selectedOptionIndex !== undefined
                    : item.type === 'MSQ'
                      ? (d?.selectedOptionIndices?.length ?? 0) > 0
                      : (d?.natAnswer ?? '').trim() !== '';
                let cls = 'bg-slate-100 dark:bg-navy-800';
                if (d?.markedForReview && answered) cls = 'bg-purple-600 text-white ring-2 ring-emerald-400';
                else if (d?.markedForReview) cls = 'bg-purple-600 text-white';
                else if (answered) cls = 'bg-emerald-600 text-white';
                else if (d?.visited) cls = 'bg-amber-500/25 text-amber-500';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg text-xs font-bold tabular-nums ${cls} ${
                      idx === currentIdx ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showCalc && <ScientificCalculator onClose={() => setShowCalc(false)} />}
      </div>
    );
  }

  // ==================== POST-MOCK ANALYTICS REPORT ====================
  if (report) {
    const subjPerf = gateSubjects
      .map((s) => {
        const resps = report.responses.filter((r) => r.subjectId === s.id);
        if (resps.length === 0) return null;
        const att = resps.filter((r) => r.isAttempted).length;
        const cor = resps.filter((r) => r.isCorrect).length;
        const marks = roundScore(resps.reduce((acc, r) => acc + r.marksAwarded, 0));
        const max = resps.reduce((acc, r) => acc + r.marks, 0);
        const avgSec = Math.round(
          resps.reduce((acc, r) => acc + r.timeSpentSeconds, 0) / resps.length
        );
        return {
          name: s.shortName,
          count: resps.length,
          attempted: att,
          correct: cor,
          marks,
          max,
          avgSec,
          accuracy: att > 0 ? Math.round((cor / att) * 100) : 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-500">
                Mock Examination Completed
              </span>
              <h3 className="text-xl font-extrabold mt-0.5">{report.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Return to Mock Lobby
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Net Score</p>
              <p className="text-2xl font-extrabold text-blue-500 tabular-nums">
                {report.score} / {report.maxMarks}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Overall Accuracy</p>
              <p className="text-2xl font-extrabold text-emerald-500 tabular-nums">
                {report.accuracyPercent}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Avg Time / Question</p>
              <p className="text-2xl font-extrabold tabular-nums">
                {report.totalQuestions > 0
                  ? Math.round(report.actualTimeSeconds / report.totalQuestions)
                  : 0}
                s
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Correct / Incorrect</p>
              <p className="text-2xl font-extrabold tabular-nums">
                {report.correctCount} / {report.incorrectCount}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-3">Subject-Wise & Time Management Analysis</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Subject</th>
                    <th className="py-2 pr-3">Attempted</th>
                    <th className="py-2 pr-3">Accuracy</th>
                    <th className="py-2 pr-3">Marks</th>
                    <th className="py-2">Avg Time / Q</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjPerf.map((sp) => (
                    <tr key={sp.name}>
                      <td className="py-2.5 pr-3 font-bold">{sp.name}</td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {sp.attempted}/{sp.count}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-emerald-500 font-semibold">
                        {sp.accuracy}%
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums font-semibold">
                        {sp.marks} / {sp.max}
                      </td>
                      <td className="py-2.5 tabular-nums font-mono">{sp.avgSec}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MOCK LOBBY ====================
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              GATE 2027 RA Mock Examination Simulator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Full-screen CBT simulator featuring General Aptitude + Part A Common + selectable Part B (B2 Mechanical or B1 Electrical), virtual scientific calculator, and strict GATE negative marking.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sunday 8:00 PM Mock Slot Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Mock Examination Title</label>
            <input
              type="text"
              value={mockTitle}
              onChange={(e) => setMockTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Optional Part B Track</label>
            <select
              value={partBTrack}
              onChange={(e) => setPartBTrack(e.target.value as 'Part B2' | 'Part B1')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
            >
              <option value="Part B2">Part B2 – Mechanical Engineering</option>
              <option value="Part B1">Part B1 – Electrical & Control Systems</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Duration (Minutes)</label>
            <div className="flex gap-2">
              {[60, 120, 180].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMockDurationMin(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border ${
                    mockDurationMin === m
                      ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={240}
                value={mockDurationMin}
                onChange={(e) => setMockDurationMin(Number(e.target.value))}
                className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 text-xs font-mono text-center"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Paper includes <strong>{eligibleQuestions.length}</strong> available questions across GA, Part A, and {partBTrack}. Import full 65-question datasets anytime in Practice Tests → Question Bank.
          </div>
          <button
            type="button"
            onClick={startMockExam}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-xs font-bold shadow-md transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <Play className="w-3.5 h-3.5 fill-current" />
            Enter Fullscreen Mock Exam
          </button>
        </div>
      </div>

      {/* Weekly Mock History */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5">
        <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-500" />
          Weekly Mock Exam History ({mockHistory.length})
        </h4>
        {mockHistory.length === 0 ? (
          <p className="text-xs text-slate-500">
            No mock examinations submitted yet. Your weekly Sunday mocks and full-length tests will be archived here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {mockHistory.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold">{m.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {m.dateIST} · {m.partBTrack} · {m.totalQuestions} questions
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-bold text-blue-500">
                    {m.score}/{m.maxMarks}
                  </span>
                  <span className="font-bold text-emerald-500">
                    {m.accuracyPercent}% acc
                  </span>
                  <button
                    type="button"
                    onClick={() => setReport(m)}
                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 font-semibold"
                  >
                    View Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

