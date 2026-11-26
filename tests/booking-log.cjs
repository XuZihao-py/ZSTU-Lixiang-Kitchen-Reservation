const assert = require('node:assert/strict');
require('../extension/rules.js');
const { addEvent, diagnosticReport, report, stamp } = require('../extension/booking-log.js');

const at = Date.parse('2026-11-25T23:30:00.125+08:00');
const plan = {
  id: 'test', date: '2026-11-30', start: '16:00', end: '18:30', people: 8,
  kitchens: ['XS-03', 'LP-01'], startAt: at + 1000, contact: '测试联系人 123456'
};
let history = addEvent([], plan, 'scheduled', { at });
history = addEvent(history, plan, 'attempt', { at: at + 1, kitchen: 'XS-03' });
history = addEvent(history, plan, 'skipped', { at: at + 2, kitchen: 'XS-03' });
history = addEvent(history, plan, 'manual', { at: at + 3, reason: 'payment', message: '测试联系人 123456' });
assert.equal(history.length, 1);
assert.equal(history[0].events.length, 4);
assert.equal(stamp(at), '2026-11-25 23:30:00.125');
assert.equal(stamp(at + 1800 * 1000), '2026-11-26 00:00:00.125');
const output = report(history[0]);
assert.match(output, /北京时间/);
assert.match(output, /2026-11-30.*16:00.*18:30.*8 人/);
assert.match(output, /下沙 XS-03.*临平 LP-01/);
assert.match(output, /正在尝试.*继续.*付款页/s);
assert.doesNotMatch(JSON.stringify(history), /测试联系人|123456/);
const detailed = JSON.parse(diagnosticReport([history[0], {
  ...history[0], id: 'legacy', events: [{ at, message: '旧版事件' }]
}], { extensionVersion: '1.4.1', chromeVersion: '151', platform: 'Windows', exportedAt: at }));
assert.equal(detailed.taskCount, 2);
assert.equal(detailed.tasks[0].events[1].kitchen, 'XS-03');
assert.equal(detailed.tasks[0].events[3].reason, 'payment');
assert.equal(detailed.tasks[0].events[0].sincePlanStartMs, -1000);
assert.equal(detailed.tasks[1].events[0].event, 'legacy');
assert.doesNotMatch(JSON.stringify(detailed), /测试联系人|123456/);
assert.strictEqual(addEvent(history, plan, 'unknown', { at }), history);
assert.strictEqual(addEvent(history, plan, 'attempt', { at, kitchen: 'LP-02' }), history);

for (let index = 0; index < 70; index++) {
  history = addEvent(history, plan, 'notice', { at: at + index });
}
assert.equal(history[0].events.length, 60);
assert.equal(history[0].events.at(-1).at, at + 69);
for (let index = 1; index <= 13; index++) {
  history = addEvent(history, { ...plan, id: String(index) }, 'scheduled', { at: at + index });
}
assert.equal(history.length, 12);
assert.equal(history[0].id, '13');
assert.equal(history.at(-1).id, '2');
console.log('预约日志测试通过。');
