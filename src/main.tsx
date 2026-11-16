import { BusinessProvider } from "./BusinessContext";
import { FeatureProvider } from "./FeatureContext";
import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./style.css";
if (Capacitor.getPlatform() === "android") document.documentElement.classList.add("native-android");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FeatureProvider><BusinessProvider>
      <App />
    </BusinessProvider></FeatureProvider>
  </React.StrictMode>,
);
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform()
)
  navigator.serviceWorker.register("/sw.js").catch(console.error);
