import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download, Calendar, ArrowLeftRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, formatAccountId, formatDateTime } from '@/lib/utils'
import type { Transaction, TransactionType, TransactionStatus } from '@/types'

// Mock data
const mockTransactions: Transaction[] = [
  {
    transaction_id: 'TXN-2024122100001',
    transaction_type: 'DEPOSIT',
    debit_account: 'EXTERNAL',
    credit_account: 'CH00123456789012',
    amount: 500000,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Direct deposit - Payroll',
    created_at: '2024-12-21T09:00:00Z',
    posted_at: '2024-12-21T09:00:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100002',
    transaction_type: 'TRANSFER',
    debit_account: 'CH00123456789012',
    credit_account: 'SV00234567890123',
    amount: 100000,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Monthly savings transfer',
    created_at: '2024-12-21T08:30:00Z',
    posted_at: '2024-12-21T08:30:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100003',
    transaction_type: 'PAYMENT',
    debit_account: 'CH00345678901234',
    credit_account: 'MC00456789012345',
    amount: 12500,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Grocery Store Purchase',
    created_at: '2024-12-21T07:45:00Z',
    posted_at: '2024-12-21T07:45:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100004',
    transaction_type: 'AUTHORIZATION',
    debit_account: 'CC00567890123456',
    credit_account: 'MC00789012345678',
    amount: 45000,
    currency: 'FXUSD',
    status: 'PENDING',
    description: 'Online Shopping - Electronics',
    created_at: '2024-12-21T06:30:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100005',
    transaction_type: 'REFUND',
    debit_account: 'MC00456789012345',
    credit_account: 'CH00123456789012',
    amount: 7500,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Refund - Order #12345',
    created_at: '2024-12-20T16:00:00Z',
    posted_at: '2024-12-20T16:15:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100006',
    transaction_type: 'FEE',
    debit_account: 'CH00234567890123',
    credit_account: 'SYSTEM',
    amount: 500,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Monthly maintenance fee',
    created_at: '2024-12-20T00:00:00Z',
    posted_at: '2024-12-20T00:00:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100007',
    transaction_type: 'INTEREST',
    debit_account: 'SYSTEM',
    credit_account: 'SV00345678901234',
    amount: 2350,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Monthly interest credit',
    created_at: '2024-12-20T00:00:00Z',
    posted_at: '2024-12-20T00:00:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN-2024122100008',
    transaction_type: 'CHARGEBACK',
    debit_account: 'MC00456789012345',
    credit_account: 'CC00678901234567',
    amount: 15000,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Dispute resolved - Chargeback',
    created_at: '2024-12-19T14:30:00Z',
    posted_at: '2024-12-19T15:00:00Z',
    metadata: {},
  },
]

const transactionTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'FEE', label: 'Fee' },
  { value: 'INTEREST', label: 'Interest' },
  { value: 'AUTHORIZATION', label: 'Authorization' },
  { value: 'CAPTURE', label: 'Capture' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'CHARGEBACK', label: 'Chargeback' },
]

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
]

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const colors: Record<string, 'purple' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    DEPOSIT: 'success',
    WITHDRAWAL: 'default',
    TRANSFER: 'purple',
    PAYMENT: 'default',
    FEE: 'warning',
    INTEREST: 'success',
    AUTHORIZATION: 'info',
    CAPTURE: 'info',
    REFUND: 'purple',
    CHARGEBACK: 'error',
    REVERSAL: 'warning',
    ADJUSTMENT: 'default',
  }
  return <Badge variant={colors[type] || 'default'}>{type}</Badge>
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const variants: Record<TransactionStatus, 'success' | 'warning' | 'error' | 'default'> = {
    POSTED: 'success',
    PENDING: 'warning',
    FAILED: 'error',
    REVERSED: 'default',
  }
  return <Badge variant={variants[status]}>{status}</Badge>
}

export function Transactions() {
  const [transactions] = useState(mockTransactions)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.debit_account.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.credit_account.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !typeFilter || txn.transaction_type === typeFilter
    const matchesStatus = !statusFilter || txn.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // Calculate summary stats
  const todayTransactions = filteredTransactions.filter(
    (t) => new Date(t.created_at).toDateString() === new Date().toDateString()
  )
  const totalVolume = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const pendingCount = filteredTransactions.filter((t) => t.status === 'PENDING').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Transactions"
        subtitle={`${filteredTransactions.length} transactions`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              New Transaction
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Today's Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{todayTransactions.length}</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <ArrowLeftRight className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Volume</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalVolume)}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-2">
                <ArrowDownRight className="h-5 w-5 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-warning-600">{pendingCount}</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-2">
                <RefreshCw className="h-5 w-5 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Success Rate</p>
                <p className="text-2xl font-bold text-success-600">99.2%</p>
              </div>
              <div className="rounded-lg bg-success-50 p-2">
                <ArrowUpRight className="h-5 w-5 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by ID, description, or account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              options={transactionTypeOptions}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-40"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            />
            <Button variant="outline">
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTransactions.map((txn) => (
            <TableRow key={txn.transaction_id}>
              <TableCell>
                <div>
                  <p className="font-medium">{txn.description}</p>
                  <p className="text-xs text-slate-500 font-mono">{txn.transaction_id}</p>
                </div>
              </TableCell>
              <TableCell>
                <TransactionTypeBadge type={txn.transaction_type} />
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-slate-600">
                  {txn.debit_account === 'EXTERNAL' || txn.debit_account === 'SYSTEM'
                    ? txn.debit_account
                    : formatAccountId(txn.debit_account).slice(0, 9) + '...'}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-slate-600">
                  {txn.credit_account === 'EXTERNAL' || txn.credit_account === 'SYSTEM'
                    ? txn.credit_account
                    : formatAccountId(txn.credit_account).slice(0, 9) + '...'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium tabular-nums text-slate-900">
                  {formatCurrency(txn.amount)}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={txn.status} />
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-slate-900">{new Date(txn.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500">{new Date(txn.created_at).toLocaleTimeString()}</p>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Transaction Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Transaction"
        description="Post a new ledger transaction"
        size="md"
      >
        <form className="space-y-4">
          <Select
            label="Transaction Type"
            options={transactionTypeOptions.filter((o) => o.value)}
            placeholder="Select type"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Debit Account"
              placeholder="Source account ID"
            />
            <Input
              label="Credit Account"
              placeholder="Destination account ID"
            />
          </div>
          <Input
            label="Amount"
            type="number"
            placeholder="0.00"
            hint="Amount in F$"
          />
          <Input
            label="Description"
            placeholder="Transaction description"
          />
          <Input
            label="Reference ID"
            placeholder="Optional external reference"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button>
              <Plus className="h-4 w-4" />
              Post Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
