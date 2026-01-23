import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/providers/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/RequireRole";
import { RequireCustomer } from "@/components/RequireCustomer";
import { RequireVendor } from "@/components/RequireVendor";
import { Suspense } from "react";
import { LocationProvider } from "@/providers/LocationProvider";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VendorApply from "./pages/VendorApply";
import VendorDashboard from "./pages/VendorDashboard";
import VendorOrders from "./pages/VendorOrders";
import VendorStore from "./pages/VendorStore";
import CustomerOrders from "./pages/CustomerOrders";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import HowItWorks from "./pages/HowItWorks";
import AboutUs from "./pages/footer/AboutUs";
import ContactUs from "./pages/footer/ContactUs";
import PrivacyPolicy from "./pages/footer/PrivacyPolicy";
import TermsOfService from "./pages/footer/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <LocationProvider>
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
                    <RequireVendor>
                      <VendorOrders />
                    </RequireVendor>
                  </RequireAuth>
                }
              />
              <Route path="/vendor/:vendorId" element={<VendorStore />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route
                path="/orders"
                element={
                  <RequireAuth>
                    <RequireCustomer>
                      <CustomerOrders />
                    </RequireCustomer>
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
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
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </BrowserRouter>
          </LocationProvider>
        </AuthProvider>
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
