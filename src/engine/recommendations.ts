import {
  GateSubject,
  GateTopic,
  RevisionItem,
  RoboticsSkill,
  StudyCategory,
  StudySessionRecord,
  TestAttemptRecord,
  UserSettings,
} from '../types';
import {
  addDaysToISTDateString,
  diffISTDateDays,
  getISTDateString,
  getISTMonthPrefix,
  getISTWeekStartMonday,
} from '../utils/date';

export interface TopicAccuracyStat {
  topicId: string;
  subjectId: string;
  topicTitle: string;
  subjectName: string;
  attempted: number;
  correct: number;
  accuracyPercent: number;
  isWeak: boolean;
}

export interface SubjectAccuracyStat {
  subjectId: string;
  subjectName: string;
  attempted: number;
  correct: number;
  accuracyPercent: number;
  studyMinutes: number;
  completedTopics: number;
  totalTopics: number;
}

export interface RealAnalyticsSummary {
  totalStudyMinutes: number;
  todayStudyMinutes: number;
  weeklyStudyMinutes: number;
  monthlyStudyMinutes: number;
  gateMinutes: number;
  skillsMinutes: number;
  gateSharePercent: number;
  skillsSharePercent: number;
  streakDays: number;
  weeklyGoalPercent: number;
  dailyGoalPercent: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
  topicCompletionPercent: number;
  skillsCompletionPercent: number;
  totalTestAttempts: number;
  overallAccuracyPercent: number;
  revisionCompletedCount: number;
  overdueRevisionsCount: number;
  todayRevisionsCount: number;
  upcomingRevisionsCount: number;
  dailyHoursSeries: { dateIST: string; label: string; gateHours: number; skillHours: number; totalHours: number }[];
  subjectBreakdown: SubjectAccuracyStat[];
  topicAccuracyList: TopicAccuracyStat[];
  weakestTopics: TopicAccuracyStat[];
  testTrendSeries: { index: number; label: string; scorePercent: number; accuracyPercent: number; mode: string }[];
}

export function computeStudyStreakIST(
  sessions: StudySessionRecord[],
  todayIST: string = getISTDateString()
): number {
  const activeDays = new Set(
    sessions.filter((s) => s.actualSeconds >= 60).map((s) => s.dateIST)
  );
  if (activeDays.size === 0) return 0;

  let cursor = activeDays.has(todayIST)
    ? todayIST
    : addDaysToISTDateString(todayIST, -1);

  if (!activeDays.has(cursor)) return 0;

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = addDaysToISTDateString(cursor, -1);
  }
  return streak;
}

