import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";

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
const OAuthDialpadCallback = lazy(() => import("./pages/OAuthDialpadCallback"));
const DARPortal = lazy(() => import("./pages/EODPortal"));
const EODHistory = lazy(() => import("./pages/EODHistory"));
const EODDashboard = lazy(() => import("./pages/EODDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Messages = lazy(() => import("./pages/Messages"));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
            <Route path="/admin" element={<Layout><ProtectedRoute requireAdmin><Admin /></ProtectedRoute></Layout>} />
            <Route path="/jobs" element={<Layout><ProtectedRoute requireAdmin><JobPostings /></ProtectedRoute></Layout>} />
            <Route path="/eod-dashboard" element={<Layout><ProtectedRoute requireAdmin><EODDashboard /></ProtectedRoute></Layout>} />
            <Route path="/settings" element={<Layout><ProtectedRoute requireAdmin><Settings /></ProtectedRoute></Layout>} />
            <Route path="/oauth/dialpad/callback" element={<Layout><ProtectedRoute requireAdmin><OAuthDialpadCallback /></ProtectedRoute></Layout>} />
            
            {/* DAR routes - NO Layout (no sidebar) */}
            <Route path="/eod-portal" element={<ProtectedRoute><DARPortal /></ProtectedRoute>} />
            <Route path="/eod-history" element={<ProtectedRoute><EODHistory /></ProtectedRoute>} />
            
            {/* Public routes - NO Layout */}
            <Route path="/jobpostings" element={<JobPostingsLanding />} />
            <Route path="/login" element={<Login />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
