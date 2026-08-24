const STATE_KEY = "questJournalDailyStates";
const XP_KEY = "questJournalLifetimeXp";
const TIMEZONE_KEY = "questJournalTimezone";
const THEME_KEY = "questJournalTheme";

const xpValues = [5, 10, 15, 20, 30, 35, 40, 45, 60, 80, 100, 120, 140, 160, 180, 200];
const durations = [0, 300, 600, 900, 1200, 1800, 2400, 3000, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 28800];

const $ = id => document.getElementById(id);

const homeScreen = $("homeScreen");
const modePage = $("modePage");
const journalPage = $("journalPage");
const calendarPage = $("calendarPage");
const questForm = $("questForm");
const questTitle = $("questTitle");
const difficulty = $("difficulty");
const questList = $("questList");
const calendarDays = $("calendarDays");
const calendarMonth = $("calendarMonth");
const selectedDateText = $("selectedDateText");
const timezoneSelect = $("timezoneSelect");
const calendarTimezoneSelect = $("calendarTimezoneSelect");

const timezones = [
  ["UTC-12", "UTC−12 · Baker Island"], ["UTC-11", "UTC−11 · American Samoa"],
  ["UTC-10", "UTC−10 · Hawaii"], ["UTC-09", "UTC−09 · Alaska"],
  ["UTC-08", "UTC−08 · Pacific Time"], ["UTC-07", "UTC−07 · Mountain Time"],
  ["UTC-06", "UTC−06 · Central Time"], ["UTC-05", "UTC−05 · Eastern Time"],
  ["UTC-04", "UTC−04 · Atlantic Time"], ["UTC-03", "UTC−03 · South America"],
  ["UTC-02", "UTC−02 · Mid-Atlantic"], ["UTC-01", "UTC−01 · Azores"],
  ["UTC+00", "UTC±00 · Greenwich"], ["UTC+01", "UTC+01 · Central Europe"],
  ["UTC+02", "UTC+02 · Eastern Europe"], ["UTC+03", "UTC+03 · Arabia"],
  ["UTC+04", "UTC+04 · Gulf"], ["UTC+05", "UTC+05 · Pakistan"],
  ["UTC+05:30", "UTC+05:30 · India"], ["UTC+06", "UTC+06 · Bangladesh"],
  ["UTC+07", "UTC+07 · Indochina"], ["UTC+08", "UTC+08 · China"],
  ["UTC+09", "UTC+09 · Japan"], ["UTC+10", "UTC+10 · Eastern Australia"],
  ["UTC+11", "UTC+11 · Pacific Islands"]
];

const validTimezones = new Set(timezones.map(([value]) => value));
let timezone = localStorage.getItem(TIMEZONE_KEY);

if (!validTimezones.has(timezone)) {
  timezone = "UTC+00";
}

let activeTimer = null;
let timerInterval = null;

function fillTimezones() {
  const options = timezones
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");

  timezoneSelect.innerHTML = options;
  calendarTimezoneSelect.innerHTML = options;
  timezoneSelect.value = timezone;
  calendarTimezoneSelect.value = timezone;
}

fillTimezones();

