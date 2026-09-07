import React, { useEffect, useRef, useState } from "react";
import {
  Minimize2,
  Maximize2,
  Sun,
  Moon,
  X,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { elapsed, hms, HOUR, timerAction } from "./domain.js";

export default function CompactClock({
  state,
  mutate,
  owner = window,
  close,
  showEntry,
}) {
  const [tiny, setTiny] = useState(() => {
    try {
      return localStorage.getItem("bou-float-tiny") !== "false";
    } catch {
      return true;
    }
  });
  const [light, setLight] = useState(false),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const timer = state.timer;
  const projects = state.projects.filter(
    (p) => !p.archived || p.id === timer?.projectId,
  );
  const long = timer && now - timer.createdAt > 12 * HOUR;
  useEffect(() => {
    const id = owner.setInterval(() => setNow(Date.now()), 250);
    return () => owner.clearInterval(id);
  }, [owner]);
  useEffect(() => {
    try {
      localStorage.setItem("bou-float-tiny", String(tiny));
    } catch {
      /* Preferences must never block tracking. */
    }
    const width = tiny ? 240 : 340;
    const height = Math.max(
      124,
      (tiny ? 86 : 125) +
        Math.min(4, projects.length) * (tiny ? 34 : 46) +
        (long ? 38 : 0) +
        (error ? 40 : 0),
    );
    if (window.bouDesktop?.resizeFloating)
      window.bouDesktop
        .resizeFloating(width, height)
        .catch(() => setError("לא ניתן לשנות את גודל החלון כרגע."));
    else if (owner !== window) {
      try {
        owner.resizeTo(width, height);
      } catch {
        /* Some browsers enforce their own minimum size. */
      }
    }
  }, [tiny, projects.length, !!long, !!error, owner]);
  async function act(type, projectId = projects[0]?.id) {
    if (inFlight.current) return;
    if (type === "start" && timer?.projectId === projectId) {
      if (timer.runningSince !== null) return;
      type = "resume";
    }
    const observed = timer;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await mutate((s) =>
        timerAction(s, { type, projectId, expected: observed?.id ?? null }),
      );
      if (
        observed &&
        Date.now() - observed.createdAt > 12 * HOUR &&
        next.timer?.id !== observed.id
      ) {
        const entry = next.entries.find((e) => e.id === observed.id);
        if (entry) showEntry(entry);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const pauseLabel = timer?.runningSince === null ? "המשך" : "השהיה";
  return (
    <section
      className={`compact-clock ${tiny ? "is-tiny" : ""} ${light ? "is-light" : ""}`}
      aria-label="שעון צף"
    >
      <header className="compact-header">
        <span className="compact-brand">
          תמורה<span>.</span>
        </span>
        <div className="compact-tools">
          <button
            title={tiny ? "הגדלת הצג" : "מצב זעיר"}
            aria-label={tiny ? "הגדלת הצג" : "מצב זעיר"}
            onClick={() => setTiny(!tiny)}
          >
            {tiny ? <Maximize2 /> : <Minimize2 />}
          </button>
          <button
            title={light ? "מעבר לצג כהה" : "מעבר לצג בהיר"}
            aria-label={light ? "מעבר לצג כהה" : "מעבר לצג בהיר"}
            onClick={() => setLight(!light)}
          >
            {light ? <Moon /> : <Sun />}
          </button>
          <button
            title="סגירת הצג הצף"
            aria-label="סגירת הצג הצף"
            onClick={close}
          >
            <X />
          </button>
        </div>
      </header>
      <div className="compact-measure">
        <span className="focus-digits" dir="ltr" aria-label="זמן בצג">
          {hms(elapsed(timer, now))}
        </span>
        <div className="compact-actions">
          {timer ? (
            <React.Fragment key={timer.id}>
              <button
                key={pauseLabel}
                title={pauseLabel}
                aria-label={pauseLabel}
                disabled={busy}
                onClick={() =>
                  act(timer.runningSince === null ? "resume" : "pause")
                }
              >
                {timer.runningSince === null ? <Play /> : <Pause />}
              </button>
              <button
                key="stop"
                className="compact-stop"
                title="עצירה ושמירה"
                aria-label="עצירה ושמירה"
                disabled={busy}
                onClick={() => act("stop")}
              >
                <Square />
              </button>
            </React.Fragment>
          ) : (
            <button
              key="start"
              title="התחל מדידה"
              aria-label="התחל מדידה"
              disabled={busy || !projects.length}
              onClick={() => act("start")}
            >
              <Play />
            </button>
          )}
        </div>
      </div>
      <div
        className="compact-projects"
        role="group"
        aria-label="מעבר בין פרויקטים"
      >
        {projects.map((p) => (
          <button
            key={p.id}
            className={`compact-project ${timer?.projectId === p.id ? "is-active" : ""}`}
            style={{ "--project-color": p.color }}
            disabled={busy}
            aria-label={`עבודה על ${p.name}`}
            aria-pressed={timer?.projectId === p.id}
            title={`${p.name} · ${state.clients.find((c) => c.id === p.clientId)?.name || ""}${timer?.projectId === p.id ? "" : " — לחיצה שומרת את המדידה הקודמת ומתחילה כאן"}`}
            onClick={() => act("start", p.id)}
          >
            <i className="compact-project-dot" />
            <span className="compact-project-name">
              <bdi>{p.name}</bdi>
              {!tiny && (
                <small>
                  <bdi>
                    {state.clients.find((c) => c.id === p.clientId)?.name}
                  </bdi>
                </small>
              )}
            </span>
            {timer?.projectId === p.id ? (
              <span
                className="compact-running"
                aria-label={timer.runningSince === null ? "מושהה" : "במדידה"}
              >
                {timer.runningSince === null ? (
                  <Pause />
                ) : (
                  <span className="compact-live" />
                )}
              </span>
            ) : (
              <Play className="compact-row-play" />
            )}
          </button>
        ))}
        {!projects.length && (
          <p className="compact-empty">צור פרויקט באפליקציה כדי להתחיל.</p>
        )}
      </div>
      {long && (
        <p className="compact-warning" role="status">
          מעל 12 שעות — עצור ובדוק את הסיום.
        </p>
      )}
      {error && (
        <p className="compact-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
