(() => {
  const detail = document.getElementById('quick-plan');
  const feedback = document.getElementById('quick-error');
  const buttons = document.querySelectorAll('button[data-view]');
  const { renderPlanStatus, mountEnvironmentSummary } = KitchenSummary;

  function renderPlan(plan) {
    renderPlanStatus(plan);
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

  const notice = document.getElementById('runtime-notice');
  const overview = document.getElementById('quick-overview');
  const dismiss = document.getElementById('dismiss-notice');
  const confirm = document.getElementById('confirm-notice');
  const reopen = document.getElementById('show-notice');

  async function readNoticePreference() {
    const { skipRuntimeNotice } = await chrome.storage.local.get('skipRuntimeNotice');
    dismiss.checked = skipRuntimeNotice === true;
  }

  function showNotice() {
    overview.hidden = true;
    notice.hidden = false;
    confirm.focus();
  }

  reopen.addEventListener('click', showNotice);
  function showOverview() {
    notice.hidden = true;
    overview.hidden = false;
  }

  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    try {
      await chrome.storage.local.set({ skipRuntimeNotice: dismiss.checked });
    } catch {
      feedback.textContent = '未能保存提醒设置，本次仍可继续。';
      feedback.hidden = false;
    } finally {
      confirm.disabled = false;
    }
    showOverview();
    reopen.focus();
  });
  readNoticePreference().then(() => {
    if (dismiss.checked) showOverview();
    else showNotice();
  }).catch(showNotice);

  mountEnvironmentSummary();
})();
