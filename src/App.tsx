import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { MaskProvider } from "@/hooks/useMask";
import Auth from "./pages/Auth";
import Messenger from "./pages/Messenger";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Initialize theme from localStorage or system preference
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const hasRecovery =
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery"));

    // If user opened a password recovery link, preserve the tokens in URL
    // and send them to /auth so the reset-password form can be shown.
    if (hasRecovery) {
      const url = new URL(window.location.href);
      const extraQuery = url.search ? `&${url.search.slice(1)}` : "";
      const hash = url.hash ?? "";
      return <Navigate to={`/auth?mode=reset${extraQuery}${hash}`} replace />;
    }

    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const PublicRouteContent = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Don't redirect if user is in password reset mode
  const isResetMode =
    searchParams.get('mode') === 'reset' ||
    searchParams.get('type') === 'recovery' ||
    (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));
  
  if (user && !isResetMode) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => (
  <PublicRouteContent>{children}</PublicRouteContent>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Messenger />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <MaskProvider>
            <TooltipProvider>
              <Toaster />
              <AppRoutes />
            </TooltipProvider>
          </MaskProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
