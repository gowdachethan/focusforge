import React from 'react';
import { CalendarDays, ClipboardCheck, LayoutDashboard, Menu, Play } from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { NavSectionId } from '../../types';

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const { activeNav, setActiveNav, focusMode, analytics } = useFocusForge();
  const isMobile = useIsMobile();

  if (focusMode || !isMobile) return null;

  const dueCount = analytics.overdueRevisionsCount + analytics.todayRevisionsCount;

  const items: { id: NavSectionId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'timetable', label: 'Schedule', icon: CalendarDays },
    { id: 'start-study', label: 'Study', icon: Play },
    { id: 'practice-tests', label: 'Tests', icon: ClipboardCheck },
  ];

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div
                className={`p-1 rounded-lg ${
                  active ? 'bg-blue-500/15' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
        >
          <div className="p-1">
            <Menu className="w-5 h-5" />
          </div>
          <span>More</span>
          {dueCount > 0 && (
            <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
              {dueCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
