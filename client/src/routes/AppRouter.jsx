import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';

const Login = lazy(() => import('../pages/auth/Login.jsx'));
const Register = lazy(() => import('../pages/auth/Register.jsx'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail.jsx'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard.jsx'));
const Profile = lazy(() => import('../pages/profile/Profile.jsx'));
const ResumeDashboard = lazy(() => import('../pages/resume/ResumeDashboard.jsx'));
const JobListings = lazy(() => import('../pages/jobs/JobListings.jsx'));
const JobDetails = lazy(() => import('../pages/jobs/JobDetails.jsx'));
const SavedJobs = lazy(() => import('../pages/jobs/SavedJobs.jsx'));
const ApplicationsDashboard = lazy(() => import('../pages/applications/ApplicationsDashboard.jsx'));
const ApplicationDetail = lazy(() => import('../pages/applications/ApplicationDetail.jsx'));
const ResumeAnalysis = lazy(() => import('../pages/ai/ResumeAnalysis.jsx'));
const CoverLetterGenerator = lazy(() => import('../pages/ai/CoverLetterGenerator.jsx'));
const SkillGap = lazy(() => import('../pages/ai/SkillGap.jsx'));
const Analytics = lazy(() => import('../pages/analytics/Analytics.jsx'));
const Automation = lazy(() => import('../pages/automation/Automation.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));
const Unauthorized = lazy(() => import('../pages/Unauthorized.jsx'));

const AppRouter = () => (
  <Routes>
    {/* Public auth routes */}
    <Route element={<AuthLayout />}>
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Route>

    {/* Protected dashboard routes */}
    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/profile"    element={<Profile />} />
        <Route path="/resumes"    element={<ResumeDashboard />} />
        <Route path="/jobs"       element={<JobListings />} />
        <Route path="/jobs/:id"   element={<JobDetails />} />
        <Route path="/saved-jobs"           element={<SavedJobs />} />
        <Route path="/applications"         element={<ApplicationsDashboard />} />
        <Route path="/applications/:id"     element={<ApplicationDetail />} />
        <Route path="/ai/analyse"           element={<ResumeAnalysis />} />
        <Route path="/ai/cover-letter"      element={<CoverLetterGenerator />} />
        <Route path="/ai/skill-gap"         element={<SkillGap />} />
        <Route path="/analytics"            element={<Analytics />} />
        <Route path="/automation"           element={<Automation />} />
      </Route>
    </Route>

    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRouter;
