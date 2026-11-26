importScripts('rules.js', 'booking-log.js', 'environment-check.js', 'environment-mobile.js',
  'environment-flow.js', 'environment-status.js');

const { BOOKING_URL, ACTIVE, buildPlan, canClaim, canCommit, validDate, localDay, listedSlots } = KitchenPlan;
const PREPARE = 'kitchen-prepare';
const EXPIRE = 'kitchen-expire';
const START = 'kitchen-start';
const ENVIRONMENT = 'kitchen-environment';
const { steps, isFresh, isActive, preflightAt } = KitchenEnvironmentStatus;
let pending = Promise.resolve();
let lookingUp = false;
let bookingHistory;

function enqueue(action) {
  const result = pending.then(action);
  pending = result.catch(error => console.error('预约后台', error));
  return result;
}

async function schedulePreflight(plan) {
  const at = preflightAt(plan);
  if (at == null) return;
  const { environmentPreflight } = await chrome.storage.session.get('environmentPreflight');
  if (environmentPreflight !== plan.id) {
    await chrome.alarms.create(ENVIRONMENT, { when: Math.max(Date.now() + 1000, at) });
  }
}

async function writeEnvironment(runId, code, level, finished, tabId) {
  const { environmentRun } = await chrome.storage.session.get('environmentRun');
  if (environmentRun?.id !== runId || environmentRun.tabId !== tabId) return { ok: false };
  code = Object.hasOwn(steps, code) ? code : 'failed';
  if (finished) {
    await chrome.storage.local.set({ environmentResult: {
      code, level: code === 'ready' ? 'ready' : 'error', checkedAt: Date.now()
    } });
    await chrome.storage.session.remove('environmentRun');
  } else {
    await chrome.storage.session.set({ environmentRun: {
      ...environmentRun, code, level: level === 'waiting' ? 'waiting' : 'checking'
    } });
  }
  return { ok: true };
}

async function manualEnvironment(request, tabId) {
  if (typeof request.id !== 'string') return { ok: false };
  if (request.kind === 'environment-start') {
    await chrome.storage.session.set({ environmentRun: {
      id: request.id, tabId, code: 'booking-direct', level: 'checking', startedAt: Date.now()
    } });
    return { ok: true };
  }
  return writeEnvironment(request.id, request.code, request.level, request.kind === 'environment-finish', tabId);
}

async function automaticEnvironment(preflight) {
  const run = await enqueue(async () => {
    const plan = await read();
    const now = Date.now();
    if (plan && ACTIVE.includes(plan.state) && preflightAt(plan, now) == null) return;
    const { environmentRun, environmentPreflight } = await chrome.storage.session.get(['environmentRun', 'environmentPreflight']);
    if (preflight) {
      const at = preflightAt(plan, now);
      if (at == null || environmentPreflight === plan?.id) return;
      if (at > now) return schedulePreflight(plan);
      await chrome.storage.session.set({ environmentPreflight: plan.id });
    } else if (isFresh((await chrome.storage.local.get('environmentResult')).environmentResult, now)) {
      return;
    }
    if (isActive(environmentRun, now)) return;
    const next = { id: crypto.randomUUID(), code: 'booking-direct', level: 'checking', startedAt: now };
    await chrome.storage.session.set({ environmentRun: next });
    return next;
  });
  if (!run) return { ok: true };
  let code = 'failed';
  try {
    const report = await KitchenEnvironmentFlow.checkAutomatically(step =>
      void enqueue(() => writeEnvironment(run.id, step, 'checking', false)));
    code = report.code;
  } finally {
    await enqueue(() => writeEnvironment(run.id, code, 'checking', true));
  }
  return { ok: true };
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
  await chrome.alarms.clear(ENVIRONMENT);
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
    await schedulePreflight(plan);
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
  const pageSession = KitchenEnvironmentMobile.createMobileSession(chrome.debugger, navigator.userAgent);
  let tabId;
  try {
    const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
    tabId = tab.id;
    await pageSession.keepVisible(tabId);
    await chrome.tabs.update(tabId, { url: BOOKING_URL });
    const deadline = Date.now() + 27_000;
    const state = await KitchenEnvironment.inspectBooking(tabId, deadline);
    if (state === 'login') throw new Error('预约登录已失效，请点「环境检测」恢复会话后重试。');
    if (state === 'offline' || state === 'network') throw new Error('无法连接预约页，请检查网络后重试。');
    if (state !== 'ready') throw new Error('预约页未加载出共享厨房列表，请点「环境检测」查看。');
    const result = await chrome.tabs.sendMessage(tabId, { kind: 'list-slots', date, deadline }, { frameId: 0 })
      .catch(() => null);
    if (!result?.ok) throw new Error(result?.error || '无法读取预约时段，请点「环境检测」查看。');
    const lookup = { id: crypto.randomUUID(), date, rooms: result.rooms };
    await chrome.storage.session.set({ slotLookup: lookup });
    return { ok: true, lookup };
  } finally {
    await pageSession.close();
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {});
    lookingUp = false;
  }
}

function fromWorkbench(sender) {
  return sender.frameId === 0 && sender.url?.split('#')[0] === chrome.runtime.getURL('popup.html');
}

function fromQuickPopup(sender) {
  return sender.url === chrome.runtime.getURL('quick.html');
}

async function openWorkbench(view) {
  const workbenchUrl = chrome.runtime.getURL('popup.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['TAB'], frameIds: [0] });
  const existing = contexts.find(context => context.documentUrl?.split('#')[0] === workbenchUrl);
  const route = ['reservation', 'environment', 'logs'].includes(view) ? view : null;
  if (existing) {
    await chrome.tabs.update(existing.tabId, {
      active: true,
      ...(route ? { url: workbenchUrl + '#' + route } : {})
    });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: workbenchUrl + (route ? '#' + route : '') });
  }
  return { ok: true };
}

async function handle(request, sender) {
  if (request.kind === 'open-workbench' && fromQuickPopup(sender)) return openWorkbench(request.view);
  const plan = await read();
  if (fromWorkbench(sender)) {
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
  let operation;
  if (request.kind === 'lookup-slots' && fromWorkbench(sender)) {
    operation = lookupSlots(request.date);
  } else if (request.kind === 'environment-auto' && fromWorkbench(sender)) {
    operation = automaticEnvironment(false);
  } else if (['environment-start', 'environment-update', 'environment-finish'].includes(request.kind) &&
      Number.isInteger(sender.tab?.id) && sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('environment.html')) {
    operation = enqueue(() => manualEnvironment(request, sender.tab.id));
  } else {
    operation = enqueue(() => handle(request, sender));
  }
  operation.then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ENVIRONMENT) automaticEnvironment(true).catch(error => console.warn('环境检测失败', error));
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
  const { environmentRun } = await chrome.storage.session.get('environmentRun');
  if (environmentRun?.tabId === tabId) {
    await writeEnvironment(environmentRun.id, 'closed', 'error', true, tabId);
  }
  const plan = await read();
  if (plan?.tabId !== tabId || !ACTIVE.includes(plan.state)) return;
  await finish(plan, plan.state === 'submitting' ? 'uncertain' : 'failed',
    plan.state === 'submitting' ? '提交中关闭了页面，请到「我的预约」核对。' : '专用预约标签页已关闭。', 'closed');
}));