export function computeRealAnalytics(params: {
  sessions: StudySessionRecord[];
  gateSubjects: GateSubject[];
  gateTopics: GateTopic[];
  roboticsSkills: RoboticsSkill[];
  testAttempts: TestAttemptRecord[];
  revisions: RevisionItem[];
  settings: UserSettings;
  now?: Date;
}): RealAnalyticsSummary {
  const {
    sessions,
    gateSubjects,
    gateTopics,
    roboticsSkills,
    testAttempts,
    revisions,
    settings,
    now = new Date(),
  } = params;

  const todayIST = getISTDateString(now);
  const weekStartIST = getISTWeekStartMonday(todayIST);
  const monthPrefix = getISTMonthPrefix(todayIST);

  let totalSeconds = 0;
  let todaySeconds = 0;
  let weeklySeconds = 0;
  let monthlySeconds = 0;
  let gateSeconds = 0;
  let skillsSeconds = 0;

  const dayMap = new Map<string, { gateSec: number; skillSec: number }>();
  const subjectMinutesMap = new Map<string, number>();

  for (const s of sessions) {
    const sec = Math.max(0, s.actualSeconds || s.actualMinutes * 60);
    totalSeconds += sec;
    if (s.dateIST === todayIST) todaySeconds += sec;
    if (s.dateIST >= weekStartIST && s.dateIST <= todayIST) weeklySeconds += sec;
    if (s.dateIST.startsWith(monthPrefix)) monthlySeconds += sec;
    if (s.category === 'GATE') gateSeconds += sec;
    else skillsSeconds += sec;

    const existing = dayMap.get(s.dateIST) ?? { gateSec: 0, skillSec: 0 };
    if (s.category === 'GATE') existing.gateSec += sec;
    else existing.skillSec += sec;
    dayMap.set(s.dateIST, existing);

    subjectMinutesMap.set(s.subjectId, (subjectMinutesMap.get(s.subjectId) ?? 0) + sec / 60);
  }

  const totalStudyMinutes = Math.round(totalSeconds / 60);
  const todayStudyMinutes = Math.round(todaySeconds / 60);
  const weeklyStudyMinutes = Math.round(weeklySeconds / 60);
  const monthlyStudyMinutes = Math.round(monthlySeconds / 60);
  const gateMinutes = Math.round(gateSeconds / 60);
  const skillsMinutes = Math.round(skillsSeconds / 60);

  const combinedSplit = gateMinutes + skillsMinutes;
  const gateSharePercent = combinedSplit > 0 ? Math.round((gateMinutes / combinedSplit) * 100) : 0;
  const skillsSharePercent = combinedSplit > 0 ? 100 - gateSharePercent : 0;

  // Last 14 days series in Asia/Kolkata
  const dailyHoursSeries: RealAnalyticsSummary['dailyHoursSeries'] = [];
  for (let offset = -13; offset <= 0; offset++) {
    const d = addDaysToISTDateString(todayIST, offset);
    const entry = dayMap.get(d) ?? { gateSec: 0, skillSec: 0 };
    const gateHours = Number((entry.gateSec / 3600).toFixed(2));
    const skillHours = Number((entry.skillSec / 3600).toFixed(2));
    const [, mm, dd] = d.split('-');
    dailyHoursSeries.push({
      dateIST: d,
      label: `${dd}/${mm}`,
      gateHours,
      skillHours,
      totalHours: Number((gateHours + skillHours).toFixed(2)),
    });
  }

  // Test accuracy per topic & subject
  const topicPerfMap = new Map<string, { attempted: number; correct: number }>();
  const subjectPerfMap = new Map<string, { attempted: number; correct: number }>();

  let totalAttempted = 0;
  let totalCorrect = 0;

  for (const attempt of testAttempts) {
    for (const r of attempt.responses) {
      if (!r.isAttempted) continue;
      totalAttempted += 1;
      if (r.isCorrect) totalCorrect += 1;

      const tPrev = topicPerfMap.get(r.topicId) ?? { attempted: 0, correct: 0 };
      tPrev.attempted += 1;
      if (r.isCorrect) tPrev.correct += 1;
      topicPerfMap.set(r.topicId, tPrev);

      const sPrev = subjectPerfMap.get(r.subjectId) ?? { attempted: 0, correct: 0 };
      sPrev.attempted += 1;
      if (r.isCorrect) sPrev.correct += 1;
      subjectPerfMap.set(r.subjectId, sPrev);
    }
  }

  const subjectById = new Map(gateSubjects.map((s) => [s.id, s]));

  const topicAccuracyList: TopicAccuracyStat[] = gateTopics.map((topic) => {
    const perf = topicPerfMap.get(topic.id) ?? { attempted: 0, correct: 0 };
    const accuracyPercent =
      perf.attempted > 0 ? Math.round((perf.correct / perf.attempted) * 100) : 0;
    const isWeak =
      topic.flaggedWeak ||
      topic.status === 'needs-review' ||
      (perf.attempted >= 1 && accuracyPercent < 60);
    return {
      topicId: topic.id,
      subjectId: topic.subjectId,
      topicTitle: topic.title,
      subjectName: subjectById.get(topic.subjectId)?.shortName ?? topic.subjectId,
      attempted: perf.attempted,
      correct: perf.correct,
      accuracyPercent,
      isWeak,
    };
  });

  const weakestTopics = topicAccuracyList
    .filter((t) => t.isWeak)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent || b.attempted - a.attempted);

  const visibleSubjects = gateSubjects.filter(
    (s) => settings.showAllOfficialSections || s.isPrimaryTrack || s.partGroup !== 'Part B1'
  );

  const subjectBreakdown: SubjectAccuracyStat[] = visibleSubjects.map((subj) => {
    const topics = gateTopics.filter((t) => t.subjectId === subj.id);
    const completedTopics = topics.filter((t) => t.status === 'completed').length;
    const perf = subjectPerfMap.get(subj.id) ?? { attempted: 0, correct: 0 };
    const accuracyPercent =
      perf.attempted > 0 ? Math.round((perf.correct / perf.attempted) * 100) : 0;
    return {
      subjectId: subj.id,
      subjectName: subj.shortName,
      attempted: perf.attempted,
      correct: perf.correct,
      accuracyPercent,
      studyMinutes: Math.round(subjectMinutesMap.get(subj.id) ?? 0),
      completedTopics,
      totalTopics: topics.length,
    };
  });

  // Robotics & AI completion percentage
  let totalSkillItems = 0;
  let doneSkillItems = 0;
  for (const sk of roboticsSkills) {
    const items = [...sk.roadmap, ...sk.assignments, ...sk.milestones];
    totalSkillItems += items.length;
    doneSkillItems += items.filter((i) => i.completed).length;
  }

  const completedTopicsCount = gateTopics.filter((t) => t.status === 'completed').length;
  const totalTopicsCount = gateTopics.length;
  const topicCompletionPercent =
    totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;
  const skillsCompletionPercent =
    totalSkillItems > 0 ? Math.round((doneSkillItems / totalSkillItems) * 100) : 0;

  let overdueRevisionsCount = 0;
  let todayRevisionsCount = 0;
  let upcomingRevisionsCount = 0;
  let revisionCompletedCount = 0;

  for (const rev of revisions) {
    revisionCompletedCount += rev.revisionCount;
    if (rev.status === 'mastered') continue;
    const delta = diffISTDateDays(todayIST, rev.nextDueDateIST);
    if (delta < 0) overdueRevisionsCount += 1;
    else if (delta === 0) todayRevisionsCount += 1;
    else upcomingRevisionsCount += 1;
  }

  const sortedAttempts = [...testAttempts].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt)
  );
  const testTrendSeries = sortedAttempts.map((a, idx) => ({
    index: idx + 1,
    label: `#${idx + 1} (${a.dateIST.slice(5)})`,
    scorePercent: a.maxMarks > 0 ? Math.max(0, Math.round((a.score / a.maxMarks) * 100)) : 0,
    accuracyPercent: Math.round(a.accuracyPercent),
    mode: a.mode === 'mock-exam' ? 'Mock' : 'Topic',
  }));

  const weeklyGoalMinutes = Math.max(60, settings.weeklyStudyTargetHours * 60);

  return {
    totalStudyMinutes,
    todayStudyMinutes,
    weeklyStudyMinutes,
    monthlyStudyMinutes,
    gateMinutes,
    skillsMinutes,
    gateSharePercent,
    skillsSharePercent,
    streakDays: computeStudyStreakIST(sessions, todayIST),
    weeklyGoalPercent: Math.min(100, Math.round((weeklyStudyMinutes / weeklyGoalMinutes) * 100)),
    dailyGoalPercent: Math.min(
      100,
      Math.round((todayStudyMinutes / Math.max(15, settings.dailyStudyTargetMinutes)) * 100)
    ),
    completedTopicsCount,
    totalTopicsCount,
    topicCompletionPercent,
    skillsCompletionPercent,
    totalTestAttempts: testAttempts.length,
    overallAccuracyPercent:
      totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
    revisionCompletedCount,
    overdueRevisionsCount,
    todayRevisionsCount,
    upcomingRevisionsCount,
    dailyHoursSeries,
    subjectBreakdown,
    topicAccuracyList,
    weakestTopics,
    testTrendSeries,
  };
}

