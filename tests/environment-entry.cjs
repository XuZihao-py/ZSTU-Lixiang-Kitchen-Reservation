const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pageKind } = require('../extension/environment-check.js');

const events = [];
const view = {
  getComputedStyle: () => ({ visibility: 'visible' }),
  TouchEvent: class { constructor(type, options) { Object.assign(this, { type, ...options }); } }
};
const service = {
  textContent: ' 理享食光 ',
  ownerDocument: { defaultView: view },
  getClientRects: () => [{}],
  closest: () => null,
  dispatchEvent(event) {
    assert.equal(event.bubbles, true);
    events.push(event.type);
    return true;
  },
  click() { events.push('click'); }
};
const location = new URL('https://ie.zstu.edu.cn/zstu-apps-mobile-web/#/home');
let listener;
const context = {
  location,
  document: { querySelectorAll: selector => selector === 'iframe' ? [] : [service] },
  KitchenEnvironment: { pageKind },
  chrome: { runtime: { onMessage: { addListener: callback => { listener = callback; } } } }
};
vm.runInNewContext(fs.readFileSync(require.resolve('../extension/environment-entry.js'), 'utf8'), context);
const visit = () => listener({ kind: 'environment-entry' }, {}, reply => assert.equal(reply.state, 'handoff'));
visit();
visit();
assert.deepEqual(events, ['touchstart', 'touchend', 'click']);
console.log('门户触摸入口测试通过。');
