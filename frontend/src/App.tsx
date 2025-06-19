import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './pages/Dashboard'
import NewComparison from './pages/NewComparison'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import FigmaData from './pages/FigmaData'
import WebData from './pages/WebData'
import HtmlReport from './pages/HtmlReport'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { Page } from './types'
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { isNetlify, FEATURES } from './utils/environment'

// Banner configuration
interface BannerConfig {
  show: boolean;
  message: string;
  type: 'info' | 'warning' | 'error';
}

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showBanner, setShowBanner] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()

  // Configure banner based on environment and features
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>({
    show: false,
    message: '',
    type: 'info'
  })

  // Set up environment-specific banner
  useEffect(() => {
    // Determine which banner to show based on environment and features
    if (isNetlify && !FEATURES.ENABLE_WEB_EXTRACTION) {
      setBannerConfig({
        show: true,
        message: 'Web extraction is not available in this environment. Only Figma data extraction is supported.',
        type: 'info'
      })
    } else if (isNetlify && !FEATURES.ENABLE_REAL_TIME) {
      setBannerConfig({
        show: true,
        message: 'Real-time updates are not available in this environment. Progress updates will be limited.',
        type: 'info'
      })
    }
  }, [])

  // Map URL paths to page types
  const getPageFromPath = (pathname: string): Page => {
    if (pathname.includes('new-comparison')) {
      return 'comparison'
    }
    if (pathname.includes('reports')) {
      return 'reports'
    }
    if (pathname.includes('settings')) {
      return 'settings'
    }
    return 'dashboard'
  }

  const currentPage = getPageFromPath(location.pathname)

  const handlePageChange = (page: Page) => {
    switch (page) {
      case 'dashboard':
        navigate('/')
        break
      case 'comparison':
        navigate('/new-comparison')
        break
      case 'reports':
        navigate('/reports')
        break
      case 'settings':
        navigate('/settings')
        break
    }
  }

  // Get banner background color based on type
  const getBannerStyles = () => {
    switch (bannerConfig.type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'bg-yellow-100 text-yellow-700',
          text: 'text-yellow-700'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'bg-red-100 text-red-700',
          text: 'text-red-700'
        }
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'bg-blue-100 text-blue-700',
          text: 'text-blue-700'
        }
    }
  }

  const styles = getBannerStyles()

  return (
    <div className="flex h-screen bg-gray-50">
      <ErrorBoundary fallback={
        <div className="w-64 bg-white border-r border-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-500">Sidebar error</p>
        </div>
      }>
      <Sidebar 
        currentPage={currentPage} 
          onPageChange={handlePageChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      </ErrorBoundary>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notification Banner */}
        <AnimatePresence>
          {showBanner && bannerConfig.show && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`${styles.bg} border-b ${styles.border}`}
            >
              <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between flex-wrap">
                  <div className="flex-1 flex items-center">
                    <span className={`flex p-2 rounded-lg ${styles.icon}`}>
                      <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className={`ml-3 font-medium ${styles.text} truncate`}>
                      <span>{bannerConfig.message}</span>
                    </p>
                  </div>
                  <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
                    <button
                      type="button"
                      className={`-mr-1 flex p-2 rounded-md hover:${styles.icon} focus:outline-none focus:ring-2 focus:ring-${styles.text}`}
                      onClick={() => setShowBanner(false)}
                    >
                      <span className="sr-only">Dismiss</span>
                      <XMarkIcon className={`h-5 w-5 ${styles.text}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ErrorBoundary fallback={
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-500">Header error</p>
          </div>
        }>
        <Header 
          currentPage={currentPage}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        </ErrorBoundary>
        
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
                <Routes>
                  {/* Root routes */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/new-comparison" element={<NewComparison />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/figma-data/:comparisonId?" element={<FigmaData />} />
                  <Route path="/web-data/:comparisonId?" element={<WebData />} />
                  <Route path="/html-report/:reportId" element={<HtmlReport />} />
                  
                  {/* Modern UI routes with /modern prefix */}
                  <Route path="/modern" element={<Dashboard />} />
                  <Route path="/modern/" element={<Dashboard />} />
                  <Route path="/modern/new-comparison" element={<NewComparison />} />
                  <Route path="/modern/reports" element={<Reports />} />
                  <Route path="/modern/settings" element={<Settings />} />
                  <Route path="/modern/figma-data/:comparisonId?" element={<FigmaData />} />
                  <Route path="/modern/web-data/:comparisonId?" element={<WebData />} />
                  <Route path="/modern/html-report/:reportId" element={<HtmlReport />} />
                  
                  {/* Fallback to dashboard */}
                  <Route path="*" element={<Dashboard />} />
                </Routes>
            </motion.div>
          </AnimatePresence>
          </ErrorBoundary>
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
      </Router>
    </ErrorBoundary>
  )
}

export default App 