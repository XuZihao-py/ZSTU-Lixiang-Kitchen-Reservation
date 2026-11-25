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

  function activateOnce(step, element, state, touch = false) {
    if (!clicked.has(step)) {
      clicked.add(step);
      // 门户目录的服务卡片使用 touchstart 和 touchend，普通点击无法打开。
      const { TouchEvent } = element.ownerDocument.defaultView;
      const touchOptions = { bubbles: true, cancelable: true, composed: true };
      const start = !touch || element.dispatchEvent(new TouchEvent('touchstart', touchOptions));
      const end = !touch || element.dispatchEvent(new TouchEvent('touchend', touchOptions));
      if (start && end) element.click();
    }
    return { state };
  }

  function enterFromPortal() {
    const frames = [...document.querySelectorAll('iframe')].filter(frame => frame.getClientRects().length);
    if (frames.some(frame => pageKind(frame.src) === 'booking')) return { state: 'embedded' };
    // 服务中心是同源 iframe。仅读取该入口的公开控件名称。
    const catalogs = frames.filter(frame => pageKind(frame.src) === 'portal').map(frame => frame.contentDocument).filter(Boolean);
    for (const catalog of [...catalogs, document]) {
      const service = findControl(catalog, ['理享食光', '理享时光']);
      if (service) {
        return activateOnce('portal-handoff', service, 'handoff', true);
      }
    }
    if (catalogs.length || /^#\/pages\/Application\/index(?:\?|$)/i.test(location.hash) ||
        location.pathname.startsWith('/zstu-apps-mobile-web/')) return { state: 'catalog' };
    const services = findControl(document, ['服务']);
    if (services) {
      return activateOnce('portal-catalog', services, 'catalog');
    }
    return { state: 'home' };
  }

  function enterBooking() {
    if (/^#\/featuredstalls\/roomreserve\//i.test(location.hash)) return { state: 'booking' };
    if (/^#\/pages\/login(?:\?|$)/i.test(location.hash)) return { state: 'login' };
    const kitchen = findControl(document, ['共享厨房', '共享厨房预约', '共享厨房预订']);
    if (kitchen) {
      return activateOnce('booking-entry', kitchen, 'entry');
    }
    return { state: 'waiting' };
  }

  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request.kind !== 'environment-entry') return;
    if (kind === 'portal') respond(enterFromPortal());
    if (kind === 'booking') respond(enterBooking());
  });
})();
