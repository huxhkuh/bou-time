import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Empty, Dot } from "./ui.jsx";
import { duration, hms, dayKey, clockKey, value, money } from "./domain.js";
export default function Entries({
  entries,
  state,
  edit,
  remove,
  showValue = false,
}) {
  if (!entries.length)
    return (
      <Empty title="עוד אין כאן שעות עבודה">
        התחל מדידה או הוסף עבודה ידנית. כל מה שעשית יופיע כאן.
      </Empty>
    );
  return (
    <div className="table-scroll">
      <table className="entries-table">
        <thead>
          <tr>
            <th>פרויקט / משימה</th>
            <th>תאריך ושעות</th>
            <th>משך</th>
            {showValue && <th>שווי שעתי</th>}
            <th>
              <span className="sr-only">פעולות</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...entries]
            .sort((a, b) => b.segments[0].start - a.segments[0].start)
            .map((e) => {
              const p = state.projects.find((p) => p.id === e.projectId);
              return (
                <tr key={e.id}>
                  <td className="entry-project">
                    <div className="row-title">
                      <Dot color={p?.color} />
                      <bdi>{p?.name}</bdi>
                    </div>
                    <span className="subtext">
                      <bdi>{e.description || "ללא תיאור"}</bdi>
                    </span>
                  </td>
                  <td className="entry-date">
                    <bdi className="subtext">{dayKey(e.segments[0].start)}</bdi>
                    <br />
                    <bdi className="time-range">
                      {clockKey(e.segments[0].start)} –{" "}
                      {clockKey(e.segments.at(-1).end)}
                    </bdi>
                    {dayKey(e.segments[0].start) !==
                      dayKey(e.segments.at(-1).end) && (
                      <small className="subtext">
                        סיום {dayKey(e.segments.at(-1).end)}
                      </small>
                    )}
                    {e.segments.length > 1 && (
                      <small className="subtext">
                        {e.segments.length} מקטעים
                      </small>
                    )}
                  </td>
                  <td className="entry-duration" data-label="משך עבודה">
                    <bdi className="duration">{hms(duration(e.segments))}</bdi>
                  </td>
                  {showValue && (
                    <td className="entry-value" data-label="שווי שעתי">
                      {e.pricing.type === "hourly"
                        ? money(value(e))
                        : e.pricing.type === "fixed"
                          ? "מחיר כולל"
                          : "ללא מחיר"}
                    </td>
                  )}
                  <td className="entry-actions">
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`עריכת רישום ${e.description || p?.name}`}
                        onClick={() =>
                          edit(state.entries.find((x) => x.id === e.id) || e)
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`מחיקת רישום ${e.description || p?.name}`}
                        onClick={() => remove(e.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
