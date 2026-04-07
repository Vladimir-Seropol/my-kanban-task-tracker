import { describe, expect, it } from "vitest";
import { moveTaskBetweenColumns } from "./moveTaskBetweenColumns";
import type { ColumnType } from "../types/types";

const baseColumns = (): ColumnType[] => [
  {
    id: "todo",
    title: "Созданные",
    tasks: [
      {
          id: "t1", text: "Task 1", columnId: "todo", order: 0,
          assignee: "",
          description: "",
          createdAt: "",
          priority: "низкий"
      },
      {
          id: "t2", text: "Task 2", columnId: "todo", order: 1,
          assignee: "",
          description: "",
          createdAt: "",
          priority: "низкий"
      },
    ],
  },
  {
    id: "inprogress",
    title: "В процессе",
    tasks: [{
        id: "p1", text: "Progress 1", columnId: "inprogress", order: 0,
        assignee: "",
        description: "",
        createdAt: "",
        priority: "низкий"
    }],
  },
  {
    id: "done",
    title: "Выполненные",
    tasks: [],
  },
];

describe("moveTaskBetweenColumns", () => {
  it("moves task from one column to another before target task", () => {
    const result = moveTaskBetweenColumns({
      columns: baseColumns(),
      activeId: "t1",
      overId: "p1",
    });

    expect(result.find((c) => c.id === "todo")?.tasks.map((t) => t.id)).toEqual(["t2"]);
    expect(result.find((c) => c.id === "inprogress")?.tasks.map((t) => t.id)).toEqual([
      "t1",
      "p1",
    ]);
  });

  it("moves task into empty column when overId is a column id", () => {
    const result = moveTaskBetweenColumns({
      columns: baseColumns(),
      activeId: "t2",
      overId: "done",
    });

    expect(result.find((c) => c.id === "todo")?.tasks.map((t) => t.id)).toEqual(["t1"]);
    expect(result.find((c) => c.id === "done")?.tasks.map((t) => t.id)).toEqual(["t2"]);
  });

  it("reorders tasks inside the same column", () => {
    const result = moveTaskBetweenColumns({
      columns: baseColumns(),
      activeId: "t2",
      overId: "t1",
    });

    expect(result.find((c) => c.id === "todo")?.tasks.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("moves task to the end of the same column when overId is the column id", () => {
    const result = moveTaskBetweenColumns({
      columns: baseColumns(),
      activeId: "t1",
      overId: "todo",
    });

    expect(result.find((c) => c.id === "todo")?.tasks.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("moves task one step down when hovering the next task", () => {
    const columns: ColumnType[] = [
      {
        id: "todo",
        title: "Созданные",
        tasks: [
          {
              id: "t0", text: "Task 0", columnId: "todo", order: 0,
              assignee: "",
              description: "",
              createdAt: "",
              priority: "низкий"
          },
          {
              id: "t1", text: "Task 1", columnId: "todo", order: 1,
              assignee: "",
              description: "",
              createdAt: "",
              priority: "низкий"
          },
          {
              id: "t2", text: "Task 2", columnId: "todo", order: 2,
              assignee: "",
              description: "",
              createdAt: "",
              priority: "низкий"
          },
        ],
      },
    ];

    const result = moveTaskBetweenColumns({
      columns,
      activeId: "t0",
      overId: "t2",
    });

    expect(result.find((c) => c.id === "todo")?.tasks.map((t) => t.id)).toEqual(["t1", "t0", "t2"]);
  });
});