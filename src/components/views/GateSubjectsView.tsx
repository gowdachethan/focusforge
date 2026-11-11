import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  Play,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { OFFICIAL_GATE_2027_PATTERN } from '../../data/gateSyllabus';
import { GateTopic, TopicLearningStatus } from '../../types';
import { CircularProgress } from '../common/CircularProgress';
import { formatMinutesHuman } from '../../utils/date';
import { generateId } from '../../utils/id';

export const GateSubjectsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    gateSubjects,
    gateTopics,
    revisions,
    testAttempts,
    analytics,
    toggleGateSubtopic,
    markTopicStatus,
    updateGateTopic,
    launchStartStudyWith,
    launchTestWith,
    pushToast,
  } = useFocusForge();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('gate-robotics');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(
    'robo-classification-kinematics'
  );
  const [showOfficialModal, setShowOfficialModal] = useState<boolean>(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const visibleSubjects = useMemo(() => {
    return gateSubjects.filter(
      (s) => settings.showAllOfficialSections || s.isPrimaryTrack
    );
  }, [gateSubjects, settings.showAllOfficialSections]);

  const activeSubject =
    visibleSubjects.find((s) => s.id === selectedSubjectId) ?? visibleSubjects[0];

  const subjectTopics = useMemo(() => {
    return gateTopics.filter((t) => t.subjectId === activeSubject?.id);
  }, [gateTopics, activeSubject]);

  const getSubjectStats = (subjId: string) => {
    const topics = gateTopics.filter((t) => t.subjectId === subjId);
    const done = topics.filter((t) => t.status === 'completed').length;
    const pct = topics.length > 0 ? Math.round((done / topics.length) * 100) : 0;
    const subBreakdown = analytics.subjectBreakdown.find((b) => b.subjectId === subjId);
    const weakCount = analytics.topicAccuracyList.filter(
      (t) => t.subjectId === subjId && t.isWeak
    ).length;
    return {
      total: topics.length,
      done,
      pct,
      studyMinutes: subBreakdown?.studyMinutes ?? 0,
      accuracy: subBreakdown?.accuracyPercent ?? 0,
      attempted: subBreakdown?.attempted ?? 0,
      weakCount,
    };
  };

  const activeStats = activeSubject ? getSubjectStats(activeSubject.id) : null;

  const handleAddPracticeLink = async (topic: GateTopic) => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      pushToast('Link Missing', 'Provide both a label and valid URL.', 'info');
      return;
    }
    const safeUrl = newLinkUrl.trim().startsWith('http')
      ? newLinkUrl.trim()
      : `https://${newLinkUrl.trim()}`;
    await updateGateTopic(topic.id, {
      practiceLinks: [
        ...topic.practiceLinks,
        { id: generateId('pl'), label: newLinkLabel.trim(), url: safeUrl },
      ],
    });
    setNewLinkLabel('');
    setNewLinkUrl('');
    pushToast('Practice Link Added', `Saved to ${topic.title}.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              GATE 2027 RA Official Syllabus Command
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300">
              IIT Madras Official Source
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            General Aptitude (15M) + Part A Compulsory (60M: A.1 Math, A.2 Mechatronics, A.3 Robotics & Automation) + Part B Optional (25M: B1 Electrical / B2 Mechanical).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-navy-800 px-3 py-2 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showAllOfficialSections}
              onChange={(e) =>
                updateSettings({ showAllOfficialSections: e.target.checked })
              }
              className="rounded"
            />
            Show Part B1.1 & B1.2 too
          </label>
          <button
            type="button"
            onClick={() => setShowOfficialModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            <FileCheck2 className="w-4 h-4" />
            Official Pattern & PDF View
          </button>
        </div>
      </div>

      {/* Subject Cards Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {visibleSubjects.map((subj) => {
          const st = getSubjectStats(subj.id);
          const isSelected = subj.id === activeSubject?.id;
          return (
            <button
              key={subj.id}
              type="button"
              onClick={() => {
                setSelectedSubjectId(subj.id);
                const firstTopic = gateTopics.find((t) => t.subjectId === subj.id);
                setExpandedTopicId(firstTopic?.id ?? null);
              }}
              className={`text-left rounded-2xl border p-4 transition flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {subj.officialSection}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {subj.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{st.done}/{st.total} topics</span>
                  <span>·</span>
                  <span>{formatMinutesHuman(st.studyMinutes)}</span>
                  {st.weakCount > 0 && (
                    <span className="text-amber-500 font-semibold">
                      · {st.weakCount} weak
                    </span>
                  )}
                </div>
              </div>
              <CircularProgress
                percent={st.pct}
                size={54}
                strokeWidth={5}
                progressColor={isSelected ? 'stroke-blue-500' : 'stroke-emerald-500'}
                label={`${st.pct}%`}
              />
            </button>
          );
        })}
      </div>

      {/* Selected Subject Dashboard */}
      {activeSubject && activeStats && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-300 text-xs font-bold">
                  {activeSubject.officialSection}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {activeSubject.marksWeightage}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {activeSubject.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                {activeSubject.description}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Subject Accuracy</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {activeStats.attempted > 0 ? `${activeStats.accuracy}%` : 'No tests yet'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Time Logged</p>
                <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatMinutesHuman(activeStats.studyMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* Topic Checklist & Detailed Accordion */}
          <div className="space-y-3">
            {subjectTopics.map((topic) => {
              const expanded = expandedTopicId === topic.id;
              const subDone = topic.subtopics.filter((st) => st.completed).length;
              const topicPerf = analytics.topicAccuracyList.find(
                (t) => t.topicId === topic.id
              );
              const revItem = revisions.find((r) => r.topicId === topic.id);
              const topicTestsCount = testAttempts.filter((a) =>
                a.responses.some((r) => r.topicId === topic.id)
              ).length;

              return (
                <div
                  key={topic.id}
                  className={`rounded-xl border transition ${
                    topicPerf?.isWeak
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-navy-850/70'
                  }`}
                >
                  {/* Topic Header Row */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div
                      className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() =>
                        setExpandedTopicId(expanded ? null : topic.id)
                      }
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markTopicStatus(
                            topic.id,
                            topic.status === 'completed' ? 'in-progress' : 'completed'
                          );
                        }}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                          topic.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
                        }`}
                        aria-label={`Toggle completion for ${topic.title}`}
                      >
                        {topic.status === 'completed' && (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {topic.sectionCode}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {topic.title}
                          </h4>
                          {topicPerf?.isWeak && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              Weak Topic ({topicPerf.accuracyPercent}%)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Subtopics: {subDone}/{topic.subtopics.length}
                          </span>
                          <span>·</span>
                          <span>Logged: {formatMinutesHuman(topic.studyMinutes)}</span>
                          <span>·</span>
                          <span>
                            Tests: {topicTestsCount}
                            {topicPerf && topicPerf.attempted > 0
                              ? ` (${topicPerf.accuracyPercent}% acc)`
                              : ''}
                          </span>
                          {revItem && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                {revItem.status === 'mastered'
                                  ? 'Mastered'
                                  : `Next rev: ${revItem.nextDueDateIST}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={topic.status}
                        onChange={(e) =>
                          markTopicStatus(
                            topic.id,
                            e.target.value as TopicLearningStatus
                          )
                        }
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <option value="not-started">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="needs-review">Needs Review</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          launchStartStudyWith({
                            category: 'GATE',
                            subjectId: activeSubject.id,
                            topicId: topic.id,
                            objective: `Study & master ${topic.title}`,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Study
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          launchTestWith({
                            subjectId: activeSubject.id,
                            topicId: topic.id,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      >
                        <Target className="w-3 h-3" />
                        Test
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTopicId(expanded ? null : topic.id)
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        aria-label="Expand topic details"
                      >
                        {expanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Topic Workspace */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="p-3 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="text-slate-900 dark:text-white">
                          Official Syllabus Text:
                        </strong>{' '}
                        {topic.officialSummary}
                      </div>

                      {/* Subtopic Checkboxes */}
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                          Subtopic Checklist
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {topic.subtopics.map((st) => (
                            <label
                              key={st.id}
                              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-500/40"
                            >
                              <input
                                type="checkbox"
                                checked={st.completed}
                                onChange={() =>
                                  toggleGateSubtopic(topic.id, st.id)
                                }
                                className="mt-0.5 rounded border-slate-400 text-blue-600"
                              />
                              <span
                                className={`text-xs ${
                                  st.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {st.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Formula Notes & Concept Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                            Formula Notes (Auto-synced to Revision)
                          </label>
                          <textarea
                            rows={4}
                            value={topic.formulaNotes}
                            onChange={(e) =>
                              updateGateTopic(topic.id, {
                                formulaNotes: e.target.value,
                              })
                            }
                            placeholder="Write key equations, theorems, conditions..."
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                            Concept Notes & Pitfalls
                          </label>
                          <textarea
                            rows={4}
                            value={topic.conceptNotes}
                            onChange={(e) =>
                              updateGateTopic(topic.id, {
                                conceptNotes: e.target.value,
                              })
                            }
                            placeholder="Capture intuition, boundary cases, common mistakes..."
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Practice Links & Weak Flag */}
                      <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
                        <div className="space-y-2 flex-1 min-w-[260px]">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Practice Question & Reference Links
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {topic.practiceLinks.map((pl) => (
                              <div
                                key={pl.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 text-xs"
                              >
                                <a
                                  href={pl.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  {pl.label}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateGateTopic(topic.id, {
                                      practiceLinks: topic.practiceLinks.filter(
                                        (x) => x.id !== pl.id
                                      ),
                                    })
                                  }
                                  className="text-slate-400 hover:text-rose-500"
                                  aria-label="Remove link"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <input
                              type="text"
                              value={newLinkLabel}
                              onChange={(e) => setNewLinkLabel(e.target.value)}
                              placeholder="Link title"
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              placeholder="https://..."
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 px-2.5 py-1.5 text-xs flex-1 min-w-[180px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddPracticeLink(topic)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-navy-700 text-white text-xs font-semibold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Link
                            </button>
                          </div>
                        </div>

                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={topic.flaggedWeak}
                            onChange={(e) =>
                              updateGateTopic(topic.id, {
                                flaggedWeak: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          Flag as Weak Topic for Extra Review
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official GATE 2027 RA Syllabus & Pattern Modal */}
      {showOfficialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-blue-500" />
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Official GATE 2027 RA Paper Pattern & Syllabus Source
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowOfficialModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Organizing Inst.</p>
                <p className="font-bold mt-0.5">{OFFICIAL_GATE_2027_PATTERN.organizingInstitute}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Total Questions</p>
                <p className="font-bold mt-0.5">{OFFICIAL_GATE_2027_PATTERN.totalQuestions} (10 GA + 55 RA)</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Total Marks</p>
                <p className="font-bold mt-0.5">{OFFICIAL_GATE_2027_PATTERN.totalMarks} Marks</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Duration</p>
                <p className="font-bold mt-0.5">{OFFICIAL_GATE_2027_PATTERN.durationMinutes} Minutes</p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Marks Distribution (RA – Robotics and Automation)
              </h5>
              {OFFICIAL_GATE_2027_PATTERN.marksDistribution.map((m) => (
                <div
                  key={m.section}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div>
                    <p className="font-bold">{m.section}</p>
                    <p className="text-slate-500 dark:text-slate-400">{m.rule}</p>
                  </div>
                  <span className="font-extrabold text-emerald-500">{m.marks} Marks</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                Negative Marking Scheme
              </h5>
              <ul className="list-disc pl-5 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                {OFFICIAL_GATE_2027_PATTERN.negativeMarkingRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/RA_GATE2027_Syllabus.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
              >
                Official RA Syllabus PDF <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/GA_GATE2027_Syllabus.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
              >
                Official GA Syllabus PDF <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

