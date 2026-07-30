import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Example site: #root element not found");
}

// StrictMode intentionally omitted — its dev-only effect double-invocation
// destabilizes the live frame-link handshake (see the admin's main.tsx note).
createRoot(rootEl).render(<App />);
