import { apiClient, ApiResponse, unwrapResponse } from './client';

export interface AppNotification { id: number; type: string; title: string; message: string; link?: string; read: boolean; createdAt: string; }
export const notificationApi = {
  getMine: async () => unwrapResponse((await apiClient.get<ApiResponse<AppNotification[]>>('/notifications')).data),
  markRead: async (id: number) => { await apiClient.patch(`/notifications/${id}/read`); },
  markAllRead: async () => { await apiClient.patch('/notifications/read-all'); },
};
