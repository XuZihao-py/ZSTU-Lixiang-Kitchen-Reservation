(() => {
  const labels = {
    pending: '待预约', running: '预约中', success: '预约成功', failed: '预约失败'
  };

  function planStatus(plan) {
    let level = 'pending';
    if (plan?.state === 'success') level = 'success';
    else if (['running', 'submitting', 'uncertain'].includes(plan?.state) ||
        (plan?.state === 'manual' && plan.commitAt)) level = 'running';
    else if (['unavailable', 'failed', 'expired', 'manual'].includes(plan?.state)) level = 'failed';
    return { level, label: labels[level] };
  }

  function renderPlanStatus(plan) {
    const status = planStatus(plan);
    const badge = document.getElementById('state');
    badge.dataset.level = status.level;
    if (badge.textContent !== status.label) badge.textContent = status.label;
  }

  function mountEnvironmentSummary() {
    const card = document.getElementById('environment-summary');
    const title = document.getElementById('home-environment-title');
    const detail = document.getElementById('home-environment-detail');
    let revision = 0;

    async function render() {
      const current = ++revision;
      const [{ environmentResult }, { environmentRun }] = await Promise.all([
        chrome.storage.local.get('environmentResult'), chrome.storage.session.get('environmentRun')
      ]);
      if (current !== revision) return;
      const summary = KitchenEnvironmentStatus.viewStatus(environmentResult, environmentRun);
      card.dataset.level = summary.level;
      title.textContent = summary.title;
      detail.textContent = summary.detail +
        (summary.checkedAt != null ? ' · ' + KitchenPlan.formatTime(summary.checkedAt) + ' 检测' : '');
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if ((area === 'local' && changes.environmentResult) || (area === 'session' && changes.environmentRun)) {
        render().catch(console.warn);
      }
    });
    render().catch(console.warn);
  }

  const api = { planStatus, renderPlanStatus, mountEnvironmentSummary };
  globalThis.KitchenSummary = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
