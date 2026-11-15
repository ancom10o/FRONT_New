import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Info, Loader2, UserRound, X } from 'lucide-react';
import { projectSchema, ProjectFormData } from '../../schema/project.schema';
import { Project, User } from '../../types';
import { userApi } from '../../services/api/user.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (data: ProjectFormData, isEditing: boolean) => Promise<void>;
  initialProject?: Project | null;
  presentation?: 'modal' | 'page';
  canChangeLeader?: boolean;
}
const today = () => new Date().toISOString().slice(0, 10);

export const ProjectFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmitSuccess, initialProject, presentation = 'modal', canChangeLeader = true }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const isPage = presentation === 'page';
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '', leaderId: '', startDate: today(), endDate: '' },
  });
  useEffect(() => {
    if (!isOpen) return;
    setLoadError('');
    userApi.getUsers().then(setUsers).catch((error) => setLoadError(error instanceof Error ? error.message : 'Không tải được danh sách Leader.'));
  }, [isOpen]);
  useEffect(() => {
    reset(initialProject ? {
      name: initialProject.name, description: initialProject.description || '',
      leaderId: String(initialProject.pmId ?? initialProject.leader_id ?? ''),
      startDate: String(initialProject.startDate ?? initialProject.start_date ?? '').slice(0, 10),
      endDate: String(initialProject.endDate ?? initialProject.end_date ?? '').slice(0, 10),
    } : { name: '', description: '', leaderId: '', startDate: today(), endDate: '' });
  }, [initialProject, reset, isOpen]);
  const leaders = useMemo(() => users.filter((user) => user.status === 'ACTIVE' && String(user.role ?? user.system_role).toUpperCase() === 'MANAGER'), [users]);
  if (!isOpen) return null;
  const submit = async (data: ProjectFormData) => {
    setSubmitError('');
    try { await onSubmitSuccess(data, !!initialProject); onClose(); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : 'Không thể lưu dự án.'); }
  };
  return <div className={isPage ? 'w-full' : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm'}>
    <div className={`w-full rounded-3xl border border-slate-100 bg-white shadow-2xl ${isPage ? 'p-5' : 'max-w-2xl p-6'}`}>
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div><h3 className="text-base font-bold text-slate-900">{initialProject ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}</h3><p className="mt-1 text-xs text-slate-500">Thông tin nghiệp vụ cốt lõi theo hợp đồng Project.</p></div>
        {!isPage && <button type="button" aria-label="Đóng" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
      </div>
      <form onSubmit={handleSubmit(submit)} className="space-y-5 pt-5">
        {(submitError || loadError) && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError || loadError}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mã dự án</span><strong className="mt-1 block text-xs text-slate-700">{initialProject?.projectCode || initialProject?.project_code || 'Tự động tạo khi lưu'}</strong></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Trạng thái</span><strong className="mt-1 block text-xs text-slate-700">{initialProject ? initialProject.status : 'PLANNING · Lập kế hoạch'}</strong></div>
        </div>
        {!initialProject && <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800"><Info className="mt-0.5 h-4 w-4 shrink-0"/><span>Mã dự án và trạng thái được hệ thống kiểm soát, không thể nhập hoặc chuyển tùy ý.</span></div>}
        <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Tên dự án <span className="text-red-500">*</span></label><input {...register('name')} maxLength={100} placeholder="Ví dụ: Nâng cấp cổng thông tin khách hàng" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />{errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name.message}</p>}</div>
        <div><div className="mb-1.5 flex justify-between"><label className="text-xs font-semibold text-slate-700">Mục tiêu và phạm vi</label><span className="text-[10px] text-slate-400">Tùy chọn · tối đa 300 ký tự</span></div><textarea {...register('description')} maxLength={300} rows={4} placeholder="Mô tả kết quả kỳ vọng, phạm vi và tiêu chí thành công..." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />{errors.description && <p className="mt-1 text-[11px] text-red-600">{errors.description.message}</p>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-slate-700"><UserRound className="mr-1 inline h-3.5 w-3.5"/>Project Leader <span className="text-red-500">*</span></label><select {...register('leaderId')} disabled={!!initialProject && !canChangeLeader} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"><option value="">Chọn MANAGER đang hoạt động</option>{leaders.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.full_name} · {user.email}</option>)}</select>{errors.leaderId && <p className="mt-1 text-[11px] text-red-600">{errors.leaderId.message}</p>}{initialProject && !canChangeLeader && <p className="mt-1 text-[10px] text-slate-400">Chỉ ADMIN được thay đổi Project Leader.</p>}</div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700"><CalendarDays className="mr-1 inline h-3.5 w-3.5"/>Ngày bắt đầu <span className="text-red-500">*</span></label><input type="date" {...register('startDate')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />{errors.startDate && <p className="mt-1 text-[11px] text-red-600">{errors.startDate.message}</p>}</div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700"><CalendarDays className="mr-1 inline h-3.5 w-3.5"/>Ngày kết thúc <span className="text-red-500">*</span></label><input type="date" {...register('endDate')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />{errors.endDate && <p className="mt-1 text-[11px] text-red-600">{errors.endDate.message}</p>}</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hủy</button><button disabled={isSubmitting || !!loadError} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin"/>}{initialProject ? 'Lưu thay đổi' : 'Tạo dự án'}</button></div>
      </form>
    </div>
  </div>;
};
