import { Bell, Building2, CalendarDays, FolderKanban, GanttChart, LayoutDashboard, MessageSquare, ShieldCheck, Users, ListChecks } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../types';

export type AdminArea = 'PROJECTS' | 'PEOPLE' | 'MESSAGES';
export interface NavItem { id: string; label: string; description: string; icon: LucideIcon; }

export const adminProjectNavigation: NavItem[] = [
  { id: 'project-overview', label: 'Tổng quan', description: 'Sức khỏe danh mục dự án', icon: LayoutDashboard },
  { id: 'projects', label: 'Dự án', description: 'Danh mục và vòng đời dự án', icon: FolderKanban },
  { id: 'tasks', label: 'Công việc', description: 'Theo dõi thực thi và review', icon: ListChecks },
  { id: 'timeline', label: 'Timeline', description: 'Các mốc trên trục thời gian', icon: GanttChart },
  { id: 'alerts', label: 'Cảnh báo', description: 'Quá hạn và rủi ro cần chú ý', icon: Bell },
  { id: 'calendar', label: 'Lịch', description: 'Deadline toàn hệ thống', icon: CalendarDays },
];
export const adminPeopleNavigation: NavItem[] = [
  { id: 'people-overview', label: 'Tổng quan', description: 'Quy mô và cơ cấu nhân sự', icon: LayoutDashboard },
  { id: 'members', label: 'Nhân sự', description: 'Hồ sơ và trạng thái nhân viên', icon: Users },
  { id: 'departments', label: 'Phòng ban', description: 'Cơ cấu và quản lý bộ phận', icon: Building2 },
  { id: 'permissions', label: 'Quản lý tài khoản', description: 'Tài khoản và vai trò hệ thống', icon: ShieldCheck },
];
export const managerNavigation: NavItem[] = [
  { id: 'projects', label: 'Dự án', description: 'Dự án trong phạm vi của bạn', icon: FolderKanban },
  { id: 'tasks', label: 'Công việc', description: 'Phân công, checklist và review', icon: ListChecks },
  { id: 'manager-team', label: 'Nhân sự', description: 'Nhân sự thuộc phòng ban phụ trách', icon: Users },
  { id: 'gantt', label: 'Gantt', description: 'Kế hoạch và tiến độ dự án', icon: GanttChart },
  { id: 'calendar', label: 'Lịch', description: 'Deadline trong phạm vi được phép', icon: CalendarDays },
  { id: 'messages', label: 'Tin nhắn', description: 'Tính năng sắp ra mắt', icon: MessageSquare },
];
export const employeeNavigation: NavItem[] = [
  { id: 'employee-projects', label: 'Dự án của tôi', description: 'Các dự án đang tham gia', icon: FolderKanban },
  { id: 'tasks', label: 'Công việc', description: 'Công việc được giao hoặc theo dõi', icon: ListChecks },
  { id: 'gantt', label: 'Gantt', description: 'Tiến độ các dự án được xem', icon: GanttChart },
  { id: 'calendar', label: 'Lịch', description: 'Lịch công việc cá nhân', icon: CalendarDays },
];
export const messageNavigation: NavItem = { id: 'messages', label: 'Tin nhắn', description: 'Tính năng sắp ra mắt', icon: MessageSquare };
export const adminMessageNavigation: NavItem[] = [messageNavigation];
export const getDefaultTab = (role: Role, area: AdminArea = 'PROJECTS') => role === 'ADMIN'
  ? area === 'PROJECTS' ? 'project-overview' : area === 'PEOPLE' ? 'people-overview' : 'messages'
  : role === 'MANAGER' ? 'projects' : 'employee-projects';
