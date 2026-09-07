import React from "react";
import { Play, ArrowUpLeft, Plus, Timer as TimerIcon } from "lucide-react";
import Timer from "./Timer.jsx";
import Entries from "./Entries.jsx";
import { Button, Dot, Empty } from "./ui.jsx";
import {
  dayKey,
  weekKey,
  sliceEntries,
  duration,
  hours,
  timerSegments,
} from "./domain.js";
export function Allocation({ state, entries }) {
  const total = entries.reduce((n, e) => n + duration(e.segments), 0);
  const rows = state.projects
    .map((p) => ({
      ...p,
      ms: entries
        .filter((e) => e.projectId === p.id)
        .reduce((n, e) => n + duration(e.segments), 0),
    }))
    .filter((p) => p.ms)
    .sort((a, b) => b.ms - a.ms);
  return (
    <>
      {total ? (
        <div className="allocation">
          <div
            className="stack-bar"
            role="img"
            aria-label="חלוקת שעות העבודה בין הפרויקטים"
          >
            {rows.map((p) => (
              <span
                key={p.id}
                style={{
                  background: p.color,
                  width: `${(p.ms / total) * 100}%`,
                }}
              />
            ))}
          </div>
          {rows.map((p) => (
            <div className="allocation-row" key={p.id}>
              <span>
                <Dot color={p.color} />
                <bdi>{p.name}</bdi>
              </span>
              <bdi>
                {hours(p.ms)} שע׳{" "}
                <small>· {Math.round((p.ms / total) * 100)}%</small>
              </bdi>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="לכל שעה יש מקום">
          כאן תראה איך הזמן שלך מתחלק בין הפרויקטים.
        </Empty>
      )}
    </>
  );
}
export default function Dashboard({
  state,
  now,
  mutate,
  notify,
  newProject,
  editEntry,
  remove,
  start,
  manual,
  navigate,
}) {
  const today = dayKey(now),
    week = weekKey(today),
    live = state.timer
      ? { ...state.timer, segments: timerSegments(state.timer, now) }
      : null;
  const all = [...state.entries, ...(live?.segments.length ? [live] : [])];
  const dayEntries = sliceEntries(state.entries, today, today),
    dayAll = sliceEntries(all, today, today),
    weekAll = sliceEntries(all, week, today);
  const sum = (es) => es.reduce((n, e) => n + duration(e.segments), 0);
  const projects = [...state.projects]
    .filter((p) => !p.archived)
    .sort(
      (a, b) =>
        Math.max(
          0,
          ...state.entries
            .filter((e) => e.projectId === b.id)
            .map((e) => e.segments.at(-1).end),
        ) -
        Math.max(
          0,
          ...state.entries
            .filter((e) => e.projectId === a.id)
            .map((e) => e.segments.at(-1).end),
        ),
    )
    .slice(0, 4);
  return (
    <>
      <Timer {...{ state, now, mutate, notify, newProject, editEntry }} />
      <div className="metrics">
        <div>
          <span>זמן עבודה היום</span>
          <strong dir="ltr">
            {hours(sum(dayAll))}
            <small> שעות</small>
          </strong>
        </div>
        <div>
          <span>זמן עבודה השבוע</span>
          <strong dir="ltr">
            {hours(sum(weekAll))}
            <small> שעות</small>
          </strong>
        </div>
        <div className="metric-message">
          <TimerIcon strokeWidth={1.2} size={28} />
          <p>
            פחות לנחש.
            <br />
            <b>יותר לדעת לאן הזמן הולך.</b>
          </p>
        </div>
      </div>
      <div className="dashboard-columns">
        <section className="surface">
          <div className="section-head">
            <h2>ממשיכים מאיפה שעצרת</h2>
            <button
              className="text-button"
              onClick={() => navigate("projects")}
            >
              כל הפרויקטים <ArrowUpLeft size={15} />
            </button>
          </div>
          {projects.length ? (
            <div className="recent-list">
              {projects.map((p) => (
                <div className="recent-row" key={p.id}>
                  <Dot color={p.color} />
                  <div className="grow">
                    <bdi>{p.name}</bdi>
                    <small>
                      {state.clients.find((c) => c.id === p.clientId)?.name}
                    </small>
                  </div>
                  <button
                    className="start-project"
                    aria-label={`התחל ${p.name}`}
                    disabled={state.timer?.projectId === p.id}
                    onClick={() => start(p.id)}
                  >
                    <Play size={17} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="פרויקט ראשון, התחלה חדשה"
              action={
                <Button onClick={newProject} icon={Plus}>
                  יצירת פרויקט
                </Button>
              }
            >
              הוסף לקוח ופרויקט, ותוכל להתחיל למדוד בלחיצה.
            </Empty>
          )}
        </section>
        <section className="surface">
          <div className="section-head">
            <h2>לאן הלך הזמן?</h2>
            <span className="muted">השבוע</span>
          </div>
          <Allocation state={state} entries={weekAll} />
        </section>
      </div>
      <section className="surface entries-section">
        <div className="section-head">
          <h2>מה עשית היום</h2>
          <Button icon={Plus} onClick={manual}>
            הוספה ידנית
          </Button>
        </div>
        <Entries
          entries={dayEntries}
          state={state}
          edit={editEntry}
          remove={remove}
        />
      </section>
    </>
  );
}
