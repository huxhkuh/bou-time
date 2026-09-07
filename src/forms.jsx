import React, { useState } from "react";
import { Button, Field, ProjectOptions } from "./ui.jsx";
import {
  uid,
  dayKey,
  clockKey,
  addDays,
  manualSegments,
  overlap,
  pricing,
  timerSegments,
  HOUR,
  duration,
} from "./domain.js";
function useSubmit(mutate, close) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return {
    error,
    busy,
    submit: async (fn) => {
      setBusy(true);
      setError("");
      try {
        await mutate(fn);
        close(true);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
  };
}
function Footer({ error, busy, close, label = "שמירה" }) {
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer className="form-footer">
        <Button kind="primary" type="submit" disabled={busy}>
          {busy ? "שומר…" : label}
        </Button>
        <Button type="button" onClick={close}>
          ביטול
        </Button>
      </footer>
    </>
  );
}
function checkConcurrent(current, original) {
  if (original && JSON.stringify(current) !== JSON.stringify(original))
    throw Error("הרשומה עודכנה בלשונית אחרת. יש לסגור ולפתוח אותה מחדש.");
}
export function ClientForm({ item, mutate, close }) {
  const [name, setName] = useState(item?.name || "");
  const ctl = useSubmit(mutate, close);
  const [id] = useState(item?.id || uid());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ctl.submit((s) => {
          if (!name.trim()) throw Error("יש להזין שם לקוח.");
          const old = s.clients.find((c) => c.id === id);
          checkConcurrent(old, item);
          const c = { id, name: name.trim() };
          if (old) Object.assign(old, c);
          else if (!s.clients.some((c) => c.id === id)) s.clients.push(c);
        });
      }}
    >
      <Field label="שם הלקוח">
        <input
          autoFocus
          required
          maxLength={150}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="למשל, סטודיו קדם"
        />
      </Field>
      <Footer {...ctl} close={close} />
    </form>
  );
}
export function ProjectForm({ item, state, mutate, close }) {
  const [v, setV] = useState(
    item || {
      id: uid(),
      name: "",
      clientId: state.clients[0]?.id || "",
      color: "#b94f2a",
      description: "",
      archived: false,
      priceType: "none",
      price: null,
      goal: null,
    },
  );
  const set = (k, x) => setV((v) => ({ ...v, [k]: x }));
  const ctl = useSubmit(mutate, close);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ctl.submit((s) => {
          if (!v.name.trim() || !s.clients.some((c) => c.id === v.clientId))
            throw Error("יש למלא שם פרויקט ולבחור לקוח.");
          if (
            v.priceType !== "none" &&
            (!Number.isFinite(Number(v.price)) ||
              v.price === null ||
              v.price === "" ||
              Number(v.price) < 0)
          )
            throw Error("יש להזין מחיר תקין.");
          if (v.goal !== null && !(Number(v.goal) > 0))
            throw Error("יעד השעות צריך להיות חיובי.");
          if (v.archived && s.timer?.projectId === v.id)
            throw Error("יש לעצור ולשמור את הטיימר לפני העברה לארכיון.");
          const old = s.projects.find((p) => p.id === v.id);
          checkConcurrent(old, item);
          const p = {
            ...v,
            name: v.name.trim(),
            price: v.priceType === "none" ? null : Number(v.price),
            goal: v.goal === null ? null : Number(v.goal),
          };
          if (old) Object.assign(old, p);
          else s.projects.push(p);
        });
      }}
    >
      <Field label="שם הפרויקט">
        <input
          autoFocus
          required
          maxLength={150}
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="על מה נעבוד?"
        />
      </Field>
      <div className="form-grid">
        <Field label="לקוח">
          <select
            required
            value={v.clientId}
            onChange={(e) => set("clientId", e.target.value)}
          >
            <option value="">בחירת לקוח</option>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="צבע מזהה">
          <input
            type="color"
            value={v.color}
            onChange={(e) => set("color", e.target.value)}
          />
        </Field>
      </div>
      <Field label="תיאור קצר (לא חובה)">
        <textarea
          maxLength={1000}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
        />
      </Field>
      <div className="form-grid">
        <Field label="תמחור">
          <select
            value={v.priceType}
            onChange={(e) => set("priceType", e.target.value)}
          >
            <option value="none">ללא מחיר</option>
            <option value="hourly">תעריף שעתי</option>
            <option value="fixed">מחיר כולל לפרויקט</option>
          </select>
        </Field>
        {v.priceType !== "none" && (
          <Field
            label={
              v.priceType === "hourly" ? "תעריף לשעה (₪)" : "מחיר כולל (₪)"
            }
          >
            <input
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              required
              value={v.price ?? ""}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
        )}
      </div>
      <p className="note">
        תעריף חדש חל על רישומים חדשים בלבד. התעריף של מדידה שכבר התחילה נשמר.
      </p>
      <Field label="יעד שעות (לא חובה)">
        <input
          type="number"
          min="0.01"
          max="100000"
          step="0.01"
          value={v.goal ?? ""}
          onChange={(e) =>
            set("goal", e.target.value === "" ? null : e.target.value)
          }
        />
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={v.archived}
          onChange={(e) => set("archived", e.target.checked)}
        />
        העברה לארכיון
      </label>
      <Footer {...ctl} close={close} />
    </form>
  );
}
export function EntryForm({ item, state, mutate, close }) {
  const now = Date.now(),
    a = item?.segments[0]?.start ?? now,
    b = item?.segments.at(-1)?.end ?? now + HOUR;
  const [v, setV] = useState({
    id: item?.id || uid(),
    projectId:
      item?.projectId || state.projects.find((p) => !p.archived)?.id || "",
    description: item?.description || "",
    date: dayKey(a),
    start: clockKey(a),
    endDate: dayKey(b),
    end: clockKey(b),
    minutes: item ? duration(item.segments) / 60000 : 60,
    mode: item ? "keep" : "clock",
    allowOverlap: false,
    newPrice: false,
  });
  const set = (k, x) => setV((v) => ({ ...v, [k]: x }));
  const ctl = useSubmit(mutate, close);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ctl.submit((s) => {
          const p = s.projects.find((p) => p.id === v.projectId);
          if (!p) throw Error("יש לבחור פרויקט.");
          const old = s.entries.find((e) => e.id === v.id);
          checkConcurrent(old, item);
          const segments =
            v.mode === "keep" ? item.segments : manualSegments(v);
          const all = [
            ...s.entries,
            ...(s.timer
              ? [
                  {
                    id: s.timer.id,
                    segments: timerSegments(s.timer, Date.now()),
                  },
                ]
              : []),
          ];
          if (overlap(all, segments, v.id) && !v.allowOverlap)
            throw Error(
              "הרישום חופף לזמן שכבר נמדד. בדוק את השעות, או סמן אישור חפיפה מפורש.",
            );
          const entry = {
            id: v.id,
            projectId: v.projectId,
            description: v.description,
            segments,
            pricing: item && !v.newPrice ? item.pricing : pricing(p),
            createdAt: item?.createdAt ?? Date.now(),
          };
          if (old) Object.assign(old, entry);
          else s.entries.push(entry);
        });
      }}
    >
      <Field label="פרויקט">
        <select
          autoFocus
          required
          value={v.projectId}
          onChange={(e) => set("projectId", e.target.value)}
        >
          <option value="">בחירת פרויקט</option>
          <ProjectOptions state={state} includeArchived />
        </select>
      </Field>
      <Field label="מה עשית? (לא חובה)">
        <input
          maxLength={1000}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="למשל, אפיון ועיצוב מסך הבית"
        />
      </Field>
      <Field label="אופן הזנת הזמן">
        <select value={v.mode} onChange={(e) => set("mode", e.target.value)}>
          {item && <option value="keep">שמירת מקטעי הזמן המקוריים</option>}
          <option value="clock">שעת התחלה וסיום</option>
          <option value="duration">שעת התחלה ומשך</option>
        </select>
      </Field>
      {v.mode === "keep" ? (
        <div className="note">
          {item.segments.map((s, i) => (
            <div key={i}>
              <bdi>
                {dayKey(s.start)} {clockKey(s.start)} — {dayKey(s.end)}{" "}
                {clockKey(s.end)}
              </bdi>
            </div>
          ))}
          השהיות אינן נכללות בזמן העבודה. שינוי לשעות ידניות יחליף את המקטעים.
        </div>
      ) : (
        <>
          <div className="form-grid">
            <Field label="תאריך התחלה">
              <input
                type="date"
                required
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="שעת התחלה">
              <input
                type="time"
                step="1"
                required
                value={v.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </Field>
          </div>
          {v.mode === "clock" ? (
            <div className="form-grid">
              <Field label="תאריך סיום">
                <input
                  type="date"
                  required
                  value={v.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </Field>
              <Field label="שעת סיום">
                <input
                  type="time"
                  step="1"
                  required
                  value={v.end}
                  onChange={(e) => set("end", e.target.value)}
                />
              </Field>
              <Button
                type="button"
                onClick={() => set("endDate", addDays(v.date, 1))}
              >
                סיום ביום הבא
              </Button>
            </div>
          ) : (
            <Field label="משך בדקות">
              <input
                type="number"
                min="0.01"
                max="525600"
                step="any"
                required
                value={v.minutes}
                onChange={(e) => set("minutes", e.target.value)}
              />
            </Field>
          )}
          <p className="note">
            כל השעות לפי ישראל. בעבודה שחוצה חצות בחר את תאריך הסיום הבא.
          </p>
        </>
      )}
      {item && (
        <>
          <p className="note">התעריף המקורי נשמר גם בהעברה לפרויקט אחר.</p>
          <label className="check">
            <input
              type="checkbox"
              checked={v.newPrice}
              onChange={(e) => set("newPrice", e.target.checked)}
            />
            החל על הרישום את התמחור הנוכחי של הפרויקט הנבחר
          </label>
        </>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={v.allowOverlap}
          onChange={(e) => set("allowOverlap", e.target.checked)}
        />
        בדקתי ואני מאשר חפיפה לרישומים אחרים
      </label>
      <Footer {...ctl} close={close} />
    </form>
  );
}
