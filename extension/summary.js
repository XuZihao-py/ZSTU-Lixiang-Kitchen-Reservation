(() => {
  const labels = {
    scheduled: '已安排', preparing: '准备中', waiting: '待命', running: '预约中',
    submitting: '等回执', success: '预约成功', unavailable: '无可约名额', manual: '请到网页查看',
    uncertain: '待核对', failed: '预约失败', cancelled: '已停止', expired: '已超时'
  };

  function planLabel(plan) {
    return labels[plan?.state] || '未设置';
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

  globalThis.KitchenSummary = { planLabel, mountEnvironmentSummary };
})();
