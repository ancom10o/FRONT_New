import React, { useEffect } from 'react';
import { Edit2, LockKeyhole, X } from 'lucide-react';
import { Task } from '../../types';
import { TaskWorkflowPanel } from './TaskWorkflowPanel';

interface Props {
  task: Task | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onChanged: () => void | Promise<void>;
}

export const TaskDetailDrawer: React.FC<Props> = ({ task, canEdit, onClose, onEdit, onChanged }) => {
  useEffect(() => {
    if (!task) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [task, onClose]);
  if (!task) return null;
  const locked = task.status === 'DONE' || task.status === 'REVIEW';
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside role="dialog" aria-modal="true" aria-label={`Chi tiết Task ${task.title}`} className="flex h-full w-full max-w-2xl animate-[slideIn_.2s_ease-out] flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">TASK-{task.id}</span><h2 className="mt-1 text-sm font-bold text-slate-900">Chi tiết công việc</h2></div><div className="flex items-center gap-2">{canEdit && !locked && <button type="button" onClick={() => onEdit(task)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700"><Edit2 className="h-3.5 w-3.5"/>Chỉnh sửa</button>}{locked && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500"><LockKeyhole className="h-3 w-3"/>{task.status === 'DONE' ? 'Đã khóa' : 'Khóa khi REVIEW'}</span>}<button type="button" aria-label="Đóng chi tiết Task" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4"/></button></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><TaskWorkflowPanel taskId={task.id} onChanged={onChanged}/></div>
    </aside>
  </div>;
};
