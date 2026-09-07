import React, { useEffect, useState } from "react";
import { Download, RefreshCw, MonitorCheck } from "lucide-react";
import { Button } from "./ui.jsx";
import { read } from "./store.js";

const labels = {
  idle: "אפשר לבדוק אם יצאה גרסה חדשה.",
  checking: "בודקים אם יש עדכון…",
  current: "אתה משתמש בגרסה העדכנית.",
  available: "גרסה חדשה מחכה לך.",
  downloading: "העדכון יורד. אפשר להמשיך לעבוד בינתיים.",
  cancelling: "מבטלים את ההורדה…",
  cancelled: "ההורדה בוטלה. אפשר לבדוק ולהוריד שוב כשתרצה.",
  ready: "העדכון מוכן להתקנה. מתי שנוח לך.",
  installing: "מתקינים את העדכון ופותחים מחדש…",
};
export default function DesktopUpdates({ notify }) {
  const [status, setStatus] = useState(null);
  const [requesting, setRequesting] = useState(false);
  useEffect(() => {
    let active = true;
    const update = (s) => active && setStatus((old) => !old || s.revision >= old.revision ? s : old);
    const unsubscribe = window.bouDesktop.onUpdateStatus(update);
    window.bouDesktop.getUpdateStatus().then(update).catch(() => notify("לא ניתן לקרוא את מצב העדכון.", true));
    return () => { active = false; unsubscribe(); };
  }, [notify]);
  const action = async (name) => {
    setRequesting(true);
    try {
      // Wait for already queued data writes before requesting a restart.
      if (name === "install") await read();
      const next = await window.bouDesktop.updateAction(name);
      setStatus((old) => !old || next.revision >= old.revision ? next : old);
    } catch { notify("לא ניתן לבצע את הפעולה כרגע. נסה שוב.", true); }
    finally { setRequesting(false); }
  };
  const phase = status?.phase;
  return <section className="surface desktop-updates" aria-labelledby="updates-title">
    <MonitorCheck className="section-icon" />
    <div className="update-heading"><h2 id="updates-title">תמורה מתחדשת</h2>
      {status && <span className="version-pill">גרסה <bdi>{status.currentVersion}</bdi></span>}
    </div>
    <p>עדכונים ישירות לאפליקציה, בלי להוריד ולהפעיל מתקין בכל פעם.</p>
    <div className={`update-state ${phase === "error" ? "update-error" : ""}`} role="status" aria-live="polite">
      <strong>{status ? status.message || status.reason || labels[phase] : "טוענים את מצב העדכון…"}</strong>
      {status?.version && <span>גרסה זמינה: <bdi>{status.version}</bdi></span>}
    </div>
    {phase === "downloading" && <div className="update-progress">
      <progress aria-label="התקדמות הורדת העדכון" max="100" value={status.percent || 0} />
      <span>{Math.floor(status.percent || 0)}%</span>
    </div>}
    <div className="update-actions">
      {["idle", "current", "available", "cancelled", "error"].includes(phase) &&
        <Button icon={RefreshCw} disabled={requesting} onClick={() => action("check")}>בדיקת עדכונים</Button>}
      {phase === "available" && <Button kind="primary" icon={Download} disabled={requesting} onClick={() => action("download")}>הורדת העדכון</Button>}
      {phase === "downloading" && <Button onClick={() => action("cancel")}>ביטול הורדה</Button>}
      {phase === "ready" && <Button kind="primary" icon={RefreshCw} disabled={requesting} onClick={() => action("install")}>התקנה והפעלה מחדש</Button>}
    </div>
    {phase !== "unavailable" && <p className="note">ההורדה משתמשת בחלקים מהגרסה הקיימת כשאפשר; לעיתים תידרש הורדה מלאה. ההתקנה מתחילה רק באישור שלך. הנתונים נשמרים במחשב, וטיימר פעיל ממשיך גם בזמן ההפעלה מחדש.</p>}
  </section>;
}
