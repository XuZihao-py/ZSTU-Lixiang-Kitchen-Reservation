const { describeTask, describeKitchens, report, stamp } = KitchenLog;
const byId = id => document.getElementById(id);
const selectTask = byId('log-task');
const timeline = byId('log-events');
const empty = byId('empty-log');
const feedback = byId('log-feedback');
let tasks = [];
let updated = false;
const selected = () => tasks.find(task => task.id === selectTask.value);

function showFeedback(message = '') {
  feedback.textContent = message;
  feedback.hidden = !message;
}

function setTime(element, at) {
  element.dateTime = new Date(at).toISOString();
  element.textContent = stamp(at);
}

function renderTask() {
  const task = selected();
  if (!task) return;
  byId('log-heading').textContent = describeTask(task);
  byId('log-kitchens').textContent = describeKitchens(task);
  setTime(byId('log-start'), task.startAt);
  timeline.replaceChildren(...task.events.map(event => {
    const line = document.createElement('li');
    const time = document.createElement('time');
    setTime(time, event.at);
    const message = document.createElement('span');
    message.textContent = event.message;
    line.append(time, message);
    return line;
  }));
}

function render(entries = []) {
  const previous = selectTask.value;
  const followingLatest = !previous || previous === tasks[0]?.id;
  tasks = entries;
  empty.hidden = tasks.length > 0;
  empty.textContent = '暂无预约日志。保存新任务后即可查看执行记录。';
  byId('log-view').hidden = !tasks.length;
  selectTask.replaceChildren(...tasks.map(task =>
    new Option(describeTask(task) + ' · 记录于 ' + stamp(task.loggedAt).slice(0, 19), task.id)));
  if (!followingLatest && tasks.some(task => task.id === previous)) selectTask.value = previous;
  renderTask();
}

selectTask.addEventListener('change', () => {
  showFeedback();
  renderTask();
});
byId('copy-log').addEventListener('click', async () => {
  const task = selected();
  if (!task) return;
  try {
    await navigator.clipboard.writeText(report(task));
    showFeedback('已复制预约日志。');
  } catch {
    showFeedback('无法访问剪贴板，可下载 TXT。');
  }
});
byId('download-log').addEventListener('click', () => {
  const task = selected();
  if (!task) return;
  const url = URL.createObjectURL(new Blob(['\uFEFF', report(task)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = '理享厨房预约日志-' + task.date + '-' + task.start.replace(':', '') + '.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.bookingHistory) return;
  updated = true;
  render(changes.bookingHistory.newValue);
});
chrome.storage.local.get('bookingHistory').then(data => {
  if (!updated) render(data.bookingHistory);
}).catch(() => {
  if (!updated) empty.textContent = '无法读取预约日志，请重新打开此页。';
});
