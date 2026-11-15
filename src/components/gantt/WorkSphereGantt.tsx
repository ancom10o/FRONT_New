import React, { memo, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronRight, Link2, UserRound } from 'lucide-react';
import { Project, Task, TaskStatus } from '../../types';
import { addUtcDays, calculateBarGeometry, createUtcWeekGroups, differenceInUtcDays, getPixelsPerDay, parseDateKeyUtc, startOfUtcMonth } from './ganttGeometry';

export type GanttScale = 'day' | 'week' | 'month';
export type GanttMode = 'portfolio' | 'project';
interface Props { mode: GanttMode; projects: Project[]; tasks: Task[]; scale: GanttScale; rangeStart: Date; rangeEnd: Date; collapsedProjects: Set<string>; onToggleProject: (id: string) => void; onOpenProject: (project: Project) => void; onOpenTask: (task: Task) => void; onRescheduleTask?: (task: Task) => void; canReschedule?: (task: Task) => boolean; }

const TASK_ROW_HEIGHT = 60;
const PROJECT_ROW_HEIGHT = 54;
const HEADER_HEIGHT = 92;
const TASK_BAR_HEIGHT = 32;
const colors: Record<TaskStatus, { bar: string; dot: string }> = { TODO: { bar: 'bg-slate-500', dot: 'bg-slate-400' }, IN_PROGRESS: { bar: 'bg-blue-600', dot: 'bg-blue-500' }, REVIEW: { bar: 'bg-violet-600', dot: 'bg-violet-500' }, DONE: { bar: 'bg-emerald-600', dot: 'bg-emerald-500' } };
const labels: Record<TaskStatus, string> = { TODO: 'Cần làm', IN_PROGRESS: 'Đang làm', REVIEW: 'Chờ duyệt', DONE: 'Hoàn thành' };
const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const initials = (name?: string) => name ? name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() : '?';
const dateVi = (value?: string) => { const date = parseDateKeyUtc(value); return date ? dateFormatter.format(date) : '—'; };
const shortDate = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
type HeaderTick = { key: string; label: string; left: number; width: number };

