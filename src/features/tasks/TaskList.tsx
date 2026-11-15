import React, { useMemo, useState } from 'react';
import { useFilterStore } from '../../store/filter.store';
import { useAuthStore } from '../../store/auth.store';
import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, useReassignTask } from '../../hooks/useTasks';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/SkeletonTable';
import { Eye, Plus, UserCheck, Edit2, Trash2, Search, SlidersHorizontal } from 'lucide-react';
import { Task } from '../../types';
import { TaskFormModal } from './TaskFormModal';
import { ReassignTaskModal } from './ReassignTaskModal';
import { TaskFormData } from '../../schema/task.schema';
import { TaskWorkflowPanel } from './TaskWorkflowPanel';
import { mockCoreApi } from '../../mocks/mockApi';

export const TaskList: React.FC = () => {
  const { filters } = useFilterStore();
  const { currentUser } = useAuthStore();
  const taskFilters = useMemo(() => filters, [filters]);
  const { tasks, isLoading, refetch } = useGetTasks(taskFilters);
  const { createTask } = useCreateTask();
  const { updateTask } = useUpdateTask();
  const { deleteTask } = useDeleteTask();
  const { reassignTask } = useReassignTask();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reassigningTask, setReassigningTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [projectId, setProjectId] = useState('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const database = mockCoreApi.snapshot();

  const handleOpenCreate = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (data: TaskFormData, isEditing: boolean) => {
    if (isEditing && editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await createTask(data);
    }
    await refetch();
  };

  const handleDeleteTask = async (taskId: number | string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
      await deleteTask(taskId);
      refetch();
    }
  };

  const handleReassign = async (taskId: number | string, newAssigneeId: string) => {
    await reassignTask({
      taskId: String(taskId),
      newAssigneeId,
      reason: 'Điều chuyển phân công theo chỉ đạo quản trị',
    });
    refetch();
  };

  const isProjectOperator = (task: Task) => {
    const projectId = Number(task.projectId ?? task.project_id);
    const project = database.projects.find((item) => item.id === projectId);
    return project?.leaderId === Number(currentUser.id)
      || database.projectMemberships.some((item) => Number(item.projectId) === projectId && Number(item.userId) === Number(currentUser.id) && item.projectRole === 'PROJECT_MANAGER' && !item.leftAt);
  };
  const getProgress = (task: Task) => task.progressPercent ?? task.progress_percent ?? 0;
  const isEmployee = currentUser.role === 'EMPLOYEE';
  const hasAnyAction = true;
  const projects = [...new Map(tasks.map((task) => [String(task.projectId), { id: String(task.projectId), name: task.projectName || 'Dự án' }])).values()];
  const visibleTasks = tasks.filter((task) => `${task.title} ${task.assigneeName || ''} ${task.projectName || ''}`.toLowerCase().includes(search.toLowerCase()))
    .filter((task) => status === 'ALL' || task.status === status)
    .filter((task) => priority === 'ALL' || task.priority === priority)
    .filter((task) => projectId === 'ALL' || String(task.projectId) === projectId)
    .filter((task) => !onlyOverdue || (task.overdueDays || 0) > 0);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{isEmployee ? 'Công việc của tôi' : 'Bảng công việc'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Trạng thái và tiến độ lấy từ checklist/review; mở chi tiết để thao tác đúng workflow.</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.role === 'MANAGER' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Giao việc mới
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,auto)]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm công việc, dự án, assignee..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400"/></label>
        <select aria-label="Lọc trạng thái" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="ALL">Mọi trạng thái</option><option value="TODO">TODO</option><option value="IN_PROGRESS">Đang làm</option><option value="REVIEW">Chờ duyệt</option><option value="DONE">Hoàn thành</option></select>
        <select aria-label="Lọc ưu tiên" value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="ALL">Mọi ưu tiên</option><option value="URGENT">Khẩn cấp</option><option value="HIGH">Cao</option><option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option></select>
        <select aria-label="Lọc dự án" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"><option value="ALL">Mọi dự án</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)}/><SlidersHorizontal className="h-3.5 w-3.5"/>Chỉ quá hạn</label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Đang hiển thị', visibleTasks.length, 'bg-slate-50 text-slate-800'],
          ['Đang thực hiện', visibleTasks.filter((task) => task.status === 'IN_PROGRESS').length, 'bg-blue-50 text-blue-600'],
          ['Chờ duyệt', visibleTasks.filter((task) => task.status === 'REVIEW').length, 'bg-violet-50 text-violet-600'],
          ['Quá hạn', visibleTasks.filter((task) => (task.overdueDays || 0) > 0).length, 'bg-red-50 text-red-600'],
        ].map(([label, value, style]) => (
          <div key={String(label)} className={`rounded-2xl p-3 ${style}`}>
            <div className="text-xl font-bold">{value as number}</div>
            <div className="text-[11px] text-slate-500 mt-1">{String(label)}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2 rounded-2xl border border-slate-100">
        <span className="text-xs font-semibold text-blue-600">
          {visibleTasks.length} việc
        </span>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[10px]">Tất cả kết quả</span>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          title={isEmployee ? 'Bạn chưa được giao công việc nào' : 'Không tìm thấy công việc'}
          description={isEmployee ? 'Các công việc được giao cho bạn sẽ xuất hiện tại đây.' : 'Vui lòng thử điều chỉnh lại bộ lọc.'}
          actionText={currentUser.role === 'MANAGER' ? 'Giao việc mới' : undefined}
          onAction={currentUser.role === 'MANAGER' ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="pb-3 font-semibold">Công việc</th>
                <th className="pb-3 font-semibold">Dự án</th>
                <th className="pb-3 font-semibold">Phụ trách (Assignee)</th>
                <th className="pb-3 font-semibold">Bộ phận</th>
                <th className="pb-3 font-semibold">Trạng thái</th>
                <th className="pb-3 font-semibold min-w-32">Tiến độ</th>
                <th className="pb-3 font-semibold">Ưu tiên</th>
                <th className="pb-3 font-semibold">Hạn chót</th>
                {hasAnyAction && <th className="pb-3 font-semibold text-center w-28">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition group">
                  <td className="py-3 pr-3">
                    <div className="font-bold text-slate-800">{t.title}</div>
                    <div className="text-[11px] text-slate-400">{t.description}</div>
                  </td>
                  <td className="py-3 pr-3 text-slate-600 font-medium">{t.projectName}</td>
                  <td className="py-3 pr-3 font-semibold text-slate-700">{t.assigneeName}</td>
                  <td className="py-3 pr-3 text-slate-500">{t.departmentName}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-3 pr-3">
                    <button type="button" onClick={() => setDetailTask(t)} className="min-w-28 text-left group" aria-label={`Mở workflow ${t.title}`}><div className="mb-1 flex items-center justify-between text-[10px]"><span className="text-slate-400 group-hover:text-blue-600">Checklist</span><span className="font-bold text-slate-700">{getProgress(t)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${getProgress(t)}%` }} /></div></button>
                  </td>
                  <td className="py-3 pr-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="py-3 text-slate-500 whitespace-nowrap">{t.deadline || t.dueDate}</td>
                  {hasAnyAction && (
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button type="button" onClick={() => setDetailTask(t)} title="Checklist, follower và review" className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                        {isProjectOperator(t) && t.status !== 'DONE' && t.status !== 'REVIEW' && (
                          <button
                            onClick={() => handleOpenEdit(t)}
                            title="Chỉnh sửa công việc"
                            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-blue-600 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isProjectOperator(t) && t.status !== 'DONE' && t.status !== 'REVIEW' && (
                          <button
                            onClick={() => setReassigningTask(t)}
                            title="Đổi người phụ trách chính"
                            className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isProjectOperator(t) && t.status !== 'DONE' && (
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            title="Xóa công việc (Admin/Manager)"
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmitSuccess={handleSaveTask}
        initialTask={editingTask}
      />

      <ReassignTaskModal
        isOpen={!!reassigningTask}
        task={reassigningTask}
        onClose={() => setReassigningTask(null)}
        onReassignSuccess={handleReassign}
      />

      {detailTask && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDetailTask(null)}><div onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-3 flex justify-end"><button onClick={() => setDetailTask(null)} className="text-xl text-slate-400" aria-label="Đóng">×</button></div><TaskWorkflowPanel taskId={detailTask.id} onChanged={refetch} /></div></div>}
    </div>
  );
};
