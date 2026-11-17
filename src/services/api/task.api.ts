import { apiClient, ApiResponse, unwrapResponse } from './client';
import { Task, TaskStatus, GlobalFilterParams } from '../../types';
import { TaskFormData } from '../../schema/task.schema';
import { ReassignFormData } from '../../schema/reassign.schema';
import { userApi } from './user.api';

interface BackendTask {
  id: number;
  projectId: number;
  project_id?: number;
  projectName?: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  statusNote?: string;
  assigneeId?: number;
  assigneeName?: string;
  deadline?: string;
  followers?: Array<{ id: number; fullName?: string }>;
  overdue?: boolean;
  overdueDays?: number;
  dependencies?: Array<{ id: number; title?: string }>;
  createdByName?: string;
  taskType?: string;
  type?: string;
  startDate?: string;
  start_date?: string;
  departmentId?: number;
  departmentName?: string;
  progressPercent?: number;
  progress_percent?: number;
}

const overdueDaysFromDeadline = (deadline: string | undefined, status: TaskStatus): number => {
  if (!deadline || status === 'DONE') return 0;
  const dateOnly = deadline.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return 0;
  const dueAt = new Date(`${dateOnly}T23:59:59`).getTime();
  const difference = Date.now() - dueAt;
  return difference > 0 ? Math.max(1, Math.ceil(difference / 86_400_000)) : 0;
};

const mapTask = (task: BackendTask): Task => {
  const priority = (task.priority || 'MEDIUM') as Task['priority'];
  const status = ((task.status || 'TODO') === 'COMPLETED' ? 'DONE' : task.status || 'TODO') as TaskStatus;
  const rawTaskType = task.taskType || task.type;
  const taskType: Task['taskType'] =
    rawTaskType && ['PLANNING', 'DEVELOPMENT', 'DESIGN', 'MARKETING', 'TESTING', 'OTHER'].includes(rawTaskType)
      ? rawTaskType as Task['taskType']
      : 'OTHER';
  const calculatedOverdueDays = overdueDaysFromDeadline(task.deadline, status);
  const overdueDays = Math.max(task.overdueDays ?? (task.overdue ? 1 : 0), calculatedOverdueDays);
  return {
    id: task.id,
    project_id: task.projectId ?? task.project_id,
    projectId: task.projectId ?? task.project_id,
    project_name: task.projectName,
    projectName: task.projectName,
    title: task.title,
    description: task.description || '',
    priority,
    status,
    statusNote: task.statusNote,
    task_type: taskType,
    taskType,
    is_important: priority === 'HIGH' || priority === 'URGENT',
    isImportant: priority === 'HIGH' || priority === 'URGENT',
    is_urgent: priority === 'URGENT',
    isUrgent: priority === 'URGENT',
    progress_percent: task.progressPercent ?? task.progress_percent ?? (status === 'DONE' ? 100 : 0),
    progressPercent: task.progressPercent ?? task.progress_percent ?? (status === 'DONE' ? 100 : 0),
    assignee_id: task.assigneeId ?? 0,
    assigneeId: task.assigneeId ?? 0,
    assignee_name: task.assigneeName,
    assigneeName: task.assigneeName,
    follower_ids: task.followers?.map((user) => user.id) || [],
    followerIds: task.followers?.map((user) => String(user.id)) || [],
    followerNames: task.followers?.map((user) => user.fullName || `User ${user.id}`) || [],
    dependencyIds: task.dependencies?.map((dependency) => String(dependency.id)) || [],
    dependencyTitles: task.dependencies?.map((dependency) => dependency.title || `Task #${dependency.id}`) || [],
    createdByName: task.createdByName,
    start_date: task.startDate || task.start_date,
    startDate: task.startDate || task.start_date,
    deadline: task.deadline || '',
    dueDate: task.deadline || '',
    overdueDays,
    overdue_days: overdueDays,
    department_id: task.departmentId,
    departmentId: task.departmentId,
    departmentName: task.departmentName,
  };
};

