import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/hooks/useAuth";

function Root() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Ensure the WebView doesn't render under the status bar / notch.
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {
      // no-op
    });

    // Keep default appearance, but avoid crashes if plugin isn't ready.
    StatusBar.setStyle({ style: Style.Default }).catch(() => {
      // no-op
    });

    SplashScreen.hide().catch(() => {
      // no-op: avoid crashing if plugin isn't ready
    });
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <Root />
  </AuthProvider>
);

