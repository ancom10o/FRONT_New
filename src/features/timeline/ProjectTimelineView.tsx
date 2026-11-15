import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Project, Task, TaskPriority, TaskStatus } from '../../types';
import { projectApi } from '../../services/api/project.api';
import { taskApi } from '../../services/api/task.api';
import { useAuthStore } from '../../store/auth.store';
import { WorkSphereGantt, GanttScale } from '../../components/gantt/WorkSphereGantt';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import { RescheduleTaskModal } from './RescheduleTaskModal';
import { ProjectWorkspace } from '../projects/ProjectWorkspace';
import { mockCoreApi } from '../../mocks/mockApi';
import { addUtcDays, createGanttRange } from '../../components/gantt/ganttGeometry';

const utcToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};
const rangeFor = (scale: GanttScale, center = utcToday()) => createGanttRange(scale, center);
const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

export const ProjectTimelineView: React.FC<{ managerId?: string }> = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scale, setScale] = useState<GanttScale>('week');
  const [anchor, setAnchor] = useState(utcToday);
  const [range, setRange] = useState(() => rangeFor('week'));
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectId, setProjectId] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | TaskStatus>('ALL');
  const [assignee, setAssignee] = useState('ALL');
  const [priority, setPriority] = useState<'ALL' | TaskPriority>('ALL');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [scheduleTask, setScheduleTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [visibleProjects, visibleTasks] = await Promise.all([projectApi.getProjects(), taskApi.getTasks()]);
      setProjects(visibleProjects);
      setTasks(visibleTasks);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể tải dữ liệu Gantt.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const database = mockCoreApi.snapshot();
  const canReschedule = (task: Task) => {
    if (currentUser.role === 'ADMIN' || ['REVIEW', 'DONE'].includes(task.status)) return false;
    const project = database.projects.find((item) => item.id === Number(task.projectId));
    const membership = database.projectMemberships.find((item) => Number(item.projectId) === Number(task.projectId) && Number(item.userId) === Number(currentUser.id) && !item.leftAt);
    return project?.leaderId === Number(currentUser.id) || membership?.projectRole === 'PROJECT_MANAGER';
  };
  const assignees = useMemo(
    () => Array.from(new Map(tasks.filter((task) => task.assigneeId).map((task) => [String(task.assigneeId), task.assigneeName || `User ${task.assigneeId}`])).entries()),
    [tasks],
  );
  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) =>
      (!term || `${task.title} ${task.assigneeName || ''}`.toLowerCase().includes(term)) &&
      (projectId === 'ALL' || String(task.projectId) === projectId) &&
      (status === 'ALL' || task.status === status) &&
      (assignee === 'ALL' || String(task.assigneeId) === assignee) &&
      (priority === 'ALL' || task.priority === priority));
  }, [tasks, search, projectId, status, assignee, priority]);
  const visibleProjectIds = useMemo(() => new Set(filteredTasks.map((task) => String(task.projectId))), [filteredTasks]);
  const filteredProjects = useMemo(() => projects.filter((project) =>
    (projectId === 'ALL' || String(project.id) === projectId) &&
    (!search.trim() || project.name.toLowerCase().includes(search.toLowerCase()) || visibleProjectIds.has(String(project.id)))),
  [projectId, projects, search, visibleProjectIds]);
  const activeFilterCount = [projectId, status, assignee, priority].filter((value) => value !== 'ALL').length;
  const hasFilters = !!search || activeFilterCount > 0;
  const changeScale = (next: GanttScale) => { setScale(next); setRange(rangeFor(next, anchor)); };
  const shift = (direction: -1 | 1) => {
    const nextCenter = scale === 'month'
      ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + direction * 6, 15))
      : addUtcDays(anchor, direction * (scale === 'week' ? 56 : 21));
    setAnchor(nextCenter);
    setRange(createGanttRange(scale, nextCenter));
  };
  const jumpToMonth = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    const [year, month] = value.split('-').map(Number);
    const nextAnchor = new Date(Date.UTC(year, month - 1, 15));
    setAnchor(nextAnchor);
    setRange(rangeFor(scale, nextAnchor));
  };
  const goToday = () => { const today = utcToday(); setAnchor(today); setRange(rangeFor(scale, today)); };
  const resetFilters = () => { setSearch(''); setProjectId('ALL'); setStatus('ALL'); setAssignee('ALL'); setPriority('ALL'); };

  if (selectedProject) return <ProjectWorkspace project={selectedProject} onBack={() => { setSelectedProject(null); void load(); }} />;

  return <div className="relative -mx-1 space-y-2">
    <section className="sticky top-20 z-40 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:px-4" aria-label="Thanh công cụ Gantt">
      <div className="flex min-h-10 flex-wrap items-center gap-2">
        <div className="mr-auto hidden min-w-0 xl:block">
          <h2 className="truncate text-sm font-bold text-slate-900">Gantt tổng WorkSphere</h2>
          <p className="text-[9px] text-slate-400">{filteredTasks.length} công việc · {filteredProjects.length} dự án</p>
        </div>

        {searchOpen || search ? <label className="relative min-w-[190px] flex-1 xl:max-w-[290px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm Task hoặc Assignee..." className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-8 text-[11px] outline-none focus:border-blue-400" />
          <button aria-label="Đóng tìm kiếm" onClick={() => { setSearch(''); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3 w-3" /></button>
        </label> : <button onClick={() => setSearchOpen(true)} aria-label="Mở tìm kiếm Task" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><Search className="h-4 w-4" /></button>}

        <div className="relative">
          <button aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)} className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-bold ${activeFilterCount ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><SlidersHorizontal className="h-3.5 w-3.5" />Bộ lọc{activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] text-white">{activeFilterCount}</span>}</button>
          {filtersOpen && <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="text-xs font-bold text-slate-800">Bộ lọc nâng cao</h3><p className="mt-0.5 text-[9px] text-slate-400">Thu hẹp dữ liệu trên timeline</p></div><button aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select aria-label="Lọc dự án" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-2 text-[10px] text-slate-600"><option value="ALL">Tất cả dự án</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
              <select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-9 rounded-xl border border-slate-200 px-2 text-[10px] text-slate-600"><option value="ALL">Mọi trạng thái</option><option value="TODO">TODO</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="REVIEW">REVIEW</option><option value="DONE">DONE</option></select>
              <select aria-label="Lọc Assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-2 text-[10px] text-slate-600"><option value="ALL">Mọi Assignee</option>{assignees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
              <select aria-label="Lọc ưu tiên" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-9 rounded-xl border border-slate-200 px-2 text-[10px] text-slate-600"><option value="ALL">Mọi ưu tiên</option><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option></select>
            </div>
            {hasFilters && <button onClick={resetFilters} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600"><RotateCcw className="h-3 w-3" />Xóa toàn bộ bộ lọc</button>}
          </div>}
        </div>

        <label className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-[9px] font-semibold text-slate-400"><span className="hidden sm:inline">Đi đến</span><input aria-label="Chọn tháng và năm" type="month" value={monthKey(anchor)} onChange={(event) => jumpToMonth(event.target.value)} className="w-[112px] bg-transparent text-[10px] font-semibold text-slate-600 outline-none" /></label>
        <div className="flex rounded-xl bg-slate-100 p-1">{(['day', 'week', 'month'] as GanttScale[]).map((value) => <button key={value} aria-pressed={scale === value} onClick={() => changeScale(value)} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-bold ${scale === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{value === 'day' ? 'Ngày' : value === 'week' ? 'Tuần' : 'Tháng'}</button>)}</div>
        <div className="flex items-center gap-1"><button onClick={() => shift(-1)} aria-label="Giai đoạn trước" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button><button onClick={goToday} className="h-9 rounded-xl border border-slate-200 px-3 text-[9px] font-bold text-slate-600 hover:bg-slate-50">Hôm nay</button><button onClick={() => shift(1)} aria-label="Giai đoạn sau" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button></div>
      </div>
    </section>

    {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {loading ? <div className="h-[calc(100vh-154px)] animate-pulse rounded-2xl bg-slate-100" /> : !filteredProjects.length ? <div className="grid h-[calc(100vh-154px)] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-center"><div><Filter className="mx-auto h-8 w-8 text-slate-200" /><p className="mt-2 text-xs font-semibold text-slate-500">Không có dữ liệu phù hợp bộ lọc.</p>{hasFilters && <button onClick={resetFilters} className="mt-2 text-[10px] font-bold text-blue-600">Xóa bộ lọc</button>}</div></div> : <WorkSphereGantt mode="portfolio" projects={filteredProjects} tasks={filteredTasks} scale={scale} rangeStart={range.start} rangeEnd={range.end} collapsedProjects={collapsed} onToggleProject={(id) => setCollapsed((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} onOpenProject={setSelectedProject} onOpenTask={setDetailTask} onRescheduleTask={setScheduleTask} canReschedule={canReschedule} />}

    <TaskDetailDrawer task={detailTask} canEdit={detailTask ? canReschedule(detailTask) : false} onClose={() => setDetailTask(null)} onChanged={load} onEdit={(task) => { setDetailTask(null); setScheduleTask(task); }} />
    <RescheduleTaskModal task={scheduleTask} onClose={() => setScheduleTask(null)} onSave={async (task, startDate, deadline, reason) => { await taskApi.rescheduleTask(task, startDate, deadline, reason); await load(); }} />
  </div>;
};
