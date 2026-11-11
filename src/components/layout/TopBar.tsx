import React from 'react';
import { Calendar, Download, Eye, Menu, Play, Timer } from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { useStudyTimer } from '../../hooks/useStudyTimer';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import {
  diffISTDateDays,
  formatDurationMMSS,
  formatISTReadableDate,
  getISTDateString,
  getISTTimeParts,
} from '../../utils/date';
import { NAV_ITEMS } from './Sidebar';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { activeNav, setActiveNav, now, settings, focusMode, setFocusMode } = useFocusForge();
  const { timer, remainingSeconds } = useStudyTimer();
  const { canInstall, promptInstall } = usePwaInstall();

  const currentNav = NAV_ITEMS.find((n) => n.id === activeNav);
  const istTime = getISTTimeParts(now);
  const todayIST = getISTDateString(now);
  const daysToGate = Math.max(0, diffISTDateDays(todayIST, settings.examTargetDateIST));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-navy-900/90 backdrop-blur-md">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {!focusMode && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {currentNav?.label ?? 'FOCUSFORGE'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Running Timer Pill */}
          {timer && (
            <button
              type="button"
              onClick={() => setActiveNav(timer.isFocusScreenOpen ? 'start-study' : 'timer')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition tabular-nums ${
                timer.phase === 'study'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
              }`}
            >
              <Timer className="w-3.5 h-3.5 animate-pulse-soft" />
              <span>{timer.phase === 'study' ? 'Study' : 'Break'}:</span>
              <span className="font-mono">{formatDurationMMSS(remainingSeconds)}</span>
            </button>
          )}

          {/* IST Live Time & GATE 2027 Countdown */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {formatISTReadableDate(now)}
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
              {istTime.hhmmss} IST
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
            <span>GATE 2027:</span>
            <span>{daysToGate}d</span>
          </div>

          {canInstall && !focusMode && (
            <button
              type="button"
              onClick={() => promptInstall()}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              title="Install FocusForge as an offline Windows or Mobile app"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}

          {focusMode ? (
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-navy-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-navy-700"
            >
              <Eye className="w-3.5 h-3.5" />
              Exit Focus Mode
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveNav('start-study')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/25 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Start Study</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

