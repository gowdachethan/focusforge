import React, { useMemo, useState } from 'react';
import { CalendarDays, Edit3, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { DayOfWeek, StudyCategory, TimetableSlot, TimetableSlotCategory } from '../../types';
import {
  formatHHMM12Hour,
  getISTDayOfWeek,
  getISTTimeParts,
  parseHHMMToMinutes,
} from '../../utils/date';
import { generateId } from '../../utils/id';

const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const MON_TO_SAT: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const CATEGORY_STYLES: Record<TimetableSlotCategory, string> = {
  GATE: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  'Robotics & AI': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  Revision: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  'Mock Test': 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
  Break: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
  Routine: 'bg-slate-200/70 dark:bg-navy-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
};

export const TimetableView: React.FC = () => {
  const {
    now,
    timetable,
    gateSubjects,
    gateTopics,
    roboticsSkills,
    saveTimetableSlot,
    saveTimetableSlotsBulk,
    deleteTimetableSlot,
    resetTimetableToDefault,
    launchStartStudyWith,
    pushToast,
  } = useFocusForge();

  const istToday = getISTDayOfWeek(now);
  const istMinutes = getISTTimeParts(now).minutesSinceMidnight;

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(istToday);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [applyToWorkdays, setApplyToWorkdays] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [formError, setFormError] = useState('');

  const daySlots = useMemo(() => {
    return timetable
      .filter((s) => s.day === selectedDay)
      .sort((a, b) => parseHHMMToMinutes(a.startTime) - parseHHMMToMinutes(b.startTime));
  }, [timetable, selectedDay]);

  const openNewSlot = () => {
    setFormError('');
    setApplyToWorkdays(false);
    setEditingSlot({
      id: generateId('tt'),
      day: selectedDay,
      startTime: '19:00',
      endTime: '20:00',
      title: '',
      category: 'GATE',
      subjectId: 'gate-robotics',
      topicId: 'robo-classification-kinematics',
      notes: '',
    });
  };

  const openEditSlot = (slot: TimetableSlot) => {
    setFormError('');
    setApplyToWorkdays(false);
    setEditingSlot({ ...slot });
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    if (!editingSlot.title.trim()) {
      setFormError('Please enter a slot title.');
      return;
    }
    const startM = parseHHMMToMinutes(editingSlot.startTime);
    const endM = parseHHMMToMinutes(editingSlot.endTime);
    if (endM <= startM) {
      setFormError('End time must be later than start time.');
      return;
    }

    const cleanSlot: TimetableSlot = {
      ...editingSlot,
      title: editingSlot.title.trim(),
      notes: editingSlot.notes?.trim() ?? '',
    };

    if (applyToWorkdays && MON_TO_SAT.includes(cleanSlot.day)) {
      const bulk: TimetableSlot[] = MON_TO_SAT.map((d) => {
        const match = timetable.find(
          (t) => t.day === d && t.startTime === cleanSlot.startTime && t.title === editingSlot.title
        );
        return {
          ...cleanSlot,
          id: d === cleanSlot.day ? cleanSlot.id : match?.id ?? generateId('tt'),
          day: d,
        };
      });
      await saveTimetableSlotsBulk(bulk);
      pushToast('Workday Timetable Updated', 'Saved slot across Monday–Saturday.', 'success');
    } else {
      await saveTimetableSlot(cleanSlot);
      pushToast('Timetable Saved', `Updated ${cleanSlot.day} schedule.`, 'success');
    }
    setEditingSlot(null);
  };

  const totalStudyPlannedMinutes = useMemo(() => {
    return daySlots
      .filter((s) => s.category === 'GATE' || s.category === 'Robotics & AI' || s.category === 'Revision' || s.category === 'Mock Test')
      .reduce((acc, s) => acc + Math.max(0, parseHHMMToMinutes(s.endTime) - parseHHMMToMinutes(s.startTime)), 0);
  }, [daySlots]);

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            Personal Daily Schedule (Asia/Kolkata)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monday–Saturday office routine + dedicated Sunday deep work · {Math.round(totalStudyPlannedMinutes / 60 * 10) / 10}h study planned on {selectedDay}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewSlot}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Add Time Block
          </button>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Default
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                Reset schedule?
              </span>
              <button
                type="button"
                onClick={async () => {
                  await resetTimetableToDefault();
                  setConfirmReset(false);
                }}
                className="px-2 py-0.5 rounded bg-amber-600 text-white text-[11px] font-bold"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-0.5 rounded text-[11px] font-medium"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS.map((day) => {
          const active = day === selectedDay;
          const isToday = day === istToday;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800'
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-500'
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Slots Timeline */}
      <div className="space-y-2.5">
        {daySlots.map((slot) => {
          const startM = parseHHMMToMinutes(slot.startTime);
          const endM = parseHHMMToMinutes(slot.endTime);
          const isCurrent =
            selectedDay === istToday && istMinutes >= startM && istMinutes < endM;
          const durationMin = Math.max(0, endM - startM);
          const isStudy =
            slot.category === 'GATE' ||
            slot.category === 'Robotics & AI' ||
            slot.category === 'Revision' ||
            slot.category === 'Mock Test';
          const assignedSubject =
            gateSubjects.find((s) => s.id === slot.subjectId)?.shortName ??
            roboticsSkills.find((s) => s.id === slot.subjectId)?.name;

          return (
            <div
              key={slot.id}
              className={`rounded-xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCurrent
                  ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900'
              }`}
            >
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div className="w-36 shrink-0">
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatHHMM12Hour(slot.startTime)} – {formatHHMM12Hour(slot.endTime)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {durationMin} min {isCurrent && '· Active Now'}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        CATEGORY_STYLES[slot.category]
                      }`}
                    >
                      {slot.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {slot.title}
                    </h4>
                  </div>
                  {(assignedSubject || slot.notes) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {assignedSubject ? <span className="font-semibold text-blue-600 dark:text-blue-400">{assignedSubject}</span> : null}
                      {assignedSubject && slot.notes ? ' · ' : ''}
                      {slot.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {isStudy && (
                  <button
                    type="button"
                    onClick={() => {
                      const cat: StudyCategory =
                        slot.category === 'Robotics & AI' ? 'Robotics & AI' : 'GATE';
                      launchStartStudyWith({
                        category: cat,
                        subjectId:
                          slot.subjectId ?? (cat === 'GATE' ? 'gate-robotics' : 'skill-ros2'),
                        topicId:
                          slot.topicId ??
                          (cat === 'GATE' ? 'robo-classification-kinematics' : 'ros2-b1'),
                        objective: slot.title,
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Start
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditSlot(slot)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-navy-800"
                  aria-label="Edit slot"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTimetableSlot(slot.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-navy-800"
                  aria-label="Delete slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form
            onSubmit={handleSaveSlot}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Time Block ({editingSlot.day})
              </h4>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-500 font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Day</label>
                <select
                  value={editingSlot.day}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, day: e.target.value as DayOfWeek })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={editingSlot.category}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      category: e.target.value as TimetableSlotCategory,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
                >
                  {(['GATE', 'Robotics & AI', 'Revision', 'Mock Test', 'Break', 'Routine'] as TimetableSlotCategory[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={editingSlot.startTime}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, startTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={editingSlot.endTime}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, endTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input
                type="text"
                value={editingSlot.title}
                onChange={(e) =>
                  setEditingSlot({ ...editingSlot, title: e.target.value })
                }
                placeholder="e.g., GATE Preparation – Kinematics & Transformations"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
                required
              />
            </div>

            {(editingSlot.category === 'GATE' ||
              editingSlot.category === 'Robotics & AI' ||
              editingSlot.category === 'Revision') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Linked Subject / Skill</label>
                  <select
                    value={editingSlot.subjectId ?? ''}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, subjectId: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
                  >
                    <option value="">None</option>
                    <optgroup label="GATE 2027 Subjects">
                      {gateSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shortName}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Robotics & AI Skills">
                      {roboticsSkills.map((sk) => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                {editingSlot.category !== 'Robotics & AI' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Linked Topic</label>
                    <select
                      value={editingSlot.topicId ?? ''}
                      onChange={(e) =>
                        setEditingSlot({ ...editingSlot, topicId: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
                    >
                      <option value="">Any topic</option>
                      {gateTopics
                        .filter((t) => !editingSlot.subjectId || t.subjectId === editingSlot.subjectId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Notes</label>
              <input
                type="text"
                value={editingSlot.notes ?? ''}
                onChange={(e) =>
                  setEditingSlot({ ...editingSlot, notes: e.target.value })
                }
                placeholder="Optional reminder..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
              />
            </div>

            {MON_TO_SAT.includes(editingSlot.day) && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={applyToWorkdays}
                  onChange={(e) => setApplyToWorkdays(e.target.checked)}
                  className="rounded border-slate-400"
                />
                Apply across all Monday–Saturday workdays
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-navy-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
              >
                Save Block
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

