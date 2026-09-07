import React, { useState } from "react";
import { Plus, Pencil, Play, Folder, ArrowUpLeft } from "lucide-react";
import { Button, Dot, Empty } from "./ui.jsx";
import { duration, hours, money, HOUR, timerSegments } from "./domain.js";
export default function Projects({ state, now, edit, newProject, start }) {
  const [archive, setArchive] = useState(false),
    [query, setQuery] = useState("");
  const projects = state.projects.filter(
    (p) =>
      p.archived === archive &&
      (p.name + " " + state.clients.find((c) => c.id === p.clientId)?.name)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          <button
            aria-pressed={!archive}
            className={!archive ? "selected" : ""}
            onClick={() => setArchive(false)}
          >
            פעילים
          </button>
          <button
            aria-pressed={archive}
            className={archive ? "selected" : ""}
            onClick={() => setArchive(true)}
          >
            בארכיון
          </button>
        </div>
        <input
          className="search"
          aria-label="חיפוש פרויקטים"
          placeholder="חיפוש פרויקט או לקוח"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button kind="primary" icon={Plus} onClick={newProject}>
          פרויקט חדש
        </Button>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => {
            const ms =
                state.entries
                  .filter((e) => e.projectId === p.id)
                  .reduce((n, e) => n + duration(e.segments), 0) +
                (state.timer?.projectId === p.id
                  ? duration(timerSegments(state.timer, now))
                  : 0),
              over = p.goal && ms / HOUR > p.goal;
            return (
              <article
                className="project-card"
                key={p.id}
                style={{ "--project-color": p.color }}
              >
                <div className="section-head">
                  <span className="project-symbol" style={{ color: p.color }}>
                    <Folder size={23} />
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`עריכת פרויקט ${p.name}`}
                    onClick={() => edit(p)}
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <p className="muted">
                  {state.clients.find((c) => c.id === p.clientId)?.name}
                </p>
                <h2>
                  <bdi>{p.name}</bdi>
                </h2>
                <p className="project-description">
                  <bdi>{p.description || "כל שעה מקדמת את הפרויקט."}</bdi>
                </p>
                <div className="project-numbers">
                  <div>
                    <small>זמן שהושקע</small>
                    <strong>
                      {hours(ms)} <small>שע׳</small>
                    </strong>
                  </div>
                  <div>
                    <small>
                      {p.priceType === "fixed"
                        ? "תמורה אפקטיבית לשעה"
                        : p.priceType === "hourly"
                          ? "תעריף נוכחי לשעה"
                          : "תמחור"}
                    </small>
                    <strong>
                      {p.priceType === "fixed"
                        ? ms
                          ? money(p.price / (ms / HOUR))
                          : "—"
                        : p.priceType === "hourly"
                          ? money(p.price)
                          : "לא הוגדר"}
                    </strong>
                  </div>
                </div>
                {p.priceType === "fixed" && (
                  <p className="note">מחיר כולל: {money(p.price)}</p>
                )}
                {p.goal && (
                  <div className={`goal ${over ? "over" : ""}`}>
                    <div>
                      <span>{over ? "חריגה מיעד השעות" : "התקדמות ליעד"}</span>
                      <bdi>
                        {hours(ms)} / {p.goal} שע׳
                      </bdi>
                    </div>
                    <progress
                      value={Math.min(ms / HOUR, p.goal)}
                      max={p.goal}
                      aria-label={`התקדמות ליעד של ${p.name}`}
                    />
                  </div>
                )}
                <Button
                  icon={Play}
                  kind="wide"
                  disabled={archive || state.timer?.projectId === p.id}
                  onClick={() => start(p.id)}
                >
                  {state.timer?.projectId === p.id
                    ? "נמדד עכשיו"
                    : "התחל עבודה"}
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface">
          <Empty
            title={archive ? "הארכיון שלך נקי" : "מקום לפרויקט הבא שלך"}
            action={
              !archive && (
                <Button onClick={newProject} icon={ArrowUpLeft}>
                  יצירת פרויקט
                </Button>
              )
            }
          >
            {query
              ? "לא נמצאו פרויקטים התואמים לחיפוש."
              : archive
                ? "פרויקטים שתעביר לארכיון יופיעו כאן. כל השעות שלהם יישארו בדוחות."
                : "הגדר לקוח, פרויקט ותמחור — והתחל להבין את הזמן שלך."}
          </Empty>
        </div>
      )}
    </>
  );
}
export function Clients({ state, edit, create }) {
  return (
    <>
      <div className="toolbar">
        <p className="muted">האנשים והעסקים שאתה עובד איתם</p>
        <Button kind="primary" icon={Plus} onClick={create}>
          לקוח חדש
        </Button>
      </div>
      <section className="surface">
        {state.clients.length ? (
          <div className="client-list">
            {state.clients.map((c) => (
              <div className="recent-row" key={c.id}>
                <span className="avatar">{c.name.slice(0, 1)}</span>
                <div className="grow">
                  <strong>
                    <bdi>{c.name}</bdi>
                  </strong>
                  <small>
                    {state.projects.filter((p) => p.clientId === c.id).length}{" "}
                    פרויקטים
                  </small>
                </div>
                <Button icon={Pencil} onClick={() => edit(c)}>
                  עריכה
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="עבודה טובה מתחילה באנשים"
            action={
              <Button icon={Plus} onClick={create}>
                הוספת לקוח ראשון
              </Button>
            }
          >
            הוסף את הלקוח שלך. אחר כך נשייך אליו פרויקטים.
          </Empty>
        )}
      </section>
    </>
  );
}
