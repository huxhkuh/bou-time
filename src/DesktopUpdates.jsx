import { tr } from "./i18n.js";
import React, { useEffect, useState } from "react";
import { Download, RefreshCw, MonitorCheck } from "lucide-react";
import { Button } from "./ui.jsx";
import { read } from "./store.js";

const getLabels = () => ({
  idle: tr("אפשר לבדוק אם יצאה גרסה חדשה."),
  checking: tr("בודקים אם יש עדכון\u2026"),
  current: tr("אתה משתמש בגרסה העדכנית."),
  available: tr("גרסה חדשה מחכה לך."),
  downloading: tr("העדכון יורד. אפשר להמשיך לעבוד בינתיים."),
  cancelling: tr("מבטלים את ההורדה\u2026"),
  cancelled: tr("ההורדה בוטלה. אפשר לבדוק ולהוריד שוב כשתרצה."),
  ready: tr("העדכון מוכן להתקנה. מתי שנוח לך."),
  installing: tr("מתקינים את העדכון ופותחים מחדש\u2026"),
  verifying: tr("בודקים שוב את תקינות קובץ העדכון לפני ההתקנה\u2026"),
});
export default function DesktopUpdates({ notify }) {
  const [status, setStatus] = useState(null);
  const [requesting, setRequesting] = useState(false);
  useEffect(() => {
    let active = true;
    const update = (s) =>
      active &&
      setStatus((old) => (!old || s.revision >= old.revision ? s : old));
    const unsubscribe = window.bouDesktop.onUpdateStatus(update);
    window.bouDesktop
      .getUpdateStatus()
      .then(update)
      .catch(() => notify(tr("לא ניתן לקרוא את מצב העדכון."), true));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [notify]);
  const action = async (name) => {
    setRequesting(true);
    try {
      // Wait for already queued data writes before requesting a restart.
      if (name === "install") await read();
      const next = await window.bouDesktop.updateAction(name);
      setStatus((old) => (!old || next.revision >= old.revision ? next : old));
    } catch {
      notify(tr("לא ניתן לבצע את הפעולה כרגע. נסה שוב."), true);
    } finally {
      setRequesting(false);
    }
  };
  const phase = status?.phase;
  return (
    <section
      className="surface desktop-updates"
      aria-labelledby="updates-title"
    >
      <MonitorCheck className="section-icon" />
      <div className="update-heading">
        <h2 id="updates-title">{tr("תמורה מתחדשת")}</h2>
        {status && (
          <span className="version-pill">
            {tr("גרסה ")}
            <bdi>{status.currentVersion}</bdi>
          </span>
        )}
      </div>
      <p>{tr("עדכונים ישירות לאפליקציה, בלי להוריד ולהפעיל מתקין בכל פעם.")}</p>
      <div
        className={`update-state ${phase === "error" ? "update-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        <strong>
          {status
            ? tr(status.message || status.reason || getLabels()[phase])
            : tr("טוענים את מצב העדכון\u2026")}
        </strong>
        {status?.version && (
          <span>
            {tr("גרסה זמינה: ")}
            <bdi>{status.version}</bdi>
          </span>
        )}
      </div>
      {phase === "downloading" && (
        <div className="update-progress">
          <progress
            aria-label={tr("התקדמות הורדת העדכון")}
            max="100"
            value={status.percent || 0}
          />
          <span>{Math.floor(status.percent || 0)}%</span>
        </div>
      )}
      <div className="update-actions">
        {["idle", "current", "available", "cancelled", "error"].includes(
          phase,
        ) && (
          <Button
            icon={RefreshCw}
            disabled={requesting}
            onClick={() => action("check")}
          >
            {tr("בדיקת עדכונים")}
          </Button>
        )}
        {phase === "available" && (
          <Button
            kind="primary"
            icon={Download}
            disabled={requesting}
            onClick={() => action("download")}
          >
            {tr("הורדת העדכון")}
          </Button>
        )}
        {phase === "downloading" && (
          <Button onClick={() => action("cancel")}>{tr("ביטול הורדה")}</Button>
        )}
        {phase === "ready" && (
          <Button
            kind="primary"
            icon={RefreshCw}
            disabled={requesting}
            onClick={() => action("install")}
          >
            {tr("התקנה והפעלה מחדש")}
          </Button>
        )}
      </div>
      {phase !== "unavailable" && (
        <p className="note">
          {tr(
            "ההורדה משתמשת בחלקים מהגרסה הקיימת כשאפשר; לעיתים תידרש הורדה מלאה. ההתקנה מתחילה רק באישור שלך. הנתונים נשמרים במחשב, וטיימר פעיל ממשיך גם בזמן ההפעלה מחדש.",
          )}
        </p>
      )}
    </section>
  );
}
