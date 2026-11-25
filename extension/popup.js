const { KITCHENS, ACTIVE, buildPlan, localDay, formatTime, validDate, listedSlots, releaseHint } = KitchenPlan;
const byId = id => document.getElementById(id);
const form = byId('plan-form');
const people = byId('people');
const roomSelect = byId('room');
const edit = byId('settings');
const priority = byId('priority');
const calendar = byId('calendar');
const slots = byId('slot-options');
const consent = byId('authorized');
const begin = byId('begin');
const dayMs = 86_400_000;
const tomorrow = () => localDay(Date.now() + dayMs);
const isActive = () => Boolean(plan && ACTIVE.includes(plan.state));
let selectedDate = '';
let selectedSlot = '';
let month = tomorrow().slice(0, 7);
let kitchens = [];
let plan;
let busy = false;
let reading = false;
let lookup;
let slotError = '';

const labels = {
  scheduled: '已安排', preparing: '准备中', waiting: '待命', running: '预约中',
  submitting: '等回执', success: '预约成功', unavailable: '无可约名额', manual: '请到网页查看',
  uncertain: '待核对', failed: '预约失败', cancelled: '已停止', expired: '已超时'
};

for (let count = 1; count <= 10; count++) people.add(new Option(count + ' 人', count));

function input() {
  const [start = '', end = ''] = selectedSlot.split('~');
  return { date: selectedDate, start, end, people: people.value, kitchens, authorized: consent.checked };
}

function rememberDraft() {
  const draft = { date: selectedDate, people: people.value, kitchens, slot: selectedSlot };
  chrome.storage.session.set({ draft }).catch(console.warn);
}

function displayError(message = '') {
  byId('error').textContent = message;
  byId('error').hidden = !message;
}

const utc = date => new Date(date + 'T00:00:00Z');
const iso = date => date.toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', dateStyle: 'full' });

function renderCalendar(focusDate) {
  const first = utc(month + '-01');
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const minimum = tomorrow();
  const today = localDay(Date.now());

  byId('month').textContent = year + ' 年 ' + (monthIndex + 1) + ' 月';
  byId('previous-month').disabled = month <= minimum.slice(0, 7);
  calendar.replaceChildren();
  for (let offset = 0; offset < firstWeekday; offset++) calendar.append(document.createElement('span'));
  for (let day = 1; day <= days; day++) {
    const date = iso(new Date(first.getTime() + (day - 1) * dayMs));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day';
    button.textContent = String(day);
    button.dataset.date = date;
    button.disabled = date < minimum;
    button.tabIndex = -1;
    button.setAttribute('aria-label', dayLabel.format(utc(date)));
    button.setAttribute('aria-pressed', String(date === selectedDate));
    if (date === today) button.setAttribute('aria-current', 'date');
    calendar.append(button);
  }
  const target = calendar.querySelector('[data-date="' + (focusDate || selectedDate) + '"]:not(:disabled)') ||
    calendar.querySelector('button:not(:disabled)');
  if (target) {
    target.tabIndex = 0;
    if (focusDate) target.focus();
  }
  const note = selectedDate ? releaseHint(selectedDate) || '已选择 ' + selectedDate + '。' :
    '请选择明天或之后的日期。';
  byId('date-note').textContent = note;
}

function moveMonth(offset) {
  const date = utc(month + '-01');
  date.setUTCMonth(date.getUTCMonth() + offset);
  month = iso(date).slice(0, 7);
  renderCalendar();
}

function renderSlots(wanted = selectedSlot) {
  const active = isActive();
  const verified = lookup?.date === selectedDate;
  const planned = active ? plan.start + '~' + plan.end : '';
  const options = active ? [planned] : verified && !reading ?
    listedSlots(lookup.rooms, KITCHENS.map(room => room.id), 1) : [];
  selectedSlot = options.includes(wanted) ? wanted : planned;
  slots.replaceChildren();
  slots.disabled = active || !options.length;
  for (const value of options) {
    const label = document.createElement('label');
    label.className = 'slot-option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'slot';
    radio.value = value;
    radio.checked = value === selectedSlot;
    const time = document.createElement('span');
    time.textContent = value.replace('~', ' – ');
    label.append(radio, time);
    slots.append(label);
  }
  byId('refresh-slots').hidden = active || !validDate(selectedDate) || selectedDate < tomorrow();
  byId('refresh-slots').disabled = reading;
  byId('slot-info').textContent = active ? plan.date : reading ? '正在核对日期并读取网页时段…' :
    slotError || (verified ?
      (options.length ? lookup.date + ' · 以网页为准' : '网页尚未列出该日期的时段。') :
      (selectedDate ? '请读取所选日期的网页时段。' : '请先选择预约日期。'));
}

