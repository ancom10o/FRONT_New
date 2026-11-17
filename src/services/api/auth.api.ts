import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface LoginResult { token: string; accessToken?: string; tokenType?: string; userId: number; fullName: string; email: string; systemRole: string; departmentId?: number; }
export const authApi = {
  login: async (email: string, password: string) => unwrapResponse((await apiClient.post<ApiResponse<LoginResult>>('/auth/login', { email, password })).data),
  getCurrentUser: async () => unwrapResponse((await apiClient.get<ApiResponse<LoginResult>>('/auth/me')).data),
  changePassword: async (currentPassword: string, newPassword: string) => { await apiClient.post('/auth/change-password', { currentPassword, newPassword }); },
};
