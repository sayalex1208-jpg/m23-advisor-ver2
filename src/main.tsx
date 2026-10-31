import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startDemoFromLink } from "./lib/demo";
import "./index.css";

// /#demo fills the app with a sample farmer for presentations; must run before the app reads storage.
startDemoFromLink();

// Offline support; only in the deployed build, so local development always
// loads fresh code.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
