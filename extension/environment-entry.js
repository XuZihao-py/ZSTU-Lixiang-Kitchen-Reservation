(() => {
  const { pageKind } = KitchenEnvironment;
  const kind = pageKind(location.href);
  const controls = 'a, button, [role="button"], [role="tab"], uni-button, uni-text, span, div';
  const clicked = new Set();

  function findControl(root, labels) {
    return [...root.querySelectorAll(controls)].reverse().find(element => {
      const text = element.textContent.trim().replace(/\s+/g, '');
      return labels.includes(text) && element.getClientRects().length &&
        element.ownerDocument.defaultView.getComputedStyle(element).visibility === 'visible' &&
        !element.closest('[hidden], [aria-hidden="true"], [disabled], [aria-disabled="true"]');
    });
  }

  function clickOnce(step, element) {
    if (!clicked.has(step)) {
      clicked.add(step);
      element.click();
    }
  }

  function enterFromPortal() {
    const frames = [...document.querySelectorAll('iframe')].filter(frame => frame.getClientRects().length);
    if (frames.some(frame => pageKind(frame.src) === 'booking')) return 'embedded';
    // 服务中心是同源 iframe。仅读取该入口的公开控件名称。
    const catalogs = frames.filter(frame => pageKind(frame.src) === 'portal').map(frame => frame.contentDocument).filter(Boolean);
    for (const catalog of [...catalogs, document]) {
      const service = findControl(catalog, ['理享食光', '理享时光']);
      if (service) {
        clickOnce('portal-handoff', service);
        return 'handoff';
      }
    }
    if (catalogs.length || /^#\/pages\/Application\/index(?:\?|$)/i.test(location.hash) ||
        location.pathname.startsWith('/zstu-apps-mobile-web/')) return 'catalog';
    const services = findControl(document, ['服务']);
    if (services) {
      clickOnce('portal-catalog', services);
      return 'catalog';
    }
    return 'home';
  }

  function enterBooking() {
    if (/^#\/featuredstalls\/roomreserve\//i.test(location.hash)) return 'booking';
    if (/^#\/pages\/login(?:\?|$)/i.test(location.hash)) return 'login';
    const kitchen = findControl(document, ['共享厨房', '共享厨房预约', '共享厨房预订']);
    if (kitchen) {
      clickOnce('booking-entry', kitchen);
      return 'entry';
    }
    return 'waiting';
  }

  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request.kind !== 'environment-entry') return;
    if (kind === 'portal') respond({ state: enterFromPortal() });
    if (kind === 'booking') respond({ state: enterBooking() });
  });
})();
