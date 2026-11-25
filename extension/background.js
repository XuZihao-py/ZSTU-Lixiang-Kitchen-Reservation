importScripts('rules.js', 'booking-log.js');

const { BOOKING_URL, ACTIVE, buildPlan, canClaim, canCommit, validDate, localDay, listedSlots } = KitchenPlan;
const PREPARE = 'kitchen-prepare';
const EXPIRE = 'kitchen-expire';
const START = 'kitchen-start';
let pending = Promise.resolve();
let lookingUp = false;
let bookingHistory;

function enqueue(action) {
  const result = pending.then(action);
  pending = result.catch(error => console.error('预约后台', error));
  return result;
}

async function read() {
  return (await chrome.storage.local.get('plan')).plan;
}

async function saveEvent(plan, kind, details = {}, savePlan = false) {
  if (kind) {
    try {
      const history = bookingHistory ?? (await chrome.storage.local.get('bookingHistory')).bookingHistory ?? [];
      const updated = KitchenLog.addEvent(history, plan, kind, details);
      if (updated !== history) {
        await chrome.storage.local.set(savePlan ? { plan, bookingHistory: updated } : { bookingHistory: updated });
        bookingHistory = updated;
        return;
      }
    } catch (error) {
      console.warn('无法保存预约日志', error);
    }
  }
  if (savePlan) await chrome.storage.local.set({ plan });
}

async function update(plan, changes, event = changes.state, details = {}) {
  const next = { ...plan, ...changes, updatedAt: Date.now() };
  await saveEvent(next, event, { ...details, at: next.updatedAt }, true);
  const badge = {
    scheduled: '待命', preparing: '准备', waiting: '待命', running: '进行',
    submitting: '确认', success: '成功', manual: '查看', uncertain: '核对',
    unavailable: '已满', failed: '失败', expired: '超时'
  }[next.state] || '';
  await chrome.action.setBadgeBackgroundColor({ color: next.state === 'success' ? '#19704d' : '#395c51' });
  await chrome.action.setBadgeText({ text: badge });
  return next;
}

async function finish(plan, state, message, reason) {
  await update(plan, { state, message }, state, { reason });
  await chrome.alarms.clear(PREPARE);
  await chrome.alarms.clear(EXPIRE);
  await chrome.alarms.clear(START);
  chrome.power.releaseKeepAwake();
}

async function reconcile() {
  const plan = await read();
  if (!plan || !ACTIVE.includes(plan.state)) return;
  const now = Date.now();
  if (now >= plan.deadline) {
    await finish(plan, plan.state === 'submitting' ? 'uncertain' : 'expired',
      plan.state === 'submitting' ? '提交后未收到明确回执，请到「我的预约」核对。' : '预约尝试窗口已结束。',
      plan.state === 'preparing' ? 'page' : undefined);
    return;
  }
  await chrome.alarms.create(EXPIRE, { when: plan.deadline });
  if (now < plan.startAt) await chrome.alarms.create(START, { when: plan.startAt });
  if (now < plan.prepareAt) {
    await chrome.alarms.create(PREPARE, { when: plan.prepareAt });
    return;
  }
  chrome.power.requestKeepAwake('display');
  if (plan.state !== 'scheduled' && plan.tabId != null) {
    const tab = await chrome.tabs.get(plan.tabId).catch(() => null);
    if (tab) {
      if (now >= plan.startAt) await chrome.tabs.sendMessage(plan.tabId, { kind: 'wakeup' }).catch(() => {});
      return;
    }
    if (plan.state === 'running' || plan.state === 'submitting') {
      await finish(plan, plan.state === 'submitting' ? 'uncertain' : 'failed',
        '预约标签页已关闭，请在「我的预约」查看实际结果。', 'closed');
      return;
    }
  }
  try {
    const tab = await chrome.tabs.create({ url: 'about:blank', active: true });
    await update(plan, {
      tabId: tab.id, state: 'preparing', message: '已打开专用标签页，等待网站加载。'
    });
    await chrome.tabs.update(tab.id, { url: BOOKING_URL });
  } catch {
    await finish(plan, 'failed', 'Chrome 无法打开预约页。', 'launch');
  }
}

async function lookupSlots(date) {
  if (!validDate(date) || date <= localDay(Date.now())) throw new Error('请选择明天或之后的日期。');
  if (lookingUp) throw new Error('已有时段查询，请稍后重试。');
  lookingUp = true;
  let tabId;
  try {
    const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
    tabId = tab.id;
    await chrome.tabs.update(tabId, { url: BOOKING_URL });
    const deadline = Date.now() + 27_000;
    let result;
    while (Date.now() < deadline) {
      result = await chrome.tabs.sendMessage(tabId, { kind: 'list-slots', date, deadline }, { frameId: 0 })
        .catch(() => null);
      if (result) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!result?.ok) throw new Error(result?.error || '无法读取预约列表，请先打开预约网页登录，再重试。');
    const lookup = { id: crypto.randomUUID(), date, rooms: result.rooms };
    await chrome.storage.session.set({ slotLookup: lookup });
    return { ok: true, lookup };
  } finally {
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {});
    lookingUp = false;
  }
}

