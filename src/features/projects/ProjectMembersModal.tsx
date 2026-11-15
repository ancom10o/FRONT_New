import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Users, X } from 'lucide-react';
import { Project, User } from '../../types';
import { userApi } from '../../services/api/user.api';
import { ProjectMember, projectMemberApi } from '../../services/api/project-member.api';
import { useAuthStore } from '../../store/auth.store';
import { mockCoreApi } from '../../mocks/mockApi';

interface Props {
  project: Project | null;
  onClose: () => void;
}

export const ProjectMembersModal: React.FC<Props> = ({ project, onClose }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectRole, setProjectRole] = useState('MEMBER');
  const [error, setError] = useState('');

  const load = async () => {
    if (!project) return;
    const [memberData, userData] = await Promise.all([
      projectMemberApi.getMembers(project.id),
      userApi.getUsers(),
    ]);
    setMembers(memberData);
    setUsers(userData);
  };

  useEffect(() => {
    if (project) load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Không thể tải thành viên dự án'));
  }, [project?.id]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(members.map((member) => String(member.userId)));
    return users.filter((user) => !memberIds.has(String(user.id)));
  }, [members, users]);

  const addMember = async () => {
    if (!project || !selectedUserId) return;
    try {
      await projectMemberApi.addMember(project.id, { userId: Number(selectedUserId), projectRole });
      setSelectedUserId('');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể thêm thành viên');
    }
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
  const canManage = runtimeProject?.leaderId === Number(currentUser.id)
    || database.projectMemberships.some((item) => Number(item.projectId) === Number(project.id) && Number(item.userId) === Number(currentUser.id) && item.projectRole === 'PROJECT_MANAGER' && !item.leftAt);
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
        {canManage && <div className="flex gap-2 mt-4">
          <select value={selectedUserId} onChange={(event) => { setSelectedUserId(event.target.value); setProjectRole('MEMBER'); }} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <option value="">Chọn nhân sự</option>
            {availableUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name || user.name}</option>)}
          </select>
          <select value={projectRole} onChange={(event) => setProjectRole(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <option value="MEMBER">Thành viên</option>
            {isLeader && selectedUser?.role === 'MANAGER' && <option value="PROJECT_MANAGER">Project Manager</option>}
          </select>
          <button onClick={addMember} disabled={!selectedUserId} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50"><Plus className="w-4 h-4" /></button>
        </div>}
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
