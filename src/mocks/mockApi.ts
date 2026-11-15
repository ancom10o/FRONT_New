import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  ChecklistItem,
  EvidenceAttachment,
  ProjectCompletionRequest,
  ProjectMembership,
  ProjectRole,
  ProjectStatus,
  ReviewSubmission,
  Role,
  TaskComment,
  TaskFollower,
  TaskPriority,
  TaskStatus,
} from '../types';

const STORAGE_KEY = 'hrm-p0-mock-database-v1';
const TOKEN_PREFIX = 'mock-user-';
const DEMO_PASSWORD = 'demo123';

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

export interface MockUser {
  id: number;
  fullName: string;
  email: string;
  departmentId: number | null;
  systemRole: Role;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface MockDepartment {
  id: number;
  name: string;
  description: string;
  managerId: number | null;
}

export interface MockProject {
  id: number;
  projectCode: string;
  name: string;
  description: string;
  leaderId: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  createdBy: number;
  deletedAt: string | null;
}

export interface MockTask {
  id: number;
  projectId: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: number | null;
  plannedStartDate: string;
  deadline: string;
  createdBy: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockAuditEvent {
  id: string;
  actorId: number;
  action: string;
  entityType: 'PROJECT' | 'TASK';
  entityId: number;
  detail: string;
  createdAt: string;
}

export interface MockDatabase {
  users: MockUser[];
  departments: MockDepartment[];
  projects: MockProject[];
  projectMemberships: ProjectMembership[];
  tasks: MockTask[];
  taskDependencies: Array<{ taskId: number; dependsOnTaskId: number }>;
  followers: TaskFollower[];
  checklistItems: ChecklistItem[];
  comments: TaskComment[];
  evidence: EvidenceAttachment[];
  reviewSubmissions: ReviewSubmission[];
  completionRequests: ProjectCompletionRequest[];
  audit: MockAuditEvent[];
  counters: Record<string, number>;
}

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const initialDatabase = (): MockDatabase => ({
  users: [
    { id: 1, fullName: 'Admin Hệ thống', email: 'admin@demo.local', departmentId: 1, systemRole: 'ADMIN', status: 'ACTIVE' },
    { id: 2, fullName: 'Nguyễn Minh Leader', email: 'leader@demo.local', departmentId: 1, systemRole: 'MANAGER', status: 'ACTIVE' },
    { id: 3, fullName: 'Trần Anh Reviewer', email: 'reviewer@demo.local', departmentId: 1, systemRole: 'MANAGER', status: 'ACTIVE' },
    { id: 4, fullName: 'Lê An Assignee', email: 'assignee@demo.local', departmentId: 1, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
    { id: 5, fullName: 'Phạm Bình Follower', email: 'follower@demo.local', departmentId: 2, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
  ],
  departments: [
    { id: 1, name: 'Phòng Công nghệ', description: 'Phát triển sản phẩm', managerId: 2 },
    { id: 2, name: 'Phòng Vận hành', description: 'Vận hành và kiểm thử', managerId: 3 },
  ],
  projects: [
    {
      id: 1,
      projectCode: 'PRJ-DEMO-001',
      name: 'Nền tảng quản lý công việc',
      description: 'Dự án mẫu cho luồng P0 end-to-end',
      leaderId: 2,
      status: 'ACTIVE',
      startDate: today(),
      endDate: '2027-03-31',
      createdBy: 1,
      deletedAt: null,
    },
  ],
  projectMemberships: [
    { id: 'pm-1', projectId: 1, userId: 2, projectRole: 'MEMBER', joinedAt: now(), leftAt: null },
    { id: 'pm-2', projectId: 1, userId: 3, projectRole: 'PROJECT_MANAGER', joinedAt: now(), leftAt: null },
    { id: 'pm-3', projectId: 1, userId: 4, projectRole: 'MEMBER', joinedAt: now(), leftAt: null },
    { id: 'pm-4', projectId: 1, userId: 5, projectRole: 'MEMBER', joinedAt: now(), leftAt: null },
  ],
  tasks: [
    {
      id: 1,
      projectId: 1,
      title: 'Hoàn thiện luồng phê duyệt công việc',
      description: 'Task demo có checklist, follower, review và lịch sử từ chối.',
      priority: 'HIGH',
      status: 'TODO',
      assigneeId: 4,
      plannedStartDate: today(),
      deadline: '2027-02-28',
      createdBy: 2,
      deletedAt: null,
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  taskDependencies: [],
  followers: [
    { id: 'tf-1', taskId: 1, userId: 4, joinedAt: now(), leftAt: null },
    { id: 'tf-2', taskId: 1, userId: 5, joinedAt: now(), leftAt: null },
  ],
  checklistItems: [
    { id: 'cl-1', taskId: 1, title: 'Xác minh quyền theo project', completed: false, completedBy: null, completedAt: null, deletedAt: null, deletedBy: null },
    { id: 'cl-2', taskId: 1, title: 'Đính kèm minh chứng kiểm thử', completed: false, completedBy: null, completedAt: null, deletedAt: null, deletedBy: null },
  ],
  comments: [],
  evidence: [],
  reviewSubmissions: [],
  completionRequests: [],
  audit: [],
  counters: { users: 5, departments: 2, projects: 1, tasks: 1, comments: 0, evidence: 0, reviews: 0, completions: 0, memberships: 4, followers: 2, checklist: 2, audit: 0 },
});

const enrichDemoData = (database: MockDatabase) => {
  if (database.projects.some((project) => project.projectCode === 'PRJ-DEMO-105')) return false;
  const seededAt = '2026-11-01T08:00:00.000Z';
  const users: MockUser[] = [
    { id: 101, fullName: 'Đỗ Hoàng Nam', email: 'nam.do@demo.local', departmentId: 1, systemRole: 'MANAGER', status: 'ACTIVE' },
    { id: 102, fullName: 'Vũ Thu Hà', email: 'ha.vu@demo.local', departmentId: 3, systemRole: 'MANAGER', status: 'ACTIVE' },
    { id: 103, fullName: 'Nguyễn Quốc Bảo', email: 'bao.nguyen@demo.local', departmentId: 1, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
    { id: 104, fullName: 'Lâm Ngọc Mai', email: 'mai.lam@demo.local', departmentId: 2, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
    { id: 105, fullName: 'Phan Đức Long', email: 'long.phan@demo.local', departmentId: 3, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
    { id: 106, fullName: 'Trương Khánh Linh', email: 'linh.truong@demo.local', departmentId: 4, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
    { id: 107, fullName: 'Bùi Gia Huy', email: 'huy.bui@demo.local', departmentId: 4, systemRole: 'EMPLOYEE', status: 'ACTIVE' },
  ];
  users.forEach((user) => { if (!database.users.some((item) => item.email === user.email)) database.users.push(user); });
  [
    { id: 3, name: 'Phòng Sản phẩm', description: 'Nghiên cứu và phát triển sản phẩm', managerId: 102 },
    { id: 4, name: 'Phòng Kinh doanh', description: 'Tăng trưởng và chăm sóc khách hàng', managerId: 101 },
  ].forEach((department) => { if (!database.departments.some((item) => item.id === department.id)) database.departments.push(department); });
  const projects: MockProject[] = [
    { id: 101, projectCode: 'PRJ-DEMO-101', name: 'Ứng dụng khách hàng WorkSphere', description: 'Xây dựng trải nghiệm self-service đa nền tảng cho khách hàng doanh nghiệp.', leaderId: 2, status: 'ACTIVE', startDate: '2026-09-01', endDate: '2027-02-28', createdBy: 1, deletedAt: null },
    { id: 102, projectCode: 'PRJ-DEMO-102', name: 'Tự động hóa vận hành nội bộ', description: 'Chuẩn hóa quy trình vận hành và giảm thao tác thủ công giữa các phòng ban.', leaderId: 3, status: 'ACTIVE', startDate: '2026-10-05', endDate: '2027-04-15', createdBy: 1, deletedAt: null },
    { id: 103, projectCode: 'PRJ-DEMO-103', name: 'Ra mắt sản phẩm Enterprise 2027', description: 'Chuẩn bị chiến lược sản phẩm, go-to-market và chương trình khách hàng thử nghiệm.', leaderId: 102, status: 'PLANNING', startDate: '2026-12-01', endDate: '2027-07-31', createdBy: 1, deletedAt: null },
    { id: 104, projectCode: 'PRJ-DEMO-104', name: 'Nâng cấp hạ tầng dữ liệu', description: 'Tối ưu hiệu năng báo cáo, chất lượng dữ liệu và khả năng quan sát hệ thống.', leaderId: 101, status: 'FROZEN', startDate: '2026-08-15', endDate: '2027-01-31', createdBy: 1, deletedAt: null },
    { id: 105, projectCode: 'PRJ-DEMO-105', name: 'Cổng thông tin nhân sự', description: 'Số hóa quy trình hồ sơ và dịch vụ nhân sự cho toàn công ty.', leaderId: 3, status: 'COMPLETED', startDate: '2026-05-01', endDate: '2026-10-31', createdBy: 1, deletedAt: null },
  ];
  projects.forEach((project) => database.projects.push(project));
  const memberships: Array<[number, number, ProjectRole]> = [
    [101, 2, 'MEMBER'], [101, 3, 'PROJECT_MANAGER'], [101, 4, 'MEMBER'], [101, 5, 'MEMBER'], [101, 103, 'MEMBER'], [101, 104, 'MEMBER'],
    [102, 3, 'MEMBER'], [102, 2, 'PROJECT_MANAGER'], [102, 4, 'MEMBER'], [102, 5, 'MEMBER'], [102, 104, 'MEMBER'], [102, 105, 'MEMBER'],
    [103, 102, 'MEMBER'], [103, 2, 'PROJECT_MANAGER'], [103, 103, 'MEMBER'], [103, 105, 'MEMBER'], [103, 106, 'MEMBER'], [103, 107, 'MEMBER'],
    [104, 101, 'MEMBER'], [104, 2, 'PROJECT_MANAGER'], [104, 103, 'MEMBER'], [104, 104, 'MEMBER'], [104, 106, 'MEMBER'],
    [105, 3, 'MEMBER'], [105, 2, 'PROJECT_MANAGER'], [105, 4, 'MEMBER'], [105, 5, 'MEMBER'], [105, 107, 'MEMBER'],
  ];
  memberships.forEach(([projectId, userId, projectRole], index) => database.projectMemberships.push({ id: `seed-pm-${index + 1}`, projectId, userId, projectRole, joinedAt: seededAt, leftAt: null }));
  const taskRows: Array<[number, number, string, string, TaskPriority, TaskStatus, number | null, string, string]> = [
    [1001,101,'Khảo sát hành trình khách hàng','Tổng hợp nhu cầu và điểm nghẽn hiện tại.','HIGH','DONE',103,'2026-09-01','2026-09-12'],
    [1002,101,'Thiết kế hệ thống Design Token','Chuẩn hóa token cho web và mobile.','MEDIUM','DONE',104,'2026-09-08','2026-10-02'],
    [1003,101,'Xây dựng luồng đăng ký doanh nghiệp','Đăng ký, xác thực và khởi tạo workspace.','URGENT','IN_PROGRESS',4,'2026-10-01','2026-11-25'],
    [1004,101,'Phát triển trang quản trị tài khoản','Quản lý hồ sơ, bảo mật và phiên đăng nhập.','HIGH','REVIEW',103,'2026-10-20','2026-11-18'],
    [1005,101,'Tích hợp thông báo đa kênh','Email và thông báo trong ứng dụng.','MEDIUM','TODO',5,'2026-11-20','2026-12-20'],
    [1006,101,'Kiểm thử nghiệm thu phiên bản beta','Kịch bản UAT với nhóm khách hàng thử nghiệm.','HIGH','TODO',104,'2027-01-10','2027-02-15'],
    [1011,102,'Lập bản đồ quy trình vận hành','Mô hình hóa các quy trình liên phòng ban.','HIGH','DONE',104,'2026-10-05','2026-10-28'],
    [1012,102,'Thiết kế workflow phê duyệt chi phí','Xây dựng luồng phê duyệt nhiều cấp.','URGENT','IN_PROGRESS',4,'2026-10-25','2026-12-05'],
    [1013,102,'Tự động đồng bộ dữ liệu CRM','Đồng bộ khách hàng và cơ hội bán hàng.','HIGH','IN_PROGRESS',105,'2026-11-01','2027-01-15'],
    [1014,102,'Dashboard SLA vận hành','Theo dõi thời gian xử lý và cảnh báo vi phạm.','MEDIUM','REVIEW',5,'2026-11-10','2026-12-01'],
    [1015,102,'Đào tạo nhóm vận hành','Tài liệu và chương trình đào tạo người dùng.','LOW','TODO',104,'2027-02-01','2027-03-15'],
    [1021,103,'Nghiên cứu phân khúc Enterprise','Phỏng vấn khách hàng và phân tích thị trường.','HIGH','TODO',103,'2026-12-01','2027-01-20'],
    [1022,103,'Xây dựng product positioning','Thông điệp giá trị và lợi thế cạnh tranh.','HIGH','TODO',105,'2027-01-05','2027-02-10'],
    [1023,103,'Thiết kế chương trình Early Access','Tiêu chí lựa chọn và vận hành thử nghiệm.','MEDIUM','TODO',106,'2027-02-01','2027-03-20'],
    [1024,103,'Phát triển bộ sales enablement','Demo, tài liệu và playbook bán hàng.','MEDIUM','TODO',107,'2027-03-01','2027-05-10'],
    [1025,103,'Chiến dịch ra mắt đa kênh','Kế hoạch nội dung và sự kiện ra mắt.','URGENT','TODO',105,'2027-04-15','2027-07-15'],
    [1031,104,'Đánh giá chất lượng dữ liệu','Đo độ đầy đủ và nhất quán của dữ liệu nguồn.','HIGH','DONE',103,'2026-08-15','2026-09-15'],
    [1032,104,'Thiết kế Data Warehouse thế hệ mới','Mô hình dữ liệu phân tích dùng chung.','URGENT','IN_PROGRESS',106,'2026-09-01','2026-12-31'],
    [1033,104,'Tối ưu pipeline báo cáo','Giảm thời gian xử lý batch và dashboard.','HIGH','TODO',104,'2026-11-01','2027-01-20'],
    [1034,104,'Thiết lập giám sát chất lượng dữ liệu','Rule, cảnh báo và dashboard chất lượng.','MEDIUM','TODO',103,'2026-12-01','2027-01-31'],
    [1041,105,'Chuẩn hóa hồ sơ nhân sự','Rà soát biểu mẫu và dữ liệu hồ sơ.','MEDIUM','DONE',4,'2026-05-01','2026-06-15'],
    [1042,105,'Phát triển cổng self-service','Tra cứu hồ sơ, đơn từ và chính sách.','HIGH','DONE',5,'2026-06-01','2026-08-31'],
    [1043,105,'Số hóa quy trình nghỉ phép','Đăng ký, phê duyệt và đồng bộ phép.','HIGH','DONE',107,'2026-07-15','2026-09-15'],
    [1044,105,'Nghiệm thu và bàn giao','UAT, tài liệu vận hành và bàn giao.','URGENT','DONE',4,'2026-09-16','2026-10-31'],
  ];
  taskRows.forEach(([id, projectId, title, description, priority, status, assigneeId, plannedStartDate, deadline]) => database.tasks.push({ id, projectId, title, description, priority, status, assigneeId, plannedStartDate, deadline, createdBy: database.projects.find((project) => project.id === projectId)?.leaderId || 2, deletedAt: null, createdAt: seededAt, updatedAt: status === 'DONE' ? `${deadline}T17:00:00.000Z` : seededAt }));
  taskRows.forEach(([taskId, , taskTitle, , , status, assigneeId], taskIndex) => {
    if (assigneeId) database.followers.push({ id: `seed-tf-${taskId}-a`, taskId, userId: assigneeId, joinedAt: seededAt, leftAt: null });
    const projectId = database.tasks.find((task) => task.id === taskId)?.projectId;
    const extraFollower = database.projectMemberships.find((membership) => Number(membership.projectId) === projectId && Number(membership.userId) !== assigneeId && Number(membership.userId) !== 2)?.userId;
    if (extraFollower) database.followers.push({ id: `seed-tf-${taskId}-f`, taskId, userId: extraFollower, joinedAt: seededAt, leftAt: null });
    ['Hoàn thiện nội dung chính', 'Kiểm tra và xác nhận kết quả'].forEach((title, itemIndex) => {
      const completed = status === 'DONE' || status === 'REVIEW' || (status === 'IN_PROGRESS' && itemIndex === 0);
      database.checklistItems.push({ id: `seed-cl-${taskId}-${itemIndex + 1}`, taskId, title, completed, completedBy: completed ? assigneeId : null, completedAt: completed ? seededAt : null, deletedAt: null, deletedBy: null });
    });
    if (taskIndex < 12) database.audit.push({ id: `seed-audit-${taskId}`, actorId: assigneeId || 2, action: status === 'DONE' ? 'REVIEW_APPROVED' : status === 'REVIEW' ? 'REVIEW_SUBMITTED' : status === 'IN_PROGRESS' ? 'TASK_STARTED' : 'TASK_UPDATED', entityType: 'TASK', entityId: taskId, detail: `Cập nhật ${taskTitle}`, createdAt: seededAt });
  });
  database.taskDependencies.push(
    { taskId: 1003, dependsOnTaskId: 1002 }, { taskId: 1004, dependsOnTaskId: 1003 }, { taskId: 1006, dependsOnTaskId: 1005 },
    { taskId: 1013, dependsOnTaskId: 1011 }, { taskId: 1014, dependsOnTaskId: 1012 }, { taskId: 1022, dependsOnTaskId: 1021 },
    { taskId: 1023, dependsOnTaskId: 1022 }, { taskId: 1025, dependsOnTaskId: 1024 }, { taskId: 1033, dependsOnTaskId: 1032 },
  );
  return true;
};

const load = (): MockDatabase => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { const database = initialDatabase(); enrichDemoData(database); return database; }
    const parsed = JSON.parse(raw) as MockDatabase;
    parsed.taskDependencies ||= [];
    if (enrichDemoData(parsed)) localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    const database = initialDatabase(); enrichDemoData(database); return database;
  }
};

const save = (database: MockDatabase) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  window.dispatchEvent(new CustomEvent('hrm-mock-updated'));
};

const next = (database: MockDatabase, key: string) => {
  database.counters[key] = (database.counters[key] || 0) + 1;
  return database.counters[key];
};

function fail(message: string): never {
  throw new Error(message);
}
const activeUser = (database: MockDatabase, userId: number) => {
  const user = database.users.find((item) => item.id === userId && item.status === 'ACTIVE');
  return user || fail('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
};
const activeProject = (database: MockDatabase, projectId: number) => {
  const project = database.projects.find((item) => item.id === projectId && !item.deletedAt);
  return project || fail('Không tìm thấy dự án.');
};
const activeTask = (database: MockDatabase, taskId: number) => {
  const task = database.tasks.find((item) => item.id === taskId && !item.deletedAt);
  return task || fail('Không tìm thấy công việc.');
};
const activeMembership = (database: MockDatabase, projectId: number, userId: number) =>
  database.projectMemberships.find((item) => Number(item.projectId) === projectId && Number(item.userId) === userId && !item.leftAt);
const isProjectOperator = (database: MockDatabase, project: MockProject, userId: number) => {
  if (project.leaderId === userId) return true;
  return activeMembership(database, project.id, userId)?.projectRole === 'PROJECT_MANAGER';
};
const isActiveFollower = (database: MockDatabase, taskId: number, userId: number) =>
  database.followers.some((item) => Number(item.taskId) === taskId && Number(item.userId) === userId && !item.leftAt);
const assertProjectAccess = (database: MockDatabase, project: MockProject, userId: number) => {
  const user = activeUser(database, userId);
  if (user.systemRole !== 'ADMIN' && !activeMembership(database, project.id, userId)) fail('Bạn không phải thành viên đang hoạt động của dự án.');
};
const assertProjectEditable = (project: MockProject) => {
  if (project.status !== 'ACTIVE') fail('Dự án hiện không ở trạng thái ACTIVE để thao tác công việc.');
};
const addAudit = (database: MockDatabase, actorId: number, action: string, entityType: 'PROJECT' | 'TASK', entityId: number, detail: string) => {
  database.audit.unshift({ id: `audit-${next(database, 'audit')}`, actorId, action, entityType, entityId, detail, createdAt: now() });
};

const userIdFromToken = () => {
  const token = localStorage.getItem('accessToken') || '';
  const id = Number(token.replace(TOKEN_PREFIX, ''));
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const mockCoreApi = {
  credentials: [
    { role: 'ADMIN', email: 'admin@demo.local', password: DEMO_PASSWORD },
    { role: 'LEADER', email: 'leader@demo.local', password: DEMO_PASSWORD },
    { role: 'REVIEWER', email: 'reviewer@demo.local', password: DEMO_PASSWORD },
    { role: 'ASSIGNEE', email: 'assignee@demo.local', password: DEMO_PASSWORD },
    { role: 'FOLLOWER', email: 'follower@demo.local', password: DEMO_PASSWORD },
  ],

  reset() {
    const database = initialDatabase();
    enrichDemoData(database);
    save(database);
    return clone(database);
  },

  snapshot() {
    return clone(load());
  },

  login(email: string, password: string) {
    const database = load();
    const user = database.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.status === 'ACTIVE');
    if (!user || password !== DEMO_PASSWORD) fail('Tài khoản demo hoặc mật khẩu không đúng.');
    return { token: `${TOKEN_PREFIX}${user.id}`, tokenType: 'Bearer', userId: user.id, fullName: user.fullName, email: user.email, systemRole: user.systemRole, departmentId: user.departmentId ?? undefined };
  },

  currentUser() {
    const id = userIdFromToken();
    if (!id) fail('Phiên mock không hợp lệ.');
    return clone(activeUser(load(), id));
  },

  startTask(taskId: number) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    assertProjectEditable(project);
    if (task.status !== 'TODO') fail('Chỉ Task TODO mới có thể bắt đầu.');
    if (task.assigneeId !== actor.id) fail('Chỉ Assignee được bắt đầu công việc.');
    const unfinishedDependency = database.taskDependencies.find((item) => item.taskId === task.id && activeTask(database, item.dependsOnTaskId).status !== 'DONE');
    if (unfinishedDependency) fail('Phải hoàn thành toàn bộ Task phụ thuộc trước khi bắt đầu.');
    task.status = 'IN_PROGRESS';
    task.updatedAt = now();
    addAudit(database, actor.id, 'TASK_STARTED', 'TASK', task.id, 'TODO → IN_PROGRESS');
    save(database);
    return clone(task);
  },

  toggleChecklist(itemId: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const item = database.checklistItems.find((entry) => entry.id === itemId && !entry.deletedAt) || fail('Không tìm thấy checklist item đang hoạt động.');
    const task = activeTask(database, Number(item.taskId));
    if (task.status !== 'IN_PROGRESS') fail('Checklist chỉ được cập nhật khi Task đang IN_PROGRESS.');
    if (!isActiveFollower(database, task.id, actor.id)) fail('Chỉ follower đang hoạt động được cập nhật checklist.');
    item.completed = !item.completed;
    item.completedBy = item.completed ? actor.id : null;
    item.completedAt = item.completed ? now() : null;
    addAudit(database, actor.id, 'CHECKLIST_UPDATED', 'TASK', task.id, item.title);
    save(database);
    return clone(item);
  },

  addChecklistItem(taskId: number, title: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Project Leader/Project Manager được thêm checklist.');
    if (!['TODO', 'IN_PROGRESS'].includes(task.status)) fail('Checklist chỉ được chỉnh sửa khi Task TODO hoặc IN_PROGRESS.');
    const normalized = title.trim();
    if (!normalized) fail('Nội dung checklist không được để trống.');
    const item: ChecklistItem = { id: `cl-${next(database, 'checklist')}`, taskId, title: normalized, completed: false, completedBy: null, completedAt: null, deletedAt: null, deletedBy: null };
    database.checklistItems.push(item);
    addAudit(database, actor.id, 'CHECKLIST_ITEM_ADDED', 'TASK', task.id, normalized);
    save(database); return clone(item);
  },

  removeChecklistItem(itemId: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const item = database.checklistItems.find((entry) => entry.id === itemId && !entry.deletedAt) || fail('Không tìm thấy checklist item đang hoạt động.');
    const task = activeTask(database, Number(item.taskId));
    const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Project Leader/Project Manager được xóa checklist.');
    if (!['TODO', 'IN_PROGRESS'].includes(task.status)) fail('Checklist không thể chỉnh sửa khi Task REVIEW hoặc DONE.');
    item.deletedAt = now(); item.deletedBy = actor.id;
    addAudit(database, actor.id, 'CHECKLIST_ITEM_REMOVED', 'TASK', task.id, item.title);
    save(database); return clone(item);
  },

  addFollower(taskId: number, userId: number) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Project Leader/Project Manager được thêm Follower.');
    if (!['TODO', 'IN_PROGRESS'].includes(task.status)) fail('Follower chỉ được thay đổi khi Task TODO hoặc IN_PROGRESS.');
    if (!activeMembership(database, project.id, userId)) fail('Follower phải là thành viên đang hoạt động của dự án.');
    if (isActiveFollower(database, task.id, userId)) fail('Người dùng đã là Follower của Task.');
    const follower: TaskFollower = { id: `tf-${next(database, 'followers')}`, taskId, userId, joinedAt: now(), leftAt: null };
    database.followers.push(follower);
    addAudit(database, actor.id, 'TASK_FOLLOWER_ADDED', 'TASK', task.id, `Follower ${userId}`);
    save(database); return clone(follower);
  },

  removeFollower(taskId: number, userId: number) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Project Leader/Project Manager được xóa Follower.');
    if (!['TODO', 'IN_PROGRESS'].includes(task.status)) fail('Follower chỉ được thay đổi khi Task TODO hoặc IN_PROGRESS.');
    if (task.assigneeId === userId) fail('Không thể xóa Assignee hiện tại khỏi danh sách Follower.');
    const follower = database.followers.find((item) => Number(item.taskId) === taskId && Number(item.userId) === userId && !item.leftAt) || fail('Follower không còn hoạt động trong Task.');
    follower.leftAt = now();
    addAudit(database, actor.id, 'TASK_FOLLOWER_REMOVED', 'TASK', task.id, `Follower ${userId}`);
    save(database); return clone(follower);
  },

  addEvidence(taskId: number, fileName: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    if (task.status !== 'IN_PROGRESS') fail('Chỉ được tải minh chứng khi Task đang IN_PROGRESS.');
    if (!isActiveFollower(database, task.id, actor.id)) fail('Chỉ follower đang hoạt động được tải minh chứng.');
    const attachment: EvidenceAttachment = { id: `ev-${next(database, 'evidence')}`, taskId, fileName: fileName.trim() || 'minh-chung.txt', version: 1, uploadedBy: actor.id, uploadedAt: now() };
    database.evidence.push(attachment);
    addAudit(database, actor.id, 'EVIDENCE_UPLOADED', 'TASK', task.id, attachment.fileName);
    save(database);
    return clone(attachment);
  },

  addComment(taskId: number, content: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    assertProjectAccess(database, project, actor.id);
    if (!content.trim()) fail('Nội dung bình luận không được để trống.');
    const comment: TaskComment = { id: `comment-${next(database, 'comments')}`, taskId, authorId: actor.id, content: content.trim(), createdAt: now() };
    database.comments.push(comment);
    save(database);
    return clone(comment);
  },

  submitReview(taskId: number) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    assertProjectEditable(project);
    if (task.assigneeId !== actor.id) fail('Chỉ Assignee được gửi REVIEW.');
    if (task.status !== 'IN_PROGRESS') fail('Task phải ở IN_PROGRESS trước khi gửi REVIEW.');
    const checklist = database.checklistItems.filter((item) => Number(item.taskId) === task.id && !item.deletedAt);
    if (checklist.some((item) => !item.completed)) fail('Checklist phải hoàn thành 100% trước khi gửi REVIEW.');
    const submission: ReviewSubmission = {
      id: `review-${next(database, 'reviews')}`,
      taskId: task.id,
      submittedBy: actor.id,
      submittedAt: now(),
      deadlineSnapshot: task.deadline,
      checklistSnapshot: clone(checklist),
      evidenceSnapshot: clone(database.evidence.filter((item) => Number(item.taskId) === task.id)),
      decision: 'PENDING',
      decidedBy: null,
      decidedAt: null,
      reason: null,
    };
    database.reviewSubmissions.push(submission);
    task.status = 'REVIEW';
    task.updatedAt = now();
    addAudit(database, actor.id, 'REVIEW_SUBMITTED', 'TASK', task.id, submission.id);
    save(database);
    return clone(submission);
  },

  decideReview(taskId: number, decision: 'APPROVED' | 'REJECTED', reason: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const task = activeTask(database, taskId);
    const project = activeProject(database, task.projectId);
    if (actor.systemRole === 'ADMIN') fail('ADMIN không được phê duyệt hoặc từ chối Task REVIEW.');
    if (!isProjectOperator(database, project, actor.id)) fail('Bạn không có quyền review Task trong dự án này.');
    if (task.assigneeId === actor.id) fail('Không được tự phê duyệt Task của chính mình.');
    if (task.status !== 'REVIEW') fail('Task không ở trạng thái REVIEW.');
    if (decision === 'REJECTED' && !reason.trim()) fail('Từ chối REVIEW phải có lý do.');
    const submission = [...database.reviewSubmissions].reverse().find((item) => Number(item.taskId) === task.id && item.decision === 'PENDING') || fail('Không tìm thấy lần gửi REVIEW đang chờ.');
    submission.decision = decision;
    submission.decidedBy = actor.id;
    submission.decidedAt = now();
    submission.reason = reason.trim() || null;
    task.status = decision === 'APPROVED' ? 'DONE' : 'IN_PROGRESS';
    task.updatedAt = now();
    addAudit(database, actor.id, decision === 'APPROVED' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED', 'TASK', task.id, submission.reason || 'Approved');
    save(database);
    return clone(submission);
  },

  requestProjectCompletion(projectId: number) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    const project = activeProject(database, projectId);
    if (project.leaderId !== actor.id) fail('Chỉ Project Leader được gửi yêu cầu hoàn thành dự án.');
    if (project.status !== 'ACTIVE') fail('Chỉ dự án ACTIVE được gửi yêu cầu hoàn thành.');
    const tasks = database.tasks.filter((item) => item.projectId === project.id && !item.deletedAt);
    if (!tasks.length || tasks.some((item) => item.status !== 'DONE')) fail('Dự án phải có Task và tất cả Task phải DONE.');
    if (database.completionRequests.some((item) => Number(item.projectId) === project.id && item.status === 'PENDING')) fail('Dự án đã có yêu cầu đang chờ xử lý.');
    const request: ProjectCompletionRequest = { id: `completion-${next(database, 'completions')}`, projectId, requestedBy: actor.id, requestedAt: now(), status: 'PENDING', decidedBy: null, decidedAt: null, reason: null };
    database.completionRequests.push(request);
    addAudit(database, actor.id, 'PROJECT_COMPLETION_REQUESTED', 'PROJECT', project.id, request.id);
    save(database);
    return clone(request);
  },

  decideProjectCompletion(projectId: number, decision: 'APPROVED' | 'REJECTED', reason: string) {
    const database = load();
    const actor = activeUser(database, userIdFromToken() || 0);
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được xử lý yêu cầu hoàn thành dự án.');
    const project = activeProject(database, projectId);
    const request = [...database.completionRequests].reverse().find((item) => Number(item.projectId) === projectId && item.status === 'PENDING') || fail('Không có yêu cầu hoàn thành đang chờ.');
    if (decision === 'REJECTED' && !reason.trim()) fail('Từ chối yêu cầu phải có lý do.');
    request.status = decision;
    request.decidedBy = actor.id;
    request.decidedAt = now();
    request.reason = reason.trim() || null;
    if (decision === 'APPROVED') project.status = 'COMPLETED';
    addAudit(database, actor.id, decision === 'APPROVED' ? 'PROJECT_COMPLETED' : 'PROJECT_COMPLETION_REJECTED', 'PROJECT', project.id, request.reason || 'Approved');
    save(database);
    return clone(request);
  },
};

const ok = <T,>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse => ({
  data: { success: true, data }, status, statusText: 'OK', headers: {}, config,
});

const backendUser = (database: MockDatabase, user: MockUser) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  departmentId: user.departmentId,
  departmentName: database.departments.find((item) => item.id === user.departmentId)?.name,
  systemRole: user.systemRole,
  status: user.status,
});

const backendProject = (database: MockDatabase, project: MockProject) => {
  const tasks = database.tasks.filter((item) => item.projectId === project.id && !item.deletedAt);
  const done = tasks.filter((item) => item.status === 'DONE').length;
  return {
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    description: project.description,
    leaderId: project.leaderId,
    leaderName: database.users.find((item) => item.id === project.leaderId)?.fullName,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    memberCount: database.projectMemberships.filter((item) => Number(item.projectId) === project.id && !item.leftAt).length,
    totalTasks: tasks.length,
    completedTasks: done,
    progressPercentage: tasks.length ? Math.round(done / tasks.length * 1000) / 10 : 0,
  };
};

const backendTask = (database: MockDatabase, task: MockTask) => ({
  id: task.id,
  projectId: task.projectId,
  projectName: database.projects.find((item) => item.id === task.projectId)?.name,
  title: task.title,
  description: task.description,
  priority: task.priority,
  status: task.status,
  assigneeId: task.assigneeId,
  assigneeName: database.users.find((item) => item.id === task.assigneeId)?.fullName,
  startDate: task.plannedStartDate,
  deadline: `${task.deadline}T23:59:59`,
  followers: database.followers.filter((item) => Number(item.taskId) === task.id && !item.leftAt).map((item) => ({ id: Number(item.userId) })),
  dependencies: database.taskDependencies.filter((item) => item.taskId === task.id).map((item) => ({ id: item.dependsOnTaskId })),
  progressPercent: task.status === 'DONE' ? 100 : database.checklistItems.filter((item) => Number(item.taskId) === task.id && !item.deletedAt).length
    ? Math.round(database.checklistItems.filter((item) => Number(item.taskId) === task.id && !item.deletedAt && item.completed).length / database.checklistItems.filter((item) => Number(item.taskId) === task.id && !item.deletedAt).length * 100)
    : 0,
  overdue: task.status !== 'DONE' && task.deadline < today(),
});

export const mockAxiosAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  const database = load();
  const method = (config.method || 'get').toUpperCase();
  const path = (config.url || '').replace(/^https?:\/\/[^/]+\/api/, '').replace(/^\/api/, '').split('?')[0];
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') as Record<string, unknown> : (config.data || {}) as Record<string, unknown>;
  const actorId = userIdFromToken();

