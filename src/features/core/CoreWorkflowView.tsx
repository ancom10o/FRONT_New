import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  FileCheck2,
  History,
  MessageSquare,
  Paperclip,
  Play,
  RefreshCcw,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { mockCoreApi, USE_MOCK_API } from '../../mocks/mockApi';
import { useAuthStore } from '../../store/auth.store';

const formatTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '-';

const statusStyle: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-violet-100 text-violet-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

export const CoreWorkflowView: React.FC = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [database, setDatabase] = useState(() => mockCoreApi.snapshot());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [evidenceName, setEvidenceName] = useState('bien-ban-kiem-thu.pdf');
  const [reason, setReason] = useState('Cần bổ sung minh chứng kiểm thử trường hợp lỗi.');

  const refresh = () => setDatabase(mockCoreApi.snapshot());
  useEffect(() => {
    const update = () => refresh();
    window.addEventListener('hrm-mock-updated', update);
    return () => window.removeEventListener('hrm-mock-updated', update);
  }, []);

  const project = database.projects.find((item) => !item.deletedAt);
  const task = database.tasks.find((item) => !item.deletedAt && item.projectId === project?.id);
  const membership = database.projectMemberships.find((item) => Number(item.projectId) === project?.id && Number(item.userId) === Number(currentUser.id) && !item.leftAt);
  const isLeader = project?.leaderId === Number(currentUser.id);
  const isProjectManager = membership?.projectRole === 'PROJECT_MANAGER';
  const isOperator = isLeader || isProjectManager;
  const isAssignee = task?.assigneeId === Number(currentUser.id);
  const isFollower = database.followers.some((item) => Number(item.taskId) === task?.id && Number(item.userId) === Number(currentUser.id) && !item.leftAt);
  const checklist = database.checklistItems.filter((item) => Number(item.taskId) === task?.id);
  const completedChecklist = checklist.filter((item) => item.completed).length;
  const checklistPercent = checklist.length ? Math.round(completedChecklist / checklist.length * 100) : 100;
  const evidence = database.evidence.filter((item) => Number(item.taskId) === task?.id);
  const comments = database.comments.filter((item) => Number(item.taskId) === task?.id);
  const reviews = database.reviewSubmissions.filter((item) => Number(item.taskId) === task?.id).slice().reverse();
  const completionRequests = database.completionRequests.filter((item) => Number(item.projectId) === project?.id).slice().reverse();
  const pendingCompletion = completionRequests.find((item) => item.status === 'PENDING');

  const userName = (id: number | string | null) => database.users.find((item) => item.id === Number(id))?.fullName || '-';
  const run = async (label: string, action: () => unknown | Promise<unknown>) => {
    setError('');
    setMessage('');
    try {
      await action();
      refresh();
      setMessage(label);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Thao tác không thành công.');
    }
  };

  const switchAccount = (email: string) => run('Đã chuyển tài khoản demo.', () => {
    const login = mockCoreApi.login(email, 'demo123');
    localStorage.setItem('accessToken', login.token);
    window.location.reload();
  });

  const activity = useMemo(() => database.audit.slice(0, 12), [database.audit]);

  if (!USE_MOCK_API || !project || !task) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Mock API chưa bật hoặc dữ liệu demo chưa sẵn sàng.</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-blue-800 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200"><ShieldCheck className="h-4 w-4" />Mock API · P0 end-to-end</div>
            <h1 className="mt-2 text-xl font-bold">Luồng nghiệp vụ lõi</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-100">Dữ liệu được lưu trong localStorage. Chuyển tài khoản để thực hiện đúng vai trò; mọi rule quan trọng vẫn được kiểm tra trong Mock API, không chỉ ẩn nút ở giao diện.</p>
          </div>
          <button type="button" onClick={() => run('Đã khôi phục dữ liệu demo ban đầu.', () => mockCoreApi.reset())} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><RefreshCcw className="h-4 w-4" />Reset demo</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {mockCoreApi.credentials.map((account) => (
            <button key={account.email} type="button" onClick={() => switchAccount(account.email)} className={`rounded-xl px-3 py-2 text-[11px] font-semibold transition ${currentUser.email === account.email ? 'bg-white text-blue-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {account.role}: {account.email}
            </button>
          ))}
        </div>
      </section>

      {(message || error) && <div role="status" className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{project.projectCode}</p><h2 className="mt-1 text-lg font-bold text-slate-800">{project.name}</h2><p className="mt-1 text-xs text-slate-500">Leader: {userName(project.leaderId)}</p></div>
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyle[project.status] || 'bg-slate-100 text-slate-700'}`}>{project.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Global role</span><strong className="mt-1 block text-slate-700">{currentUser.role}</strong></div>
              <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Project role</span><strong className="mt-1 block text-slate-700">{isLeader ? 'LEADER' : membership?.projectRole || 'NONE'}</strong></div>
              <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Thành viên</span><strong className="mt-1 block text-slate-700">{database.projectMemberships.filter((item) => Number(item.projectId) === project.id && !item.leftAt).length}</strong></div>
              <div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Yêu cầu hoàn thành</span><strong className="mt-1 block text-slate-700">{completionRequests[0]?.status || 'CHƯA CÓ'}</strong></div>
            </div>
            {isLeader && task.status === 'DONE' && project.status === 'ACTIVE' && !pendingCompletion && <button type="button" onClick={() => run('Đã gửi yêu cầu hoàn thành dự án.', () => mockCoreApi.requestProjectCompletion(project.id))} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"><Send className="h-4 w-4" />Gửi yêu cầu hoàn thành dự án</button>}
            {currentUser.role === 'ADMIN' && pendingCompletion && <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => run('Đã phê duyệt hoàn thành dự án.', () => mockCoreApi.decideProjectCompletion(project.id, 'APPROVED', ''))} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"><ThumbsUp className="h-4 w-4" />ADMIN phê duyệt</button><button type="button" onClick={() => run('Đã từ chối yêu cầu hoàn thành.', () => mockCoreApi.decideProjectCompletion(project.id, 'REJECTED', reason))} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white"><ThumbsDown className="h-4 w-4" />Từ chối</button></div>}
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Task #{task.id} · {task.priority}</p><h2 className="mt-1 text-base font-bold text-slate-800">{task.title}</h2><p className="mt-1 text-xs text-slate-500">Assignee: {userName(task.assigneeId)} · Deadline: {task.deadline}</p></div>
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyle[task.status]}`}>{task.status}</span>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{task.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {isAssignee && task.status === 'TODO' && <button type="button" onClick={() => run('Task đã chuyển sang IN_PROGRESS.', () => mockCoreApi.startTask(task.id))} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"><Play className="h-4 w-4" />Bắt đầu công việc</button>}
              {isAssignee && task.status === 'IN_PROGRESS' && checklistPercent === 100 && <button type="button" onClick={() => run('Đã gửi Task sang REVIEW.', () => mockCoreApi.submitReview(task.id))} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4" />Gửi REVIEW</button>}
              {isOperator && currentUser.role !== 'ADMIN' && !isAssignee && task.status === 'REVIEW' && <><button type="button" onClick={() => run('Task đã được phê duyệt DONE.', () => mockCoreApi.decideReview(task.id, 'APPROVED', ''))} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"><ThumbsUp className="h-4 w-4" />Phê duyệt DONE</button><button type="button" onClick={() => run('Task đã bị từ chối và trở lại IN_PROGRESS.', () => mockCoreApi.decideReview(task.id, 'REJECTED', reason))} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white"><ThumbsDown className="h-4 w-4" />Từ chối REVIEW</button></>}
            </div>

            {(isOperator || currentUser.role === 'ADMIN') && <label className="mt-4 block text-[11px] font-semibold text-slate-500">Lý do từ chối<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400" /></label>}
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-800">Checklist</h3><p className="mt-1 text-[11px] text-slate-400">Follower chỉ cập nhật khi IN_PROGRESS.</p></div><strong className="text-lg text-blue-700">{checklistPercent}%</strong></div>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => <button key={item.id} type="button" disabled={!isFollower || task.status !== 'IN_PROGRESS'} onClick={() => run('Đã cập nhật checklist.', () => mockCoreApi.toggleChecklist(item.id))} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60">{item.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}<span className={item.completed ? 'text-slate-500 line-through' : 'font-semibold text-slate-700'}>{item.title}</span><span className="ml-auto text-[10px] text-slate-400">{item.completed ? userName(item.completedBy) : ''}</span></button>)}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-bold text-slate-800">Task participants</h3></div>
            <div className="mt-3 flex flex-wrap gap-2">{database.followers.filter((item) => Number(item.taskId) === task.id && !item.leftAt).map((item) => <span key={item.id} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${Number(item.userId) === task.assigneeId ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600'}`}>{userName(item.userId)}{Number(item.userId) === task.assigneeId ? ' · Assignee' : ' · Follower'}</span>)}</div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-bold text-slate-800">Minh chứng ({evidence.length})</h3></div>
            <div className="mt-3 flex gap-2"><input value={evidenceName} onChange={(event) => setEvidenceName(event.target.value)} disabled={!isFollower || task.status !== 'IN_PROGRESS'} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs disabled:bg-slate-50" /><button type="button" disabled={!isFollower || task.status !== 'IN_PROGRESS'} onClick={() => run('Đã tải minh chứng mock.', () => mockCoreApi.addEvidence(task.id, evidenceName))} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Tải lên</button></div>
            <div className="mt-3 space-y-2">{evidence.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><strong>{item.fileName}</strong><span className="ml-2 text-slate-400">v{item.version} · {userName(item.uploadedBy)}</span></div>)}</div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-bold text-slate-800">Thảo luận ({comments.length})</h3></div>
            <div className="mt-3 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} disabled={!membership && currentUser.role !== 'ADMIN'} placeholder="Nhập bình luận..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs disabled:bg-slate-50" /><button type="button" disabled={!comment.trim()} onClick={() => run('Đã thêm bình luận.', () => { mockCoreApi.addComment(task.id, comment); setComment(''); })} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Gửi</button></div>
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{comments.slice().reverse().map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="font-semibold text-slate-700">{userName(item.authorId)} <span className="font-normal text-slate-400">· {formatTime(item.createdAt)}</span></div><p className="mt-1 text-slate-600">{item.content}</p></div>)}</div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><History className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-bold text-slate-800">Review & Audit</h3></div>
            <div className="mt-3 space-y-2">{reviews.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3 text-[11px]"><div className="flex justify-between"><strong className="text-slate-700">{item.id} · {item.decision}</strong><span className="text-slate-400">{formatTime(item.submittedAt)}</span></div><p className="mt-1 text-slate-500">Snapshot: {item.checklistSnapshot.length} checklist, {item.evidenceSnapshot.length} minh chứng, deadline {item.deadlineSnapshot}</p>{item.reason && <p className="mt-1 text-rose-600">Lý do: {item.reason}</p>}</div>)}</div>
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto border-t border-slate-100 pt-3">{activity.map((item) => <div key={item.id} className="text-[10px] leading-4 text-slate-500"><strong>{item.action}</strong> · {userName(item.actorId)} · {item.detail}<span className="block text-slate-300">{formatTime(item.createdAt)}</span></div>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
};
