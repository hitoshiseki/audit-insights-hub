import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppNavProvider } from "@/components/AppNav";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { AccessGate } from "@/components/AccessGate";
import { isUnlocked } from "@/lib/gate";
import Dashboard from "./pages/Dashboard";
import ClinicalDashboard from "./pages/ClinicalDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AccessGate unlocked={unlocked} onUnlock={() => setUnlocked(true)}>
          <HashRouter>
            <AppDataProvider>
              <AppNavProvider>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clinical" element={<ClinicalDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppNavProvider>
            </AppDataProvider>
          </HashRouter>
        </AccessGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