  if (method === 'POST' && path === '/auth/login') return ok(config, mockCoreApi.login(String(body.email || ''), String(body.password || '')));
  if (method === 'GET' && path === '/auth/me') {
    const user = mockCoreApi.currentUser();
    return ok(config, { userId: user.id, fullName: user.fullName, email: user.email, systemRole: user.systemRole, departmentId: user.departmentId ?? undefined });
  }

  if (!actorId) fail('Vui lòng đăng nhập bằng tài khoản demo.');
  const actor = activeUser(database, actorId);

  if (method === 'GET' && path === '/users') return ok(config, { content: database.users.map((item) => backendUser(database, item)) });
  if (method === 'POST' && path === '/users') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được tạo tài khoản.');
    const role = String(body.systemRole || 'EMPLOYEE') as Role;
    if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) fail('Global role không hợp lệ.');
    const user: MockUser = { id: next(database, 'users'), fullName: String(body.fullName || ''), email: String(body.email || ''), departmentId: body.departmentId ? Number(body.departmentId) : null, systemRole: role, status: 'ACTIVE' };
    database.users.push(user); save(database); return ok(config, backendUser(database, user), 201);
  }
  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch && method === 'PUT') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được cập nhật tài khoản.');
    const user = database.users.find((item) => item.id === Number(userMatch[1])) || fail('Không tìm thấy tài khoản.');
    if (body.fullName) user.fullName = String(body.fullName);
    if (body.email) user.email = String(body.email);
    if (body.departmentId !== undefined) user.departmentId = body.departmentId ? Number(body.departmentId) : null;
    if (body.systemRole) user.systemRole = String(body.systemRole) as Role;
    save(database); return ok(config, backendUser(database, user));
  }
  if (userMatch && method === 'DELETE') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được vô hiệu hóa tài khoản.');
    const user = database.users.find((item) => item.id === Number(userMatch[1])) || fail('Không tìm thấy tài khoản.');
    user.status = 'INACTIVE'; save(database); return ok(config, null);
  }

  if (method === 'GET' && path === '/departments') return ok(config, database.departments.map((item) => ({ ...item, managerName: database.users.find((user) => user.id === item.managerId)?.fullName, memberCount: database.users.filter((user) => user.departmentId === item.id && user.status === 'ACTIVE').length })));
  if (method === 'POST' && path === '/departments') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được tạo phòng ban.');
    const name = String(body.name || '').trim();
    if (!name) fail('Tên phòng ban không được để trống.');
    if (database.departments.some((item) => item.name.toLowerCase() === name.toLowerCase())) fail('Tên phòng ban đã tồn tại.');
    const managerId = body.managerId ? Number(body.managerId) : null;
    if (managerId && activeUser(database, managerId).systemRole !== 'MANAGER') fail('Trưởng phòng phải có global role MANAGER.');
    const department: MockDepartment = { id: next(database, 'departments'), name, description: String(body.description || ''), managerId };
    database.departments.push(department); save(database); return ok(config, department, 201);
  }
  const departmentMatch = path.match(/^\/departments\/(\d+)$/);
  if (departmentMatch && method === 'GET') {
    const department = database.departments.find((item) => item.id === Number(departmentMatch[1])) || fail('Không tìm thấy phòng ban.');
    return ok(config, department);
  }
  if (departmentMatch && method === 'PUT') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được cập nhật phòng ban.');
    const department = database.departments.find((item) => item.id === Number(departmentMatch[1])) || fail('Không tìm thấy phòng ban.');
    if (body.name !== undefined) department.name = String(body.name).trim() || fail('Tên phòng ban không được để trống.');
    if (body.description !== undefined) department.description = String(body.description || '');
    if (body.managerId !== undefined) {
      const managerId = body.managerId ? Number(body.managerId) : null;
      if (managerId && activeUser(database, managerId).systemRole !== 'MANAGER') fail('Trưởng phòng phải có global role MANAGER.');
      department.managerId = managerId;
    }
    save(database); return ok(config, department);
  }
  if (departmentMatch && method === 'DELETE') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được xóa phòng ban.');
    const id = Number(departmentMatch[1]);
    if (database.users.some((item) => item.departmentId === id && item.status === 'ACTIVE')) fail('Không thể xóa phòng ban còn nhân sự hoạt động.');
    database.departments = database.departments.filter((item) => item.id !== id); save(database); return ok(config, null);
  }
  if (method === 'GET' && path === '/projects') {
    const visible = actor.systemRole === 'ADMIN' ? database.projects : database.projects.filter((project) => activeMembership(database, project.id, actor.id));
    return ok(config, { content: visible.filter((item) => !item.deletedAt).map((item) => backendProject(database, item)) });
  }
  if (method === 'POST' && path === '/projects') {
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được tạo dự án và chỉ định Leader.');
    if (body.status !== undefined || body.projectCode !== undefined || body.project_code !== undefined) fail('Mã và trạng thái dự án do hệ thống quản lý.');
    const leaderId = Number(body.leaderId);
    const leader = activeUser(database, leaderId);
    if (leader.systemRole !== 'MANAGER') fail('Project Leader phải có global role MANAGER.');
    const name = String(body.name || '').trim();
    const startDate = String(body.startDate || '').slice(0, 10);
    const endDate = String(body.endDate || '').slice(0, 10);
    if (name.length < 3 || name.length > 100) fail('Tên dự án phải có từ 3 đến 100 ký tự.');
    if (String(body.description || '').length > 300) fail('Mô tả dự án không được vượt quá 300 ký tự.');
    if (!startDate || !endDate || endDate < startDate) fail('Thời gian dự án không hợp lệ.');
    const id = next(database, 'projects');
    const project: MockProject = { id, projectCode: `PRJ-${String(id).padStart(4, '0')}`, name, description: String(body.description || ''), leaderId, status: 'PLANNING', startDate, endDate, createdBy: actor.id, deletedAt: null };
    database.projects.push(project);
    database.projectMemberships.push({ id: `pm-${next(database, 'memberships')}`, projectId: id, userId: leaderId, projectRole: 'MEMBER', joinedAt: now(), leftAt: null });
    save(database); return ok(config, backendProject(database, project), 201);
  }
  const projectMatch = path.match(/^\/projects\/(\d+)$/);
  if (projectMatch && method === 'GET') {
    const project = activeProject(database, Number(projectMatch[1])); assertProjectAccess(database, project, actor.id); return ok(config, backendProject(database, project));
  }
  if (projectMatch && method === 'PUT') {
    const project = activeProject(database, Number(projectMatch[1]));
    if (actor.systemRole !== 'ADMIN' && !isProjectOperator(database, project, actor.id)) fail('Chỉ ADMIN, Project Leader hoặc Project Manager được cập nhật dự án.');
    if (project.status === 'COMPLETED' || project.status === 'ARCHIVED') fail('Không được sửa dự án đã hoàn thành hoặc lưu trữ.');
    if (body.status !== undefined || body.projectCode !== undefined || body.project_code !== undefined) fail('Không được cập nhật trực tiếp mã hoặc trạng thái dự án.');
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 3 || name.length > 100) fail('Tên dự án phải có từ 3 đến 100 ký tự.');
      project.name = name;
    }
    if (body.description !== undefined) {
      if (String(body.description || '').length > 300) fail('Mô tả dự án không được vượt quá 300 ký tự.');
      project.description = String(body.description || '');
    }
    if (body.startDate) project.startDate = String(body.startDate).slice(0, 10);
    if (body.endDate) project.endDate = String(body.endDate).slice(0, 10);
    if (project.endDate < project.startDate) fail('Ngày kết thúc phải sau ngày bắt đầu.');
    if (body.leaderId !== undefined && Number(body.leaderId) !== project.leaderId) {
      if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được thay đổi Project Leader.');
      const leader = activeUser(database, Number(body.leaderId));
      if (leader.systemRole !== 'MANAGER') fail('Project Leader phải có global role MANAGER.');
      project.leaderId = leader.id;
      if (!activeMembership(database, project.id, leader.id)) database.projectMemberships.push({ id: `pm-${next(database, 'memberships')}`, projectId: project.id, userId: leader.id, projectRole: 'MEMBER', joinedAt: now(), leftAt: null });
    }
    addAudit(database, actor.id, 'PROJECT_UPDATED', 'PROJECT', project.id, 'Cập nhật thông tin dự án');
    save(database); return ok(config, backendProject(database, project));
  }
  if (projectMatch && method === 'DELETE') {
    const project = activeProject(database, Number(projectMatch[1]));
    if (actor.systemRole !== 'ADMIN') fail('Chỉ ADMIN được xóa dự án.');
    if (database.tasks.some((item) => item.projectId === project.id && !item.deletedAt)) fail('Không thể xóa dự án đang có Task.');
    project.deletedAt = now(); addAudit(database, actor.id, 'PROJECT_DELETED', 'PROJECT', project.id, 'Xóa mềm dự án'); save(database); return ok(config, null);
  }
  const memberMatch = path.match(/^\/projects\/(\d+)\/members(?:\/(\d+))?$/);
  if (memberMatch && method === 'GET') {
    const project = activeProject(database, Number(memberMatch[1])); assertProjectAccess(database, project, actor.id);
    const members = database.projectMemberships.filter((item) => Number(item.projectId) === project.id && !item.leftAt).map((item) => {
      const user = activeUser(database, Number(item.userId));
      return { projectId: project.id, userId: user.id, fullName: user.fullName, email: user.email, departmentId: user.departmentId, departmentName: database.departments.find((department) => department.id === user.departmentId)?.name, projectRole: item.projectRole, joinedAt: item.joinedAt };
    });
    return ok(config, members);
  }
  if (memberMatch && method === 'POST') {
    const project = activeProject(database, Number(memberMatch[1]));
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Leader/Project Manager được thêm thành viên.');
    const userId = Number(body.userId); activeUser(database, userId);
    if (activeMembership(database, project.id, userId)) fail('Người dùng đã là thành viên dự án.');
    const projectRole = String(body.projectRole || 'MEMBER') as ProjectRole;
    if (!['MEMBER', 'PROJECT_MANAGER'].includes(projectRole)) fail('Project role không hợp lệ.');
    if (projectRole === 'PROJECT_MANAGER' && project.leaderId !== actor.id) fail('Chỉ Project Leader được cấp PROJECT_MANAGER.');
    if (projectRole === 'PROJECT_MANAGER' && activeUser(database, userId).systemRole !== 'MANAGER') fail('PROJECT_MANAGER phải có global role MANAGER.');
    const membership: ProjectMembership = { id: `pm-${next(database, 'memberships')}`, projectId: project.id, userId, projectRole, joinedAt: now(), leftAt: null };
    database.projectMemberships.push(membership); save(database); return ok(config, membership, 201);
  }
  if (memberMatch && memberMatch[2] && method === 'PUT') {
    const project = activeProject(database, Number(memberMatch[1]));
    if (project.leaderId !== actor.id) fail('Chỉ Project Leader được cấp hoặc thu hồi PROJECT_MANAGER.');
    const userId = Number(memberMatch[2]);
    const membership = activeMembership(database, project.id, userId) || fail('Thành viên không còn hoạt động trong dự án.');
    const projectRole = String(body.projectRole || 'MEMBER') as ProjectRole;
    if (!['MEMBER', 'PROJECT_MANAGER'].includes(projectRole)) fail('Project role không hợp lệ.');
    if (projectRole === 'PROJECT_MANAGER' && activeUser(database, userId).systemRole !== 'MANAGER') fail('PROJECT_MANAGER phải có global role MANAGER.');
    if (project.leaderId === userId) fail('Project Leader là vai trò chỉ định riêng, không thay đổi bằng project_role.');
    membership.projectRole = projectRole;
    addAudit(database, actor.id, 'PROJECT_ROLE_UPDATED', 'PROJECT', project.id, `User ${userId}: ${projectRole}`);
    save(database); return ok(config, membership);
  }
  if (memberMatch && memberMatch[2] && method === 'DELETE') {
    const project = activeProject(database, Number(memberMatch[1]));
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Leader/Project Manager được loại thành viên.');
    const userId = Number(memberMatch[2]);
    if (project.leaderId === userId) fail('Không thể loại Project Leader khỏi dự án.');
    if (database.tasks.some((item) => item.projectId === project.id && item.assigneeId === userId && !item.deletedAt && item.status !== 'DONE')) fail('Thành viên còn Task chưa DONE.');
    const membership = activeMembership(database, project.id, userId) || fail('Thành viên không còn hoạt động trong dự án.');
    membership.leftAt = now();
    database.followers.filter((item) => Number(item.userId) === userId && !item.leftAt && database.tasks.some((task) => task.id === Number(item.taskId) && task.projectId === project.id)).forEach((item) => { item.leftAt = now(); });
    save(database); return ok(config, null);
  }

  if (method === 'GET' && path === '/tasks') {
    const projectId = Number(config.params?.projectId);
    const project = activeProject(database, projectId); assertProjectAccess(database, project, actor.id);
    return ok(config, database.tasks.filter((item) => item.projectId === projectId && !item.deletedAt).map((item) => backendTask(database, item)));
  }
  if (method === 'POST' && path === '/tasks') {
    const project = activeProject(database, Number(body.projectId));
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Leader/Project Manager được tạo Task.');
    assertProjectEditable(project);
    const assigneeId = body.assigneeId ? Number(body.assigneeId) : null;
    if (assigneeId && !activeMembership(database, project.id, assigneeId)) fail('Assignee phải là thành viên đang hoạt động của dự án.');
    const followerIds = new Set<number>((Array.isArray(body.followerUserIds) ? body.followerUserIds : []).map(Number));
    followerIds.forEach((userId) => { if (!activeMembership(database, project.id, userId)) fail('Follower phải là thành viên đang hoạt động của dự án.'); });
    const dependencyIds = [...new Set<number>((Array.isArray(body.dependencyTaskIds) ? body.dependencyTaskIds : []).map(Number))];
    dependencyIds.forEach((dependencyId) => { const dependency = activeTask(database, dependencyId); if (dependency.projectId !== project.id) fail('Task phụ thuộc phải thuộc cùng dự án.'); });
    const id = next(database, 'tasks');
    const task: MockTask = { id, projectId: project.id, title: String(body.title || ''), description: String(body.description || ''), priority: String(body.priority || 'MEDIUM') as TaskPriority, status: 'TODO', assigneeId, plannedStartDate: String(body.startDate || '').slice(0, 10), deadline: String(body.deadline || '').slice(0, 10), createdBy: actor.id, deletedAt: null, createdAt: now(), updatedAt: now() };
    if (!task.plannedStartDate || !task.deadline || task.plannedStartDate > task.deadline) fail('Ngày bắt đầu và deadline không hợp lệ.');
    database.tasks.push(task);
    if (assigneeId) followerIds.add(assigneeId);
    followerIds.forEach((userId) => database.followers.push({ id: `tf-${next(database, 'followers')}`, taskId: id, userId, joinedAt: now(), leftAt: null }));
    dependencyIds.forEach((dependsOnTaskId) => database.taskDependencies.push({ taskId: id, dependsOnTaskId }));
    save(database); return ok(config, backendTask(database, task), 201);
  }
  const checklistCollectionMatch = path.match(/^\/tasks\/(\d+)\/checklist$/);
  if (checklistCollectionMatch && method === 'GET') {
    const task = activeTask(database, Number(checklistCollectionMatch[1])); const project = activeProject(database, task.projectId); assertProjectAccess(database, project, actor.id);
    return ok(config, database.checklistItems.filter((item) => Number(item.taskId) === task.id && !item.deletedAt));
  }
  if (checklistCollectionMatch && method === 'POST') return ok(config, mockCoreApi.addChecklistItem(Number(checklistCollectionMatch[1]), String(body.title || '')), 201);
  const checklistItemMatch = path.match(/^\/tasks\/(\d+)\/checklist\/([^/]+)$/);
  if (checklistItemMatch && method === 'DELETE') return ok(config, mockCoreApi.removeChecklistItem(checklistItemMatch[2]));
  const followerMatch = path.match(/^\/tasks\/(\d+)\/followers\/(\d+)$/);
  if (followerMatch && method === 'POST') return ok(config, mockCoreApi.addFollower(Number(followerMatch[1]), Number(followerMatch[2])), 201);
  if (followerMatch && method === 'DELETE') return ok(config, mockCoreApi.removeFollower(Number(followerMatch[1]), Number(followerMatch[2])));
  const taskMatch = path.match(/^\/tasks\/(\d+)$/);
  if (taskMatch && method === 'GET') {
    const task = activeTask(database, Number(taskMatch[1])); const project = activeProject(database, task.projectId); assertProjectAccess(database, project, actor.id); return ok(config, backendTask(database, task));
  }
  if (taskMatch && method === 'PUT') {
    const task = activeTask(database, Number(taskMatch[1])); const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Leader/Project Manager của dự án được sửa Task.');
    assertProjectEditable(project);
    if (task.status === 'DONE') fail('Task DONE là trạng thái kết thúc và không được chỉnh sửa.');
    if (task.status === 'REVIEW') fail('Không được sửa Task đang chờ REVIEW.');
    if (body.title !== undefined) task.title = String(body.title).trim() || fail('Tên Task không được để trống.');
    if (body.description !== undefined) task.description = String(body.description || '');
    if (body.priority !== undefined) task.priority = String(body.priority) as TaskPriority;
    if (body.assigneeId !== undefined) {
      const assigneeId = body.assigneeId ? Number(body.assigneeId) : null;
      if (assigneeId && !activeMembership(database, project.id, assigneeId)) fail('Assignee phải là thành viên đang hoạt động của dự án.');
      task.assigneeId = assigneeId;
    }
    const nextStartDate = body.startDate ? String(body.startDate).slice(0, 10) : task.plannedStartDate;
    const nextDeadline = body.deadline ? String(body.deadline).slice(0, 10) : task.deadline;
    const scheduleChanged = nextStartDate !== task.plannedStartDate || nextDeadline !== task.deadline;
    if (scheduleChanged && String(body.changeReason || '').trim().length < 5) fail('Thay đổi lịch Task bắt buộc có lý do ít nhất 5 ký tự.');
    task.plannedStartDate = nextStartDate;
    task.deadline = nextDeadline;
    if (task.plannedStartDate > task.deadline) fail('Deadline phải sau ngày bắt đầu.');
    if (Array.isArray(body.dependencyTaskIds)) {
      const dependencyIds = [...new Set<number>(body.dependencyTaskIds.map(Number))];
      dependencyIds.forEach((dependencyId) => {
        if (dependencyId === task.id) fail('Task không thể phụ thuộc chính nó.');
        const dependency = activeTask(database, dependencyId);
        if (dependency.projectId !== project.id) fail('Task phụ thuộc phải thuộc cùng dự án.');
        if (database.taskDependencies.some((item) => item.taskId === dependencyId && item.dependsOnTaskId === task.id)) fail('Quan hệ phụ thuộc tạo thành chu trình.');
      });
      database.taskDependencies = database.taskDependencies.filter((item) => item.taskId !== task.id);
      dependencyIds.forEach((dependsOnTaskId) => database.taskDependencies.push({ taskId: task.id, dependsOnTaskId }));
    }
    if (Array.isArray(body.followerUserIds)) {
      const requested = new Set<number>(body.followerUserIds.map(Number));
      if (task.assigneeId) requested.add(task.assigneeId);
      requested.forEach((userId) => { if (!activeMembership(database, project.id, userId)) fail('Follower phải là thành viên đang hoạt động của dự án.'); });
      database.followers.filter((item) => Number(item.taskId) === task.id && !item.leftAt && !requested.has(Number(item.userId))).forEach((item) => { item.leftAt = now(); });
      requested.forEach((userId) => { if (!isActiveFollower(database, task.id, userId)) database.followers.push({ id: `tf-${next(database, 'followers')}`, taskId: task.id, userId, joinedAt: now(), leftAt: null }); });
    }
    task.updatedAt = now(); addAudit(database, actor.id, scheduleChanged ? 'TASK_RESCHEDULED' : 'TASK_UPDATED', 'TASK', task.id, scheduleChanged ? `Điều chỉnh lịch: ${String(body.changeReason).trim()}` : 'Cập nhật thông tin Task'); save(database); return ok(config, backendTask(database, task));
  }
  const assignMatch = path.match(/^\/tasks\/(\d+)\/assign$/);
  if (assignMatch && method === 'PATCH') {
    const task = activeTask(database, Number(assignMatch[1])); const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Leader/Project Manager của dự án được đổi Assignee.');
    if (task.status === 'DONE' || task.status === 'REVIEW') fail('Không được đổi Assignee khi Task REVIEW hoặc DONE.');
    const assigneeId = Number(body.assigneeId);
    if (!activeMembership(database, project.id, assigneeId)) fail('Assignee phải là thành viên đang hoạt động của dự án.');
    task.assigneeId = assigneeId;
    if (!isActiveFollower(database, task.id, assigneeId)) database.followers.push({ id: `tf-${next(database, 'followers')}`, taskId: task.id, userId: assigneeId, joinedAt: now(), leftAt: null });
    task.updatedAt = now(); addAudit(database, actor.id, 'TASK_ASSIGNED', 'TASK', task.id, `Assignee ${assigneeId}`); save(database); return ok(config, backendTask(database, task));
  }
  const statusMatch = path.match(/^\/tasks\/(\d+)\/status$/);
  if (statusMatch && method === 'PATCH') fail('Không được chuyển trạng thái trực tiếp; hãy dùng hành động start/review/decision theo workflow.');
  if (taskMatch && method === 'DELETE') {
    const task = activeTask(database, Number(taskMatch[1])); const project = activeProject(database, task.projectId);
    if (!isProjectOperator(database, project, actor.id)) fail('Chỉ Leader/Project Manager của dự án được xóa Task.');
    if (task.status === 'DONE') fail('Task DONE không được xóa.');
    task.deletedAt = now(); addAudit(database, actor.id, 'TASK_DELETED', 'TASK', task.id, 'Xóa mềm Task'); save(database); return ok(config, null);
  }

  if (method === 'GET' && path === '/dashboard/overview') return ok(config, { totalProjects: database.projects.length, totalTasks: database.tasks.length, completedTasks: database.tasks.filter((item) => item.status === 'DONE').length });
  if (method === 'GET' && path === '/dashboard/department-workload') return ok(config, []);

  fail(`Mock API chưa hỗ trợ ${method} ${path}.`);
};