const WorkSphereGanttComponent: React.FC<Props> = ({ mode, projects, tasks, scale, rangeStart, rangeEnd, collapsedProjects, onToggleProject, onOpenProject, onOpenTask, onRescheduleTask, canReschedule }) => {
  const listWidth = mode === 'portfolio' ? 300 : 330;
  const scrollRef = useRef<HTMLDivElement>(null);
  const pixelsPerDay = getPixelsPerDay(scale);
  const dayCount = differenceInUtcDays(rangeEnd, rangeStart);
  const timelineWidth = Math.max(760, dayCount * pixelsPerDay);

  const projectGroups = useMemo(() => {
    const byProject = new Map<string, Task[]>();
    tasks.forEach((task) => { const id = String(task.projectId ?? task.project_id); byProject.set(id, [...(byProject.get(id) ?? []), task]); });
    return projects.map((project) => ({ project, tasks: byProject.get(String(project.id)) ?? [] }));
  }, [projects, tasks]);
  const visibleRows = useMemo(() => projectGroups.reduce((count, group) => count + (mode === 'portfolio' ? 1 : 0) + (collapsedProjects.has(String(group.project.id)) ? 0 : group.tasks.length), 0), [collapsedProjects, mode, projectGroups]);
  const naturalHeight = HEADER_HEIGHT + visibleRows * TASK_ROW_HEIGHT + 2;
  const x = (date: Date) => differenceInUtcDays(date, rangeStart) * pixelsPerDay;

  const { primaryTicks, secondaryTicks } = useMemo(() => {
    const primary: HeaderTick[] = [];
    const secondary: HeaderTick[] = [];
    if (scale === 'week') {
      createUtcWeekGroups(rangeStart, rangeEnd).forEach((week) => primary.push({ key: `week-${week.start.toISOString()}`, label: `${shortDate(week.start)} – ${shortDate(week.endInclusive)}`, left: differenceInUtcDays(week.start, rangeStart) * pixelsPerDay, width: week.dayCount * pixelsPerDay }));
      for (let offset = 0; offset < dayCount; offset += 1) { const date = addUtcDays(rangeStart, offset); secondary.push({ key: `day-${date.toISOString()}`, label: String(date.getUTCDate()), left: offset * pixelsPerDay, width: pixelsPerDay }); }
      return { primaryTicks: primary, secondaryTicks: secondary };
    }
    let cursor = startOfUtcMonth(rangeStart);
    while (cursor < rangeEnd) {
      const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)); const start = cursor < rangeStart ? rangeStart : cursor; const end = next > rangeEnd ? rangeEnd : next;
      primary.push({ key: `month-${cursor.toISOString()}`, label: monthFormatter.format(cursor), left: x(start), width: differenceInUtcDays(end, start) * pixelsPerDay }); cursor = next;
    }
    if (scale === 'day') for (let offset = 0; offset < dayCount; offset += 1) { const date = addUtcDays(rangeStart, offset); secondary.push({ key: `day-${date.toISOString()}`, label: `${weekDayLabels[date.getUTCDay()]} ${date.getUTCDate()}`, left: offset * pixelsPerDay, width: pixelsPerDay }); }
    else primary.forEach((tick) => secondary.push({ ...tick, key: `minor-${tick.key}` }));
    return { primaryTicks: primary, secondaryTicks: secondary };
  }, [dayCount, pixelsPerDay, rangeEnd, rangeStart, scale]);

  const taskGeometry = useMemo(() => new Map(tasks.map((task) => [String(task.id), calculateBarGeometry(task.startDate || task.start_date, task.deadline || task.dueDate, rangeStart, rangeEnd, pixelsPerDay)])), [pixelsPerDay, rangeEnd, rangeStart, tasks]);
  const projectGeometry = useMemo(() => new Map(projects.map((project) => [String(project.id), calculateBarGeometry(project.startDate || project.start_date, project.endDate || project.end_date, rangeStart, rangeEnd, pixelsPerDay)])), [pixelsPerDay, projects, rangeEnd, rangeStart]);
  const gridStep = scale === 'month' ? pixelsPerDay * 7 : pixelsPerDay;
  const grid = `repeating-linear-gradient(to right, transparent 0, transparent ${gridStep - 1}px, #e7ebf1 ${gridStep - 1}px, #e7ebf1 ${gridStep}px)`;
  const today = parseDateKeyUtc(new Date().toISOString()); const todayLeft = today ? x(today) : -1;
  useEffect(() => { scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }, [rangeStart, scale]);

  const viewportHeight = mode === 'portfolio' ? 'calc(100vh - 154px)' : `min(calc(100vh - 250px), ${Math.max(300, naturalHeight)}px)`;
  return <div ref={scrollRef} className="relative overflow-auto rounded-2xl border border-slate-200 bg-white overscroll-contain" style={{ height: viewportHeight, minHeight: mode === 'portfolio' ? 420 : undefined, scrollbarGutter: 'stable', contain: 'layout paint' }}>
    <div className="min-w-max" style={{ width: listWidth + timelineWidth }}>
      <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-white" style={{ gridTemplateColumns: `${listWidth}px ${timelineWidth}px`, height: HEADER_HEIGHT }}>
        <div className="sticky left-0 z-40 flex items-center border-r border-slate-200 bg-slate-50 px-4"><div><b className="block text-[12px] text-slate-700">{mode === 'portfolio' ? 'Dự án & công việc' : 'Công việc'}</b><span className="text-[10px] text-slate-400">{tasks.length} Task</span></div></div>
        <div className="relative overflow-hidden bg-slate-50"><div className="relative h-10 border-b border-slate-200">{primaryTicks.map((tick) => <div key={tick.key} className="absolute inset-y-0 flex items-center justify-center overflow-hidden border-l border-slate-200 px-2 text-[10px] font-bold capitalize text-slate-600" style={{ left: tick.left, width: tick.width }}>{tick.label}</div>)}</div><div className="relative h-[51px]">{secondaryTicks.map((tick) => <div key={tick.key} className="absolute inset-y-0 flex items-center justify-center overflow-hidden border-l border-slate-200 text-[9px] font-semibold text-slate-400" style={{ left: tick.left, width: tick.width }}>{tick.label}</div>)}</div></div>
      </div>
      <div className="relative">
        {todayLeft >= 0 && todayLeft < timelineWidth && <div className="pointer-events-none absolute bottom-0 top-0 z-[6] w-px bg-orange-500/80" style={{ left: listWidth + todayLeft + pixelsPerDay / 2 }}><span className="sticky top-[92px] -ml-6 whitespace-nowrap rounded-b-md bg-orange-500 px-1.5 py-0.5 text-[8px] font-bold text-white">Hôm nay</span></div>}
        {projectGroups.map(({ project, tasks: projectTasks }) => { const isCollapsed = collapsedProjects.has(String(project.id)); const projectBar = projectGeometry.get(String(project.id)); return <React.Fragment key={project.id}>
          {mode === 'portfolio' && <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `${listWidth}px ${timelineWidth}px`, height: PROJECT_ROW_HEIGHT }}><div className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-slate-50 px-3"><button aria-label={`${isCollapsed ? 'Mở rộng' : 'Thu gọn'} ${project.name}`} aria-expanded={!isCollapsed} onClick={() => onToggleProject(String(project.id))} className="rounded-lg p-1 text-slate-400 hover:bg-white">{isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button><button onClick={() => onOpenProject(project)} className="ml-1 min-w-0 flex-1 truncate text-left text-[12px] font-bold text-slate-800 hover:text-blue-700">{project.name}</button><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-500">{projectTasks.length}</span></div><div className="relative overflow-hidden" style={{ width: timelineWidth, height: PROJECT_ROW_HEIGHT, backgroundImage: grid }}>{projectBar && <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-400" style={{ left: projectBar.left, width: projectBar.width }} />}</div></div>}
          {!isCollapsed && projectTasks.map((task) => { const geometry = taskGeometry.get(String(task.id)); return <div key={task.id} className="grid border-b border-slate-100" style={{ gridTemplateColumns: `${listWidth}px ${timelineWidth}px`, height: TASK_ROW_HEIGHT }}><button onClick={() => onOpenTask(task)} className="sticky left-0 z-20 flex min-w-0 items-center gap-2.5 border-r border-slate-200 bg-white px-4 text-left hover:bg-blue-50"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[task.status].dot}`} /><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-slate-700">{task.title}</div><div className="mt-1 flex items-center gap-1 truncate text-[9px] text-slate-400"><UserRound className="h-3 w-3" />{task.assigneeName || 'Chưa phân công'} · {labels[task.status]}</div></div></button><div className="relative overflow-hidden" style={{ width: timelineWidth, height: TASK_ROW_HEIGHT, backgroundImage: grid }}>{geometry && <>{(task.dependencyIds?.length || 0) > 0 && <span title={`Phụ thuộc ${task.dependencyIds?.length} Task`} className="absolute top-1/2 border-t border-dashed border-violet-300" style={{ left: Math.max(0, geometry.left - 28), width: Math.min(28, geometry.left) }} />}<button type="button" onClick={() => onOpenTask(task)} onDoubleClick={() => canReschedule?.(task) && onRescheduleTask?.(task)} title={`${task.title}\n${dateVi(task.startDate || task.start_date)} – ${dateVi(task.deadline || task.dueDate)}\n${task.assigneeName || 'Chưa phân công'} · ${labels[task.status]}`} className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center overflow-hidden rounded-lg text-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md ${colors[task.status].bar} ${geometry.clippedStart ? 'rounded-l-none' : ''} ${geometry.clippedEnd ? 'rounded-r-none' : ''}`} style={{ left: geometry.left, width: geometry.width, height: TASK_BAR_HEIGHT }}><span className="mx-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/25 text-[8px]">{initials(task.assigneeName)}</span>{geometry.width >= 112 && <span className="min-w-0 flex-1 truncate pr-2 text-left text-[10px] font-bold">{task.title}</span>}{(task.dependencyIds?.length || 0) > 0 && geometry.width >= 62 && <Link2 className="mr-2 h-3 w-3 shrink-0" />}</button></>}</div></div>; })}
        </React.Fragment>; })}
      </div>
    </div>
  </div>;
};

export const WorkSphereGantt = memo(WorkSphereGanttComponent);
