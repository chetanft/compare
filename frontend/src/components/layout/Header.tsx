import React from 'react'
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'
import { Page } from '../../types'
import MCPStatus from '../ui/MCPStatus'

interface HeaderProps {
  currentPage: Page
  onSidebarToggle: () => void
}

const pageNames = {
  dashboard: 'Dashboard',
  comparison: 'New Comparison',
  reports: 'Reports',
  settings: 'Settings'
}

export default function Header({ currentPage, onSidebarToggle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Bars3Icon className="w-5 h-5 text-gray-500" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {pageNames[currentPage]}
            </h1>
            <p className="text-sm text-gray-500">
              {currentPage === 'dashboard' && 'Overview of your design comparisons'}
              {currentPage === 'comparison' && 'Create a new Figma vs Web comparison'}
              {currentPage === 'reports' && 'View and manage comparison reports'}
              {currentPage === 'settings' && 'Configure your comparison preferences'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* MCP Status */}
          <div className="hidden md:block">
            <MCPStatus showDetails={false} />
          </div>
          
          {/* Notifications */}
          <button className="p-2 rounded-md hover:bg-gray-100 transition-colors relative">
            <BellIcon className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">U</span>
            </div>
            <span className="text-sm font-medium text-gray-700">User</span>
          </div>
        </div>
      </div>
    </header>
  )
} 