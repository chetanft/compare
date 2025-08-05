import React from 'react'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const navigation = [
  { name: 'New Comparison', href: '/new-comparison', icon: BeakerIcon },
  { name: 'Single Source', href: '/single-source', icon: ArrowsRightLeftIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
]

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <motion.div
      initial={false}
      animate={{ 
        width: isOpen ? 256 : 64,
        transition: { duration: 0.3, ease: "easeInOut" }
      }}
      className="bg-white border-r border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-lg font-semibold text-gray-900">Design QA</h1>
              <p className="text-sm text-gray-500">Figma-Web Comparison</p>
            </motion.div>
          )}
          
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {isOpen ? (
              <ChevronLeftIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href === '/new-comparison' && location.pathname === '/')
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
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
          )
        })}
      </nav>

      {/* Footer */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500">Modern UI v2.0</p>
          <p className="text-xs text-gray-400">Built with React & Tailwind</p>
        </motion.div>
      )}
    </motion.div>
  )
} 