export interface StudyRecommendation {
  nextStudy: {
    category: StudyCategory;
    subjectId: string;
    subjectName: string;
    topicId: string;
    topicName: string;
    reason: string;
    revisitBeforeAdvancing: boolean;
  };
  nextRevision: {
    revisionId?: string;
    subjectName: string;
    topicTitle: string;
    topicId?: string;
    statusLabel: string;
    reason: string;
  };
  nextTest: {
    subjectId: string;
    subjectName: string;
    topicId: string;
    topicName: string;
    reason: string;
  };
  attentionSubject: {
    subjectId: string;
    subjectName: string;
    reason: string;
  };
}

export function generateSmartRecommendations(params: {
  analytics: RealAnalyticsSummary;
  gateSubjects: GateSubject[];
  gateTopics: GateTopic[];
  roboticsSkills: RoboticsSkill[];
  revisions: RevisionItem[];
  settings: UserSettings;
  todayIST?: string;
}): StudyRecommendation {
  const {
    analytics,
    gateSubjects,
    gateTopics,
    roboticsSkills,
    revisions,
    settings,
    todayIST = getISTDateString(),
  } = params;

  const subjectMap = new Map(gateSubjects.map((s) => [s.id, s]));

  if (gateTopics.length === 0 || gateSubjects.length === 0) {
    return {
      nextStudy: {
        category: 'GATE',
        subjectId: 'gate-robotics',
        subjectName: 'Robotics and Automation',
        topicId: 'robo-classification-kinematics',
        topicName: 'Robotic Classification & Kinematics',
        reason: 'Loading your personalized study recommendations...',
        revisitBeforeAdvancing: false,
      },
      nextRevision: {
        subjectName: 'Revision Queue',
        topicTitle: 'Loading...',
        statusLabel: 'Ready',
        reason: 'Complete a topic to schedule spaced repetition.',
      },
      nextTest: {
        subjectId: 'gate-robotics',
        subjectName: 'Robotics and Automation',
        topicId: 'robo-classification-kinematics',
        topicName: 'Robotic Classification & Kinematics',
        reason: 'Baseline test ready once syllabus loads.',
      },
      attentionSubject: {
        subjectId: 'gate-robotics',
        subjectName: 'Robotics and Automation',
        reason: 'Loading subject breakdown...',
      },
    };
  }

  // 1. Check if GATE vs Robotics allocation is skewed below target
  const needSkillsFocus =
    analytics.totalStudyMinutes >= 60 &&
    analytics.skillsSharePercent < settings.skillsAllocationTargetPercent - 8;

  // 2. Check if any topic has low test accuracy -> recommend revisiting concepts before advancing!
  const lowAccuracyWeak = analytics.weakestTopics.find((t) => t.attempted >= 1);

  let nextStudy: StudyRecommendation['nextStudy'];

  if (lowAccuracyWeak) {
    nextStudy = {
      category: 'GATE',
      subjectId: lowAccuracyWeak.subjectId,
      subjectName: subjectMap.get(lowAccuracyWeak.subjectId)?.name ?? lowAccuracyWeak.subjectName,
      topicId: lowAccuracyWeak.topicId,
      topicName: lowAccuracyWeak.topicTitle,
      reason: `Test accuracy on "${lowAccuracyWeak.topicTitle}" is ${lowAccuracyWeak.accuracyPercent}% (${lowAccuracyWeak.correct}/${lowAccuracyWeak.attempted}). Revisit core concepts and formulas before advancing.`,
      revisitBeforeAdvancing: true,
    };
  } else if (needSkillsFocus && roboticsSkills.length > 0) {
    const nextSkill =
      [...roboticsSkills].sort((a, b) => a.studyMinutes - b.studyMinutes)[0] ??
      roboticsSkills[0];
    const nextItem = nextSkill.roadmap.find((r) => !r.completed) ?? nextSkill.roadmap[0];
    nextStudy = {
      category: 'Robotics & AI',
      subjectId: nextSkill.id,
      subjectName: nextSkill.name,
      topicId: nextItem?.id ?? nextSkill.id,
      topicName: nextItem?.title ?? nextSkill.name,
      reason: `Practical skills share is ${analytics.skillsSharePercent}% vs your ${settings.skillsAllocationTargetPercent}% target. Build hands-on momentum in ${nextSkill.name}.`,
      revisitBeforeAdvancing: false,
    };
  } else {
    // Prioritize in-progress primary GATE topics, then untouched topics in preferred Part B / Part A
    const preferredFilter = (t: GateTopic) => {
      const subj = subjectMap.get(t.subjectId);
      if (!subj) return false;
      if (settings.preferredPartBTrack === 'Part B2') {
        return subj.partGroup !== 'Part B1' || subj.id === 'gate-control';
      }
      return subj.partGroup !== 'Part B2';
    };

    const candidateTopics = gateTopics.filter(preferredFilter);
    const inProgress = candidateTopics.find((t) => t.status === 'in-progress');
    const notStarted = candidateTopics.find((t) => t.status === 'not-started');
    const chosen = inProgress ?? notStarted ?? gateTopics[0];
    const subj = subjectMap.get(chosen.subjectId);

    nextStudy = {
      category: 'GATE',
      subjectId: chosen.subjectId,
      subjectName: subj?.name ?? chosen.subjectId,
      topicId: chosen.id,
      topicName: chosen.title,
      reason: inProgress
        ? `Resume your in-progress topic in ${subj?.shortName ?? chosen.subjectId} to lock in completion and trigger spaced repetition.`
        : `Start "${chosen.title}" (${chosen.sectionCode}) to advance your GATE 2027 RA coverage steadily.`,
      revisitBeforeAdvancing: false,
    };
  }

  // 3. Revision recommendation
  const activeRevs = revisions
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.nextDueDateIST.localeCompare(b.nextDueDateIST));
  const dueOrOverdue = activeRevs.find((r) => r.nextDueDateIST <= todayIST);

  const nextRevision: StudyRecommendation['nextRevision'] = dueOrOverdue
    ? {
        revisionId: dueOrOverdue.id,
        subjectName: dueOrOverdue.subjectName,
        topicTitle: dueOrOverdue.topicTitle,
        topicId: dueOrOverdue.topicId,
        statusLabel:
          dueOrOverdue.nextDueDateIST < todayIST ? 'Overdue Catch-Up' : 'Due Today',
        reason: `Spaced repetition Day ${dueOrOverdue.intervals[dueOrOverdue.currentStepIndex] ?? 1} check scheduled for ${dueOrOverdue.nextDueDateIST}.`,
      }
    : activeRevs[0]
      ? {
          revisionId: activeRevs[0].id,
          subjectName: activeRevs[0].subjectName,
          topicTitle: activeRevs[0].topicTitle,
          topicId: activeRevs[0].topicId,
          statusLabel: `Upcoming (${activeRevs[0].nextDueDateIST})`,
          reason: 'All due revisions are clear! Next scheduled review is coming up.',
        }
      : {
          subjectName: 'Formula Review',
          topicTitle: nextStudy.topicName,
          topicId: nextStudy.topicId,
          statusLabel: 'No Scheduled Revisions Yet',
          reason: 'Complete a topic to automatically trigger Day 1, 3, 7, 14, and 30 spaced repetition.',
        };

  // 4. Test recommendation: prefer completed topics without tests or weakest topic
  const untestedCompleted = gateTopics.find(
    (t) =>
      t.status === 'completed' &&
      (analytics.topicAccuracyList.find((x) => x.topicId === t.id)?.attempted ?? 0) === 0
  );
  const testTargetTopic =
    (lowAccuracyWeak
      ? gateTopics.find((t) => t.id === lowAccuracyWeak.topicId)
      : undefined) ??
    untestedCompleted ??
    gateTopics.find((t) => t.id === nextStudy.topicId) ??
    gateTopics[0];
  const testSubj = subjectMap.get(testTargetTopic.subjectId);

  const nextTest: StudyRecommendation['nextTest'] = {
    subjectId: testTargetTopic.subjectId,
    subjectName: testSubj?.name ?? testTargetTopic.subjectId,
    topicId: testTargetTopic.id,
    topicName: testTargetTopic.title,
    reason: lowAccuracyWeak
      ? `Retake a focused drill after revising "${testTargetTopic.title}" to lift accuracy above 75%.`
      : untestedCompleted
        ? `You finished "${testTargetTopic.title}" — validate retention with a quick topic test.`
        : `Baseline your readiness on "${testTargetTopic.title}" with GATE-pattern MCQ/MSQ/NAT questions.`,
  };

  // 5. Subject needing attention: lowest study minutes among primary track subjects
  const attentionCandidate = [...analytics.subjectBreakdown].sort(
    (a, b) => a.studyMinutes - b.studyMinutes || a.accuracyPercent - b.accuracyPercent
  )[0];

  const attentionSubject: StudyRecommendation['attentionSubject'] = attentionCandidate
    ? {
        subjectId: attentionCandidate.subjectId,
        subjectName: attentionCandidate.subjectName,
        reason:
          attentionCandidate.studyMinutes === 0
            ? 'No verified study minutes logged yet in this subject.'
            : `${attentionCandidate.studyMinutes}m logged so far (${attentionCandidate.completedTopics}/${attentionCandidate.totalTopics} topics complete).`,
      }
    : {
        subjectId: 'gate-robotics',
        subjectName: 'Robotics & Automation (A.3)',
        reason: 'Core Part A compulsory weightage — maintain steady weekly attention.',
      };

  return {
    nextStudy,
    nextRevision,
    nextTest,
    attentionSubject,
  };
}

