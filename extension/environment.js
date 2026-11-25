const { PORTAL_URL } = KitchenEnvironment;
const byId = id => document.getElementById(id);
const retry = byId('recheck');
const portalButton = byId('open-portal');
const guide = byId('portal-guide');
const portalFeedback = byId('portal-feedback');
const shouldOpen = new URLSearchParams(location.search).get('open') === '1';
let portalTabId;

const statuses = {
  checking: ['正在检测预约页', '正在检查登录状态和共享厨房列表。'],
  ready: ['预约环境正常', '新的预约标签页已正常载入共享厨房列表，当前登录有效。'],
  login: ['预约登录已失效', '请从学校门户重新进入理享食光，再重新检测。'],
  offline: ['浏览器当前离线', '请恢复网络连接，再重新检测。'],
  network: ['预约页报告网络异常', '请检查网络连接，再重新检测。'],
  unreachable: ['无法打开预约页', '请检查网络连接或校园服务状态，再重新检测。'],
  unready: ['预约页尚未就绪', '页面已响应，但未加载出共享厨房列表。可尝试从学校门户重新进入。'],
  closed: ['检测标签页已关闭', '请点击「重新检测」，并让检测运行至结束。'],
  failed: ['无法完成环境检测', '请重新检测，或从学校门户进入预约页。']
};

function show(state) {
  const [heading, message] = statuses[state] || statuses.failed;
  byId('environment-heading').textContent = heading;
  byId('environment-message').textContent = message;
  const offerPortal = ['login', 'unready', 'unreachable', 'failed'].includes(state);
  guide.hidden = !offerPortal;
  portalButton.hidden = !offerPortal;
  portalFeedback.hidden = true;
}

async function openPortal(activate) {
  portalButton.disabled = true;
  try {
    const current = portalTabId != null && await chrome.tabs.get(portalTabId).catch(() => null);
    if (current) {
      if (activate) await chrome.tabs.update(portalTabId, { active: true });
      return true;
    }
    const page = await chrome.tabs.getCurrent();
    const tab = await chrome.tabs.create({ url: 'about:blank', active: activate, windowId: page?.windowId });
    try {
      await chrome.tabs.update(tab.id, { url: PORTAL_URL });
    } catch (error) {
      await chrome.tabs.remove(tab.id).catch(() => {});
      throw error;
    }
    portalTabId = tab.id;
    portalFeedback.textContent = '已打开数智浙理标签页。';
    portalFeedback.hidden = false;
    return true;
  } catch {
    portalFeedback.textContent = 'Chrome 无法打开学校门户，请通过书签或学校官网进入。';
    portalFeedback.hidden = false;
    return false;
  } finally {
    portalButton.disabled = false;
  }
}

async function check() {
  retry.disabled = true;
  show('checking');
  try {
    const response = await chrome.runtime.sendMessage({ kind: 'check-environment', open: shouldOpen });
    if (!response?.ok) throw new Error('无法完成环境检测');
    show(response.state);
    if (response.state === 'login') await openPortal(shouldOpen);
    if (response.opened) {
      byId('environment-message').textContent += ' 已打开预约网页。';
    }
  } catch {
    show('failed');
  } finally {
    retry.disabled = false;
  }
}

portalButton.addEventListener('click', () => openPortal(true));
retry.addEventListener('click', check);
check();
