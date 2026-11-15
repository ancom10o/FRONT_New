import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const tempDirectory = await mkdtemp(join(tmpdir(), 'hrm-p0-'));
const outputFile = join(tempDirectory, 'mock-api.mjs');

try {
  await build({
    entryPoints: [fileURLToPath(new URL('../src/mocks/mockApi.ts', import.meta.url))],
    outfile: outputFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: { 'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('true') },
  });

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.window = { dispatchEvent: () => {}, setTimeout };

  const { mockCoreApi, mockAxiosAdapter } = await import(`${pathToFileURL(outputFile).href}?run=${Date.now()}`);
  const login = (email) => {
    const session = mockCoreApi.login(email, 'demo123');
    localStorage.setItem('accessToken', session.token);
  };
  const request = (method, url, data) => mockAxiosAdapter({ method, url, data: data ? JSON.stringify(data) : undefined, headers: {} });
  const expectDenied = async (label, action) => {
    let denied = false;
    try { await action(); } catch { denied = true; }
    assert.equal(denied, true, `${label} phải bị từ chối`);
  };

  mockCoreApi.reset();

  login('reviewer@demo.local');
  await expectDenied('PROJECT_MANAGER tự cấp quyền', () => request('put', '/projects/1/members/4', { projectRole: 'PROJECT_MANAGER' }));

  login('leader@demo.local');
  await expectDenied('Cấp PROJECT_MANAGER cho EMPLOYEE', () => request('put', '/projects/1/members/4', { projectRole: 'PROJECT_MANAGER' }));
  await request('put', '/projects/1/members/3', { projectRole: 'MEMBER' });
  await request('put', '/projects/1/members/3', { projectRole: 'PROJECT_MANAGER' });
  assert.equal(mockCoreApi.snapshot().projectMemberships.find((item) => Number(item.userId) === 3)?.projectRole, 'PROJECT_MANAGER');

  login('reviewer@demo.local');
  const addedChecklist = mockCoreApi.addChecklistItem(1, 'Checklist sẽ xóa mềm');
  mockCoreApi.removeChecklistItem(addedChecklist.id);
  let snapshot = mockCoreApi.snapshot();
  assert.ok(snapshot.checklistItems.find((item) => item.id === addedChecklist.id)?.deletedAt, 'Checklist đã xóa phải còn lịch sử');

  mockCoreApi.addFollower(1, 2);
  mockCoreApi.removeFollower(1, 2);
  assert.ok(mockCoreApi.snapshot().followers.find((item) => Number(item.userId) === 2)?.leftAt, 'Follower đã xóa phải còn lịch sử');
  await expectDenied('Xóa Assignee khỏi Follower', () => mockCoreApi.removeFollower(1, 4));

  login('assignee@demo.local');
  mockCoreApi.startTask(1);
  for (const item of mockCoreApi.snapshot().checklistItems.filter((entry) => Number(entry.taskId) === 1 && !entry.deletedAt && !entry.completed)) {
    mockCoreApi.toggleChecklist(item.id);
  }
  mockCoreApi.submitReview(1);

  login('reviewer@demo.local');
  await expectDenied('Thêm checklist khi REVIEW', () => mockCoreApi.addChecklistItem(1, 'Không hợp lệ'));
  await expectDenied('Xóa checklist khi REVIEW', () => mockCoreApi.removeChecklistItem('cl-1'));
  await expectDenied('Thêm Follower khi REVIEW', () => mockCoreApi.addFollower(1, 2));
  await expectDenied('Xóa Follower khi REVIEW', () => mockCoreApi.removeFollower(1, 5));
  mockCoreApi.decideReview(1, 'APPROVED', '');
  await expectDenied('Thêm checklist khi DONE', () => mockCoreApi.addChecklistItem(1, 'Không hợp lệ'));
  await expectDenied('Thay Follower khi DONE', () => mockCoreApi.addFollower(1, 2));

  snapshot = mockCoreApi.snapshot();
  assert.equal(snapshot.tasks[0].status, 'DONE');
  assert.equal(snapshot.reviewSubmissions[0].checklistSnapshot.some((item) => item.id === addedChecklist.id), false, 'Snapshot REVIEW không chứa checklist đã xóa');
  assert.ok(snapshot.audit.some((item) => item.action === 'PROJECT_ROLE_UPDATED'));
  assert.ok(snapshot.audit.some((item) => item.action === 'CHECKLIST_ITEM_REMOVED'));
  assert.ok(snapshot.audit.some((item) => item.action === 'TASK_FOLLOWER_REMOVED'));

  console.log(JSON.stringify({
    status: 'PASS',
    taskStatus: snapshot.tasks[0].status,
    projectRole: snapshot.projectMemberships.find((item) => Number(item.userId) === 3)?.projectRole,
    checklistHistoryPreserved: Boolean(snapshot.checklistItems.find((item) => item.id === addedChecklist.id)?.deletedAt),
    followerHistoryPreserved: Boolean(snapshot.followers.find((item) => Number(item.userId) === 2)?.leftAt),
    auditEvents: snapshot.audit.length,
  }));
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
