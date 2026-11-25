const assert = require('node:assert/strict');
const { pageState, PORTAL_URL } = require('../extension/environment-check.js');

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
console.log('预约环境检测规则测试通过。');
