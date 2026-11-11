import { DayOfWeek } from '../types';

export const IST_TIMEZONE = 'Asia/Kolkata';

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const istTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const istWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIMEZONE,
  weekday: 'long',
});

const istReadableDateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function getISTDateString(date: Date = new Date()): string {
  return istDateFormatter.format(date);
}

export function getISTTimeParts(date: Date = new Date()): {
  hour: number;
  minute: number;
  second: number;
  hhmm: string;
  hhmmss: string;
  minutesSinceMidnight: number;
} {
  const parts = istTimeFormatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const second = Number(parts.find((p) => p.type === 'second')?.value ?? '0');
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hour,
    minute,
    second,
    hhmm: `${pad(hour)}:${pad(minute)}`,
    hhmmss: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function getISTDayOfWeek(date: Date = new Date()): DayOfWeek {
  const w = istWeekdayFormatter.format(date);
  const valid: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return (valid.find((d) => d === w) ?? 'Monday') as DayOfWeek;
}

export function formatISTReadableDate(date: Date = new Date()): string {
  return istReadableDateFormatter.format(date);
}

export function parseHHMMToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatHHMM12Hour(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm;
  const suffix = hRaw >= 12 ? 'PM' : 'AM';
  const h12 = hRaw % 12 === 0 ? 12 : hRaw % 12;
  return `${h12}:${String(mRaw).padStart(2, '0')} ${suffix}`;
}

export function addDaysToISTDateString(dateIST: string, days: number): string {
  const [y, m, d] = dateIST.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const dt = new Date(utcMs);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function diffISTDateDays(fromDateIST: string, toDateIST: string): number {
  const [y1, m1, d1] = fromDateIST.split('-').map(Number);
  const [y2, m2, d2] = toDateIST.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

export function getISTWeekStartMonday(dateIST: string = getISTDateString()): string {
  const [y, m, d] = dateIST.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysToISTDateString(dateIST, diffToMonday);
}

export function getISTMonthPrefix(dateIST: string = getISTDateString()): string {
  return dateIST.slice(0, 7); // YYYY-MM
}

export function formatDurationMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatMinutesHuman(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatShortISTDate(dateIST: string): string {
  const [y, m, d] = dateIST.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(dt);
}

