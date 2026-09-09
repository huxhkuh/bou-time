import { applyPreferences, getPreferences } from "./preferences.js";
import { tr } from "./i18n.js";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PictureInPicture2,
  Scan,
  Sun,
  Moon,
  X,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { Button, Modal, ProjectOptions, Dot } from "./ui.jsx";
import { elapsed, hms, HOUR, timerAction } from "./domain.js";
import "./focus.css";
import CompactClock from "./CompactClock.jsx";

export function ClockScreen(props) {
  return props.large ? (
    <FullClockScreen {...props} />
  ) : (
    <CompactClock {...props} />
  );
}
function FullClockScreen({
  state,
  mutate,
  owner = window,
  close,
  large = false,
  openFloating,
  showEntry,
}) {
  const [now, setNow] = useState(Date.now());
  const [project, setProject] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [light, setLight] = useState(false);
  const t = state.timer;
  const activeProject = state.projects.find((p) => p.id === t?.projectId);
  const selected = state.projects.some((p) => p.id === project && !p.archived)
    ? project
    : state.projects.find((p) => !p.archived)?.id || "";
  useEffect(() => {
    // Schedule the display in the visible window; elapsed time still comes from saved timestamps.
    const id = owner.setInterval(() => setNow(Date.now()), 250);
    return () => owner.clearInterval(id);
  }, [owner]);
  async function act(type) {
    setBusy(true);
    setMessage("");
    try {
      const next = await mutate((s) =>
        timerAction(s, { type, projectId: selected, expected: t?.id ?? null }),
      );
      if (type === "stop" && next.entries.some((e) => e.id === t?.id)) {
        setMessage(tr("הזמן נשמר. עבודה טובה."));
        if (now - t.createdAt > 12 * HOUR)
          showEntry(next.entries.find((e) => e.id === t.id));
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`focus-clock ${large ? "is-large" : ""} ${light ? "is-light" : ""}`}
      aria-label={large ? tr("שעון מיקוד") : tr("שעון צף")}
    >
      <header className="focus-top">
        <span className="focus-brand">
          {tr("תמורה")}
          <span>.</span>
        </span>
        <span className="focus-state">
          <i className={t?.runningSince != null ? "is-running" : ""} />
          {t
            ? t.runningSince === null
              ? tr("מושהה")
              : tr("במדידה")
            : tr("זמן להתחיל")}
        </span>
        <div className="focus-top-actions">
          {large && (
            <button
              aria-label={tr("פתיחת צג צף מתוך מיקוד")}
              title={tr("צג צף")}
              onClick={openFloating}
            >
              <PictureInPicture2 size={18} />
            </button>
          )}
          <button
            aria-label={light ? tr("מעבר לצג כהה") : tr("מעבר לצג בהיר")}
            onClick={() => setLight(!light)}
          >
            {light ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button
            aria-label={large ? tr("יציאה ממצב מיקוד") : tr("סגירת הצג הצף")}
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="focus-project">
        {t ? (
          <>
            <h2>
              <Dot color={activeProject?.color} />
              <bdi>{activeProject?.name}</bdi>
            </h2>
            <p>
              <bdi>
                {t.description ||
                  state.clients.find((c) => c.id === activeProject?.clientId)
                    ?.name}
              </bdi>
            </p>
          </>
        ) : (
          <label>
            <span className="sr-only">{tr("פרויקט בצג")}</span>
            <select
              aria-label={tr("פרויקט בצג")}
              value={selected}
              onChange={(e) => setProject(e.target.value)}
              disabled={!selected}
            >
              {!selected && (
                <option value="">
                  {tr("צור פרויקט באפליקציה כדי להתחיל")}
                </option>
              )}
              <ProjectOptions state={state} />
            </select>
          </label>
        )}
      </div>
      <div className="focus-digits" dir="ltr" aria-label={tr("זמן בצג")}>
        {hms(elapsed(t, now))}
      </div>
      <div className="focus-controls">
        {t ? (
          <React.Fragment key={t.id}>
            <button
              key={t.runningSince === null ? "resume" : "pause"}
              className="focus-secondary"
              disabled={busy}
              onClick={() => act(t.runningSince === null ? "resume" : "pause")}
            >
              {t.runningSince === null ? (
                <Play size={17} />
              ) : (
                <Pause size={17} />
              )}{" "}
              {t.runningSince === null ? tr("המשך") : tr("השהיה")}
            </button>
            <button
              key="stop"
              className="focus-primary"
              disabled={busy}
              onClick={() => act("stop")}
            >
              <Square size={15} />
              {tr("עצירה ושמירה")}
            </button>
          </React.Fragment>
        ) : (
          <button
            key="start"
            className="focus-primary"
            disabled={busy || !selected}
            onClick={() => act("start")}
          >
            <Play size={17} />
            {tr("התחל מדידה")}
          </button>
        )}
      </div>
      {t && now - t.createdAt > 12 * HOUR ? (
        <p className="focus-warning" role="status">
          {tr("מעל 12 שעות \u2014 עצור ובדוק את שעת הסיום.")}
        </p>
      ) : (
        <p className="focus-caption" role="status">
          {message ||
            (large
              ? tr("רק אתה, הפרויקט והזמן שלך.")
              : tr("סגירת הצג לא עוצרת את המדידה"))}
        </p>
      )}
      {message && t && now - t.createdAt > 12 * HOUR && (
        <p role="alert">{message}</p>
      )}
    </section>
  );
}

export default function FocusTools({ state, mutate, notify, editEntry }) {
  const [pip, setPip] = useState(null);
  const [focus, setFocus] = useState(false);
  const [help, setHelp] = useState(false);
  const opening = useRef(false);
  const prefs = getPreferences();
  useEffect(() => {
    if (pip) applyPreferences(pip.document);
  }, [pip, prefs]);
  const currentWindow = useRef(null);
  const supported =
    typeof window.documentPictureInPicture?.requestWindow === "function";
  useEffect(() => () => currentWindow.current?.close(), []);
  const closeFocus = () => setFocus(false);
  function showEntry(entry) {
    window.focus();
    setFocus(false);
    editEntry(entry);
    notify(tr("הזמן נשמר. בדיקת שעת הסיום נפתחה באפליקציה."));
  }
  async function openFloating() {
    if (window.bouDesktop) {
      try {
        await window.bouDesktop.openFloating();
      } catch {
        notify(tr("לא הצלחנו לפתוח את הצג הצף. נסה שוב."), true);
      }
      return;
    }
    if (!supported) {
      setHelp(true);
      return;
    }
    if (currentWindow.current && !currentWindow.current.closed) {
      currentWindow.current.focus();
      return;
    }
    if (opening.current) return;
    opening.current = true;
    let child;
    try {
      child = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 260,
      });
      currentWindow.current = child;
      applyPreferences(child.document);
      child.document.title = tr("תמורה · צג צף");
      child.document.body.className = "pip-body";
      // Linked styles keep absolute asset URLs and local fonts working under the production CSP.
      document
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((node) => {
          const copy = node.cloneNode(true);
          if (node.tagName === "LINK") copy.href = node.href;
          child.document.head.appendChild(copy);
        });
      child.addEventListener(
        "pagehide",
        () => {
          if (currentWindow.current === child) {
            currentWindow.current = null;
            setPip(null);
          }
        },
        { once: true },
      );
      setPip(child);
    } catch {
      child?.close();
      currentWindow.current = null;
      setHelp(true);
    } finally {
      opening.current = false;
    }
  }
  useEffect(() => {
    function onKey(e) {
      if (
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
        document.querySelector("dialog[open]")
      )
        return;
      if (e.altKey && e.code === "KeyF") {
        e.preventDefault();
        setFocus(true);
      }
      if (e.altKey && e.code === "KeyP") {
        e.preventDefault();
        openFloating();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <>
      <div className="focus-tools">
        <Button icon={Scan} onClick={() => setFocus(true)} title="Alt+F">
          {tr("מצב מיקוד")}
        </Button>
        <Button icon={PictureInPicture2} onClick={openFloating} title="Alt+P">
          {pip ? tr("הצג הצף פתוח") : tr("צג צף")}
        </Button>
      </div>
      {focus && (
        <Modal
          title={tr("מצב מיקוד")}
          className="focus-dialog"
          close={closeFocus}
        >
          <ClockScreen
            {...{ state, mutate, showEntry }}
            large
            close={closeFocus}
            openFloating={openFloating}
          />
        </Modal>
      )}
      {help && (
        <Modal title={tr("צג מעל החלונות")} close={() => setHelp(false)}>
          <p>
            {tr(
              "הדפדפן הזה לא הצליח לפתוח צג צף. אפשר להשתמש ב־Chrome או Edge במחשב וללחוץ שוב על ״צג צף״.",
            )}
          </p>
          <p className="note">
            {tr(
              "הצג נשאר מעל חלונות אחרים כל עוד לשונית האפליקציה פתוחה. אפשר לגרור אותו ולשנות את גודלו. סגירת הצג אינה עוצרת את הטיימר.",
            )}
          </p>
          <p className="note">
            {tr(
              "במעבר לדפדפן אחר הנתונים נפרדים. העבר אותם דרך גיבוי והגדרות \u2192 ייצוא גיבוי מלא וייבוא בדפדפן החדש.",
            )}
          </p>
          <div className="form-footer">
            <Button
              kind="primary"
              onClick={() => {
                setHelp(false);
                setFocus(true);
              }}
            >
              {tr("פתיחת מצב מיקוד כאן")}
            </Button>
            <Button onClick={() => setHelp(false)}>{tr("סגירה")}</Button>
          </div>
        </Modal>
      )}
      {pip &&
        !pip.closed &&
        createPortal(
          <ClockScreen
            {...{ state, mutate, showEntry }}
            owner={pip}
            close={() => pip.close()}
          />,

          pip.document.body,
        )}
    </>
  );
}
