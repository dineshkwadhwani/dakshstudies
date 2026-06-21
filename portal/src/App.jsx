import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import LoginGate from './components/LoginGate.jsx'
import Home from './pages/Home.jsx'
import Schedule from './pages/Schedule.jsx'
import CreateSchedule from './pages/CreateSchedule.jsx'
import ChaptersIndex from './pages/ChaptersIndex.jsx'
import SubjectChapters from './pages/SubjectChapters.jsx'
import ChapterDetail from './pages/ChapterDetail.jsx'
import Quiz from './pages/Quiz.jsx'
import Tests from './pages/Tests.jsx'
import PdfView from './pages/PdfView.jsx'
import Progress from './pages/Progress.jsx'

export default function App() {
  return (
    <LoginGate>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/schedule/create" element={<CreateSchedule />} />
          <Route path="/chapters" element={<ChaptersIndex />} />
          <Route path="/chapters/:subject" element={<SubjectChapters />} />
          <Route path="/chapter/:subject/:chapterId" element={<ChapterDetail />} />
          <Route path="/quiz/:subject/:chapterId" element={<Quiz />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/pdf/*" element={<PdfView />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </LoginGate>
  )
}
