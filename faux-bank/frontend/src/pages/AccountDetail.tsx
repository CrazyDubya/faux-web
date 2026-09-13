import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Snowflake, XCircle, FileText, Clock, CreditCard, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/layout/Header'
import { Alert } from '@/components/ui/Alert'
import { formatCurrency, formatAccountId, formatDateTime, formatDate } from '@/lib/utils'
import type { Transaction, AccountStatus, FreezeReason } from '@/types'

// Mock data
const mockAccount = {
  account_id: 'CH00123456789012',
  customer_id: 'CUST001',
  account_type: 'CH',
  account_segment: 'RETL',
  currency: 'FXUSD',
  status: 'ACTIVE' as AccountStatus,
  freeze_reason: undefined as FreezeReason | undefined,
  metadata: { name: 'John Doe', email: 'john.doe@example.com' },
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-12-21T08:00:00Z',
  balance: {
    available_balance: 1250000,
    ledger_balance: 1275000,
    pending_credits: 50000,
    pending_debits: 25000,
    held_amount: 25000,
  },
}

const mockTransactions: Transaction[] = [
  {
    transaction_id: 'TXN001',
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
    transaction_id: 'TXN002',
    transaction_type: 'TRANSFER',
    debit_account: 'CH00123456789012',
    credit_account: 'SV00234567890123',
    amount: 100000,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Transfer to savings',
    created_at: '2024-12-20T14:30:00Z',
    posted_at: '2024-12-20T14:30:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN003',
    transaction_type: 'PAYMENT',
    debit_account: 'CH00123456789012',
    credit_account: 'MC00789012345678',
    amount: 4500,
    currency: 'FXUSD',
    status: 'POSTED',
    description: 'Coffee Shop - Morning brew',
    created_at: '2024-12-20T08:15:00Z',
    posted_at: '2024-12-20T08:15:00Z',
    metadata: {},
  },
  {
    transaction_id: 'TXN004',
    transaction_type: 'AUTHORIZATION',
    debit_account: 'CH00123456789012',
    credit_account: 'MC00456789012345',
    amount: 25000,
    currency: 'FXUSD',
    status: 'PENDING',
    description: 'Restaurant - Pending authorization',
    created_at: '2024-12-21T12:00:00Z',
    metadata: {},
  },
]

const freezeReasonOptions = [
  { value: 'FRAUD', label: 'Suspected Fraud' },
  { value: 'COMPLIANCE', label: 'Compliance Review' },
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
  { value: 'LEGAL_HOLD', label: 'Legal Hold' },
]

export function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>()
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const account = mockAccount // In reality, fetch by accountId

  const isCredit = account.account_type === 'CC' || account.account_type === 'LC'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link and header */}
      <div>
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>

        <PageHeader
          title={formatAccountId(account.account_id)}
          subtitle={`${account.metadata.name} - ${account.account_type} Account`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTransferModal(true)}>
                <ArrowUpRight className="h-4 w-4" />
                Transfer
              </Button>
              {account.status === 'ACTIVE' ? (
                <Button variant="outline" onClick={() => setShowFreezeModal(true)}>
                  <Snowflake className="h-4 w-4" />
                  Freeze
                </Button>
              ) : account.status === 'FROZEN' ? (
                <Button variant="outline">
                  Unfreeze
                </Button>
              ) : null}
              <Button variant="danger" onClick={() => setShowCloseModal(true)}>
                <XCircle className="h-4 w-4" />
                Close
              </Button>
            </div>
          }
        />
      </div>

      {/* Status Alert */}
      {account.status === 'FROZEN' && (
        <Alert variant="warning" title="Account Frozen">
          This account has been frozen. Reason: {account.freeze_reason || 'Not specified'}
        </Alert>
      )}

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="purple">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-200 p-3">
                <Wallet className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-purple-700">Available Balance</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(account.balance.available_balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-3">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ledger Balance</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(account.balance.ledger_balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-50 p-3">
                <ArrowDownRight className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Credits</p>
                <p className="text-2xl font-bold text-success-600">
                  +{formatCurrency(account.balance.pending_credits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning-50 p-3">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Held Amount</p>
                <p className="text-2xl font-bold text-warning-600">
                  {formatCurrency(account.balance.held_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="details">Account Details</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((txn) => {
                    const isDebit = txn.debit_account === account.account_id
                    return (
                      <TableRow key={txn.transaction_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatDate(txn.created_at)}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(txn.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${isDebit ? 'bg-slate-100' : 'bg-success-50'}`}>
                              {isDebit ? (
                                <ArrowUpRight className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-success-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{txn.description}</p>
                              <p className="text-xs text-slate-500 font-mono">{txn.transaction_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={txn.status === 'POSTED' ? 'success' : txn.status === 'PENDING' ? 'warning' : 'error'}
                          >
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium tabular-nums ${isDebit ? 'text-slate-900' : 'text-success-600'}`}>
                            {isDebit ? '-' : '+'}{formatCurrency(txn.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Account Information</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Account ID</dt>
                      <dd className="font-mono text-slate-900">{formatAccountId(account.account_id)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Account Type</dt>
                      <dd className="text-slate-900">{account.account_type}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Segment</dt>
                      <dd className="text-slate-900">{account.account_segment}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Currency</dt>
                      <dd className="text-slate-900">{account.currency}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd>
                        <Badge variant={account.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {account.status}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Customer Information</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Customer ID</dt>
                      <dd className="font-mono text-slate-900">{account.customer_id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Name</dt>
                      <dd className="text-slate-900">{account.metadata.name as string}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="text-slate-900">{account.metadata.email as string}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Created</dt>
                      <dd className="text-slate-900">{formatDateTime(account.created_at)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Last Updated</dt>
                      <dd className="text-slate-900">{formatDateTime(account.updated_at)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { action: 'Balance inquiry', time: '2 minutes ago', user: 'API' },
                  { action: 'Transaction posted', time: '1 hour ago', user: 'System' },
                  { action: 'Account viewed', time: '3 hours ago', user: 'Admin' },
                  { action: 'Metadata updated', time: '1 day ago', user: 'Customer Service' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.action}</p>
                      <p className="text-sm text-slate-500">by {item.user}</p>
                    </div>
                    <span className="text-sm text-slate-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Freeze Modal */}
      <Modal
        open={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        title="Freeze Account"
        description="This will temporarily restrict all account activity"
        size="sm"
      >
        <form className="space-y-4">
          <Select
            label="Freeze Reason"
            options={freezeReasonOptions}
            placeholder="Select a reason"
          />
          <Input
            label="Notes"
            placeholder="Additional notes (optional)"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowFreezeModal(false)}>
              Cancel
            </Button>
            <Button variant="danger">
              <Snowflake className="h-4 w-4" />
              Freeze Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Funds"
        description="Move funds to another account"
        size="md"
      >
        <form className="space-y-4">
          <Input
            label="Destination Account"
            placeholder="Enter account ID"
          />
          <Input
            label="Amount"
            type="number"
            placeholder="0.00"
            hint={`Available: ${formatCurrency(account.balance.available_balance)}`}
          />
          <Input
            label="Description"
            placeholder="Transfer description"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button>
              <ArrowUpRight className="h-4 w-4" />
              Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal
        open={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Account"
        description="This action is permanent and cannot be undone"
        size="sm"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            The account balance of {formatCurrency(account.balance.available_balance)} must be transferred before closing.
          </Alert>
          <Input
            label="Reason for closure"
            placeholder="Enter reason"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button variant="danger">
              <XCircle className="h-4 w-4" />
              Close Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
