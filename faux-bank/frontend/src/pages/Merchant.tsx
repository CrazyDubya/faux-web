import { useState } from 'react'
import {
  CreditCard, Store, DollarSign, Clock, CheckCircle,
  XCircle, RefreshCw, Search, Filter, Plus, RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Authorization, AuthorizationStatus } from '@/types'

// Mock data
const mockAuthorizations: Authorization[] = [
  {
    authorization_id: 'AUTH-001',
    merchant_account: 'MC00456789012345',
    card_account: 'CC00123456789012',
    amount: 15000,
    captured_amount: 0,
    currency: 'FXUSD',
    status: 'PENDING',
    merchant_category_code: '5411',
    merchant_name: 'SuperMart Grocery',
    expires_at: '2024-12-28T12:00:00Z',
    created_at: '2024-12-21T12:00:00Z',
  },
  {
    authorization_id: 'AUTH-002',
    merchant_account: 'MC00567890123456',
    card_account: 'CC00234567890123',
    amount: 45000,
    captured_amount: 45000,
    currency: 'FXUSD',
    status: 'CAPTURED',
    merchant_category_code: '5812',
    merchant_name: 'Fine Dining Restaurant',
    expires_at: '2024-12-25T14:30:00Z',
    created_at: '2024-12-18T14:30:00Z',
  },
  {
    authorization_id: 'AUTH-003',
    merchant_account: 'MC00678901234567',
    card_account: 'CC00345678901234',
    amount: 125000,
    captured_amount: 100000,
    currency: 'FXUSD',
    status: 'PARTIAL_CAPTURE',
    merchant_category_code: '5311',
    merchant_name: 'Department Store',
    expires_at: '2024-12-27T10:00:00Z',
    created_at: '2024-12-20T10:00:00Z',
  },
  {
    authorization_id: 'AUTH-004',
    merchant_account: 'MC00789012345678',
    card_account: 'CC00456789012345',
    amount: 8500,
    captured_amount: 0,
    currency: 'FXUSD',
    status: 'VOIDED',
    merchant_category_code: '5541',
    merchant_name: 'Gas Station',
    expires_at: '2024-12-24T08:15:00Z',
    created_at: '2024-12-17T08:15:00Z',
  },
  {
    authorization_id: 'AUTH-005',
    merchant_account: 'MC00890123456789',
    card_account: 'CC00567890123456',
    amount: 250000,
    captured_amount: 0,
    currency: 'FXUSD',
    status: 'EXPIRED',
    merchant_category_code: '5732',
    merchant_name: 'Electronics Store',
    expires_at: '2024-12-14T16:00:00Z',
    created_at: '2024-12-07T16:00:00Z',
  },
]

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CAPTURED', label: 'Captured' },
  { value: 'PARTIAL_CAPTURE', label: 'Partial Capture' },
  { value: 'VOIDED', label: 'Voided' },
  { value: 'EXPIRED', label: 'Expired' },
]

const mccOptions = [
  { value: '', label: 'All Categories' },
  { value: '5411', label: '5411 - Grocery Stores' },
  { value: '5812', label: '5812 - Restaurants' },
  { value: '5311', label: '5311 - Department Stores' },
  { value: '5541', label: '5541 - Gas Stations' },
  { value: '5732', label: '5732 - Electronics' },
]

function StatusBadge({ status }: { status: AuthorizationStatus }) {
  const config: Record<AuthorizationStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: React.ElementType }> = {
    PENDING: { variant: 'warning', icon: Clock },
    CAPTURED: { variant: 'success', icon: CheckCircle },
    VOIDED: { variant: 'default', icon: XCircle },
    EXPIRED: { variant: 'error', icon: Clock },
    PARTIAL_CAPTURE: { variant: 'info', icon: RefreshCw },
  }
  const { variant, icon: Icon } = config[status]
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {status.replace('_', ' ')}
    </Badge>
  )
}

