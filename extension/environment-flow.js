(() => {
  const { BOOKING_URL, localDay } = KitchenPlan;
  const { PORTAL_URL, pageKind, inspectBooking, summarizeRooms } = KitchenEnvironment;
  const { createMobileSession } = KitchenEnvironmentMobile;
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const getTab = id => chrome.tabs.get(id).catch(() => null);
  const signal = (id, kind) => chrome.tabs.sendMessage(id, { kind }, { frameId: 0 }).catch(() => null);
  const address = tab => tab.pendingUrl || tab.url || '';

  async function recover(initial, owned, publish, mobile, reveal) {
    const hardDeadline = Date.now() + 165_000;
    let code = 'portal-unreachable';
    let deadline = Date.now() + 14_000;
    let currentId = initial;
    let authAt;
    let appAt;
    let retried = false;
    let publishedTab = initial;
    publish('checking', code, currentId);

    function step(next, timeout = 14_000) {
      if (code !== next) deadline = Date.now() + timeout;
      else if (publishedTab === currentId) return;
      code = next;
      publishedTab = currentId;
      publish(next === 'school-auth' ? 'error' : 'checking', next, currentId);
    }

    while (Date.now() < Math.min(deadline, hardDeadline)) {
      if (navigator.onLine === false) return { code: 'offline', tabId: currentId };
      for (const id of [...owned].reverse()) {
        const tab = await getTab(id);
        if (tab && pageKind(address(tab))) {
          currentId = id;
          break;
        }
      }
      const tab = await getTab(currentId);
      if (!tab) return { code: 'closed', tabId: currentId };
      const kind = pageKind(address(tab));
      const route = address(tab);
      if (kind && !await mobile.enable(currentId)) return { code: 'mobile-unavailable' };
      if (['portal', 'booking'].includes(kind) && !await mobile.keepVisible(currentId)) await reveal(currentId);

      if (kind === 'sso') {
        authAt ??= Date.now();
        if (Date.now() - authAt >= 700) step('school-auth', 120_000);
      } else {
        authAt = undefined;
      }

      if (kind === 'portal') {
        if (code === 'school-auth') step('portal-unreachable');
        const response = await signal(currentId, 'environment-entry');
        switch (response?.state) {
          case 'home':
            if (!['portal-catalog', 'portal-handoff'].includes(code)) step('portal-home');
            break;
          case 'catalog':
            if (code !== 'portal-handoff') step('portal-catalog');
            break;
          case 'handoff':
            step('portal-handoff');
            break;
          case 'embedded':
            if (!retried) {
              retried = true;
              step('booking-return');
              await chrome.tabs.update(currentId, { url: BOOKING_URL });
            }
            break;
        }
      }

      if (kind === 'booking') {
        const snapshot = await signal(currentId, 'booking-environment');
        if (snapshot?.state === 'ready') return { code: 'ready', tabId: currentId };
        if (snapshot?.state === 'network') return { code: 'network', tabId: currentId };
        if (snapshot?.state === 'login') {
          step('booking-login', 2600);
        } else if (/#\/pages\/redirect(?:\?|$)/i.test(route)) {
          // 等待理享食光完成门户跳转，提前打开直达页会中断会话恢复。
          step('booking-auth', 30_000);
          appAt = undefined;
        } else {
          step('booking-return');
          const entry = await signal(currentId, 'environment-entry');
          if (entry?.state === 'waiting' && !/roomReserve\/Index/i.test(route)) {
            appAt ??= Date.now();
            if (!retried && Date.now() - appAt >= 1800) {
              retried = true;
              await chrome.tabs.update(currentId, { url: BOOKING_URL });
            }
          } else {
            appAt = undefined;
          }
        }
      }
      await sleep(350);
    }

    return { code, tabId: currentId };
  }

  async function verifyData(tabId) {
    const date = localDay(Date.now() + 86_400_000);
    const result = await chrome.tabs.sendMessage(tabId,
      { kind: 'list-slots', date, deadline: Date.now() + 14_000 }, { frameId: 0 }).catch(() => null);
    if (!result?.ok || !Array.isArray(result.rooms)) {
      const state = (await signal(tabId, 'booking-environment'))?.state;
      return { code: state === 'login' ? 'booking-login' : state === 'network' ? 'network' : 'data-read', tabId, date };
    }
    const count = summarizeRooms(result.rooms);
    if (!count.slots) return { code: 'data-empty', tabId, date };
    return { code: 'ready', tabId, date, ...count };
  }

  async function checkEnvironment({ open, portalOnly, previous, publish, owned }) {
    let preserve;
    let previousActive;
    let result;
    const revealed = new Set();
    const mobile = createMobileSession(chrome.debugger, navigator.userAgent);
    const track = ({ sourceTabId, tabId, url }) => {
      if (owned.has(sourceTabId) && pageKind(url)) owned.add(tabId);
    };
    const navigation = chrome.webNavigation.onCreatedNavigationTarget;
    navigation.addListener(track, {
      url: ['ie.zstu.edu.cn', 'sso.zstu.edu.cn', 'zhst.zstu.edu.cn'].map(hostEquals => ({
        schemes: ['https'], hostEquals
      }))
    });
    try {
      const source = await chrome.tabs.getCurrent();
      const previousTab = previous != null && await getTab(previous);
      const previousKind = previousTab && pageKind(address(previousTab));
      const reuse = previousKind === 'portal' || previousKind === 'sso';
      const tab = reuse ? previousTab :
        await chrome.tabs.create({ url: 'about:blank', active: false, windowId: source?.windowId });
      owned.add(tab.id);
      if (previousKind === 'booking') await chrome.tabs.remove(previousTab.id).catch(() => {});

      async function reveal(id) {
        if (revealed.has(id)) return;
        const tab = await getTab(id);
        if (!tab) return;
        revealed.add(id);
        if (tab.active) return;
        const [active] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
        previousActive ??= active;
        await chrome.tabs.update(id, { active: true }).catch(() => {});
      }

      async function verifyIfReady(result) {
        if (result.code !== 'ready') return result;
        publish('checking', 'data-read', result.tabId);
        return verifyData(result.tabId);
      }

      async function throughPortal() {
        publish('checking', 'portal-unreachable', tab.id);
        if (!await mobile.enable(tab.id)) return { code: 'mobile-unavailable' };
        // 服务中心在前台加载后才会显示可用入口。
        await reveal(tab.id);
        if (previousKind !== 'sso') {
          try {
            await chrome.tabs.update(tab.id, { url: PORTAL_URL });
          } catch {
            return { code: 'portal-unreachable' };
          }
        }
        return verifyIfReady(await recover(tab.id, owned, publish, mobile, reveal));
      }

      if (reuse || portalOnly) {
        result = await throughPortal();
      } else {
        publish('checking', 'booking-direct', tab.id);
        if (!await mobile.keepVisible(tab.id)) await reveal(tab.id);
        await chrome.tabs.update(tab.id, { url: BOOKING_URL });
        const code = await inspectBooking(tab.id, Date.now() + 14_000);
        result = await verifyIfReady({ code, tabId: tab.id });
        if (['login', 'booking-login'].includes(result.code)) result = await throughPortal();
      }

      if (result.code === 'ready' && open) {
        await chrome.tabs.update(result.tabId, { active: true });
        preserve = result.tabId;
      }
      if (['school-auth', 'portal-home', 'portal-catalog', 'portal-handoff', 'portal-unreachable',
        'booking-return', 'booking-auth', 'booking-login', 'data-read', 'data-empty'].includes(result.code)) {
        preserve = result.tabId;
      }
      return { ...result, tabId: preserve };
    } finally {
      navigation.removeListener(track);
      await mobile.close();
      if (previousActive && !(open && result?.code === 'ready')) {
        const [active] = await chrome.tabs.query({ active: true, windowId: previousActive.windowId }).catch(() => []);
        if (owned.has(active?.id)) await chrome.tabs.update(previousActive.id, { active: true }).catch(() => {});
      }
      for (const id of owned) {
        if (id !== preserve) await chrome.tabs.remove(id).catch(() => {});
      }
      owned.clear();
    }
  }

  async function checkAutomatically(publish) {
    if (navigator.onLine === false) return { code: 'offline' };
    const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
    const pageSession = createMobileSession(chrome.debugger, navigator.userAgent);
    try {
      await pageSession.keepVisible(tab.id);
      await chrome.tabs.update(tab.id, { url: BOOKING_URL });
      const code = await inspectBooking(tab.id, Date.now() + 14_000);
      if (code === 'login') return { code: 'school-auth' };
      if (code !== 'ready') return { code };
      publish('data-read');
      const report = await verifyData(tab.id);
      return report.code === 'booking-login' ? { code: 'school-auth' } : report;
    } finally {
      await pageSession.close();
      await chrome.tabs.remove(tab.id).catch(() => {});
    }
  }

  globalThis.KitchenEnvironmentFlow = { checkEnvironment, checkAutomatically };
})();
