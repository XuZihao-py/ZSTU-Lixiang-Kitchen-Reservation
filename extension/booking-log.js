(() => {
  const { KITCHENS, localDay } = KitchenPlan;
  const events = {
    scheduled: '计划已保存。到时自动开始。',
    restored: 'Chrome 已重启，正在恢复预约任务。',
    preparing: '已打开预约标签页，等待网页加载。',
    waiting: '预约网页已就绪，等待开始时间。',
    running: '开始核对预约日期和时段。',
    attempt: '正在尝试 {厨房}。',
    skipped: '{厨房} 的目标时段已不可选，继续检查下一间。',
    verified: '已核对 {厨房} 的时段和人数。',
    notice: '正在等待网站规定的安全须知阅读时间。',
    submitting: '表单已核对，即将确认预约。',
    success: '网站已显示预约成功。',
    unavailable: '所选厨房的目标时段没有可用名额。',
    manual: '请前往预约网页处理剩余步骤。',
    uncertain: '提交结果待核对，请查看「我的预约」。',
    failed: '流程已停止，请查看预约助手中的任务提示。',
    cancelled: '已停止预约任务。',
    expired: '预约尝试窗口已结束。'
  };
  const explanations = {
    'manual:payment': '网站已进入付款页，请在网页上人工处理。',
    'manual:form': '请在网页上核对联系人、人数或补充信息。',
    'manual:notice': '请在网页上人工核对并确认安全须知。',
    'manual:changed': '表单状态发生变化，请在网页上人工核对。',
    'uncertain:restart': '提交后 Chrome 已重启，请在「我的预约」核对结果。',
    'uncertain:closed': '提交时预约标签页已关闭，请在「我的预约」核对结果。',
    'failed:closed': '预约标签页已关闭，流程停止。',
    'failed:launch': 'Chrome 无法打开预约页。',
    'failed:rejected': '网站显示预约失败。',
    'failed:page': '未能加载厨房列表，请检查校园登录和网络。',
    'failed:date': '未能核对网页日期，请打开预约页检查日历。',
    'failed:slot': '未能核对预约表单或目标时段，请查看网页。',
    'failed:people': '未能确认用餐人数，请查看预约表单。',
    'failed:notice': '未能确认安全须知状态，请查看预约网页。',
    'failed:changed': '确认前表单发生变化，流程停止。',
    'expired:page': '预约页未能在尝试窗口内就绪，请检查校园登录和网络。'
  };
  const kitchenNames = new Map(KITCHENS.map(room => [room.id, room.campus + ' ' + room.id]));
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit',
    fractionalSecondDigits: 3, hourCycle: 'h23'
  });

  function stamp(time) {
    return localDay(time) + ' ' + clock.format(time);
  }

  function describeTask(task) {
    return task.date + ' · ' + task.start + '–' + task.end + ' · ' + task.people + ' 人';
  }

  function describeKitchens(task) {
    return task.kitchens.map(id => kitchenNames.get(id)).join(' → ');
  }

  function addEvent(history, plan, kind, { at = Date.now(), kitchen, reason } = {}) {
    if (!plan.id || !Object.hasOwn(events, kind)) return history;
    const room = plan.kitchens.includes(kitchen) ? kitchenNames.get(kitchen) : undefined;
    const template = events[kind];
    if (template.includes('{厨房}') && !room) return history;
    const message = explanations[kind + ':' + reason] || template.replace('{厨房}', room);
    const safeReason = Object.hasOwn(explanations, kind + ':' + reason) ? reason : undefined;
    const entry = { at, message, event: kind, ...(room ? { kitchen } : {}), ...(safeReason ? { reason: safeReason } : {}) };
    const timing = {
      ...(Number.isFinite(plan.prepareAt) ? { prepareAt: plan.prepareAt } : {}),
      ...(Number.isFinite(plan.deadline) ? { deadline: plan.deadline } : {}),
      ...(Number.isFinite(plan.commitAt) ? { commitAt: plan.commitAt } : {})
    };
    const index = history.findIndex(task => task.id === plan.id);
    if (index < 0) {
      const { id, date, start, end, people, startAt } = plan;
      const kitchens = plan.kitchens.filter(id => kitchenNames.has(id));
      return [{ id, date, start, end, people, startAt, kitchens, ...timing, loggedAt: at, events: [entry] }, ...history].slice(0, 12);
    }
    const updated = history.slice();
    const task = history[index];
    updated[index] = { ...task, ...timing, events: [...task.events.slice(-59), entry] };
    return updated;
  }

  function report(task) {
    return [
      '理享厨房预约日志（北京时间）',
      '预约信息  ' + describeTask(task),
      '厨房顺序  ' + describeKitchens(task),
      '计划开始  ' + stamp(task.startAt),
      '',
      ...task.events.map(entry => stamp(entry.at) + '  ' + entry.message),
      ''
    ].join('\r\n');
  }

  function diagnosticReport(tasks, { extensionVersion, chromeVersion, platform, exportedAt = Date.now() }) {
    const timestamp = value => Number.isFinite(value) ?
      { epochMs: value, utc: new Date(value).toISOString(), beijing: stamp(value) } : undefined;
    return JSON.stringify({
      schema: 'lixiang.booking-diagnostics.v1',
      exportedAt: timestamp(exportedAt),
      extensionVersion,
      chromeVersion,
      platform,
      taskCount: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id, date: task.date, start: task.start, end: task.end, people: task.people,
        kitchens: task.kitchens, recordedAt: timestamp(task.loggedAt), prepareAt: timestamp(task.prepareAt),
        startAt: timestamp(task.startAt), deadline: timestamp(task.deadline), commitAt: timestamp(task.commitAt),
        events: task.events.map(entry => ({
          at: timestamp(entry.at),
          sincePlanStartMs: Number.isFinite(task.startAt) ? entry.at - task.startAt : undefined,
          event: entry.event ?? 'legacy',
          reason: entry.reason,
          kitchen: entry.kitchen,
          message: entry.message
        }))
      }))
    }, null, 2) + '\r\n';
  }

  const api = { addEvent, describeTask, describeKitchens, report, diagnosticReport, stamp };
  globalThis.KitchenLog = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
