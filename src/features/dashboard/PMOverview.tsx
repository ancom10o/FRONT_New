import React, { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleDot, ClipboardCheck, FolderKanban, ListChecks, ShieldAlert } from 'lucide-react';
import { projectApi } from '../../services/api/project.api';
import { taskApi } from '../../services/api/task.api';
import { mockCoreApi } from '../../mocks/mockApi';
import { Project, Task } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { useFilterStore } from '../../store/filter.store';

const statusMeta = {
  PLANNING: { label: 'Lập kế hoạch', color: '#94a3b8' }, ACTIVE: { label: 'Đang thực hiện', color: '#2563eb' },
  FROZEN: { label: 'Tạm khóa', color: '#f59e0b' }, COMPLETED: { label: 'Hoàn thành', color: '#10b981' }, ARCHIVED: { label: 'Lưu trữ', color: '#64748b' },
} as const;

const dateOnly = (value?: string) => String(value || '').slice(0, 10);
const todayKey = () => new Date().toISOString().slice(0, 10);
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${dateOnly(value)}T00:00:00`)) : 'Chưa có ngày';

export const PMOverview: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const setActiveTab = useAuthStore(s => s.setActiveTab);
  const setFilters = useFilterStore(s => s.setFilters);

  useEffect(() => {
    let active = true;
    Promise.all([projectApi.getProjects(), taskApi.getTasks()]).then(([projectData, taskData]) => {
      if (!active) return; setProjects(projectData); setTasks(taskData); setError('');
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu quản trị dự án.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const snapshot = mockCoreApi.snapshot();
  const pendingCompletion = snapshot.completionRequests.filter(item => item.status === 'PENDING');
  const reviewTasks = tasks.filter(task => task.status === 'REVIEW');
  const overdueTasks = tasks.filter(task => task.status !== 'DONE' && dateOnly(task.deadline || task.dueDate) < todayKey());
  const activeProjects = projects.filter(project => project.status === 'ACTIVE');
  const doneTasks = tasks.filter(task => task.status === 'DONE').length;
  const completionRate = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0;
  const projectStats = useMemo(() => projects.map(project => {
    const projectTasks = tasks.filter(task => String(task.projectId ?? task.project_id) === String(project.id));
    const done = projectTasks.filter(task => task.status === 'DONE').length;
    const overdue = projectTasks.filter(task => task.status !== 'DONE' && dateOnly(task.deadline || task.dueDate) < todayKey()).length;
    const review = projectTasks.filter(task => task.status === 'REVIEW').length;
    return { project, total: projectTasks.length, done, overdue, review, progress: projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0 };
  }).sort((a, b) => b.overdue - a.overdue || b.review - a.review), [projects, tasks]);
  const upcoming = tasks.filter(task => task.status !== 'DONE' && dateOnly(task.deadline || task.dueDate) >= todayKey()).sort((a, b) => dateOnly(a.deadline || a.dueDate).localeCompare(dateOnly(b.deadline || b.dueDate))).slice(0, 5);
  const statusData = Object.entries(statusMeta).map(([status, meta]) => ({ name: meta.label, value: projects.filter(project => project.status === status).length, color: meta.color })).filter(item => item.value);

  const openTasks = (status?: string, onlyOverdue = false) => {
    setFilters({ searchTerm: '', fromDate: '', toDate: '', projectId: 'ALL', assigneeId: 'ALL', departmentId: 'ALL', priority: 'ALL', taskType: 'ALL', status: status || 'ALL', onlyOverdue });
    setActiveTab('tasks');
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Đang tổng hợp danh mục dự án...</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><b>Không thể tải dashboard.</b><p className="mt-1">{error}</p></div>;
  if (!projects.length && !tasks.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"><FolderKanban className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-700">Chưa có dữ liệu dự án</h2><p className="mt-1 text-xs text-slate-400">Tạo dự án đầu tiên để bắt đầu theo dõi danh mục và tiến độ.</p><button onClick={() => setActiveTab('projects')} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Mở quản lý dự án</button></div>;

  const kpis = [
    { label: 'Tổng dự án', value: projects.length, note: `${activeProjects.length} đang thực hiện`, icon: FolderKanban, tone: 'text-blue-700 bg-blue-50', action: () => setActiveTab('projects') },
    { label: 'Tổng công việc', value: tasks.length, note: `${doneTasks} đã hoàn thành`, icon: ListChecks, tone: 'text-slate-700 bg-slate-100', action: () => openTasks() },
    { label: 'Chờ REVIEW', value: reviewTasks.length, note: 'Cần Manager hợp lệ xử lý', icon: ClipboardCheck, tone: 'text-violet-700 bg-violet-50', action: () => openTasks('REVIEW') },
    { label: 'Quá hạn', value: overdueTasks.length, note: 'Chưa ở trạng thái DONE', icon: ShieldAlert, tone: 'text-red-700 bg-red-50', action: () => openTasks(undefined, true) },
    { label: 'Chờ duyệt hoàn thành', value: pendingCompletion.length, note: 'Leader đã gửi ADMIN', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50', action: () => setActiveTab('projects') },
  ];

  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{kpis.map(({ label, value, note, icon: Icon, tone, action }) => <button key={label} onClick={action} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold text-slate-500">{label}</p><strong className="mt-2 block text-2xl text-slate-900">{value}</strong></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-2 truncate text-[10px] text-slate-400">{note}</p></button>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Sức khỏe danh mục dự án</h2><p className="mt-1 text-[11px] text-slate-400">Ưu tiên dự án có việc quá hạn hoặc đang chờ REVIEW</p></div><button onClick={() => setActiveTab('projects')} className="flex items-center gap-1 text-[11px] font-bold text-blue-600">Tất cả dự án <ArrowRight className="h-3.5 w-3.5" /></button></div><div className="divide-y divide-slate-100">{projectStats.slice(0, 6).map(({ project, total, overdue, review, progress }) => <button key={project.id} onClick={() => setActiveTab('projects')} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 sm:grid-cols-[1fr_110px_120px]"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${overdue ? 'bg-red-500' : review ? 'bg-violet-500' : project.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-slate-400'}`} /><b className="truncate text-xs text-slate-800">{project.name}</b></div><p className="mt-1 truncate pl-4 text-[10px] text-slate-400">{project.leader_name || project.pmName || 'Chưa có Leader'} · {total} công việc</p></div><div><div className="flex justify-between text-[9px] text-slate-400"><span>Tiến độ</span><b className="text-slate-700">{progress}%</b></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div></div><div className="flex items-center justify-end gap-2 text-[9px]"><span className={`rounded-full px-2 py-1 ${overdue ? 'bg-red-50 font-bold text-red-700' : 'bg-slate-50 text-slate-500'}`}>{overdue} quá hạn</span><span className={`rounded-full px-2 py-1 ${review ? 'bg-violet-50 font-bold text-violet-700' : 'bg-slate-50 text-slate-500'}`}>{review} review</span></div></button>)}</div></article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Trạng thái danh mục</h2><p className="mt-1 text-[11px] text-slate-400">Phân bổ {projects.length} dự án hiện có</p></div><span className="text-xl font-bold text-blue-700">{completionRate}%<small className="ml-1 text-[9px] font-medium text-slate-400">task DONE</small></span></div>{statusData.length ? <><div className="relative h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>{statusData.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value} dự án`, 'Số lượng']} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><b className="text-2xl text-slate-900">{projects.length}</b><p className="text-[9px] text-slate-400">Dự án</p></div></div></div><div className="grid grid-cols-2 gap-2">{statusData.map(item => <div key={item.name} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span><b className="text-slate-700">{item.value}</b></div>)}</div></> : <div className="grid h-52 place-items-center text-xs text-slate-400">Chưa có dữ liệu trạng thái.</div>}</article>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-bold text-slate-900">Deadline sắp tới</h2></div><button onClick={() => setActiveTab('calendar')} className="text-[11px] font-bold text-blue-600">Mở lịch</button></div>{upcoming.length ? <div className="divide-y divide-slate-100">{upcoming.map(task => <button key={task.id} onClick={() => setActiveTab('tasks')} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50"><span className={`h-2.5 w-2.5 rounded-full ${task.priority === 'URGENT' ? 'bg-red-500' : task.priority === 'HIGH' ? 'bg-amber-500' : task.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-400'}`} /><div className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-700">{task.title}</b><span className="text-[10px] text-slate-400">{task.projectName || task.project_name} · {task.assigneeName || task.assignee_name || 'Chưa phân công'}</span></div><time className="text-[10px] font-semibold text-slate-500">{formatDate(task.deadline || task.dueDate)}</time></button>)}</div> : <div className="p-10 text-center text-xs text-slate-400"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />Không có deadline sắp tới.</div>}</article>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Hàng đợi cần xử lý</h2><p className="mt-1 text-[11px] text-slate-400">ADMIN duyệt hoàn thành Project; Manager hợp lệ xử lý Task REVIEW</p></div><div className="grid gap-3 p-4 sm:grid-cols-2"><button onClick={() => openTasks('REVIEW')} className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-left"><ClipboardCheck className="h-5 w-5 text-violet-600" /><b className="mt-3 block text-2xl text-violet-700">{reviewTasks.length}</b><span className="text-[10px] font-semibold text-violet-600">Task chờ REVIEW</span><p className="mt-2 text-[9px] leading-4 text-violet-500">ADMIN chỉ theo dõi, không phê duyệt Task.</p></button><button onClick={() => setActiveTab('projects')} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left"><CircleDot className="h-5 w-5 text-emerald-600" /><b className="mt-3 block text-2xl text-emerald-700">{pendingCompletion.length}</b><span className="text-[10px] font-semibold text-emerald-600">Project chờ quyết định</span><p className="mt-2 text-[9px] leading-4 text-emerald-500">Yêu cầu do Project Leader gửi.</p></button></div>{overdueTasks.length > 0 && <button onClick={() => openTasks(undefined, true)} className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left"><AlertTriangle className="h-5 w-5 text-red-600" /><span className="flex-1 text-[11px] font-semibold text-red-700">{overdueTasks.length} công việc quá hạn đang ảnh hưởng tiến độ</span><ArrowRight className="h-4 w-4 text-red-500" /></button>}</article>
    </section>
  </div>;
};
