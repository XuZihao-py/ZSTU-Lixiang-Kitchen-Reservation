const assert = require('node:assert/strict');
require('../extension/rules.js');
const { pageState, PORTAL_URL, pageKind, summarizeRooms } = require('../extension/environment-check.js');

const booking = '#/featuredStalls/roomReserve/Index?spaceType=2';
assert.equal(new URL(PORTAL_URL).host, 'ie.zstu.edu.cn');
assert.match(PORTAL_URL, /#\/pages\/Home\/index$/);
assert.equal(pageState({ route: booking, listReady: true }), 'ready');
assert.equal(pageState({ route: booking, listReady: true, loading: true }), 'loading');
assert.equal(pageState({ route: booking, listReady: true, text: '登录已过期，请重新登录' }), 'login');
assert.equal(pageState({ route: '#/pages/Login?from=room', listReady: false }), 'login');
assert.equal(pageState({ route: booking, text: '网络异常，请稍后重试' }), 'network');
assert.equal(pageState({ route: '#/featuredStalls/roomReserve/ReserveForm', listReady: true }), 'loading');
assert.equal(pageState({ route: booking, text: '登录后可查看使用说明' }), 'loading');
assert.equal(pageState({ route: booking, text: '暂无可预约厨房', listReady: true }), 'ready');
assert.equal(pageKind(PORTAL_URL), 'portal');
assert.equal(pageKind('https://sso.zstu.edu.cn/login?service=example'), 'sso');
assert.equal(pageKind('https://sso.zstu.edu.cn.evil.invalid/login'), '');
assert.equal(pageKind('https://ie.zstu.edu.cn/zstu-apps-mobile-web/#/home'), 'portal');
assert.equal(pageKind('https://zhst.zstu.edu.cn/statusweb/h5/universityFrontOfficeProgram/#/pages/Login'), 'booking');
assert.equal(pageKind('https://zhst.zstu.edu.cn/unrelated'), '');
assert.deepEqual(summarizeRooms([
  { id: 'XS-03', capacity: 10, listed: ['16:00～18:30', '16:00~18:30'] },
  { id: 'LP-01', capacity: 8, listed: ['10:30~13:00', '16:00~18:30'] },
  { id: 'XS-02', capacity: 0, listed: ['10:30~13:00'] },
  { id: 'XS-01', capacity: 10, listed: ['无有效时段'] },
  { id: 'XS-99', capacity: 10, listed: ['10:30~13:00'] },
  { id: 'XS-03', capacity: 10, listed: ['16:00~18:30'] }
]), { kitchens: 2, slots: 3 });
assert.deepEqual(summarizeRooms([]), { kitchens: 0, slots: 0 });
console.log('预约环境检测规则测试通过。');
