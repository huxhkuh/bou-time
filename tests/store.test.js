import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { change, read } from "../src/store.js";
import { timerAction, fresh } from "../src/domain.js";
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
