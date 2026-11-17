import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, Edit2, Eye, FileText, LoaderCircle, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { departmentApi } from '../../services/api/department.api';
import { userApi } from '../../services/api/user.api';
import { projectApi } from '../../services/api/project.api';
import { ProjectMember, projectMemberApi } from '../../services/api/project-member.api';
import { employeeProfileApi, EmployeeProfile } from '../../services/api/employee-profile.api';
import { Department, User } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { useFilterStore } from '../../store/filter.store';
import { PermissionManagement } from '../permissions/PermissionManagement';
import { ProfileApprovalBoard } from './ProfileApprovalBoard';

type LocalStaffProfile = {
  dateOfBirth: string;
  specialization: string;
  education: string;
  experienceYears: string;
  skills: string;
  phone: string;
  address: string;
};

type EmployeeProject = ProjectMember & { projectName: string };

const formatProfileValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Chưa có dữ liệu';
  if (Array.isArray(value)) {
    if (!value.length) return 'Chưa có dữ liệu';
    return value.map((item) => formatProfileValue(item)).join(' · ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${formatProfileValue(item)}`)
      .join(', ');
  }
  return String(value);
};

const formatJsonKey = (key: string) => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (character) => character.toUpperCase());

const normalizeSearch = (value: string) => value.toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const profileMatch = (profileText: string, query: string): string => {
  try {
    const term = normalizeSearch(query);
    const visit = (value: unknown): string => {
      if (Array.isArray(value)) { for (const item of value) { const result = visit(item); if (result) return result; } return ''; }
      if (value && typeof value === 'object') { const values = Object.values(value as Record<string, unknown>).filter((item) => item !== null && typeof item !== 'object').map(String); if (term && normalizeSearch(values.join(' ')).includes(term)) return values.join(' · '); for (const item of Object.values(value as Record<string, unknown>)) { const result = visit(item); if (result) return result; } }
      return '';
    };
    return visit(JSON.parse(profileText));
  } catch { return ''; }
};

const getStoredProfiles = (): Record<string, LocalStaffProfile> => {
  try { return JSON.parse(localStorage.getItem('staffProfiles') || '{}'); } catch { return {}; }
};

const saveLocalProfile = (userId: number | string, form: typeof emptyForm) => {
  const profiles = getStoredProfiles();
  profiles[String(userId)] = {
    dateOfBirth: form.dateOfBirth,
    specialization: form.specialization,
    education: form.education,
    experienceYears: form.experienceYears,
    skills: form.skills,
    phone: form.phone,
    address: form.address,
  };
  localStorage.setItem('staffProfiles', JSON.stringify(profiles));
};

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  departmentId: '',
  systemRole: 'EMPLOYEE',
  status: 'ACTIVE',
  dateOfBirth: '',
  specialization: '',
  education: '',
  experienceYears: '0',
  skills: '',
  phone: '',
  address: '',
};

