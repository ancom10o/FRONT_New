import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface TaskAttachment {
  id: number;
  entityType: string;
  entityId: number;
  fileName: string;
  fileSize?: number;
  uploadedByName?: string;
  createdAt?: string;
}

export const attachmentApi = {
  getForTask: async (taskId: number | string): Promise<TaskAttachment[]> => {
    const response = await apiClient.get<ApiResponse<TaskAttachment[]>>('/attachments', { params: { entityType: 'TASK', entityId: taskId } });
    return unwrapResponse(response.data) || [];
  },
  uploadForTask: async (taskId: number | string, file: File): Promise<TaskAttachment> => {
    const form = new FormData();
    form.append('entityType', 'TASK');
    form.append('entityId', String(taskId));
    form.append('file', file);
    const response = await apiClient.post<ApiResponse<TaskAttachment>>('/attachments/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrapResponse(response.data);
  },
  download: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/attachments/download/${id}`, { responseType: 'blob' });
    return response.data as Blob;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/attachments/${id}`);
  },
};
