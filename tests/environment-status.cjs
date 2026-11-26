const assert = require('node:assert/strict');
const { isFresh, preflightAt, viewStatus } = require('../extension/environment-status.js');

const now = Date.parse('2026-11-25T06:00:00Z');
const hour = 60 * 60_000;
const plan = { state: 'scheduled', startAt: now + hour, prepareAt: now + 55 * 60_000 };
assert.equal(preflightAt(plan, now), now + 45 * 60_000);
assert.equal(preflightAt(plan, now + 50 * 60_000), now + 50 * 60_000);
assert.equal(preflightAt(plan, plan.prepareAt - 30_000), null);
assert.equal(preflightAt({ ...plan, state: 'running' }, now), null);
const result = { level: 'ready', code: 'ready', checkedAt: now };
assert.equal(isFresh(result, now + 6 * hour - 1), true);
assert.equal(isFresh(result, now + 6 * hour), false);
assert.equal(viewStatus(result, null, now).level, 'ready');
assert.equal(viewStatus(result, null, now + 6 * hour).level, 'stale');
assert.equal(viewStatus(null, null, now).level, 'unknown');
assert.equal(viewStatus(result, { level: 'checking', code: 'data-read', startedAt: now }, now).level, 'checking');
assert.equal(viewStatus(null, { level: 'waiting', code: 'school-auth', startedAt: now }, now).level, 'error');
assert.equal(viewStatus(result, { level: 'checking', startedAt: now }, now + 5 * 60_000).level, 'ready');
assert.equal(viewStatus({ level: 'error', code: 'closed', checkedAt: now }, null, now + 6 * hour).level, 'error');
for (const code of ['school-auth', 'booking-login', 'booking-auth']) {
  assert.match(viewStatus({ level: 'error', code, checkedAt: now }, null, now).detail, /从门户检测/);
}
assert.match(viewStatus(null, { level: 'waiting', code: 'school-auth', startedAt: now }, now).detail, /从门户检测/);
assert.doesNotMatch(viewStatus({ level: 'error', code: 'network', checkedAt: now }, null, now).detail, /从门户检测/);

const { planStatus } = require('../extension/summary.js');
for (const [states, level, label] of [
  [[undefined, 'scheduled', 'preparing', 'waiting', 'cancelled'], 'pending', '待预约'],
  [['running', 'submitting', 'uncertain'], 'running', '预约中'],
  [['success'], 'success', '预约成功'],
  [['unavailable', 'failed', 'expired', 'manual'], 'failed', '预约失败']
]) {
  for (const state of states) assert.deepEqual(planStatus({ state }), { level, label });
}
assert.deepEqual(planStatus(), { level: 'pending', label: '待预约' });
assert.deepEqual(planStatus({ state: 'manual', commitAt: now }), { level: 'running', label: '预约中' });

console.log('主页检测提示和预约状态测试通过。');
