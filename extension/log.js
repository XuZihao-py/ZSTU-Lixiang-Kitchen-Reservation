if (window.parent !== window) document.documentElement.classList.add('workbench-embedded');

const { describeTask, describeKitchens, report, diagnosticReport, stamp } = KitchenLog;
const byId = id => document.getElementById(id);
const selectTask = byId('log-task');
const timeline = byId('log-events');
const empty = byId('empty-log');
const feedback = byId('log-feedback');
const exportOptions = byId('export-options');
const exportTasks = byId('export-tasks');
const exportAll = byId('export-all');
const confirmExport = byId('confirm-export');
let exportIds = new Set();
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
  if (!exportOptions.hidden) renderExportTasks();
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
function syncExportSelection() {
  const count = tasks.filter(task => exportIds.has(task.id)).length;
  exportAll.checked = tasks.length > 0 && count === tasks.length;
  exportAll.indeterminate = count > 0 && count < tasks.length;
  exportAll.disabled = tasks.length === 0;
  confirmExport.disabled = count === 0;
  confirmExport.textContent = '导出所选（' + count + '）';
}

function renderExportTasks() {
  exportTasks.replaceChildren(...tasks.map(task => {
    const label = document.createElement('label');
    label.className = 'export-choice';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = task.id;
    box.checked = exportIds.has(task.id);
    label.append(box, describeTask(task) + ' · 记录于 ' + stamp(task.loggedAt));
    return label;
  }));
  syncExportSelection();
}

byId('download-log').addEventListener('click', () => {
  exportIds = new Set(selected() ? [selected().id] : []);
  exportOptions.hidden = false;
  renderExportTasks();
  exportAll.focus();
});
byId('cancel-export').addEventListener('click', () => {
  exportOptions.hidden = true;
  byId('download-log').focus();
});
exportTasks.addEventListener('change', event => {
  const { checked, value } = event.target;
  if (checked) exportIds.add(value);
  else exportIds.delete(value);
  syncExportSelection();
});
exportAll.addEventListener('change', () => {
  exportIds = new Set(exportAll.checked ? tasks.map(task => task.id) : []);
  renderExportTasks();
});
confirmExport.addEventListener('click', () => {
  const matched = tasks.filter(task => exportIds.has(task.id));
  if (!matched.length) return;
  const metadata = {
    extensionVersion: chrome.runtime.getManifest().version,
    chromeVersion: /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1],
    platform: navigator.userAgentData?.platform
  };
  const url = URL.createObjectURL(new Blob(['\uFEFF', diagnosticReport(matched, metadata)],
    { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = '理享厨房诊断日志-' + KitchenPlan.localDay(Date.now()) + '.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  exportOptions.hidden = true;
  byId('download-log').focus();
  showFeedback('已导出 ' + matched.length + ' 条任务记录。');
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
