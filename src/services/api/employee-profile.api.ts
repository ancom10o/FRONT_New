import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface EmployeeProfile {
  id: number;
  fullName: string;
  email: string;
  departmentId?: number;
  departmentName?: string;
  systemRole?: string;
  status?: string;
  userCreatedAt?: string;
  profile?: {
    avatarUrl?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    cccd?: string;
    skills?: unknown[];
    educations?: unknown[];
    certifications?: unknown[];
    languages?: unknown[];
    notes?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export const employeeProfileApi = {
  getByUserId: async (userId: number | string): Promise<EmployeeProfile> => {
    const response = await apiClient.get<ApiResponse<EmployeeProfile>>(`/employee-profiles/${userId}`);
    return unwrapResponse(response.data);
  },
  updateByUserId: async (userId: number | string, payload: Record<string, unknown>): Promise<EmployeeProfile> => {
    const response = await apiClient.put<ApiResponse<EmployeeProfile>>(`/employee-profiles/${userId}`, payload);
    return unwrapResponse(response.data);
  },
};
