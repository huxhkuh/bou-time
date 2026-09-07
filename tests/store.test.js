import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { change, read } from "../src/store.js";
import { timerAction, fresh } from "../src/domain.js";
import { taskAction } from "../src/tasks.js";
test("IndexedDB serializes simultaneous tab-like mutations; one start and one save", async () => {
  await change((s) =>
    Object.assign(s, {
      ...fresh(),
      clients: [{ id: "c", name: "לקוח" }],
      projects: [
        {
          id: "p",
          name: "פרויקט",
          clientId: "c",
          archived: false,
          priceType: "hourly",
          price: 100,
        },
      ],
    }),
  );
  await Promise.all(
    Array.from({ length: 30 }, (_, i) =>
      change((s) =>
        timerAction(
          s,
          { type: "start", projectId: "p", expected: null, id: "t" + i },
          1000,
        ),
      ),
    ),
  );
  let s = await read();
  assert.equal(s.entries.length, 0);
  const id = s.timer.id;
  await Promise.all(
    Array.from({ length: 30 }, () =>
      change((s) => timerAction(s, { type: "stop", expected: id }, 4000)),
    ),
  );
  s = await read();
  assert.equal(s.entries.length, 1);
  assert.equal(s.entries[0].segments[0].end, 4000);
  assert.equal(s.timer, null);
});
test("failed transaction rolls back all writes", async () => {
  const before = await read();
  await assert.rejects(
    change((s) => {
      s.clients.push({ id: "bad" });
      throw Error("fail");
    }),
  );
  assert.deepEqual(await read(), before);
});

test("concurrent checklist updates preserve each task and unrelated project edits", async () => {
  await change((s) => { s.projects.push({ id: "checklist-project", name: "פרויקט" }); });
  await Promise.all(Array.from({ length: 12 }, (_, i) => change((s) => taskAction(s, { type: "add", id: `task-${i}`, projectId: "checklist-project", title: `משימה ${i}` }))));
  await Promise.all([
    change((s) => taskAction(s, { type: "complete", id: "task-0", projectId: "checklist-project", completed: true })),
    change((s) => taskAction(s, { type: "rename", id: "task-0", projectId: "checklist-project", title: "הושלם ונערך", expectedTitle: "משימה 0" })),
    change((s) => { s.projects.find((p) => p.id === "checklist-project").name = "שם חדש"; }),
  ]);
  const s = await read();
  assert.equal(s.tasks.filter((t) => t.projectId === "checklist-project").length, 12);
  assert.equal(s.tasks.find((t) => t.id === "task-0").completed, true);
  assert.equal(s.tasks.find((t) => t.id === "task-0").title, "הושלם ונערך");
  assert.equal(s.projects.find((p) => p.id === "checklist-project").name, "שם חדש");
});
