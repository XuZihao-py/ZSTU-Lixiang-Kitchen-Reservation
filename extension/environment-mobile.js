(() => {
  function createMobileSession(api, browserAgent) {
    const attached = new Set();
    const interrupted = new Set();
    const version = /Chrome\/(\d+)/.exec(browserAgent)?.[1] ?? '120';
    const mobileAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/' + version + '.0.0.0 Mobile Safari/537.36';

    function onDetached({ tabId }) {
      if (attached.delete(tabId)) interrupted.add(tabId);
    }

    api?.onDetach.addListener(onDetached);

    async function detach(tabId) {
      if (attached.delete(tabId)) await api.detach({ tabId }).catch(() => {});
    }

    async function enable(tabId) {
      if (!api || interrupted.has(tabId)) return false;
      if (attached.has(tabId)) return true;
      const target = { tabId };
      try {
        await api.attach(target, '1.3');
        attached.add(tabId);
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
        return attached.has(tabId);
      } catch {
        await detach(tabId);
        return false;
      }
    }

    async function close() {
      api?.onDetach.removeListener(onDetached);
      await Promise.all([...attached].map(detach));
    }

    return { enable, close };
  }

  const api = { createMobileSession };
  globalThis.KitchenEnvironmentMobile = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
