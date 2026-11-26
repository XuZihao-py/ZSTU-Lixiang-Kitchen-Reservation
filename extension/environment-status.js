(() => {
  const steps = {
    'booking-direct': ['预约直达页', '正在打开预约页，检查当前会话。', '无法打开预约直达页。'],
    'portal-unreachable': ['数智浙理门户', '正在用手机模式打开学校门户，尝试恢复预约会话。', '手机模式下门户未加载完成。请检查校园服务及网络。'],
    'mobile-unavailable': ['手机模式', '', 'Chrome 未能启用手机模式。请检查扩展的调试权限，或关闭冲突的开发者工具后重试。'],
    'portal-home': ['门户服务导航', '正在查找学校门户的服务入口。', '门户已打开，但找不到「服务」入口。'],
    'portal-catalog': ['理享食光服务入口', '正在服务中心查找「理享食光」。', '服务中心未载入「理享食光」入口。'],
    'portal-handoff': ['理享食光跳转', '已打开「理享食光」入口，正在等待跳转。', '已在手机模式下打开「理享食光」，但未进入预约系统。'],
    'school-auth': ['学校统一身份认证', '', '学校要求重新认证。打开认证页完成密码、验证码或扫码后，检测会自动继续。'],
    'booking-return': ['共享厨房入口', '正在从理享食光打开共享厨房。', '理享食光已打开，但共享厨房列表未就绪。'],
    'booking-auth': ['理享食光会话跳转', '正在等待理享食光建立预约会话。', '理享食光的会话跳转未完成。'],
    'booking-login': ['理享食光登录', '', '已从学校门户进入，预约系统仍要求登录。请查看打开的理享食光页面。'],
    'data-read': ['预约数据验证', '正在读取明天的厨房和时段。', '预约页已打开，但无法核对明天的日期或读取时段。'],
    'data-empty': ['预约数据验证', '', '预约页已打开，但明天没有可核验的厨房和时段。'],
    ready: ['预约数据验证', '', ''],
    offline: ['网络连接', '', 'Chrome 当前离线。恢复连接后再检测。'],
    network: ['预约页网络请求', '', '预约页报告网络异常。请检查连接后再检测。'],
    unreachable: ['预约直达页连接', '', '预约页未响应。请检查网络或校园服务。'],
    unready: ['共享厨房列表', '', '预约页已响应，但未加载出共享厨房列表。'],
    closed: ['检测标签页', '', '检测标签页已关闭。请重新检测。'],
    failed: ['浏览器扩展', '', 'Chrome 无法完成页面检测。请重新加载扩展后再试。']
  };
  const loginAdvice = code => ['school-auth', 'booking-login', 'booking-auth'].includes(code) ?
    '建议使用「从门户检测」恢复校园会话。' : '';

  const refreshAge = 6 * 60 * 60_000;
  const runAge = 5 * 60_000;
  const leadTime = 15 * 60_000;
  const checkWindow = 30_000;
  const isFresh = (result, now = Date.now()) => Number.isFinite(result?.checkedAt) &&
    now >= result.checkedAt && now - result.checkedAt < refreshAge;
  const isActive = (run, now = Date.now()) => Number.isFinite(run?.startedAt) &&
    now >= run.startedAt && now - run.startedAt < runAge;

  function preflightAt(plan, now = Date.now()) {
    if (plan?.state !== 'scheduled' || now + checkWindow >= plan.prepareAt) return null;
    return Math.max(now, plan.startAt - leadTime);
  }

  function viewStatus(result, run, now = Date.now()) {
    if (isActive(run, now)) {
      const waiting = run.level === 'waiting';
      const advice = waiting ? loginAdvice(run.code) : '';
      return {
        level: waiting ? 'error' : 'checking', title: waiting ? '待统一认证' : '正在检测环境',
        detail: (steps[run.code] || steps.failed)[0] + (advice ? '。' + advice : '')
      };
    }
    if (!result) return { level: 'unknown', title: '待环境检测', detail: '可打开检测页验证预约环境。' };
    const { checkedAt, code } = result;
    if (result.level === 'error') {
      const advice = loginAdvice(code);
      return {
        level: 'error', title: '环境异常',
        detail: '异常位置 · ' + (steps[code] || steps.failed)[0] + (advice ? '。' + advice : ''),
        checkedAt
      };
    }
    if (!isFresh(result, now)) return {
      level: 'stale', title: '建议重新检测', detail: '上次检测正常，结果已超过 6 小时。', checkedAt
    };
    return { level: 'ready', title: '环境正常', detail: '上次检测已读取有效预约时段。', checkedAt };
  }

  const api = { steps, loginAdvice, isFresh, isActive, preflightAt, viewStatus };
  globalThis.KitchenEnvironmentStatus = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
