import React from 'react'
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'
import MCPStatus from '../ui/MCPStatus'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  sidebarOpen: boolean
}

export default function Header({ title, onMenuClick, sidebarOpen }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className={`
              p-2 rounded-md hover:bg-gray-100 transition-colors
              ${sidebarOpen ? 'lg:hidden' : ''}
            `}
          >
            <Bars3Icon className="w-5 h-5 text-gray-500" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">Create and manage your design comparisons</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <MCPStatus />
          
          <button className="p-2 rounded-md hover:bg-gray-100 transition-colors relative">
            <BellIcon className="w-5 h-5 text-gray-500" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">U</span>
          </div>
        </div>
      </div>
    </header>
  )
} 