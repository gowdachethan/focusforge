import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Database,
  Download,
  MonitorSmartphone,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { validateBackupPayload } from '../../db/indexedDb';
import { buildCsv, downloadTextFile } from '../../utils/id';
import { getISTDateString } from '../../utils/date';
import { requestBrowserNotificationPermission, sendBrowserNotification } from '../../utils/audio';

export const SettingsBackupView: React.FC = () => {
  const {
    settings,
    updateSettings,
    timetable,
    gateTopics,
    roboticsSkills,
    studySessions,
    questions,
    testAttempts,
    revisions,
    notes,
    exportBackupJson,
    restoreFromBackup,
    resetDatabaseAll,
    pushToast,
  } = useFocusForge();

  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showResetBox, setShowResetBox] = useState(false);
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();

  const handleExportJson = async () => {
    const payload = await exportBackupJson();
    downloadTextFile(
      `focusforge-backup-${getISTDateString()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    pushToast('JSON Backup Exported', 'Full IndexedDB snapshot downloaded.', 'success');
  };

  const handleExportSessionsCsv = () => {
    const csv = buildCsv(
      [
        'SessionID',
        'DateIST',
        'Category',
        'Subject',
        'Topic',
        'Objective',
        'Mode',
        'PlannedMin',
        'ActualMin',
        'CompletedFull',
      ],
      studySessions.map((s) => [
        s.id,
        s.dateIST,
        s.category,
        s.subjectName,
        s.topicName,
        s.objective,
        s.timerMode,
        s.plannedMinutes,
        s.actualMinutes,
        s.completedFull,
      ])
    );
    downloadTextFile(`focusforge-study-sessions-${getISTDateString()}.csv`, csv, 'text/csv');
    pushToast('CSV Exported', 'Study sessions CSV downloaded.', 'success');
  };

  const handleExportTestsCsv = () => {
    const csv = buildCsv(
      ['TestID', 'DateIST', 'Mode', 'Title', 'Questions', 'Correct', 'Score', 'MaxMarks', 'Accuracy%'],
      testAttempts.map((t) => [
        t.id,
        t.dateIST,
        t.mode,
        t.title,
        t.totalQuestions,
        t.correctCount,
        t.score,
        t.maxMarks,
        t.accuracyPercent,
      ])
    );
    downloadTextFile(`focusforge-test-results-${getISTDateString()}.csv`, csv, 'text/csv');
    pushToast('CSV Exported', 'Test results CSV downloaded.', 'success');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!validateBackupPayload(parsed)) {
        pushToast(
          'Invalid Backup File',
          'This JSON file does not match FocusForge backup schema.',
          'info'
        );
        return;
      }
      await restoreFromBackup(parsed);
    } catch {
      pushToast('Restore Failed', 'Could not parse backup JSON file.', 'info');
    } finally {
      e.target.value = '';
    }
  };

  const handleNotificationSetup = async () => {
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'granted') {
      await updateSettings({ browserNotificationsEnabled: true });
      sendBrowserNotification(
        'FocusForge Notifications Active',
        'You will be notified when study and break intervals finish.'
      );
      pushToast('Browser Alerts Enabled', 'Test notification sent.', 'success');
    } else {
      pushToast('Notification Permission', `Current browser status: ${perm}`, 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Windows & Mobile Phone App Installation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5 text-blue-500" />
              Windows Desktop & Mobile Phone App (Offline PWA)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Install FocusForge as a standalone offline application on Windows 10/11, Android, and iOS.
            </p>
          </div>
          {isInstalled ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">
              Running in Installed App Mode
            </span>
          ) : canInstall ? (
            <button
              type="button"
              onClick={() => promptInstall()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
            >
              <Download className="w-4 h-4" />
              Install FocusForge App Now
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <p className="font-bold text-slate-900 dark:text-white">On Windows Desktop</p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Double-click <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-navy-800 font-mono">start-focusforge.bat</code> to open FocusForge in a dedicated Windows App Window (no browser tabs), or click <strong>Install App</strong> in Edge/Chrome&apos;s address bar.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <p className="font-bold text-slate-900 dark:text-white">On Mobile Phone (Android / iOS)</p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {isIOS
                ? 'On iPhone/iPad Safari, tap the Share icon and choose "Add to Home Screen" for full-screen offline use.'
                : 'Open on your phone over Wi-Fi (LAN IP shown when running start-focusforge.bat) or host the dist/ folder over HTTPS (e.g., Netlify Drop / Cloudflare Pages) and tap "Install App" / "Add to Home Screen". Transfer progress anytime via JSON Backup.'}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance & Study Preferences */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 space-y-5">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          Study Preferences & Timer Defaults
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold">Color Theme</p>
              <p className="text-slate-500">Dark navy default or crisp light</p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
            >
              {settings.theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {settings.theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold">Sound Chimes</p>
              <p className="text-slate-500">Audio alert on completion</p>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
              className="h-4 w-4 rounded"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold">Desktop Notifications</p>
              <p className="text-slate-500">Permission-based OS alerts</p>
            </div>
            <button
              type="button"
              onClick={handleNotificationSetup}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-navy-700 text-white font-semibold"
            >
              <Bell className="w-3.5 h-3.5" />
              {settings.browserNotificationsEnabled ? 'Active' : 'Enable'}
            </button>
          </div>

          <div>
            <label className="block font-bold mb-1">Preferred Part B Track</label>
            <select
              value={settings.preferredPartBTrack}
              onChange={(e) =>
                updateSettings({
                  preferredPartBTrack: e.target.value as 'Part B2' | 'Part B1',
                })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2"
            >
              <option value="Part B2">Part B2 – Mechanical Engineering</option>
              <option value="Part B1">Part B1 – Electrical & Control</option>
            </select>
          </div>

          <div>
            <label className="block font-bold mb-1">Daily Focus Target (minutes)</label>
            <input
              type="number"
              min={30}
              max={600}
              value={settings.dailyStudyTargetMinutes}
              onChange={(e) =>
                updateSettings({ dailyStudyTargetMinutes: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">Weekly Study Target (hours)</label>
            <input
              type="number"
              min={1}
              max={80}
              value={settings.weeklyStudyTargetHours}
              onChange={(e) =>
                updateSettings({ weeklyStudyTargetHours: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">GATE / Skills Split Target (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={95}
                value={settings.gateAllocationTargetPercent}
                onChange={(e) => {
                  const g = Math.min(95, Math.max(10, Number(e.target.value)));
                  updateSettings({
                    gateAllocationTargetPercent: g,
                    skillsAllocationTargetPercent: 100 - g,
                  });
                }}
                className="w-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-2 font-mono"
              />
              <span className="text-slate-500">
                % GATE / {settings.skillsAllocationTargetPercent}% Skills
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Pomodoro (Study / Break min)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={5}
                max={90}
                value={settings.pomodoroStudyMin}
                onChange={(e) =>
                  updateSettings({ pomodoroStudyMin: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-2 font-mono"
              />
              <input
                type="number"
                min={1}
                max={30}
                value={settings.pomodoroBreakMin}
                onChange={(e) =>
                  updateSettings({ pomodoroBreakMin: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">GATE 2027 Target Date (IST)</label>
            <input
              type="date"
              value={settings.examTargetDateIST}
              onChange={(e) =>
                updateSettings({ examTargetDateIST: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 font-mono"
            />
          </div>
        </div>
      </div>

      {/* IndexedDB Health & Backup / Restore */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              Local-First IndexedDB Storage & Backups
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All changes are automatically persisted locally in IndexedDB and remain intact across refreshes and restarts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">Timetable Slots</span>
            <p className="text-lg font-extrabold tabular-nums">{timetable.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">GATE Topics / Skills</span>
            <p className="text-lg font-extrabold tabular-nums">
              {gateTopics.length} / {roboticsSkills.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">Sessions / Tests</span>
            <p className="text-lg font-extrabold tabular-nums">
              {studySessions.length} / {testAttempts.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">Questions / Notes / Revs</span>
            <p className="text-lg font-extrabold tabular-nums">
              {questions.length} / {notes.length} / {revisions.length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            Manual Backup (Full JSON)
          </button>

          <button
            type="button"
            onClick={handleExportSessionsCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            Export Sessions CSV
          </button>

          <button
            type="button"
            onClick={handleExportTestsCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-navy-800 text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            Export Tests CSV
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 text-xs font-bold cursor-pointer hover:border-blue-500">
            <Upload className="w-4 h-4 text-blue-500" />
            Restore Backup (JSON)
            <input
              type="file"
              accept="application/json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Reset with Confirmation */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          {!showResetBox ? (
            <button
              type="button"
              onClick={() => setShowResetBox(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Data to Fresh Defaults...
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-rose-500/35 bg-rose-500/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                <AlertTriangle className="w-4 h-4" />
                Confirm Full Workspace Reset (Export a JSON backup first!)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Type <strong>RESET FOCUSFORGE</strong> below to confirm clearing all sessions, tests, notes, and restoring default syllabus & timetable.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Type RESET FOCUSFORGE"
                  className="rounded-lg border border-rose-500/40 bg-white dark:bg-navy-900 px-3 py-1.5 text-xs font-mono"
                />
                <button
                  type="button"
                  disabled={resetConfirmText !== 'RESET FOCUSFORGE'}
                  onClick={async () => {
                    await resetDatabaseAll();
                    setResetConfirmText('');
                    setShowResetBox(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 disabled:opacity-40 text-white text-xs font-bold"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetBox(false);
                    setResetConfirmText('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-navy-800 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

