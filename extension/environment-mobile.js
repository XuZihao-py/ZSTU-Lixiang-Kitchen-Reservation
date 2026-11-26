(() => {
  function createMobileSession(api, browserAgent) {
    const attached = new Set();
    const mobile = new Set();
    const visible = new Set();
    const interrupted = new Set();
    const version = /Chrome\/(\d+)/.exec(browserAgent)?.[1] ?? '120';
    const mobileAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/' + version + '.0.0.0 Mobile Safari/537.36';

    function onDetached({ tabId }) {
      if (attached.delete(tabId)) interrupted.add(tabId);
      mobile.delete(tabId);
      visible.delete(tabId);
    }

    api?.onDetach.addListener(onDetached);

    async function detach(tabId) {
      mobile.delete(tabId);
      visible.delete(tabId);
      if (attached.delete(tabId)) await api.detach({ tabId }).catch(() => {});
    }

    async function attach(tabId) {
      if (!api || interrupted.has(tabId)) return false;
      if (attached.has(tabId)) return true;
      try {
        await api.attach({ tabId }, '1.3');
        attached.add(tabId);
        return true;
      } catch {
        return false;
      }
    }

    async function keepVisible(tabId) {
      if (visible.has(tabId)) return true;
      if (!await attach(tabId)) return false;
      try {
        // 保持后台页面可渲染，预约页依赖的渲染回调才能继续运行。
        await api.sendCommand({ tabId }, 'Emulation.setFocusEmulationEnabled', { enabled: true });
        if (!attached.has(tabId)) return false;
        visible.add(tabId);
        return true;
      } catch {
        if (!mobile.has(tabId)) await detach(tabId);
        return false;
      }
    }

    async function enable(tabId) {
      if (mobile.has(tabId)) return true;
      if (!await attach(tabId)) return false;
      const target = { tabId };
      try {
        await api.sendCommand(target, 'Emulation.setUserAgentOverride', {
          userAgent: mobileAgent,
          platform: 'Linux armv8l',
          userAgentMetadata: {
            brands: [{ brand: 'Chromium', version }, { brand: 'Google Chrome', version }],
            platform: 'Android', platformVersion: '10.0.0', architecture: 'arm', model: 'Pixel 7', mobile: true
          }
        });
        await api.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
          width: 393, height: 851, screenWidth: 393, screenHeight: 851, deviceScaleFactor: 2.75, mobile: true
        });
        await api.sendCommand(target, 'Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        if (!attached.has(tabId)) return false;
        mobile.add(tabId);
        return true;
      } catch {
        await detach(tabId);
        return false;
      }
    }

    async function close() {
      api?.onDetach.removeListener(onDetached);
      await Promise.all([...attached].map(detach));
    }

    return { enable, keepVisible, close };
  }

  const api = { createMobileSession };
  globalThis.KitchenEnvironmentMobile = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
