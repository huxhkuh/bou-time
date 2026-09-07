import React, { useState, useEffect, useCallback } from "react";
import {
  Clock3,
  Folder,
  Users,
  ChartNoAxesCombined,
  Database,
  Plus,
  Check,
  X,
  ArrowUpLeft,
} from "lucide-react";
import { read, change, subscribe, demo } from "./store.js";
import { timerAction, dayKey, hms, elapsed } from "./domain.js";
import { Button, Modal } from "./ui.jsx";
import { ClientForm, ProjectForm, EntryForm } from "./forms.jsx";
import Dashboard from "./Dashboard.jsx";
import Projects, { Clients } from "./Projects.jsx";
import Reports from "./Reports.jsx";
import Settings from "./Settings.jsx";
import FocusTools, { ClockScreen } from "./FocusTools.jsx";
const NAV = [
  ["today", "היום", Clock3],
  ["projects", "פרויקטים", Folder],
  ["clients", "לקוחות", Users],
  ["reports", "דוחות", ChartNoAxesCombined],
  ["settings", "גיבוי והגדרות", Database],
];
export default function App() {
  const [state, setState] = useState(null),
    [loadError, setLoadError] = useState(""),
    [page, setPage] = useState("today"),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [now, setNow] = useState(Date.now());
  const notify = useCallback(
    (text, error = false) => setToast({ text, error, id: Date.now() }),
    [],
  );
  const refresh = useCallback(
    () =>
      read()
        .then((s) =>
          setState((current) =>
            !current || s.revision >= current.revision ? s : current,
          ),
        )
        .catch((e) => setLoadError(e.message)),
    [],
  );
  useEffect(() => {
    refresh();
    const unsub = subscribe(refresh);
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => {
      unsub();
      clearInterval(id);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    document.title = state?.timer
      ? `${hms(elapsed(state.timer, now))} · בואו`
      : "בואו · זמן לעבוד טוב";
  }, [state?.timer, now]);
  const mutate = useCallback(async (fn) => {
    const s = await change(fn);
    setState((current) =>
      !current || s.revision >= current.revision ? s : current,
    );
    return s;
  }, []);
  useEffect(
    () =>
      window.bouDesktop?.onEditEntry(async (id) => {
        const current = await read();
        const item = current.entries.find((e) => e.id === id);
        if (item) {
          setState(current);
          setModal({ type: "entry", item });
        }
      }),
    [],
  );
  const newProject = () => {
    if (!state.clients.length) {
      setModal({ type: "client", next: "project" });
      notify("נתחיל בהוספת לקוח, ואז ניצור את הפרויקט.");
    } else setModal({ type: "project" });
  };
  const manual = () => {
    if (!state.projects.length) {
      newProject();
      return;
    }
    setModal({ type: "entry" });
  };
  useEffect(() => {
    const onKey = (e) => {
      if (modal || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.altKey && e.code === "Digit1") {
        e.preventDefault();
        setPage("today");
      }
      if (e.altKey && e.code === "KeyN" && state) {
        e.preventDefault();
        manual();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, modal]);
  const start = async (projectId) => {
    try {
      await mutate((s) =>
        timerAction(s, {
          type: "start",
          projectId,
          expected: state.timer?.id ?? null,
        }),
      );
      setPage("today");
      notify(
        state.timer
          ? "הזמן הקודם נשמר. המדידה החדשה התחילה."
          : "המדידה התחילה.",
      );
    } catch (e) {
      notify(e.message, true);
    }
  };
  const editEntry = (item) => setModal({ type: "entry", item });
  const remove = (id) => setModal({ type: "delete", id });
  if (loadError)
    return (
      <main className="fatal">
        <h1>לא הצלחנו לפתוח את הנתונים</h1>
        <p>{loadError}</p>
        <p>יש לאפשר שמירת נתונים בדפדפן ולנסות שוב. לא נעשו שינויים בנתונים.</p>
        <Button onClick={() => location.reload()}>ניסיון נוסף</Button>
      </main>
    );
  if (!state) return <main className="fatal">פותחים את סביבת העבודה שלך…</main>;
  if (
    window.bouDesktop &&
    new URLSearchParams(location.search).get("floating") === "1"
  )
    return (
      <div className="desktop-floating">
        <ClockScreen
          state={state}
          mutate={mutate}
          close={() => window.bouDesktop.closeFloating()}
          showEntry={(entry) => window.bouDesktop.showEntry(entry.id)}
        />
      </div>
    );
  const titles = {
    today: "היום שלך, בקצב שלך.",
    projects: "לכל פרויקט יש זמן.",
    clients: "הלקוחות שלך.",
    reports: "רואים את התמונה המלאה.",
    settings: "הכול נשאר בידיים שלך.",
  };
  const common = {
    state,
    now,
    mutate,
    notify,
    newProject,
    editEntry,
    remove,
    start,
    manual,
  };
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        דילוג לתוכן הראשי
      </a>
      <aside className="sidebar">
        <div className="brand">
          בואו<span>.</span>
          <small>זמן לעבוד טוב</small>
        </div>
        <nav aria-label="ניווט ראשי">
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-current={page === key ? "page" : undefined}
              className={page === key ? "active" : ""}
              onClick={() => setPage(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="local-dot" />
          סביבת העבודה האישית שלך<small>נשמר מקומית · בלי הסחות דעת</small>
        </div>
      </aside>
      <main id="main" className="main">
        {demo && (
          <p className="error">
            מצב הדגמה נפרד · הנתונים כאן אינם הנתונים האישיים שלך.{" "}
            <a href="/">חזרה לאפליקציה האישית</a>
          </p>
        )}
        <header className="page-header">
          <div>
            <span className="page-eyebrow">
              מרחב העבודה שלך <span aria-hidden="true">/</span>{" "}
              {NAV.find(([key]) => key === page)?.[1]}
            </span>
            <h1>{titles[page]}</h1>
            <p>
              {page === "today"
                ? new Intl.DateTimeFormat("he-IL", {
                    timeZone: "Asia/Jerusalem",
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(now)
                : page === "projects"
                  ? "מהרעיון הראשון ועד השעה האחרונה."
                  : page === "reports"
                    ? "זמן, עבודה ותמורה — במקום אחד."
                    : page === "clients"
                      ? "כל שיתוף פעולה מתחיל כאן."
                      : "שמירה מקומית, גיבוי והרגלים טובים."}
            </p>
          </div>
          <div className="page-actions">
            <FocusTools {...{ state, mutate, notify, editEntry }} />
            {page === "today" && (
              <Button icon={Plus} onClick={manual}>
                הוספה ידנית
              </Button>
            )}
          </div>
        </header>
        {state.timer && page !== "today" && (
          <button className="mini-timer" onClick={() => setPage("today")}>
            <Clock3 size={18} />
            <bdi>
              {state.projects.find((p) => p.id === state.timer.projectId)?.name}
            </bdi>
            <bdi>{hms(elapsed(state.timer, now))}</bdi>
            <span>
              {state.timer.runningSince === null ? "מושהה" : "במדידה"}
            </span>
            <ArrowUpLeft size={18} />
          </button>
        )}
        {page === "today" && <Dashboard {...common} navigate={setPage} />}
        {page === "projects" && (
          <Projects
            {...common}
            edit={(item) => setModal({ type: "project", item })}
          />
        )}
        {page === "clients" && (
          <Clients
            state={state}
            edit={(item) => setModal({ type: "client", item })}
            create={() => setModal({ type: "client" })}
          />
        )}
        {page === "reports" && <Reports {...common} />}
        {page === "settings" && <Settings {...common} />}
        <footer className="main-footer">
          <span>בואו נעשה זמן לדברים החשובים.</span>
          <span>שעון ישראל · שבוע מתחיל ביום ראשון</span>
        </footer>
      </main>
      {modal && (
        <Modal
          title={
            modal.type === "client"
              ? modal.item
                ? "עריכת לקוח"
                : "לקוח חדש"
              : modal.type === "project"
                ? modal.item
                  ? "עריכת פרויקט"
                  : "פרויקט חדש"
                : modal.type === "entry"
                  ? modal.item
                    ? "עריכת רישום"
                    : "הוספת עבודה ידנית"
                  : "למחוק את הרישום?"
          }
          close={() => setModal(null)}
        >
          {modal.type === "client" && (
            <ClientForm
              item={modal.item}
              mutate={mutate}
              close={(saved) =>
                setModal(
                  saved === true && modal.next ? { type: modal.next } : null,
                )
              }
            />
          )}
          {modal.type === "project" && (
            <ProjectForm
              item={modal.item}
              {...{ state, mutate }}
              close={() => setModal(null)}
            />
          )}
          {modal.type === "entry" && (
            <EntryForm
              item={modal.item}
              {...{ state, mutate }}
              close={() => setModal(null)}
            />
          )}
          {modal.type === "delete" && (
            <>
              <p>
                רישום הזמן יימחק מהפרויקט ומהדוחות. הפעולה אינה ניתנת לביטול.
              </p>
              <div className="form-footer">
                <Button
                  kind="primary"
                  onClick={async () => {
                    try {
                      await mutate((s) => {
                        s.entries = s.entries.filter((e) => e.id !== modal.id);
                      });
                      setModal(null);
                      notify("הרישום נמחק.");
                    } catch (e) {
                      notify(e.message, true);
                    }
                  }}
                >
                  כן, מחיקת הרישום
                </Button>
                <Button onClick={() => setModal(null)}>ביטול</Button>
              </div>
            </>
          )}
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "is-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <X size={18} /> : <Check size={18} />}
          <span>{toast.text}</span>
          <button aria-label="סגירת הודעה" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
