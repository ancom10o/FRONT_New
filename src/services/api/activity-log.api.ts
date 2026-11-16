import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface ActivityLog {
  id: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  performedByName?: string;
  createdAt?: string;
}

export const activityLogApi = {
  getForTask: async (taskId: number | string): Promise<ActivityLog[]> => {
    const response = await apiClient.get<ApiResponse<ActivityLog[]>>('/activity-logs', { params: { entityType: 'TASK', entityId: taskId } });
    return unwrapResponse(response.data) || [];
  },
};
