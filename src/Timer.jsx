import React, { useState, useRef } from "react";
import { Play, Pause, Square, ArrowUpLeft, Clock3 } from "lucide-react";
import { Button, ProjectOptions, Dot } from "./ui.jsx";
import { elapsed, hms, HOUR, timerAction } from "./domain.js";
export default function Timer({
  state,
  now,
  mutate,
  notify,
  newProject,
  editEntry,
}) {
  const intent = useRef(null);
  const [project, setProject] = useState(""),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false);
  const t = state.timer,
    p = state.projects.find((p) => p.id === t?.projectId);
  const selected = state.projects.some((p) => p.id === project && !p.archived)
    ? project
    : state.projects.find((p) => !p.archived)?.id || "";
  const command = (type) => ({
    type,
    projectId: selected,
    description,
    expected: t?.id ?? null,
  });
  const arm = (type) => () => {
    intent.current = command(type);
  };
  const action = async (type, event) => {
    const cmd =
      event?.detail > 0 && intent.current ? intent.current : command(type);
    intent.current = null;
    type = cmd.type;
    setBusy(true);
    try {
      const next = await mutate((s) => timerAction(s, cmd));
      if (type === "stop") {
        notify("הזמן נשמר. עבודה טובה.");
        if (t && now - t.createdAt > 12 * HOUR) {
          const e = next.entries.find((e) => e.id === t.id);
          if (e) editEntry(e);
        }
      }
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="timer" aria-label="מדידת עבודה">
      <div className="timer-info">
        <div className="timer-status">
          <span
            className={`status-light ${t?.runningSince !== null && t ? "live" : ""}`}
          />
          {t
            ? t.runningSince === null
              ? "המדידה מושהית"
              : "עכשיו בעבודה"
            : "מקום להתרכז"}
        </div>
        {t ? (
          <>
            <h2>
              <Dot color={p?.color} />
              <bdi>{p?.name}</bdi>
            </h2>
            <p className="timer-client">
              {state.clients.find((c) => c.id === p?.clientId)?.name}
            </p>
            <p className="timer-description">
              <bdi>{t.description || "זמן להתקדם בפרויקט שלך"}</bdi>
            </p>
          </>
        ) : (
          <>
            <h2>בואו נתחיל משהו טוב.</h2>
            {selected ? (
              <div className="timer-fields">
                <label>
                  פרויקט למדידה
                  <select
                    aria-label="פרויקט למדידה"
                    value={selected}
                    onChange={(e) => setProject(e.target.value)}
                  >
                    <ProjectOptions state={state} />
                  </select>
                </label>
                <label>
                  על מה עובדים?
                  <input
                    aria-label="תיאור המשימה"
                    placeholder="תיאור קצר, אם מתחשק"
                    maxLength={1000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <p>הפרויקט הראשון שלך הוא נקודת ההתחלה.</p>
            )}
          </>
        )}
        {t && now - t.createdAt > 12 * HOUR && (
          <p className="timer-warning" role="status">
            המדידה פתוחה מעל 12 שעות. עצור ושמור כדי לבדוק ולתקן את הסיום. הזמן
            לא שונה אוטומטית.
          </p>
        )}
      </div>
      <div className="timer-controls">
        <div
          className="clock"
          aria-label={`זמן שנמדד ${hms(elapsed(t, now))}`}
          dir="ltr"
        >
          {hms(elapsed(t, now))}
        </div>
        <span className="clock-caption">שעות : דקות : שניות</span>
        <div className="timer-buttons">
          {t ? (
            <React.Fragment key={t.id}>
              <Button
                key="stop"
                kind="primary"
                icon={Square}
                disabled={busy}
                onPointerDown={arm("stop")}
                onClick={(e) => action("stop", e)}
              >
                עצירה ושמירה
              </Button>
              <Button
                key={t.runningSince === null ? "resume" : "pause"}
                kind="on-dark"
                icon={t.runningSince === null ? Play : Pause}
                disabled={busy}
                onPointerDown={arm(
                  t.runningSince === null ? "resume" : "pause",
                )}
                onClick={(e) =>
                  action(t.runningSince === null ? "resume" : "pause", e)
                }
              >
                {t.runningSince === null ? "המשך" : "השהיה"}
              </Button>
            </React.Fragment>
          ) : (
            <Button
              key="start"
              kind="primary"
              icon={selected ? Play : ArrowUpLeft}
              disabled={busy}
              onPointerDown={arm("start")}
              onClick={(e) => (selected ? action("start", e) : newProject())}
            >
              {selected ? "התחל מדידה" : "צור פרויקט ראשון"}
            </Button>
          )}
        </div>
        <span className="timer-foot">
          <Clock3 size={13} />
          הזמן נשמר, גם כשסוגרים את הדפדפן
        </span>
      </div>
    </section>
  );
}
