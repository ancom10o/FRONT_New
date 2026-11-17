import { apiClient, ApiResponse, unwrapResponse } from './client';
import { Department, Role, User } from '../../types';
import { departmentApi } from './department.api';
import { userApi } from './user.api';

export interface DashboardOverview {
  [key: string]: unknown;
}

interface HrDashboardUser {
  id: number;
  fullName: string;
  email: string;
  departmentId?: number | null;
  departmentName?: string | null;
  systemRole?: string | null;
  status?: string | null;
}

interface HrDashboardDepartment {
  id: number;
  name: string;
  description?: string | null;
  managerId?: number | null;
  managerName?: string | null;
  memberCount?: number;
}

interface HrDashboardPayload {
  users: HrDashboardUser[];
  departments: HrDashboardDepartment[];
}

export interface HrDashboardOverview {
  users: User[];
  departments: Department[];
}

const toUser = (user: HrDashboardUser): User => {
  const role = (user.systemRole || 'EMPLOYEE') as Role;
  const departmentId = user.departmentId ?? 0;
  return {
    id: user.id,
    name: user.fullName,
    full_name: user.fullName,
    email: user.email,
    departmentId,
    department_id: departmentId,
    departmentName: user.departmentName || undefined,
    department_name: user.departmentName || undefined,
    role,
    system_role: role,
    status: user.status || 'ACTIVE',
  };
};

const toDepartment = (department: HrDashboardDepartment): Department => ({
  id: department.id,
  name: department.name,
  description: department.description || undefined,
  manager_id: department.managerId ?? undefined,
  managerName: department.managerName || undefined,
  memberCount: department.memberCount,
});

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await apiClient.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
    return unwrapResponse(response.data);
  },
  getDepartmentWorkload: async (): Promise<Array<Record<string, unknown>>> => {
    const response = await apiClient.get<ApiResponse<Array<Record<string, unknown>>>>('/dashboard/department-workload');
    return unwrapResponse(response.data);
  },
  getHrOverview: async (): Promise<HrDashboardOverview> => {
    try {
      const response = await apiClient.get<ApiResponse<HrDashboardPayload>>('/dashboard/hr-overview');
      const data = unwrapResponse(response.data);
      return {
        users: (data.users || []).map(toUser),
        departments: (data.departments || []).map(toDepartment),
      };
    } catch (error) {
      // Older deployed backends do not have /dashboard/hr-overview yet.
      // Keep the People overview usable during a rolling deployment.
      const message = error instanceof Error ? error.message : '';
      if (!/No static resource|404|hr-overview/i.test(message)) throw error;
      const [users, departments] = await Promise.all([userApi.getUsers(), departmentApi.getDepartments()]);
      return { users, departments };
    }
  },
};
