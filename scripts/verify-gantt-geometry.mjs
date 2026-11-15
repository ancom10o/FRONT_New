import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temp = await mkdtemp(join(tmpdir(), 'gantt-geometry-'));
const output = join(temp, 'geometry.mjs');
try {
  await build({ entryPoints: [fileURLToPath(new URL('../src/components/gantt/ganttGeometry.ts', import.meta.url))], outfile: output, bundle: true, platform: 'node', format: 'esm' });
  const { calculateBarGeometry, createGanttRange, createUtcWeekGroups, getPixelsPerDay, parseDateKeyUtc } = await import(pathToFileURL(output).href);
  const rangeStart = new Date('2026-11-01T00:00:00Z'); const rangeEnd = new Date('2026-12-01T00:00:00Z');
  assert.deepEqual(calculateBarGeometry('2026-11-10', '2026-11-10', rangeStart, rangeEnd, 40), { left: 360, width: 40, clippedStart: false, clippedEnd: false, durationDays: 1 });
  assert.equal(calculateBarGeometry('2026-11-10', '2026-11-12', rangeStart, rangeEnd, 40)?.width, 120, 'Deadline phải tính bao gồm ngày kết thúc');
  assert.deepEqual(calculateBarGeometry('2026-10-20', '2026-11-02', rangeStart, rangeEnd, 40), { left: 0, width: 80, clippedStart: true, clippedEnd: false, durationDays: 14 });
  assert.deepEqual(calculateBarGeometry('2026-11-30', '2027-02-01', rangeStart, rangeEnd, 40), { left: 1160, width: 40, clippedStart: false, clippedEnd: true, durationDays: 64 });
  assert.equal(calculateBarGeometry('2026-09-01', '2026-09-30', rangeStart, rangeEnd, 40), null, 'Task ngoài viewport không tạo bar');
  assert.equal(calculateBarGeometry('2026-11-12', '2026-11-10', rangeStart, rangeEnd, 40), null, 'Khoảng ngày đảo ngược không hợp lệ');
  assert.equal(parseDateKeyUtc('2026-02-30'), null, 'Ngày lịch không tồn tại phải bị từ chối');
  assert.equal(getPixelsPerDay('day'), 42); assert.equal(getPixelsPerDay('week'), 22); assert.equal(getPixelsPerDay('month'), 8);
  const weekRange = createGanttRange('week', new Date('2026-11-15T00:00:00Z'));
  assert.equal(weekRange.start.getUTCDay(), 1, 'Range tuần phải bắt đầu vào thứ Hai');
  assert.ok((new Date('2026-11-15T00:00:00Z').getTime() - weekRange.start.getTime()) / 86_400_000 <= 6, 'Hôm nay phải nằm trong 7 ngày đầu của timeline tuần');
  const weeks = createUtcWeekGroups(weekRange.start, weekRange.end);
  assert.equal(weeks.length, 16, 'Range Tuần 112 ngày phải có 16 nhóm tuần');
  assert.ok(weeks.every((week) => week.dayCount === 7), 'Mỗi nhóm tuần phải chứa đúng 7 cột ngày');
  assert.ok(weeks.every((week) => week.start.getUTCDay() === 1 && week.endInclusive.getUTCDay() === 0), 'Nhóm tuần phải từ thứ Hai đến Chủ nhật');
  console.log('Gantt geometry: mapping ngày → pixel, inclusive deadline và clipping đều đạt.');
} finally { await rm(temp, { recursive: true, force: true }); }
