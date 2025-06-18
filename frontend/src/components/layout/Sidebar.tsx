import React from 'react'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  BeakerIcon,
  DocumentTextIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { Page } from '../../types'

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  isOpen: boolean
  onToggle: () => void
}

const navigation = [
  { name: 'Dashboard', page: 'dashboard' as Page, icon: HomeIcon },
  { name: 'New Comparison', page: 'comparison' as Page, icon: BeakerIcon },
  { name: 'Reports', page: 'reports' as Page, icon: DocumentTextIcon },
  { name: 'Settings', page: 'settings' as Page, icon: CogIcon },
]

export default function Sidebar({ currentPage, onPageChange, isOpen, onToggle }: SidebarProps) {
  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 256 : 64 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white border-r border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BeakerIcon className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Design QA</h1>
              <p className="text-xs text-gray-500">Figma-Web Comparison</p>
            </div>
          )}
        </motion.div>
        
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          {isOpen ? (
            <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = currentPage === item.page
          return (
            <button
              key={item.page}
              onClick={() => onPageChange(item.page)}
              className={`
                w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                ${isActive 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
              <motion.span
                initial={false}
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="font-medium"
              >
                {isOpen && item.name}
              </motion.span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-gray-500"
        >
          {isOpen && (
            <div>
              <p>Modern UI v2.0</p>
              <p>Built with React & Tailwind</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
} 