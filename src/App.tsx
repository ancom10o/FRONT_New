import React, { useEffect, useState } from 'react';
import { LoginView } from './features/auth/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PageHeader } from './components/layout/PageHeader';
import { useAuthStore } from './store/auth.store';
import { PMOverview } from './features/dashboard/PMOverview';
import { EmployeeOverview } from './features/dashboard/EmployeeOverview';
import { TaskList } from './features/tasks/TaskList';
import { ProjectList } from './features/projects/ProjectList';
import { EmployeeProjects } from './features/projects/EmployeeProjects';
import { MembersWorkload } from './features/members/MembersWorkload';
import { ManagerTeam } from './features/members/ManagerTeam';
import { AlertsView } from './features/alerts/AlertsView';
import { CalendarView } from './features/calendar/CalendarView';
import { ProjectTimelineView } from './features/timeline/ProjectTimelineView';
import { PermissionManagement } from './features/permissions/PermissionManagement';
import { HROverview } from './features/hr/HROverview';
import { DepartmentManagement } from './features/departments/DepartmentManagement';
import { ComingSoonMessages } from './features/messages/ComingSoonMessages';
import { authApi } from './services/api/auth.api';
import { Role, User } from './types';

const Screen: React.FC = () => {
  const { activeTab, currentUser } = useAuthStore();
  if (activeTab === 'messages') return <ComingSoonMessages />;
  if (activeTab === 'project-overview') return <PMOverview />;
  if (activeTab === 'people-overview') return <HROverview />;
  if (activeTab === 'projects') return <ProjectList />;
  if (activeTab === 'employee-projects') return <EmployeeProjects />;
  if (activeTab === 'tasks') return <TaskList />;
  if (activeTab === 'members') return <MembersWorkload />;
  if (activeTab === 'manager-team') return <ManagerTeam />;
  if (activeTab === 'departments') return <DepartmentManagement />;
  if (activeTab === 'permissions') return <PermissionManagement />;
  if (activeTab === 'alerts') return <AlertsView />;
  if (activeTab === 'timeline' || activeTab === 'gantt') return <ProjectTimelineView managerId={currentUser.role === 'MANAGER' ? String(currentUser.id) : undefined} />;
  if (activeTab === 'calendar') return <CalendarView managerId={currentUser.role === 'MANAGER' ? String(currentUser.id) : undefined} assigneeId={currentUser.role === 'EMPLOYEE' ? String(currentUser.id) : undefined} />;
  return currentUser.role === 'EMPLOYEE' ? <EmployeeOverview /> : <PMOverview />;
};

export const App: React.FC = () => {
  const setCurrentUser = useAuthStore(s => s.setCurrentUser);
  const activeTab = useAuthStore(s => s.activeTab);
  const [loggedIn, setLoggedIn] = useState(() => Boolean(localStorage.getItem('accessToken')));
  const [restoring, setRestoring] = useState(() => Boolean(localStorage.getItem('accessToken')));
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { setRestoring(false); return; }
    authApi.getCurrentUser().then(current => {
      const user: User = { id: current.userId, full_name: current.fullName, name: current.fullName, email: current.email, department_id: current.departmentId ?? 0, departmentId: current.departmentId ?? 0, system_role: current.systemRole as Role, role: current.systemRole as Role, status: 'ACTIVE' };
      setCurrentUser(user); setLoggedIn(true);
    }).catch(() => { localStorage.removeItem('accessToken'); setLoggedIn(false); }).finally(() => setRestoring(false));
  }, [setCurrentUser]);
  if (restoring) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Đang khôi phục phiên đăng nhập...</div>;
  if (!loggedIn) return <LoginView onLoggedIn={() => setLoggedIn(true)} />;
  const logout = () => { localStorage.removeItem('accessToken'); setLoggedIn(false); };
  const isPortfolioGantt = activeTab === 'timeline' || activeTab === 'gantt';
  return <div className="min-h-screen bg-[#f4f7fb] text-slate-800"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} /><div className={`min-h-screen transition-all ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[272px]'}`}><Header onLogout={logout} onMenu={() => setCollapsed(value => !value)} /><main id="main-content" className={`mx-auto px-4 sm:px-7 ${isPortfolioGantt ? 'max-w-none py-4' : 'max-w-[1680px] py-6'}`}><PageHeader /><Screen /></main></div></div>;
};
export default App;
