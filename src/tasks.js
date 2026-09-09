import { tr } from "./i18n.js";
const validTitle = (title) =>
  typeof title === "string" && title.trim().length > 0 && title.length <= 300;
const validId = (id) =>
  typeof id === "string" && id.length > 0 && id.length <= 100;

export function validateTasks(tasks, projects) {
  const projectIds = new Set(projects.map((p) => p.id));
  // Backups created before checklists have no tasks field.
  if (tasks === undefined) return [];
  if (
    !Array.isArray(tasks) ||
    tasks.length >= 100000 ||
    !tasks.every(
      (t) =>
        t &&
        validId(t.id) &&
        validTitle(t.title) &&
        typeof t.completed === "boolean" &&
        projectIds.has(t.projectId),
    ) ||
    new Set(tasks.map((t) => t.id)).size !== tasks.length
  )
    throw Error(tr("רשימת המשימות בגיבוי אינה תקינה או מכילה מזהים כפולים."));
  return tasks;
}

// Call inside the existing atomic IndexedDB transaction. Update only the task
// and field requested, so concurrent edits cannot overwrite project/timer data.
export function taskAction(state, action) {
  if (!state.projects.some((p) => p.id === action.projectId))
    throw Error(tr("הפרויקט אינו קיים. יש לרענן את הרשימה."));
  if (!["add", "rename", "complete", "delete"].includes(action.type))
    throw Error(tr("פעולת משימה לא מוכרת."));
  if (!validId(action.id)) throw Error(tr("מזהה המשימה אינו תקין."));
  if (
    (action.type === "add" || action.type === "rename") &&
    !validTitle(action.title)
  )
    throw Error(tr("יש להזין משימה באורך של עד 300 תווים."));
  if (action.type === "complete" && typeof action.completed !== "boolean")
    throw Error(tr("מצב המשימה אינו תקין."));
  state.tasks ??= [];
  const task = state.tasks.find((t) => t.id === action.id);
  if (action.type === "add") {
    if (task) {
      if (task.projectId !== action.projectId)
        throw Error(tr("מזהה המשימה כבר בשימוש."));
      return;
    }
    if (state.tasks.length >= 99999) throw Error(tr("רשימת המשימות מלאה."));
    state.tasks.push({
      id: action.id,
      projectId: action.projectId,
      title: action.title.trim(),
      completed: false,
    });
    return;
  }
  if (!task) {
    if (action.type === "delete") return;
    throw Error(tr("המשימה נמחקה בחלון אחר. יש לרענן את הרשימה."));
  }
  if (task.projectId !== action.projectId)
    throw Error(tr("המשימה שייכת לפרויקט אחר."));
  if (action.type === "rename") {
    if (task.title !== action.expectedTitle)
      throw Error(tr("המשימה נערכה בחלון אחר. בטל את העריכה ופתח אותה מחדש."));
    task.title = action.title.trim();
  }
  if (action.type === "complete") task.completed = action.completed;
  if (action.type === "delete")
    state.tasks = state.tasks.filter((t) => t.id !== task.id);
}
