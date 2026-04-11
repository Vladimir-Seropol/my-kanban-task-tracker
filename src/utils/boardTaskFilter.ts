import type { Task } from "../types/types";
import { normalizeTag, parseTagsFromCommaInput } from "./taskTags";

export type DueFilter = "all" | "overdue" | "today" | "this_week" | "no_due";

export type BoardFiltersValue = {
  q: string;
  assignee: string;
  tags: string;
  priority: "all" | Task["priority"];
  due: DueFilter;
};

const normalize = (s: string) => s.trim().toLowerCase();

export function isDateToday(d: Date): boolean {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime() === t.getTime();
}

/** Понедельник–воскресенье текущей календарной недели (локальное время). */
export function isDateInCurrentWeek(d: Date): boolean {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

export function taskMatchesBoardFilters(task: Task, filters: BoardFiltersValue): boolean {
  const q = normalize(filters.q);
  if (q) {
    const hay = [
      task.text,
      task.description,
      task.source ?? "",
      task.epic ?? "",
      (task.tags ?? []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const assignee = normalize(filters.assignee);
  if (assignee) {
    if (!normalize(task.assignee).includes(assignee)) return false;
  }

  if (filters.priority !== "all") {
    if (task.priority !== filters.priority) return false;
  }

  const wantTags = parseTagsFromCommaInput(filters.tags);
  if (wantTags.length > 0) {
    const got = (task.tags ?? []).map((t) => normalizeTag(t)).filter(Boolean);
    if (!wantTags.every((needle) => got.some((tag) => tag.includes(needle)))) return false;
  }

  if (filters.due !== "all") {
    const dueRaw = task.dueDate;
    if (filters.due === "no_due") return !dueRaw;
    if (!dueRaw) return false;
    const due = new Date(dueRaw);
    if (Number.isNaN(due.getTime())) return false;

    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const due0 = new Date(due);
    due0.setHours(0, 0, 0, 0);

    if (filters.due === "overdue") return due0.getTime() < today0.getTime();
    if (filters.due === "today") return isDateToday(due0);
    if (filters.due === "this_week") return isDateInCurrentWeek(due0);
  }

  return true;
}
