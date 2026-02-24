import { describe, expect, test } from "vitest";
import {
  BREAK_SECONDS,
  WORK_SECONDS,
  calculateGoal,
  createInitialState,
  resetState,
  startState,
  stopState,
  switchModeState,
  tickState,
  toDurationString,
  toTimeString,
} from "../timerCore.js";

describe("format helpers", () => {
  test("formats mm:ss correctly", () => {
    expect(toTimeString(1500)).toBe("25:00");
    expect(toTimeString(65)).toBe("01:05");
  });

  test("formats Japanese duration with seconds", () => {
    expect(toDurationString(0)).toBe("0時間00分00秒");
    expect(toDurationString(3661)).toBe("1時間01分01秒");
  });
});

describe("state transitions", () => {
  test("start and stop toggles running state", () => {
    const initial = createInitialState();
    const started = startState(initial);
    const stopped = stopState(started);

    expect(initial.running).toBe(false);
    expect(started.running).toBe(true);
    expect(stopped.running).toBe(false);
  });

  test("reset keeps mode and resets seconds", () => {
    const initial = createInitialState({ mode: "break", remainingSeconds: 10, running: true });
    const reset = resetState(initial);

    expect(reset.mode).toBe("break");
    expect(reset.running).toBe(false);
    expect(reset.remainingSeconds).toBe(BREAK_SECONDS);
  });

  test("switch mode sets target mode duration and stops timer", () => {
    const initial = createInitialState({ running: true });
    const switched = switchModeState(initial, "break");

    expect(switched.mode).toBe("break");
    expect(switched.remainingSeconds).toBe(BREAK_SECONDS);
    expect(switched.running).toBe(false);
  });
});

describe("tick behavior", () => {
  test("work tick increments focused seconds and decrements remaining", () => {
    const running = createInitialState({ running: true });
    const { state, phaseChanged } = tickState(running);

    expect(state.totalFocusedSeconds).toBe(1);
    expect(state.totalBreakSeconds).toBe(0);
    expect(state.remainingSeconds).toBe(WORK_SECONDS - 1);
    expect(phaseChanged).toBeNull();
  });

  test("work session completion switches to break and increments counters", () => {
    const nearEnd = createInitialState({ running: true, remainingSeconds: 1 });
    const { state, phaseChanged } = tickState(nearEnd);

    expect(phaseChanged).toBe("break");
    expect(state.mode).toBe("break");
    expect(state.remainingSeconds).toBe(BREAK_SECONDS);
    expect(state.completedCount).toBe(1);
    expect(state.cycleCount).toBe(1);
    expect(state.totalFocusedSeconds).toBe(1);
  });

  test("break completion switches back to work", () => {
    const breakNearEnd = createInitialState({
      mode: "break",
      remainingSeconds: 1,
      running: true,
      totalBreakSeconds: 10,
    });

    const { state, phaseChanged } = tickState(breakNearEnd);

    expect(phaseChanged).toBe("work");
    expect(state.mode).toBe("work");
    expect(state.remainingSeconds).toBe(WORK_SECONDS);
    expect(state.totalBreakSeconds).toBe(11);
  });
});

describe("goal helper", () => {
  test("caps progress bar at goal max", () => {
    const goal = calculateGoal(12, 8);

    expect(goal.text).toBe("12/8");
    expect(goal.value).toBe(8);
    expect(goal.percent).toBe(100);
  });
});
