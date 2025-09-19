import { FC } from 'react'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon,
  CameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ServerControlButton from '../ui/ServerControlButton'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const navigation = [
  { name: 'New Comparison', href: '/new-comparison', icon: BeakerIcon },
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
        width: isOpen ? 256 : 64,
        transition: { duration: 0.3, ease: "easeInOut" }
      }}
      className="bg-card border-r flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-lg font-semibold">Design QA</h1>
              <p className="text-sm text-muted-foreground">Figma-Web Comparison</p>
            </motion.div>
          )}
          
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="p-1.5 h-auto w-auto text-muted-foreground hover:text-foreground"
          >
            {isOpen ? (
              <ChevronLeftIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href === '/new-comparison' && location.pathname === '/')
          
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-auto px-3 py-2 text-sm font-medium",
                isActive && "bg-secondary text-secondary-foreground"
              )}
              asChild
            >
              <Link to={item.href}>
                <item.icon className={cn(
                  "h-5 w-5",
                  isActive ? "text-secondary-foreground" : "text-muted-foreground"
                )} />
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.1 }}
                    className="ml-3"
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* Server Control Section */}
      <div className="p-4 border-t border-gray-200">
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ServerControlButton variant="default" className="mb-4" />
          </motion.div>
        ) : (
          <div className="flex justify-center">
            <ServerControlButton variant="icon-only" />
          </div>
        )}
      </div>

      {/* Footer */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 border-t border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Modern UI</p>
              <p className="text-xs text-muted-foreground/70">Built with React & Tailwind</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              v2.0
            </Badge>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default Sidebar 