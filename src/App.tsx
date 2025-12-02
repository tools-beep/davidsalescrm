import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";
import { CTIProvider } from "@/components/calls/DialpadCTIManager";
import { useDialpadAutoSync } from "@/hooks/useDialpadAutoSync";
// Survey system is handled locally in EODPortal.tsx - not using global provider
// import { SurveyProvider } from "@/contexts/SurveyContext";
// import { GlobalSurveyPopups } from "@/components/checkins/GlobalSurveyPopups";

// Lazy load pages for better initial load performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Deals = lazy(() => import("./pages/Deals"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Companies = lazy(() => import("./pages/Companies"));
const Calls = lazy(() => import("./pages/Calls"));
const Reports = lazy(() => import("./pages/Reports"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Tasks = lazy(() => import("./pages/Tasks"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const JobPostings = lazy(() => import("./pages/JobPostings"));
const JobPostingsLanding = lazy(() => import("./pages/JobPostingsLanding"));
const DARPortal = lazy(() => import("./pages/EODPortal"));
const EODHistory = lazy(() => import("./pages/EODHistory"));
const EODDashboard = lazy(() => import("./pages/EODDashboard"));
const DARLive = lazy(() => import("./pages/DARLive"));
const Settings = lazy(() => import("./pages/Settings"));
const Messages = lazy(() => import("./pages/Messages"));
const CheckDiscovery = lazy(() => import("./pages/CheckDiscovery"));
const CheckDiscoveryData = lazy(() => import("./pages/CheckDiscoveryData"));
const SmartDARDashboard = lazy(() => import("./pages/SmartDARDashboard"));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Auto-sync wrapper component
const AppWithAutoSync = ({ children }: { children: React.ReactNode }) => {
  // Temporarily disabled - Dialpad API endpoint needs correction
  // TODO: Re-enable once correct Dialpad API endpoint is found
  useDialpadAutoSync(15, false);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CTIProvider>
          <AppWithAutoSync>
            <Toaster />
            <Sonner />
            {/* Survey popups are rendered locally in EODPortal.tsx */}
            <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Admin-only CRM routes - wrapped in Layout */}
            <Route path="/" element={<Layout><ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute></Layout>} />
            <Route path="/deals" element={<Layout><ProtectedRoute requireAdmin><Deals /></ProtectedRoute></Layout>} />
            <Route path="/deals/:id" element={<Layout><ProtectedRoute requireAdmin><DealDetail /></ProtectedRoute></Layout>} />
            <Route path="/contacts" element={<Layout><ProtectedRoute requireAdmin><Contacts /></ProtectedRoute></Layout>} />
            <Route path="/companies" element={<Layout><ProtectedRoute requireAdmin><Companies /></ProtectedRoute></Layout>} />
            <Route path="/calls" element={<Layout><ProtectedRoute requireAdmin><Calls /></ProtectedRoute></Layout>} />
            <Route path="/reports" element={<Layout><ProtectedRoute requireAdmin><Reports /></ProtectedRoute></Layout>} />
            <Route path="/calendar" element={<Layout><ProtectedRoute requireAdmin><Calendar /></ProtectedRoute></Layout>} />
            <Route path="/tasks" element={<Layout><ProtectedRoute requireAdmin><Tasks /></ProtectedRoute></Layout>} />
            <Route path="/messages" element={<Layout><ProtectedRoute requireAdmin><Messages /></ProtectedRoute></Layout>} />
            <Route path="/admin" element={<Layout><ProtectedRoute adminOnly><Admin /></ProtectedRoute></Layout>} />
            <Route path="/jobs" element={<Layout><ProtectedRoute adminOnly><JobPostings /></ProtectedRoute></Layout>} />
            <Route path="/eod-dashboard" element={<Layout><ProtectedRoute adminOnly><EODDashboard /></ProtectedRoute></Layout>} />
            <Route path="/dar-live" element={<Layout><ProtectedRoute adminOnly><DARLive /></ProtectedRoute></Layout>} />
            <Route path="/settings" element={<Layout><ProtectedRoute requireAdmin><Settings /></ProtectedRoute></Layout>} />
            <Route path="/check-discovery" element={<Layout><ProtectedRoute requireAdmin><CheckDiscovery /></ProtectedRoute></Layout>} />
            <Route path="/check-discovery-data" element={<Layout><ProtectedRoute requireAdmin><CheckDiscoveryData /></ProtectedRoute></Layout>} />
            
            {/* DAR routes - NO Layout (no sidebar) */}
            <Route path="/eod-portal" element={<ProtectedRoute><DARPortal /></ProtectedRoute>} />
            <Route path="/smart-dar-dashboard" element={<ProtectedRoute><SmartDARDashboard /></ProtectedRoute>} />
            <Route path="/eod-history" element={<ProtectedRoute><EODHistory /></ProtectedRoute>} />
            
            {/* Public routes - NO Layout */}
            <Route path="/jobpostings" element={<JobPostingsLanding />} />
            <Route path="/login" element={<Login />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
          </AppWithAutoSync>
      </CTIProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
