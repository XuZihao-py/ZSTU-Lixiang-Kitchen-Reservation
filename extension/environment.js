const { checkEnvironment } = KitchenEnvironmentFlow;
const byId = id => document.getElementById(id);
const result = byId('environment-result');
const retry = byId('recheck');
const openTab = byId('show-tab');
const portalCheck = byId('portal-check');
const milestones = [...document.querySelectorAll('#environment-progress li')];
const params = new URLSearchParams(location.search);
const shouldOpen = params.get('open') === '1';
const owned = new Set();
let relatedTab;
let portalOnly = params.get('portal') === '1';
let reachedPortal = false;
let phase = 0;
const progressLabels = {
  pending: '未开始', current: '进行中', waiting: '待认证',
  complete: '已完成', skipped: '已跳过', error: '异常'
};
const phases = {
  'booking-direct': 0, unreachable: 0,
  'portal-unreachable': 1, 'mobile-unavailable': 1, 'portal-home': 1, 'portal-catalog': 1, 'school-auth': 1,
  'portal-handoff': 2, 'booking-return': 2, 'booking-login': 2, unready: 2,
  'data-read': 3, 'data-empty': 3, ready: 3
};

const steps = {
  'booking-direct': ['预约直达页', '正在打开预约页，检查当前会话。', '无法打开预约直达页。'],
  'portal-unreachable': ['数智浙理门户', '正在用手机模式打开学校门户，尝试恢复预约会话。', '手机模式下门户未加载完成。请检查校园服务及网络。'],
  'mobile-unavailable': ['手机模式', '', 'Chrome 未能启用手机模式。请检查扩展的调试权限，或关闭冲突的开发者工具后重试。'],
  'portal-home': ['门户服务导航', '正在查找学校门户的服务入口。', '门户已打开，但找不到「服务」入口。'],
  'portal-catalog': ['理享食光服务入口', '正在服务中心查找「理享食光」。', '服务中心未载入「理享食光」入口。'],
  'portal-handoff': ['理享食光跳转', '已打开「理享食光」入口，正在等待跳转。', '已在手机模式下打开「理享食光」，但未进入预约系统。'],
  'school-auth': ['学校统一身份认证', '', '学校要求重新认证。打开认证页完成密码、验证码或扫码后，检测会自动继续。'],
  'booking-return': ['共享厨房入口', '正在从理享食光打开共享厨房。', '理享食光已打开，但共享厨房列表未就绪。'],
  'booking-login': ['理享食光登录', '', '已从学校门户进入，预约系统仍要求登录。请查看打开的理享食光页面。'],
  'data-read': ['预约数据验证', '正在读取明天的厨房和时段。', '预约页已打开，但无法核对明天的日期或读取时段。'],
  'data-empty': ['预约数据验证', '', '预约页已打开，但明天没有可核验的厨房和时段。'],
  ready: ['预约数据验证', '', ''],
  offline: ['网络连接', '', 'Chrome 当前离线。恢复连接后再检测。'],
  network: ['预约页网络请求', '', '预约页报告网络异常。请检查连接后再检测。'],
  unreachable: ['预约直达页连接', '', '预约页未响应。请检查网络或校园服务。'],
  unready: ['共享厨房列表', '', '预约页已响应，但未加载出共享厨房列表。'],
  closed: ['检测标签页', '', '检测标签页已关闭。请重新检测。'],
  failed: ['浏览器扩展', '', 'Chrome 无法完成页面检测。请重新加载扩展后再试。']
};

function updateProgress(level, code) {
  if (Object.hasOwn(phases, code)) phase = phases[code];
  if (phase === 1) reachedPortal = true;
  milestones.forEach((item, index) => {
    let state = 'pending';
    if ((index === 0 && portalOnly) || (index === 1 && phase > 1 && !reachedPortal)) {
      state = 'skipped';
    } else if (level === 'ready' || index < phase) {
      state = 'complete';
    } else if (index === phase) {
      state = level === 'error' ? (code === 'school-auth' && retry.disabled ? 'waiting' : 'error') : 'current';
    }
    item.dataset.status = state;
    item.querySelector('.progress-state').textContent = progressLabels[state];
    if (index === phase && level !== 'ready') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

function show(level, code, tabId, data = {}) {
  updateProgress(level, code);
  const [stage, progress, error] = steps[code] || steps.failed;
  relatedTab = tabId;
  result.dataset.level = level;
  byId('environment-heading').textContent = level === 'ready' ? '预约环境正常' :
    level === 'error' ? '预约环境异常' : '正在检测预约环境';
  byId('environment-stage').textContent = (level === 'error' ? '异常位置 ' : '检测阶段 ') + stage;
  byId('environment-message').textContent = level === 'ready' ?
    '已读取 ' + data.date + ' 的有效数据，共 ' + data.kitchens + ' 间厨房、' + data.slots + ' 条时段。' :
    level === 'error' ? error : progress;
  openTab.hidden = tabId == null || level === 'checking';
  openTab.textContent = code === 'school-auth' ? '前往统一认证' : '查看相关页面';
  if (code === 'school-auth' && tabId != null && !retry.disabled) {
    byId('environment-message').textContent = '学校要求重新认证。完成认证后，回到此页点击「重新检测」。';
  }
}

async function check() {
  const previous = result.dataset.level === 'error' ? relatedTab : undefined;
  retry.disabled = true;
  portalCheck.disabled = true;
  reachedPortal = portalOnly;
  phase = portalOnly ? 1 : 0;
  show('checking', portalOnly ? 'portal-unreachable' : 'booking-direct', previous);
  try {
    const response = await checkEnvironment({ open: shouldOpen, portalOnly, previous, publish: show, owned });
    retry.disabled = false;
    show(response.code === 'ready' ? 'ready' : 'error', response.code, response.tabId, response);
  } catch {
    retry.disabled = false;
    show('error', 'failed');
  } finally {
    portalCheck.disabled = false;
  }
}

openTab.addEventListener('click', async () => {
  if (relatedTab == null) return;
  try {
    await chrome.tabs.update(relatedTab, { active: true });
  } catch {
    show('error', 'closed');
  }
});
retry.addEventListener('click', check);
portalCheck.addEventListener('click', () => {
  portalOnly = true;
  check();
});
window.addEventListener('pagehide', () => {
  for (const tabId of owned) void chrome.tabs.remove(tabId).catch(() => {});
});
check();
