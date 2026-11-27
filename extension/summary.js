(() => {
  const labels = {
    pending: '待预约', running: '预约中', success: '预约成功', failed: '预约失败'
  };

  function planStatus(plan) {
    let level = 'pending';
    if (plan?.state === 'success') level = 'success';
    else if (['running', 'submitting'].includes(plan?.state)) level = 'running';
    else if (['unavailable', 'failed', 'expired', 'manual', 'uncertain'].includes(plan?.state)) level = 'failed';
    return { level, label: labels[level] };
  }

  function renderPlanStatus(plan) {
    const status = planStatus(plan);
    const badge = document.getElementById('state');
    badge.dataset.level = status.level;
    const needsReview = plan?.state === 'uncertain' || (plan?.state === 'manual' && plan.commitAt);
    badge.title = needsReview ? '自动预约未确认，请到「我的预约」核对。' : '';
    if (badge.textContent !== status.label) badge.textContent = status.label;
  }

  function mountEnvironmentSummary() {
    const card = document.getElementById('environment-summary');
    const title = document.getElementById('home-environment-title');
    const detail = document.getElementById('home-environment-detail');
    let revision = 0;
    let refreshTimer;

    async function render() {
      const current = ++revision;
      const [{ environmentResult }, { environmentRun }] = await Promise.all([
        chrome.storage.local.get('environmentResult'), chrome.storage.session.get('environmentRun')
      ]);
      if (current !== revision) return;
      const now = Date.now();
      const summary = KitchenEnvironmentStatus.viewStatus(environmentResult, environmentRun, now);
      clearTimeout(refreshTimer);
      if (summary.refreshAt != null) {
        refreshTimer = setTimeout(refresh, Math.max(0, summary.refreshAt - Date.now()));
      }
      card.dataset.level = summary.level;
      title.textContent = summary.title;
      detail.textContent = summary.detail +
        (summary.checkedAt != null ? ' · ' + KitchenPlan.formatTime(summary.checkedAt) + ' 检测' : '');
    }

    function refresh() {
      render().catch(console.warn);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if ((area === 'local' && changes.environmentResult) || (area === 'session' && changes.environmentRun)) {
        refresh();
      }
    });
    refresh();
  }

  const api = { planStatus, renderPlanStatus, mountEnvironmentSummary };
  globalThis.KitchenSummary = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
