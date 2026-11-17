import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface ProfileChangeRequest { id: number; requesterId: number; requesterName: string; requesterEmail: string; requesterDepartmentName?: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; requestedData: Record<string, unknown>; reviewNote?: string; createdAt: string; reviewedAt?: string; }
export const profileChangeRequestApi = {
  submit: async (payload: Record<string, unknown>) => unwrapResponse((await apiClient.post<ApiResponse<ProfileChangeRequest>>('/profile-change-requests', payload)).data),
  getPending: async () => unwrapResponse((await apiClient.get<ApiResponse<ProfileChangeRequest[]>>('/profile-change-requests/pending')).data),
  getAll: async () => unwrapResponse((await apiClient.get<ApiResponse<ProfileChangeRequest[]>>('/profile-change-requests')).data),
  review: async (id: number, approved: boolean, note = '') => unwrapResponse((await apiClient.patch<ApiResponse<ProfileChangeRequest>>(`/profile-change-requests/${id}/review`, { approved, note })).data),
};
