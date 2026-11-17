import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, FileText, KeyRound, X } from 'lucide-react';
import { User } from '../../types';
import { employeeProfileApi, EmployeeProfile } from '../../services/api/employee-profile.api';
import { projectApi } from '../../services/api/project.api';
import { projectMemberApi, ProjectMember } from '../../services/api/project-member.api';
import { profileChangeRequestApi } from '../../services/api/profile-change-request.api';
import { authApi } from '../../services/api/auth.api';

type DetailTab = 'profile' | 'attendance' | 'projects' | 'payroll' | 'account';
type EmployeeProject = ProjectMember & { projectName: string };

const empty = 'Chưa có dữ liệu';

const formatKey = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase());
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return empty;
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(' · ') : empty;
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${key}: ${formatValue(item)}`).join(', ');
  return String(value);
};

/** Read-only personal profile used by employee accounts from the header avatar. */
export const EmployeeProfileModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [tab, setTab] = useState<DetailTab>('profile');
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<EmployeeProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [draft, setDraft] = useState({ phone: '', dateOfBirth: '', gender: '', address: '', cccd: '', skills: '[]', educations: '[]', certifications: '[]', languages: '[]', notes: '{}' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    employeeProfileApi.getByUserId(user.id)
      .then((result) => { if (mounted) { setProfile(result); setDraft({ phone: result.profile?.phone || '', dateOfBirth: result.profile?.dateOfBirth || '', gender: result.profile?.gender || '', address: result.profile?.address || '', cccd: result.profile?.cccd || '', skills: JSON.stringify(result.profile?.skills || []), educations: JSON.stringify(result.profile?.educations || []), certifications: JSON.stringify(result.profile?.certifications || []), languages: JSON.stringify(result.profile?.languages || []), notes: JSON.stringify(result.profile?.notes || {}) }); } })
      .catch(() => { if (mounted) setProfile(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [user.id]);

  useEffect(() => {
    if (tab !== 'projects') return;
    let mounted = true;
    setProjectsLoading(true); setProjectsError('');
    projectApi.getProjects().then(async (allProjects) => {
      const memberships = await Promise.all(allProjects.map((project) => projectMemberApi.getMembers(project.id)));
      if (mounted) setProjects(memberships.flatMap((members, index) => members.filter((member) => String(member.userId) === String(user.id)).map((member) => ({ ...member, projectName: allProjects[index].name }))));
    }).catch((error) => { if (mounted) setProjectsError(error instanceof Error ? error.message : 'Không thể tải dự án tham gia.'); })
      .finally(() => { if (mounted) setProjectsLoading(false); });
    return () => { mounted = false; };
  }, [tab, user.id]);

  const name = user.full_name || user.name || 'Nhân viên';
  const letter = name.charAt(0).toUpperCase();
  const personal = profile?.profile;
  const info: Array<[string, string]> = [
    ['Mã nhân sự (ID hệ thống)', String(user.id)], ['Ngày sinh', personal?.dateOfBirth || empty], ['Giới tính', personal?.gender || empty],
    ['Số điện thoại', personal?.phone || empty], ['Email công ty', user.email || profile?.email || empty], ['Địa chỉ', personal?.address || empty],
    ['CCCD/CMND', personal?.cccd || empty], ['Phòng ban', profile?.departmentName || user.departmentName || user.department_name || 'Chưa phân phòng ban'],
    ['Vai trò hệ thống', (profile?.systemRole || user.system_role || user.role || 'EMPLOYEE').replace(/_/g, ' ')],
    ['Ngày bắt đầu làm việc', profile?.userCreatedAt ? new Date(profile.userCreatedAt).toLocaleDateString('vi-VN') : empty],
    ['Trạng thái làm việc', (profile?.status || user.status) === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng hoạt động'], ['Kinh nghiệm', empty],
    ['Trạng thái tài khoản', (profile?.status || user.status) === 'ACTIVE' ? 'Đang hoạt động' : (profile?.status || user.status || empty)],
  ];
  const groups = [['Kỹ năng', personal?.skills], ['Học vấn', personal?.educations], ['Chứng chỉ', personal?.certifications], ['Ngoại ngữ', personal?.languages]] as const;
  const canRequestEdit = user.role === 'EMPLOYEE' || user.role === 'MANAGER';
  const parseDraft = (value: string, fallback: unknown) => { try { return JSON.parse(value); } catch { return fallback; } };
  const arrayDraft = (field: 'skills' | 'educations' | 'certifications' | 'languages') => { const value = parseDraft(draft[field], []); return Array.isArray(value) ? value as Array<Record<string, string>> : []; };
  const updateArrayDraft = (field: 'skills' | 'educations' | 'certifications' | 'languages', value: Array<Record<string, string>>) => setDraft((current) => ({ ...current, [field]: JSON.stringify(value) }));
  const submitForApproval = async () => {
    try { setSubmitting(true); setSubmitMessage(''); await profileChangeRequestApi.submit({ ...draft, skills: parseDraft(draft.skills, []), educations: parseDraft(draft.educations, []), certifications: parseDraft(draft.certifications, []), languages: parseDraft(draft.languages, []), notes: parseDraft(draft.notes, {}) }); setEditing(false); setSubmitMessage('Đã gửi yêu cầu chỉnh sửa tới admin để phê duyệt.'); }
    catch (error) { setSubmitMessage(error instanceof Error ? error.message : 'Không thể gửi yêu cầu phê duyệt.'); }
    finally { setSubmitting(false); }
  };
  const requestPasswordChange = () => {
    setPasswordStatus('');
    if (!passwords.current || !passwords.next || !passwords.confirm) { setPasswordStatus('Vui lòng nhập đầy đủ các trường mật khẩu.'); return; }
    if (passwords.next !== passwords.confirm) { setPasswordStatus('Nhập lại mật khẩu mới chưa khớp.'); return; }
    if (passwords.next.length < 6) { setPasswordStatus('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    setPasswordConfirmOpen(true);
  };
  const changePassword = async () => { try { setPasswordSaving(true); setPasswordStatus(''); await authApi.changePassword(passwords.current, passwords.next); setPasswords({ current: '', next: '', confirm: '' }); setPasswordConfirmOpen(false); setPasswordStatus('Đã đổi mật khẩu thành công.'); } catch (error) { setPasswordConfirmOpen(false); setPasswordStatus(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.'); } finally { setPasswordSaving(false); } };

  return <><div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="employee-profile-title" onMouseDown={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">{letter}</div><div><h2 id="employee-profile-title" className="text-base font-bold text-slate-800">{name}</h2><p className="mt-1 text-xs text-slate-400">{user.email}</p></div></div>
        <button type="button" aria-label="Đóng hồ sơ" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
      </div>
      <div role="tablist" aria-label="Thông tin hồ sơ cá nhân" className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {([['profile', 'Thông tin chung'], ['attendance', 'Chấm công & lịch sử'], ['projects', 'Dự án tham gia'], ['payroll', 'Lương & hợp đồng'], ['account', 'Quản lý tài khoản']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}
      </div>
      {tab === 'profile' && <section className="mt-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl font-bold text-blue-700 shadow-sm">{letter}</div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Hồ sơ nhân sự</p><h3 className="mt-1 text-lg font-bold text-slate-800">{name}</h3><p className="text-xs text-slate-500">{profile?.departmentName || user.departmentName || user.department_name || 'Chưa phân phòng ban'} · {(profile?.systemRole || user.system_role || user.role).replace(/_/g, ' ')}</p></div></div>
        <div className="mb-4 flex items-center justify-between gap-3"><p className="text-[10px] text-slate-400">Thông tin hồ sơ của bạn{editing ? ' · thay đổi sẽ được admin phê duyệt' : ' · chỉ có quyền xem'}</p>{canRequestEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white">Chỉnh sửa thông tin</button>}</div>
        {submitMessage && <div role="status" className={`mb-4 rounded-xl px-3 py-2 text-xs ${submitMessage.startsWith('Đã') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{submitMessage}</div>}
        {editing && <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] text-slate-600">Số điện thoại<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600">Ngày sinh<input type="date" value={draft.dateOfBirth} onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600">Giới tính<input value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600">CCCD/CMND<input maxLength={12} value={draft.cccd} onChange={(event) => setDraft({ ...draft, cccd: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600 sm:col-span-2">Địa chỉ<input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label></div><div className="mt-4 space-y-3">{(['skills', 'educations', 'certifications', 'languages'] as const).map((field) => { const items = arrayDraft(field); const labels = { skills: 'Kỹ năng', educations: 'Học vấn', certifications: 'Chứng chỉ', languages: 'Ngoại ngữ' }; const keys = { skills: ['name', 'level'], educations: ['school', 'major', 'degree', 'startYear', 'endYear'], certifications: ['name', 'issuer', 'issuedDate', 'expirationDate'], languages: ['name', 'level'] }; return <div key={field} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">{labels[field]}</span><button type="button" onClick={() => updateArrayDraft(field, [...items, {}])} className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600">+ Thêm</button></div><div className="mt-2 space-y-2">{items.map((item, index) => <div key={index} className="rounded-lg bg-slate-50 p-2"><div className="grid gap-2 sm:grid-cols-2">{keys[field].map((key) => <input key={key} placeholder={formatKey(key)} value={item[key] || ''} onChange={(event) => updateArrayDraft(field, items.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: event.target.value } : row))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px]" />)}</div><button type="button" onClick={() => updateArrayDraft(field, items.filter((_, rowIndex) => rowIndex !== index))} className="mt-2 text-[10px] font-semibold text-red-500">Xóa mục này</button></div>)}</div></div>; })}<div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-xs font-semibold text-slate-700">Thông tin bổ sung</span><div className="mt-2 grid gap-2 sm:grid-cols-2">{['hobbies', 'careerObjective', 'additionalInfo'].map((key) => { const notes = parseDraft(draft.notes, {}) as Record<string, unknown>; return <label key={key} className="text-[10px] text-slate-500">{formatKey(key)}<input value={String(notes[key] || '')} onChange={(event) => setDraft({ ...draft, notes: JSON.stringify({ ...notes, [key]: event.target.value }) })} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[11px]" /></label>; })}</div></div></div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Hủy</button><button type="button" disabled={submitting} onClick={() => void submitForApproval()} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? 'Đang gửi...' : 'Gửi phê duyệt'}</button></div></div>}
        {loading ? <div className="py-16 text-center text-xs text-slate-400">Đang tải hồ sơ...</div> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{info.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 break-words text-xs font-semibold text-slate-700">{value}</div></div>)}</div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="mb-3 flex items-center justify-between"><div><h4 className="text-xs font-bold text-slate-800">Thông tin hồ sơ chi tiết</h4><p className="mt-0.5 text-[10px] text-slate-400">Dữ liệu được trình bày theo từng nhóm</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Hồ sơ</span></div><div className="grid gap-3 sm:grid-cols-2">{groups.map(([label, items]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">{items?.length || 0}</span></div>{items?.length ? <div className="mt-2 space-y-2">{items.map((item, index) => <div key={index} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">{typeof item === 'object' && item !== null && !Array.isArray(item) ? <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">{Object.entries(item as Record<string, unknown>).map(([key, value]) => <div key={key}><div className="text-[9px] font-medium text-slate-400">{formatKey(key)}</div><div className="break-words text-[11px] font-medium text-slate-700">{formatValue(value)}</div></div>)}</div> : <div className="text-[11px] text-slate-700">{formatValue(item)}</div>}</div>)}</div> : <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-400">{empty}</div>}</div>)}</div></div></>}
      </section>}
      {tab === 'attendance' && <Placeholder icon={CalendarClock} title="Chấm công & lịch sử làm việc" text="Tóm tắt ngày công, đi muộn, nghỉ phép và lịch sử check-in/check-out sẽ hiển thị sau khi tích hợp API chấm công." />}
      {tab === 'projects' && <section className="mt-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><BriefcaseBusiness className="h-5 w-5 text-blue-600" />Dự án tham gia</div>{projectsError && <div role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{projectsError}</div>}{projectsLoading ? <div className="py-12 text-center text-xs text-slate-400">Đang tải dự án tham gia...</div> : <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100">{projects.map((membership) => <div key={membership.projectId} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{membership.projectName}</div><div className="mt-1 text-[11px] text-slate-500">Vai trò dự án: {membership.projectRole.replace(/_/g, ' ')}</div></div></div>)}{!projects.length && !projectsError && <div className="py-12 text-center text-xs text-slate-400">Bạn chưa tham gia dự án nào.</div>}</div>}</section>}
      {tab === 'payroll' && <Placeholder icon={FileText} title="Lương & hợp đồng" text="Thông tin lương và hợp đồng chỉ hiển thị khi được tích hợp từ hệ thống nhân sự." />}
      {tab === 'account' && <section className="mx-auto mt-5 max-w-xl rounded-2xl border border-slate-100 bg-slate-50/70 p-5"><div className="flex items-center gap-2"><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><KeyRound className="h-5 w-5" /></div><div><h3 className="text-sm font-bold text-slate-800">Đổi mật khẩu</h3><p className="mt-0.5 text-[11px] text-slate-400">Bảo mật tài khoản của bạn bằng mật khẩu mới.</p></div></div><div className="mt-5 space-y-3"><label className="block text-xs font-medium text-slate-600">Mật khẩu cũ<input type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label><label className="block text-xs font-medium text-slate-600">Mật khẩu mới<input type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label><label className="block text-xs font-medium text-slate-600">Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label>{passwordStatus && <p role="status" className={`rounded-xl px-3 py-2 text-xs ${passwordStatus.startsWith('Đã') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{passwordStatus}</p>}<div className="flex justify-end"><button type="button" onClick={requestPasswordChange} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Xác nhận đổi mật khẩu</button></div></div></section>}
    </div>
  </div>{passwordConfirmOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/50 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h3 className="text-base font-bold text-slate-800">Xác nhận đổi mật khẩu?</h3><p className="mt-2 text-sm leading-5 text-slate-500">Bạn sẽ cần dùng mật khẩu mới trong lần đăng nhập tiếp theo.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={passwordSaving} onClick={() => setPasswordConfirmOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Hủy</button><button type="button" disabled={passwordSaving} onClick={() => void changePassword()} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{passwordSaving ? 'Đang đổi...' : 'Đổi mật khẩu'}</button></div></div></div>}</>;
};

const Placeholder: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Icon className="h-5 w-5 text-amber-600" />{title}</div><p className="mt-2 text-xs leading-5 text-slate-600">{text}</p><span className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Đang chờ API</span></section>;
