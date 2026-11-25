(() => {
  const PORTAL_URL = 'https://ie.zstu.edu.cn/zstu-portal-mobile-web/#/pages/Home/index';
  const LOGIN_NOTICE = /登录已过期[，,\s]*请重新登录|请先登录|未登录[，,\s]*请先登录|登录状态已失效|登录失效[，,\s]*请重新登录/;
  const NETWORK_NOTICE = /网络异常|网络连接失败|网络连接超时|请求超时[，,\s]*请稍后重试/;
  const shown = element => Boolean(element?.getClientRects().length);

  function pageState({ route = '', text = '', listReady = false, loading = false }) {
    const path = route.split('?')[0].toLowerCase();
    if (path === '#/pages/login' || LOGIN_NOTICE.test(text)) return 'login';
    if (NETWORK_NOTICE.test(text)) return 'network';
    return path === '#/featuredstalls/roomreserve/index' && listReady && !loading ? 'ready' : 'loading';
  }

  function readPage() {
    const container = document.querySelector('.room-reserve');
    const calendar = container?.querySelector('.date-bar .uni-date-editor');
    const cards = container?.querySelectorAll('.room-card') ?? [];
    const empty = container?.querySelector('.yq-uni-p-r-list .no-data');
    const notices = [...document.querySelectorAll('uni-toast, .uni-toast, uni-modal, [role="alert"]')]
      .filter(shown).map(node => node.innerText ?? '');
    // 登录过期提示会短暂出现在预约页，随后才跳到登录路由。
    const text = document.body?.innerText.trim() ?? '';
    if (text.length < 180) notices.push(text);
    return pageState({
      route: location.hash,
      text: notices.join(' '),
      listReady: shown(calendar) && ([...cards].some(shown) || shown(empty)),
      loading: notices.some(notice => notice.includes('加载中'))
    });
  }

  async function inspectBooking(tabId, deadline) {
    let answered = false;
    let readyAt = null;
    while (Date.now() < deadline) {
      if (navigator.onLine === false) return 'offline';
      if (!await chrome.tabs.get(tabId).catch(() => null)) return 'closed';
      const result = await chrome.tabs.sendMessage(tabId, { kind: 'booking-environment' }, { frameId: 0 }).catch(() => null);
      if (result) answered = true;
      if (result?.state === 'login' || result?.state === 'network') return result.state;
      if (result?.state === 'ready') {
        readyAt ??= Date.now();
        if (Date.now() - readyAt >= 300) return 'ready';
      } else {
        readyAt = null;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return answered ? 'unready' : 'unreachable';
  }

  if (typeof document !== 'undefined' && location.hostname === 'zhst.zstu.edu.cn' && globalThis.chrome?.runtime?.id) {
    chrome.runtime.onMessage.addListener((request, _sender, respond) => {
      if (request.kind === 'booking-environment') respond({ state: readPage() });
    });
  }
  const api = { PORTAL_URL, pageState, inspectBooking };
  globalThis.KitchenEnvironment = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
