const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const status = require('../extension/environment-status.js');

const initial = Date.parse('2026-11-27T23:15:00+08:00');
const plan = { id: 'plan', state: 'scheduled', startAt: initial + 900_000, prepareAt: initial + 600_000 };
const event = { addListener() {} };
const source = name => fs.readFileSync(require.resolve('../extension/' + name), 'utf8');

async function testPreflight() {
  let now = initial;
  let retryAt;
  let runs = 0;
  const session = { environmentRun: { id: 'manual', startedAt: now } };
  const local = { plan };
  const context = vm.createContext({
    Date: { now: () => now },
    console,
    crypto: { randomUUID: () => 'auto' },
    importScripts() {},
    KitchenPlan: { ACTIVE: ['scheduled'] },
    KitchenEnvironmentStatus: status,
    KitchenEnvironmentFlow: { async checkAutomatically() { runs++; return { code: 'ready' }; } },
    chrome: {
      storage: {
        local: { async get() { return { ...local }; }, async set(values) { Object.assign(local, values); } },
        session: {
          async get() { return { ...session }; },
          async set(values) { Object.assign(session, values); },
          async remove(key) { delete session[key]; }
        }
      },
      runtime: { onMessage: event, onStartup: event, onInstalled: event },
      alarms: { onAlarm: event, async create(name, { when }) { assert.equal(name, 'kitchen-environment'); retryAt = when; } },
      tabs: { onRemoved: event }
    }
  });
  vm.runInContext(source('background.js'), context);
  const check = () => vm.runInContext('automaticEnvironment(true)', context);

  await check();
  assert.equal(runs, 0);
  assert.equal(session.environmentPreflight, undefined);
  assert.ok(retryAt > now);
  now = retryAt;
  delete session.environmentRun;
  await check();
  assert.equal(runs, 1);
  assert.equal(local.environmentResult.code, 'ready');
  await check();
  assert.equal(runs, 1);

  session.environmentRun = { id: 'manual', startedAt: plan.prepareAt - 50_000 };
  delete session.environmentPreflight;
  retryAt = undefined;
  now = plan.prepareAt - 50_000;
  await check();
  assert.equal(retryAt, undefined);
  assert.equal(session.environmentPreflight, undefined);
}

async function testSummaryExpiry() {
  let now = initial;
  let timer;
  const nodes = {
    'environment-summary': { dataset: {} },
    'home-environment-title': {},
    'home-environment-detail': {}
  };
  const events = {};
  const result = { code: 'ready', level: 'ready', checkedAt: now };
  const context = vm.createContext({
    console,
    Date: { now: () => now },
    setTimeout(callback, delay) { timer = { callback, delay }; return 1; },
    clearTimeout() { timer = undefined; },
    document: {
      visibilityState: 'visible',
      getElementById(id) { return nodes[id]; },
      addEventListener(type, handler) { events[type] = handler; }
    },
    chrome: {
      storage: {
        local: { async get() { return { environmentResult: result }; } },
        session: { async get() { return {}; } },
        onChanged: event
      }
    },
    KitchenPlan: { formatTime: String },
    KitchenEnvironmentStatus: { ...status, viewStatus: (result, run) => status.viewStatus(result, run, now) }
  });
  vm.runInContext(source('summary.js') + '\nKitchenSummary.mountEnvironmentSummary();', context);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const level = () => nodes['environment-summary'].dataset.level;
  await flush();
  assert.equal(level(), 'ready');
  assert.equal(timer?.delay, 6 * 60 * 60_000);
  now += timer.delay;
  timer.callback();
  await flush();
  assert.equal(level(), 'stale');
  assert.equal(timer, undefined);

  result.checkedAt = now;
  events.visibilitychange();
  await flush();
  assert.equal(level(), 'ready');
  now += 6 * 60 * 60_000;
  events.visibilitychange();
  await flush();
  assert.equal(level(), 'stale');
}

Promise.allSettled([testPreflight(), testSummaryExpiry()]).then(results => {
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log('Preflight retry and live status expiry passed.');
});
