import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface TaskComment {
  id: number;
  content: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
}

export const taskCommentApi = {
  getComments: async (taskId: number | string): Promise<TaskComment[]> => {
    const response = await apiClient.get<ApiResponse<TaskComment[]>>(`/tasks/${taskId}/comments`);
    return unwrapResponse(response.data) || [];
  },
  addComment: async (taskId: number | string, content: string): Promise<TaskComment> => {
    const response = await apiClient.post<ApiResponse<TaskComment>>(`/tasks/${taskId}/comments`, { content });
    return unwrapResponse(response.data);
  },
};
