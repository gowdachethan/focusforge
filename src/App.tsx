import React, { useState } from 'react';
import { FocusForgeProvider, useFocusForge } from './hooks/useFocusForgeStore';
import { StudyTimerProvider } from './hooks/useStudyTimer';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { BadgeToastContainer } from './components/common/BadgeToast';
import { DashboardView } from './components/views/DashboardView';
import { TimetableView } from './components/views/TimetableView';
import { StartStudyView } from './components/views/StartStudyView';
import { StudyTimerView } from './components/views/StudyTimerView';
import { GateSubjectsView } from './components/views/GateSubjectsView';
import { RoboticsSkillsView } from './components/views/RoboticsSkillsView';
import { PracticeTestsView } from './components/views/PracticeTestsView';
import { MockExamsView } from './components/views/MockExamsView';
import { RevisionManagerView } from './components/views/RevisionManagerView';
import { NotesResourcesView } from './components/views/NotesResourcesView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { SettingsBackupView } from './components/views/SettingsBackupView';

const FocusForgeShell: React.FC = () => {
  const { isReady, activeNav, focusMode } = useFocusForge();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-navy-950 text-slate-200 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 animate-pulse flex items-center justify-center font-bold text-white">
          FF
        </div>
        <p className="text-sm font-semibold">Loading FocusForge Study Operating System...</p>
      </div>
    );
  }

  const renderView = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView />;
      case 'timetable':
        return <TimetableView />;
      case 'start-study':
        return <StartStudyView />;
      case 'timer':
        return <StudyTimerView />;
      case 'gate-subjects':
        return <GateSubjectsView />;
      case 'robotics-skills':
        return <RoboticsSkillsView />;
      case 'practice-tests':
        return <PracticeTestsView />;
      case 'mock-exams':
        return <MockExamsView />;
      case 'revision':
        return <RevisionManagerView />;
      case 'notes':
        return <NotesResourcesView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsBackupView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-100">
      {!focusMode && (
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1600px] w-full mx-auto">
          {renderView()}
        </main>
      </div>

      <MobileBottomNav onOpenDrawer={() => setMobileMenuOpen(true)} />
      <BadgeToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <FocusForgeProvider>
      <StudyTimerProvider>
        <FocusForgeShell />
      </StudyTimerProvider>
    </FocusForgeProvider>
  );
};

export default App;

