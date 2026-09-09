import React, { useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field } from "./ui.jsx";
import { deleteEntity, deletionPreview } from "./deletion.js";
import { hours } from "./domain.js";
import { tr } from "./i18n.js";

export default function DeleteEntity({ confirmation, state, mutate, close, notify }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const current = useMemo(() => deletionPreview(state, confirmation.kind, confirmation.id), [state, confirmation]);
  const changed = !current || current.token !== confirmation.token;
  const blocked = current?.hasTimer;
  return (
    <form className="delete-entity" onSubmit={async e => {
      e.preventDefault();
      if (inFlight.current || changed || blocked || name !== confirmation.name) return;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        await mutate(s => deleteEntity(s, confirmation, name));
        close();
        notify(confirmation.kind === "client" ? tr("הלקוח והנתונים המשויכים נמחקו.") : tr("הפרויקט והנתונים המשויכים נמחקו."));
      } catch (e) { setError(e.message); }
      finally { inFlight.current = false; setBusy(false); }
    }}>
      <p className="delete-name"><bdi>{confirmation.name}</bdi></p>
      {confirmation.kind === "client" && <p>{tr("הלקוח וכל הפרויקטים שלו, כולל פרויקטים בארכיון, יימחקו.")}</p>}
      <p>{tr("המחיקה כוללת את הנתונים הבאים ותסיר אותם גם מהדוחות:")}</p>
      <ul className="delete-counts">
        <li>{tr("פרויקטים: {0}", [confirmation.projects])}</li>
        <li>{tr("משימות: {0}", [confirmation.tasks])}</li>
        <li>{tr("רישומי זמן: {0}", [confirmation.entries])}</li>
        <li>{tr("שעות שמורות: {0}", [hours(confirmation.milliseconds)])}</li>
      </ul>
      <p className="note">{tr("הפעולה אינה ניתנת לביטול. אפשר לייצא גיבוי מלא דרך גיבוי והגדרות לפני המחיקה. ייבוא גיבוי ישן עשוי להחזיר פריטים שנמחקו.")}</p>
      {confirmation.kind === "project" && <p className="note">{tr("לשמירת היסטוריית העבודה, אפשר להעביר את הפרויקט לארכיון דרך עריכת הפרויקט.")}</p>}
      {blocked && <p className="error" role="alert">{tr("יש לעצור ולשמור את הטיימר המשויך לפני המחיקה, גם אם הוא מושהה.")}</p>}
      {changed && <p className="error" role="alert">{tr("הנתונים השתנו מאז פתיחת האישור. סגור את החלון ובדוק שוב מה יימחק.")}</p>}
      <Field label={tr("הקלד את השם לאישור המחיקה")}>
        <input required value={name} onChange={e => setName(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy || changed || blocked} />
      </Field>
      {error && <p className="error" role="alert">{error}</p>}
      <footer className="form-footer">
        <Button type="button" onClick={close}>{tr("ביטול")}</Button>
        <Button kind="danger" icon={Trash2} type="submit" disabled={busy || changed || blocked || name !== confirmation.name}>
          {busy ? tr("מוחק…") : tr("מחיקה לצמיתות")}
        </Button>
      </footer>
    </form>
  );
}
