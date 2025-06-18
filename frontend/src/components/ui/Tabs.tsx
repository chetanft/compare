import React, { useState, ReactNode } from 'react'
import { motion } from 'framer-motion'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
  badge?: string | number
}

interface TabsProps {
  tabs: TabItem[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
}

export default function Tabs({ tabs, defaultTab, onChange, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                relative py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                transition-colors duration-200 ease-in-out
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                {tab.icon && (
                  <span className="w-5 h-5">
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-800'
                    }
                  `}>
                    {tab.badge}
                  </span>
                )}
              </div>
              
              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTabContent}
        </motion.div>
      </div>
    </div>
  )
} 