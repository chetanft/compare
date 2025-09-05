import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import NewComparison from './pages/NewComparison'
import Settings from './pages/Settings'
import SingleSourcePage from './pages/SingleSourcePage'
import ScreenshotComparison from './pages/ScreenshotComparison'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const getPageTitle = (pathname: string): string => {
    if (pathname.includes('new-comparison')) return 'New Comparison'
    if (pathname.includes('screenshot-comparison')) return 'Screenshot Comparison'
    if (pathname.includes('settings')) return 'Settings'
    if (pathname.includes('single-source')) return 'Single Source'
    return 'Comparison Tool'
  }

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  }

  return (
    <div className="app-container flex h-screen">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<NewComparison />} />
                <Route path="/new-comparison" element={<NewComparison />} />
                <Route path="/screenshot-comparison" element={<ScreenshotComparison />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/single-source" element={<SingleSourcePage />} />
                {/* Redirect any other routes to main comparison */}
                <Route path="*" element={<NewComparison />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
        <Toaster />
      </Router>
    </ErrorBoundary>
  )
}

export default App 