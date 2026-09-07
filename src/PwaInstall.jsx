import React, { useState, useEffect } from "react";
import { MonitorDown } from "lucide-react";
import { Button } from "./ui.jsx";
let pending = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pending = event;
  window.dispatchEvent(new Event("bou-install-ready"));
});
export default function PwaInstall() {
  const [ready, setReady] = useState(!!pending),
    [message, setMessage] = useState("");
  useEffect(() => {
    const fn = () => setReady(!!pending);
    window.addEventListener("bou-install-ready", fn);
    return () => window.removeEventListener("bou-install-ready", fn);
  }, []);
  return (
    <section className="surface">
      <MonitorDown className="section-icon" />
      <h2>בואו, גם בלי לשונית</h2>
      <p>
        בגרסת ההפעלה ניתן להתקין דרך תפריט Chrome או Edge: התקנת אפליקציה. אחרי
        פתיחה ראשונה, הקבצים נשמרים לשימוש גם בלי רשת. הנתונים נשארים באותו
        דפדפן.
      </p>
      {ready && (
        <Button
          icon={MonitorDown}
          onClick={async () => {
            try {
              await pending.prompt();
              const choice = await pending.userChoice;
              pending = null;
              setReady(false);
              setMessage(
                choice.outcome === "accepted"
                  ? "בקשת ההתקנה אושרה."
                  : "ההתקנה בוטלה. אפשר להמשיך לעבוד בדפדפן.",
              );
            } catch {
              setMessage("אפשר להתקין דרך תפריט הדפדפן.");
            }
          }}
        >
          התקנת בואו
        </Button>
      )}
      {message && <p role="status">{message}</p>}
      <p className="note">
        במצב פיתוח אין שמירה לא מקוונת. התקנה בדפדפן המובנה או בדפדפנים שאינם
        תומכים ב־PWA עשויה לא להיות זמינה.
      </p>
    </section>
  );
}