function fromPopup(sender) {
  return sender.url === chrome.runtime.getURL('popup.html');
}

async function handle(request, sender) {
  const plan = await read();
  if (fromPopup(sender)) {
    if (request.kind === 'schedule') {
      if (plan && ACTIVE.includes(plan.state)) throw new Error('已有任务，请先停止当前任务。');
      if ((plan?.state === 'uncertain' || (plan?.state === 'manual' && plan.commitAt)) && request.checkedPrevious !== true) {
        throw new Error('请先在「我的预约」核对上次结果，再设置新的任务。');
      }
      const next = buildPlan(request.input);
      const { slotLookup } = await chrome.storage.session.get('slotLookup');
      if (!slotLookup || slotLookup.id !== request.lookupId || slotLookup.date !== next.date ||
          !listedSlots(slotLookup.rooms, next.kitchens, next.people).includes(next.start + '~' + next.end)) {
        throw new Error('请重新读取所选日期的网页时段。');
      }
      await update(next, {
        id: crypto.randomUUID(), state: 'scheduled', message: '计划已保存。'
      });
      await reconcile();
      return { ok: true };
    }
    if (request.kind === 'cancel') {
      if (plan?.state === 'submitting') throw new Error('提交已开始，请等候回执。');
      if (plan && ACTIVE.includes(plan.state)) await finish(plan, 'cancelled', '已停止预约任务。');
      return { ok: true };
    }
    if (request.kind === 'visit') {
      await chrome.tabs.create({ url: BOOKING_URL, active: true });
      return { ok: true };
    }
  }

  const tabId = sender.tab?.id;
  if (!plan || plan.id !== request.id || plan.tabId !== tabId ||
      !sender.url?.startsWith('https://zhst.zstu.edu.cn/statusweb/h5/universityFrontOfficeProgram/')) {
    return { ok: false };
  }
  if (sender.frameId !== 0 || (sender.documentLifecycle && sender.documentLifecycle !== 'active')) return { ok: false };
  if (request.kind === 'check-tab') {
    return { ok: true, resume: canClaim(plan, request.id, tabId, Date.now(), sender.documentId) };
  }
  if (request.kind === 'ready' && plan.state === 'preparing') {
    await update(plan, { state: 'waiting', message: '预约页已就绪，等待开始时间。' });
    return { ok: true };
  }
  if (request.kind === 'claim' && canClaim(plan, request.id, tabId, Date.now(), sender.documentId)) {
    await update(plan, {
      state: 'running', runner: request.runner, runnerDocument: sender.documentId,
      message: '正在获取目标时段。'
    });
    return { ok: true };
  }
  if (plan.runner !== request.runner || plan.runnerDocument !== sender.documentId ||
      !['running', 'submitting'].includes(plan.state)) return { ok: false };
  if (request.kind === 'log-event' && plan.state === 'running' &&
      ['attempt', 'skipped', 'verified'].includes(request.event)) {
    await saveEvent(plan, request.event, { kitchen: request.kitchen });
    return { ok: true };
  }
  if (request.kind === 'progress' && plan.state === 'running') {
    await update(plan, { message: '正在等待安全须知阅读条件完成。' }, 'notice');
    return { ok: true };
  }
  if (request.kind === 'commit' && canCommit(plan, request.id, tabId, request.runner, Date.now())) {
    await update(plan, { state: 'submitting', commitAt: Date.now(), message: '即将确认预约，等待站点回执。' });
    return { ok: true };
  }
  if (request.kind === 'result') {
    const allowed = plan.state === 'submitting' ?
      ['success', 'manual', 'uncertain', 'failed'] : ['unavailable', 'manual', 'failed'];
    if (allowed.includes(request.state)) {
      await finish(plan, request.state, request.message, request.reason);
      return { ok: true };
    }
  }
  return { ok: false };
}

chrome.runtime.onMessage.addListener((request, sender, respond) => {
  const operation = request.kind === 'lookup-slots' && fromPopup(sender) ?
    lookupSlots(request.date) : enqueue(() => handle(request, sender));
  operation.then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if ([PREPARE, START, EXPIRE].includes(alarm.name)) enqueue(reconcile);
});
chrome.runtime.onStartup.addListener(() => enqueue(async () => {
  const plan = await read();
  if (plan?.state === 'submitting') {
    await finish(plan, 'uncertain', 'Chrome 在提交后重新启动，请到「我的预约」核对。', 'restart');
    return;
  }
  if (['preparing', 'waiting', 'running'].includes(plan?.state)) {
    await update(plan, { tabId: null, runner: null, runnerDocument: null, state: 'scheduled' }, 'restored');
  }
  await reconcile();
}));
chrome.runtime.onInstalled.addListener(() => enqueue(reconcile));
chrome.tabs.onRemoved.addListener(tabId => enqueue(async () => {
  const plan = await read();
  if (plan?.tabId !== tabId || !ACTIVE.includes(plan.state)) return;
  await finish(plan, plan.state === 'submitting' ? 'uncertain' : 'failed',
    plan.state === 'submitting' ? '提交中关闭了页面，请到「我的预约」核对。' : '专用预约标签页已关闭。', 'closed');
}));