function roomIssue(room) {
  if (room.capacity < Number(people.value)) return '容量不足';
  if (!listedSlots(lookup.rooms, [room.id], Number(people.value)).includes(selectedSlot)) return '未列出此时段';
  return '';
}

function renderChoices(focusIndex, focusAction) {
  const active = isActive();
  const ready = Boolean(selectedSlot) && (active || lookup?.date === selectedDate);
  const issues = new Map(ready && !active ? KITCHENS.map(room => [room.id, roomIssue(room)]) : []);
  const available = ready && !active ? KITCHENS.filter(room => !issues.get(room.id)) : [];
  const remaining = available.filter(room => !kitchens.includes(room.id));
  const current = roomSelect.value;

  byId('kitchen-options').hidden = !ready;
  byId('kitchen-options').disabled = !ready || active;
  byId('kitchen-info').textContent = ready ?
    (available.length || active ? '按列表从上到下尝试预约。' : '该时段没有符合人数要求的厨房。') :
    '请先选择预约时段。';
  roomSelect.replaceChildren(new Option(remaining.length ? '选择厨房' : '无可加入的厨房', ''));
  for (const room of remaining) {
    roomSelect.add(new Option(room.campus + ' ' + room.id + ' · ' + room.capacity + '人', room.id));
  }
  if (remaining.some(room => room.id === current)) roomSelect.value = current;
  roomSelect.disabled = !remaining.length;
  byId('add').disabled = !roomSelect.value;
  priority.replaceChildren();
  kitchens.forEach((id, index) => {
    const room = KITCHENS.find(item => item.id === id);
    const item = document.createElement('li');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(index + 1);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = room.campus + ' ' + id;
    const issue = issues.get(id);
    if (issue) {
      const detail = document.createElement('span');
      detail.className = 'room-note';
      detail.textContent = issue;
      name.append(detail);
    }
    const controls = document.createElement('div');
    controls.className = 'ops';
    for (const [action, glyph, label, disabled] of [
      ['up', '↑', '上移', index === 0], ['down', '↓', '下移', index === kitchens.length - 1],
      ['remove', '×', '移除', false]
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = glyph;
      button.disabled = disabled;
      button.dataset.action = action;
      button.setAttribute('aria-label', label + ' ' + id);
      button.addEventListener('click', () => {
        if (action === 'remove') {
          kitchens.splice(index, 1);
          renderChoices();
          (roomSelect.disabled ? people : roomSelect).focus();
        } else {
          const target = index + (action === 'up' ? -1 : 1);
          [kitchens[index], kitchens[target]] = [kitchens[target], kitchens[index]];
          renderChoices(target, action);
        }
        updateDraft();
      });
      controls.append(button);
    }
    item.append(rank, name, controls);
    priority.append(item);
  });
  if (focusIndex != null) {
    const item = priority.children[focusIndex];
    const button = item?.querySelector('[data-action="' + focusAction + '"]:not(:disabled)');
    (button || item?.querySelector('button:not(:disabled)'))?.focus();
  }
}

async function refreshSlots() {
  if (reading || isActive() || !validDate(selectedDate) || selectedDate < tomorrow()) return;
  const date = selectedDate;
  const wanted = lookup?.date === date ? selectedSlot : '';
  lookup = undefined;
  slotError = '';
  reading = true;
  renderSlots();
  renderChoices();
  render();
  try {
    const response = await chrome.runtime.sendMessage({ kind: 'lookup-slots', date });
    if (selectedDate === date) {
      if (!response?.ok) throw new Error(response?.error || '未能读取网页时段。');
      if (response.lookup?.date !== date) throw new Error('网页日期与所选日期不一致，请重新读取。');
      lookup = response.lookup;
    }
  } catch (error) {
    if (selectedDate === date) slotError = error.message;
  } finally {
    reading = false;
    if (isActive()) return;
    if (selectedDate !== date) {
      await refreshSlots();
      return;
    }
    renderSlots(wanted);
    renderChoices();
    render();
    rememberDraft();
  }
}

function render() {
  const active = isActive();
  const previousUncertain = plan?.state === 'uncertain' || (plan?.state === 'manual' && Boolean(plan.commitAt));
  let windowPlan = active ? plan : null;
  let validation = '';
  if (!active && lookup?.date === selectedDate && kitchens.length && selectedSlot) {
    if (listedSlots(lookup.rooms, kitchens, Number(people.value)).includes(selectedSlot)) {
      try {
        windowPlan = buildPlan({ ...input(), authorized: true });
      } catch (error) {
        validation = error.message;
      }
    } else {
      validation = '已选厨房均不符合该时段或人数。';
    }
  }
  byId('state').textContent = labels[plan?.state] || '未设置';
  byId('window').textContent = windowPlan ?
    formatTime(windowPlan.prepareAt) + ' – ' + formatTime(windowPlan.deadline) :
    validation || '请选择日期、时段和厨房';
  byId('trigger').textContent = windowPlan ? '开始预约 ' + formatTime(windowPlan.startAt) : '';
  const prior = !active && plan?.date && plan.date !== selectedDate ? '（上次任务 ' + plan.date + '）' : '';
  byId('status').textContent = plan?.message ? plan.message + prior : '';
  byId('status').hidden = !plan?.message;
  byId('verify-previous').hidden = !previousUncertain;
  edit.disabled = active || busy;
  consent.disabled = !windowPlan;
  begin.hidden = active;
  begin.disabled = busy || reading || !windowPlan || !consent.checked ||
    (previousUncertain && !byId('checked-previous').checked);
  byId('cancel').hidden = !active;
  byId('cancel').disabled = busy || plan?.state === 'submitting';
}

function updateDraft() {
  consent.checked = false;
  displayError();
  render();
  rememberDraft();
}

async function message(kind, details = {}) {
  busy = true;
  displayError();
  render();
  try {
    const response = await chrome.runtime.sendMessage({ kind, ...details });
    if (!response?.ok) throw new Error(response?.error || '无法处理预约任务。');
    if (kind === 'schedule') {
      byId('authorized').checked = false;
      byId('checked-previous').checked = false;
    }
  } catch (error) {
    displayError(error.message);
  } finally {
    busy = false;
    render();
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (begin.disabled || begin.hidden) return;
  message('schedule', { input: input(), lookupId: lookup?.id, checkedPrevious: byId('checked-previous').checked });
});
calendar.addEventListener('click', event => {
  const date = event.target.dataset.date;
  if (!date || date === selectedDate) return;
  selectedDate = date;
  selectedSlot = '';
  slotError = '';
  if (lookup?.date !== date) lookup = undefined;
  renderCalendar(date);
  renderSlots();
  renderChoices();
  updateDraft();
  refreshSlots();
});
calendar.addEventListener('keydown', event => {
  const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
  const date = event.target.dataset.date;
  if (!offset || !date) return;
  event.preventDefault();
  const target = iso(new Date(utc(date).getTime() + offset * dayMs));
  if (target < tomorrow()) return;
  month = target.slice(0, 7);
  renderCalendar(target);
});
byId('previous-month').addEventListener('click', () => moveMonth(-1));
byId('next-month').addEventListener('click', () => moveMonth(1));
slots.addEventListener('change', event => {
  selectedSlot = event.target.value;
  renderChoices();
  updateDraft();
});
people.addEventListener('change', () => {
  renderChoices();
  updateDraft();
});
roomSelect.addEventListener('change', () => { byId('add').disabled = !roomSelect.value; });
byId('add').addEventListener('click', () => {
  if (!roomSelect.value) return;
  kitchens.push(roomSelect.value);
  renderChoices();
  if (roomSelect.disabled) {
    priority.lastElementChild?.querySelector('button:not(:disabled)')?.focus();
  } else {
    roomSelect.focus();
  }
  updateDraft();
});
for (const control of [consent, byId('checked-previous')]) {
  control.addEventListener('change', render);
}
byId('refresh-slots').addEventListener('click', refreshSlots);
byId('visit').addEventListener('click', () => message('visit'));
byId('cancel').addEventListener('click', () => message('cancel'));
function loadSelection(saved) {
  kitchens = (saved.kitchens || []).filter(id => KITCHENS.some(room => room.id === id));
  selectedDate = validDate(saved.date) ? saved.date : '';
  if (selectedDate) month = selectedDate.slice(0, 7);
  people.value = String(saved.people || 1);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.plan) return;
  const wasActive = isActive();
  plan = changes.plan.newValue;
  if (isActive() && (!wasActive || selectedDate !== plan.date || Number(people.value) !== plan.people ||
      kitchens.join(',') !== plan.kitchens.join(','))) {
    loadSelection(plan);
    renderCalendar();
  }
  renderSlots();
  renderChoices();
  render();
});

Promise.all([chrome.storage.local.get('plan'), chrome.storage.session.get(['slotLookup', 'draft'])]).then(([data, session]) => {
  plan = data.plan;
  const saved = isActive() ? plan : session.draft ?? plan;
  if (saved) {
    loadSelection(saved);
  } else if (session.slotLookup?.date >= tomorrow()) {
    selectedDate = session.slotLookup.date;
    month = selectedDate.slice(0, 7);
  }
  if (session.slotLookup?.date === selectedDate) lookup = session.slotLookup;
  renderCalendar();
  renderSlots(saved?.slot ?? (saved ? saved.start + '~' + saved.end : ''));
  renderChoices();
  render();
  byId('visit').disabled = false;
}).catch(error => displayError(error.message));
