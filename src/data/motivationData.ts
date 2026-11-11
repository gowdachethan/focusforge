export const DAILY_MOTIVATION_MESSAGES: string[] = [
  'Small, steady blocks every morning and evening compound into mastery by February 2027.',
  'Consistency beats intensity. One focused 45-minute session today keeps momentum alive.',
  'Every numerical solved carefully strengthens intuition for both GATE RA and real robotics systems.',
  'If an office day runs late, protect a calm 20-minute review rather than skipping — continuity wins.',
  'Revisit weak concepts calmly; diagnosing one mistake today saves negative marks on exam day.',
  'Balanced engineers win: solid fundamentals in math & mechanics make ROS 2 and control second nature.',
  'Focus on the next single block in front of you. Everything else can wait until the break chime.',
  'Progress is measured in real understanding, not perfection on the first attempt.',
];

export interface AchievementBadgeDef {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export const ACHIEVEMENT_BADGES: AchievementBadgeDef[] = [
  {
    id: 'first-session',
    title: 'First Focus Brick',
    description: 'Completed and recorded your first focused study session.',
    iconName: 'Flame',
  },
  {
    id: 'five-hours',
    title: '5-Hour Milestone',
    description: 'Accumulated 5 hours of verified study time.',
    iconName: 'Clock',
  },
  {
    id: 'twenty-five-hours',
    title: '25-Hour Deep Builder',
    description: 'Accumulated 25 hours of verified study time.',
    iconName: 'Award',
  },
  {
    id: 'streak-3',
    title: '3-Day Rhythm',
    description: 'Maintained a 3-day consecutive study streak.',
    iconName: 'CalendarCheck',
  },
  {
    id: 'streak-7',
    title: '7-Day Consistency',
    description: 'Maintained a full 7-day study streak.',
    iconName: 'Trophy',
  },
  {
    id: 'first-topic-done',
    title: 'Syllabus Finisher',
    description: 'Completed your first GATE 2027 RA topic and scheduled spaced repetition.',
    iconName: 'CheckCircle2',
  },
  {
    id: 'first-test',
    title: 'Exam Ready Start',
    description: 'Completed your first topic-wise test or mock examination.',
    iconName: 'Target',
  },
  {
    id: 'accuracy-80',
    title: 'Precision Scholar',
    description: 'Scored 80%+ accuracy in a test with at least 5 questions.',
    iconName: 'Sparkles',
  },
  {
    id: 'revision-pro',
    title: 'Memory Anchor',
    description: 'Completed 5 spaced-repetition review cycles.',
    iconName: 'RefreshCw',
  },
];

export function getDailyMotivation(dateIST: string): string {
  let hash = 0;
  for (let i = 0; i < dateIST.length; i++) {
    hash = (hash * 31 + dateIST.charCodeAt(i)) >>> 0;
  }
  return DAILY_MOTIVATION_MESSAGES[hash % DAILY_MOTIVATION_MESSAGES.length];
}

