import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, ArrowUpRight, ArrowDownRight, Users, AlertTriangle,
  TrendingUp, Activity, Clock, CreditCard, FileCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// Mock data for demonstration
const mockMetrics = {
  totalAccounts: 1247,
  activeAccounts: 1189,
  totalTransactionsToday: 3842,
  totalVolumeToday: 287500000, // cents
  pendingAuthorizations: 23,
  openDisputes: 7,
  activeAgents: 12,
  pendingKyc: 15,
}

const transactionTrend = [
  { time: '00:00', volume: 45000000, count: 120 },
  { time: '04:00', volume: 23000000, count: 67 },
  { time: '08:00', volume: 89000000, count: 234 },
  { time: '12:00', volume: 156000000, count: 412 },
  { time: '16:00', volume: 198000000, count: 523 },
  { time: '20:00', volume: 134000000, count: 356 },
  { time: 'Now', volume: 287500000, count: 3842 },
]

const accountTypes = [
  { name: 'Checking', value: 456, color: '#8b5cb0' },
  { name: 'Savings', value: 389, color: '#a47cc4' },
  { name: 'Credit Card', value: 234, color: '#bfa3d9' },
  { name: 'Merchant', value: 89, color: '#d9cce9' },
  { name: 'Other', value: 79, color: '#ebe4f4' },
]

const recentActivity = [
  { type: 'DEPOSIT', account: 'CH-1234', amount: 250000, time: '2 min ago', status: 'POSTED' },
  { type: 'TRANSFER', account: 'SV-5678', amount: -50000, time: '5 min ago', status: 'POSTED' },
  { type: 'AUTHORIZATION', account: 'CC-9012', amount: -15000, time: '8 min ago', status: 'PENDING' },
  { type: 'REFUND', account: 'MC-3456', amount: 7500, time: '12 min ago', status: 'POSTED' },
  { type: 'KYC_SUBMITTED', account: 'Customer #789', amount: 0, time: '15 min ago', status: 'PENDING' },
]

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  href?: string
}

function StatCard({ title, value, change, icon: Icon, trend, href }: StatCardProps) {
  const content = (
    <Card className={href ? 'card-interactive' : ''}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-success-500" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 text-error-500" />
                ) : null}
                <span
                  className={`text-sm font-medium ${
                    trend === 'up' ? 'text-success-600' : trend === 'down' ? 'text-error-600' : 'text-slate-500'
                  }`}
                >
                  {change > 0 ? '+' : ''}{change}% from yesterday
                </span>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-purple-100 p-3">
            <Icon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }
  return content
}

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of your banking simulation"
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>Last updated: {formatDateTime(currentTime)}</span>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accounts"
          value={mockMetrics.totalAccounts.toLocaleString()}
          change={2.5}
          trend="up"
          icon={Wallet}
          href="/accounts"
        />
        <StatCard
          title="Today's Transactions"
          value={mockMetrics.totalTransactionsToday.toLocaleString()}
          change={12.3}
          trend="up"
          icon={Activity}
          href="/transactions"
        />
        <StatCard
          title="Today's Volume"
          value={formatCurrency(mockMetrics.totalVolumeToday)}
          change={8.7}
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="Active Agents"
          value={mockMetrics.activeAgents}
          change={0}
          trend="neutral"
          icon={Users}
          href="/agents"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transaction Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Transaction Volume Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transactionTrend}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cb0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cb0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                  <XAxis dataKey="time" stroke="#9ca4ae" fontSize={12} />
                  <YAxis
                    stroke="#9ca4ae"
                    fontSize={12}
                    tickFormatter={(v) => `F$${(v / 100000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e8eaed',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [formatCurrency(value as number), 'Volume']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#8b5cb0"
                    strokeWidth={2}
                    fill="url(#colorVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Account Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Account Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {accountTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e8eaed',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {accountTypes.map((type) => (
                <div key={type.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-slate-600">{type.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">{type.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Recent Activity
            </CardTitle>
            <Link to="/transactions" className="text-sm font-medium text-purple-600 hover:text-purple-700">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        activity.amount >= 0 ? 'bg-success-50' : 'bg-slate-100'
                      }`}
                    >
                      {activity.type === 'KYC_SUBMITTED' ? (
                        <FileCheck className={`h-4 w-4 text-info-500`} />
                      ) : activity.amount >= 0 ? (
                        <ArrowDownRight className="h-4 w-4 text-success-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {activity.type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-slate-500">{activity.account}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.amount !== 0 && (
                      <p
                        className={`font-medium tabular-nums ${
                          activity.amount >= 0 ? 'text-success-600' : 'text-slate-900'
                        }`}
                      >
                        {activity.amount >= 0 ? '+' : ''}{formatCurrency(activity.amount)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm text-slate-500">{activity.time}</span>
                      <Badge
                        variant={activity.status === 'POSTED' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-warning-50 p-4 border-l-4 border-warning-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning-700">Pending KYC Reviews</p>
                  <p className="text-sm text-warning-600 mt-1">
                    {mockMetrics.pendingKyc} verifications awaiting review
                  </p>
                  <Link to="/compliance" className="inline-block mt-2 text-sm font-medium text-warning-700 hover:text-warning-800">
                    Review now
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-error-50 p-4 border-l-4 border-error-500">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-error-700">Open Disputes</p>
                  <p className="text-sm text-error-600 mt-1">
                    {mockMetrics.openDisputes} disputes require attention
                  </p>
                  <Link to="/compliance" className="inline-block mt-2 text-sm font-medium text-error-700 hover:text-error-800">
                    View disputes
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-info-50 p-4 border-l-4 border-info-500">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-info-700">Pending Authorizations</p>
                  <p className="text-sm text-info-600 mt-1">
                    {mockMetrics.pendingAuthorizations} holds awaiting capture
                  </p>
                  <Link to="/merchant" className="inline-block mt-2 text-sm font-medium text-info-700 hover:text-info-800">
                    View merchant
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
