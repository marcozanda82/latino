import { AnimatePresence } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ExerciseProvider } from './context/ExerciseContext'
import { AdminDashboard } from './components/AdminDashboard'
import Diagnostic from './components/Diagnostic'
import { PageTransition } from './components/layout/PageTransition'
import { PlayLevel } from './components/PlayLevel'
import { StudentHome } from './components/StudentHome'
import { TutorRoute } from './components/TutorRoute'
import { TutorReviewPage } from './pages/TutorReviewPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <StudentHome />
            </PageTransition>
          }
        />
        <Route
          path="/play/:levelId"
          element={
            <PageTransition>
              <PlayLevel />
            </PageTransition>
          }
        />
        <Route
          path="/admin"
          element={
            <PageTransition>
              <TutorRoute>
                <AdminDashboard />
              </TutorRoute>
            </PageTransition>
          }
        />
        <Route
          path="/admin/valutazioni"
          element={
            <PageTransition>
              <TutorRoute>
                <TutorReviewPage />
              </TutorRoute>
            </PageTransition>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/diagnostic" element={<Diagnostic />} />
        <Route
          path="*"
          element={
            <ExerciseProvider>
              <AnimatedRoutes />
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  classNames: {
                    toast: 'font-sans shadow-lift border border-slate-200/80',
                    title: 'text-slate-800 font-medium',
                    description: 'text-slate-600',
                  },
                }}
              />
            </ExerciseProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
