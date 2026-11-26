const { checkEnvironment } = KitchenEnvironmentFlow;
const byId = id => document.getElementById(id);
const result = byId('environment-result');
const retry = byId('recheck');
const openTab = byId('show-tab');
const portalCheck = byId('portal-check');
const returnHome = byId('return-home');
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
  'portal-handoff': 2, 'booking-return': 2, 'booking-auth': 2, 'booking-login': 2, unready: 2,
  'data-read': 3, 'data-empty': 3, ready: 3
};

const { steps } = KitchenEnvironmentStatus;

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
  returnHome.hidden = true;
  retry.className = 'primary';
  retry.disabled = true;
  portalCheck.disabled = true;
  reachedPortal = portalOnly;
  phase = portalOnly ? 1 : 0;
  const id = crypto.randomUUID();
  const notify = (kind, code, level) => chrome.runtime.sendMessage({ kind, id, code, level }).catch(console.warn);
  show('checking', portalOnly ? 'portal-unreachable' : 'booking-direct', previous);
  let report;
  try {
    await notify('environment-start');
    report = await checkEnvironment({ open: shouldOpen, portalOnly, previous, owned,
      publish(level, stage, tabId) {
        show(level, stage, tabId);
        void notify('environment-update', stage, level === 'error' ? 'waiting' : 'checking');
      }
    });
  } catch {
    report = { code: 'failed' };
  }
  const { code, tabId } = report;
  const saved = await notify('environment-finish', code);
  retry.disabled = false;
  portalCheck.disabled = false;
  show(code === 'ready' ? 'ready' : 'error', code, tabId, report);
  if (code === 'ready') {
    if (saved?.ok) {
      returnHome.hidden = false;
      retry.className = 'secondary';
    } else {
      byId('environment-message').append(' 结果暂未同步到预约助手，请重新检测。');
    }
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
