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
const timerRing = document.querySelector(".timer-ring");
const bgCanvas = document.getElementById("bgCanvas");
const effectBtn = document.getElementById("effectBtn");

const radius = 96;
const circumference = 2 * Math.PI * radius;

ring.style.strokeDasharray = `${circumference}`;

// Background ripple effect state
let effectEnabled = true;
let ripples = [];
let lastRippleMs = 0;
const bgCtx = bgCanvas.getContext("2d");

const RIPPLE_INITIAL_RADIUS = 10;
const RIPPLE_INITIAL_ALPHA = 0.5;
const RIPPLE_EXPANSION_RATE = 1.5;
const RIPPLE_ALPHA_DECAY = 0.004;
const RIPPLE_INTERVAL_MS = 2500;

function resizeCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function animateRipples(timestamp) {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  if (effectEnabled) {
    if (state.running && state.mode === "work" && timestamp - lastRippleMs > RIPPLE_INTERVAL_MS) {
      const rect = timerRing.getBoundingClientRect();
      ripples.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: RIPPLE_INITIAL_RADIUS, alpha: RIPPLE_INITIAL_ALPHA });
      lastRippleMs = timestamp;
    }
    ripples = ripples.filter((r) => r.alpha > 0.01);
    for (const r of ripples) {
      bgCtx.beginPath();
      bgCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      bgCtx.strokeStyle = `rgba(127, 198, 255, ${r.alpha})`;
      bgCtx.lineWidth = 2;
      bgCtx.stroke();
      r.radius += RIPPLE_EXPANSION_RATE;
      r.alpha -= RIPPLE_ALPHA_DECAY;
    }
  } else {
    ripples = [];
  }
  requestAnimationFrame(animateRipples);
}
requestAnimationFrame(animateRipples);

// Color interpolation helpers
function interpolateColor(c1, c2, t) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function getRingColor(ratio, mode) {
  if (mode !== "work") return "#a8e4b8";
  if (ratio > 0.5) {
    return interpolateColor([127, 198, 255], [255, 216, 96], (1 - ratio) * 2);
  }
  return interpolateColor([255, 216, 96], [255, 107, 107], (0.5 - ratio) * 2);
}

function stopTicking() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateRing() {
  const ratio = state.remainingSeconds / modes[state.mode].duration;
  ring.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
  ring.style.stroke = getRingColor(ratio, state.mode);
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

effectBtn.addEventListener("click", () => {
  effectEnabled = !effectEnabled;
  effectBtn.textContent = effectEnabled ? "エフェクトON" : "エフェクトOFF";
  effectBtn.classList.toggle("effect-on", effectEnabled);
});

if ("Notification" in window && Notification.permission === "granted") {
  notifyBtn.textContent = "通知ON";
}

render();
