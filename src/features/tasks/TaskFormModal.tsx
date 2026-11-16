import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2, X } from 'lucide-react';
import { taskSchema, TaskFormData } from '../../schema/task.schema';
import { Project, Task } from '../../types';
import { projectApi } from '../../services/api/project.api';
import { projectMemberApi, ProjectMember } from '../../services/api/project-member.api';

interface Props { isOpen: boolean; onClose: () => void; onSubmitSuccess: (data: TaskFormData, isEditing: boolean) => Promise<void> | void; initialTask?: Task | null; defaultProjectId?: string; }
const today = () => new Date().toISOString().slice(0, 10);

export const TaskFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmitSuccess, initialTask, defaultProjectId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', projectId: defaultProjectId || '', assigneeId: '', followerIds: [], dependencyIds: [], priority: 'MEDIUM', startDate: today(), dueDate: today() },
  });
  useEffect(() => { if (isOpen) projectApi.getProjects().then(setProjects).catch((e) => setLoadError(e instanceof Error ? e.message : 'Không tải được dự án.')); }, [isOpen]);
  useEffect(() => {
    reset(initialTask ? {
      title: initialTask.title, description: initialTask.description || '', projectId: String(initialTask.projectId ?? initialTask.project_id),
      assigneeId: (initialTask.assigneeId ?? initialTask.assignee_id) ? String(initialTask.assigneeId ?? initialTask.assignee_id) : '',
      followerIds: (initialTask.followerIds ?? initialTask.follower_ids ?? []).map(String), dependencyIds: (initialTask.dependencyIds ?? []).map(String),
      priority: initialTask.priority, startDate: String(initialTask.startDate ?? initialTask.start_date ?? '').slice(0, 10), dueDate: String(initialTask.dueDate ?? initialTask.deadline ?? '').slice(0, 10),
    } : { title: '', description: '', projectId: defaultProjectId || '', assigneeId: '', followerIds: [], dependencyIds: [], priority: 'MEDIUM', startDate: today(), dueDate: today() });
  }, [initialTask, defaultProjectId, isOpen, reset]);
  const projectId = watch('projectId');
  useEffect(() => {
    if (!projectId) { setMembers([]); return; }
    setLoadError('');
    projectMemberApi.getMembers(projectId).then((m) => {
      setMembers(m);
    }).catch((e) => setLoadError(e instanceof Error ? e.message : 'Không tải được dữ liệu dự án.'));
  }, [projectId, initialTask?.id]);
  if (!isOpen) return null;
  const submit = async (data: TaskFormData) => { setSubmitError(''); try { await onSubmitSuccess(data, !!initialTask); onClose(); } catch (e) { setSubmitError(e instanceof Error ? e.message : 'Không thể lưu công việc.'); } };
  const lockedProject = !!initialTask || !!defaultProjectId;
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
    <div className="my-8 w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4"><div><h3 className="text-base font-bold text-slate-900">{initialTask ? 'Chỉnh sửa công việc' : 'Tạo công việc'}</h3><p className="mt-1 text-xs text-slate-500">Chọn người phụ trách chính cho công việc.</p></div><button type="button" aria-label="Đóng" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button></div>
      <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-5">
        {(loadError || submitError) && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError || loadError}</div>}
        {!initialTask && <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800"><Info className="h-4 w-4 shrink-0"/>Công việc mới luôn ở trạng thái TODO. Trạng thái chỉ thay đổi bằng hành động workflow.</div>}
        <div><label className="mb-1 block text-xs font-semibold text-slate-700">Tiêu đề <span className="text-red-500">*</span></label><input {...register('title')} maxLength={150} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Kết quả công việc cần hoàn thành"/>{errors.title && <p className="mt-1 text-[11px] text-red-600">{errors.title.message}</p>}</div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-slate-700">Dự án <span className="text-red-500">*</span></label><select {...register('projectId')} disabled={lockedProject} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-60"><option value="">Chọn dự án</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{errors.projectId && <p className="mt-1 text-[11px] text-red-600">{errors.projectId.message}</p>}</div><div><label className="mb-1 block text-xs font-semibold text-slate-700">Ưu tiên <span className="text-red-500">*</span></label><select {...register('priority')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option></select></div></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-700">Mô tả <span className="font-normal text-slate-400">(tùy chọn)</span></label><textarea {...register('description')} maxLength={500} rows={3} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" placeholder="Phạm vi, đầu ra và tiêu chí nghiệm thu..."/>{errors.description && <p className="mt-1 text-[11px] text-red-600">{errors.description.message}</p>}</div>
        <div className="grid gap-4 sm:grid-cols-3"><div><label className="mb-1 block text-xs font-semibold text-slate-700">Người phụ trách</label><select {...register('assigneeId')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Chưa phân công</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.fullName} — {m.departmentName || 'Chưa có phòng ban'}</option>)}</select><p className="mt-1 text-[10px] text-slate-400">Có thể để trống khi TODO.</p></div><div><label className="mb-1 block text-xs font-semibold text-slate-700">Ngày bắt đầu <span className="text-red-500">*</span></label><input type="date" {...register('startDate')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"/>{errors.startDate && <p className="mt-1 text-[11px] text-red-600">{errors.startDate.message}</p>}</div><div><label className="mb-1 block text-xs font-semibold text-slate-700">Deadline <span className="text-red-500">*</span></label><input type="date" {...register('dueDate')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"/>{errors.dueDate && <p className="mt-1 text-[11px] text-red-600">{errors.dueDate.message}</p>}</div></div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Hủy</button><button disabled={isSubmitting || !!loadError} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin"/>}{initialTask ? 'Lưu thay đổi' : 'Tạo công việc'}</button></div>
      </form>
    </div>
  </div>;
};

