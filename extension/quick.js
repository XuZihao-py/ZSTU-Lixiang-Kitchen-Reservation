(() => {
  const state = document.getElementById('state');
  const detail = document.getElementById('quick-plan');
  const feedback = document.getElementById('quick-error');
  const buttons = document.querySelectorAll('button[data-view]');
  const { planLabel, mountEnvironmentSummary } = KitchenSummary;

  function renderPlan(plan) {
    state.textContent = planLabel(plan);
    const slot = plan?.date ? plan.date + ' · ' + plan.start + '–' + plan.end : '';
    detail.textContent = [slot, plan?.message].filter(Boolean).join(' · ') || '暂无预约任务。';
  }

  let receivedUpdate = false;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.plan) return;
    receivedUpdate = true;
    renderPlan(changes.plan.newValue);
  });
  chrome.storage.local.get('plan').then(({ plan }) => {
    if (!receivedUpdate) renderPlan(plan);
  }).catch(console.warn);

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      buttons.forEach(control => { control.disabled = true; });
      feedback.hidden = true;
      try {
        const result = await chrome.runtime.sendMessage({ kind: 'open-workbench', view: button.dataset.view });
        if (!result?.ok) throw new Error('无法打开预约工作台。');
        window.close();
      } catch {
        feedback.textContent = '无法打开预约工作台，请重试。';
        feedback.hidden = false;
      } finally {
        buttons.forEach(control => { control.disabled = false; });
      }
    });
  }

  mountEnvironmentSummary();
})();
