import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'System overview and key metrics' },
  '/accounts': { title: 'Accounts', subtitle: 'Manage customer accounts' },
  '/transactions': { title: 'Transactions', subtitle: 'View and manage transactions' },
  '/merchant': { title: 'Merchant Operations', subtitle: 'Payment processing and authorizations' },
  '/agents': { title: 'Agent Management', subtitle: 'Configure API access agents' },
  '/compliance': { title: 'Compliance Center', subtitle: 'KYC and dispute management' },
  '/testing': { title: 'Testing Tools', subtitle: 'Simulation controls and failure injection' },
  '/settings': { title: 'Settings', subtitle: 'System configuration' },
}

export function Layout() {
  const location = useLocation()

  // Get the base path for matching
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const pageInfo = pageTitles[basePath] || pageTitles['/']

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
