import {
  calculateGoal,
  createInitialState,
  modes,
  resetState,
  startState,
  stopState,
  switchModeState,
  tickState,
  toDurationString,
  toTimeString,
} from "./timerCore.js";
importhttps://github.com/hirayukis/ghcp-demo/pull/21/conflict?name=timerCore.js&ancestor_oid=071d4aa3dd8408d230f3a01edebf6db6c625de70&base_oid=74459898afedd2ec7c6c13c8130a821477eed3b6&head_oid=d1a2291c0acc579fe17eef3f0525b798370f894f {
  BADGES,
  XP_PER_LEVEL,
  checkBadges,
  loadFromStorage,
  saveToStorage,
  updateStreak,
  updateWeeklyStats,
  xpInCurrentLevel,
} from "./gamification.js";

// Settings management
const SETTINGS_KEY = "pomodoroSettings";
const DEFAULT_SETTINGS = {
  workMinutes: 25,
  breakMinutes: 5,
  theme: "dark",
  soundStart: true,
  soundEnd: true,
  soundTick: false,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (_) {
    return;
  }
}

let settings = loadSettings();

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

applyTheme(settings.theme);

let state = createInitialState({
  workSeconds: settings.workMinutes * 60,
  breakSeconds: settings.breakMinutes * 60,
});
let timerId = null;

const timeLabel = document.getElementById("timeLabel");
const statusText = document.getElementById("statusText");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const notifyBtn = document.getElementById("notifyBtn");
const workModeBtn = document.getElementById("workModeBtn");
const breakModeBtn = document.getElementById("breakModeBtn");
const completedCountLabel = document.getElementById("completedCount");
const cycleCountLabel = document.getElementById("cycleCount");
const focusTimeLabel = document.getElementById("focusTime");
const breakTimeLabel = document.getElementById("breakTime");
const goalText = document.getElementById("goalText");
const goalFill = document.getElementById("goalFill");
const goalBar = document.querySelector(".goal-bar");
const ring = document.querySelector(".ring-progress");
const levelValue = document.getElementById("levelValue");
const xpText = document.getElementById("xpText");
const xpFill = document.getElementById("xpFill");
const xpBar = document.querySelector(".xp-bar");
const streakValue = document.getElementById("streakValue");
const badgesGrid = document.getElementById("badgesGrid");
const weeklyStatsGrid = document.getElementById("weeklyStatsGrid");

// Settings panel elements
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const workMinutesSelect = document.getElementById("workMinutesSelect");
const breakMinutesSelect = document.getElementById("breakMinutesSelect");
const themeSelect = document.getElementById("themeSelect");
const soundStartCheck = document.getElementById("soundStartCheck");
const soundEndCheck = document.getElementById("soundEndCheck");
const soundTickCheck = document.getElementById("soundTickCheck");

// Initialise settings UI from loaded settings
workMinutesSelect.value = String(settings.workMinutes);
breakMinutesSelect.value = String(settings.breakMinutes);
themeSelect.value = settings.theme;
soundStartCheck.checked = settings.soundStart;
soundEndCheck.checked = settings.soundEnd;
soundTickCheck.checked = settings.soundTick;

const radius = 96;
const circumference = 2 * Math.PI * radius;

ring.style.strokeDasharray = `${circumference}`;

function stopTicking() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateRing() {
  const totalDuration = state.mode === "work" ? state.workSeconds : state.breakSeconds;
  const ratio = state.remainingSeconds / totalDuration;
  ring.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
  ring.style.stroke = state.mode === "work"
    ? getComputedStyle(document.documentElement).getPropertyValue("--ring-work").trim()
    : getComputedStyle(document.documentElement).getPropertyValue("--ring-break").trim();
}

function updateModeButtons() {
  const isWork = state.mode === "work";
  workModeBtn.classList.toggle("active", isWork);
  breakModeBtn.classList.toggle("active", !isWork);
  workModeBtn.setAttribute("aria-selected", String(isWork));
  breakModeBtn.setAttribute("aria-selected", String(!isWork));
  workModeBtn.textContent = `作業 ${settings.workMinutes}分`;
  breakModeBtn.textContent = `休憩 ${settings.breakMinutes}分`;
}

function updateGoal() {
  const goal = calculateGoal(state.completedCount);
  goalText.textContent = goal.text;
  goalFill.style.width = `${goal.percent}%`;
  goalBar.setAttribute("aria-valuenow", String(goal.value));
  goalBar.setAttribute("aria-valuemax", String(goal.max));
}

function updateGamification() {
  const currentXp = xpInCurrentLevel(state.xp);
  levelValue.textContent = String(state.level);
  xpText.textContent = `${currentXp} / ${XP_PER_LEVEL} XP`;
  xpFill.style.width = `${(currentXp / XP_PER_LEVEL) * 100}%`;
  xpBar.setAttribute("aria-valuenow", String(currentXp));
  streakValue.textContent = String(state.streak);

  badgesGrid.innerHTML = "";
  for (const badge of BADGES) {
    const earned = !!state.earnedBadges[badge.id];
    const el = document.createElement("div");
    el.className = `badge-item${earned ? " earned" : ""}`;
    el.title = badge.desc;
    el.innerHTML = `<span class="badge-emoji">${badge.emoji}</span><span class="badge-label">${badge.label}</span>`;
    badgesGrid.appendChild(el);
  }

  const weeks = Object.entries(state.weeklyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 4);
  weeklyStatsGrid.innerHTML = "";
  if (weeks.length === 0) {
    weeklyStatsGrid.innerHTML = `<p class="stats-empty">データなし</p>`;
  } else {
    const maxCompleted = Math.max(...weeks.map(([, v]) => v.completed), 1);
    for (const [week, data] of weeks) {
      const hours = Math.floor(data.focusSeconds / 3600);
      const mins = Math.floor((data.focusSeconds % 3600) / 60);
      const barPct = Math.round((data.completed / maxCompleted) * 100);
      const el = document.createElement("div");
      el.className = "stat-row";
      el.innerHTML = `
        <span class="stat-week">${week}</span>
        <div class="stat-bar-wrap">
          <div class="stat-bar" style="width:${barPct}%"></div>
        </div>
        <span class="stat-count">${data.completed}回 ${hours}時間${String(mins).padStart(2, "0")}分</span>
      `;
      weeklyStatsGrid.appendChild(el);
    }
  }
}

