import React, { useRef, useState } from "react";
import { ListChecks, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "./ui.jsx";
import { uid } from "./domain.js";
import { taskAction } from "./tasks.js";
import "./checklist.css";

export default function ProjectChecklist({ project, tasks, mutate }) {
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(null);
  const pending = useRef(false);
  const input = useRef(null);
  const isCompleted = (task) => savingCompletion?.id === task.id ? savingCompletion.completed : task.completed;
  const completed = tasks.filter(isCompleted).length;
  async function act(action, done) {
    if (pending.current) return;
    pending.current = true;
    if (action.type === "complete") setSavingCompletion(action);
    setBusy(true);
    setError("");
    try {
      await mutate((s) => taskAction(s, { ...action, projectId: project.id }));
      done?.();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
      setSavingCompletion(null);
    }
  }
  return (
    <details className="project-checklist">
      <summary aria-label={`משימות בפרויקט ${project.name}`}>
        <ListChecks size={18} aria-hidden="true" />
        <span>משימות</span>
        <span className="checklist-count" aria-live="polite">
          {tasks.length ? `${completed} מתוך ${tasks.length} הושלמו` : "מה הצעד הבא?"}
        </span>
      </summary>
      {tasks.length > 0 && <progress value={completed} max={tasks.length} aria-label={`השלמת משימות בפרויקט ${project.name}`} />}
      <div className="checklist-body">
        {!tasks.length && <p className="checklist-empty">פרק את הפרויקט לצעדים קטנים. הוסף משימה ראשונה וסמן כל התקדמות.</p>}
        <ul className="checklist-items">
          {tasks.map((task) => (
            <li key={task.id} className={isCompleted(task) ? "is-complete" : ""}>
              {editing?.id === task.id ? (
                <form className="checklist-edit" onSubmit={(e) => {
                  e.preventDefault();
                  act({ type: "rename", id: task.id, title: editing.title, expectedTitle: editing.original }, () => setEditing(null));
                }}>
                  <input autoFocus required readOnly={busy} maxLength={300} aria-label="עריכת שם המשימה" dir="auto"
                    value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setEditing(null); } }} />
                  <button className="icon-button" type="submit" disabled={busy} aria-label="שמירת המשימה"><Check size={17} /></button>
                  <button className="icon-button" type="button" disabled={busy} aria-label="ביטול עריכת המשימה" onClick={() => setEditing(null)}><X size={17} /></button>
                </form>
              ) : (
                <div className="checklist-row">
                  <label>
                    <input type="checkbox" checked={isCompleted(task)} disabled={busy}
                      onChange={(e) => act({ type: "complete", id: task.id, completed: e.target.checked })} />
                    <span><bdi>{task.title}</bdi></span>
                  </label>
                  <button className="icon-button" type="button" disabled={busy} aria-label={`עריכת משימה ${task.title}`}
                    onClick={() => { setEditing({ id: task.id, title: task.title, original: task.title }); setRemoving(null); setError(""); }}><Pencil size={15} /></button>
                  <button className="icon-button" type="button" disabled={busy} aria-label={`מחיקת משימה ${task.title}`}
                    onClick={() => { setRemoving(task.id); setError(""); }}><Trash2 size={15} /></button>
                </div>
              )}
              {removing === task.id && (
                <div className="checklist-confirm" role="group" aria-label={`אישור מחיקת ${task.title}`}>
                  <span>למחוק את המשימה?</span>
                  <button type="button" disabled={busy} onClick={() => act({ type: "delete", id: task.id }, () => { setRemoving(null); input.current?.focus(); })}>כן, למחוק</button>
                  <button type="button" disabled={busy} onClick={() => setRemoving(null)}>ביטול</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <form className="checklist-add" onSubmit={(e) => {
          e.preventDefault();
          act({ type: "add", id: uid(), title }, () => { setTitle(""); input.current?.focus(); });
        }}>
          <input ref={input} value={title} readOnly={busy} onChange={(e) => setTitle(e.target.value)} required maxLength={300}
            aria-label={`משימה חדשה בפרויקט ${project.name}`} placeholder="משימה חדשה…" dir="auto" />
          <Button type="submit" icon={Plus} disabled={busy || !title.trim()} aria-label={`הוספת משימה לפרויקט ${project.name}`} />
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </details>
  );
}
