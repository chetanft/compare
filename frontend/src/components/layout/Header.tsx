import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'
import MCPStatus from '../ui/MCPStatus'
import ServerStatus from '../ui/ServerStatus'
import { ThemeToggle } from '../ui/theme-toggle'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  sidebarOpen: boolean
}

export default function Header({ title, onMenuClick, sidebarOpen }: HeaderProps) {
  return (
    <header className="page-header px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className={`p-2 ${sidebarOpen ? 'lg:hidden' : ''}`}
          >
            <Bars3Icon className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">Create and manage your design comparisons</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <ServerStatus />
          
          <MCPStatus />
          
          <ThemeToggle />
          
          <Button variant="ghost" size="sm" className="p-2 relative">
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">U</span>
          </div>
        </div>
      </div>
    </header>
  )
} 