import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Store,
  Bot,
  Shield,
  FlaskConical,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  badge?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Accounts', path: '/accounts', icon: Wallet },
  { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
  { label: 'Merchant', path: '/merchant', icon: Store },
  { label: 'Agents', path: '/agents', icon: Bot },
  { label: 'Compliance', path: '/compliance', icon: Shield },
  { label: 'Testing', path: '/testing', icon: FlaskConical },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-purple">
            <Landmark className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-purple-900">FauxBank</span>
              <span className="text-xs text-slate-500">Banking Simulation</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-purple-600' : 'text-slate-400'
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 shadow-sm"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
        {!collapsed && (
          <div className="rounded-lg bg-purple-50 p-3">
            <p className="text-xs font-medium text-purple-700">Simulation Mode</p>
            <p className="mt-1 text-xs text-purple-600">
              All transactions use fictional currency (F$)
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
