import { tr } from "./i18n.js";
import { fresh } from "./domain.js";
export const demo =
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("demo") === "1";
const NAME = demo ? "bou-demo-time-v1" : "bou-personal-time-v1";
let pending;
const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(NAME) : null;
channel?.unref?.();
const listeners = new Set();
channel?.addEventListener("message", () => listeners.forEach((fn) => fn()));
export function openDB() {
  return (pending ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("state");
    req.onerror = () => {
      pending = null;
      reject(req.error);
    };
    req.onsuccess = () => resolve(req.result);
  }));
}
export async function read() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("state").objectStore("state").get("main");
    req.onsuccess = () => resolve(req.result || fresh());
    req.onerror = () => reject(req.error);
  });
}
export async function change(fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite", { durability: "strict" }),
      store = tx.objectStore("state");
    let next, failure;
    const req = store.get("main");
    req.onsuccess = () => {
      try {
        next = req.result || fresh();
        fn(next);
        next.revision++;
        store.put(next, "main");
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      channel?.postMessage("changed");
      listeners.forEach((fn) => fn());
      resolve(next);
    };
    tx.onabort = () =>
      reject(
        failure ||
          tx.error ||
          Error(tr("השמירה נכשלה. יש לבדוק מקום פנוי והרשאות דפדפן.")),
      );
    tx.onerror = () => {};
  });
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
