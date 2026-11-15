import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'project-form-'));
const mockOutput = join(temporaryDirectory, 'mock-api.mjs');
const schemaOutput = join(temporaryDirectory, 'project-schema.mjs');

try {
  await Promise.all([
    build({ entryPoints: [fileURLToPath(new URL('../src/mocks/mockApi.ts', import.meta.url))], outfile: mockOutput, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('true') } }),
    build({ entryPoints: [fileURLToPath(new URL('../src/schema/project.schema.ts', import.meta.url))], outfile: schemaOutput, bundle: true, platform: 'node', format: 'esm' }),
  ]);
  const storage = new Map();
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.window = { dispatchEvent: () => {}, setTimeout };

  const { mockCoreApi, mockAxiosAdapter } = await import(pathToFileURL(mockOutput).href);
  const { projectSchema } = await import(pathToFileURL(schemaOutput).href);
  const request = (method, url, data) => mockAxiosAdapter({ method, url, data: data ? JSON.stringify(data) : undefined, headers: {} });
  const login = (email) => { const session = mockCoreApi.login(email, 'demo123'); localStorage.setItem('accessToken', session.token); };
  const denied = async (action) => { try { await action(); return false; } catch { return true; } };

  mockCoreApi.reset();
  assert.equal(projectSchema.safeParse({ name: '  Dự án hợp lệ  ', description: '', leaderId: '2', startDate: '2026-11-15', endDate: '2026-12-15' }).success, true);
  assert.equal(projectSchema.safeParse({ name: 'AB', description: '', leaderId: '', startDate: '2026-02-30', endDate: '2026-02-20' }).success, false);

  login('admin@demo.local');
  const created = await request('post', '/projects', { name: 'Dự án kiểm thử form', description: 'Phạm vi hợp lệ', leaderId: 2, startDate: '2026-11-15', endDate: '2026-12-15' });
  assert.equal(created.data.data.status, 'PLANNING');
  assert.match(created.data.data.projectCode, /^PRJ-\d{4}$/);
  assert.equal(await denied(() => request('post', '/projects', { name: 'Dự án sai', leaderId: 4, startDate: '2026-11-15', endDate: '2026-12-15' })), true, 'EMPLOYEE không thể làm Leader');
  assert.equal(await denied(() => request('post', '/projects', { name: 'Dự án sai', leaderId: 2, status: 'ACTIVE', startDate: '2026-11-15', endDate: '2026-12-15' })), true, 'Client không thể tự đặt trạng thái');
  assert.equal(await denied(() => request('post', '/projects', { name: 'Dự án sai ngày', leaderId: 2, startDate: '2026-12-15', endDate: '2026-11-15' })), true, 'Khoảng ngày sai phải bị từ chối');

  login('reviewer@demo.local');
  const updated = await request('put', '/projects/1', { name: 'Dự án Demo đã cập nhật', description: 'Project Manager cập nhật phạm vi', leaderId: 2, startDate: '2026-01-01', endDate: '2026-12-31' });
  assert.equal(updated.data.data.name, 'Dự án Demo đã cập nhật');
  assert.equal(await denied(() => request('put', '/projects/1', { leaderId: 3 })), true, 'Project Manager không thể đổi Leader');

  login('assignee@demo.local');
  assert.equal(await denied(() => request('put', '/projects/1', { name: 'Không được phép' })), true, 'Member không thể sửa Project');
  console.log('Project form Mock API: tất cả ca hợp lệ và không hợp lệ đều đạt.');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
