import { FC } from 'react'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon,
  CameraIcon,
  DocumentTextIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ServerControlButton from '../ui/ServerControlButton'
import { VersionBadge } from '../ui/VersionBadge'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const navigation = [
  { name: 'Compare', href: '/new-comparison', icon: BeakerIcon },
  { name: 'Screenshot Compare', href: '/screenshot-comparison', icon: CameraIcon },
  { name: 'Single Source', href: '/single-source', icon: ArrowsRightLeftIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
]

const Sidebar: FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation()

  return (
    <motion.div
      initial={false}
      animate={{
        width: isOpen ? 280 : 80,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }}
      className={cn(
        "relative flex flex-col h-screen border-r border-white/10 dark:border-white/5",
        "bg-white/80 dark:bg-slate-950/60 backdrop-blur-xl z-50",
        "shadow-[1px_0_20px_0_rgba(0,0,0,0.05)]"
      )}
    >
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-border/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="min-w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Squares2X2Icon className="w-6 h-6 text-primary-foreground" />
          </div>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="whitespace-nowrap"
            >
              <h1 className="text-lg font-bold tracking-tight">Design QA</h1>
              <p className="text-xs text-muted-foreground font-medium">Figma vs Web</p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="absolute -right-3 top-24 z-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full shadow-md bg-background border-border hover:bg-muted"
        >
          {isOpen ? (
            <ChevronLeftIcon className="h-3 w-3" />
          ) : (
            <ChevronRightIcon className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href === '/new-comparison' && location.pathname === '/')

          return (
            <Link key={item.name} to={item.href}>
              <div className={cn(
                "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative",
                isActive
                  ? "text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                !isOpen && "justify-center px-2"
              )}>
                {/* Active Background - Solid Monochrome */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <item.icon className={cn(
                  "w-6 h-6 relative z-10 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-white" : "text-current"
                )} />

                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "font-medium text-sm whitespace-nowrap relative z-10",
                      isActive ? "text-white" : "text-current"
                    )}
                  >
                    {item.name}
                  </motion.span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer / Server */}
      <div className="p-4 border-t border-border/40 bg-muted/5 backdrop-blur-sm">
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <ServerControlButton variant="default" />
            <div className="flex items-center justify-start px-2">
              <VersionBadge className="scale-90 origin-left" />
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ServerControlButton variant="icon-only" />
            <div className="h-1 w-8 bg-border/50 rounded-full" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default Sidebar 