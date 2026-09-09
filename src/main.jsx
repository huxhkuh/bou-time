import { applyPreferences, subscribePreferences } from "./preferences.js";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "@fontsource-variable/heebo";
import "./style.css";
import "./polish.css";
import "./appearance.css";
applyPreferences();
subscribePreferences(applyPreferences);
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (
  import.meta.env.PROD &&
  !window.bouDesktop &&
  "serviceWorker" in navigator
) {
  navigator.serviceWorker
    .register("/sw.js")
    .catch((error) =>
      console.warn("Offline registration failed:", error.message),
    );
}
