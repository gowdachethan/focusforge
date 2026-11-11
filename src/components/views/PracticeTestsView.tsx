import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Flag,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import {
  QuestionDifficulty,
  QuestionItem,
  QuestionNature,
  QuestionSourceTag,
  QuestionType,
  TestAttemptRecord,
} from '../../types';
import { DraftAnswerState, evaluateQuestionResponse, roundScore } from '../../utils/evaluation';
import { formatDurationMMSS, getISTDateString } from '../../utils/date';
import { downloadTextFile, generateId } from '../../utils/id';
import { ScientificCalculator } from '../common/ScientificCalculator';

type TestTab = 'builder' | 'bank' | 'history';

export const PracticeTestsView: React.FC = () => {
  const {
    gateSubjects,
    gateTopics,
    questions,
    testAttempts,
    testPreset,
    setTestPreset,
    addQuestion,
    importQuestions,
    deleteQuestion,
    recordTestAttempt,
    addManualRevisionItem,
    pushToast,
  } = useFocusForge();

  const [tab, setTab] = useState<TestTab>('builder');

  // Builder filters
  const [subjectFilter, setSubjectFilter] = useState<string>(
    testPreset?.subjectId ?? 'all'
  );
  const [topicFilter, setTopicFilter] = useState<string>(
    testPreset?.topicId ?? 'all'
  );
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | QuestionDifficulty>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | QuestionType>('All');
  const [natureFilter, setNatureFilter] = useState<'All' | QuestionNature>('All');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(20);

  // Live Test State
  const [activeQuestions, setActiveQuestions] = useState<QuestionItem[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [drafts, setDrafts] = useState<Record<string, DraftAnswerState>>({});
  const [testEndTimestamp, setTestEndTimestamp] = useState<number | null>(null);
  const [testStartedIso, setTestStartedIso] = useState<string>('');
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [showCalc, setShowCalc] = useState<boolean>(false);
  const [latestResult, setLatestResult] = useState<TestAttemptRecord | null>(null);

  const lastTickRef = useRef<number>(Date.now());

  // Sync preset if triggered from Dashboard / GATE Subjects
  useEffect(() => {
    if (!testPreset) return;
    setSubjectFilter(testPreset.subjectId);
    setTopicFilter(testPreset.topicId);
    setTab('builder');
    setLatestResult(null);
    setTestPreset(null);
  }, [testPreset, setTestPreset]);

  // Question Bank Add Form State
  const [qbSubj, setQbSubj] = useState<string>('gate-robotics');
  const [qbTopic, setQbTopic] = useState<string>('robo-classification-kinematics');
  const [qbType, setQbType] = useState<QuestionType>('MCQ');
  const [qbNature, setQbNature] = useState<QuestionNature>('Conceptual');
  const [qbDiff, setQbDiff] = useState<QuestionDifficulty>('Medium');
  const [qbMarks, setQbMarks] = useState<1 | 2>(1);
  const [qbSourceTag, setQbSourceTag] = useState<QuestionSourceTag>('Original Practice');
  const [qbSourceRef, setQbSourceRef] = useState('');
  const [qbPrompt, setQbPrompt] = useState('');
  const [qbOpts, setQbOpts] = useState<[string, string, string, string]>(['', '', '', '']);
  const [qbCorrectIdx, setQbCorrectIdx] = useState<number>(0);
  const [qbCorrectIndices, setQbCorrectIndices] = useState<number[]>([0]);
  const [qbNatMin, setQbNatMin] = useState<string>('0');
  const [qbNatMax, setQbNatMax] = useState<string>('0');
  const [qbExplanation, setQbExplanation] = useState('');

  const matchingQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (subjectFilter !== 'all' && q.subjectId !== subjectFilter) return false;
      if (topicFilter !== 'all' && q.topicId !== topicFilter) return false;
      if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
      if (typeFilter !== 'All' && q.type !== typeFilter) return false;
      if (natureFilter !== 'All' && q.nature !== natureFilter) return false;
      return true;
    });
  }, [questions, subjectFilter, topicFilter, difficultyFilter, typeFilter, natureFilter]);

  // Clock-anchored test timer + per-question time tracking
  useEffect(() => {
    if (!activeQuestions || !testEndTimestamp) return;
    lastTickRef.current = Date.now();

    const tick = () => {
      const nowMs = Date.now();
      const deltaSec = Math.max(0, (nowMs - lastTickRef.current) / 1000);
      lastTickRef.current = nowMs;

      const curQ = activeQuestions[currentIdx];
      if (curQ && deltaSec > 0 && deltaSec < 5) {
        setDrafts((prev) => {
          const cur = prev[curQ.id];
          if (!cur) return prev;
          return {
            ...prev,
            [curQ.id]: {
              ...cur,
              visited: true,
              timeSpentSeconds: cur.timeSpentSeconds + deltaSec,
            },
          };
        });
      }

      const rem = Math.max(0, Math.ceil((testEndTimestamp - nowMs) / 1000));
      setRemainingSec(rem);
      if (rem <= 0) {
        handleSubmitTest(true);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestions, testEndTimestamp, currentIdx]);

  const startTest = () => {
    if (matchingQuestions.length === 0) {
      pushToast(
        'No Matching Questions',
        'Adjust your filters or add questions in the Question Bank tab.',
        'info'
      );
      return;
    }
    const count = Math.min(matchingQuestions.length, Math.max(1, numQuestions));
    const shuffled = [...matchingQuestions].sort(() => Math.random() - 0.5).slice(0, count);
    const initDrafts: Record<string, DraftAnswerState> = {};
    shuffled.forEach((q, idx) => {
      initDrafts[q.id] = {
        selectedOptionIndex: null,
        selectedOptionIndices: [],
        natAnswer: '',
        markedForReview: false,
        visited: idx === 0,
        timeSpentSeconds: 0,
      };
    });
    const durSec = Math.max(1, durationMinutes) * 60;
    setDrafts(initDrafts);
    setActiveQuestions(shuffled);
    setCurrentIdx(0);
    setLatestResult(null);
    setTestStartedIso(new Date().toISOString());
    setTestEndTimestamp(Date.now() + durSec * 1000);
    setRemainingSec(durSec);
  };

  const handleSubmitTest = async (autoTimeout = false) => {
    if (!activeQuestions) return;
    const responses = activeQuestions.map((q) =>
      evaluateQuestionResponse(
        q,
        drafts[q.id] ?? {
          markedForReview: false,
          visited: false,
          timeSpentSeconds: 0,
        }
      )
    );
    const maxMarks = activeQuestions.reduce((acc, q) => acc + q.marks, 0);
    const score = roundScore(
      responses.reduce((acc, r) => acc + r.marksAwarded, 0)
    );
    const attemptedCount = responses.filter((r) => r.isAttempted).length;
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const incorrectCount = attemptedCount - correctCount;
    const accuracyPercent =
      attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

    // Identify weak topics (< 60% accuracy in this test)
    const topicPerf = new Map<string, { att: number; cor: number }>();
    responses.forEach((r) => {
      if (!r.isAttempted) return;
      const prev = topicPerf.get(r.topicId) ?? { att: 0, cor: 0 };
      prev.att += 1;
      if (r.isCorrect) prev.cor += 1;
      topicPerf.set(r.topicId, prev);
    });
    const weakTopicIds: string[] = [];
    topicPerf.forEach((v, tid) => {
      if (v.att > 0 && (v.cor / v.att) * 100 < 60) weakTopicIds.push(tid);
    });

    const subjLabel =
      subjectFilter === 'all'
        ? 'Mixed Subjects'
        : gateSubjects.find((s) => s.id === subjectFilter)?.shortName ?? subjectFilter;
    const topLabel =
      topicFilter === 'all'
        ? 'Mixed Topics'
        : gateTopics.find((t) => t.id === topicFilter)?.title ?? topicFilter;

    const totalSpentSec = Math.round(
      responses.reduce((acc, r) => acc + r.timeSpentSeconds, 0)
    );

    const record: TestAttemptRecord = {
      id: generateId('test'),
      mode: 'topic-test',
      title: `${subjLabel} · ${topLabel}`,
      subjectFilter,
      topicFilter,
      dateIST: getISTDateString(),
      startedAt: testStartedIso,
      submittedAt: new Date().toISOString(),
      durationMinutes,
      actualTimeSeconds: totalSpentSec,
      totalQuestions: activeQuestions.length,
      attemptedCount,
      correctCount,
      incorrectCount,
      unattemptedCount: activeQuestions.length - attemptedCount,
      maxMarks,
      score,
      accuracyPercent,
      responses,
      weakTopicIds,
    };

    await recordTestAttempt(record);
    setActiveQuestions(null);
    setTestEndTimestamp(null);
    setShowCalc(false);
    setLatestResult(record);

    pushToast(
      autoTimeout ? 'Time Up — Test Submitted' : 'Test Evaluated & Saved',
      `Score: ${score}/${maxMarks} · Accuracy: ${accuracyPercent}%`,
      'success'
    );
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qbPrompt.trim() || !qbExplanation.trim()) {
      pushToast('Incomplete Question', 'Provide both prompt and explanation.', 'info');
      return;
    }
    if (qbType !== 'NAT' && qbOpts.some((o) => !o.trim())) {
      pushToast('Missing Options', 'Fill in all 4 options for MCQ/MSQ.', 'info');
      return;
    }
    const subj = gateSubjects.find((s) => s.id === qbSubj);
    const examSection = subj?.partGroup ?? 'Part A';
    const q: QuestionItem = {
      id: generateId('q'),
      subjectId: qbSubj,
      topicId: qbTopic,
      examSection,
      type: qbType,
      nature: qbNature,
      difficulty: qbDiff,
      marks: qbMarks,
      prompt: qbPrompt.trim(),
      options: qbType !== 'NAT' ? [...qbOpts] : undefined,
      correctOptionIndex: qbType === 'MCQ' ? qbCorrectIdx : undefined,
      correctOptionIndices: qbType === 'MSQ' ? [...qbCorrectIndices].sort() : undefined,
      natMin: qbType === 'NAT' ? Number(qbNatMin) : undefined,
      natMax: qbType === 'NAT' ? Number(qbNatMax) : undefined,
      explanation: qbExplanation.trim(),
      sourceTag: qbSourceTag,
      sourceReference: qbSourceRef.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await addQuestion(q);
    setQbPrompt('');
    setQbOpts(['', '', '', '']);
    setQbExplanation('');
    pushToast('Question Saved', 'Added to your persistent Question Bank.', 'success');
  };

  const handleImportDataset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : parsed?.questions ?? [];
      const valid: QuestionItem[] = [];
      for (const raw of arr) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Partial<QuestionItem>;
        if (!item.prompt || !item.subjectId || !item.topicId || !item.type) continue;
        valid.push({
          id: item.id ?? generateId('qimp'),
          subjectId: item.subjectId,
          topicId: item.topicId,
          examSection: item.examSection ?? 'Part A',
          type: item.type,
          nature: item.nature ?? 'Conceptual',
          difficulty: item.difficulty ?? 'Medium',
          marks: item.marks === 2 ? 2 : 1,
          prompt: item.prompt,
          options: item.options,
          correctOptionIndex: item.correctOptionIndex,
          correctOptionIndices: item.correctOptionIndices,
          natMin: item.natMin,
          natMax: item.natMax,
          natUnit: item.natUnit,
          explanation: item.explanation ?? 'Imported dataset item.',
          sourceTag: item.sourceTag ?? 'Imported Dataset',
          sourceReference: item.sourceReference,
          createdAt: item.createdAt ?? new Date().toISOString(),
        });
      }
      const count = await importQuestions(valid);
      pushToast('Dataset Imported', `Added/updated ${count} questions in IndexedDB.`, 'success');
    } catch {
      pushToast('Import Error', 'Please upload a valid JSON array of question objects.', 'info');
    } finally {
      e.target.value = '';
    }
  };

  // ==================== LIVE TEST RUNNER ====================
  if (activeQuestions) {
    const q = activeQuestions[currentIdx];
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

    const goToQuestion = (idx: number) => {
      const target = activeQuestions[idx];
      if (!target) return;
      setDrafts((prev) => ({
        ...prev,
        [target.id]: { ...(prev[target.id] ?? { markedForReview: false, timeSpentSeconds: 0, visited: true }), visited: true },
      }));
      setCurrentIdx(idx);
    };

    return (
      <div className="space-y-4">
        {/* Test Top Bar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Topic Practice Test · Question {currentIdx + 1} of {activeQuestions.length}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {q.type} · {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'} ·{' '}
              {q.type === 'MCQ'
                ? `Negative: -${q.marks}/3`
                : 'No Negative Marking'}{' '}
              · Source: {q.sourceTag}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCalc((c) => !c)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-500" />
              Calculator
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-sm font-mono font-bold text-blue-600 dark:text-blue-300 tabular-nums">
              {formatDurationMMSS(remainingSec)}
            </div>
            <button
              type="button"
              onClick={() => handleSubmitTest(false)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Submit Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Question Card */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 text-xs font-bold">
                    {q.type}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-xs font-semibold">
                    {q.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-xs font-semibold">
                    +{q.marks} / {q.type === 'MCQ' ? `-${q.marks}/3` : '0'}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Time on Q: {Math.round(draft.timeSpentSeconds)}s
                </span>
              </div>

              <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                {q.prompt}
              </p>

              {/* Answer Input */}
              {q.type === 'MCQ' && q.options && (
                <div className="space-y-2 pt-2">
                  {q.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        draft.selectedOptionIndex === idx
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={draft.selectedOptionIndex === idx}
                        onChange={() => setDraftField({ selectedOptionIndex: idx })}
                      />
                      <span className="text-sm">
                        <strong className="mr-2">{String.fromCharCode(65 + idx)}.</strong>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'MSQ' && q.options && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-amber-500 font-semibold">
                    Multiple Select (MSQ): Select ALL correct options.
                  </p>
                  {q.options.map((opt, idx) => {
                    const checked = (draft.selectedOptionIndices ?? []).includes(idx);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                          checked
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const curr = draft.selectedOptionIndices ?? [];
                            const next = checked
                              ? curr.filter((x) => x !== idx)
                              : [...curr, idx];
                            setDraftField({ selectedOptionIndices: next });
                          }}
                        />
                        <span className="text-sm">
                          <strong className="mr-2">{String.fromCharCode(65 + idx)}.</strong>
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'NAT' && (
                <div className="pt-2 space-y-2 max-w-xs">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Numerical Answer {q.natUnit ? `(${q.natUnit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={draft.natAnswer ?? ''}
                    onChange={(e) => setDraftField({ natAnswer: e.target.value })}
                    placeholder="Enter numeric value..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraftField({ markedForReview: !draft.markedForReview })
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    draft.markedForReview
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {draft.markedForReview ? 'Marked for Review' : 'Mark for Review'}
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
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Clear Response
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => goToQuestion(currentIdx - 1)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 disabled:opacity-40 text-xs font-semibold"
                >
                  Previous
                </button>
                {currentIdx < activeQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToQuestion(currentIdx + 1)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Save & Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmitTest(false)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Finish & Submit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Palette */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Question Palette
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((item, idx) => {
                const d = drafts[item.id];
                const answered =
                  item.type === 'MCQ'
                    ? d?.selectedOptionIndex !== null &&
                      d?.selectedOptionIndex !== undefined
                    : item.type === 'MSQ'
                      ? (d?.selectedOptionIndices?.length ?? 0) > 0
                      : (d?.natAnswer ?? '').trim() !== '';

                let style =
                  'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300';
                if (d?.markedForReview && answered) {
                  style = 'bg-purple-600 text-white ring-2 ring-emerald-400';
                } else if (d?.markedForReview) {
                  style = 'bg-purple-600 text-white';
                } else if (answered) {
                  style = 'bg-emerald-600 text-white';
                } else if (d?.visited) {
                  style = 'bg-amber-500/25 text-amber-600 dark:text-amber-300';
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToQuestion(idx)}
                    className={`h-9 rounded-lg text-xs font-bold tabular-nums transition ${style} ${
                      idx === currentIdx ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-navy-900' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-600 inline-block" /> Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/40 inline-block" /> Visited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-300 dark:bg-navy-700 inline-block" /> Not Visited
              </span>
            </div>
          </div>
        </div>

        {showCalc && <ScientificCalculator onClose={() => setShowCalc(false)} />}
      </div>
    );
  }

  // ==================== RESULTS REPORT VIEW ====================
  if (latestResult) {
    const qMap = new Map(questions.map((q) => [q.id, q]));
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                Test Report & Diagnostics
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {latestResult.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLatestResult(null)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              Back to Test Builder
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Score (GATE Rules)</p>
              <p className="text-2xl font-extrabold text-blue-500 tabular-nums">
                {latestResult.score} / {latestResult.maxMarks}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Accuracy</p>
              <p className="text-2xl font-extrabold text-emerald-500 tabular-nums">
                {latestResult.accuracyPercent}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Correct / Wrong / Skip</p>
              <p className="text-lg font-extrabold tabular-nums mt-1">
                {latestResult.correctCount} / {latestResult.incorrectCount} / {latestResult.unattemptedCount}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850">
              <p className="text-xs text-slate-500">Time Taken</p>
              <p className="text-2xl font-extrabold tabular-nums">
                {formatDurationMMSS(latestResult.actualTimeSeconds)}
              </p>
            </div>
          </div>

          {latestResult.weakTopicIds.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Weak topics detected in this test:{' '}
                  <strong>
                    {latestResult.weakTopicIds
                      .map((tid) => gateTopics.find((t) => t.id === tid)?.title ?? tid)
                      .join(', ')}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  for (const tid of latestResult.weakTopicIds) {
                    const top = gateTopics.find((t) => t.id === tid);
                    if (!top) continue;
                    const subj = gateSubjects.find((s) => s.id === top.subjectId);
                    await addManualRevisionItem({
                      topicId: top.id,
                      subjectId: top.subjectId,
                      subjectName: subj?.shortName ?? top.subjectId,
                      topicTitle: top.title,
                      category: 'GATE',
                      needsRetest: true,
                    });
                  }
                  pushToast(
                    'Added to Revision Queue',
                    'Weak topics scheduled for conceptual revision today.',
                    'success'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Schedule Weak Topics for Revision
              </button>
            </div>
          )}

          {/* Detailed Question Breakdown */}
          <div className="space-y-3">
            {latestResult.responses.map((resp, idx) => {
              const q = qMap.get(resp.questionId);
              if (!q) return null;
              return (
                <div
                  key={resp.questionId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      {resp.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : resp.isAttempted ? (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Flag className="w-4 h-4 text-slate-400" />
                      )}
                      Q{idx + 1} · {q.type} ({q.marks}M)
                    </span>
                    <span className="font-mono">
                      Marks: <strong>{resp.marksAwarded}</strong> · Time: {resp.timeSpentSeconds}s
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium">{q.prompt}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your Answer:{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {!resp.isAttempted
                        ? 'Unattempted'
                        : q.type === 'MCQ'
                          ? String.fromCharCode(65 + (resp.selectedOptionIndex ?? 0))
                          : q.type === 'MSQ'
                            ? (resp.selectedOptionIndices ?? [])
                                .map((i) => String.fromCharCode(65 + i))
                                .join(', ')
                            : resp.natAnswer}
                    </strong>{' '}
                    | Correct:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {q.type === 'MCQ'
                        ? String.fromCharCode(65 + (q.correctOptionIndex ?? 0))
                        : q.type === 'MSQ'
                          ? (q.correctOptionIndices ?? [])
                              .map((i) => String.fromCharCode(65 + i))
                              .join(', ')
                          : q.natMin === q.natMax
                            ? `${q.natMin}${q.natUnit ? ` ${q.natUnit}` : ''}`
                            : `${q.natMin} to ${q.natMax}${q.natUnit ? ` ${q.natUnit}` : ''}`}
                    </strong>
                  </p>
                  <p className="text-xs bg-slate-50 dark:bg-navy-850 p-2.5 rounded-lg text-slate-600 dark:text-slate-300">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== BUILDER / QUESTION BANK / HISTORY TABS ====================
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { id: 'builder', label: 'Topic Test Builder', icon: ClipboardCheck },
              { id: 'bank', label: `Question Bank (${questions.length})`, icon: Database },
              { id: 'history', label: `Test History (${testAttempts.length})`, icon: RefreshCw },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  tab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Built-in items are labeled “Original Practice” — never mislabeled as official PYQs.
        </span>
      </div>

      {tab === 'builder' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 space-y-5 max-w-4xl">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Configure Topic-Wise Examination
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official GATE 2027 marking applied automatically (MCQ -1/3 or -2/3, MSQ & NAT 0 negative).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setTopicFilter('all');
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
              >
                <option value="all">All Subjects (Mixed)</option>
                {gateSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Topic</label>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
              >
                <option value="all">All Topics (Mixed)</option>
                {gateTopics
                  .filter((t) => subjectFilter === 'all' || t.subjectId === subjectFilter)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Difficulty</label>
              <select
                value={difficultyFilter}
                onChange={(e) =>
                  setDifficultyFilter(e.target.value as 'All' | QuestionDifficulty)
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Question Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'All' | QuestionType)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
              >
                <option value="All">Mixed (MCQ + MSQ + NAT)</option>
                <option value="MCQ">MCQ Only</option>
                <option value="MSQ">MSQ Only</option>
                <option value="NAT">NAT Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Question Nature</label>
              <select
                value={natureFilter}
                onChange={(e) =>
                  setNatureFilter(e.target.value as 'All' | QuestionNature)
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
              >
                <option value="All">Conceptual & Numerical</option>
                <option value="Conceptual">Conceptual Only</option>
                <option value="Numerical">Numerical Problems Only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">Questions</label>
                <input
                  type="number"
                  min={1}
                  max={65}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Minutes</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <strong className="text-slate-900 dark:text-white">
                {matchingQuestions.length} matching questions available
              </strong>{' '}
              in your question bank for these filters.
            </div>
            <button
              type="button"
              onClick={startTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Practice Test
            </button>
          </div>
        </div>
      )}

      {tab === 'bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Add Question Form */}
          <form
            onSubmit={handleAddQuestion}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3"
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-500" />
              Add Question to Bank
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={qbSubj}
                onChange={(e) => {
                  const v = e.target.value;
                  setQbSubj(v);
                  const t = gateTopics.find((gt) => gt.subjectId === v);
                  if (t) setQbTopic(t.id);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-2 text-xs"
              >
                {gateSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
              </select>
              <select
                value={qbTopic}
                onChange={(e) => setQbTopic(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-2 text-xs"
              >
                {gateTopics
                  .filter((t) => t.subjectId === qbSubj)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <select
                value={qbType}
                onChange={(e) => setQbType(e.target.value as QuestionType)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1.5 text-xs"
              >
                <option value="MCQ">MCQ</option>
                <option value="MSQ">MSQ</option>
                <option value="NAT">NAT</option>
              </select>
              <select
                value={qbNature}
                onChange={(e) => setQbNature(e.target.value as QuestionNature)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1.5 text-xs"
              >
                <option value="Conceptual">Concept</option>
                <option value="Numerical">Numerical</option>
              </select>
              <select
                value={qbDiff}
                onChange={(e) => setQbDiff(e.target.value as QuestionDifficulty)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1.5 text-xs"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <select
                value={qbMarks}
                onChange={(e) => setQbMarks(Number(e.target.value) as 1 | 2)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1.5 text-xs"
              >
                <option value={1}>1 Mark</option>
                <option value={2}>2 Marks</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={qbSourceTag}
                onChange={(e) => setQbSourceTag(e.target.value as QuestionSourceTag)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
              >
                <option value="Original Practice">Original Practice</option>
                <option value="Self-Entered Reference">Self-Entered Reference</option>
                <option value="Imported Dataset">Imported Dataset</option>
              </select>
              <input
                type="text"
                value={qbSourceRef}
                onChange={(e) => setQbSourceRef(e.target.value)}
                placeholder="Source note (optional)"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
              />
            </div>

            <textarea
              rows={3}
              value={qbPrompt}
              onChange={(e) => setQbPrompt(e.target.value)}
              placeholder="Enter question statement..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 p-2.5 text-xs"
              required
            />

            {qbType !== 'NAT' ? (
              <div className="space-y-1.5">
                {qbOpts.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {qbType === 'MCQ' ? (
                      <input
                        type="radio"
                        name="qb-mcq-ans"
                        checked={qbCorrectIdx === idx}
                        onChange={() => setQbCorrectIdx(idx)}
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={qbCorrectIndices.includes(idx)}
                        onChange={() =>
                          setQbCorrectIndices((prev) =>
                            prev.includes(idx)
                              ? prev.filter((x) => x !== idx)
                              : [...prev, idx]
                          )
                        }
                      />
                    )}
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...qbOpts] as [string, string, string, string];
                        next[idx] = e.target.value;
                        setQbOpts(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={qbNatMin}
                  onChange={(e) => setQbNatMin(e.target.value)}
                  placeholder="NAT Min"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                />
                <input
                  type="number"
                  step="any"
                  value={qbNatMax}
                  onChange={(e) => setQbNatMax(e.target.value)}
                  placeholder="NAT Max"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                />
              </div>
            )}

            <textarea
              rows={2}
              value={qbExplanation}
              onChange={(e) => setQbExplanation(e.target.value)}
              placeholder="Step-by-step solution explanation..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 p-2.5 text-xs"
              required
            />

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              Save Question to IndexedDB
            </button>
          </form>

          {/* Bank List + Import/Export */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Question Bank Explorer ({questions.length})
              </h4>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportDataset}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `focusforge-question-bank-${getISTDateString()}.json`,
                      JSON.stringify(questions, null, 2),
                      'application/json'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-850 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300">
                        {q.type} · {q.marks}M
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
                        {gateSubjects.find((s) => s.id === q.subjectId)?.shortName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                        {q.sourceTag}
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-1.5 line-clamp-2">{q.prompt}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(q.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    aria-label="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5">
          {testAttempts.length === 0 ? (
            <p className="text-xs text-slate-500">No tests submitted yet.</p>
          ) : (
            <div className="space-y-2.5">
              {testAttempts.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {a.dateIST} · {a.mode} · {a.totalQuestions} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-bold text-blue-500 tabular-nums">
                      Score: {a.score}/{a.maxMarks}
                    </span>
                    <span className="font-bold text-emerald-500 tabular-nums">
                      Accuracy: {a.accuracyPercent}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setLatestResult(a)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 font-semibold"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

