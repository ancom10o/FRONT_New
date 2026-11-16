import React, { useEffect, useState } from 'react';
import { FileCheck2, MessageSquare, Play, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Task } from '../../types';
import { taskApi } from '../../services/api/task.api';
import { taskCommentApi, TaskComment } from '../../services/api/task-comment.api';
import { projectMemberApi, ProjectMember } from '../../services/api/project-member.api';
import { attachmentApi, TaskAttachment } from '../../services/api/attachment.api';
import { activityLogApi, ActivityLog } from '../../services/api/activity-log.api';

interface Props { taskId: number | string; taskData?: Task; onChanged?: () => void | Promise<void>; }

export const TaskWorkflowPanel: React.FC<Props> = ({ taskId, taskData, onChanged }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [task, setTask] = useState<Task | undefined>(taskData);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [followerUserId, setFollowerUserId] = useState('');
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);

  const load = async () => {
    try {
      const [commentsData, attachmentsData, activitiesData, taskDataList] = await Promise.all([
        taskCommentApi.getComments(taskId),
        attachmentApi.getForTask(taskId),
        activityLogApi.getForTask(taskId),
        taskData ? Promise.resolve([taskData]) : taskApi.getTasks({ projectId: 'ALL' }),
      ]);
      setComments(commentsData);
      setAttachments(attachmentsData);
      setActivities(activitiesData);
      const found = taskDataList.find((item) => String(item.id) === String(taskId));
      if (found) {
        setTask(found);
        if (found.projectId) setMembers(await projectMemberApi.getMembers(found.projectId));
      }
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không tải được dữ liệu công việc.'); }
  };
  useEffect(() => { void load(); }, [taskId]);
  useEffect(() => { if (taskData) setTask(taskData); }, [taskData]);
  if (!task) return <div className="p-5 text-sm text-slate-500">Đang tải thông tin công việc...</div>;

  const assigneeId = Number(task.assigneeId ?? task.assignee_id);
  const followerIds = (task.followerIds ?? task.follower_ids ?? []).map(Number);
  const isAssignee = assigneeId === Number(currentUser.id);
  const isAdmin = currentUser.role === 'ADMIN';
  const canManage = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
  const canAct = isAssignee || isAdmin;
  const run = async (success: string, action: () => Promise<void>) => { setError(''); setNotice(''); try { await action(); await load(); await onChanged?.(); setNotice(success); } catch (exception) { setError(exception instanceof Error ? exception.message : 'Thao tác thất bại.'); } };
  const changeStatus = (status: 'IN_PROGRESS' | 'REVIEW' | 'DONE') => run('Đã cập nhật trạng thái công việc.', async () => { setTask(await taskApi.updateTaskStatus(task.id, status)); });
  const rejectTask = () => run('Đã từ chối công việc và lưu lý do.', async () => { if (!rejectionNote.trim()) throw new Error('Vui lòng nhập lý do từ chối.'); setTask(await taskApi.updateTaskStatus(task.id, 'IN_PROGRESS', rejectionNote)); setRejectionNote(''); });
  const addFollower = () => run('Đã thêm người theo dõi.', async () => { if (!followerUserId) return; setTask(await taskApi.addFollower(task.id, followerUserId)); setFollowerUserId(''); });
  const removeFollower = (userId: number) => run('Đã bỏ người theo dõi.', async () => { setTask(await taskApi.removeFollower(task.id, userId)); });
  const addComment = () => run('Đã gửi bình luận.', async () => { if (!comment.trim()) return; const added = await taskCommentApi.addComment(task.id, comment.trim()); setComments((items) => [...items, added]); setComment(''); });
  const uploadAttachment = (file: File) => run('Đã đính kèm kết quả.', async () => { const uploaded = await attachmentApi.uploadForTask(task.id, file); setAttachments((items) => [...items, uploaded]); });
  const openAttachment = async (attachment: TaskAttachment, download = false) => {
    try {
      setError('');
      const blob = await attachmentApi.download(attachment.id);
      const url = URL.createObjectURL(blob);
      if (download) { const link = document.createElement('a'); link.href = url; link.download = attachment.fileName; link.click(); } else window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thể mở tệp.'); }
  };
  const deleteAttachment = (attachment: TaskAttachment) => run('Đã xóa tệp đính kèm.', async () => {
    if (!window.confirm(`Xóa tệp "${attachment.fileName}"?`)) return;
    await attachmentApi.delete(attachment.id);
    setAttachments((items) => items.filter((item) => item.id !== attachment.id));
  });
  const userName = (id: number) => members.find((member) => Number(member.userId) === id)?.fullName || `User ${id}`;
  const activityLabel = (item: ActivityLog) => {
    if (item.action === 'STATUS_CHANGED' && /REVIEW/i.test(item.oldValue || '') && /IN_PROGRESS/i.test(item.newValue || '')) return 'Từ chối công việc';
    return ({ CREATED: 'Được giao/tạo công việc', STATUS_CHANGED: 'Cập nhật trạng thái', ASSIGNEE_CHANGED: 'Thay đổi người phụ trách', DEADLINE_CHANGED: 'Thay đổi hạn chót', PRIORITY_CHANGED: 'Thay đổi độ ưu tiên', COMMENT_ADDED: 'Thêm bình luận', ATTACHMENT_UPLOADED: 'Đính kèm kết quả', ATTACHMENT_DELETED: 'Xóa tệp đính kèm' }[item.action] || item.action);
  };
  const formatActivityValue = (value?: string) => {
    if (!value) return '';
    let text = value
      .replace(/\bIN_PROGRESS\b/g, 'Đang thực hiện')
      .replace(/\bREVIEW\b/g, 'Chờ duyệt')
      .replace(/\bCOMPLETED\b|\bDONE\b/g, 'Đã hoàn thành')
      .replace(/\bTODO\b/g, 'Cần làm')
      .replace(/Task created with status /i, 'Trạng thái ban đầu: ')
      .replace(/Uploaded file:\s*/i, 'Tệp: ')
      .replace(/added a comment/i, 'đã thêm bình luận')
      .replace(/\bHIGH\b/g, 'Cao').replace(/\bMEDIUM\b/g, 'Trung bình').replace(/\bLOW\b/g, 'Thấp').replace(/\bURGENT\b/g, 'Khẩn cấp');
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) text = new Date(text).toLocaleDateString('vi-VN');
    return text;
  };
  const extractRejectionNote = (value?: string) => {
    const match = value?.match(/\(([^)]+)\)\s*$/);
    return match ? match[1] : '';
  };

  return <div className="space-y-4">
    {(notice || error) && <div role="status" className={`rounded-xl border px-3 py-2 text-xs ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-800">{task.title}</h3><p className="mt-1 text-xs text-slate-500">{task.projectName || 'Dự án'} · Người phụ trách: {task.assigneeName || 'Chưa phân công'}</p></div><div className="flex gap-2"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></div></div>
    <div className="rounded-xl bg-slate-50 p-3"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kết quả đầu ra</p><p className="text-xs leading-5 text-slate-600">{task.description || 'Chưa có kết quả đầu ra.'}</p></div>
    <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-slate-100 p-3 text-xs"><span className="block text-[10px] text-slate-400">Ngày bắt đầu</span><b>{task.startDate || task.start_date ? String(task.startDate || task.start_date).slice(0, 10) : 'Chưa cập nhật'}</b></div><div className="rounded-xl border border-slate-100 p-3 text-xs"><span className="block text-[10px] text-slate-400">Hạn chót</span><b>{task.deadline || task.dueDate ? String(task.deadline || task.dueDate).slice(0, 10) : 'Chưa cập nhật'}</b></div><div className="rounded-xl border border-slate-100 p-3 text-xs"><span className="block text-[10px] text-slate-400">Người tạo</span><b>{task.createdByName || 'Chưa cập nhật'}</b></div><div className="rounded-xl border border-slate-100 p-3 text-xs"><span className="block text-[10px] text-slate-400">Công việc phụ thuộc</span><b>{task.dependencyTitles?.length ? task.dependencyTitles.join(', ') : 'Không có'}</b></div></div>
    <div className="flex flex-wrap gap-2">{canAct && task.status === 'TODO' && <button onClick={() => void changeStatus('IN_PROGRESS')} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Play className="h-4 w-4" />Bắt đầu</button>}{canAct && task.status === 'IN_PROGRESS' && <button onClick={() => void changeStatus('REVIEW')} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4" />Gửi duyệt</button>}{canManage && task.status === 'REVIEW' && <><button onClick={() => void changeStatus('DONE')} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><ThumbsUp className="h-4 w-4" />Duyệt hoàn thành</button><button onClick={() => setRejectionNote((value) => value || ' ')} className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><ThumbsDown className="h-4 w-4" />Từ chối</button></>}</div>
    {canManage && task.status === 'REVIEW' && rejectionNote !== '' && <div className="rounded-xl border border-red-100 bg-red-50 p-3"><label className="mb-1 block text-[11px] font-semibold text-red-800">Lý do từ chối <span className="text-red-500">*</span></label><textarea autoFocus value={rejectionNote.trim() === '' ? '' : rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} rows={3} placeholder="Nhập nội dung cần bổ sung hoặc lý do từ chối..." className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs"/><button disabled={!rejectionNote.trim()} onClick={() => void rejectTask()} className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Xác nhận từ chối</button></div>}
    {task.statusNote && <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800"><b>Ghi chú trạng thái:</b> {task.statusNote}</div>}
    <section className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" /><h4 className="text-xs font-bold">Người theo dõi</h4></div>{canManage && <div className="mt-2 flex gap-2"><select value={followerUserId} onChange={(event) => setFollowerUserId(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs"><option value="">Chọn thành viên</option>{members.filter((member) => !followerIds.includes(Number(member.userId))).map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select><button disabled={!followerUserId} onClick={() => void addFollower()} className="rounded-lg bg-blue-600 px-2 text-xs font-bold text-white disabled:opacity-40">Thêm</button></div>}<div className="mt-2 flex flex-wrap gap-1.5">{followerIds.map((id) => <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{userName(id)}{canManage && <button onClick={() => void removeFollower(id)} className="text-red-500">×</button>}</span>)}{!followerIds.length && <span className="text-[10px] text-slate-400">Chưa có người theo dõi.</span>}</div></section>
    <section className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-600" /><h4 className="text-xs font-bold">Bình luận</h4></div><div className="mt-2 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs" placeholder="Nội dung bình luận" /><button disabled={!comment.trim()} onClick={() => void addComment()} className="rounded-lg bg-slate-800 px-3 text-xs font-bold text-white disabled:opacity-40">Gửi</button></div><div className="mt-2 max-h-36 space-y-1 overflow-y-auto">{comments.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-2 text-[10px]"><div className="flex items-center justify-between gap-2"><b>{item.userName || `User ${item.userId || ''}`}</b>{item.createdAt && <time className="text-[9px] font-normal text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</time>}</div><p className="mt-1 text-slate-600">{item.content}</p></div>)}{!comments.length && <p className="text-[10px] text-slate-400">Chưa có bình luận.</p>}</div></section>
    <section className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-bold">Kết quả đính kèm</h4><label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white">Thêm tệp<input type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file); event.currentTarget.value = ''; }} /></label></div><div className="mt-2 space-y-1">{attachments.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-[10px]"><button type="button" onClick={() => void openAttachment(item)} className="min-w-0 flex-1 truncate text-left font-semibold text-blue-700 hover:underline" title="Mở tệp">{item.fileName}</button><span className="shrink-0 text-slate-400">{item.uploadedByName || ''}</span><button type="button" onClick={() => void openAttachment(item, true)} className="shrink-0 rounded-md px-2 py-1 font-semibold text-slate-600 hover:bg-slate-200">Tải xuống</button><button type="button" onClick={() => void deleteAttachment(item)} className="shrink-0 rounded-md px-2 py-1 font-semibold text-red-600 hover:bg-red-50">Xóa</button></div>)}{!attachments.length && <p className="text-[10px] text-slate-400">Chưa có kết quả đính kèm.</p>}</div></section>
    <p className="text-[10px] text-slate-400">Checklist, minh chứng và lịch sử duyệt sẽ hiển thị khi backend cung cấp API tương ứng.</p>
    <section className="rounded-2xl border border-slate-100"><button type="button" onClick={() => setActivityOpen((open) => !open)} className="flex w-full items-center justify-between p-4 text-left"><span><b className="text-xs font-bold">Lịch sử hoạt động</b><span className="ml-2 text-[10px] text-slate-400">{activities.length} hoạt động</span></span><span className="text-xs font-bold text-blue-600">{activityOpen ? 'Thu gọn ↑' : 'Xem lịch sử ↓'}</span></button>{activityOpen && <div className="space-y-2 border-t border-slate-100 p-4">{activities.map((item) => { const rejected = activityLabel(item) === 'Từ chối công việc'; const note = extractRejectionNote(item.newValue); return <div key={item.id} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-[10px]"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${rejected ? 'bg-red-500' : 'bg-blue-500'}`}/><div className="min-w-0 flex-1"><b className={rejected ? 'text-red-700' : 'text-slate-700'}>{activityLabel(item)}</b><p className="mt-0.5 text-slate-500">{item.performedByName || 'Người dùng'}{rejected ? ' · Đang thực hiện' : item.newValue ? ` · ${formatActivityValue(item.newValue)}` : ''}</p>{rejected && note && <p className="mt-1 font-semibold text-red-700">Note: {note}</p>}</div><time className="shrink-0 text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}</time></div>; })}{!activities.length && <p className="text-[10px] text-slate-400">Chưa có lịch sử hoạt động.</p>}</div>}</section>
  </div>;
};
