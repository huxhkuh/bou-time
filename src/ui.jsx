import { tr } from "./i18n.js";
import React, { useEffect, useRef, useId } from "react";
import { X, Inbox } from "lucide-react";
export function Button({ children, icon: Icon, kind = "", ...props }) {
  return (
    <button className={`button ${kind}`} {...props}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <Inbox size={30} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({ label, children, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, {
        id,
        "aria-describedby": hint ? id + "-hint" : undefined,
      })}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
export function Modal({ title, close, children, className = "" }) {
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="dialog-body">
        <header className="section-head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label={tr("סגירה")}
            onClick={close}
          >
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function ProjectOptions({ state, includeArchived = false }) {
  return (
    <>
      {state.projects
        .filter((p) => includeArchived || !p.archived)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {state.clients.find((c) => c.id === p.clientId)?.name}
            {p.archived ? tr(" (בארכיון)") : ""}
          </option>
        ))}
    </>
  );
}
export function Dot({ color }) {
  return <span className="dot" style={{ background: color }} />;
}
