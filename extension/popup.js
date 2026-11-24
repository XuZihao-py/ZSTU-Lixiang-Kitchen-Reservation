const { KITCHENS, ACTIVE, buildPlan, localDay, formatTime } = KitchenPlan;
const byId = id => document.getElementById(id);
const form = byId('plan-form');
const people = byId('people');
const roomSelect = byId('room');
const edit = byId('settings');
const priority = byId('priority');
let kitchens = [];
let plan;
let busy = false;

const labels = {
  scheduled: '已安排', preparing: '准备中', waiting: '待命', running: '预约中',
  submitting: '等回执', success: '预约成功', unavailable: '无可约名额', manual: '请到网页查看',
  uncertain: '待核对', failed: '预约失败', cancelled: '已停止', expired: '已超时'
};
const tomorrow = () => localDay(Date.now() + 86_400_000);
const input = () => ({
  date: byId('date').value, start: byId('start').value, end: byId('end').value,
  people: people.value, kitchens, authorized: byId('authorized').checked
});

for (let count = 1; count <= 10; count++) people.add(new Option(count + ' 人', count));
byId('date').min = tomorrow();

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
        render();
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

function render() {
  const active = Boolean(plan && ACTIVE.includes(plan.state));
  const previousUncertain = plan?.state === 'uncertain' || (plan?.state === 'manual' && Boolean(plan.commitAt));
  let windowPlan = active ? plan : null;
  let validation = '';
  if (!active && input().date && kitchens.length) {
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
  byId('status').textContent = plan?.message ?? '';
  byId('status').hidden = !plan?.message;
  byId('verify-previous').hidden = !previousUncertain;
  edit.disabled = active || busy;
  byId('begin').hidden = active;
  byId('begin').disabled = busy || !windowPlan || !input().authorized ||
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
  message('schedule', { input: values, checkedPrevious: byId('checked-previous').checked });
});
form.addEventListener('input', () => {
  displayError();
  byId('add').disabled = !roomSelect.value;
  render();
});
byId('add').addEventListener('click', () => {
  if (!roomSelect.value) return;
  kitchens.push(roomSelect.value);
  renderChoices();
  render();
});
byId('visit').addEventListener('click', () => message('visit'));
byId('cancel').addEventListener('click', () => message('cancel'));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.plan) return;
  plan = changes.plan.newValue;
  render();
});

chrome.storage.local.get('plan').then(data => {
  plan = data.plan;
  if (plan) {
    kitchens = plan.kitchens.filter(id => KITCHENS.some(room => room.id === id));
    byId('date').value = plan.date;
    byId('start').value = plan.start;
    byId('end').value = plan.end;
    people.value = String(plan.people);
  }
  renderChoices();
  render();
}).catch(error => displayError(error.message));
