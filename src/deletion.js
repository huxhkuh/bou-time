import { tr } from "./i18n.js";
import { duration } from "./domain.js";

// The confirmation describes a snapshot of the affected records only. Compare
// it again inside change() so another window cannot add unseen work to a delete.
export function deletionPreview(state, kind, id) {
  if (!["client", "project"].includes(kind))
    throw Error(tr("סוג המחיקה אינו תקין."));
  const item = state[kind === "client" ? "clients" : "projects"].find(x => x.id === id);
  if (!item) return null;
  const projects = state.projects.filter(p => kind === "client" ? p.clientId === id : p.id === id);
  const ids = new Set(projects.map(p => p.id));
  const entries = state.entries.filter(e => ids.has(e.projectId));
  const tasks = (state.tasks || []).filter(t => ids.has(t.projectId));
  const ordered = records => [...records].sort((a, b) => a.id.localeCompare(b.id));
  return {
    kind, id, name: item.name,
    projects: projects.length, entries: entries.length, tasks: tasks.length,
    milliseconds: entries.reduce((sum, e) => sum + duration(e.segments), 0),
    hasTimer: !!state.timer && ids.has(state.timer.projectId),
    token: JSON.stringify([item, ordered(projects), ordered(entries), ordered(tasks)]),
  };
}

export function deleteEntity(state, confirmation, typedName) {
  const current = deletionPreview(state, confirmation.kind, confirmation.id);
  if (!current) return false; // Repeated clicks cannot affect another record.
  if (current.hasTimer)
    throw Error(tr("יש לעצור ולשמור את הטיימר המשויך לפני המחיקה, גם אם הוא מושהה."));
  if (current.token !== confirmation.token)
    throw Error(tr("הנתונים השתנו מאז פתיחת האישור. סגור את החלון ובדוק שוב מה יימחק."));
  if (typedName !== current.name)
    throw Error(tr("יש להקליד את השם בדיוק כפי שהוא מופיע באישור."));
  const ids = new Set(state.projects.filter(p => confirmation.kind === "client" ? p.clientId === confirmation.id : p.id === confirmation.id).map(p => p.id));
  state.entries = state.entries.filter(e => !ids.has(e.projectId));
  state.tasks = (state.tasks || []).filter(t => !ids.has(t.projectId));
  state.projects = state.projects.filter(p => !ids.has(p.id));
  if (confirmation.kind === "client")
    state.clients = state.clients.filter(c => c.id !== confirmation.id);
  return true;
}
