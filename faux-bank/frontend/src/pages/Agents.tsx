import { useState } from 'react'
import {
  Bot, Plus, Key, Shield, Activity, Pause, Play,
  Trash2, Settings, Copy, Eye, EyeOff, Search
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table'
import { PageHeader } from '@/components/layout/Header'
import { Alert } from '@/components/ui/Alert'
import { formatDateTime } from '@/lib/utils'
import type { Agent, AgentType, AgentStatus, AgentCapability } from '@/types'

// Mock data
const mockAgents: Agent[] = [
  {
    agent_id: 'agent-ecomm-001',
    agent_type: 'ECOMMERCE_MERCHANT',
    name: 'Acme Store Integration',
    description: 'E-commerce payment processing for Acme Store',
    status: 'ACTIVE',
    capabilities: ['MERCHANT_PROCESSING', 'TRANSACTION_READ', 'BALANCE_READ'],
    rate_limit_requests_per_minute: 100,
    rate_limit_transactions_per_minute: 50,
    daily_transaction_limit: 100000000,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-12-21T08:00:00Z',
  },
  {
    agent_id: 'agent-cs-001',
    agent_type: 'CUSTOMER_SERVICE',
    name: 'Support Portal Agent',
    description: 'Customer service representative access',
    status: 'ACTIVE',
    capabilities: ['ACCOUNT_READ', 'TRANSACTION_READ', 'BALANCE_READ'],
    rate_limit_requests_per_minute: 60,
    rate_limit_transactions_per_minute: 0,
    daily_transaction_limit: 0,
    created_at: '2024-07-20T14:30:00Z',
    updated_at: '2024-12-20T16:00:00Z',
  },
  {
    agent_id: 'agent-treasury-001',
    agent_type: 'TREASURY_MANAGEMENT',
    name: 'Corporate Treasury',
    description: 'Treasury operations and wire transfers',
    status: 'ACTIVE',
    capabilities: ['ACCOUNT_READ', 'ACCOUNT_WRITE', 'BALANCE_READ', 'WIRE_ORIGINATE', 'PAYMENT_INITIATE'],
    rate_limit_requests_per_minute: 30,
    rate_limit_transactions_per_minute: 10,
    daily_transaction_limit: 1000000000,
    created_at: '2024-08-05T09:00:00Z',
    updated_at: '2024-12-21T07:30:00Z',
  },
  {
    agent_id: 'agent-analytics-001',
    agent_type: 'ANALYTICS',
    name: 'Reporting Dashboard',
    description: 'Read-only analytics and reporting',
    status: 'ACTIVE',
    capabilities: ['ACCOUNT_READ', 'TRANSACTION_READ', 'BALANCE_READ'],
    rate_limit_requests_per_minute: 200,
    rate_limit_transactions_per_minute: 0,
    daily_transaction_limit: 0,
    created_at: '2024-09-10T11:00:00Z',
    updated_at: '2024-12-19T22:00:00Z',
  },
  {
    agent_id: 'agent-compliance-001',
    agent_type: 'COMPLIANCE',
    name: 'AML/KYC System',
    description: 'Compliance monitoring and KYC processing',
    status: 'ACTIVE',
    capabilities: ['ACCOUNT_READ', 'TRANSACTION_READ', 'COMPLIANCE_READ', 'COMPLIANCE_WRITE'],
    rate_limit_requests_per_minute: 50,
    rate_limit_transactions_per_minute: 20,
    daily_transaction_limit: 0,
    created_at: '2024-10-01T08:00:00Z',
    updated_at: '2024-12-21T06:00:00Z',
  },
  {
    agent_id: 'agent-test-001',
    agent_type: 'ADMIN',
    name: 'Test Agent (Suspended)',
    description: 'Development testing agent',
    status: 'SUSPENDED',
    capabilities: ['ACCOUNT_READ'],
    rate_limit_requests_per_minute: 10,
    rate_limit_transactions_per_minute: 5,
    daily_transaction_limit: 100000,
    created_at: '2024-11-15T13:00:00Z',
    updated_at: '2024-12-18T10:00:00Z',
  },
]

const agentTypeOptions = [
  { value: 'ECOMMERCE_MERCHANT', label: 'E-commerce Merchant' },
  { value: 'CUSTOMER_SERVICE', label: 'Customer Service' },
  { value: 'TREASURY_MANAGEMENT', label: 'Treasury Management' },
  { value: 'ANALYTICS', label: 'Analytics' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'ADMIN', label: 'Admin' },
]

const capabilityOptions = [
  { value: 'ACCOUNT_READ', label: 'Read Accounts' },
  { value: 'ACCOUNT_WRITE', label: 'Write Accounts' },
  { value: 'BALANCE_READ', label: 'Read Balances' },
  { value: 'TRANSACTION_READ', label: 'Read Transactions' },
  { value: 'PAYMENT_INITIATE', label: 'Initiate Payments' },
  { value: 'MERCHANT_PROCESSING', label: 'Merchant Processing' },
  { value: 'WIRE_ORIGINATE', label: 'Originate Wires' },
  { value: 'COMPLIANCE_READ', label: 'Read Compliance' },
  { value: 'COMPLIANCE_WRITE', label: 'Write Compliance' },
]

function StatusBadge({ status }: { status: AgentStatus }) {
  const variants: Record<AgentStatus, 'success' | 'warning' | 'error'> = {
    ACTIVE: 'success',
    SUSPENDED: 'warning',
    REVOKED: 'error',
  }
  return <Badge variant={variants[status]}>{status}</Badge>
}

function AgentTypeBadge({ type }: { type: AgentType }) {
  const colors: Record<AgentType, string> = {
    ECOMMERCE_MERCHANT: 'bg-purple-100 text-purple-700',
    CUSTOMER_SERVICE: 'bg-info-50 text-info-600',
    TREASURY_MANAGEMENT: 'bg-success-50 text-success-600',
    ANALYTICS: 'bg-slate-100 text-slate-700',
    COMPLIANCE: 'bg-warning-50 text-warning-600',
    ADMIN: 'bg-error-50 text-error-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

export function Agents() {
  const [agents] = useState(mockAgents)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [generatedToken, setGeneratedToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.agent_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = agents.filter((a) => a.status === 'ACTIVE').length

  const handleRegister = () => {
    // Simulate token generation
    const token = 'fb_live_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    setGeneratedToken(token)
    setShowRegisterModal(false)
    setShowTokenModal(true)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(generatedToken)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Agent Management"
        subtitle={`${activeCount} active agents`}
        actions={
          <Button onClick={() => setShowRegisterModal(true)}>
            <Plus className="h-4 w-4" />
            Register Agent
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Agents</p>
                <p className="text-2xl font-bold text-slate-900">{agents.length}</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-success-600">{activeCount}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-2">
                <Activity className="h-5 w-5 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Suspended</p>
                <p className="text-2xl font-bold text-warning-600">
                  {agents.filter((a) => a.status === 'SUSPENDED').length}
                </p>
              </div>
              <div className="rounded-lg bg-warning-50 p-2">
                <Pause className="h-5 w-5 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">API Calls Today</p>
                <p className="text-2xl font-bold text-slate-900">12,847</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2">
                <Activity className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capabilities</TableHead>
            <TableHead>Rate Limits</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAgents.map((agent) => (
            <TableRow key={agent.agent_id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Bot className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{agent.agent_id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <AgentTypeBadge type={agent.agent_type} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {agent.capabilities.slice(0, 3).map((cap) => (
                    <Badge key={cap} variant="outline" size="sm">
                      {cap.replace('_', ' ')}
                    </Badge>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <Badge variant="outline" size="sm">
                      +{agent.capabilities.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>{agent.rate_limit_requests_per_minute} req/min</p>
                  {agent.rate_limit_transactions_per_minute > 0 && (
                    <p className="text-slate-500">{agent.rate_limit_transactions_per_minute} txn/min</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={agent.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-slate-500">
                  {formatDateTime(agent.updated_at)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {agent.status === 'ACTIVE' ? (
                    <Button variant="ghost" size="sm" title="Suspend">
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : agent.status === 'SUSPENDED' ? (
                    <Button variant="ghost" size="sm" title="Reactivate">
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" title="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Revoke">
                    <Trash2 className="h-4 w-4 text-error-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Register Modal */}
      <Modal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register New Agent"
        description="Create API credentials for a new integration"
        size="md"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
          <Input label="Agent Name" placeholder="My Integration" required />
          <Input label="Description" placeholder="What this agent does" />
          <Select
            label="Agent Type"
            options={agentTypeOptions}
            placeholder="Select type"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Capabilities</label>
            <div className="grid grid-cols-2 gap-2">
              {capabilityOptions.map((cap) => (
                <label key={cap.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                  {cap.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Requests/min"
              type="number"
              placeholder="60"
              defaultValue="60"
            />
            <Input
              label="Transactions/min"
              type="number"
              placeholder="10"
              defaultValue="10"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Key className="h-4 w-4" />
              Generate Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* Token Modal */}
      <Modal
        open={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Agent Registered Successfully"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="warning" title="Important">
            This is the only time you'll see this token. Store it securely.
          </Alert>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">API Token</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={generatedToken}
                  readOnly
                  className="font-mono pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="outline" onClick={copyToken}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <h4 className="font-medium text-slate-900 mb-2">Quick Start</h4>
            <pre className="text-xs text-slate-600 overflow-x-auto">
{`curl -X GET "https://api.fauxbank.dev/v1/accounts" \\
  -H "Authorization: Bearer ${generatedToken.slice(0, 20)}..." \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowTokenModal(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
