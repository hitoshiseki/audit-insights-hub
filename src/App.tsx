import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppNavProvider } from "@/components/AppNav";
import { AppDataProvider } from "@/contexts/AppDataContext";
import Dashboard from "./pages/Dashboard";
import ClinicalDashboard from "./pages/ClinicalDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
