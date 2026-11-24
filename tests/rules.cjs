const assert = require('node:assert/strict');
const {
  buildPlan, candidateKitchens, normalizeSlot, localDay, canClaim, canCommit
} = require('../extension/rules.js');

const sample = {
  date: '2026-12-01', start: '16:00', end: '18:30', people: 9,
  kitchens: ['LP-02', 'XS-02', 'XS-01'], authorized: true
};
const beforeRelease = Date.parse('2026-11-24T18:00:00+08:00');
let plan = buildPlan(sample, beforeRelease);
assert.equal(new Date(plan.startAt).toISOString(), '2026-11-24T23:30:00.000Z');
assert.equal(new Date(plan.prepareAt).toISOString(), '2026-11-24T23:25:00.000Z');
assert.equal(new Date(plan.deadline).toISOString(), '2026-11-24T23:33:00.000Z');

const activeWindow = Date.parse('2026-11-28T15:30:00+08:00');
assert.equal(buildPlan(sample, activeWindow).startAt, activeWindow);
assert.equal(buildPlan(sample, Date.parse('2026-11-28T03:00:00+08:00')).startAt,
  Date.parse('2026-11-28T07:30:00+08:00'));
assert.equal(buildPlan(sample, Date.parse('2026-11-28T23:30:00+08:00')).startAt,
  Date.parse('2026-11-29T07:30:00+08:00'));
assert.throws(() => buildPlan(sample, Date.parse('2026-11-30T23:30:00+08:00')), /开放窗口/);
assert.throws(() => buildPlan({ ...sample, date: '2026-02-31' }, beforeRelease), /日期/);
assert.throws(() => buildPlan({ ...sample, end: '15:00' }, beforeRelease), /时段/);
assert.throws(() => buildPlan({ ...sample, kitchens: ['LP-01'] }, beforeRelease), /人数/);
assert.throws(() => buildPlan({ ...sample, authorized: false }, beforeRelease), /授权/);
assert.equal(localDay(Date.parse('2026-11-30T16:00:00Z')), '2026-12-01');
assert.equal(normalizeSlot('9:00 ～ 12:30'), '09:00~12:30');
assert.equal(normalizeSlot('16:00 – 18:30'), '16:00~18:30');
assert.equal(normalizeSlot('16:00'), '');

const rooms = [
  { id: 'XS-01', capacity: 10, bookable: ['16:00~18:30'] },
  { id: 'LP-02', capacity: 8, bookable: ['16:00~18:30'] },
  { id: 'XS-02', capacity: 10, bookable: ['16:00~18:30'] }
];
assert.deepEqual(candidateKitchens(plan, rooms).map(room => room.id), ['XS-02', 'XS-01']);
assert.deepEqual(candidateKitchens(plan, rooms.map(room => ({
  ...room, bookable: ['10:30~13:00']
}))), []);

plan = { ...plan, id: 'test', tabId: 7, state: 'waiting' };
assert.equal(canClaim(plan, 'test', 7, plan.startAt - 1), false);
assert.equal(canClaim(plan, 'test', 8, plan.startAt), false);
assert.equal(canClaim(plan, 'test', 7, plan.deadline), false);
assert.equal(canClaim(plan, 'test', 7, plan.startAt), true);
assert.equal(canClaim({ ...plan, state: 'running' }, 'test', 7, plan.startAt), false);
const running = { ...plan, state: 'running', runner: 'first', runnerDocument: 'old-page' };
assert.equal(canClaim(running, 'test', 7, plan.startAt, 'old-page'), false);
assert.equal(canClaim(running, 'test', 8, plan.startAt, 'new-page'), false);
assert.equal(canClaim(running, 'test', 7, plan.startAt, 'new-page'), true);
assert.equal(canClaim({ ...running, state: 'submitting' }, 'test', 7, plan.startAt, 'new-page'), false);
assert.equal(canCommit(running, 'test', 7, 'first', plan.startAt), true);
assert.equal(canCommit(running, 'test', 7, 'second', plan.startAt), false);
assert.equal(canCommit({ ...running, state: 'submitting' }, 'test', 7, 'first', plan.startAt), false);
console.log('规则测试通过。');
