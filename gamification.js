export const XP_PER_POMODORO = 10;
export const XP_PER_LEVEL = 100;

export const BADGES = [
  { id: "first", label: "はじめの一歩", desc: "初めてのポモドーロ完了", emoji: "🌱" },
  { id: "streak3", label: "3日連続", desc: "3日連続でポモドーロを完了", emoji: "🔥" },
  { id: "streak7", label: "1週間継続", desc: "7日連続でポモドーロを完了", emoji: "⚡" },
  { id: "ten", label: "10回達成", desc: "累計10回のポモドーロを完了", emoji: "🏆" },
  { id: "weekTen", label: "週10回", desc: "今週10回のポモドーロを完了", emoji: "📅" },
  { id: "centurion", label: "センチュリオン", desc: "累計100回のポモドーロを完了", emoji: "💯" },
];

export function calculateLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpInCurrentLevel(xp) {
  return xp % XP_PER_LEVEL;
}

export function getDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function updateStreak(streak, lastCompletedDate, today = getDateString()) {
  if (!lastCompletedDate) {
    return { streak: 1, lastCompletedDate: today };
  }
  if (lastCompletedDate === today) {
    return { streak, lastCompletedDate };
  }
  const last = new Date(lastCompletedDate);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate - last) / 86400000);
  if (diffDays === 1) {
    return { streak: streak + 1, lastCompletedDate: today };
  }
  return { streak: 1, lastCompletedDate: today };
}

export function updateWeeklyStats(weeklyStats, focusSeconds, today = new Date()) {
  const weekKey = getWeekKey(today);
  const existing = weeklyStats[weekKey] || { completed: 0, focusSeconds: 0 };
  return {
    ...weeklyStats,
    [weekKey]: {
      completed: existing.completed + 1,
      focusSeconds: existing.focusSeconds + focusSeconds,
    },
  };
}

export function checkBadges(earnedBadges, totalCompleted, streak, weeklyStats, today = new Date()) {
  const updated = { ...earnedBadges };
  const weekKey = getWeekKey(today);
  const weekCompleted = (weeklyStats[weekKey] || {}).completed || 0;
  if (totalCompleted >= 1) updated.first = true;
  if (streak >= 3) updated.streak3 = true;
  if (streak >= 7) updated.streak7 = true;
  if (totalCompleted >= 10) updated.ten = true;
  if (weekCompleted >= 10) updated.weekTen = true;
  if (totalCompleted >= 100) updated.centurion = true;
  return updated;
}

const STORAGE_KEY = "pomodoroGamification";

export function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {
    return;
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      xp: Number(data.xp) || 0,
      level: Number(data.level) || 1,
      streak: Number(data.streak) || 0,
      lastCompletedDate: typeof data.lastCompletedDate === "string" ? data.lastCompletedDate : null,
      earnedBadges: data.earnedBadges && typeof data.earnedBadges === "object" ? data.earnedBadges : {},
      weeklyStats: data.weeklyStats && typeof data.weeklyStats === "object" ? data.weeklyStats : {},
    };
  } catch (_) {
    return null;
  }
}