function applyTheme(theme) {
  document.body.classList.toggle("light-theme", theme === "light");
  document.body.classList.toggle("dark-theme", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}

applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");

function dateKey(date = new Date()) {
  const offset = timezone === "UTC+05:30"
    ? 330
    : Number(timezone.replace("UTC", "")) * 60;

  const adjusted = new Date(date.getTime() + offset * 60000);

  return [
    adjusted.getUTCFullYear(),
    String(adjusted.getUTCMonth() + 1).padStart(2, "0"),
    String(adjusted.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function dateFromKey(key) {
  return new Date(`${key}T00:00:00Z`);
}

function formatDate(key) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC"
  }).format(dateFromKey(key));
}

function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function id() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function loadStates() {
  try {
    const states = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
    return states && typeof states === "object" ? states : {};
  } catch {
    return {};
  }
}

function normalizeTask(task) {
  return {
    id: String(task.id || id()),
    title: String(task.title || "Untitled task"),
    difficulty: String(task.difficulty || "Task"),
    xp: Number(task.xp) || 5,
    timerDuration: Number(task.timerDuration) || 0,
    done: Boolean(task.done),
    xpAwarded: Boolean(task.xpAwarded)
  };
}

const states = loadStates();
let lifetimeXp = Number(localStorage.getItem(XP_KEY)) || 0;
let currentDate = dateKey();
let journalDate = currentDate;
let currentState = {
  date: journalDate,
  quests: (states[journalDate]?.quests || []).map(normalizeTask)
};
let calendarDate = dateFromKey(currentDate);

function save() {
  states[journalDate] = currentState;
  localStorage.setItem(STATE_KEY, JSON.stringify(states));
  localStorage.setItem(XP_KEY, String(lifetimeXp));
}

function loadDate(key) {
  return {
    date: key,
    quests: (states[key]?.quests || []).map(normalizeTask)
  };
}

function escape(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = null;
  activeTimer = null;
}

function startTimer(task) {
  if (!task.timerDuration) {
    alert("This task has no timer because no specific time was selected.");
    return;
  }

  if (activeTimer?.taskId === task.id) {
    stopTimer();
    render();
    return;
  }

  stopTimer();

  activeTimer = {
    taskId: task.id,
    remaining: task.timerDuration
  };

  render();

  timerInterval = setInterval(() => {
    if (!activeTimer) return;

    activeTimer.remaining -= 1;

    if (activeTimer.remaining <= 0) {
      stopTimer();
      alert(`Time is up for "${task.title}".`);
    }

    render();
  }, 1000);
}

function render() {
  const completed = currentState.quests.filter(task => task.done).length;
  const levelStart = Math.floor(lifetimeXp / 100) * 100;

  $("total").textContent = currentState.quests.length;
  $("completed").textContent = completed;
  $("xp").textContent = `${lifetimeXp} / ${levelStart + 100}`;
  $("progress").style.width = `${lifetimeXp - levelStart}%`;
  $("journalDateText").textContent = formatDate(journalDate);

  questList.innerHTML = currentState.quests.length
    ? currentState.quests.map(task => {
      const timerRunning = activeTimer?.taskId === task.id;
      const timerText = timerRunning
        ? ` · ${formatTimer(activeTimer.remaining)}`
        : "";

      return `
        <div class="quest ${task.done ? "completed" : ""}">
          <button class="check" type="button" data-action="play"
            data-id="${escape(task.id)}"
            aria-label="${timerRunning ? "Pause timer" : "Start timer"}"
            title="${timerRunning ? "Pause timer" : "Start timer"}">
            ${timerRunning ? "⏸" : "▶"}
          </button>

          <button class="check" type="button" data-action="toggle"
            data-id="${escape(task.id)}"
            aria-label="${task.done ? "Mark task incomplete" : "Mark task complete"}">
            ${task.done ? "✓" : ""}
          </button>

          <div class="quest-info">
            <div class="quest-title">${escape(task.title)}</div>
            <div class="quest-meta">
              ${escape(task.difficulty)} · ${task.xp} XP${timerText}
            </div>
          </div>

          <button class="remove" type="button" data-action="remove"
            data-id="${escape(task.id)}" aria-label="Remove task">×</button>
        </div>
      `;
    }).join("")
    : '<div class="empty">No tasks for this date. Add tasks to get started.</div>';
}

function renderCalendar() {
  const year = calendarDate.getUTCFullYear();
  const month = calendarDate.getUTCMonth();
  const today = dateKey();
  const selected = journalDate;

  calendarMonth.textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(calendarDate);

  selectedDateText.textContent = `Selected: ${formatDate(selected)}`;
  calendarDays.innerHTML = "";

  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.insertAdjacentHTML(
      "beforeend",
      '<span class="calendar-empty"></span>'
    );
  }

  for (let day = 1; day <= totalDays; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const button = document.createElement("button");
    const hasTasks = Boolean(states[key]?.quests?.length);

    button.type = "button";
    button.textContent = day;
    button.dataset.date = key;
    button.title = `Open journal for ${formatDate(key)}`;

    if (key === today) button.classList.add("today");
    if (key === selected) button.classList.add("selected");
    if (hasTasks) button.classList.add("has-tasks");

    calendarDays.appendChild(button);
  }
}

