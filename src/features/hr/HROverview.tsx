import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, ArrowRight, Building2, ShieldCheck, UserCheck, UserCog, UserRoundX, Users } from 'lucide-react';
import { departmentApi } from '../../services/api/department.api';
import { userApi } from '../../services/api/user.api';
import { Department, Role, User } from '../../types';
import { useAuthStore } from '../../store/auth.store';

const roleMeta: Record<Role, { label: string; color: string }> = {
  ADMIN: { label: 'Admin', color: '#7c3aed' }, MANAGER: { label: 'Manager', color: '#2563eb' }, EMPLOYEE: { label: 'Employee', color: '#10b981' },
};

export const HROverview: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const setActiveTab = useAuthStore(s => s.setActiveTab);

  useEffect(() => {
    let active = true;
    Promise.all([userApi.getUsers(), departmentApi.getDepartments()]).then(([userData, departmentData]) => {
      if (!active) return; setUsers(userData); setDepartments(departmentData); setError('');
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu nhân sự.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const activeUsers = users.filter(user => user.status === 'ACTIVE');
  const inactiveUsers = users.filter(user => user.status !== 'ACTIVE');
  const unassignedUsers = activeUsers.filter(user => !Number(user.departmentId ?? user.department_id));
  const managers = activeUsers.filter(user => user.role === 'MANAGER');
  const departmentsWithoutManager = departments.filter(department => !department.manager_id);
  const departmentRows = useMemo(() => departments.map(department => {
    const members = activeUsers.filter(user => String(user.departmentId ?? user.department_id) === String(department.id));
    return { department, members: members.length, managers: members.filter(user => user.role === 'MANAGER').length, employees: members.filter(user => user.role === 'EMPLOYEE').length };
  }).sort((a, b) => b.members - a.members), [departments, activeUsers]);
  const departmentChart = departmentRows.filter(row => row.members).map((row, index) => ({ name: row.department.name, value: row.members, color: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'][index % 6] }));
  const roleChart = (Object.keys(roleMeta) as Role[]).map(role => ({ role: roleMeta[role].label, value: activeUsers.filter(user => user.role === role).length, color: roleMeta[role].color }));
  const attentionUsers = [...inactiveUsers, ...unassignedUsers.filter(user => !inactiveUsers.some(item => String(item.id) === String(user.id)))];

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Đang tổng hợp dữ liệu nhân sự...</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><b>Không thể tải dashboard.</b><p className="mt-1">{error}</p></div>;
  if (!users.length && !departments.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-700">Chưa có dữ liệu nhân sự</h2><p className="mt-1 text-xs text-slate-400">Tạo phòng ban và tài khoản để bắt đầu quản lý cơ cấu tổ chức.</p><button onClick={() => setActiveTab('members')} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Mở quản lý nhân sự</button></div>;

  const kpis = [
    { label: 'Tài khoản hoạt động', value: activeUsers.length, note: `${users.length} tài khoản toàn hệ thống`, icon: UserCheck, tone: 'bg-emerald-50 text-emerald-700', action: () => setActiveTab('members') },
    { label: 'Phòng ban', value: departments.length, note: `${departmentsWithoutManager.length} chưa có Manager`, icon: Building2, tone: 'bg-blue-50 text-blue-700', action: () => setActiveTab('departments') },
    { label: 'Manager hoạt động', value: managers.length, note: 'Global role MANAGER', icon: UserCog, tone: 'bg-violet-50 text-violet-700', action: () => setActiveTab('permissions') },
    { label: 'Chưa thuộc phòng ban', value: unassignedUsers.length, note: 'Tài khoản ACTIVE cần phân bổ', icon: AlertCircle, tone: 'bg-amber-50 text-amber-700', action: () => setActiveTab('members') },
    { label: 'Tài khoản vô hiệu', value: inactiveUsers.length, note: 'Không thể đăng nhập', icon: UserRoundX, tone: 'bg-slate-100 text-slate-700', action: () => setActiveTab('permissions') },
  ];

  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{kpis.map(({ label, value, note, icon: Icon, tone, action }) => <button key={label} onClick={action} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold text-slate-500">{label}</p><strong className="mt-2 block text-2xl text-slate-900">{value}</strong></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-2 truncate text-[10px] text-slate-400">{note}</p></button>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="text-sm font-bold text-slate-900">Cơ cấu nhân sự theo phòng ban</h2><p className="mt-1 text-[11px] text-slate-400">Chỉ tính tài khoản đang hoạt động và đã được gán phòng ban</p></div>{departmentChart.length ? <div className="mt-3 grid items-center gap-4 sm:grid-cols-[240px_1fr]"><div className="relative h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={departmentChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{departmentChart.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value} nhân sự`, 'Số lượng']} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><b className="text-2xl text-slate-900">{activeUsers.length - unassignedUsers.length}</b><p className="text-[9px] text-slate-400">Đã phân bổ</p></div></div></div><div className="space-y-3">{departmentChart.map(item => <div key={item.name}><div className="flex items-center justify-between text-[10px]"><span className="flex min-w-0 items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} /><span className="truncate">{item.name}</span></span><b className="text-slate-700">{item.value}</b></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(4, item.value / Math.max(1, activeUsers.length) * 100)}%`, background: item.color }} /></div></div>)}</div></div> : <div className="mt-5 grid h-56 place-items-center rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">Chưa có nhân sự được phân vào phòng ban.</div>}</article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="text-sm font-bold text-slate-900">Phân bổ vai trò hệ thống</h2><p className="mt-1 text-[11px] text-slate-400">Global role khác với quyền theo từng Project</p></div><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={roleChart} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="role" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value} tài khoản`, 'Số lượng']} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{roleChart.map(item => <Cell key={item.role} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></div><div className="grid grid-cols-3 gap-2">{roleChart.map(item => <div key={item.role} className="rounded-xl bg-slate-50 p-2.5 text-center"><b className="text-sm text-slate-800">{item.value}</b><p className="mt-0.5 text-[9px] text-slate-400">{item.role}</p></div>)}</div></article>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Tình hình phòng ban</h2><p className="mt-1 text-[11px] text-slate-400">Manager chính và cơ cấu nhân sự đang hoạt động</p></div><button onClick={() => setActiveTab('departments')} className="flex items-center gap-1 text-[11px] font-bold text-blue-600">Quản lý phòng ban <ArrowRight className="h-3.5 w-3.5" /></button></div>{departmentRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Phòng ban</th><th className="px-4 py-3">Manager chính</th><th className="px-4 py-3 text-center">Nhân sự</th><th className="px-4 py-3 text-center">Manager</th><th className="px-5 py-3">Tình trạng</th></tr></thead><tbody className="divide-y divide-slate-100">{departmentRows.map(({ department, members, managers: managerCount }) => <tr key={department.id} className="hover:bg-slate-50"><td className="px-5 py-3"><b className="text-xs text-slate-800">{department.name}</b><p className="mt-0.5 max-w-xs truncate text-[9px] text-slate-400">{department.description || 'Chưa có mô tả'}</p></td><td className="px-4 py-3 text-[11px] text-slate-600">{department.managerName || 'Chưa bổ nhiệm'}</td><td className="px-4 py-3 text-center text-xs font-bold text-slate-700">{members}</td><td className="px-4 py-3 text-center text-xs font-bold text-slate-700">{managerCount}</td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${department.manager_id ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{department.manager_id ? 'Đã có Manager' : 'Cần bổ nhiệm'}</span></td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-xs text-slate-400">Chưa có phòng ban để hiển thị.</div>}</article>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-bold text-slate-900">Cần xử lý</h2></div><p className="mt-1 text-[11px] text-slate-400">Tài khoản hoặc cơ cấu chưa hoàn chỉnh</p></div>{attentionUsers.length || departmentsWithoutManager.length ? <div className="space-y-2 p-4">{unassignedUsers.slice(0, 4).map(user => <button key={`unassigned-${user.id}`} onClick={() => setActiveTab('members')} className="flex w-full items-center gap-3 rounded-xl bg-amber-50 p-3 text-left"><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-bold text-amber-700">{user.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-slate-700">{user.name}</b><small className="text-[9px] text-amber-700">Chưa thuộc phòng ban</small></span></button>)}{inactiveUsers.slice(0, 3).map(user => <button key={`inactive-${user.id}`} onClick={() => setActiveTab('permissions')} className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left"><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-bold text-slate-500">{user.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-slate-700">{user.name}</b><small className="text-[9px] text-slate-500">Tài khoản vô hiệu</small></span></button>)}{departmentsWithoutManager.slice(0, 3).map(department => <button key={`department-${department.id}`} onClick={() => setActiveTab('departments')} className="flex w-full items-center gap-3 rounded-xl bg-red-50 p-3 text-left"><Building2 className="h-4 w-4 text-red-600" /><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-slate-700">{department.name}</b><small className="text-[9px] text-red-600">Chưa có Manager chính</small></span></button>)}</div> : <div className="p-10 text-center"><UserCheck className="mx-auto h-7 w-7 text-emerald-500" /><b className="mt-3 block text-xs text-slate-700">Cơ cấu đã đầy đủ</b><p className="mt-1 text-[10px] text-slate-400">Không có điểm bất thường cần xử lý.</p></div>}</article>
    </section>
  </div>;
};
