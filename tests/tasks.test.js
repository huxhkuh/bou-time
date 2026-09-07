import test from "node:test";
import assert from "node:assert/strict";
import { fresh, validateBackup, mergeBackup } from "../src/domain.js";
import { taskAction } from "../src/tasks.js";

const fixture = () => ({
  ...fresh(), clients: [{ id: "c", name: "לקוח" }],
  projects: ["p", "q"].map((id) => ({ id, name: id, clientId: "c", color: "#aabbcc", description: "", archived: false, priceType: "none", price: null, goal: null })),
});
const add = (s, id = "t", projectId = "p") => taskAction(s, { type: "add", id, projectId, title: "  אפיון ראשוני  " });

test("checklists are per project; duplicate actions are idempotent and never change time/pricing", () => {
  const s = fixture(), before = structuredClone(s);
  add(s); add(s); add(s, "other", "q");
  assert.equal(s.tasks.length, 2);
  assert.equal(s.tasks[0].title, "אפיון ראשוני");
  for (let i = 0; i < 2; i++) taskAction(s, { type: "complete", id: "t", projectId: "p", completed: true });
  assert.equal(s.tasks[0].completed, true);
  assert.equal(s.tasks[1].completed, false);
  taskAction(s, { type: "complete", id: "t", projectId: "p", completed: false });
  assert.equal(s.tasks[0].completed, false);
  assert.deepEqual(s.projects, before.projects);
  assert.deepEqual(s.entries, before.entries);
  assert.equal(s.timer, before.timer);
  assert.throws(() => taskAction(s, { type: "delete", id: "t", projectId: "q" }));
});

test("rename rejects stale edits, preserves completion, and cannot resurrect a deleted task", () => {
  const s = fixture(); add(s);
  taskAction(s, { type: "complete", id: "t", projectId: "p", completed: true });
  taskAction(s, { type: "rename", id: "t", projectId: "p", title: "מסמך אפיון", expectedTitle: "אפיון ראשוני" });
  assert.equal(s.tasks[0].completed, true);
  assert.throws(() => taskAction(s, { type: "rename", id: "t", projectId: "p", title: "שינוי ישן", expectedTitle: "אפיון ראשוני" }));
  for (let i = 0; i < 2; i++) taskAction(s, { type: "delete", id: "t", projectId: "p" });
  assert.equal(s.tasks.length, 0);
  assert.throws(() => taskAction(s, { type: "rename", id: "t", projectId: "p", title: "שחזור", expectedTitle: "מסמך אפיון" }));
});

test("old data and backups work; task backups restore and merge without duplicates or overwriting local edits", () => {
  const legacy = fixture(); delete legacy.tasks;
  assert.deepEqual(validateBackup(legacy).tasks, []);
  add(legacy); legacy.tasks[0].completed = true;
  const backup = JSON.parse(JSON.stringify(legacy));
  const target = fixture();
  mergeBackup(target, backup);
  assert.deepEqual(target.tasks, backup.tasks);
  target.tasks[0].title = "עריכה מקומית";
  mergeBackup(target, backup);
  assert.equal(target.tasks.length, 1);
  assert.equal(target.tasks[0].title, "עריכה מקומית");
  assert.equal(target.tasks[0].completed, true);
  delete backup.tasks;
  mergeBackup(target, backup);
  assert.equal(target.tasks.length, 1);
});

test("invalid checklist backups and task inputs are rejected without partial restore", () => {
  const backup = fixture(); add(backup);
  const good = backup.tasks[0];
  for (const tasks of [null, {}, [null], [good, good], [{ ...good, title: " " }], [{ ...good, title: "x".repeat(301) }], [{ ...good, completed: "true" }], [{ ...good, projectId: "missing" }]]) {
    const target = fixture();
    assert.throws(() => mergeBackup(target, { ...backup, tasks }));
    assert.deepEqual(target, fixture());
  }
  for (const title of ["", "  ", "x".repeat(301), null])
    assert.throws(() => taskAction(fixture(), { type: "add", id: "t", projectId: "p", title }));
});
