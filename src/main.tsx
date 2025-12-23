import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/hooks/useAuth";

function Root() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
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