function render() {
  timeLabel.textContent = toTimeString(state.remainingSeconds);
  statusText.textContent = state.running ? modes[state.mode].label : `${modes[state.mode].label}（停止中）`;
  startPauseBtn.textContent = state.running ? "停止" : "開始";
  completedCountLabel.textContent = String(state.completedCount);
  cycleCountLabel.textContent = String(state.cycleCount);
  focusTimeLabel.textContent = toDurationString(state.totalFocusedSeconds);
  breakTimeLabel.textContent = toDurationString(state.totalBreakSeconds);
  updateModeButtons();
  updateGoal();
  updateRing();
  updateGamification();
}

// Shared AudioContext for sound playback
let audioContext = null;

function getAudioContext() {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency, duration, gainPeak = 0.2) {
  try {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gainNode.gain.setValueAtTime(0.001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(gainPeak, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch (_) {
    return;
  }
}

function playStartSound() {
  if (settings.soundStart) {
    playTone(660, 0.15, 0.15);
  }
}

function playEndSound() {
  if (settings.soundEnd) {
    playTone(880, 0.5, 0.2);
  }
}

function playTickSound() {
  if (settings.soundTick) {
    playTone(440, 0.05, 0.03);
  }
}

function sendNotification(title, body) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch (_) {
    return;
  }
}

function notifyPhaseChange(nextMode) {
  playEndSound();
  const breakMin = settings.breakMinutes;
  const workMin = settings.workMinutes;
  sendNotification(
    nextMode === "break" ? "休憩時間です" : "作業時間です",
    nextMode === "break" ? `${breakMin}分休憩しましょう。` : `${workMin}分の作業を開始しましょう。`
  );
}

function finishSession() {
  const result = tickState(state);
  state = result.state;
  if (result.phaseChanged) {
    notifyPhaseChange(result.phaseChanged);
  } else {
    playTickSound();
  }
  render();
}

function tick() {
  finishSession();
}

function startTimer() {
  if (state.running) {
    return;
  }
  playStartSound();
  state = startState(state);
  timerId = setInterval(tick, 1000);
  render();
}

function stopTimer() {
  state = stopState(state);
  stopTicking();
  render();
}

function resetTimer() {
  stopTicking();
  state = resetState(state);
  render();
}

startPauseBtn.addEventListener("click", () => {
  if (state.running) {
    stopTimer();
    return;
  }
  startTimer();
});

resetBtn.addEventListener("click", () => {
  resetTimer();
});

workModeBtn.addEventListener("click", () => {
  stopTicking();
  state = switchModeState(state, "work");
  render();
});

breakModeBtn.addEventListener("click", () => {
  stopTicking();
  state = switchModeState(state, "break");
  render();
});

notifyBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    notifyBtn.textContent = "通知非対応";
    notifyBtn.disabled = true;
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    notifyBtn.textContent = "通知ON";
    return;
  }
  notifyBtn.textContent = "通知OFF";
});

if ("Notification" in window && Notification.permission === "granted") {
  notifyBtn.textContent = "通知ON";
}

// Settings panel toggle
settingsBtn.addEventListener("click", () => {
  const isHidden = settingsPanel.hidden;
  settingsPanel.hidden = !isHidden;
  settingsBtn.setAttribute("aria-expanded", String(isHidden));
});

// Settings changes
function applyWorkDuration(minutes) {
  const workSeconds = minutes * 60;
  stopTicking();
  state = { ...state, workSeconds };
  if (state.mode === "work") {
    state = { ...state, remainingSeconds: workSeconds, running: false };
  }
  render();
}

function applyBreakDuration(minutes) {
  const breakSeconds = minutes * 60;
  stopTicking();
  state = { ...state, breakSeconds };
  if (state.mode === "break") {
    state = { ...state, remainingSeconds: breakSeconds, running: false };
  }
  render();
}

workMinutesSelect.addEventListener("change", () => {
  settings.workMinutes = Number(workMinutesSelect.value);
  saveSettings(settings);
  applyWorkDuration(settings.workMinutes);
});

breakMinutesSelect.addEventListener("change", () => {
  settings.breakMinutes = Number(breakMinutesSelect.value);
  saveSettings(settings);
  applyBreakDuration(settings.breakMinutes);
});

themeSelect.addEventListener("change", () => {
  settings.theme = themeSelect.value;
  saveSettings(settings);
  applyTheme(settings.theme);
  updateRing();
});

soundStartCheck.addEventListener("change", () => {
  settings.soundStart = soundStartCheck.checked;
  saveSettings(settings);
});

soundEndCheck.addEventListener("change", () => {
  settings.soundEnd = soundEndCheck.checked;
  saveSettings(settings);
});

soundTickCheck.addEventListener("change", () => {
  settings.soundTick = soundTickCheck.checked;
  saveSettings(settings);
});

render();
