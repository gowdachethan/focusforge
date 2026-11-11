import React from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Cpu,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Play,
  RefreshCw,
  Settings,
  Timer,
  ClipboardCheck,
  EyeOff,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { NavSectionId } from '../../types';
import { useFocusForge } from '../../hooks/useFocusForgeStore';

export const NAV_ITEMS: { id: NavSectionId; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'timetable', label: 'My Timetable', icon: CalendarDays },
  { id: 'start-study', label: 'Start Study', icon: Play },
  { id: 'timer', label: 'Study Timer', icon: Timer },
  { id: 'gate-subjects', label: 'GATE 2027 Subjects', icon: GraduationCap },
  { id: 'robotics-skills', label: 'Robotics & AI Skills', icon: Cpu },
  { id: 'practice-tests', label: 'Practice Tests', icon: ClipboardCheck },
  { id: 'mock-exams', label: 'Mock Examinations', icon: BookOpen },
  { id: 'revision', label: 'Revision Manager', icon: RefreshCw },
  { id: 'notes', label: 'Notes and Resources', icon: FileText },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings & Backup', icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeNav, setActiveNav, settings, updateSettings, setFocusMode, analytics } =
    useFocusForge();

  const dueCount = analytics.overdueRevisionsCount + analytics.todayRevisionsCount;

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-slate-800/90 w-64 select-none">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            FF
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              FOCUSFORGE
            </h1>
            <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-1">
              GATE 2027 · Robotics & AI
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          const showRevBadge = item.id === 'revision' && dueCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveNav(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800/90 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {showRevBadge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {dueCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-navy-700 transition"
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                Dark Mode
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFocusMode(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
            title="Hide chrome for distraction-free study"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Focus Mode
          </button>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-slate-100/80 dark:bg-navy-850 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Study Streak</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {analytics.streakDays} {analytics.streakDays === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};

