import PwaInstall from "./PwaInstall.jsx";
import DesktopUpdates from "./DesktopUpdates.jsx";
import React, { useState } from "react";
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  Keyboard,
} from "lucide-react";
import { Button } from "./ui.jsx";
import { download } from "./Reports.jsx";
import {
  validateBackup,
  mergeBackup,
  timerSegments,
  dayKey,
} from "./domain.js";
import { read } from "./store.js";
export default function Settings({ state, mutate, notify }) {
  const [pending, setPending] = useState(null),
    [busy, setBusy] = useState(false),
    [persistent, setPersistent] = useState(null);
  const backup = async () => {
    try {
      const s = await read();
      if (s.timer)
        s.timer = {
          ...s.timer,
          segments: timerSegments(s.timer, Date.now()).filter(
            (x) => x.end > x.start,
          ),
          runningSince: null,
        };
      download(
        `bou-backup-${dayKey(Date.now())}.json`,
        JSON.stringify(s, null, 2),
        "application/json",
      );
      notify("הגיבוי המלא הוכן להורדה. שמור אותו במקום בטוח.");
    } catch (e) {
      notify(e.message, true);
    }
  };
  return (
    <div className="settings-grid">
      {window.bouDesktop?.getUpdateStatus && <DesktopUpdates notify={notify} />}
      <section className="surface">
        <Database className="section-icon" />
        <h2>הזמן שלך. הנתונים שלך.</h2>
        {window.bouDesktop ? (
          <p>
            הנתונים נשמרים מקומית באפליקציית Windows במחשב הזה, בתיקיית
            %APPDATA%\BouTime. הם אינם נשלחים לשרת. להעברת הנתונים מהדפדפן, ייצא
            שם גיבוי מלא וייבא אותו כאן. גיבוי ושחזור אינם מסנכרנים בין הגרסאות.
          </p>
        ) : (
          <p>
            הנתונים נשמרים במסד IndexedDB מקומי, באותו דפדפן ומכשיר ובאותה
            כתובת. הם אינם נשלחים לשרת. מחיקת נתוני האתר או מעבר לדפדפן אחר
            עלולים להסיר את הגישה אליהם.
          </p>
        )}
        <div className="data-counts">
          <span>{state.clients.length} לקוחות</span>
          <span>{state.projects.length} פרויקטים</span>
          <span>{state.entries.length} רישומים</span>
        </div>
        {!window.bouDesktop && (
          <Button
            icon={ShieldCheck}
            onClick={async () => {
              try {
                const ok = await navigator.storage?.persist?.();
                setPersistent(
                  ok
                    ? "הדפדפן אישר שמירה מתמשכת. עדיין מומלץ לגבות."
                    : "הדפדפן לא אישר שמירה מתמשכת. הנתונים נשמרים, אך חשוב לגבות.",
                );
              } catch {
                setPersistent("לא ניתן לבקש שמירה מתמשכת בדפדפן זה.");
              }
            }}
          >
            בקשת שמירה מתמשכת
          </Button>
        )}
        {persistent && (
          <p role="status" className="note">
            {persistent}
          </p>
        )}
      </section>
      <section className="surface">
        <Download className="section-icon" />
        <h2>גיבוי ושחזור</h2>
        <p>
          גיבוי JSON כולל לקוחות, פרויקטים, משימות, תמחור ורישומים. טיימר פעיל מגובה
          במצב מושהה עם הזמן עד רגע הייצוא.
        </p>
        <Button kind="primary" icon={Download} onClick={backup}>
          ייצוא גיבוי מלא
        </Button>
        <hr />
        <label className="field">
          <span>בחירת קובץ גיבוי לשחזור</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 20 * 1024 * 1024)
                  throw Error("גודל הגיבוי המרבי הוא 20MB.");
                const s = validateBackup(JSON.parse(await file.text()));
                setPending(s);
              } catch (err) {
                notify(
                  err instanceof SyntaxError
                    ? "הקובץ אינו JSON תקין."
                    : err.message,
                  true,
                );
                setPending(null);
              }
            }}
          />
        </label>
        {pending && (
          <div className="import-preview">
            <h3>הגיבוי תקין ומוכן לייבוא</h3>
            <p>
              {pending.clients.length} לקוחות · {pending.projects.length}{" "}
              פרויקטים · {pending.entries.length} רישומים · {pending.tasks.length} משימות
            </p>
            <p className="note">
              פריטים עם מזהה קיים יישמרו כפי שהם. אין דריסה ואין כפילויות. טיימר
              מגיבוי ייובא מושהה רק אם אין טיימר מקומי או רישום תואם; זמן פתוח
              מאז יצירת הגיבוי אינו מתווסף.
            </p>
            <Button
              icon={Upload}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await mutate((s) => mergeBackup(s, pending));
                  setPending(null);
                  notify("הגיבוי מוזג בהצלחה. פריטים קיימים לא שוכפלו.");
                } catch (e) {
                  notify(e.message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              ייבוא ומיזוג
            </Button>
            <Button onClick={() => setPending(null)}>ביטול</Button>
          </div>
        )}
      </section>
      <section className="surface">
        <Keyboard className="section-icon" />
        <h2>בקצב שלך</h2>
        <p>אזור זמן: ישראל · תחילת השבוע: יום ראשון · מטבע: ₪.</p>
        <p>
          <kbd>Alt</kbd> + <kbd>N</kbd> הוספת רישום ידני
        </p>
        <p>
          <kbd>Alt</kbd> + <kbd>1</kbd> חזרה להיום
        </p>
        <p>
          <kbd>Esc</kbd> סגירת טופס
        </p>
        <p className="note">
          קיצורים פועלים מחוץ לשדות הקלדה. כל הכפתורים נגישים גם באמצעות Tab
          ו־Enter.
        </p>
      </section>
      {!window.bouDesktop && <PwaInstall />}
    </div>
  );
}
