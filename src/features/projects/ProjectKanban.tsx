import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, CircleDashed, Filter,
  ListChecks, Plus, Search, SlidersHorizontal, UserRound, UsersRound, X,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { ProjectMember } from '../../services/api/project-member.api';
import { PriorityBadge } from '../../components/common/PriorityBadge';

interface Props {
  tasks: Task[];
  members: ProjectMember[];
  loading: boolean;
  error: string;
  canCreate: boolean;
  onCreate: () => void;
  onOpen: (task: Task) => void;
}

const columns: Array<{ status: TaskStatus; label: string; description: string; dot: string; accent: string; surface: string }> = [
  { status: 'TODO', label: 'Cần làm', description: 'Công việc chưa bắt đầu', dot: 'bg-slate-400', accent: 'border-t-slate-400', surface: 'bg-slate-50/80' },
  { status: 'IN_PROGRESS', label: 'Đang thực hiện', description: 'Công việc đang được xử lý', dot: 'bg-blue-500', accent: 'border-t-blue-500', surface: 'bg-blue-50/45' },
  { status: 'REVIEW', label: 'Chờ duyệt', description: 'Đang chờ Manager xem xét', dot: 'bg-violet-500', accent: 'border-t-violet-500', surface: 'bg-violet-50/45' },
  { status: 'DONE', label: 'Hoàn thành', description: 'Công việc đã kết thúc', dot: 'bg-emerald-500', accent: 'border-t-emerald-500', surface: 'bg-emerald-50/45' },
];

const priorityBorder: Record<TaskPriority, string> = { LOW: 'border-l-slate-300', MEDIUM: 'border-l-blue-400', HIGH: 'border-l-amber-400', URGENT: 'border-l-red-500' };
const dateVi = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value.slice(0, 10)}T00:00:00`));
const initials = (name?: string) => name ? name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() : '?';

const TaskCard: React.FC<{ task: Task; onOpen: () => void }> = ({ task, onOpen }) => {
  const deadline = String(task.deadline || task.dueDate || '').slice(0, 10);
  const overdue = task.status !== 'DONE' && !!deadline && deadline < new Date().toISOString().slice(0, 10);
  const progress = Math.max(0, Math.min(100, Number(task.progressPercent ?? task.progress_percent ?? 0)));
  const followers = task.followerIds ?? (task.follower_ids || []).map(String);
  return <button type="button" onClick={onOpen} className={`group w-full rounded-2xl border border-slate-200 border-l-[3px] bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${priorityBorder[task.priority]}`}>
    <div className="flex items-start justify-between gap-2"><span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-slate-400">TASK-{task.id}</span>{overdue && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold text-red-600"><AlertTriangle className="h-3 w-3"/>Quá hạn</span>}</div>
    <h4 className="mt-2.5 line-clamp-2 text-[12px] font-bold leading-[18px] text-slate-800 group-hover:text-blue-700">{task.title}</h4>
    {task.description && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{task.description}</p>}
    <div className="mt-3 flex flex-wrap items-center gap-2"><PriorityBadge priority={task.priority}/><span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${overdue ? 'text-red-600' : 'text-slate-500'}`}><CalendarDays className="h-3 w-3"/>{deadline ? dateVi(deadline) : 'Chưa có hạn'}</span></div>
    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><div className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-[9px] font-bold text-blue-700">{initials(task.assigneeName || task.assignee_name)}</span><span className="max-w-28 truncate text-[9px] font-medium text-slate-500">{task.assigneeName || task.assignee_name || 'Chưa phân công'}</span></div><span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-500" title={`${followers.length} follower`}><UsersRound className="h-3 w-3"/>{followers.length}</span></div>
    <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-[9px]"><span className="inline-flex items-center gap-1 text-slate-400"><ListChecks className="h-3 w-3"/>Checklist</span><b className={progress === 100 ? 'text-emerald-600' : 'text-slate-600'}>{progress}%</b></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}/></div></div>
    <div className="mt-3 flex items-center justify-end text-[9px] font-bold text-blue-600 opacity-0 transition group-hover:opacity-100">Mở chi tiết <ChevronRight className="h-3 w-3"/></div>
  </button>;
};

