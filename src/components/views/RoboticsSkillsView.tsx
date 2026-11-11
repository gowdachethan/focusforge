import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Cpu,
  ExternalLink,
  Flag,
  Layers,
  Play,
  Plus,
  Wrench,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { RoboticsSkill, SkillLevel } from '../../types';
import { CircularProgress } from '../common/CircularProgress';
import { formatMinutesHuman } from '../../utils/date';
import { generateId } from '../../utils/id';

export const RoboticsSkillsView: React.FC = () => {
  const {
    roboticsSkills,
    updateRoboticsSkill,
    settings,
    analytics,
    launchStartStudyWith,
    pushToast,
  } = useFocusForge();

  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    roboticsSkills[0]?.id ?? 'skill-ros2'
  );
  const [newRoadmapTitle, setNewRoadmapTitle] = useState('');
  const [newRoadmapLevel, setNewRoadmapLevel] = useState<SkillLevel>('Intermediate');
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newRefLabel, setNewRefLabel] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');

  const activeSkill =
    roboticsSkills.find((s) => s.id === selectedSkillId) ?? roboticsSkills[0];

  const getSkillCompletion = (sk: RoboticsSkill) => {
    const items = [...sk.roadmap, ...sk.assignments, ...sk.milestones];
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.completed).length;
    return Math.round((done / items.length) * 100);
  };

  const toggleRoadmapItem = async (itemId: string) => {
    if (!activeSkill) return;
    await updateRoboticsSkill(activeSkill.id, {
      roadmap: activeSkill.roadmap.map((r) =>
        r.id === itemId ? { ...r, completed: !r.completed } : r
      ),
    });
  };

  const toggleAssignment = async (id: string) => {
    if (!activeSkill) return;
    await updateRoboticsSkill(activeSkill.id, {
      assignments: activeSkill.assignments.map((a) =>
        a.id === id ? { ...a, completed: !a.completed } : a
      ),
    });
  };

  const toggleMilestone = async (id: string) => {
    if (!activeSkill) return;
    await updateRoboticsSkill(activeSkill.id, {
      milestones: activeSkill.milestones.map((m) =>
        m.id === id ? { ...m, completed: !m.completed } : m
      ),
    });
  };

  const handleAddRoadmapStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill || !newRoadmapTitle.trim()) return;
    await updateRoboticsSkill(activeSkill.id, {
      roadmap: [
        ...activeSkill.roadmap,
        {
          id: generateId('rm'),
          level: newRoadmapLevel,
          title: newRoadmapTitle.trim(),
          completed: false,
        },
      ],
    });
    setNewRoadmapTitle('');
    pushToast('Roadmap Step Added', `Added to ${activeSkill.name}.`, 'success');
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill || !newAssignmentTitle.trim()) return;
    await updateRoboticsSkill(activeSkill.id, {
      assignments: [
        ...activeSkill.assignments,
        {
          id: generateId('asg'),
          title: newAssignmentTitle.trim(),
          description: 'Custom hands-on robotics lab exercise.',
          completed: false,
        },
      ],
    });
    setNewAssignmentTitle('');
  };

  const handleAddRefLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill || !newRefLabel.trim() || !newRefUrl.trim()) return;
    const url = newRefUrl.trim().startsWith('http')
      ? newRefUrl.trim()
      : `https://${newRefUrl.trim()}`;
    await updateRoboticsSkill(activeSkill.id, {
      referenceLinks: [
        ...activeSkill.referenceLinks,
        { id: generateId('ref'), label: newRefLabel.trim(), url },
      ],
    });
    setNewRefLabel('');
    setNewRefUrl('');
  };

  const groupedRoadmap = useMemo(() => {
    if (!activeSkill) return { Beginner: [], Intermediate: [], Advanced: [] };
    return {
      Beginner: activeSkill.roadmap.filter((r) => r.level === 'Beginner'),
      Intermediate: activeSkill.roadmap.filter((r) => r.level === 'Intermediate'),
      Advanced: activeSkill.roadmap.filter((r) => r.level === 'Advanced'),
    };
  }, [activeSkill]);

  return (
    <div className="space-y-6">
      {/* Allocation & Summary Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            Robotics & AI Practical Skills Mastery (15 Core Tracks)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Target Allocation: {settings.gateAllocationTargetPercent}% GATE 2027 / {settings.skillsAllocationTargetPercent}% Practical Robotics & AI · Current Actual: {analytics.totalStudyMinutes > 0 ? `${analytics.gateSharePercent}% GATE / ${analytics.skillsSharePercent}% Skills` : 'No sessions logged yet'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <CircularProgress
            percent={analytics.skillsCompletionPercent}
            size={60}
            strokeWidth={6}
            progressColor="stroke-emerald-500"
            label={`${analytics.skillsCompletionPercent}%`}
          />
          <div className="text-xs">
            <p className="font-bold text-slate-900 dark:text-white">Overall Skills Progress</p>
            <p className="text-slate-500 dark:text-slate-400">
              {formatMinutesHuman(analytics.skillsMinutes)} hands-on logged
            </p>
          </div>
        </div>
      </div>

      {/* 15 Skills Selector + Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Skills Directory */}
        <div className="lg:col-span-4 space-y-2">
          {roboticsSkills.map((sk) => {
            const pct = getSkillCompletion(sk);
            const active = sk.id === activeSkill?.id;
            return (
              <button
                key={sk.id}
                type="button"
                onClick={() => setSelectedSkillId(sk.id)}
                className={`w-full text-left rounded-xl border p-3.5 transition flex items-center justify-between gap-3 ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {sk.name}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-400">
                      {sk.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatMinutesHuman(sk.studyMinutes)} logged · {sk.milestones.filter((m) => m.completed).length}/{sk.milestones.length} milestones
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Selected Skill Workspace */}
        {activeSkill && (
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {activeSkill.category}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activeSkill.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                  {activeSkill.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  launchStartStudyWith({
                    category: 'Robotics & AI',
                    subjectId: activeSkill.id,
                    topicId:
                      activeSkill.roadmap.find((r) => !r.completed)?.id ??
                      activeSkill.roadmap[0]?.id ??
                      activeSkill.id,
                    objective: `Practical hands-on session in ${activeSkill.name}`,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Practice {activeSkill.name}
              </button>
            </div>

            {/* Roadmap: Beginner / Intermediate / Advanced */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  Structured Learning Roadmap
                </h4>
                <span className="text-xs font-bold text-emerald-500">
                  {getSkillCompletion(activeSkill)}% Completed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['Beginner', 'Intermediate', 'Advanced'] as SkillLevel[]).map(
                  (lvl) => (
                    <div
                      key={lvl}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-850 p-3.5 space-y-2.5"
                    >
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          lvl === 'Beginner'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                            : lvl === 'Intermediate'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
                        }`}
                      >
                        {lvl}
                      </span>
                      <div className="space-y-2">
                        {groupedRoadmap[lvl].map((item) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleRoadmapItem(item.id)}
                              className="mt-0.5 rounded text-emerald-600"
                            />
                            <span
                              className={
                                item.completed
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-700 dark:text-slate-200'
                              }
                            >
                              {item.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>

              <form onSubmit={handleAddRoadmapStep} className="flex flex-wrap gap-2">
                <select
                  value={newRoadmapLevel}
                  onChange={(e) => setNewRoadmapLevel(e.target.value as SkillLevel)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <input
                  type="text"
                  value={newRoadmapTitle}
                  onChange={(e) => setNewRoadmapTitle(e.target.value)}
                  placeholder="Add custom roadmap topic..."
                  className="flex-1 min-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-navy-700 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </form>
            </div>

            {/* Assignments & Project Milestones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-blue-500" />
                  Practical Assignments
                </h4>
                <div className="space-y-2">
                  {activeSkill.assignments.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-navy-850 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={a.completed}
                        onChange={() => toggleAssignment(a.id)}
                        className="mt-0.5 rounded"
                      />
                      <div>
                        <p
                          className={`text-xs font-bold ${
                            a.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {a.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {a.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <form onSubmit={handleAddAssignment} className="flex gap-2">
                  <input
                    type="text"
                    value={newAssignmentTitle}
                    onChange={(e) => setNewAssignmentTitle(e.target.value)}
                    placeholder="New assignment title..."
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    Add
                  </button>
                </form>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-emerald-500" />
                  Project Milestones
                </h4>
                <div className="space-y-2">
                  {activeSkill.milestones.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-navy-850 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={() => toggleMilestone(m.id)}
                        className="mt-0.5 rounded"
                      />
                      <span
                        className={`text-xs font-medium ${
                          m.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {m.title}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Free Official Resources */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    Free Learning Resources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...activeSkill.resources, ...activeSkill.referenceLinks].map(
                      (res) => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300 text-xs font-medium hover:underline"
                        >
                          {res.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Notes & Custom Reference Links */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Personal Skill Notes & Build Logs ({activeSkill.name})
              </label>
              <textarea
                rows={3}
                value={activeSkill.notes}
                onChange={(e) =>
                  updateRoboticsSkill(activeSkill.id, { notes: e.target.value })
                }
                placeholder={`Write CLI commands, URDF snippets, debugging insights, or project architecture notes for ${activeSkill.name}...`}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <form onSubmit={handleAddRefLink} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newRefLabel}
                  onChange={(e) => setNewRefLabel(e.target.value)}
                  placeholder="Reference label"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={newRefUrl}
                  onChange={(e) => setNewRefUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 min-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-navy-700 text-white text-xs font-semibold"
                >
                  Save Link
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

