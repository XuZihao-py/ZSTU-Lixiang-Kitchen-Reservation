const assert = require('node:assert/strict');
const { createMobileSession } = require('../extension/environment-mobile.js');

async function run() {
  const calls = [];
  let listener;
  let failTouch = false;
  const api = {
    onDetach: {
      addListener(callback) { listener = callback; },
      removeListener(callback) { assert.strictEqual(callback, listener); listener = undefined; }
    },
    async attach(target, version) { calls.push(['attach', target, version]); },
    async sendCommand(target, command, params) {
      calls.push([command, target, params]);
      if (failTouch && command === 'Emulation.setTouchEmulationEnabled') throw Error('测试失败');
    },
    async detach(target) { calls.push(['detach', target]); }
  };
  const session = createMobileSession(api, 'Mozilla/5.0 Chrome/151.0.0.0 Safari/537.36');
  assert.equal(await session.enable(12), true);
  assert.equal(await session.enable(12), true);
  assert.deepEqual(calls.map(([command]) => command), [
    'attach', 'Emulation.setUserAgentOverride', 'Emulation.setDeviceMetricsOverride',
    'Emulation.setTouchEmulationEnabled'
  ]);
  assert.match(calls[1][2].userAgent, /Android.*Chrome\/151\.0\.0\.0 Mobile Safari/);
  assert.equal(calls[1][2].userAgentMetadata.mobile, true);
  assert.equal(calls[2][2].width, 393);
  assert.equal(calls[2][2].mobile, true);
  assert.equal(calls[3][2].enabled, true);
  listener({ tabId: 12 }, 'canceled_by_user');
  assert.equal(await session.enable(12), false);
  failTouch = true;
  assert.equal(await session.enable(13), false);
  assert.deepEqual(calls.at(-1), ['detach', { tabId: 13 }]);
  failTouch = false;
  assert.equal(await session.enable(14), true);
  await session.close();
  assert.deepEqual(calls.at(-1), ['detach', { tabId: 14 }]);
  assert.equal(listener, undefined);
  console.log('手机模式会话测试通过。');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