export function Merchant() {
  const [authorizations] = useState(mockAuthorizations)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false)
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [selectedAuth, setSelectedAuth] = useState<Authorization | null>(null)

  const filteredAuths = authorizations.filter((auth) => {
    const matchesSearch =
      auth.authorization_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auth.merchant_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || auth.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = authorizations.filter((a) => a.status === 'PENDING').length
  const totalPendingAmount = authorizations
    .filter((a) => a.status === 'PENDING')
    .reduce((sum, a) => sum + a.amount, 0)
  const capturedToday = authorizations.filter(
    (a) => a.status === 'CAPTURED' && new Date(a.created_at).toDateString() === new Date().toDateString()
  )

  const handleCapture = (auth: Authorization) => {
    setSelectedAuth(auth)
    setShowCaptureModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Merchant Operations"
        subtitle="Payment processing and authorizations"
        actions={
          <Button onClick={() => setShowAuthorizeModal(true)}>
            <CreditCard className="h-4 w-4" />
            New Authorization
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Authorizations</p>
                <p className="text-2xl font-bold text-warning-600">{pendingCount}</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-2">
                <Clock className="h-5 w-5 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPendingAmount)}</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Captured Today</p>
                <p className="text-2xl font-bold text-success-600">{capturedToday.length}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-2">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Merchants</p>
                <p className="text-2xl font-bold text-slate-900">47</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2">
                <Store className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="authorizations">
        <TabsList>
          <TabsTrigger value="authorizations">Authorizations</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>
        </TabsList>

        <TabsContent value="authorizations">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by auth ID or merchant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-44"
                />
                <Select
                  options={mccOptions}
                  placeholder="MCC Category"
                  className="w-52"
                />
              </div>
            </CardContent>
          </Card>

          {/* Authorizations Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Authorization</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Card Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Captured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuths.map((auth) => (
                <TableRow key={auth.authorization_id}>
                  <TableCell>
                    <span className="font-mono text-sm">{auth.authorization_id}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{auth.merchant_name}</p>
                      <p className="text-xs text-slate-500">MCC: {auth.merchant_category_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-slate-600">
                      ...{auth.card_account.slice(-4)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium tabular-nums">{formatCurrency(auth.amount)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium tabular-nums ${auth.captured_amount > 0 ? 'text-success-600' : 'text-slate-400'}`}>
                      {formatCurrency(auth.captured_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={auth.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {new Date(auth.expires_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {auth.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCapture(auth)}
                          >
                            Capture
                          </Button>
                          <Button variant="ghost" size="sm">
                            Void
                          </Button>
                        </>
                      )}
                      {auth.status === 'CAPTURED' && (
                        <Button variant="ghost" size="sm">
                          Refund
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="settlements">
          <Card>
            <CardContent className="p-8 text-center">
              <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Settlement Batches</h3>
              <p className="text-slate-500 mb-4">View and manage daily settlement batches</p>
              <Button variant="outline">View Settlement History</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chargebacks">
          <Card>
            <CardContent className="p-8 text-center">
              <RotateCcw className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Chargeback Management</h3>
              <p className="text-slate-500 mb-4">Handle dispute chargebacks and reversals</p>
              <Button variant="outline">Simulate Chargeback</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Authorize Modal */}
      <Modal
        open={showAuthorizeModal}
        onClose={() => setShowAuthorizeModal(false)}
        title="Create Authorization"
        description="Request a card hold for a transaction"
        size="md"
      >
        <form className="space-y-4">
          <Input label="Merchant Account" placeholder="Merchant account ID" />
          <Input label="Card Account" placeholder="Card account ID" />
          <Input label="Amount" type="number" placeholder="0.00" hint="Amount in F$" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Merchant Name" placeholder="Merchant business name" />
            <Select
              label="MCC Category"
              options={mccOptions.filter((o) => o.value)}
              placeholder="Select category"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAuthorizeModal(false)}>
              Cancel
            </Button>
            <Button>
              <CreditCard className="h-4 w-4" />
              Create Authorization
            </Button>
          </div>
        </form>
      </Modal>

      {/* Capture Modal */}
      <Modal
        open={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        title="Capture Authorization"
        description={selectedAuth ? `Capture funds for ${selectedAuth.merchant_name}` : ''}
        size="sm"
      >
        {selectedAuth && (
          <form className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Authorization ID</span>
                <span className="font-mono">{selectedAuth.authorization_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Authorized Amount</span>
                <span className="font-medium">{formatCurrency(selectedAuth.amount)}</span>
              </div>
            </div>
            <Input
              label="Capture Amount"
              type="number"
              placeholder="0.00"
              hint={`Max: ${formatCurrency(selectedAuth.amount - selectedAuth.captured_amount)}`}
              defaultValue={(selectedAuth.amount / 100).toFixed(2)}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCaptureModal(false)}>
                Cancel
              </Button>
              <Button variant="success">
                <CheckCircle className="h-4 w-4" />
                Capture
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
