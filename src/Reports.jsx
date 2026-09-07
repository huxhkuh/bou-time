import React, { useState } from "react";
import { Download } from "lucide-react";
import { Field, Button, Dot, Empty } from "./ui.jsx";
import Entries from "./Entries.jsx";
import {
  dayKey,
  weekKey,
  sliceEntries,
  daily,
  duration,
  hours,
  value,
  money,
  csv,
} from "./domain.js";
export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export default function Reports({ state, now, editEntry, remove, notify }) {
  const today = dayKey(now);
  const [from, setFrom] = useState(today.slice(0, 7) + "-01"),
    [to, setTo] = useState(today),
    [client, setClient] = useState(""),
    [project, setProject] = useState(""),
    [group, setGroup] = useState("day");
  let entries = [],
    error = "";
  try {
    if (from > to) throw Error("תאריך הסיום צריך להיות אחרי תאריך ההתחלה.");
    entries = sliceEntries(
      state.entries.filter((e) => {
        const p = state.projects.find((p) => p.id === e.projectId);
        return (
          (!client || p?.clientId === client) &&
          (!project || e.projectId === project)
        );
      }),
      from,
      to,
    );
  } catch (e) {
    error = e.message;
  }
  const sum = (es) => es.reduce((n, e) => n + duration(e.segments), 0),
    worth = (es) => es.reduce((n, e) => n + value(e), 0);
  const groups = new Map();
  for (const e of daily(entries)) {
    const key =
      group === "day"
        ? e.day
        : group === "week"
          ? weekKey(e.day)
          : e.day.slice(0, 7);
    groups.set(key, [...(groups.get(key) || []), e]);
  }
  return (
    <>
      <div className="surface report-filter">
        <Field label="מתאריך">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="עד תאריך">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Field label="לקוח">
          <select
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              setProject("");
            }}
          >
            <option value="">כל הלקוחות</option>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="פרויקט">
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">כל הפרויקטים</option>
            {state.projects
              .filter((p) => !client || p.clientId === client)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Button
          icon={Download}
          disabled={!!error || !entries.length}
          onClick={() => {
            download(
              `bou-${from}-${to}.csv`,
              csv(entries, state),
              "text/csv;charset=utf-8",
            );
            notify("קובץ CSV הוכן להורדה.");
          }}
        >
          ייצוא CSV
        </Button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="metrics">
        <div>
          <span>שעות בטווח שנבחר</span>
          <strong>
            {hours(sum(entries))}
            <small> שעות</small>
          </strong>
        </div>
        <div>
          <span>שווי לפי תעריפים שנשמרו</span>
          <strong>{money(worth(entries))}</strong>
        </div>
        <div>
          <span>רישומי עבודה</span>
          <strong>{entries.length}</strong>
        </div>
      </div>
      <p className="note report-note">
        השווי כולל רישומים בתמחור שעתי בלבד. מחיר כולל ותמורה אפקטיבית מוצגים
        בפרויקטים, ואינם הכנסה נוספת לכל רישום. טיימר שטרם נשמר אינו כלול בדוח.
      </p>
      <section className="surface">
        <div className="section-head">
          <h2>התמונה לאורך זמן</h2>
          <div className="tabs">
            {[
              ["day", "יומי"],
              ["week", "שבועי"],
              ["month", "חודשי"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={group === k ? "selected" : ""}
                aria-pressed={group === k}
                onClick={() => setGroup(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {groups.size ? (
          <div className="summary-list">
            {[...groups]
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([key, es]) => (
                <div className="summary-row" key={key}>
                  <span>
                    {group === "week" ? "שבוע שמתחיל ב־" : ""}
                    <bdi>{key}</bdi>
                  </span>
                  <bdi>{hours(sum(es))} שעות</bdi>
                  <bdi>{money(worth(es))}</bdi>
                </div>
              ))}
          </div>
        ) : (
          <Empty title="הדוח הבא שלך מתחיל בשעה הראשונה">
            הוסף רישום או בחר טווח תאריכים אחר.
          </Empty>
        )}
      </section>
      <div className="dashboard-columns report-groups">
        {[
          [
            "לפי לקוח",
            state.clients,
            (e) => state.projects.find((p) => p.id === e.projectId)?.clientId,
          ],
          ["לפי פרויקט", state.projects, (e) => e.projectId],
        ].map(([label, items, key]) => (
          <section className="surface" key={label}>
            <h2>{label}</h2>
            {items
              .filter((x) => entries.some((e) => key(e) === x.id))
              .map((x) => {
                const es = entries.filter((e) => key(e) === x.id);
                return (
                  <div className="summary-row" key={x.id}>
                    <span>
                      {x.color && <Dot color={x.color} />}
                      <bdi>{x.name}</bdi>
                    </span>
                    <bdi>{hours(sum(es))} שע׳</bdi>
                    <bdi>{money(worth(es))}</bdi>
                  </div>
                );
              })}
            {!entries.length && <p className="muted">אין שעות בטווח שנבחר.</p>}
          </section>
        ))}
      </div>
      <section className="surface entries-section">
        <div className="section-head">
          <h2>רישומי העבודה</h2>
          <span className="muted">שעות מדויקות, ללא עיגול בחישוב</span>
        </div>
        <Entries
          {...{ state, remove }}
          entries={entries}
          edit={editEntry}
          showValue
        />
      </section>
    </>
  );
}