const unwrapTask = (response: ApiResponse<BackendTask>): Task =>
  mapTask(unwrapResponse(response));

type TaskUpdateData = Partial<TaskFormData> & { progressPercent?: number };

const toBackendTask = (data: TaskUpdateData) => ({
  projectId: data.projectId ? Number(data.projectId) : undefined,
  title: data.title,
  description: data.description || undefined,
  priority: data.priority,
  assigneeId: data.assigneeId ? Number(data.assigneeId) : undefined,
  startDate: data.startDate ? `${data.startDate}T00:00:00` : undefined,
  deadline: data.dueDate ? `${data.dueDate}T23:59:59` : undefined,
  followerUserIds: data.followerIds?.map(Number),
  dependencyTaskIds: data.dependencyIds?.map(Number),
  progressPercent: data.progressPercent,
});

export const taskApi = {
  getTasks: async (params?: Partial<GlobalFilterParams>): Promise<Task[]> => {
    const requestedProjectId = params?.projectId && params.projectId !== 'ALL'
      ? Number(params.projectId)
      : undefined;
    let projectIds = requestedProjectId ? [requestedProjectId] : [];

    if (!requestedProjectId) {
      const projectsResponse = await apiClient.get<ApiResponse<{ content?: Array<{ id: number }> }>>('/projects', {
        params: { page: 0, size: 1000, sort: 'id,desc' },
      });
      const projectsData = unwrapResponse(projectsResponse.data);
      projectIds = projectsData.content?.map((project) => project.id) || [];
    }

    const responses = await Promise.all(projectIds.map((projectId) =>
      apiClient.get<ApiResponse<{ content?: BackendTask[] } | BackendTask[]>>('/tasks', {
        params: {
          projectId,
          status: params?.status && params.status !== 'ALL' ? params.status : undefined,
          listOnly: true,
          page: 0,
          size: 1000,
          sort: 'id,desc',
        },
      })
    ));
    const tasks = responses.flatMap((response) => {
      const data = unwrapResponse(response.data);
      return Array.isArray(data) ? data : data.content || [];
    });
    const term = params?.searchTerm?.toLowerCase();

    let mappedTasks = tasks.map(mapTask);
    // Deployed API versions may not include department fields in TaskResponse.
    // Enrich tasks from the user directory so the table always shows the
    // assignee's current department during a backend rollout.
    if (mappedTasks.some((task) => task.assigneeId && !task.departmentName)) {
      try {
        const users = await userApi.getUsers();
        const usersById = new Map(users.map((user) => [String(user.id), user]));
        mappedTasks = mappedTasks.map((task) => {
          const assignee = usersById.get(String(task.assigneeId));
          return assignee?.departmentName
            ? { ...task, departmentId: assignee.departmentId, department_id: assignee.department_id, departmentName: assignee.departmentName, department_name: assignee.department_name }
            : task;
        });
      } catch {
        // The task list remains available if the directory request is forbidden.
      }
    }

    return mappedTasks
      .filter((task) => !term || `${task.title} ${task.assigneeName || ''} ${task.projectName || ''}`.toLowerCase().includes(term))
      .filter((task) => !params?.assigneeId || params.assigneeId === 'ALL' || String(task.assigneeId) === params.assigneeId)
      .filter((task) => !params?.priority || params.priority === 'ALL' || task.priority === params.priority)
      .filter((task) => !params?.status || params.status === 'ALL' || task.status === params.status)
      .filter((task) => !params?.projectId || params.projectId === 'ALL' || String(task.projectId) === String(params.projectId))
      .filter((task) => !params?.departmentId || params.departmentId === 'ALL' || String(task.departmentId ?? task.department_id) === String(params.departmentId))
      .filter((task) => !params?.taskType || params.taskType === 'ALL' || task.taskType === params.taskType)
      .filter((task) => !params?.fromDate || String(task.deadline || task.dueDate || '').slice(0, 10) >= params.fromDate)
      .filter((task) => !params?.toDate || String(task.deadline || task.dueDate || '').slice(0, 10) <= params.toDate)
      .filter((task) => !params?.onlyOverdue || task.overdueDays! > 0);
  },

  createTask: async (data: TaskFormData): Promise<Task> => {
    const response = await apiClient.post<ApiResponse<BackendTask>>('/tasks', toBackendTask(data));
    return unwrapTask(response.data);
  },

  updateTask: async (id: number | string, data: TaskUpdateData): Promise<Task> => {
    const response = await apiClient.put<ApiResponse<BackendTask>>(`/tasks/${id}`, toBackendTask(data));
    return unwrapTask(response.data);
  },

  reassignTask: async (data: ReassignFormData): Promise<Task> => {
    const response = await apiClient.patch<ApiResponse<BackendTask>>(`/tasks/${data.taskId}/assign`, {
      assigneeId: Number(data.newAssigneeId),
      note: data.reason || undefined,
    });
    return unwrapTask(response.data);
  },

  addFollower: async (taskId: number | string, userId: number | string): Promise<Task> => {
    const response = await apiClient.post<ApiResponse<BackendTask>>(`/tasks/${taskId}/followers/${userId}`);
    return unwrapTask(response.data);
  },

  removeFollower: async (taskId: number | string, userId: number | string): Promise<Task> => {
    const response = await apiClient.delete<ApiResponse<BackendTask>>(`/tasks/${taskId}/followers/${userId}`);
    return unwrapTask(response.data);
  },

  updateTaskStatus: async (taskId: number | string, status: TaskStatus, note?: string): Promise<Task> => {
    const backendStatus = status === 'DONE' ? 'COMPLETED' : status;
    const response = await apiClient.patch<ApiResponse<BackendTask>>(`/tasks/${taskId}/status`, { status: backendStatus, note: note?.trim() || undefined });
    return unwrapTask(response.data);
  },

  updateTaskProgress: async (
    taskId: number | string,
    progressPercent: number,
    status: TaskStatus,
    task: Task,
  ): Promise<Task> => {
    const response = await apiClient.put<ApiResponse<BackendTask>>(`/tasks/${taskId}`, {
      projectId: Number(task.projectId ?? task.project_id),
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      status,
      assigneeId: Number(task.assigneeId ?? task.assignee_id) || undefined,
      startDate: task.startDate || task.start_date
        ? `${String(task.startDate || task.start_date).slice(0, 10)}T00:00:00`
        : undefined,
      deadline: (task.deadline || task.dueDate)
        ? `${String(task.deadline || task.dueDate).slice(0, 10)}T23:59:59`
        : undefined,
      followerUserIds: (task.followerIds ?? task.follower_ids ?? []).map(Number),
      dependencyTaskIds: (task.dependencyIds ?? []).map(Number),
      progressPercent,
    });
    if (!response.data) {
      return { ...task, progressPercent, progress_percent: progressPercent, status };
    }
    const payload = response.data as ApiResponse<BackendTask> | BackendTask;
    if ('success' in payload) {
      return unwrapTask(response.data as ApiResponse<BackendTask>);
    }
    return mapTask(payload as BackendTask);
  },

  deleteTask: async (id: number | string): Promise<{ success: boolean }> => {
    await apiClient.delete(`/tasks/${id}`);
    return { success: true };
  },

  rescheduleTask: async (task: Task, startDate: string, deadline: string, changeReason: string): Promise<Task> => {
    const response = await apiClient.put<ApiResponse<BackendTask>>(`/tasks/${task.id}`, {
      projectId: Number(task.projectId ?? task.project_id),
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      assigneeId: Number(task.assigneeId ?? task.assignee_id) || undefined,
      startDate: `${startDate}T00:00:00`,
      deadline: `${deadline}T23:59:59`,
      followerUserIds: (task.followerIds ?? task.follower_ids ?? []).map(Number),
      dependencyTaskIds: (task.dependencyIds ?? []).map(Number),
      changeReason,
    });
    return unwrapTask(response.data);
  },
};
