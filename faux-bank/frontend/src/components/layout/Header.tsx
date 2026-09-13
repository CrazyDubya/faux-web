import { useState } from 'react'
import { Bell, Search, User, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl px-6">
      {/* Left - Title */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-4">
        {/* Simulated Time Indicator */}
        <div className="hidden md:flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5">
          <Clock className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">
            Simulated Time Active
          </span>
        </div>

        {/* Search */}
        {searchOpen ? (
          <div className="relative">
            <Input
              placeholder="Search accounts, transactions..."
              className="w-64 pr-10"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-600" />
          </span>
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900">Admin Agent</p>
            <p className="text-xs text-slate-500">Full Access</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-purple-100">
            <User className="h-5 w-5 text-purple-600" />
          </Button>
        </div>
      </div>
    </header>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-2">
              {index > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-slate-500 hover:text-purple-600 transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-slate-900 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
