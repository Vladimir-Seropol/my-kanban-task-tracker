// generate-db.js
import fs from "fs";

const columns = [
  { id: "todo", title: "Созданные" },
  { id: "in-progress", title: "В работе" },
  { id: "done", title: "Готово" },
];

const users = ["Иван", "Анна", "Петр", "Мария", "Алексей"];
const priorities = ["низкий", "средний", "высокий"];
const types = ["task", "bug", "story"];
const epics = ["Auth", "Payments", "UI", "Dashboard"];
const tagsPool = ["frontend", "backend", "urgent", "refactor", "api", "ux"];

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const randomTags = () =>
  Array.from(new Set(Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => random(tagsPool))));

const getColumnByIndex = (i) => {
  if (i < 30) return "todo";
  if (i < 70) return "in-progress";
  return "done";
};

const tasks = Array.from({ length: 100 }, (_, i) => {
  const columnId = getColumnByIndex(i);
  const createdAt = randomDate(-Math.floor(Math.random() * 10));
  const dueDate = Math.random() > 0.5 ? randomDate(Math.floor(Math.random() * 10)) : undefined;

  return {
    id: `TASK-${i}`,
    text: ` ${i} с длинным названием для проверки UI интерфейса и обрезки текста`,

    columnId: "todo",
    order: i,

    type: random(types),
    priority: random(priorities),

    assignee: random(users),
    reporter: random(users),

    source: Math.random() > 0.3 ? random(["Email", "Slack", "Jira", "Сайт"]) : undefined,

    description:
      "Это описание задачи. ".repeat(Math.floor(Math.random() * 5) + 1),

    createdAt,
    dueDate,

    epic: random(epics),
    tags: randomTags(),
  };
});

const db = {
  columns,
  tasks,
};

fs.writeFileSync("db.json", JSON.stringify(db, null, 2));

console.log("🔥 Jira-like db.json создан!");