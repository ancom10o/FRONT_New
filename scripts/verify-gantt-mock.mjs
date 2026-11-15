import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temp = await mkdtemp(join(tmpdir(), 'gantt-mock-'));
const output = join(temp, 'mock.mjs');
try {
  await build({ entryPoints: [fileURLToPath(new URL('../src/mocks/mockApi.ts', import.meta.url))], outfile: output, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('true') } });
  const storage = new Map();
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.window = { dispatchEvent: () => {}, setTimeout };
  const { mockCoreApi, mockAxiosAdapter } = await import(pathToFileURL(output).href);
  const login = (email) => { const session = mockCoreApi.login(email, 'demo123'); localStorage.setItem('accessToken', session.token); };
  const request = (data) => mockAxiosAdapter({ method: 'put', url: '/tasks/1', data: JSON.stringify(data), headers: {} });
  const payload = (changeReason) => ({ title: 'Hoàn thiện luồng phê duyệt công việc', description: 'Task demo', priority: 'HIGH', assigneeId: 4, startDate: '2026-11-20T00:00:00', deadline: '2027-03-05T23:59:59', followerUserIds: [4, 5], dependencyTaskIds: [], changeReason });
  const denied = async (action) => { try { await action(); return false; } catch { return true; } };

  mockCoreApi.reset();
  login('admin@demo.local');
  assert.equal(await denied(() => request(payload('Điều chỉnh theo kế hoạch'))), true, 'ADMIN không được chỉnh lịch Task');
  login('assignee@demo.local');
  assert.equal(await denied(() => request(payload('Điều chỉnh theo kế hoạch'))), true, 'EMPLOYEE không được chỉnh lịch Task');
  login('leader@demo.local');
  assert.equal(await denied(() => request(payload(''))), true, 'Đổi lịch phải có lý do');
  const response = await request(payload('Điều chỉnh theo kế hoạch đã duyệt'));
  assert.equal(response.data.data.startDate.slice(0, 10), '2026-11-20');
  assert.equal(response.data.data.deadline.slice(0, 10), '2027-03-05');
  assert.equal(mockCoreApi.snapshot().audit[0].action, 'TASK_RESCHEDULED');
  assert.match(mockCoreApi.snapshot().audit[0].detail, /Điều chỉnh theo kế hoạch/);
  console.log('Gantt Mock API: quyền, validation ngày, lý do và audit đều đạt.');
} finally { await rm(temp, { recursive: true, force: true }); }
