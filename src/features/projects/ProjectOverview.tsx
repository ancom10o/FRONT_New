import React, { useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, CalendarDays,
  Clock3, Edit2, FolderKanban, LayoutList, Send, Sparkles, UserRound,
  UsersRound,
} from 'lucide-react';
import { Project, Task, TaskStatus } from '../../types';
import { ProjectMember } from '../../services/api/project-member.api';
import { MockAuditEvent, MockDatabase } from '../../mocks/mockApi';

interface Props {
  project: Project;
  tasks: Task[];
  members: ProjectMember[];
  database: MockDatabase;
  loading: boolean;
  error: string;
  canOperate: boolean;
  canEdit: boolean;
  isLeader: boolean;
  allTasksDone: boolean;
  hasPendingCompletion: boolean;
  pendingCompletionStatus?: string;
  canApproveCompletion: boolean;
  rejectionReason: string;
  onRejectionReasonChange: (value: string) => void;
  onEdit: () => void;
  onCreateTask: () => void;
  onOpenTask: (task: Task) => void;
  onNavigate: (tab: 'kanban' | 'gantt' | 'history') => void;
  onManageMembers: () => void;
  onRequestCompletion: () => void;
  onApproveCompletion: () => void;
  onRejectCompletion: () => void;
}

const statusMeta: Record<Project['status'], { label: string; style: string; dot: string }> = {
  PLANNING: { label: 'Lập kế hoạch', style: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  ACTIVE: { label: 'Đang thực hiện', style: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  FROZEN: { label: 'Tạm khóa', style: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { label: 'Hoàn thành', style: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  ARCHIVED: { label: 'Lưu trữ', style: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
};

const taskColors: Record<TaskStatus, string> = { TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', REVIEW: '#8b5cf6', DONE: '#10b981' };
const taskLabels: Record<TaskStatus, string> = { TODO: 'Cần làm', IN_PROGRESS: 'Đang làm', REVIEW: 'Chờ duyệt', DONE: 'Hoàn thành' };
const actionLabels: Record<string, string> = {
  PROJECT_UPDATED: 'cập nhật thông tin dự án', PROJECT_COMPLETION_REQUESTED: 'gửi yêu cầu hoàn thành dự án',
  PROJECT_COMPLETED: 'phê duyệt hoàn thành dự án', PROJECT_COMPLETION_REJECTED: 'từ chối yêu cầu hoàn thành',
  PROJECT_ROLE_UPDATED: 'thay đổi vai trò thành viên', TASK_STARTED: 'bắt đầu công việc', TASK_UPDATED: 'cập nhật công việc',
  TASK_ASSIGNED: 'phân công công việc', TASK_DELETED: 'xóa công việc', REVIEW_SUBMITTED: 'gửi công việc duyệt',
  REVIEW_APPROVED: 'phê duyệt công việc', REVIEW_REJECTED: 'yêu cầu làm lại công việc',
  CHECKLIST_UPDATED: 'cập nhật checklist', CHECKLIST_ITEM_ADDED: 'thêm checklist', CHECKLIST_ITEM_REMOVED: 'xóa checklist',
  TASK_FOLLOWER_ADDED: 'thêm người theo dõi', TASK_FOLLOWER_REMOVED: 'gỡ người theo dõi', EVIDENCE_UPLOADED: 'tải lên minh chứng',
};

const dateVi = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';
const dateTimeVi = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

const TaskRow: React.FC<{ task: Task; tone: string; onOpen: () => void }> = ({ task, tone, onOpen }) => (
  <button type="button" onClick={onOpen} className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50">
    <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700 group-hover:text-blue-700">{task.title}</span><span className="mt-0.5 block text-[10px] text-slate-400">{task.assigneeName || 'Chưa phân công'} · {dateVi(task.deadline)}</span></span>
    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500" />
  </button>
);

export const ProjectOverview: React.FC<Props> = (props) => {
  const { project, tasks, members, database } = props;
  const today = new Date().toISOString().slice(0, 10);
  const counts = useMemo(() => ({
    TODO: tasks.filter((task) => task.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
    REVIEW: tasks.filter((task) => task.status === 'REVIEW').length,
    DONE: tasks.filter((task) => task.status === 'DONE').length,
  }), [tasks]);
  const progress = tasks.length ? Math.round(counts.DONE / tasks.length * 100) : 0;
  const overdue = tasks.filter((task) => task.status !== 'DONE' && String(task.deadline).slice(0, 10) < today).sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
  const upcomingLimit = new Date(); upcomingLimit.setDate(upcomingLimit.getDate() + 7);
  const upcomingLimitText = upcomingLimit.toISOString().slice(0, 10);
  const upcoming = tasks.filter((task) => task.status !== 'DONE' && String(task.deadline).slice(0, 10) >= today && String(task.deadline).slice(0, 10) <= upcomingLimitText).sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
  const activeTaskIds = new Set(tasks.map((task) => Number(task.id)));
  const activity = database.audit.filter((event) => event.entityType === 'PROJECT' ? event.entityId === Number(project.id) : activeTaskIds.has(event.entityId)).slice(0, 6);
  const leader = members.find((member) => Number(member.userId) === Number(project.leader_id ?? project.pmId));
  const projectManagers = members.filter((member) => member.projectRole === 'PROJECT_MANAGER' && Number(member.userId) !== Number(project.leader_id ?? project.pmId));
  const ordinaryMembers = members.filter((member) => member.projectRole !== 'PROJECT_MANAGER' && Number(member.userId) !== Number(project.leader_id ?? project.pmId));
  const status = statusMeta[project.status];
  const gradient = tasks.length ? `conic-gradient(${taskColors.DONE} 0 ${progress}%, #e2e8f0 ${progress}% 100%)` : '#e2e8f0';
  const highlightGroups = [
    { title: 'Sắp đến hạn', icon: Clock3, tasks: upcoming, tone: 'bg-amber-400', empty: 'Không có Task đến hạn trong 7 ngày.' },
    { title: 'Quá hạn', icon: AlertTriangle, tasks: overdue, tone: 'bg-red-500', empty: 'Không có Task quá hạn.' },
  ];
  const memberGroups = [{ label: 'Quản lý dự án', items: [...(leader ? [leader] : []), ...projectManagers] }, { label: 'Thành viên', items: ordinaryMembers }];

  if (props.loading) return <div className="grid gap-4 lg:grid-cols-3"><div className="h-56 animate-pulse rounded-3xl bg-slate-100 lg:col-span-2"/><div className="h-56 animate-pulse rounded-3xl bg-slate-100"/><div className="h-72 animate-pulse rounded-3xl bg-slate-100 lg:col-span-3"/></div>;
  if (props.error) return <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700"><b>Không thể tải tổng quan dự án.</b><p className="mt-1 text-xs">{props.error}</p></div>;

  return <div className="project-overview space-y-4">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/60 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{project.projectCode || project.project_code || `PROJECT-${project.id}`}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.style}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`}/>{status.label}</span></div><h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{project.name}</h1><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{project.description || 'Dự án chưa có mô tả. Người có quyền quản lý có thể bổ sung mục tiêu và phạm vi.'}</p></div>
          <div className="flex flex-col items-end gap-2">{props.canEdit && <button onClick={props.onEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"><Edit2 className="h-3.5 w-3.5"/>Chỉnh sửa</button>}<button type="button" onClick={() => props.onNavigate('kanban')} aria-label="Mở công việc của dự án" title="Mở công việc của dự án" className="inline-flex min-w-32 flex-col items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 hover:shadow-lg"><ArrowRight className="h-7 w-7"/><span className="text-[10px] font-bold">Đi tới công việc</span></button></div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-slate-200/70 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-blue-700"><UserRound className="h-4 w-4"/></span><div><span className="block text-[10px] text-slate-400">Project Leader</span><b className="text-xs text-slate-700">{project.leader_name || project.pmName || leader?.fullName || 'Chưa cập nhật'}</b></div></div>
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><CalendarDays className="h-4 w-4"/></span><div><span className="block text-[10px] text-slate-400">Thời gian dự án</span><b className="text-xs text-slate-700">{dateVi(project.startDate)} – {dateVi(project.endDate)}</b></div></div>
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><UsersRound className="h-4 w-4"/></span><div><span className="block text-[10px] text-slate-400">Đội ngũ</span><b className="text-xs text-slate-700">{members.length} thành viên hoạt động</b></div></div>
        </div>
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-800">Tiến độ tổng thể</h2><p className="mt-1 text-[10px] text-slate-400">Tính theo số Task đã chuyển sang DONE</p></div><button onClick={() => props.onNavigate('kanban')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Mở Kanban →</button></div>
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: gradient }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white"><div className="text-center"><b className="block text-2xl text-slate-800">{progress}%</b><span className="text-[9px] text-slate-400">hoàn thành</span></div></div></div>
          <div className="min-w-0 flex-1"><div className="flex items-end justify-between"><span className="text-xs text-slate-500">{counts.DONE} / {tasks.length} Task hoàn thành</span><span className={`text-[10px] font-bold ${overdue.length ? 'text-red-600' : 'text-emerald-600'}`}>{overdue.length ? `${overdue.length} quá hạn` : 'Đúng tiến độ'}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }}/></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['TODO','IN_PROGRESS','REVIEW','DONE'] as TaskStatus[]).map((taskStatus) => <div key={taskStatus} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><span className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500"><span className="h-1.5 w-1.5 rounded-full" style={{ background: taskColors[taskStatus] }}/>{taskLabels[taskStatus]}</span><b className="mt-1 block text-lg text-slate-800">{counts[taskStatus]}</b></div>)}</div></div>
        </div>
      </section>

    </div>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-800">Công việc cần chú ý</h2><p className="mt-1 text-[10px] text-slate-400">Ưu tiên theo hạn, REVIEW và hoạt động hoàn thành gần đây</p></div><Sparkles className="h-4 w-4 text-blue-500"/></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{highlightGroups.map(({ title, icon: Icon, tasks: items, tone, empty }) => <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5"><div className="flex items-center justify-between px-2 py-1"><h3 className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><Icon className="h-3.5 w-3.5"/>{title}</h3><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-500 shadow-sm">{items.length}</span></div><div className="mt-1">{items.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} tone={tone} onOpen={() => props.onOpenTask(task)}/>)}{!items.length && <p className="px-2 py-6 text-center text-[10px] leading-4 text-slate-400">{empty}</p>}</div></div>)}</div></section>

    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-800">Đội ngũ dự án</h2><p className="mt-1 text-[10px] text-slate-400">{members.length} thành viên đang hoạt động</p></div><button onClick={() => props.onNavigate('history')} className="text-[10px] font-bold text-blue-600">Nhân sự & Lịch sử →</button></div><div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">{memberGroups.map((group) => <div key={group.label}><div className="mb-2 flex items-center justify-between"><h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.label}</h3><span className="text-[10px] text-slate-400">{group.items.length}</span></div>{group.items.length ? <div className="grid gap-2 sm:grid-cols-2">{group.items.map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-[10px] font-bold text-blue-700">{initials(member.fullName)}</span><span className="min-w-0"><b className="block truncate text-[11px] text-slate-700">{member.fullName}</b><span className="block truncate text-[9px] text-slate-400">{member.departmentName || member.email}</span></span></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[10px] text-slate-400">Chưa có {group.label.toLowerCase()}.</p>}</div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-800">Hoạt động gần đây</h2><p className="mt-1 text-[10px] text-slate-400">Dữ liệu audit thực tế của dự án</p></div><Activity className="h-4 w-4 text-slate-400"/></div><div className="mt-4 space-y-1">{activity.map((event: MockAuditEvent) => { const actor = database.users.find((user) => user.id === event.actorId); return <div key={event.id} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500 ring-4 ring-blue-50"/><div className="min-w-0 flex-1"><p className="text-[11px] leading-4 text-slate-600"><b className="text-slate-800">{actor?.fullName || `User #${event.actorId}`}</b> {actionLabels[event.action] || event.detail}</p><span className="mt-0.5 block text-[9px] text-slate-400">{dateTimeVi(event.createdAt)}</span></div></div>; })}{!activity.length && <div className="py-10 text-center"><Activity className="mx-auto h-7 w-7 text-slate-200"/><p className="mt-2 text-[10px] text-slate-400">Chưa có hoạt động được ghi nhận.</p></div>}</div></section>
    </div>

    <section className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h2 className="text-sm font-bold">Hành động dự án</h2><p className="mt-1 text-[10px] text-slate-400">Các hành động hiển thị theo vai trò và trạng thái hiện tại.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => props.onNavigate('kanban')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"><LayoutList className="h-3.5 w-3.5"/>Kanban</button><button onClick={() => props.onNavigate('gantt')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"><FolderKanban className="h-3.5 w-3.5"/>Gantt</button>{props.isLeader && props.allTasksDone && project.status === 'ACTIVE' && !props.hasPendingCompletion && <button onClick={props.onRequestCompletion} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"><Send className="h-3.5 w-3.5"/>Gửi yêu cầu hoàn thành</button>}</div></div>
      {props.pendingCompletionStatus && <div className="mt-4 border-t border-white/10 pt-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><span className="text-xs text-slate-300">Yêu cầu hoàn thành gần nhất: <b className="text-white">{props.pendingCompletionStatus}</b></span>{props.canApproveCompletion && props.hasPendingCompletion && <><input value={props.rejectionReason} onChange={(event) => props.onRejectionReasonChange(event.target.value)} aria-label="Lý do từ chối hoàn thành dự án" className="min-w-64 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500"/><button onClick={props.onApproveCompletion} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500">Phê duyệt</button><button onClick={props.onRejectCompletion} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500">Từ chối</button></>}</div></div>}
    </section>
  </div>;
};
