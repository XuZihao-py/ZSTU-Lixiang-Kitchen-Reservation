const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { BOOKING_URL } = require('../extension/rules.js');
const manifest = require('../extension/manifest.json');

const earlyScript = manifest.content_scripts.find(entry =>
  entry.run_at === 'document_start' && entry.js.includes('booking-language.js'));
assert.ok(earlyScript, 'Translation must be blocked before the picker renders');
assert.deepEqual(earlyScript.matches, ['https://zhst.zstu.edu.cn/statusweb/h5/universityFrontOfficeProgram/*']);

const script = fs.readFileSync(require.resolve('../extension/booking-language.js'), 'utf8');
function setup(url, ready) {
  let observer;
  let observerStopped = false;
  const root = { translate: true };
  const document = {
    documentElement: ready ? root : null,
    head: ready ? [] : null,
    createElement: tag => ({ tag })
  };
  if (document.head) document.head.append = document.head.push;
  vm.runInNewContext(script, {
    document, location: new URL(url), URLSearchParams,
    MutationObserver: class {
      constructor(callback) { observer = callback; }
      observe() {}
      disconnect() { observerStopped = true; }
    }
  });
  return {
    root, document,
    finish() {
      document.documentElement = root;
      document.head = [];
      document.head.append = document.head.push;
      observer?.();
    },
    active: () => Boolean(observer) && !observerStopped
  };
}

const early = setup(BOOKING_URL, false);
assert.ok(early.active());
early.finish();
assert.equal(early.root.translate, false);
assert.deepEqual(early.document.head[0], { tag: 'meta', name: 'google', content: 'notranslate' });
assert.equal(early.active(), false);

const ready = setup(BOOKING_URL, true);
assert.equal(ready.root.translate, false);
assert.equal(ready.document.head[0].content, 'notranslate');

for (const url of [
  BOOKING_URL.replace('spaceType=2', 'spaceType=1'),
  BOOKING_URL.replace('/featuredStalls/roomReserve/Index', '/pages/login')
]) {
  const unrelated = setup(url, true);
  assert.equal(unrelated.root.translate, true);
  assert.equal(unrelated.document.head.length, 0);
  assert.equal(unrelated.active(), false);
}
console.log('Booking-page translation protection passed.');
