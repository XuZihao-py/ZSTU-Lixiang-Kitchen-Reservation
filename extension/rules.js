(() => {
  const BOOKING_URL = 'https://zhst.zstu.edu.cn/statusweb/h5/universityFrontOfficeProgram/' +
    '#/featuredStalls/roomReserve/Index?spaceType=2&categoryCode=fixed&organizationId=0&pageId=2084927814681309185';
  const KITCHENS = [
    { id: 'XS-03', campus: '下沙', capacity: 10 },
    { id: 'XS-02', campus: '下沙', capacity: 10 },
    { id: 'XS-01', campus: '下沙', capacity: 10 },
    { id: 'LP-03', campus: '临平', capacity: 8 },
    { id: 'LP-02', campus: '临平', capacity: 8 },
    { id: 'LP-01', campus: '临平', capacity: 8 }
  ];
  const ACTIVE = ['scheduled', 'preparing', 'waiting', 'running', 'submitting'];
  const DAY = 86_400_000;
  const BEIJING = 8 * 3_600_000;
  const OPEN = (7 * 60 + 30) * 60_000;
  const CLOSE = 23 * 3_600_000;
  const PREPARE = 5 * 60_000;
  const DURATION = 3 * 60_000;

  function localDay(time) {
    return new Date(time + BEIJING).toISOString().slice(0, 10);
  }

  function dayStart(date) {
    return Date.parse(date + 'T00:00:00+08:00');
  }

  function formatTime(time) {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).format(time);
  }

  function normalizeSlot(value) {
    const match = String(value ?? '').trim().match(/^(\d{1,2}:\d{2})\s*[~～—–−-]\s*(\d{1,2}:\d{2})$/);
    return match ? match.slice(1).map(time => time.padStart(5, '0')).join('~') : '';
  }

  function buildPlan(input, now = Date.now()) {
    const date = input.date;
    const bookingDay = dayStart(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(bookingDay) || localDay(bookingDay) !== date) {
      throw new Error('请选择有效的预约日期。');
    }
    const validTime = time => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (!validTime(input.start) || !validTime(input.end) || input.start >= input.end) {
      throw new Error('请选择有效的预约时段。');
    }
    const kitchens = Array.isArray(input.kitchens) ? [...new Set(input.kitchens)] : [];
    if (!kitchens.length || kitchens.some(id => !KITCHENS.some(room => room.id === id))) {
      throw new Error('请选择至少一个厨房。');
    }
    const people = Number(input.people);
    if (!Number.isInteger(people) || people < 1 ||
        !KITCHENS.some(room => kitchens.includes(room.id) && room.capacity >= people)) {
      throw new Error('预约人数超出已选厨房容量，或人数无效。');
    }
    if (input.authorized !== true) throw new Error('请先阅读须知并授权本次任务。');

    const releaseDay = bookingDay - 6 * DAY;
    const lastDay = bookingDay - DAY;
    const today = dayStart(localDay(now));
    const nextWindow = now >= today + CLOSE ? today + DAY : today;
    const executionDay = Math.max(releaseDay, nextWindow);
    if (executionDay > lastDay) throw new Error('该日期已没有可用的预约开放窗口。');
    const startAt = Math.max(executionDay + OPEN, now);
    return {
      date, start: input.start, end: input.end, people, kitchens,
      releaseAt: releaseDay + OPEN,
      startAt,
      prepareAt: Math.max(startAt - PREPARE, now),
      deadline: Math.min(startAt + DURATION, executionDay + CLOSE)
    };
  }

  function candidateKitchens(plan, rooms) {
    const target = normalizeSlot(plan.start + '~' + plan.end);
    return plan.kitchens.map(id => rooms.find(room => room.id === id &&
      room.capacity >= plan.people && room.bookable.includes(target))).filter(Boolean);
  }

  function owned(plan, id, tabId) {
    return Boolean(plan && plan.id === id && plan.tabId === tabId);
  }

  function canClaim(plan, id, tabId, now, documentId) {
    if (!owned(plan, id, tabId) || now < plan.startAt || now >= plan.deadline) return false;
    if (['preparing', 'waiting'].includes(plan.state)) return true;
    return plan.state === 'running' && Boolean(plan.runnerDocument && documentId) &&
      plan.runnerDocument !== documentId;
  }

  function canCommit(plan, id, tabId, runner, now) {
    return owned(plan, id, tabId) && plan.state === 'running' && plan.runner === runner &&
      now >= plan.startAt && now < plan.deadline;
  }

  const api = { BOOKING_URL, KITCHENS, ACTIVE, buildPlan, localDay, formatTime, normalizeSlot,
    candidateKitchens, canClaim, canCommit };
  globalThis.KitchenPlan = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
