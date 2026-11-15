import React from 'react';
import { BriefcaseBusiness, ChevronLeft, ChevronRight, MessageSquareText, UsersRound } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { adminMessageNavigation, adminPeopleNavigation, adminProjectNavigation, employeeNavigation, managerNavigation } from '../../config/navigation';

export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ collapsed, onToggle }) => {
  const { adminArea, setAdminArea, activeTab, setActiveTab, currentUser } = useAuthStore();
  const items = currentUser.role === 'ADMIN'
    ? adminArea === 'PROJECTS' ? adminProjectNavigation : adminArea === 'PEOPLE' ? adminPeopleNavigation : adminMessageNavigation
    : currentUser.role === 'MANAGER' ? managerNavigation : employeeNavigation;
  return <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white text-slate-800 shadow-[4px_0_24px_rgba(15,23,42,.04)] transition-all lg:flex lg:flex-col ${collapsed ? 'w-[76px]' : 'w-[272px]'}`}>
    <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-200">W</div>{!collapsed && <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900">WorkSphere</div><div className="text-[11px] text-slate-400">Enterprise Workspace</div></div>}</div>
    {currentUser.role === 'ADMIN' && <div className="p-3">{!collapsed && <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Không gian quản trị</div>}<div className={`grid gap-1 rounded-xl bg-slate-100 p-1 ${collapsed ? 'grid-cols-1' : 'grid-cols-3'}`}>
      <button onClick={() => setAdminArea('PROJECTS')} title="Quản lý dự án" className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${adminArea === 'PROJECTS' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><BriefcaseBusiness className="h-4 w-4" />{!collapsed && 'Dự án'}</button>
      <button onClick={() => setAdminArea('PEOPLE')} title="Quản lý nhân sự" className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${adminArea === 'PEOPLE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><UsersRound className="h-4 w-4" />{!collapsed && 'Nhân sự'}</button>
      <button onClick={() => setAdminArea('MESSAGES')} title="Tin nhắn" className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${adminArea === 'MESSAGES' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><MessageSquareText className="h-4 w-4" />{!collapsed && 'Tin nhắn'}</button>
    </div></div>}
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Điều hướng chính">{items.map(item => { const Icon = item.icon; const selected = activeTab === item.id; return <button key={item.id} onClick={() => setActiveTab(item.id)} title={item.label} aria-current={selected ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span className="min-w-0"><span className="block text-xs font-semibold">{item.label}</span><span className={`mt-0.5 block truncate text-[10px] ${selected ? 'text-blue-100' : 'text-slate-400'}`}>{item.description}</span></span>}</button>; })}</nav>
    <div className="mx-3 mb-2 rounded-xl border border-blue-100 bg-blue-50 p-3">{!collapsed && <><p className="text-[10px] font-bold text-blue-800">WorkSphere P0</p><p className="mt-1 text-[10px] leading-4 text-blue-600">Workflow và phân quyền đang hoạt động.</p></>}</div>
    <button onClick={onToggle} className="m-3 mt-0 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900">{collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Thu gọn</>}</button>
  </aside>;
};
