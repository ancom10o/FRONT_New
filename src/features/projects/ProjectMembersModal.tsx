import React, { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Users, X } from 'lucide-react';
import { Project, User } from '../../types';
import { userApi } from '../../services/api/user.api';
import { ProjectMember, projectMemberApi } from '../../services/api/project-member.api';
import { useAuthStore } from '../../store/auth.store';
import { mockCoreApi } from '../../mocks/mockApi';
import { employeeProfileApi } from '../../services/api/employee-profile.api';

interface Props {
  project: Project | null;
  onClose: () => void;
}

const matchedProfileValue = (profileText: string, term: string) => {
  if (!term) return '';
  try {
    const parsed = JSON.parse(profileText) as unknown;
    const visit = (value: unknown): string => {
      if (Array.isArray(value)) { for (const item of value) { const result = visit(item); if (result) return result; } }
      else if (value && typeof value === 'object') {
        const object = value as Record<string, unknown>;
        const values = Object.values(object).map(String);
        if (values.some((item) => item.toLocaleLowerCase('vi').includes(term.toLocaleLowerCase('vi')))) {
          const name = object.name || object.title || object.skill || object.certificate;
          return name ? `${name} ${values.find((item) => item.toLocaleLowerCase('vi').includes(term.toLocaleLowerCase('vi')))}` : values.join(' · ');
        }
        for (const item of Object.values(object)) { const result = visit(item); if (result) return result; }
      }
      return '';
    };
    const structured = visit(parsed);
    if (structured) return structured;
  } catch { /* fallback to text search */ }
  const source = profileText.replace(/[{}\[\]"]+/g, ' ').replace(/\s+/g, ' ');
  const index = source.toLocaleLowerCase('vi').indexOf(term.toLocaleLowerCase('vi'));
  if (index < 0) return '';
  const start = Math.max(0, source.lastIndexOf(',', index) + 1);
  const end = source.indexOf(',', index + term.length);
  return source.slice(start, end < 0 ? index + term.length + 30 : end).trim().replace(/^[:\s]+/, '');
};
const normalizeSearch = (value: string) => value.toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const profileMatch = (profileText: string, query: string) => {
  try {
    const parsed = JSON.parse(profileText) as unknown;
    const term = normalizeSearch(query);
    const visit = (value: unknown): string => {
      if (Array.isArray(value)) { for (const item of value) { const result = visit(item); if (result) return result; } return ''; }
      if (value && typeof value === 'object') {
        const object = value as Record<string, unknown>;
        const values = Object.values(object).filter((item) => item !== null && typeof item !== 'object').map(String);
        if (term && normalizeSearch(values.join(' ')).includes(term)) return values.join(' · ');
        for (const item of Object.values(object)) { const result = visit(item); if (result) return result; }
      }
      return '';
    };
    return visit(parsed);
  } catch { return ''; }
};

export const ProjectMembersModal: React.FC<Props> = ({ project, onClose }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectRole, setProjectRole] = useState('MEMBER');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [profileSearchText, setProfileSearchText] = useState<Record<string, string>>({});

  const load = async () => {
    if (!project) return;
    const [memberData, userData] = await Promise.all([
      projectMemberApi.getMembers(project.id),
      userApi.getUsers(),
    ]);
    setMembers(memberData);
    setUsers(userData);
    const profileEntries = await Promise.all(userData.map(async (user) => { try { const response = await employeeProfileApi.getByUserId(user.id); const profile = response.profile || {}; return [String(user.id), JSON.stringify({ skills: profile.skills || [], educations: profile.educations || [], certifications: profile.certifications || [], languages: profile.languages || [], notes: profile.notes || {} })] as const; } catch { return [String(user.id), ''] as const; } }));
    setProfileSearchText(Object.fromEntries(profileEntries));
  };

  useEffect(() => {
    if (project) load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Không thể tải thành viên dự án'));
  }, [project?.id]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set([...members.map((member) => String(member.userId)), ...selectedUsers.map((user) => String(user.id))]);
    const term = normalizeSearch(search);
    return users.filter((user) => !memberIds.has(String(user.id)) && (departmentFilter === 'ALL' || String(user.departmentId ?? user.department_id) === departmentFilter) && (!term || normalizeSearch(`${user.full_name || user.name} ${user.email} ${user.specialization || ''} ${(user.skills || []).join(' ')}`).includes(term) || !!profileMatch(profileSearchText[String(user.id)] || '', search))).map((user) => ({ ...user, full_name: `ID ${user.id} - ${user.full_name || user.name}`, email: profileMatch(profileSearchText[String(user.id)] || '', search) ? `🔎 ${profileMatch(profileSearchText[String(user.id)] || '', search)}` : matchedProfileValue(profileSearchText[String(user.id)] || '', search) }));
  }, [members, users, search, departmentFilter, selectedUsers, profileSearchText]);

  const addSelectedMembers = async () => {
    if (!project || !selectedUsers.length) return;
    try {
      for (const user of selectedUsers) await projectMemberApi.addMember(project.id, { userId: Number(user.id), projectRole: 'MEMBER' });
      setSelectedUsers([]);
      setSelectedUserId('');
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Không thể thêm các thành viên đã chọn'); }
  };

  const removeMember = async (member: ProjectMember) => {
    if (!project || !window.confirm(`Xóa ${member.fullName} khỏi dự án?`)) return;
    await projectMemberApi.removeMember(project.id, member.userId);
    await load();
  };

  const updateRole = async (member: ProjectMember, nextRole: string) => {
    if (!project) return;
    setError('');
    try {
      await projectMemberApi.updateMember(project.id, member.userId, nextRole);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể thay đổi vai trò dự án');
    }
  };

  if (!project) return null;
  const database = mockCoreApi.snapshot();
  const runtimeProject = database.projects.find((item) => item.id === Number(project.id));
  const canManage = currentUser.role === 'ADMIN'
    || runtimeProject?.leaderId === Number(currentUser.id);
  const isLeader = runtimeProject?.leaderId === Number(currentUser.id);
  const selectedUser = users.find((user) => String(user.id) === selectedUserId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-3xl p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div><h3 className="text-sm font-bold text-slate-800">Thành viên dự án</h3><p className="text-xs text-slate-400 mt-1">{project.name}</p></div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="mt-3 rounded-xl bg-red-50 text-red-700 px-3 py-2 text-xs">{error}</div>}
        {canManage && <div className="mt-4 space-y-3"><div className="flex gap-2"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc thông tin hồ sơ..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs" /></label><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="ALL">Tất cả phòng ban</option>{Array.from(new Map(users.map((user) => [String(user.departmentId ?? user.department_id), user.departmentName || user.department_name || 'Chưa có phòng ban']))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>{search.trim() && <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">{availableUsers.slice(0, 5).map((user) => <button key={user.id} type="button" onClick={() => { setSelectedUserId(String(user.id)); setSelectedUsers((current) => current.some((item) => item.id === user.id) ? current : [...current, user]); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-blue-50"><span><b className="block text-xs text-slate-700">{user.full_name || user.name}</b><span className="text-[10px] text-slate-400">{user.departmentName || user.department_name || 'Chưa có phòng ban'} · {user.email}</span></span><span className="text-[10px] font-semibold text-blue-600">Chọn</span></button>)}{!availableUsers.length && <p className="px-3 py-4 text-center text-[11px] text-slate-400">Không tìm thấy nhân sự phù hợp.</p>}{availableUsers.length > 5 && <p className="px-3 py-2 text-center text-[10px] text-slate-400">Cuộn để xem thêm kết quả</p>}</div>}<div className="flex gap-2">
          <select value={selectedUserId} onChange={(event) => { const value = event.target.value; setSelectedUserId(value); setProjectRole('MEMBER'); const user = users.find((item) => String(item.id) === value); if (user) setSelectedUsers((current) => current.some((item) => item.id === user.id) ? current : [...current, user]); }} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <option value="">Chọn nhân sự</option>
            {availableUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name || user.name}</option>)}
          </select>
          <select value={projectRole} onChange={(event) => setProjectRole(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <option value="MEMBER">Thành viên</option>
            {isLeader && selectedUser?.role === 'MANAGER' && <option value="PROJECT_MANAGER">Project Manager</option>}
          </select>
<button onClick={addSelectedMembers} disabled={!selectedUsers.length} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50">Thêm thành viên</button>
        </div>{selectedUsers.length > 0 && <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3"><p className="text-[10px] font-bold text-blue-700">Đã chọn ({selectedUsers.length})</p>{selectedUsers.map((user) => <div key={user.id} className="mt-2 flex items-center justify-between text-xs"><span>{user.full_name || user.name} - {user.departmentName || user.department_name || 'Chưa có phòng ban'}</span><button type="button" onClick={() => setSelectedUsers((current) => current.filter((item) => item.id !== user.id))} className="text-red-500">Bỏ</button></div>)}</div>}</div>}
        <div className="mt-4 divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {members.map((member) => (
            <div key={member.userId} className="py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0"><div className="text-xs font-bold text-slate-800 truncate">{member.fullName}</div><div className="text-[11px] text-slate-400 truncate">{member.email}</div></div>
              {isLeader && String(member.userId) !== String(runtimeProject?.leaderId) ? <select value={member.projectRole} onChange={(event) => void updateRole(member, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600"><option value="MEMBER">MEMBER</option>{users.find((user) => String(user.id) === String(member.userId))?.role === 'MANAGER' && <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>}</select> : <span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] text-slate-600">{String(member.userId) === String(runtimeProject?.leaderId) ? 'PROJECT LEADER' : member.projectRole}</span>}
              {canManage && String(member.userId) !== String(runtimeProject?.leaderId) && <button onClick={() => removeMember(member)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
          {!members.length && <div className="py-12 text-center text-xs text-slate-400">Dự án chưa có thành viên.</div>}
        </div>
      </div>
    </div>
  );
};
