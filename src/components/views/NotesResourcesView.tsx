import React, { useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import { useFocusForge } from '../../hooks/useFocusForgeStore';
import { NoteAttachment, StudyCategory, StudyNote } from '../../types';
import { downloadTextFile, generateId } from '../../utils/id';
import { getISTDateString } from '../../utils/date';

export const NotesResourcesView: React.FC = () => {
  const {
    gateSubjects,
    gateTopics,
    roboticsSkills,
    notes,
    saveNote,
    deleteNote,
    pushToast,
  } = useFocusForge();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Editor state
  const [category, setCategory] = useState<StudyCategory>('GATE');
  const [subjectId, setSubjectId] = useState<string>('gate-robotics');
  const [topicId, setTopicId] = useState<string>('robo-classification-kinematics');
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [formulas, setFormulas] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [youtubeLinks, setYoutubeLinks] = useState<{ id: string; label: string; url: string }[]>([]);
  const [nptelLinks, setNptelLinks] = useState<{ id: string; label: string; url: string }[]>([]);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);

  const [ytLabel, setYtLabel] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [nptelLabel, setNptelLabel] = useState('');
  const [nptelUrl, setNptelUrl] = useState('');

  const resetForm = () => {
    setEditingNoteId(null);
    setTitle('');
    setExplanation('');
    setFormulas('');
    setTagsText('');
    setYoutubeLinks([]);
    setNptelLinks([]);
    setAttachments([]);
  };

  const loadNoteIntoEditor = (n: StudyNote) => {
    setEditingNoteId(n.id);
    setCategory(n.category);
    setSubjectId(n.subjectId);
    setTopicId(n.topicId);
    setTitle(n.title);
    setExplanation(n.explanation);
    setFormulas(n.formulas);
    setTagsText(n.tags.join(', '));
    setYoutubeLinks(n.youtubeLinks);
    setNptelLinks(n.nptelLinks);
    setAttachments(n.attachments);
  };

  const subjectOptions = useMemo(() => {
    return category === 'GATE'
      ? gateSubjects.map((s) => ({ id: s.id, name: s.name }))
      : roboticsSkills.map((s) => ({ id: s.id, name: s.name }));
  }, [category, gateSubjects, roboticsSkills]);

  const topicOptions = useMemo(() => {
    if (category === 'GATE') {
      return gateTopics
        .filter((t) => t.subjectId === subjectId)
        .map((t) => ({ id: t.id, name: t.title }));
    }
    const sk = roboticsSkills.find((s) => s.id === subjectId);
    return sk?.roadmap.map((r) => ({ id: r.id, name: r.title })) ?? [];
  }, [category, subjectId, gateTopics, roboticsSkills]);

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loaded: NoteAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 4 * 1024 * 1024) {
        pushToast('File Too Large', `${file.name} exceeds 4 MB limit.`, 'info');
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      loaded.push({
        id: generateId('att'),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      });
    }
    setAttachments((prev) => [...prev, ...loaded]);
    e.target.value = '';
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      pushToast('Title Required', 'Please enter a title for your note.', 'info');
      return;
    }
    const subjName =
      subjectOptions.find((s) => s.id === subjectId)?.name ?? subjectId;
    const topName = topicOptions.find((t) => t.id === topicId)?.name ?? topicId;
    const nowIso = new Date().toISOString();
    const existing = editingNoteId ? notes.find((n) => n.id === editingNoteId) : null;

    const note: StudyNote = {
      id: editingNoteId ?? generateId('note'),
      category,
      subjectId,
      subjectName: subjName,
      topicId,
      topicName: topName,
      title: title.trim(),
      explanation: explanation.trim(),
      formulas: formulas.trim(),
      youtubeLinks,
      nptelLinks,
      attachments,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };

    await saveNote(note);
    pushToast('Note Saved', `"${note.title}" saved in IndexedDB.`, 'success');
    resetForm();
  };

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((n) => {
      if (filterSubject !== 'all' && n.subjectId !== filterSubject) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.explanation.toLowerCase().includes(q) ||
        n.formulas.toLowerCase().includes(q) ||
        n.subjectName.toLowerCase().includes(q) ||
        n.topicName.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [notes, searchQuery, filterSubject]);

  const exportNotesMarkdown = () => {
    const md = filteredNotes
      .map(
        (n) =>
          `# ${n.title}\n- Subject: ${n.subjectName}\n- Topic: ${n.topicName}\n- Tags: ${n.tags.join(', ')}\n\n## Explanation\n${n.explanation}\n\n## Formulas\n\`\`\`\n${n.formulas}\n\`\`\`\n\n## Resources\n${[...n.youtubeLinks, ...n.nptelLinks].map((l) => `- [${l.label}](${l.url})`).join('\n')}\n`
      )
      .join('\n---\n\n');
    downloadTextFile(
      `focusforge-notes-${getISTDateString()}.md`,
      md || '# No notes matching filter',
      'text/markdown'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Note Editor */}
      <form
        onSubmit={handleSaveNote}
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            {editingNoteId ? 'Edit Study Note' : 'Create Note & Resource'}
          </h3>
          {editingNoteId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-blue-500"
            >
              + New Note
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select
            value={category}
            onChange={(e) => {
              const cat = e.target.value as StudyCategory;
              setCategory(cat);
              if (cat === 'GATE') {
                setSubjectId(gateSubjects[0].id);
                setTopicId(gateTopics.find((t) => t.subjectId === gateSubjects[0].id)?.id ?? '');
              } else {
                setSubjectId(roboticsSkills[0].id);
                setTopicId(roboticsSkills[0].roadmap[0]?.id ?? '');
              }
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-2 text-xs"
          >
            <option value="GATE">GATE</option>
            <option value="Robotics & AI">Robotics & AI</option>
          </select>

          <select
            value={subjectId}
            onChange={(e) => {
              const v = e.target.value;
              setSubjectId(v);
              if (category === 'GATE') {
                setTopicId(gateTopics.find((t) => t.subjectId === v)?.id ?? '');
              } else {
                setTopicId(roboticsSkills.find((s) => s.id === v)?.roadmap[0]?.id ?? '');
              }
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-2 text-xs"
          >
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-2 text-xs"
          >
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title (e.g., D-H Parameters & Frame Assignment)"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs font-semibold"
          required
        />

        <textarea
          rows={4}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Personal explanation, intuition, solved example steps..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 p-3 text-xs"
        />

        <textarea
          rows={3}
          value={formulas}
          onChange={(e) => setFormulas(e.target.value)}
          placeholder="Key formulas / equations..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 p-3 text-xs font-mono"
        />

        {/* YouTube Links */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Video className="w-3.5 h-3.5 text-rose-500" />
            YouTube Links
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={ytLabel}
              onChange={(e) => setYtLabel(e.target.value)}
              placeholder="Video title"
              className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1 text-xs"
            />
            <input
              type="text"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!ytUrl.trim()) return;
                setYoutubeLinks((prev) => [
                  ...prev,
                  {
                    id: generateId('yt'),
                    label: ytLabel.trim() || 'YouTube Lecture',
                    url: ytUrl.trim().startsWith('http') ? ytUrl.trim() : `https://${ytUrl.trim()}`,
                  },
                ]);
                setYtLabel('');
                setYtUrl('');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-navy-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {youtubeLinks.map((l) => (
            <div key={l.id} className="text-[11px] flex items-center justify-between bg-slate-50 dark:bg-navy-850 px-2 py-1 rounded">
              <span className="truncate">{l.label}</span>
              <button
                type="button"
                onClick={() => setYoutubeLinks((p) => p.filter((x) => x.id !== l.id))}
                className="text-rose-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* NPTEL Links */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">NPTEL Resources</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={nptelLabel}
              onChange={(e) => setNptelLabel(e.target.value)}
              placeholder="Course / Lecture"
              className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1 text-xs"
            />
            <input
              type="text"
              value={nptelUrl}
              onChange={(e) => setNptelUrl(e.target.value)}
              placeholder="https://nptel.ac.in/..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!nptelUrl.trim()) return;
                setNptelLinks((prev) => [
                  ...prev,
                  {
                    id: generateId('np'),
                    label: nptelLabel.trim() || 'NPTEL Resource',
                    url: nptelUrl.trim().startsWith('http')
                      ? nptelUrl.trim()
                      : `https://${nptelUrl.trim()}`,
                  },
                ]);
                setNptelLabel('');
                setNptelUrl('');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-navy-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {nptelLinks.map((l) => (
            <div key={l.id} className="text-[11px] flex items-center justify-between bg-slate-50 dark:bg-navy-850 px-2 py-1 rounded">
              <span className="truncate">{l.label}</span>
              <button
                type="button"
                onClick={() => setNptelLinks((p) => p.filter((x) => x.id !== l.id))}
                className="text-rose-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold cursor-pointer">
            <Paperclip className="w-3.5 h-3.5" />
            Attach Image / Diagram / File (≤ 4 MB)
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md"
              onChange={handleFileAttach}
              className="hidden"
            />
          </label>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="text-[11px] px-2 py-1 rounded bg-slate-100 dark:bg-navy-800 flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3 h-3 text-blue-500" />
                  <span className="max-w-[130px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((p) => p.filter((a) => a.id !== att.id))
                    }
                    className="text-rose-500 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="Tags (comma separated: kinematics, pyq, formula)"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-1.5 text-xs"
        />

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
        >
          {editingNoteId ? 'Update Note' : 'Save Note & Attachments'}
        </button>
      </form>

      {/* Notes Library & Search */}
      <div className="lg:col-span-7 space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, formulas, topics, or tags..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-850 px-3 py-2 text-xs"
          >
            <option value="all">All Subjects & Skills</option>
            {gateSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
            {roboticsSkills.map((sk) => (
              <option key={sk.id} value={sk.id}>
                {sk.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportNotesMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Export .md
          </button>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-xs text-slate-500">
            No notes match your search yet. Create your first note on the left or during any Focus Session!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          n.category === 'GATE'
                            ? 'bg-blue-500/15 text-blue-500'
                            : 'bg-emerald-500/15 text-emerald-500'
                        }`}
                      >
                        {n.subjectName}
                      </span>
                      <span className="text-slate-500">{n.topicName}</span>
                    </div>
                    <h4 className="text-sm font-extrabold mt-1">{n.title}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadNoteIntoEditor(n)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {n.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                    {n.explanation}
                  </p>
                )}

                {n.formulas && (
                  <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-slate-800 font-mono text-xs whitespace-pre-wrap">
                    {n.formulas}
                  </pre>
                )}

                {(n.youtubeLinks.length > 0 || n.nptelLinks.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {[...n.youtubeLinks, ...n.nptelLinks].map((l) => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium hover:underline"
                      >
                        {l.label} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}

                {n.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {n.attachments.map((att) =>
                      att.mimeType.startsWith('image/') ? (
                        <a
                          key={att.id}
                          href={att.dataUrl}
                          download={att.name}
                          className="block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                        >
                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            className="h-24 w-auto object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          key={att.id}
                          href={att.dataUrl}
                          download={att.name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-xs"
                        >
                          <Paperclip className="w-3 h-3" />
                          {att.name}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

