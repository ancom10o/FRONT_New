import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { adminMessageNavigation, adminPeopleNavigation, adminProjectNavigation, employeeNavigation, managerNavigation } from '../../config/navigation';

export const PageHeader: React.FC = () => {
  const { currentUser, adminArea, activeTab } = useAuthStore();
  const items = currentUser.role === 'ADMIN' ? (adminArea === 'PROJECTS' ? adminProjectNavigation : adminArea === 'PEOPLE' ? adminPeopleNavigation : adminMessageNavigation) : currentUser.role === 'MANAGER' ? managerNavigation : employeeNavigation;
  const current = items.find(item => item.id === activeTab) ?? items[0];
  const workspace = currentUser.role === 'ADMIN' ? (adminArea === 'PROJECTS' ? 'Quản lý dự án' : adminArea === 'PEOPLE' ? 'Quản lý nhân sự' : 'Tin nhắn') : currentUser.role === 'MANAGER' ? 'Không gian Manager' : 'Không gian cá nhân';
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><span>WorkSphere</span><ChevronRight className="h-3 w-3" /><span>{workspace}</span><ChevronRight className="h-3 w-3" /><span className="text-slate-600">{current.label}</span></div><h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{current.label}</h1><p className="mt-1 text-xs text-slate-500">{current.description}</p></div><div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-500">Cập nhật {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date())}</div></div>;
};
