import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Example admin: #root element not found");
}

// StrictMode intentionally NOT used: React StrictMode double-invokes effects in
// development, which makes `FrameLinkProvider` destroy its first frame-link
// instance mid-handshake and leaves the connection in an error state. The
// adapter's own tests cover StrictMode-safety; the demo runs without it so the
// live handshake is stable to observe.
createRoot(rootEl).render(<App />);
