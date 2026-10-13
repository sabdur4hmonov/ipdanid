import { BusinessProvider } from "./BusinessContext";
import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./style.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BusinessProvider>
      <App />
    </BusinessProvider>
  </React.StrictMode>,
);
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform()
)
  navigator.serviceWorker.register("/sw.js").catch(console.error);
