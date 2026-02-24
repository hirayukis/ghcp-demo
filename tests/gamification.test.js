// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import {
  BADGES,
  XP_PER_LEVEL,
  XP_PER_POMODORO,
  calculateLevel,
  checkBadges,
  getDateString,
  getWeekKey,
  loadFromStorage,
  saveToStorage,
  updateStreak,
  updateWeeklyStats,
  xpInCurrentLevel,
} from "../gamification.js";

describe("XP and level", () => {
  test("XP_PER_POMODORO and XP_PER_LEVEL are positive integers", () => {
    expect(XP_PER_POMODORO).toBeGreaterThan(0);
    expect(XP_PER_LEVEL).toBeGreaterThan(0);
  });

  test("calculateLevel starts at 1 with 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  test("calculateLevel increases at XP_PER_LEVEL boundaries", () => {
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(200)).toBe(3);
  });

  test("xpInCurrentLevel returns remainder within level", () => {
    expect(xpInCurrentLevel(0)).toBe(0);
    expect(xpInCurrentLevel(50)).toBe(50);
    expect(xpInCurrentLevel(100)).toBe(0);
    expect(xpInCurrentLevel(150)).toBe(50);
  });
});

describe("streak", () => {
  test("first completion sets streak to 1", () => {
    const result = updateStreak(0, null, "2024-01-10");
    expect(result.streak).toBe(1);
    expect(result.lastCompletedDate).toBe("2024-01-10");
  });

  test("completing again on same day keeps streak unchanged", () => {
    const result = updateStreak(3, "2024-01-10", "2024-01-10");
    expect(result.streak).toBe(3);
    expect(result.lastCompletedDate).toBe("2024-01-10");
  });

  test("completing on the next day increments streak", () => {
    const result = updateStreak(2, "2024-01-10", "2024-01-11");
    expect(result.streak).toBe(3);
    expect(result.lastCompletedDate).toBe("2024-01-11");
  });

  test("completing after 2+ day gap resets streak to 1", () => {
    const result = updateStreak(5, "2024-01-08", "2024-01-11");
    expect(result.streak).toBe(1);
    expect(result.lastCompletedDate).toBe("2024-01-11");
  });
});

describe("weekly stats", () => {
  test("first entry for a week creates initial stats", () => {
    const today = new Date("2024-01-15");
    const weekKey = getWeekKey(today);
    const result = updateWeeklyStats({}, 1500, today);
    expect(result[weekKey].completed).toBe(1);
    expect(result[weekKey].focusSeconds).toBe(1500);
  });

  test("subsequent entries accumulate stats for same week", () => {
    const today = new Date("2024-01-15");
    const weekKey = getWeekKey(today);
    const initial = { [weekKey]: { completed: 3, focusSeconds: 4500 } };
    const result = updateWeeklyStats(initial, 1500, today);
    expect(result[weekKey].completed).toBe(4);
    expect(result[weekKey].focusSeconds).toBe(6000);
  });

  test("entries for different weeks are stored separately", () => {
    const week1 = new Date("2024-01-08");
    const week2 = new Date("2024-01-15");
    let stats = {};
    stats = updateWeeklyStats(stats, 1500, week1);
    stats = updateWeeklyStats(stats, 1500, week2);
    expect(Object.keys(stats).length).toBe(2);
  });
});

describe("badges", () => {
  test("first badge earned after 1 completion", () => {
    const badges = checkBadges({}, 1, 1, {});
    expect(badges.first).toBe(true);
  });

  test("streak3 badge earned at streak >= 3", () => {
    expect(checkBadges({}, 5, 2, {}).streak3).toBeUndefined();
    expect(checkBadges({}, 5, 3, {}).streak3).toBe(true);
  });

  test("streak7 badge earned at streak >= 7", () => {
    expect(checkBadges({}, 10, 6, {}).streak7).toBeUndefined();
    expect(checkBadges({}, 10, 7, {}).streak7).toBe(true);
  });

  test("ten badge earned at 10 total completions", () => {
    expect(checkBadges({}, 9, 1, {}).ten).toBeUndefined();
    expect(checkBadges({}, 10, 1, {}).ten).toBe(true);
  });

  test("weekTen badge earned when current week has 10 completions", () => {
    const today = new Date("2024-01-15");
    const weekKey = getWeekKey(today);
    const stats = { [weekKey]: { completed: 10, focusSeconds: 15000 } };
    const badges = checkBadges({}, 10, 1, stats, today);
    expect(badges.weekTen).toBe(true);
  });

  test("centurion badge earned at 100 total completions", () => {
    expect(checkBadges({}, 99, 1, {}).centurion).toBeUndefined();
    expect(checkBadges({}, 100, 1, {}).centurion).toBe(true);
  });

  test("already earned badges are preserved", () => {
    const existing = { first: true, streak3: true };
    const result = checkBadges(existing, 1, 1, {});
    expect(result.first).toBe(true);
    expect(result.streak3).toBe(true);
  });

  test("BADGES list covers all badge ids", () => {
    const badgeIds = new Set(BADGES.map((b) => b.id));
    expect(badgeIds.has("first")).toBe(true);
    expect(badgeIds.has("streak3")).toBe(true);
    expect(badgeIds.has("streak7")).toBe(true);
    expect(badgeIds.has("ten")).toBe(true);
    expect(badgeIds.has("weekTen")).toBe(true);
    expect(badgeIds.has("centurion")).toBe(true);
  });
});

describe("getDateString and getWeekKey", () => {
  test("getDateString returns ISO date string", () => {
    const d = new Date("2024-06-15T10:00:00Z");
    expect(getDateString(d)).toBe("2024-06-15");
  });

  test("getWeekKey returns year and week number", () => {
    const d = new Date("2024-01-08");
    const key = getWeekKey(d);
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("localStorage persistence", () => {
  test("loadFromStorage returns null when storage is empty", () => {
    expect(loadFromStorage()).toBeNull();
  });

  test("saveToStorage and loadFromStorage round-trip data correctly", () => {
    const data = {
      xp: 50,
      level: 1,
      streak: 3,
      lastCompletedDate: "2024-01-15",
      earnedBadges: { first: true },
      weeklyStats: { "2024-W03": { completed: 3, focusSeconds: 4500 } },
    };
    saveToStorage(data);
    const loaded = loadFromStorage();
    expect(loaded.xp).toBe(50);
    expect(loaded.level).toBe(1);
    expect(loaded.streak).toBe(3);
    expect(loaded.lastCompletedDate).toBe("2024-01-15");
    expect(loaded.earnedBadges.first).toBe(true);
    expect(loaded.weeklyStats["2024-W03"].completed).toBe(3);
    expect(loaded.weeklyStats["2024-W03"].focusSeconds).toBe(4500);
  });

  test("loadFromStorage falls back to defaults for missing fields", () => {
    localStorage.setItem("pomodoroGamification", JSON.stringify({}));
    const loaded = loadFromStorage();
    expect(loaded.xp).toBe(0);
    expect(loaded.level).toBe(1);
    expect(loaded.streak).toBe(0);
    expect(loaded.lastCompletedDate).toBeNull();
    expect(loaded.earnedBadges).toEqual({});
    expect(loaded.weeklyStats).toEqual({});
  });

  test("loadFromStorage returns null for malformed JSON", () => {
    localStorage.setItem("pomodoroGamification", "{invalid json");
    expect(loadFromStorage()).toBeNull();
  });
});
