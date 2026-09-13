import { useState } from 'react'
import {
  Shield, FileCheck, AlertTriangle, Search, Filter,
  CheckCircle, XCircle, Clock, Eye, Upload, MessageSquare
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
import { Alert } from '@/components/ui/Alert'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { KycVerification, Dispute, KycStatus, DisputeStatus } from '@/types'

// Mock KYC data
const mockKycVerifications: KycVerification[] = [
  {
    verification_id: 'KYC-001',
    customer_id: 'CUST001',
    verification_type: 'IDENTITY',
    status: 'PENDING',
    documents: ['passport.pdf', 'selfie.jpg'],
    created_at: '2024-12-21T10:00:00Z',
  },
  {
    verification_id: 'KYC-002',
    customer_id: 'CUST002',
    verification_type: 'ADDRESS',
    status: 'VERIFIED',
    documents: ['utility_bill.pdf'],
    verified_by: 'admin@fauxbank.dev',
    created_at: '2024-12-20T14:00:00Z',
    verified_at: '2024-12-20T16:30:00Z',
  },
  {
    verification_id: 'KYC-003',
    customer_id: 'CUST003',
    verification_type: 'INCOME',
    status: 'PENDING',
    documents: ['pay_stub_1.pdf', 'pay_stub_2.pdf', 'tax_return.pdf'],
    created_at: '2024-12-19T09:00:00Z',
  },
  {
    verification_id: 'KYC-004',
    customer_id: 'CUST004',
    verification_type: 'BUSINESS',
    status: 'REJECTED',
    documents: ['business_license.pdf'],
    notes: 'Document expired. Please submit current license.',
    created_at: '2024-12-18T11:00:00Z',
    verified_at: '2024-12-19T10:00:00Z',
  },
  {
    verification_id: 'KYC-005',
    customer_id: 'CUST005',
    verification_type: 'IDENTITY',
    status: 'VERIFIED',
    documents: ['drivers_license.jpg'],
    verified_by: 'compliance@fauxbank.dev',
    created_at: '2024-12-17T15:00:00Z',
    verified_at: '2024-12-17T17:00:00Z',
  },
]

// Mock Disputes data
const mockDisputes: Dispute[] = [
  {
    dispute_id: 'DSP-001',
    transaction_id: 'TXN-2024121500001',
    account_id: 'CC00123456789012',
    dispute_type: 'UNAUTHORIZED',
    status: 'OPEN',
    amount: 15000,
    currency: 'FXUSD',
    description: 'I did not authorize this transaction',
    provisional_credit_issued: true,
    evidence: [],
    created_at: '2024-12-21T08:00:00Z',
    updated_at: '2024-12-21T08:00:00Z',
  },
  {
    dispute_id: 'DSP-002',
    transaction_id: 'TXN-2024121400002',
    account_id: 'CC00234567890123',
    dispute_type: 'NOT_RECEIVED',
    status: 'INVESTIGATING',
    amount: 45000,
    currency: 'FXUSD',
    description: 'Product never arrived after 3 weeks',
    provisional_credit_issued: false,
    evidence: ['shipping_tracking.pdf'],
    created_at: '2024-12-18T14:00:00Z',
    updated_at: '2024-12-20T10:00:00Z',
  },
  {
    dispute_id: 'DSP-003',
    transaction_id: 'TXN-2024121000003',
    account_id: 'CC00345678901234',
    dispute_type: 'WRONG_AMOUNT',
    status: 'RESOLVED_CUSTOMER',
    amount: 2500,
    currency: 'FXUSD',
    description: 'Charged $25 instead of $15',
    provisional_credit_issued: true,
    evidence: ['receipt.jpg'],
    resolution_notes: 'Merchant confirmed pricing error. Full credit issued.',
    created_at: '2024-12-10T16:00:00Z',
    updated_at: '2024-12-15T11:00:00Z',
    resolved_at: '2024-12-15T11:00:00Z',
  },
  {
    dispute_id: 'DSP-004',
    transaction_id: 'TXN-2024120500004',
    account_id: 'CC00456789012345',
    dispute_type: 'FRAUD',
    status: 'OPEN',
    amount: 125000,
    currency: 'FXUSD',
    description: 'Card was stolen and used for large purchase',
    provisional_credit_issued: true,
    evidence: ['police_report.pdf'],
    created_at: '2024-12-19T09:00:00Z',
    updated_at: '2024-12-19T09:30:00Z',
  },
]

const kycStatusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

const disputeStatusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'RESOLVED_MERCHANT', label: 'Resolved (Merchant)' },
  { value: 'RESOLVED_CUSTOMER', label: 'Resolved (Customer)' },
  { value: 'CLOSED', label: 'Closed' },
]

const disputeTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'UNAUTHORIZED', label: 'Unauthorized' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'WRONG_AMOUNT', label: 'Wrong Amount' },
  { value: 'NOT_RECEIVED', label: 'Not Received' },
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'FRAUD', label: 'Fraud' },
]

function KycStatusBadge({ status }: { status: KycStatus }) {
  const config: Record<KycStatus, { variant: 'success' | 'warning' | 'error' | 'default'; icon: React.ElementType }> = {
    PENDING: { variant: 'warning', icon: Clock },
    VERIFIED: { variant: 'success', icon: CheckCircle },
    REJECTED: { variant: 'error', icon: XCircle },
    EXPIRED: { variant: 'default', icon: Clock },
  }
  const { variant, icon: Icon } = config[status]
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  )
}

function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  const variants: Record<DisputeStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    OPEN: 'error',
    INVESTIGATING: 'warning',
    RESOLVED_MERCHANT: 'default',
    RESOLVED_CUSTOMER: 'success',
    CLOSED: 'default',
  }
  return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>
}

export function Compliance() {
  const [kycVerifications] = useState(mockKycVerifications)
  const [disputes] = useState(mockDisputes)
  const [kycStatusFilter, setKycStatusFilter] = useState('')
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('')
  const [showKycModal, setShowKycModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [selectedKyc, setSelectedKyc] = useState<KycVerification | null>(null)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)

  const pendingKyc = kycVerifications.filter((k) => k.status === 'PENDING').length
  const openDisputes = disputes.filter((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING').length
  const totalDisputeAmount = disputes
    .filter((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING')
    .reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Compliance Center"
        subtitle="KYC verification and dispute management"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending KYC</p>
                <p className="text-2xl font-bold text-warning-600">{pendingKyc}</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-2">
                <FileCheck className="h-5 w-5 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Open Disputes</p>
                <p className="text-2xl font-bold text-error-600">{openDisputes}</p>
              </div>
              <div className="rounded-lg bg-error-50 p-2">
                <AlertTriangle className="h-5 w-5 text-error-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Dispute Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalDisputeAmount)}</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Resolution Rate</p>
                <p className="text-2xl font-bold text-success-600">94%</p>
              </div>
              <div className="rounded-lg bg-success-50 p-2">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="kyc">
        <TabsList>
          <TabsTrigger value="kyc">
            KYC Verifications
            {pendingKyc > 0 && (
              <span className="ml-2 rounded-full bg-warning-500 px-2 py-0.5 text-xs text-white">
                {pendingKyc}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="disputes">
            Disputes
            {openDisputes > 0 && (
              <span className="ml-2 rounded-full bg-error-500 px-2 py-0.5 text-xs text-white">
                {openDisputes}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kyc">
          {/* KYC Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Search by customer ID..." className="pl-10" />
                  </div>
                </div>
                <Select
                  options={kycStatusOptions}
                  value={kycStatusFilter}
                  onChange={(e) => setKycStatusFilter(e.target.value)}
                  className="w-40"
                />
              </div>
            </CardContent>
          </Card>

          {/* KYC Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Verification ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kycVerifications
                .filter((k) => !kycStatusFilter || k.status === kycStatusFilter)
                .map((kyc) => (
                  <TableRow key={kyc.verification_id}>
                    <TableCell>
                      <span className="font-mono text-sm">{kyc.verification_id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{kyc.customer_id}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="purple">{kyc.verification_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Upload className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{kyc.documents.length} files</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <KycStatusBadge status={kyc.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">{formatDateTime(kyc.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedKyc(kyc)
                          setShowKycModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="disputes">
          {/* Dispute Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Search disputes..." className="pl-10" />
                  </div>
                </div>
                <Select
                  options={disputeStatusOptions}
                  value={disputeStatusFilter}
                  onChange={(e) => setDisputeStatusFilter(e.target.value)}
                  className="w-48"
                />
                <Select options={disputeTypeOptions} placeholder="All Types" className="w-40" />
              </div>
            </CardContent>
          </Card>

          {/* Disputes Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispute</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Provisional Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes
                .filter((d) => !disputeStatusFilter || d.status === disputeStatusFilter)
                .map((dispute) => (
                  <TableRow key={dispute.dispute_id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{dispute.dispute_id}</span>
                        <p className="text-xs text-slate-500 truncate max-w-48">{dispute.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dispute.dispute_type === 'FRAUD' ? 'error' : 'default'}>
                        {dispute.dispute_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-600">
                        ...{dispute.account_id.slice(-4)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium tabular-nums">{formatCurrency(dispute.amount)}</span>
                    </TableCell>
                    <TableCell>
                      {dispute.provisional_credit_issued ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Issued
                        </Badge>
                      ) : (
                        <Badge variant="default">Not Issued</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DisputeStatusBadge status={dispute.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">{formatDateTime(dispute.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDispute(dispute)
                          setShowDisputeModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* KYC Review Modal */}
      <Modal
        open={showKycModal}
        onClose={() => setShowKycModal(false)}
        title="KYC Verification Review"
        description={selectedKyc ? `Review verification ${selectedKyc.verification_id}` : ''}
        size="lg"
      >
        {selectedKyc && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Customer ID</p>
                <p className="font-mono">{selectedKyc.customer_id}</p>
              </div>
              <div>
                <p className="text-slate-500">Verification Type</p>
                <Badge variant="purple">{selectedKyc.verification_type}</Badge>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <KycStatusBadge status={selectedKyc.status} />
              </div>
              <div>
                <p className="text-slate-500">Submitted</p>
                <p>{formatDateTime(selectedKyc.created_at)}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-3">Submitted Documents</h4>
              <div className="space-y-2">
                {selectedKyc.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{doc}</span>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                ))}
              </div>
            </div>

            {selectedKyc.notes && (
              <Alert variant="warning" title="Previous Notes">
                {selectedKyc.notes}
              </Alert>
            )}

            {selectedKyc.status === 'PENDING' && (
              <div className="space-y-4">
                <Input label="Review Notes" placeholder="Add notes about your decision..." />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowKycModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button variant="success">
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Dispute Detail Modal */}
      <Modal
        open={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Dispute Details"
        description={selectedDispute ? `Dispute ${selectedDispute.dispute_id}` : ''}
        size="lg"
      >
        {selectedDispute && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Transaction ID</p>
                <p className="font-mono">{selectedDispute.transaction_id}</p>
              </div>
              <div>
                <p className="text-slate-500">Dispute Type</p>
                <Badge variant={selectedDispute.dispute_type === 'FRAUD' ? 'error' : 'default'}>
                  {selectedDispute.dispute_type}
                </Badge>
              </div>
              <div>
                <p className="text-slate-500">Amount</p>
                <p className="font-medium">{formatCurrency(selectedDispute.amount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <DisputeStatusBadge status={selectedDispute.status} />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Customer Description</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedDispute.description}</p>
            </div>

            {selectedDispute.evidence.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Evidence</h4>
                <div className="space-y-2">
                  {selectedDispute.evidence.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm">{doc}</span>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDispute.resolution_notes && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Resolution</h4>
                <p className="text-slate-600 bg-success-50 p-3 rounded-lg">{selectedDispute.resolution_notes}</p>
              </div>
            )}

            {(selectedDispute.status === 'OPEN' || selectedDispute.status === 'INVESTIGATING') && (
              <div className="space-y-4">
                <Input label="Resolution Notes" placeholder="Add resolution notes..." />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowDisputeModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4" />
                    Request More Info
                  </Button>
                  <Button>Resolve Dispute</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
