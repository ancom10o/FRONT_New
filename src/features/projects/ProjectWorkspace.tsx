import React, { useEffect, useState } from 'react';
import { ArrowLeft, GanttChart, History, LayoutDashboard, Columns3 } from 'lucide-react';
import { Project, Task } from '../../types';
import { taskApi } from '../../services/api/task.api';
import { ProjectMember, projectMemberApi } from '../../services/api/project-member.api';
import { useAuthStore } from '../../store/auth.store';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TaskFormData } from '../../schema/task.schema';
import { ProjectGantt } from './ProjectGantt';
import { mockCoreApi } from '../../mocks/mockApi';
import { ProjectMembersModal } from './ProjectMembersModal';
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectFormData as ProjectEditData } from '../../schema/project.schema';
import { projectApi } from '../../services/api/project.api';
import { ProjectOverview } from './ProjectOverview';
import { ProjectKanban } from './ProjectKanban';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';

interface ProjectWorkspaceProps {
  project: Project;
  onBack: () => void;
}

type ProjectTab = 'overview' | 'kanban' | 'gantt' | 'history';

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project, onBack }) => {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [taskError, setTaskError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [workflowDb, setWorkflowDb] = useState(() => mockCoreApi.snapshot());
  const [workflowNotice, setWorkflowNotice] = useState('');
  const [completionReason, setCompletionReason] = useState('Chưa đáp ứng điều kiện nghiệm thu dự án.');
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [, setProjectVersion] = useState(0);

  const loadTasks = async () => {
    setLoading(true);
    setTaskError('');
    try {
      setTasks(await taskApi.getTasks({ projectId: String(project.id) }));
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Không thể tải đầu việc dự án.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    setMemberError('');
    try {
      setMembers(await projectMemberApi.getMembers(project.id));
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : 'Không thể tải thành viên dự án.');
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks().catch(() => undefined);
    void loadMembers();
  }, [project.id]);

  useEffect(() => {
    const listener = () => setWorkflowDb(mockCoreApi.snapshot());
    window.addEventListener('hrm-mock-updated', listener);
    return () => window.removeEventListener('hrm-mock-updated', listener);
  }, []);

  const saveTask = async (data: TaskFormData, isEditing: boolean) => {
    const payload = { ...data, projectId: String(project.id) };
    if (isEditing && editingTask) await taskApi.updateTask(editingTask.id, payload);
    else await taskApi.createTask(payload);
    await loadTasks();
    setTaskModalOpen(false);
  };

  const isProjectOperator = String(project.leader_id ?? project.pmId) === String(currentUser.id)
    || members.some((member) => String(member.userId) === String(currentUser.id) && member.projectRole === 'PROJECT_MANAGER');
  const runtimeProject = workflowDb.projects.find((item) => item.id === Number(project.id));
  const completionRequests = workflowDb.completionRequests.filter((item) => Number(item.projectId) === Number(project.id)).slice().reverse();
  const pendingCompletion = completionRequests.find((item) => item.status === 'PENDING');
  const isLeader = runtimeProject?.leaderId === Number(currentUser.id);
  const allTasksDone = tasks.length > 0 && tasks.every((task) => task.status === 'DONE');
  const runProjectWorkflow = async (success: string, action: () => unknown) => {
    setTaskError(''); setWorkflowNotice('');
    try { action(); setWorkflowDb(mockCoreApi.snapshot()); await loadTasks(); setWorkflowNotice(success); }
    catch (error) { setTaskError(error instanceof Error ? error.message : 'Thao tác không thành công.'); }
  };

  const tabs: Array<{ id: ProjectTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Tổng quan dự án', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban', icon: Columns3 },
    { id: 'gantt', label: 'Gantt', icon: GanttChart },
    { id: 'history', label: 'Nhân sự & Lịch sử', icon: History },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600"><ArrowLeft className="h-3.5 w-3.5" />Danh sách dự án</button><span className="truncate text-[10px] font-semibold text-slate-400">{project.projectCode || project.project_code} · {project.name}</span></div>
        <div role="tablist" aria-label="Thông tin chi tiết dự án" className="mt-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeTab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </section>

      {taskError && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{taskError}</div>}
      {workflowNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{workflowNotice}</div>}

      {activeTab === 'overview' && (
        <ProjectOverview
          project={project} tasks={tasks} members={members} database={workflowDb}
          loading={loading || membersLoading} error={taskError || memberError}
          canOperate={isProjectOperator} canEdit={(currentUser.role === 'ADMIN' || isProjectOperator) && !['COMPLETED','ARCHIVED'].includes(project.status)}
          isLeader={isLeader} allTasksDone={allTasksDone} hasPendingCompletion={!!pendingCompletion}
          pendingCompletionStatus={completionRequests[0]?.status} canApproveCompletion={currentUser.role === 'ADMIN'}
          rejectionReason={completionReason} onRejectionReasonChange={setCompletionReason}
          onEdit={() => setProjectModalOpen(true)} onCreateTask={() => { setEditingTask(null); setTaskModalOpen(true); }}
          onOpenTask={setDetailTask} onNavigate={setActiveTab}
          onRequestCompletion={() => void runProjectWorkflow('Đã gửi yêu cầu hoàn thành dự án.', () => mockCoreApi.requestProjectCompletion(Number(project.id)))}
          onApproveCompletion={() => void runProjectWorkflow('Đã phê duyệt hoàn thành dự án.', () => mockCoreApi.decideProjectCompletion(Number(project.id), 'APPROVED', ''))}
          onRejectCompletion={() => void runProjectWorkflow('Đã từ chối yêu cầu.', () => mockCoreApi.decideProjectCompletion(Number(project.id), 'REJECTED', completionReason))}
        />
      )}

      {activeTab === 'kanban' && (
        <ProjectKanban tasks={tasks} members={members} loading={loading || membersLoading} error={taskError || memberError}
          canCreate={isProjectOperator && ['PLANNING','ACTIVE'].includes(project.status)}
          onCreate={() => { setEditingTask(null); setTaskModalOpen(true); }} onOpen={setDetailTask}/>
      )}

      {activeTab === 'gantt' && (
        loading ? <div role="status" className="rounded-3xl border border-slate-100 bg-white p-12 text-center text-xs text-slate-400">Đang tải tiến độ...</div>
          : <ProjectGantt project={project} tasks={tasks} onOpenTask={setDetailTask} onChanged={loadTasks} />
      )}

      {activeTab === 'history' && <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-800">Thành viên và quyền dự án</h3>{isProjectOperator && <button onClick={() => setMembersModalOpen(true)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Quản lý thành viên</button>}</div><div className="mt-3 space-y-2">{members.map((member) => <div key={String(member.userId)} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"><div><b>{member.fullName}</b><span className="ml-2 text-slate-400">{member.email}</span></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{String(member.userId) === String(runtimeProject?.leaderId) ? 'PROJECT LEADER' : member.projectRole}</span></div>)}</div></section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-800">Lịch sử nghiệp vụ</h3><div className="mt-3 max-h-96 space-y-2 overflow-y-auto">{workflowDb.audit.filter((item) => item.entityType === 'PROJECT' ? item.entityId === Number(project.id) : tasks.some((task) => Number(task.id) === item.entityId)).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-xs"><b>{item.action}</b><p className="mt-1 text-slate-500">{item.detail}</p><span className="mt-1 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</span></div>)}{workflowDb.audit.length === 0 && <p className="text-xs text-slate-400">Chưa có lịch sử thao tác.</p>}</div></section>
      </div>}

      <TaskFormModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} onSubmitSuccess={saveTask} initialTask={editingTask} defaultProjectId={String(project.id)} />
      <ProjectFormModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} initialProject={project} canChangeLeader={currentUser.role === 'ADMIN'} onSubmitSuccess={async (data: ProjectEditData) => { const updated = await projectApi.updateProject(project.id, data); Object.assign(project, updated); setProjectVersion((value) => value + 1); setWorkflowNotice('Đã cập nhật dự án.'); }} />
      <TaskDetailDrawer task={detailTask} canEdit={isProjectOperator} onClose={() => setDetailTask(null)} onChanged={loadTasks}
        onEdit={(task) => { setDetailTask(null); setEditingTask(task); setTaskModalOpen(true); }}/>
      {membersModalOpen && <ProjectMembersModal project={project} onClose={() => { setMembersModalOpen(false); void loadMembers(); }} />}
    </div>
  );
};
