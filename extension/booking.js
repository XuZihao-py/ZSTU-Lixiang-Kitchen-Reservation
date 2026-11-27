(() => {
  const { normalizeSlot, candidateKitchens, matchesFormDate, validDate } = KitchenPlan;
  const INDEX = '#/featuredStalls/roomReserve/Index';
  const FORM = '#/featuredStalls/roomReserve/ReserveForm';
  const BOOKING_ROOT = 'https://zhst.zstu.edu.cn/statusweb/h5/universityFrontOfficeProgram/';
  const query = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const text = element => element?.textContent.trim() ?? '';
  const hashIs = route => location.hash.split('?')[0] === route;
  const visible = element => Boolean(element?.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const find = (selector, predicate, root = document) =>
    all(selector, root).find(element => visible(element) && predicate(element));
  const cards = () => all('.room-reserve .room-card').filter(visible);
  const field = name => find('.reserve-form .field-card', card => text(query('.field-card-label', card)) === name);
  const kitchenId = value => value.match(/(?:XS|LP)-\d{2}$/i)?.[0].toUpperCase();
  const outcome = (state, message, reason) => ({ state, message, reason });

  function pageAccess(deadline, signal) {
    function guard() {
      if (signal.aborted) throw new Error('任务已停止。');
      if (Date.now() >= deadline) throw new Error('预约尝试窗口已结束。');
    }

    async function waitFor(check, error, timeout = 10_000) {
      guard();
      const initial = check();
      if (initial) return initial;
      const until = Math.min(deadline, Date.now() + timeout);
      return new Promise((resolve, reject) => {
        let timer;
        let settled = false;
        const observer = new MutationObserver(inspect);

        function finish() {
          settled = true;
          clearTimeout(timer);
          observer.disconnect();
          signal.removeEventListener('abort', inspect);
        }

        function inspect() {
          if (settled) return;
          clearTimeout(timer);
          try {
            guard();
            const remaining = until - Date.now();
            if (remaining <= 0) throw new Error(error);
            const value = check();
            if (value) {
              finish();
              resolve(value);
            } else {
              timer = setTimeout(inspect, Math.min(120, remaining));
            }
          } catch (failure) {
            finish();
            reject(failure);
          }
        }

        observer.observe(document.documentElement, {
          subtree: true, childList: true, characterData: true, attributes: true,
          attributeFilter: ['class', 'style', 'hidden', 'disabled', 'aria-disabled']
        });
        signal.addEventListener('abort', inspect, { once: true });
        inspect();
      });
    }

    function click(element) {
      guard();
      if (!visible(element) || element.matches('.disabled, .disabled-row, :disabled, [aria-disabled="true"]')) {
        throw new Error('预约页控件当前不可用。');
      }
      element.click();
    }
    return { guard, waitFor, click };
  }

  function calendarMonth() {
    const heading = find('.uni-calendar__header-text', () => true);
    const month = text(heading).match(/(\d{4})\D+(\d{1,2})/);
    return month ? Number(month[1]) * 12 + Number(month[2]) - 1 : null;
  }

  async function selectDate(date, { click, waitFor }) {
    const previous = cards();
    const previousEmpty = find('.yq-uni-p-r-list .no-data', () => true);
    const editor = await waitFor(() => find('.date-bar .uni-date-editor', () => true),
      '找不到预约日历，请检查登录状态和预约页。');
    click(editor);
    const [year, month, day] = date.split('-').map(Number);
    const requested = year * 12 + month - 1;
    let displayed = await waitFor(calendarMonth, '预约日历未加载。');
    const dayText = box => Number(text(query('.uni-calendar-item__weeks-box-text', box)));
    const checkedDay = () => find('.uni-calendar-item__weeks-box', box =>
      !box.classList.contains('uni-calendar-item--disable') &&
      Boolean(query('.uni-calendar-item--checked', box)));
    async function closeCalendar() {
      const close = find('.uni-date-mask, .dialog-close', () => true);
      if (!close) throw new Error('找不到关闭日历的控件。');
      click(close);
      await waitFor(() => calendarMonth() === null, '核对后日历未关闭。');
    }

    const currentDay = checkedDay();
    if (previous.length && displayed === requested && currentDay && dayText(currentDay) === day) {
      await closeCalendar();
      return;
    }

    const maxMoves = Math.min(6, Math.abs(requested - displayed) + 3);
    const monthUnchanged = '预约日历月份未切换。';
    for (let moves = 0; moves < maxMoves && displayed !== requested; moves++) {
      const direction = displayed < requested ? 'right' : 'left';
      const arrow = find('.uni-calendar--' + direction, () => true);
      if (!arrow) break;
      click(arrow.closest('.uni-calendar__header-btn-box, button') || arrow);
      try {
        displayed = await waitFor(() => {
          const next = calendarMonth();
          return next !== null && next !== displayed ? next : null;
        }, monthUnchanged, 1_200);
      } catch (error) {
        // The site's month arrows can move the internal date within the same month.
        if (error.message !== monthUnchanged) throw error;
      }
    }
    if (displayed !== requested) throw new Error('预约日历未显示目标月份，请核对网页日期。');

    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const boxes = all('.uni-calendar-item__weeks-box').filter(visible);
    const indexed = boxes[firstWeekday + day - 1];
    const matching = boxes.filter(box => dayText(box) === day && !box.classList.contains('uni-calendar-item--disable'));
    const selected = indexed && dayText(indexed) === day ? indexed : matching.length === 1 ? matching[0] : null;
    if (!selected || selected.classList.contains('uni-calendar-item--disable')) {
      throw new Error('目标日期暂不可选，请检查页面放号状态。');
    }
    click(selected);
    await Promise.resolve();
    const next = await waitFor(() => {
      if (calendarMonth() === null) return { closed: true };
      const confirm = find('.uni-datetime-picker--btn', button => /^(确认|确定)$/.test(text(button)));
      return confirm ? { confirm } : null;
    }, '站点未接受日历选择。');
    if (next.confirm) click(next.confirm);

    await waitFor(() => calendarMonth() === null, '选日后日历未关闭。');
    click(editor);
    const checked = await waitFor(() => calendarMonth() === null ? null : checkedDay(),
      '日历未显示已选日期。');
    if (calendarMonth() !== requested || dayText(checked) !== day) {
      throw new Error('网页日历实际选中日期与目标 ' + date + ' 不一致。');
    }
    await closeCalendar();
    await waitFor(() => {
      const current = cards();
      const currentEmpty = find('.yq-uni-p-r-list .no-data', () => true);
      return current.some(card => !previous.includes(card)) ||
        (currentEmpty && currentEmpty !== previousEmpty);
    }, '未等到目标日期的厨房列表。', 18_000);
  }

  function availableRooms() {
    return cards().map(card => ({
      card,
      id: kitchenId(text(query('.title', card))),
      capacity: Number(text(query('.room-card-bot .count, .count', card))),
      listed: all('.slot-tag', card).map(tag => normalizeSlot(text(tag))).filter(Boolean),
      bookable: /^(预订|预约)$/.test(text(query('.btn-apply', card))) ?
        all('.slot-tag.bookable', card).map(tag => normalizeSlot(text(tag))) : []
    }));
  }

  function chooseIndex({ waitFor }) {
    return waitFor(() => hashIs(INDEX) && query('.room-reserve .date-bar') &&
      (cards().length || find('.yq-uni-p-r-list .no-data', () => true)),
    '未加载共享厨房列表，请检查校园网络及登录状态。', 24_000);
  }

  async function peekSlots(date, deadline) {
    if (!validDate(date)) throw new Error('请选择有效的预约日期。');
    const page = pageAccess(deadline, new AbortController().signal);
    await chooseIndex(page);
    await selectDate(date, page);
    return availableRooms().filter(room => room.id).map(({ id, capacity, listed }) => ({ id, capacity, listed }));
  }

  async function runBooking(plan, tell, signal) {
    const targetSlot = plan.start + '~' + plan.end;
    let committed = false;
    let phase = 'page';
    const page = pageAccess(plan.deadline, signal);
    const { guard, waitFor, click } = page;
    const track = (event, kitchen) => {
      void tell('log-event', { event, kitchen }).catch(() => {});
    };

    function matchesForm(id) {
      const params = new URLSearchParams(location.hash.split('?')[1]);
      const date = text(query('.field-card-value', field('预约日期') ?? document));
      return hashIs(FORM) && kitchenId(text(query('.reserve-form .title-text'))) === id &&
        matchesFormDate(plan.date, params.get('appDate'), date);
    }

    function peopleButton() {
      const section = find('.reserve-form .field-item', node => text(query('.field-item-title', node)) === '用餐人数');
      return section && find('.option-item', item => text(item).replace(/\s/g, '') === plan.people + '人', section);
    }

    function contactReady() {
      const value = field('联系人');
      const contact = value && query('.field-card-value', value);
      return Boolean(contact && !query('.error', contact) && text(contact).includes('，') &&
        text(contact).split('，').every(part => part.trim()));
    }

    async function confirmNotice() {
      const bar = find('.reserve-form .agreement-bar', () => true);
      const titles = bar ? all('.agreement-name', bar) : [];
      if (titles.length !== 1 || !text(titles[0]).includes('安全文明使用须知') ||
          !text(titles[0]).includes('理享厨房')) {
        return false;
      }
      if (query('.agreement-check.checked', bar)) return true;
      click(bar);
      const button = await waitFor(() => find('.agreement-footer .agreement-btn', () => true), '安全须知未打开。');
      // 状态反馈与页面须知倒计时并行。
      void tell('progress', { message: '正在等待安全须知阅读条件完成。' }).catch(() => {});
      let ready;
      try {
        ready = await waitFor(() => {
          const scroll = find('.agreement-scroll', () => true);
          if (scroll) {
            const view = [scroll, ...all('.uni-scroll-view', scroll)].find(element =>
              element.scrollHeight > element.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(element).overflowY));
            if (view && view.scrollTop < view.scrollHeight - view.clientHeight - 2) {
              view.scrollTo({ top: view.scrollHeight, behavior: 'instant' });
            }
          }
          const current = find('.agreement-footer .agreement-btn', item =>
            text(item) === '确定已知悉' && !item.classList.contains('disabled'));
          return button.isConnected && current;
        }, '安全须知尚未满足页面要求。', 38_000);
      } catch (error) {
        if (signal.aborted) throw error;
        return false;
      }
      click(ready);
      await waitFor(() => query('.reserve-form .agreement-check.checked'), '站点未确认须知阅读状态。');
      return true;
    }

    function receipt() {
      if (location.hash.includes('/roomReserve/ReservePay')) {
        return outcome('manual', '站点已进入付款页，请人工查看。', 'payment');
      }
      const label = find('uni-toast, uni-modal, [role="alert"], uni-text, span, div', element =>
        /^(预约成功|预约失败)$/.test(text(element)));
      if (text(label) === '预约成功') return outcome('success', '站点已显示「预约成功」。');
      if (text(label) === '预约失败') return outcome('failed', '站点显示「预约失败」。', 'rejected');
      return null;
    }

    async function chooseSlot(preferred) {
      click(preferred.card);
      await waitFor(() => hashIs(FORM) && field('预约日期') && text(query('.reserve-form .title-text')),
        '未打开完整的预约表单，请人工查看。');
      if (!matchesForm(preferred.id)) throw new Error('表单厨房、预约日期或链接与计划不一致，已停止。');
      click(await waitFor(() => field('预约时段'), '预约表单未提供时段选择。'));
      const popup = await waitFor(() => find('.time-slot-popup-main', () => true), '时段选择窗口未打开。');
      await waitFor(() => find('.slot-item, .empty-tip', () => true, popup), '时段数据未加载。');
      const row = find('.slot-item', item => normalizeSlot(text(query('.slot-time', item))) === targetSlot, popup);
      if (!row || row.classList.contains('disabled-row') || query('.checkbox.disabled', row)) return false;

      if (!query('.checkbox.checked', row)) click(row);
      await waitFor(() => query('.checkbox.checked', row), '站点未选中目标时段。');
      click(find('.footer .btn', button => text(button) === '确认选择', popup));
      await waitFor(correctSlot, '预约表单未保留目标时段。');
      return true;
    }

    function correctSlot() {
      const slot = field('预约时段');
      return Boolean(slot && normalizeSlot(text(query('.field-card-value', slot))) === targetSlot);
    }

    async function chooseKitchen() {
      const attempted = new Set();
      while (attempted.size < plan.kitchens.length) {
        phase = 'page';
        await chooseIndex(page);
        phase = 'date';
        await selectDate(plan.date, page);
        const [preferred] = candidateKitchens(plan, availableRooms()).filter(room => !attempted.has(room.id));
        if (!preferred) return null;
        phase = 'slot';
        track('attempt', preferred.id);
        if (await chooseSlot(preferred)) return preferred;
        track('skipped', preferred.id);
        attempted.add(preferred.id);
        guard();
        history.back();
        await waitFor(() => hashIs(INDEX), '无法返回厨房列表，请人工查看。');
      }
      return null;
    }

    try {
      const preferred = await chooseKitchen();
      if (!preferred) return outcome('unavailable', '所选厨房的目标时段没有可用名额。');

      phase = 'people';
      const people = await waitFor(peopleButton, '所选人数未出现在预约表单中。');
      if (!people.classList.contains('actived')) click(people);
      await waitFor(() => peopleButton()?.classList.contains('actived'), '站点未保存所选人数。');
      if (!contactReady() || field('补充信息')) {
        return outcome('manual', '请核对联系人、人数或站点要求的补充信息。', 'form');
      }
      track('verified', preferred.id);
      phase = 'notice';
      if (!await confirmNotice()) return outcome('manual', '请在预约页人工查看并确认使用须知。', 'notice');

      const verifiedSubmit = () => matchesForm(preferred.id) && correctSlot() &&
        peopleButton()?.classList.contains('actived') && contactReady() && !field('补充信息') &&
        query('.reserve-form .agreement-check.checked') &&
        find('.reserve-form .btn-confirm', button => text(button) === '确认预约');
      if (!verifiedSubmit()) return outcome('manual', '提交前的表单状态发生变化，请人工查看。', 'changed');

      phase = 'changed';
      guard();
      const permission = await tell('commit');
      if (!permission.ok) return outcome('cancelled', '任务已停止或本次提交已锁定。');
      const submit = verifiedSubmit();
      if (!submit) return outcome('failed', '确认前表单发生变化，任务已停止。', 'changed');
      committed = true;
      click(submit);
      return await waitFor(receipt, '未收到明确回执。', 20_000);
    } catch (error) {
      if (signal.aborted && !committed) return outcome('cancelled', '任务已停止。');
      if (committed) return outcome('uncertain', '已尝试确认预约，请在「我的预约」核对结果。');
      return outcome('failed', error.message, phase);
    }
  }

  globalThis.KitchenBooking = { runBooking, peekSlots };
  if (!globalThis.chrome?.runtime?.id || !location.href.startsWith(BOOKING_ROOT)) return;

  let timer;
  let runner;
  let readyFor;
  const send = (kind, plan, details = {}) => chrome.runtime.sendMessage({
    kind, id: plan.id, runner: runner?.id, ...details
  });
  const readPlan = async () => (await chrome.storage.local.get('plan')).plan;

  async function start(plan) {
    if (runner) return;
    const active = { id: crypto.randomUUID(), planId: plan.id, controller: new AbortController() };
    runner = active;
    try {
      const claim = await send('claim', plan);
      if (!claim.ok) return;
      const result = await runBooking(plan, (kind, details) => send(kind, plan, details), active.controller.signal);
      if (result.state !== 'cancelled') await send('result', plan, result);
    } catch (error) {
      console.warn('预约助手无法更新任务状态', error);
    } finally {
      if (runner === active) runner = undefined;
    }
  }

  async function arm(plan) {
    clearTimeout(timer);
    if (![ 'preparing', 'waiting', 'running', 'submitting' ].includes(plan?.state)) {
      runner?.controller.abort();
      return;
    }
    if (runner || plan.state === 'submitting') return;
    if (!hashIs(INDEX)) return;
    const ping = await send('check-tab', plan).catch(() => null);
    if (!ping?.ok || (plan.state === 'running' && !ping.resume)) return;
    if (plan.state === 'preparing' && cards().length && readyFor !== plan.id) {
      readyFor = plan.id;
      await send('ready', plan).catch(() => null);
    }
    const next = Math.max(0, plan.startAt - Date.now());
    timer = setTimeout(async () => {
      const current = await readPlan();
      if (current?.id === plan.id && ['preparing', 'waiting', 'running'].includes(current.state)) await start(current);
    }, next);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.plan) arm(changes.plan.newValue).catch(console.warn);
  });
  const check = () => readPlan().then(arm).catch(console.warn);
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.kind === 'wakeup') check();
    if (message.kind !== 'list-slots') return;
    peekSlots(message.date, message.deadline).then(
      rooms => respond({ ok: true, rooms }),
      error => respond({ ok: false, error: error.message })
    );
    return true;
  });
  window.addEventListener('hashchange', check);
  check();
})();
