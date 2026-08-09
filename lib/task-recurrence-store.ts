export interface TaskRecurrence {
  repeat_pattern: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeat_until?: string;
}

const STORAGE_KEY = "admin_task_recurrence_map";

export function getStoredRecurrences(): Record<string, TaskRecurrence> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTaskRecurrence(taskId: string, recurrence: TaskRecurrence) {
  if (typeof window === "undefined" || !taskId) return;
  try {
    const map = getStoredRecurrences();
    map[taskId] = recurrence;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save task recurrence", e);
  }
}

export function getTaskRecurrence(taskId: string): TaskRecurrence | null {
  const map = getStoredRecurrences();
  return map[taskId] || null;
}