export const MembersWorkload: React.FC = () => {
  const { canManageStaff, isAdmin, adminArea, setAdminArea, setActiveTab } = useAuthStore();
  const setFilter = useFilterStore((state) => state.setFilter);
  const [activeSection, setActiveSection] = useState<'staff' | 'create' | 'permissions' | 'approvals'>('staff');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [profileSearchText, setProfileSearchText] = useState<Record<string, string>>({});
  const [searchFocused, setSearchFocused] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [workStatusFilter, setWorkStatusFilter] = useState('ACTIVE');
  const [detailTab, setDetailTab] = useState<'profile' | 'attendance' | 'projects' | 'payroll'>('profile');
  const [employeeProjects, setEmployeeProjects] = useState<EmployeeProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ phone: '', dateOfBirth: '', gender: '', address: '', cccd: '', skills: '[]', educations: '[]', certifications: '[]', languages: '[]', notes: '{}' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [staffError, setStaffError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadData = async () => {
    const [userData, departmentData] = await Promise.all([userApi.getUsers(), departmentApi.getDepartments()]);
    setUsers(userData);
    setDepartments(departmentData);
    const profileEntries = await Promise.all(userData.map(async (user) => { try { const response = await employeeProfileApi.getByUserId(user.id); const profile = response.profile || {}; return [String(user.id), JSON.stringify({ skills: profile.skills || [], educations: profile.educations || [], certifications: profile.certifications || [], languages: profile.languages || [], notes: profile.notes || {} })] as const; } catch { return [String(user.id), ''] as const; } }));
    setProfileSearchText(Object.fromEntries(profileEntries));
  };

  useEffect(() => { loadData().catch(() => undefined); }, []);

  useEffect(() => {
    if (!selectedUser || detailTab !== 'projects') return;
    let active = true;
    setEmployeeProjects([]);
    setProjectsError('');
    setProjectsLoading(true);
    projectApi.getProjects()
      .then(async (projects) => {
        const memberships = await Promise.all(projects.map((project) => projectMemberApi.getMembers(project.id)));
        if (active) {
          setEmployeeProjects(memberships.flatMap((projectMembers, index) => projectMembers
            .filter((member) => String(member.userId) === String(selectedUser.id))
            .map((member) => ({ ...member, projectName: projects[index].name }))));
        }
      })
      .catch((error) => {
        if (active) setProjectsError(error instanceof Error ? error.message : 'Không thể tải dự án tham gia.');
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });
    return () => { active = false; };
  }, [selectedUser?.id, detailTab]);

  useEffect(() => {
    if (!selectedUser) {
      setSelectedEmployeeProfile(null);
      return;
    }
    let active = true;
    setSelectedEmployeeProfile(null);
    employeeProfileApi.getByUserId(selectedUser.id)
      .then((profile) => { if (active) { setSelectedEmployeeProfile(profile); setIsProfileEditing(false); setProfileDraft({ phone: profile.profile?.phone || '', dateOfBirth: profile.profile?.dateOfBirth || '', gender: profile.profile?.gender || '', address: profile.profile?.address || '', cccd: profile.profile?.cccd || '', skills: JSON.stringify(profile.profile?.skills || [], null, 2), educations: JSON.stringify(profile.profile?.educations || [], null, 2), certifications: JSON.stringify(profile.profile?.certifications || [], null, 2), languages: JSON.stringify(profile.profile?.languages || [], null, 2), notes: JSON.stringify(profile.profile?.notes || {}, null, 2) }); } })
      .catch(() => { if (active) setSelectedEmployeeProfile(null); });
    return () => { active = false; };
  }, [selectedUser?.id]);

  const saveEmployeeProfile = async () => {
    if (!selectedUser) return;
    try {
      setProfileSaving(true); setProfileError('');
      const parseJson = (value: string, fallback: unknown) => { try { return JSON.parse(value); } catch { return fallback; } };
      const updated = await employeeProfileApi.updateByUserId(selectedUser.id, { phone: profileDraft.phone || null, dateOfBirth: profileDraft.dateOfBirth || null, gender: profileDraft.gender || null, address: profileDraft.address || null, cccd: profileDraft.cccd || null, skills: parseJson(profileDraft.skills, []), educations: parseJson(profileDraft.educations, []), certifications: parseJson(profileDraft.certifications, []), languages: parseJson(profileDraft.languages, []), notes: parseJson(profileDraft.notes, {}) });
      setSelectedEmployeeProfile(updated); setIsProfileEditing(false);
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Không thể lưu hồ sơ.'); } finally { setProfileSaving(false); }
  };

  const draftArray = (field: 'skills' | 'educations' | 'certifications' | 'languages'): Array<Record<string, string>> => {
    try { const value = JSON.parse(profileDraft[field]); return Array.isArray(value) ? value : []; } catch { return []; }
  };
  const updateDraftArray = (field: 'skills' | 'educations' | 'certifications' | 'languages', items: Array<Record<string, string>>) => setProfileDraft((current) => ({ ...current, [field]: JSON.stringify(items) }));

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setActiveSection('create');
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      fullName: user.full_name || user.name,
      email: user.email,
      password: '',
      departmentId: String(user.departmentId || user.department_id || ''),
      systemRole: user.system_role || user.role,
      status: user.status || 'ACTIVE',
      dateOfBirth: String(user.date_of_birth || ''),
      specialization: user.specialization || '',
      education: user.education || '',
      experienceYears: String(user.experience_years || 0),
      skills: (user.skills || []).join(', '),
      phone: user.phone || '',
      address: user.address || '',
    });
    setIsFormOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    let savedUserId = editingUser?.id;
    if (editingUser) {
      await userApi.updateUser(editingUser.id, {
        fullName: form.fullName,
        email: form.email,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        systemRole: form.systemRole,
        status: form.status,
      });
    } else {
      const createdUser = await userApi.createUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        systemRole: form.systemRole,
        status: form.status,
      });
      savedUserId = createdUser.id;
    }
    setIsFormOpen(false);
    await loadData();
    if (savedUserId !== undefined) saveLocalProfile(savedUserId, form);
    if (!editingUser) setActiveSection('staff');
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm(`Ngừng hoạt động tài khoản của "${user.full_name || user.name}"? Tài khoản sẽ không còn hiển thị trong danh sách nhân sự.`)) return;
    setStaffError('');
    setDeletingUserId(String(user.id));
    try {
      await userApi.deleteUser(user.id);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => String(currentUser.id) !== String(user.id)));
      if (String(selectedUser?.id) === String(user.id)) setSelectedUser(null);
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Không thể ngừng hoạt động nhân sự. Vui lòng thử lại.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const visibleUsers = useMemo(() => users.filter((user) => workStatusFilter === 'ALL' || user.status === workStatusFilter).filter((user) => {
    const term = normalizeSearch(search);
    const matchesSearch = !term || normalizeSearch(`${user.full_name || user.name} ${user.email} ${user.departmentName || user.department_name || ''} ${user.specialization || ''} ${(user.skills || []).join(' ')}`).includes(term) || !!profileMatch(profileSearchText[String(user.id)] || '', search);
    const matchesDepartment = departmentFilter === 'ALL' || String(user.departmentId || user.department_id) === departmentFilter;
    const matchesRole = roleFilter === 'ALL' || (user.system_role || user.role) === roleFilter;
    const matchesWorkStatus = workStatusFilter === 'ALL' || user.status === workStatusFilter;
    return matchesSearch && matchesDepartment && matchesRole && matchesWorkStatus;
  }), [users, search, departmentFilter, roleFilter, workStatusFilter, profileSearchText]);

  const searchSuggestions = useMemo(() => search.trim() ? visibleUsers.slice(0, 6).map((user) => ({ user, matchedProfile: profileMatch(profileSearchText[String(user.id)] || '', search) })) : [], [search, visibleUsers, profileSearchText]);

  const sectionTabs = (
    <div role="tablist" aria-label="Quản lý nhân sự" className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'staff'}
        onClick={() => setActiveSection('staff')}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeSection === 'staff' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        Nhân sự
      </button>
      {canManageStaff() && (
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'create'}
          onClick={openCreate}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeSection === 'create' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm nhân sự
        </button>
      )}
      {isAdmin() && adminArea !== 'PEOPLE' && (
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'permissions'}
          onClick={() => setActiveSection('permissions')}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeSection === 'permissions' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Phân quyền
        </button>
      )}
      {isAdmin() && <button type="button" role="tab" aria-selected={activeSection === 'approvals'} onClick={() => setActiveSection('approvals')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeSection === 'approvals' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><FileText className="h-4 w-4" aria-hidden="true" />Phê duyệt</button>}
    </div>
  );

  if (activeSection === 'permissions' && isAdmin()) {
    return (
      <div className="space-y-4">
        {sectionTabs}
        <PermissionManagement />
      </div>
    );
  }

  if (activeSection === 'approvals' && isAdmin()) return <div className="space-y-4">{sectionTabs}<ProfileApprovalBoard /></div>;

  return (
    <div className="space-y-4">
      {sectionTabs}
      <div className={activeSection === 'create' ? 'hidden' : 'contents'}>
      {staffError && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{staffError}</div>}
      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-bold text-slate-800">Danh sách nhân viên</h2><p className="mt-1 text-[11px] text-slate-400">Hồ sơ và danh sách nhân viên đang hoạt động</p></div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{visibleUsers.length} nhân sự</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc thông tin hồ sơ..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400" />
              {searchFocused && searchSuggestions.length > 0 && <div className="absolute left-0 right-0 top-11 z-20 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{searchSuggestions.map(({ user, matchedProfile }) => <button key={user.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelectedUser(user); setDetailTab('profile'); setSearchFocused(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-blue-50"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{(user.full_name || user.name || '?').charAt(0)}</span><span className="min-w-0"><b className="block truncate text-xs text-slate-700">ID {user.id} · {user.full_name || user.name}</b><span className="block truncate text-[10px] text-slate-400">{matchedProfile ? `🔎 ${matchedProfile}` : `${user.departmentName || user.department_name || 'Chưa có phòng ban'} · ${user.email}`}</span></span></button>)}</div>}
            </label>
            <select aria-label="Lọc phòng ban" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <select aria-label="Lọc vai trò" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <option value="ALL">Tất cả vai trò</option>
              {['ADMIN', 'MANAGER', 'EMPLOYEE'].map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}
            </select>
            <label>
              <span className="sr-only">Lọc trạng thái làm việc</span>
              <select aria-label="Lọc trạng thái làm việc" value={workStatusFilter} onChange={(event) => setWorkStatusFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã ngừng hoạt động</option>
                <option value="ALL">Tất cả trạng thái</option>
              </select>
            </label>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Trạng thái được lấy trực tiếp từ trường <code>status</code> của API nhân sự.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Họ và tên</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phòng ban</th>
                <th className="px-4 py-3 font-semibold">Vai trò</th>
                <th className="px-4 py-3 font-semibold">Trạng thái làm việc</th>
                <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.map((user) => {
                return (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => { setSelectedUser(user); setDetailTab('profile'); }} className="flex items-center gap-2.5 text-left">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{(user.full_name || user.name || '?').charAt(0)}</span>
                        <span className="font-semibold text-slate-800">{user.full_name || user.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3.5 text-slate-600">{user.departmentName || user.department_name || 'Chưa có phòng ban'}</td>
                    <td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{(user.system_role || user.role).replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" title="Xem chi tiết" aria-label={`Xem ${user.full_name || user.name}`} onClick={() => { setSelectedUser(user); setDetailTab('profile'); }} className="rounded-lg p-1.5 hover:bg-blue-50"><Eye className="h-3.5 w-3.5 text-blue-600" /></button>
                        {canManageStaff() && <>
                          <button type="button" title="Sửa nhân sự" aria-label={`Sửa ${user.full_name || user.name}`} onClick={() => openEdit(user)} className="rounded-lg p-1.5 hover:bg-blue-50"><Edit2 className="h-3.5 w-3.5 text-blue-600" /></button>
                          <button type="button" title={deletingUserId === String(user.id) ? 'Đang ngừng hoạt động' : 'Ngừng hoạt động'} aria-label={`Ngừng hoạt động ${user.full_name || user.name}`} disabled={deletingUserId === String(user.id)} onClick={() => deleteUser(user)} className="rounded-lg p-1.5 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50">{deletingUserId === String(user.id) ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-red-500" /> : <Trash2 className="h-3.5 w-3.5 text-red-500" />}</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleUsers.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400"><Users className="mx-auto mb-2 h-7 w-7" />Không tìm thấy nhân sự phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={() => setSelectedUser(null)}>
          <div onMouseDown={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">{(selectedUser.full_name || selectedUser.name || '?').charAt(0)}</div>
                <div><h3 className="text-base font-bold text-slate-800">{selectedUser.full_name || selectedUser.name}</h3><p className="mt-1 text-xs text-slate-400">{selectedUser.email}</p></div>
              </div>
              <button type="button" aria-label="Đóng hồ sơ" onClick={() => setSelectedUser(null)} className="rounded-xl px-3 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">×</button>
            </div>
            <div role="tablist" aria-label="Thông tin nhân sự" className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              {[
                ['profile', 'Thông tin chung'],
                ['attendance', 'Chấm công & lịch sử'],
                ['projects', 'Dự án tham gia'],
                ['payroll', 'Lương & hợp đồng'],
              ].map(([tab, label]) => (
                <button key={tab} type="button" role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab as typeof detailTab)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${detailTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
              ))}
            </div>
            {detailTab === 'profile' && (() => {
              const profile = selectedEmployeeProfile?.profile;
              const department = departments.find((item) => String(item.id) === String(selectedUser.departmentId ?? selectedUser.department_id));
              const info = [
                ['Mã nhân sự (ID hệ thống)', String(selectedUser.id)],
                ['Ngày sinh', profile?.dateOfBirth || 'Chưa có dữ liệu'],
                ['Giới tính', profile?.gender || 'Chưa có dữ liệu'],
                ['Số điện thoại', profile?.phone || 'Chưa có dữ liệu'],
                ['Email công ty', selectedUser.email],
                ['Địa chỉ', profile?.address || 'Chưa có dữ liệu'],
                ['CCCD/CMND', profile?.cccd || 'Chưa có dữ liệu'],
                ['Phòng ban', department?.name || 'Chưa phân phòng ban'],
                ['Vai trò hệ thống', (selectedUser.system_role || selectedUser.role).replace(/_/g, ' ')],
                ['Ngày bắt đầu làm việc', selectedEmployeeProfile?.userCreatedAt ? new Date(selectedEmployeeProfile.userCreatedAt).toLocaleDateString('vi-VN') : 'Chưa có dữ liệu'],
                ['Trạng thái làm việc', selectedUser.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng hoạt động'],
                ['Kinh nghiệm', 'Chưa có dữ liệu'],
                ['Trạng thái tài khoản', selectedUser.status === 'ACTIVE' ? 'Đang hoạt động' : selectedUser.status],
              ];
              const jsonInfo = [
                { label: 'Kỹ năng', items: profile?.skills },
                { label: 'Học vấn', items: profile?.educations },
                { label: 'Chứng chỉ', items: profile?.certifications },
                { label: 'Ngoại ngữ', items: profile?.languages },
              ];
              return (
                <section className="mt-5">
                  <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-blue-700 shadow-sm">{(selectedUser.full_name || selectedUser.name || '?').charAt(0)}</div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Hồ sơ nhân sự</p><h4 className="mt-1 text-lg font-bold text-slate-800">{selectedUser.full_name || selectedUser.name}</h4><p className="text-xs text-slate-500">{department?.name || 'Chưa phân phòng ban'} · {String(selectedUser.system_role || selectedUser.role).replace(/_/g, ' ')}</p></div>
                  </div>
                  <div className="mb-4 flex items-center justify-between"><p className="text-[10px] text-slate-400">Thông tin hồ sơ lấy từ employee-profiles</p><button type="button" onClick={() => setIsProfileEditing((value) => !value)} className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white">{isProfileEditing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa hồ sơ'}</button></div>
                  {isProfileEditing && <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] text-slate-600">Số điện thoại<input value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600">Ngày sinh<input type="date" value={profileDraft.dateOfBirth} onChange={(event) => setProfileDraft({ ...profileDraft, dateOfBirth: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600">Giới tính<input value={profileDraft.gender} onChange={(event) => setProfileDraft({ ...profileDraft, gender: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600">CCCD/CMND<input maxLength={12} value={profileDraft.cccd} onChange={(event) => setProfileDraft({ ...profileDraft, cccd: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><label className="text-[11px] text-slate-600 sm:col-span-2">Địa chỉ<input value={profileDraft.address} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" /></label><div className="sm:col-span-2 space-y-3">{(['skills', 'educations', 'certifications', 'languages'] as const).map((field) => { const items = draftArray(field); const labels: Record<string, string> = { skills: 'Kỹ năng', educations: 'Học vấn', certifications: 'Chứng chỉ', languages: 'Ngoại ngữ' }; const keys: Record<string, string[]> = { skills: ['name', 'level'], educations: ['school', 'major', 'degree', 'startYear', 'endYear'], certifications: ['name', 'issuer', 'issuedDate', 'expirationDate'], languages: ['name', 'level'] }; return <div key={field} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">{labels[field]}</span><button type="button" onClick={() => updateDraftArray(field, [...items, {}])} className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600">+ Thêm</button></div><div className="mt-2 space-y-2">{items.map((item, index) => <div key={index} className="rounded-lg bg-slate-50 p-2"><div className="grid gap-2 sm:grid-cols-2">{keys[field].map((key) => <input key={key} placeholder={formatJsonKey(key)} value={item[key] || ''} onChange={(event) => updateDraftArray(field, items.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: event.target.value } : row))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px]" />)}</div><button type="button" onClick={() => updateDraftArray(field, items.filter((_, rowIndex) => rowIndex !== index))} className="mt-2 text-[10px] font-semibold text-red-500">Xóa mục này</button></div>)}</div></div>; })}<div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-xs font-semibold text-slate-700">Thông tin bổ sung</span><div className="mt-2 grid gap-2 sm:grid-cols-2">{['hobbies', 'careerObjective', 'additionalInfo'].map((key) => { let notes: Record<string, unknown> = {}; try { notes = JSON.parse(profileDraft.notes) || {}; } catch {} return <label key={key} className="text-[10px] text-slate-500">{formatJsonKey(key)}<input value={String(notes[key] || '')} onChange={(event) => setProfileDraft({ ...profileDraft, notes: JSON.stringify({ ...notes, [key]: event.target.value }) })} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[11px]" /></label>; })}</div></div></div></div>{profileError && <p className="mt-2 text-xs text-red-600">{profileError}</p>}<div className="mt-3 flex justify-end"><button type="button" disabled={profileSaving} onClick={() => void saveEmployeeProfile()} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{profileSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button></div></div>}
                  {!isProfileEditing && <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {info.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3"><div className="text-[10px] text-slate-400">{label}</div><div className={`mt-1 break-words text-xs font-semibold ${value === 'Chờ API' ? 'text-amber-700' : 'text-slate-700'}`}>{value}</div></div>)}
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between"><div><h5 className="text-xs font-bold text-slate-800">Thông tin hồ sơ chi tiết</h5><p className="mt-0.5 text-[10px] text-slate-400">Dữ liệu JSONB được trình bày theo từng nhóm</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Hồ sơ</span></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {jsonInfo.map(({ label, items }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">{items?.length || 0}</span></div>{items?.length ? <div className="mt-2 space-y-2">{items.map((item, index) => <div key={`${label}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">{typeof item === 'object' && item !== null && !Array.isArray(item) ? <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">{Object.entries(item as Record<string, unknown>).map(([key, value]) => <div key={key} className="min-w-0"><div className="text-[9px] font-medium text-slate-400">{formatJsonKey(key)}</div><div className="break-words text-[11px] font-medium text-slate-700">{formatProfileValue(value)}</div></div>)}</div> : <div className="text-[11px] leading-4 text-slate-700">{formatProfileValue(item)}</div>}</div>)}</div> : <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-400">Chưa có dữ liệu</div>}</div>)}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Thông tin bổ sung</div>{profile?.notes && Object.keys(profile.notes).length ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(profile.notes).map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-[9px] font-medium text-slate-400">{formatJsonKey(key)}</div><div className="mt-0.5 break-words text-[11px] leading-4 text-slate-700">{formatProfileValue(value)}</div></div>)}</div> : <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-400">Chưa có dữ liệu</div>}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-slate-400">Các trường ghi “Chờ API” chưa được backend hỗ trợ nên hiện chưa thể nhập hoặc lưu.</p>
                  </>}
                </section>
              );
            })()}
            {detailTab === 'attendance' && (
              <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarClock className="h-5 w-5 text-amber-600" />Chấm công & lịch sử làm việc</div>
                <p className="mt-2 text-xs leading-5 text-slate-600">Tóm tắt ngày công, đi muộn, nghỉ phép và lịch sử check-in/check-out sẽ hiển thị sau khi tích hợp API chấm công.</p>
                <span className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Đang chờ API</span>
              </section>
            )}
            {detailTab === 'projects' && (
              <section className="mt-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><BriefcaseBusiness className="h-5 w-5 text-blue-600" />Dự án nhân sự tham gia</div>
                {projectsError && <div role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{projectsError}</div>}
                {projectsLoading ? <div className="py-12 text-center text-xs text-slate-400">Đang tải dự án tham gia...</div> : (
                  <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {employeeProjects.map((membership) => (
                      <div key={membership.projectId} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{membership.projectName}</div><div className="mt-1 text-[11px] text-slate-500">Vai trò dự án: {membership.projectRole.replace(/_/g, ' ')}</div></div>
                        <button type="button" onClick={() => { setFilter('projectId', String(membership.projectId)); setAdminArea('PROJECTS'); setActiveTab('projects'); setSelectedUser(null); }} className="rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Mở dự án</button>
                      </div>
                    ))}
                    {!employeeProjects.length && !projectsError && <div className="py-12 text-center text-xs text-slate-400">Nhân sự chưa tham gia dự án nào.</div>}
                  </div>
                )}
              </section>
            )}
            {detailTab === 'payroll' && (
              <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-5 w-5 text-amber-600" />Lương & hợp đồng</div>
                <p className="mt-2 text-xs leading-5 text-slate-600">Lương cơ bản, hệ số, phụ cấp, loại hợp đồng và thời hạn hiệu lực sẽ được bổ sung khi backend có API. Dữ liệu lương hiện không được nhập hoặc lưu ở trình duyệt.</p>
                <span className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Đang chờ API</span>
              </section>
            )}
          </div>
        </div>
      )}
      </div>

      {(isFormOpen || (activeSection === 'create' && canManageStaff())) && (
        <div className={activeSection === 'create' ? 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm' : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'} onMouseDown={() => {
          if (activeSection !== 'create') setIsFormOpen(false);
        }}>
          <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className={`w-full ${activeSection === 'create' ? 'space-y-4' : 'max-w-lg space-y-4 rounded-3xl bg-white p-5 shadow-xl'}`}>
            <h3 className="text-sm font-bold text-slate-800">{editingUser ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs text-slate-500">Họ tên<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-1 w-full px-3 py-2 border rounded-xl text-slate-800" /></label>
              <label className="text-xs text-slate-500">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full px-3 py-2 border rounded-xl text-slate-800" /></label>
              {!editingUser && <label className="text-xs text-slate-500">Mật khẩu<input required minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full px-3 py-2 border rounded-xl text-slate-800" /></label>}
              <label className="text-xs text-slate-500">Phòng ban<select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} className="mt-1 w-full px-3 py-2 border rounded-xl"><option value="">Không chọn</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
              <label className="text-xs text-slate-500 md:col-span-2">Vai trò hệ thống<select value={form.systemRole} onChange={(event) => setForm({ ...form, systemRole: event.target.value })} className="mt-1 w-full px-3 py-2 border rounded-xl"><option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select></label>
              <label className="text-xs text-slate-500 md:col-span-2">Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full px-3 py-2 border rounded-xl"><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Đã ngừng hoạt động</option></select></label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => {
              if (editingUser) setIsFormOpen(false);
              else setActiveSection('staff');
            }} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold">Hủy</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">Lưu</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
