import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, FileCheck2, MessageSquare, Paperclip, Play, Plus, ThumbsDown, ThumbsUp, Trash2, Users } from 'lucide-react';
import { mockCoreApi } from '../../mocks/mockApi';
import { useAuthStore } from '../../store/auth.store';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';

interface TaskWorkflowPanelProps {
  taskId: number | string;
  onChanged?: () => void | Promise<void>;
}

export const TaskWorkflowPanel: React.FC<TaskWorkflowPanelProps> = ({ taskId, onChanged }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [database, setDatabase] = useState(() => mockCoreApi.snapshot());
  const [comment, setComment] = useState('');
  const [fileName, setFileName] = useState('minh-chung.pdf');
  const [reason, setReason] = useState('Cần bổ sung nội dung theo yêu cầu review.');
  const [checklistTitle, setChecklistTitle] = useState('');
  const [followerUserId, setFollowerUserId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    setDatabase(mockCoreApi.snapshot());
    await onChanged?.();
  };

  useEffect(() => {
    const listener = () => setDatabase(mockCoreApi.snapshot());
    window.addEventListener('hrm-mock-updated', listener);
    return () => window.removeEventListener('hrm-mock-updated', listener);
  }, []);

  const task = database.tasks.find((item) => item.id === Number(taskId) && !item.deletedAt);
  if (!task) return <div className="p-5 text-sm text-slate-500">Không tìm thấy Task.</div>;
  const project = database.projects.find((item) => item.id === task.projectId && !item.deletedAt);
  if (!project) return <div className="p-5 text-sm text-slate-500">Không tìm thấy dự án.</div>;

  const membership = database.projectMemberships.find((item) => Number(item.projectId) === project.id && Number(item.userId) === Number(currentUser.id) && !item.leftAt);
  const isLeader = project.leaderId === Number(currentUser.id);
  const isOperator = isLeader || membership?.projectRole === 'PROJECT_MANAGER';
  const isAssignee = task.assigneeId === Number(currentUser.id);
  const followers = database.followers.filter((item) => Number(item.taskId) === task.id && !item.leftAt);
  const isFollower = followers.some((item) => Number(item.userId) === Number(currentUser.id));
  const checklist = database.checklistItems.filter((item) => Number(item.taskId) === task.id && !item.deletedAt);
  const evidence = database.evidence.filter((item) => Number(item.taskId) === task.id);
  const comments = database.comments.filter((item) => Number(item.taskId) === task.id);
  const reviews = database.reviewSubmissions.filter((item) => Number(item.taskId) === task.id).slice().reverse();
  const percent = checklist.length ? Math.round(checklist.filter((item) => item.completed).length / checklist.length * 100) : 100;
  const canEditStructure = isOperator && (task.status === 'TODO' || task.status === 'IN_PROGRESS');
  const projectMembers = database.projectMemberships.filter((item) => Number(item.projectId) === project.id && !item.leftAt)
    .map((item) => database.users.find((user) => user.id === Number(item.userId)))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
  const availableFollowers = projectMembers.filter((user) => !followers.some((item) => Number(item.userId) === user.id));
  const userName = (id: number | string | null) => database.users.find((item) => item.id === Number(id))?.fullName || '-';

  const run = async (success: string, action: () => unknown) => {
    setError(''); setNotice('');
    try { action(); await refresh(); setNotice(success); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Thao tác thất bại.'); }
  };

  return <div className="space-y-4">
    {(notice || error) && <div role="status" className={`rounded-xl border px-3 py-2 text-xs ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-base font-bold text-slate-800">{task.title}</h3><p className="mt-1 text-xs text-slate-500">{project.name} · Assignee: {userName(task.assigneeId)}</p></div>
      <div className="flex gap-2"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></div>
    </div>
    <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{task.description || 'Không có mô tả.'}</p>
    <div className="flex flex-wrap gap-2">
      {isAssignee && task.status === 'TODO' && <button onClick={() => void run('Task đã bắt đầu.', () => mockCoreApi.startTask(task.id))} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Play className="h-4 w-4" />Bắt đầu</button>}
      {isAssignee && task.status === 'IN_PROGRESS' && percent === 100 && <button onClick={() => void run('Đã gửi REVIEW.', () => mockCoreApi.submitReview(task.id))} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4" />Gửi REVIEW</button>}
      {isOperator && !isAssignee && currentUser.role !== 'ADMIN' && task.status === 'REVIEW' && <>
        <button onClick={() => void run('Task đã được duyệt DONE.', () => mockCoreApi.decideReview(task.id, 'APPROVED', ''))} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><ThumbsUp className="h-4 w-4" />Duyệt DONE</button>
        <button onClick={() => void run('Task đã trả về IN_PROGRESS.', () => mockCoreApi.decideReview(task.id, 'REJECTED', reason))} className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><ThumbsDown className="h-4 w-4" />Từ chối</button>
      </>}
    </div>
    {isOperator && task.status === 'REVIEW' && <input value={reason} onChange={(event) => setReason(event.target.value)} aria-label="Lý do từ chối" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />}

    <section className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between"><h4 className="text-xs font-bold text-slate-700">Checklist</h4><b className="text-sm text-blue-700">{percent}%</b></div>
      {canEditStructure && <div className="mt-2 flex gap-2"><input value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} placeholder="Thêm checklist item" className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs" /><button disabled={!checklistTitle.trim()} onClick={() => void run('Đã thêm checklist.', () => { mockCoreApi.addChecklistItem(task.id, checklistTitle); setChecklistTitle(''); })} className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 text-xs font-bold text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Thêm</button></div>}
      <div className="mt-2 space-y-2">{checklist.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><button disabled={!isFollower || task.status !== 'IN_PROGRESS'} onClick={() => void run('Đã cập nhật checklist.', () => mockCoreApi.toggleChecklist(item.id))} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs disabled:opacity-50">{item.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}<span className={item.completed ? 'line-through text-slate-400' : 'text-slate-700'}>{item.title}</span></button>{canEditStructure && <button title="Xóa checklist nhưng giữ lịch sử" onClick={() => void run('Đã xóa checklist và giữ lịch sử.', () => mockCoreApi.removeChecklistItem(item.id))} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}</div>
    </section>

    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" /><h4 className="text-xs font-bold">Follower</h4></div>{canEditStructure && availableFollowers.length > 0 && <div className="mt-2 flex gap-2"><select value={followerUserId} onChange={(event) => setFollowerUserId(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs"><option value="">Chọn thành viên</option>{availableFollowers.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select><button disabled={!followerUserId} onClick={() => void run('Đã thêm Follower.', () => { mockCoreApi.addFollower(task.id, Number(followerUserId)); setFollowerUserId(''); })} className="rounded-lg bg-blue-600 px-2 text-xs font-bold text-white disabled:opacity-40">Thêm</button></div>}<div className="mt-2 flex flex-wrap gap-1.5">{followers.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{userName(item.userId)}{Number(item.userId) === task.assigneeId ? ' · Assignee' : ''}{canEditStructure && Number(item.userId) !== task.assigneeId && <button title="Xóa Follower" onClick={() => void run('Đã xóa Follower.', () => mockCoreApi.removeFollower(task.id, Number(item.userId)))} className="rounded-full p-0.5 hover:bg-red-100 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>}</span>)}</div></section>
      <section className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-blue-600" /><h4 className="text-xs font-bold">Minh chứng</h4></div><div className="mt-2 flex gap-2"><input value={fileName} onChange={(event) => setFileName(event.target.value)} disabled={!isFollower || task.status !== 'IN_PROGRESS'} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs" /><button disabled={!isFollower || task.status !== 'IN_PROGRESS'} onClick={() => void run('Đã thêm minh chứng.', () => mockCoreApi.addEvidence(task.id, fileName))} className="rounded-lg bg-blue-600 px-2 text-xs font-bold text-white disabled:opacity-40">Thêm</button></div><div className="mt-2 text-[10px] text-slate-500">{evidence.map((item) => item.fileName).join(', ') || 'Chưa có minh chứng'}</div></section>
    </div>

    <section className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-600" /><h4 className="text-xs font-bold">Bình luận</h4></div><div className="mt-2 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} disabled={!membership} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs" placeholder="Nội dung bình luận" /><button disabled={!comment.trim() || !membership} onClick={() => void run('Đã gửi bình luận.', () => { mockCoreApi.addComment(task.id, comment); setComment(''); })} className="rounded-lg bg-slate-800 px-3 text-xs font-bold text-white disabled:opacity-40">Gửi</button></div><div className="mt-2 max-h-28 space-y-1 overflow-y-auto">{comments.slice().reverse().map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-2 text-[10px]"><b>{userName(item.authorId)}</b>: {item.content}</div>)}</div></section>
    {reviews.length > 0 && <section className="rounded-2xl border border-slate-100 p-4"><h4 className="text-xs font-bold">Lịch sử REVIEW</h4><div className="mt-2 space-y-1">{reviews.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-2 text-[10px] text-slate-600"><b>{item.decision}</b> · snapshot {item.checklistSnapshot.length} checklist/{item.evidenceSnapshot.length} minh chứng{item.reason ? ` · ${item.reason}` : ''}</div>)}</div></section>}
    {task.status === 'DONE' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">Task DONE là trạng thái kết thúc: không thể mở lại, sửa hoặc xóa.</div>}
  </div>;
};
