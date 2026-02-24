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

let state = createInitialState();
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
  const ratio = state.remainingSeconds / modes[state.mode].duration;
  ring.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
  ring.style.stroke = state.mode === "work" ? "#7fc6ff" : "#a8e4b8";
}

function updateModeButtons() {
  const isWork = state.mode === "work";
  workModeBtn.classList.toggle("active", isWork);
  breakModeBtn.classList.toggle("active", !isWork);
  workModeBtn.setAttribute("aria-selected", String(isWork));
  breakModeBtn.setAttribute("aria-selected", String(!isWork));
}

function updateGoal() {
  const goal = calculateGoal(state.completedCount);
  goalText.textContent = goal.text;
  goalFill.style.width = `${goal.percent}%`;
  goalBar.setAttribute("aria-valuenow", String(goal.value));
  goalBar.setAttribute("aria-valuemax", String(goal.max));
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
}

function playAlertSound() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gainNode.gain.setValueAtTime(0.001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
  } catch (_) {
    return;
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
  playAlertSound();
  sendNotification(
    nextMode === "break" ? "休憩時間です" : "作業時間です",
    nextMode === "break" ? "5分休憩しましょう。" : "25分の作業を開始しましょう。"
  );
}

function finishSession() {
  const result = tickState(state);
  state = result.state;
  if (result.phaseChanged) {
    notifyPhaseChange(result.phaseChanged);
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

render();
