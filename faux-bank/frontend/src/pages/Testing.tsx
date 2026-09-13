import { useState } from 'react'
import {
  FlaskConical, Clock, AlertTriangle, Play, Pause, Trash2,
  RotateCcw, FastForward, Zap, Database, RefreshCw
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
import { formatDateTime } from '@/lib/utils'
import type { FailureInjection, FailureType } from '@/types'

// Mock data
const mockFailures: FailureInjection[] = [
  {
    failure_id: 'FAIL-001',
    failure_type: 'TIMEOUT',
    probability: 0.3,
    duration_seconds: 3600,
    affected_endpoints: ['/v1/transactions', '/v1/accounts'],
    created_at: '2024-12-21T10:00:00Z',
    expires_at: '2024-12-21T11:00:00Z',
  },
  {
    failure_id: 'FAIL-002',
    failure_type: 'DECLINED',
    probability: 0.5,
    duration_seconds: 1800,
    affected_endpoints: ['/v1/commercial/merchant/authorize'],
    created_at: '2024-12-21T09:30:00Z',
    expires_at: '2024-12-21T10:00:00Z',
  },
]

const mockSimulatedTime = {
  current_time: '2024-12-21T15:30:00Z',
  real_time: '2024-12-21T10:30:00Z',
  offset_seconds: 18000, // 5 hours ahead
}

const failureTypeOptions = [
  { value: 'DECLINED', label: 'Transaction Declined' },
  { value: 'TIMEOUT', label: 'Network Timeout' },
  { value: 'NETWORK_ERROR', label: 'Network Error' },
  { value: 'DUPLICATE_DETECTED', label: 'Duplicate Detected' },
]

const scenarioOptions = [
  { value: 'MINIMAL', label: 'Minimal - Basic setup' },
  { value: 'RETAIL_DEMO', label: 'Retail Demo - Consumer accounts' },
  { value: 'COMMERCIAL_DEMO', label: 'Commercial Demo - Business accounts' },
  { value: 'FULL', label: 'Full - Complete dataset' },
]

const timeAdvanceOptions = [
  { value: 'PT1H', label: '1 Hour' },
  { value: 'PT6H', label: '6 Hours' },
  { value: 'PT12H', label: '12 Hours' },
  { value: 'P1D', label: '1 Day' },
  { value: 'P7D', label: '1 Week' },
  { value: 'P30D', label: '30 Days' },
]

function FailureTypeBadge({ type }: { type: FailureType }) {
  const colors: Record<FailureType, string> = {
    DECLINED: 'bg-error-50 text-error-600',
    TIMEOUT: 'bg-warning-50 text-warning-600',
    NETWORK_ERROR: 'bg-slate-100 text-slate-700',
    DUPLICATE_DETECTED: 'bg-info-50 text-info-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

export function Testing() {
  const [failures, setFailures] = useState(mockFailures)
  const [simulatedTime, setSimulatedTime] = useState(mockSimulatedTime)
  const [showInjectModal, setShowInjectModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [isTimeRunning, setIsTimeRunning] = useState(true)

  const removeFailure = (id: string) => {
    setFailures(failures.filter((f) => f.failure_id !== id))
  }

  const formatOffset = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const days = Math.floor(hours / 24)
    if (days > 0) return `+${days} day${days > 1 ? 's' : ''}`
    return `+${hours} hour${hours > 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Testing & Simulation"
        subtitle="Control the simulation environment"
        actions={
          <Button variant="danger" onClick={() => setShowResetModal(true)}>
            <RotateCcw className="h-4 w-4" />
            Reset Environment
          </Button>
        }
      />

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="purple">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-purple-200 p-3">
                <Clock className="h-6 w-6 text-purple-700" />
              </div>
              <Badge variant="purple" className="gap-1">
                {isTimeRunning ? (
                  <>
                    <Play className="h-3 w-3" />
                    Running
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3" />
                    Paused
                  </>
                )}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-purple-700 mb-1">Simulated Time</p>
              <p className="text-2xl font-bold text-purple-900">
                {new Date(simulatedTime.current_time).toLocaleString()}
              </p>
              <p className="text-sm text-purple-600 mt-2">
                {formatOffset(simulatedTime.offset_seconds)} from real time
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTimeRunning(!isTimeRunning)}
              >
                {isTimeRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowTimeModal(true)}>
                <FastForward className="h-4 w-4" />
                Advance
              </Button>
              <Button variant="secondary" size="sm">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-warning-50 p-3">
                <Zap className="h-6 w-6 text-warning-600" />
              </div>
              <Badge variant={failures.length > 0 ? 'warning' : 'success'}>
                {failures.length > 0 ? `${failures.length} Active` : 'None Active'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Failure Injections</p>
              <p className="text-2xl font-bold text-slate-900">{failures.length}</p>
              <p className="text-sm text-slate-500 mt-2">
                Simulating network conditions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setShowInjectModal(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              Inject Failure
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-slate-100 p-3">
                <Database className="h-6 w-6 text-slate-600" />
              </div>
              <Badge variant="info">RETAIL_DEMO</Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Current Scenario</p>
              <p className="text-2xl font-bold text-slate-900">Retail Demo</p>
              <p className="text-sm text-slate-500 mt-2">
                Consumer banking setup
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setShowResetModal(true)}
            >
              <RefreshCw className="h-4 w-4" />
              Change Scenario
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="failures">
        <TabsList>
          <TabsTrigger value="failures">Failure Injection</TabsTrigger>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="logs">Simulation Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="failures">
          {failures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Failure ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Affected Endpoints</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((failure) => (
                  <TableRow key={failure.failure_id}>
                    <TableCell>
                      <span className="font-mono text-sm">{failure.failure_id}</span>
                    </TableCell>
                    <TableCell>
                      <FailureTypeBadge type={failure.failure_type} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning-500 rounded-full"
                            style={{ width: `${failure.probability * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600">
                          {(failure.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {failure.affected_endpoints?.map((endpoint) => (
                          <Badge key={endpoint} variant="outline" size="sm">
                            {endpoint.replace('/v1/', '')}
                          </Badge>
                        )) || <span className="text-slate-500">All endpoints</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">
                        {formatDateTime(failure.expires_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFailure(failure.failure_id)}
                      >
                        <Trash2 className="h-4 w-4 text-error-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Failures</h3>
                <p className="text-slate-500 mb-4">
                  Inject failures to simulate network conditions and edge cases
                </p>
                <Button onClick={() => setShowInjectModal(true)}>
                  <AlertTriangle className="h-4 w-4" />
                  Inject Failure
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scenarios">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: 'MINIMAL',
                title: 'Minimal',
                description: 'Basic setup with system accounts only',
                accounts: 2,
                transactions: 0,
              },
              {
                id: 'RETAIL_DEMO',
                title: 'Retail Demo',
                description: 'Consumer banking with sample customers',
                accounts: 50,
                transactions: 500,
              },
              {
                id: 'COMMERCIAL_DEMO',
                title: 'Commercial Demo',
                description: 'Business accounts with merchant processing',
                accounts: 30,
                transactions: 1000,
              },
              {
                id: 'FULL',
                title: 'Full Dataset',
                description: 'Complete simulation with all features',
                accounts: 200,
                transactions: 5000,
              },
            ].map((scenario) => (
              <Card key={scenario.id} interactive className="cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{scenario.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{scenario.description}</p>
                    </div>
                    <Badge variant="outline">{scenario.id}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Accounts:</span>{' '}
                      <span className="font-medium">{scenario.accounts}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Transactions:</span>{' '}
                      <span className="font-medium">{scenario.transactions}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Load Scenario
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Simulation Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 font-mono text-sm">
                {[
                  { time: '10:30:15', level: 'INFO', msg: 'Time advanced by PT1H' },
                  { time: '10:30:10', level: 'WARN', msg: 'Failure injection TIMEOUT activated' },
                  { time: '10:28:45', level: 'INFO', msg: 'Transaction TXN-001 affected by TIMEOUT' },
                  { time: '10:25:00', level: 'INFO', msg: 'Environment reset with RETAIL_DEMO' },
                  { time: '10:20:30', level: 'INFO', msg: 'Failure injection DECLINED removed' },
                ].map((log, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 p-2 rounded ${
                      log.level === 'WARN' ? 'bg-warning-50' : 'bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400">{log.time}</span>
                    <span
                      className={
                        log.level === 'WARN'
                          ? 'text-warning-600'
                          : log.level === 'ERROR'
                          ? 'text-error-600'
                          : 'text-info-600'
                      }
                    >
                      [{log.level}]
                    </span>
                    <span className="text-slate-700">{log.msg}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inject Failure Modal */}
      <Modal
        open={showInjectModal}
        onClose={() => setShowInjectModal(false)}
        title="Inject Network Failure"
        description="Simulate network conditions for testing"
        size="md"
      >
        <form className="space-y-4">
          <Select
            label="Failure Type"
            options={failureTypeOptions}
            placeholder="Select failure type"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Probability"
              type="number"
              placeholder="0.5"
              hint="0.0 to 1.0"
              min={0}
              max={1}
              step={0.1}
            />
            <Input
              label="Duration (seconds)"
              type="number"
              placeholder="3600"
              hint="How long the failure lasts"
            />
          </div>
          <Input
            label="Affected Endpoints"
            placeholder="/v1/transactions, /v1/accounts"
            hint="Comma-separated, or leave empty for all"
          />
          <Alert variant="warning">
            This will cause some API requests to fail. Make sure you're ready for testing.
          </Alert>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowInjectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger">
              <AlertTriangle className="h-4 w-4" />
              Inject Failure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Time Advance Modal */}
      <Modal
        open={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        title="Advance Simulated Time"
        description="Fast-forward the simulation clock"
        size="sm"
      >
        <form className="space-y-4">
          <Select
            label="Time to Advance"
            options={timeAdvanceOptions}
            placeholder="Select duration"
          />
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Current simulated time:</p>
            <p className="font-medium">{new Date(simulatedTime.current_time).toLocaleString()}</p>
          </div>
          <Alert variant="info">
            This will trigger scheduled events like interest accrual and authorization expiration.
          </Alert>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowTimeModal(false)}>
              Cancel
            </Button>
            <Button>
              <FastForward className="h-4 w-4" />
              Advance Time
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Environment Modal */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Environment"
        description="Clear all data and start fresh"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="error" title="Warning">
            This will delete all accounts, transactions, agents, and other data. This action cannot be undone.
          </Alert>
          <Select
            label="New Scenario"
            options={scenarioOptions}
            placeholder="Select scenario to load"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              defaultChecked
            />
            Seed with sample data
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="danger">
              <RotateCcw className="h-4 w-4" />
              Reset Environment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