function showPage(page) {
  homeScreen.hidden = page !== homeScreen;
  modePage.hidden = page !== modePage;
  journalPage.hidden = page !== journalPage;
  calendarPage.hidden = page !== calendarPage;
}

$("modeButton").addEventListener("click", () => showPage(modePage));

$("lightModeButton").addEventListener("click", () => {
  applyTheme("light");
  showPage(homeScreen);
});

$("darkModeButton").addEventListener("click", () => {
  applyTheme("dark");
  showPage(homeScreen);
});

$("openJournalButton").addEventListener("click", () => {
  stopTimer();
  journalDate = currentDate;
  currentState = loadDate(journalDate);
  showPage(journalPage);
  render();
});

$("openCalendarButton").addEventListener("click", () => {
  stopTimer();
  calendarDate = dateFromKey(currentDate);
  showPage(calendarPage);
  renderCalendar();
});

$("backHomeButton").addEventListener("click", () => {
  stopTimer();
  showPage(homeScreen);
});

$("backCalendarHomeButton").addEventListener("click", () => {
  showPage(homeScreen);
});

questForm.addEventListener("submit", event => {
  event.preventDefault();

  const index = Number(difficulty.value);
  const title = questTitle.value.trim();

  if (!title || !Number.isInteger(index) || !xpValues[index]) return;

  currentState.quests.push({
    id: id(),
    title,
    difficulty: difficulty.options[index].textContent.split(" · ")[0],
    xp: xpValues[index],
    timerDuration: durations[index],
    done: false,
    xpAwarded: false
  });

  save();
  questForm.reset();
  difficulty.value = "1";
  render();
  renderCalendar();
  questTitle.focus();
});

questList.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const task = currentState.quests.find(item => item.id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === "play") {
    startTimer(task);
    return;
  }

  if (button.dataset.action === "remove") {
    if (activeTimer?.taskId === task.id) stopTimer();
    currentState.quests = currentState.quests.filter(item => item.id !== task.id);
  }

  if (button.dataset.action === "toggle") {
    task.done = !task.done;

    if (task.done && !task.xpAwarded) {
      lifetimeXp += task.xp;
      task.xpAwarded = true;
    }
  }

  save();
  render();
  renderCalendar();
});

calendarDays.addEventListener("click", event => {
  const button = event.target.closest("[data-date]");
  if (!button) return;

  stopTimer();
  journalDate = button.dataset.date;
  currentState = loadDate(journalDate);
  showPage(journalPage);
  render();
});

$("previousMonthButton").addEventListener("click", () => {
  calendarDate.setUTCMonth(calendarDate.getUTCMonth() - 1);
  renderCalendar();
});

$("nextMonthButton").addEventListener("click", () => {
  calendarDate.setUTCMonth(calendarDate.getUTCMonth() + 1);
  renderCalendar();
});

function updateTimezone(value) {
  if (!validTimezones.has(value)) return;

  timezone = value;
  localStorage.setItem(TIMEZONE_KEY, timezone);
  timezoneSelect.value = timezone;
  calendarTimezoneSelect.value = timezone;
  currentDate = dateKey();

  render();
  renderCalendar();
}

timezoneSelect.addEventListener("change", event => {
  updateTimezone(event.target.value);
});

calendarTimezoneSelect.addEventListener("change", event => {
  updateTimezone(event.target.value);
});

$("restartButton").addEventListener("click", () => {
  if (!confirm("Are you sure you want to restart? Your gained XP won't return.")) return;

  lifetimeXp = 0;
  save();
  render();
});

$("deleteAllTasksButton").addEventListener("click", () => {
  if (!confirm("Delete all tasks from every date? Your lifetime XP will remain unchanged.")) return;

  stopTimer();
  localStorage.removeItem(STATE_KEY);
  Object.keys(states).forEach(key => delete states[key]);
  currentState = loadDate(journalDate);

  render();
  renderCalendar();
});

render();
renderCalendar();
