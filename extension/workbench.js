(() => {
  const panels = {
    reservation: document.getElementById('workbench-reservation'),
    environment: document.getElementById('workbench-environment'),
    logs: document.getElementById('workbench-logs')
  };
  const links = document.querySelectorAll('.workbench-nav a');

  for (const frame of [panels.environment, panels.logs]) {
    let size;
    frame.addEventListener('load', () => {
      size?.disconnect();
      const body = frame.contentDocument?.body;
      if (!body) return;
      size = new ResizeObserver(() => {
        if (!frame.hidden) frame.style.height = Math.ceil(body.getBoundingClientRect().height) + 'px';
      });
      size.observe(body);
    });
  }

  function renderRoute() {
    const route = location.hash.slice(1);
    const view = Object.hasOwn(panels, route) ? route : 'reservation';
    for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== view;
    for (const link of links) {
      if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (view === 'environment' && !panels.environment.hasAttribute('src')) {
      panels.environment.src = 'environment.html';
    }
    if (view === 'logs' && !panels.logs.hasAttribute('src')) panels.logs.src = 'log.html';
    return view;
  }

  document.getElementById('visit').addEventListener('click', () => {
    panels.environment.src = 'environment.html?open=1';
    location.hash = 'environment';
  });
  window.addEventListener('hashchange', renderRoute);
  if (renderRoute() !== 'environment') {
    chrome.runtime.sendMessage({ kind: 'environment-auto' }).catch(console.warn);
  }
})();
