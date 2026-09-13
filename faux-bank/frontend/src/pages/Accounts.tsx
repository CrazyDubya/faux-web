import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, MoreHorizontal, Wallet, Eye,
  Snowflake, XCircle, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table'
import { PageHeader } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatAccountId, formatDate } from '@/lib/utils'
import type { Account, AccountType, AccountStatus, AccountSegment } from '@/types'

// Mock data
const mockAccounts: (Account & { balance: number })[] = [
  {
    account_id: 'CH00123456789012',
    customer_id: 'CUST001',
    account_type: 'CH',
    account_segment: 'RETL',
    currency: 'FXUSD',
    status: 'ACTIVE',
    metadata: { name: 'John Doe' },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-12-21T08:00:00Z',
    balance: 1250000,
  },
  {
    account_id: 'SV00234567890123',
    customer_id: 'CUST001',
    account_type: 'SV',
    account_segment: 'RETL',
    currency: 'FXUSD',
    status: 'ACTIVE',
    metadata: { name: 'John Doe' },
    created_at: '2024-01-15T10:35:00Z',
    updated_at: '2024-12-21T08:00:00Z',
    balance: 5000000,
  },
  {
    account_id: 'CC00345678901234',
    customer_id: 'CUST002',
    account_type: 'CC',
    account_segment: 'RETL',
    currency: 'FXUSD',
    status: 'ACTIVE',
    metadata: { name: 'Jane Smith' },
    created_at: '2024-02-20T14:00:00Z',
    updated_at: '2024-12-20T15:30:00Z',
    balance: -75000,
  },
  {
    account_id: 'MC00456789012345',
    customer_id: 'CUST003',
    account_type: 'MC',
    account_segment: 'COMM',
    currency: 'FXUSD',
    status: 'ACTIVE',
    metadata: { name: 'Acme Corp' },
    created_at: '2024-03-10T09:00:00Z',
    updated_at: '2024-12-21T07:45:00Z',
    balance: 15750000,
  },
  {
    account_id: 'CH00567890123456',
    customer_id: 'CUST004',
    account_type: 'CH',
    account_segment: 'RETL',
    currency: 'FXUSD',
    status: 'FROZEN',
    freeze_reason: 'FRAUD',
    metadata: { name: 'Robert Brown' },
    created_at: '2024-04-05T11:20:00Z',
    updated_at: '2024-12-19T16:00:00Z',
    balance: 340000,
  },
]

const accountTypeLabels: Record<AccountType, string> = {
  CH: 'Checking',
  SV: 'Savings',
  MM: 'Money Market',
  CD: 'Certificate of Deposit',
  LN: 'Loan',
  MG: 'Mortgage',
  CC: 'Credit Card',
  LC: 'Line of Credit',
  MC: 'Merchant Account',
  TR: 'Trust Account',
  ES: 'Escrow',
  OP: 'Operating Account',
}

const accountTypeOptions = Object.entries(accountTypeLabels).map(([value, label]) => ({
  value,
  label,
}))

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'FROZEN', label: 'Frozen' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'PENDING', label: 'Pending' },
]

const segmentOptions = [
  { value: 'RETL', label: 'Retail' },
  { value: 'COMM', label: 'Commercial' },
  { value: 'GOVT', label: 'Government' },
]

function StatusBadge({ status }: { status: AccountStatus }) {
  const variants: Record<AccountStatus, 'success' | 'warning' | 'error' | 'default'> = {
    ACTIVE: 'success',
    FROZEN: 'warning',
    CLOSED: 'error',
    PENDING: 'default',
  }
  return <Badge variant={variants[status]}>{status}</Badge>
}

export function Accounts() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState(mockAccounts)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.account_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (account.metadata.name as string)?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !typeFilter || account.account_type === typeFilter
    const matchesStatus = !statusFilter || account.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} total accounts`}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Account
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by account ID or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              options={[{ value: '', label: 'All Types' }, ...accountTypeOptions]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-40"
            />
            <Select
              options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            />
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      {filteredAccounts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((account) => (
              <TableRow
                key={account.account_id}
                className="cursor-pointer"
                onClick={() => navigate(`/accounts/${account.account_id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-purple-100 p-2">
                      <Wallet className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="font-mono text-sm">
                      {formatAccountId(account.account_id)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{account.metadata.name as string}</p>
                    <p className="text-xs text-slate-500">{account.customer_id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="purple">{accountTypeLabels[account.account_type]}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600">{account.account_segment}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-medium tabular-nums ${
                      account.balance < 0 ? 'text-error-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={account.status} />
                </TableCell>
                <TableCell>
                  <span className="text-slate-500">{formatDate(account.created_at)}</span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle menu
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <EmptyState
            icon={<Wallet className="h-8 w-8 text-purple-600" />}
            title="No accounts found"
            description="Try adjusting your search or filter criteria"
            action={
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setTypeFilter('')
                setStatusFilter('')
              }}>
                Clear filters
              </Button>
            }
          />
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Account Modal */}
      <CreateAccountModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(account) => {
          setAccounts([account as any, ...accounts])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}

interface CreateAccountModalProps {
  open: boolean
  onClose: () => void
  onCreated: (account: Account) => void
}

function CreateAccountModal({ open, onClose, onCreated }: CreateAccountModalProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    account_type: 'CH' as AccountType,
    account_segment: 'RETL' as AccountSegment,
    currency: 'FXUSD',
    initial_deposit: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000))

    const newAccount: Account = {
      account_id: `${formData.account_type}00${Date.now().toString().slice(-12)}`,
      customer_id: formData.customer_id,
      account_type: formData.account_type,
      account_segment: formData.account_segment,
      currency: formData.currency,
      status: 'ACTIVE',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setLoading(false)
    onCreated(newAccount)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Account"
      description="Set up a new customer account"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer ID"
          placeholder="Enter customer ID"
          value={formData.customer_id}
          onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
          required
        />

        <Select
          label="Account Type"
          options={accountTypeOptions}
          value={formData.account_type}
          onChange={(e) => setFormData({ ...formData, account_type: e.target.value as AccountType })}
        />

        <Select
          label="Segment"
          options={segmentOptions}
          value={formData.account_segment}
          onChange={(e) => setFormData({ ...formData, account_segment: e.target.value as AccountSegment })}
        />

        <Input
          label="Initial Deposit"
          type="number"
          placeholder="0.00"
          hint="Amount in F$ (optional)"
          value={formData.initial_deposit}
          onChange={(e) => setFormData({ ...formData, initial_deposit: e.target.value })}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  )
}
