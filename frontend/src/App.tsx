import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import NewComparison from './pages/NewComparison'
import Settings from './pages/Settings'
import SingleSourcePage from './pages/SingleSourcePage'
import ScreenshotComparison from './pages/ScreenshotComparison'
import Reports from './pages/Reports'
import ColorAnalytics from './pages/ColorAnalytics'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { ServerStartup } from './components/ServerStartup'
import ServerStoppedPage from './pages/ServerStoppedPage'
import { Toaster } from '@/components/ui/toaster'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [serverReady, setServerReady] = useState(false)
  const [serverStopped, setServerStopped] = useState(false)
  const [isStartingServer, setIsStartingServer] = useState(false)
  const location = useLocation()

  const getPageTitle = (pathname: string): string => {
    if (pathname.includes('new-comparison')) return 'Compare'
    if (pathname.includes('screenshot-comparison')) return 'Screenshot Comparison'
    if (pathname.includes('settings')) return 'Settings'
    if (pathname.includes('single-source')) return 'Single Source'
    if (pathname.includes('color-analytics')) return 'Color Analytics'
    if (pathname.includes('reports')) return 'Reports'
    return 'Comparison Tool'
  }

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    in: { opacity: 1, scale: 1, y: 0 },
    out: { opacity: 0, scale: 1.02, y: -10 }
  }

  // Listen for server stop events
  useEffect(() => {
    const handleServerStopped = () => {
      setServerStopped(true);
      setServerReady(false);
    };

    window.addEventListener('server-stopped', handleServerStopped);
    return () => window.removeEventListener('server-stopped', handleServerStopped);
  }, []);

  // Handle server restart
  const handleStartServer = async () => {
    setIsStartingServer(true);

    try {
      // If running in Electron, use the IPC API
      if ((window as any).electronAPI) {
        const result = await (window as any).electronAPI.serverControl.start();
        if (result.success) {
          setServerStopped(false);
          setServerReady(false); // Let ServerStartup component handle the ready state
          setIsStartingServer(false);
        } else {
          throw new Error(result.message || 'Failed to start server');
        }
      } else {
        // For web version, the server should always be running
        setServerStopped(false);
        setServerReady(false);
        setIsStartingServer(false);
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      setIsStartingServer(false);
      // Show error to user
      alert('Failed to start server: ' + (error as Error).message);
    }
  };

  // Show server stopped page if server was explicitly stopped
  if (serverStopped) {
    return (
      <ServerStoppedPage
        onStartServer={handleStartServer}
        isStarting={isStartingServer}
      />
    );
  }

  // Show server startup screen if server is not ready
  if (!serverReady) {
    return <ServerStartup onServerReady={() => setServerReady(true)} />
  }

  return (
    <div className="app-container flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Decorative Background Elements - Subtle Monochrome */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-foreground/5 blur-[100px]" />
        </div>

        <Header
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 scroll-smooth z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<NewComparison />} />
                <Route path="/new-comparison" element={<NewComparison />} />
                <Route path="/screenshot-comparison" element={<ScreenshotComparison />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/single-source" element={<SingleSourcePage />} />
                <Route path="/color-analytics" element={<ColorAnalytics />} />
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