export const ProjectKanban: React.FC<Props> = ({ tasks, members, loading, error, canCreate, onCreate, onOpen }) => {
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState('ALL');
  const [priority, setPriority] = useState<'ALL' | TaskPriority>('ALL');
  const [status, setStatus] = useState<'ALL' | TaskStatus>('ALL');
  const filtered = useMemo(() => tasks.filter((task) => {
    const term = search.trim().toLowerCase();
    return (!term || `${task.title} ${task.description || ''} ${task.assigneeName || ''}`.toLowerCase().includes(term))
      && (assignee === 'ALL' || String(task.assigneeId ?? task.assignee_id) === assignee)
      && (priority === 'ALL' || task.priority === priority)
      && (status === 'ALL' || task.status === status);
  }), [tasks, search, assignee, priority, status]);
  const hasFilters = !!search || assignee !== 'ALL' || priority !== 'ALL' || status !== 'ALL';
  const reset = () => { setSearch(''); setAssignee('ALL'); setPriority('ALL'); setStatus('ALL'); };

  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><div className="flex items-center gap-2"><h2 className="text-base font-bold text-slate-900">Bảng công việc</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{filtered.length}/{tasks.length} Task</span></div><p className="mt-1 text-[10px] text-slate-400">Trạng thái chỉ thay đổi qua workflow hợp lệ — không hỗ trợ kéo thả.</p></div>{canCreate && <button type="button" onClick={onCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4"/>Tạo Task</button>}</div>
      <div className="mt-4 grid gap-2 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(140px,180px))_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm Task, mô tả, Assignee..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/></label>
        <label className="relative"><UserRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><select aria-label="Lọc theo Assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-7 text-xs text-slate-600"><option value="ALL">Tất cả Assignee</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select></label>
        <label className="relative"><SlidersHorizontal className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><select aria-label="Lọc theo ưu tiên" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-7 text-xs text-slate-600"><option value="ALL">Mọi ưu tiên</option><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option></select></label>
        <label className="relative"><Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><select aria-label="Lọc theo trạng thái" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-7 text-xs text-slate-600"><option value="ALL">Mọi trạng thái</option><option value="TODO">TODO</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="REVIEW">REVIEW</option><option value="DONE">DONE</option></select></label>
        {hasFilters && <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"><X className="h-3.5 w-3.5"/>Xóa lọc</button>}
      </div>
    </div>
    {error ? <div role="alert" className="m-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700"><b>Không thể tải Kanban.</b><p className="mt-1">{error}</p></div>
      : loading ? <div className="grid auto-cols-[290px] grid-flow-col gap-4 overflow-hidden p-5 xl:grid-cols-4 xl:grid-flow-row">{columns.map((column) => <div key={column.status} className="h-[480px] animate-pulse rounded-2xl bg-slate-100"/>)}</div>
        : <div className="grid auto-cols-[300px] grid-flow-col gap-4 overflow-x-auto p-4 sm:auto-cols-[320px] sm:p-5 xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-4">
          {columns.map((column) => { const items = filtered.filter((task) => task.status === column.status); return <div key={column.status} className={`flex min-h-[520px] flex-col rounded-2xl border border-slate-200 border-t-[3px] ${column.accent} ${column.surface}`}>
            <div className="border-b border-slate-200/70 px-3.5 py-3"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-700"><span className={`h-2 w-2 rounded-full ${column.dot}`}/>{column.label}</h3><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-[10px] font-bold text-slate-600 shadow-sm">{items.length}</span></div><p className="mt-1 text-[9px] text-slate-400">{column.description}</p></div>
            <div className="flex-1 space-y-3 p-2.5">{items.map((task) => <TaskCard key={task.id} task={task} onOpen={() => onOpen(task)}/>)}{!items.length && <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-5 text-center"><div>{column.status === 'DONE' ? <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-200"/> : <CircleDashed className="mx-auto h-7 w-7 text-slate-300"/>}<p className="mt-2 text-[10px] font-semibold text-slate-400">{hasFilters ? 'Không có Task phù hợp bộ lọc' : `Chưa có Task ${column.label.toLowerCase()}`}</p>{hasFilters && <button onClick={reset} className="mt-2 text-[9px] font-bold text-blue-600">Xóa bộ lọc</button>}</div></div>}</div>
          </div>; })}
        </div>}
  </section>;
};
