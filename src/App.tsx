import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/providers/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/RequireRole";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VendorApply from "./pages/VendorApply";
import VendorDashboard from "./pages/VendorDashboard";
import VendorOrders from "./pages/VendorOrders";
import VendorStore from "./pages/VendorStore";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Index />} />
              <Route
                path="/vendor/apply"
                element={
                  <RequireAuth>
                    <VendorApply />
                  </RequireAuth>
                }
              />
              <Route
                path="/vendor/dashboard"
                element={
                  <RequireAuth>
                    <VendorDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/vendor/orders"
                element={
                  <RequireAuth>
                    <VendorOrders />
                  </RequireAuth>
                }
              />
              <Route path="/vendor/:vendorId" element={<VendorStore />} />
              <Route
                path="/admin-setup"
                element={
                  <RequireAuth>
                    <AdminSetup />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireRole role="admin">
                    <Admin />
                  </RequireRole>
                }
              />
              <Route path="/auth" element={<Auth />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
