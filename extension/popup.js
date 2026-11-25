const { KITCHENS, ACTIVE, buildPlan, localDay, formatTime, validDate, listedSlots, releaseHint } = KitchenPlan;
const byId = id => document.getElementById(id);
const form = byId('plan-form');
const people = byId('people');
const roomSelect = byId('room');
const edit = byId('settings');
const priority = byId('priority');
const dateInput = byId('date');
const slot = byId('slot');
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
const tomorrow = () => localDay(Date.now() + 86_400_000);
function input() {
  const [start = '', end = ''] = slot.value.split('~');
  return { date: dateInput.value, start, end, people: people.value, kitchens, authorized: byId('authorized').checked };
}

for (let count = 1; count <= 10; count++) people.add(new Option(count + ' 人', count));
byId('date').min = tomorrow();

function rememberDraft() {
  const draft = { date: dateInput.value, people: people.value, kitchens, slot: slot.value };
  chrome.storage.session.set({ draft }).catch(console.warn);
}

function restoreSlot(value) {
  if ([...slot.options].some(option => option.value === value)) slot.value = value;
}

function displayError(message = '') {
  byId('error').textContent = message;
  byId('error').hidden = !message;
}

function renderChoices(focusIndex, focusAction) {
  const current = roomSelect.value;
  roomSelect.replaceChildren(new Option('选择优先尝试的厨房', ''));
  for (const room of KITCHENS.filter(kitchen => !kitchens.includes(kitchen.id))) {
    roomSelect.add(new Option(room.campus + ' ' + room.id + ' · 最多 ' + room.capacity + ' 人', room.id));
  }
  if ([...roomSelect.options].some(option => option.value === current)) roomSelect.value = current;
  byId('add').disabled = !roomSelect.value;
  priority.replaceChildren();
  kitchens.forEach((id, index) => {
    const room = KITCHENS.find(item => item.id === id);
    const item = document.createElement('li');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = room.campus + ' ' + id;
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
          roomSelect.focus();
        } else {
          const target = index + (action === 'up' ? -1 : 1);
          [kitchens[index], kitchens[target]] = [kitchens[target], kitchens[index]];
          renderChoices(target, action);
        }
        renderSlots();
        render();
        rememberDraft();
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

function renderSlots() {
  const active = Boolean(plan && ACTIVE.includes(plan.state));
  const selected = active ? plan.start + '~' + plan.end : slot.value;
  const eligible = kitchens.length ? kitchens : KITCHENS.map(room => room.id);
  const options = active ? [selected] : lookup?.date === dateInput.value && !reading ?
    listedSlots(lookup.rooms, eligible, Number(people.value)) : [];
  slot.replaceChildren(new Option(reading ? '正在读取网页' : '请选择网页时段', ''));
  for (const value of options) slot.add(new Option(value.replace('~', '–'), value));
  slot.value = options.includes(selected) ? selected : '';
  slot.disabled = active || !options.length;
  byId('refresh-slots').disabled = active || reading || !validDate(dateInput.value) || dateInput.value < tomorrow();
  const status = reading ? '正在核对日期和网页时段…' : slotError ||
    (active ? '已保存 ' + plan.date + ' 的预约时段。' : lookup?.date === dateInput.value ?
      (options.length ? '已核对网页日期 ' + lookup.date + '。余位以预约时为准。' :
        '网页在 ' + lookup.date + ' 未列出符合人数及所选厨房的时段。') : '选定日期后，从预约网页读取。');
  byId('slot-info').textContent = [releaseHint(dateInput.value), status].filter(Boolean).join(' ');
}

async function refreshSlots() {
  if (reading || (plan && ACTIVE.includes(plan.state))) return;
  const date = dateInput.value;
  const selected = lookup?.date === date ? slot.value : '';
  lookup = undefined;
  slotError = '';
  slot.value = '';
  if (!validDate(date) || date < tomorrow()) {
    renderSlots();
    render();
    return;
  }
  reading = true;
  renderSlots();
  render();
  try {
    const response = await chrome.runtime.sendMessage({ kind: 'lookup-slots', date });
    if (!response?.ok) throw new Error(response?.error || '未能读取网页时段。');
    if (response.lookup.date === date) lookup = response.lookup;
  } catch (error) {
    slotError = error.message;
  } finally {
    reading = false;
    renderSlots();
    restoreSlot(selected);
    render();
    rememberDraft();
  }
}

function render() {
  const active = Boolean(plan && ACTIVE.includes(plan.state));
  const previousUncertain = plan?.state === 'uncertain' || (plan?.state === 'manual' && Boolean(plan.commitAt));
  let windowPlan = active ? plan : null;
  let validation = '';
  if (!active && input().date && kitchens.length && slot.value) {
    try {
      windowPlan = buildPlan({ ...input(), authorized: true });
    } catch (error) {
      validation = error.message;
    }
  }
  byId('state').textContent = labels[plan?.state] || '未设置';
  byId('window').textContent = windowPlan ?
    formatTime(windowPlan.prepareAt) + ' – ' + formatTime(windowPlan.deadline) :
    validation || '请选择日期、时段和厨房';
  byId('trigger').textContent = windowPlan ?
    '开始预约 ' + formatTime(windowPlan.startAt) : '';
  const prior = !active && plan?.date && plan.date !== dateInput.value ? '（上次任务 ' + plan.date + '）' : '';
  byId('status').textContent = plan?.message ? plan.message + prior : '';
  byId('status').hidden = !plan?.message;
  byId('verify-previous').hidden = !previousUncertain;
  edit.disabled = active || busy || reading;
  byId('begin').hidden = active;
  byId('begin').disabled = busy || reading || !windowPlan || !input().authorized ||
    (previousUncertain && !byId('checked-previous').checked);
  byId('cancel').hidden = !active;
  byId('cancel').disabled = busy || plan?.state === 'submitting';
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
  const values = input();
  message('schedule', { input: values, lookupId: lookup?.id, checkedPrevious: byId('checked-previous').checked });
});
form.addEventListener('input', event => {
  displayError();
  byId('add').disabled = !roomSelect.value;
  if (lookup?.date !== dateInput.value || event.target === people) renderSlots();
  render();
  if (edit.contains(event.target)) rememberDraft();
});
byId('add').addEventListener('click', () => {
  if (!roomSelect.value) return;
  kitchens.push(roomSelect.value);
  renderChoices();
  renderSlots();
  render();
  rememberDraft();
});
dateInput.addEventListener('change', refreshSlots);
byId('refresh-slots').addEventListener('click', refreshSlots);
byId('visit').addEventListener('click', () => message('visit'));
byId('cancel').addEventListener('click', () => message('cancel'));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.plan) return;
  plan = changes.plan.newValue;
  renderSlots();
  render();
});

Promise.all([chrome.storage.local.get('plan'), chrome.storage.session.get(['slotLookup', 'draft'])]).then(([data, session]) => {
  plan = data.plan;
  const saved = plan && ACTIVE.includes(plan.state) ? plan : session.draft ?? plan;
  if (saved) {
    kitchens = (saved.kitchens || []).filter(id => KITCHENS.some(room => room.id === id));
    dateInput.value = saved.date || '';
    people.value = String(saved.people || 1);
  } else if (session.slotLookup?.date >= tomorrow()) {
    dateInput.value = session.slotLookup.date;
  }
  if (session.slotLookup?.date === dateInput.value) lookup = session.slotLookup;
  renderChoices();
  renderSlots();
  if (saved && lookup) restoreSlot(saved.slot ?? (saved.start + '~' + saved.end));
  render();
}).catch(error => displayError(error.message));
