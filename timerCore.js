export const WORK_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;
export const DAILY_GOAL = 8;
export const XP_PER_POMODORO = 10;
export const XP_PER_LEVEL = 100;

export const modes = {
  work: { label: "作業中", duration: WORK_SECONDS },
  break: { label: "休憩中", duration: BREAK_SECONDS },
};

export function createInitialState(overrides = {}) {
  return {
    mode: "work",
    remainingSeconds: WORK_SECONDS,
    running: false,
    completedCount: 0,
    cycleCount: 0,
    totalFocusedSeconds: 0,
    totalBreakSeconds: 0,
    xp: 0,
    level: 1,
    streak: 0,
    lastCompletedDate: null,
    earnedBadges: {},
    weeklyStats: {},
    ...overrides,
  };
}

export function toTimeString(seconds) {
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${sec}`;
}

export function toDurationString(seconds) {
  const hour = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  return `${hour}時間${min.toString().padStart(2, "0")}分${sec.toString().padStart(2, "0")}秒`;
}

export function startState(state) {
  if (state.running) {
    return state;
  }
  return { ...state, running: true };
}

export function stopState(state) {
  if (!state.running) {
    return state;
  }
  return { ...state, running: false };
}

export function resetState(state) {
  return {
    ...state,
    running: false,
    remainingSeconds: modes[state.mode].duration,
  };
}

export function switchModeState(state, nextMode) {
  return {
    ...state,
    running: false,
    mode: nextMode,
    remainingSeconds: modes[nextMode].duration,
  };
}

export function calculateGoal(completedCount, goal = DAILY_GOAL) {
  const goalNow = Math.min(completedCount, goal);
  return {
    text: `${completedCount}/${goal}`,
    percent: (goalNow / goal) * 100,
    value: goalNow,
    max: goal,
  };
}

export function tickState(state) {
  if (!state.running) {
    return { state, phaseChanged: null };
  }

  let nextState = { ...state };

  if (nextState.mode === "work") {
    nextState.totalFocusedSeconds += 1;
  } else {
    nextState.totalBreakSeconds += 1;
  }

  nextState.remainingSeconds -= 1;

  let phaseChanged = null;

  if (nextState.remainingSeconds <= 0) {
    if (nextState.mode === "work") {
      nextState.completedCount += 1;
      nextState.cycleCount += 1;
      nextState.xp += XP_PER_POMODORO;
      nextState.level = Math.floor(nextState.xp / XP_PER_LEVEL) + 1;
      nextState.mode = "break";
      phaseChanged = "break";
    } else {
      nextState.mode = "work";
      phaseChanged = "work";
    }

    nextState.remainingSeconds = modes[nextState.mode].duration;
  }

  return { state: nextState, phaseChanged };
}
