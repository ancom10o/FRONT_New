import { create } from 'zustand';
import { Role, User } from '../types';
import { AdminArea, getDefaultTab } from '../config/navigation';

const guestUser: User = {
  id: 0,
  full_name: 'Khách',
  name: 'Khách',
  email: '',
  department_id: 0,
  departmentId: 0,
  system_role: 'EMPLOYEE',
  role: 'EMPLOYEE',
  status: 'ACTIVE',
};

interface AuthState {
  currentUser: User;
  adminArea: AdminArea;
  activeTab: string;
  setCurrentUser: (user: User) => void;
  setRole: (role: Role) => void;
  setAdminArea: (area: AdminArea) => void;
  setActiveTab: (tab: string) => void;
  isAdmin: () => boolean;
  canManageProject: () => boolean;
  canCreateProject: () => boolean;
  canEditProject: () => boolean;
  canDeleteProject: () => boolean;
  canCreateTask: () => boolean;
  canEditTask: () => boolean;
  canDeleteTask: () => boolean;
  canReassignLeader: () => boolean;
  canManageStaff: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: guestUser,
  adminArea: 'PROJECTS',
  activeTab: 'project-overview',

  setCurrentUser: (user: User) => set({ currentUser: user, adminArea: 'PROJECTS', activeTab: getDefaultTab(user.role) }),

  setRole: (role: Role) => {
    const user = get().currentUser;
    set({ currentUser: { ...user, role } });
  },

  setAdminArea: (area: AdminArea) => {
    set({ adminArea: area, activeTab: getDefaultTab('ADMIN', area) });
  },

  setActiveTab: (tab: string) => set({ activeTab: tab }),

  // Role-based security checks
  isAdmin: () => get().currentUser.role === 'ADMIN',

  canManageProject: () => {
    const role = get().currentUser.role;
    return role === 'MANAGER';
  },

  canCreateProject: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN';
  },

  canEditProject: () => {
    const role = get().currentUser.role;
    return role === 'MANAGER';
  },

  canDeleteProject: () => {
    const role = get().currentUser.role;
    return ['ADMIN', 'MANAGER'].includes(role);
  },

  canCreateTask: () => {
    const role = get().currentUser.role;
    return role === 'MANAGER';
  },

  canEditTask: () => {
    const role = get().currentUser.role;
    return role === 'MANAGER';
  },

  canDeleteTask: () => {
    const role = get().currentUser.role;
    return role === 'MANAGER';
  },

  canReassignLeader: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN';
  },

  canManageStaff: () => {
    const role = get().currentUser.role;
    return ['ADMIN', 'MANAGER'].includes(role);
  },
}));
