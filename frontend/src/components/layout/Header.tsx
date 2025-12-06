import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'
import MCPStatus from '../ui/MCPStatus'
import ServerStatus from '../ui/ServerStatus'
import { ThemeToggle } from '../ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  sidebarOpen: boolean
}

export default function Header({ title, onMenuClick, sidebarOpen }: HeaderProps) {
  const navigationLabel = sidebarOpen ? 'Collapse navigation sidebar' : 'Expand navigation sidebar'
  const notificationsLabel = 'Notifications'
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // Get user initial or first letter of email
  const getUserInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className={cn(
      "px-8 py-5 sticky top-0 z-40 transition-all duration-300",
      "bg-background/40 backdrop-blur-md border-b border-border/10",
      "supports-[backdrop-filter]:bg-background/20"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className={cn("text-muted-foreground hover:bg-muted/20", sidebarOpen ? 'lg:hidden' : '')}
            aria-label={navigationLabel}
            title={navigationLabel}
          >
            <Bars3Icon className="w-6 h-6" />
          </Button>

          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/20 border border-white/5 mx-2">
            <ServerStatus />
            <div className="w-px h-4 bg-border/40" />
            <MCPStatus />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full hover:bg-muted/20 text-muted-foreground hover:text-foreground"
              aria-label={notificationsLabel}
              title={notificationsLabel}
              disabled
            >
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all"
                >
                  <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    {user ? (
                      <span className="text-sm font-bold text-white">
                        {getUserInitial()}
                      </span>
                    ) : (
                      <UserCircleIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 p-2">
                {user ? (
                  <>
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.id.slice(0, 8)}...
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings?tab=auth')} className="cursor-pointer">
                      <UserCircleIcon className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>Not signed in</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings?tab=auth')}>
                      <UserCircleIcon className="mr-2 h-4 w-4" />
                      Sign In
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
} 