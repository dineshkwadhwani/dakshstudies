import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Schedule from './pages/Schedule.jsx'
import ChaptersIndex from './pages/ChaptersIndex.jsx'
import SubjectChapters from './pages/SubjectChapters.jsx'
import ChapterDetail from './pages/ChapterDetail.jsx'
import Quiz from './pages/Quiz.jsx'
import Tests from './pages/Tests.jsx'
import PdfView from './pages/PdfView.jsx'
import Progress from './pages/Progress.jsx'
import AdminSubjects from './pages/admin/AdminSubjects.jsx'
import AdminContent from './pages/admin/AdminContent.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminConfig from './pages/admin/AdminConfig.jsx'
import AttemptResult from './pages/AttemptResult.jsx'
import Contact from './pages/Contact.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'
import RefundPolicy from './pages/RefundPolicy.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/onboarding" element={<ProtectedRoute allowIncompleteProfile><Onboarding /></ProtectedRoute>} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/chapters" element={<ChaptersIndex />} />
          <Route path="/chapters/:subject" element={<SubjectChapters />} />
          <Route path="/chapter/:subject/:chapterId" element={<ChapterDetail />} />
          <Route path="/quiz/:subject/:chapterId" element={<Quiz />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/pdf/*" element={<PdfView />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/results/:attemptId" element={<AttemptResult />} />
          <Route path="/admin/subjects" element={<ProtectedRoute roles={['super_admin']}><AdminSubjects /></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute roles={['super_admin']}><AdminContent /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['super_admin', 'account_manager']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/config" element={<ProtectedRoute roles={['super_admin']}><AdminConfig /></ProtectedRoute>} />
          <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
