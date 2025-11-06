import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/auth-utils";
import { LoginForm } from "@/components/auth/LoginForm";
import { Dashboard } from "./pages/Dashboard";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import Employees from "./pages/Employees";
import MyTeam from "./pages/MyTeam";
import EmployeeDetailEnhanced from "./pages/EmployeeDetailEnhanced";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import ModuleViewer from "./pages/ModuleViewer";
import CreateCourse from "./pages/CreateCourse";
import CourseBuilder from "./pages/CourseBuilder";
import AssessmentTaker from "./pages/AssessmentTaker";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import AssignmentDetails from "./pages/AssignmentDetails";
import EvaluateAssignment from "./pages/EvaluateAssignment";
import TrainingSessions from "./pages/TrainingSessions";
import TraineeReadinessReport from "./pages/TraineeReadinessReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedApp = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Setting up your profile...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/employees" element={<Employees />} />
      <Route path="/my-team" element={<MyTeam />} />
      <Route path="/employees/:employeeId" element={<EmployeeDetailEnhanced />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/create" element={<CreateCourse />} />
      <Route path="/courses/:courseId" element={<CourseDetails />} />
      <Route path="/courses/:courseId/edit" element={<CourseBuilder />} />
      <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleViewer />} />
      <Route path="/courses/:courseId/assessments/:assessmentId" element={<AssessmentTaker />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/:projectId" element={<ProjectDetails />} />
      <Route path="/assignments/:assignmentId" element={<AssignmentDetails />} />
      <Route path="/assignments/:assignmentId/evaluate" element={<EvaluateAssignment />} />
      <Route path="/training-sessions" element={<TrainingSessions />} />
      <Route path="/reports/readiness" element={<TraineeReadinessReport />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;