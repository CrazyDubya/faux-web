import { api } from './client'
import type { Agent, AgentType, AgentCapability, PaginatedResponse } from '@/types'

export interface RegisterAgentRequest {
  agent_type: AgentType
  name: string
  description?: string
  capabilities?: AgentCapability[]
  rate_limit_requests_per_minute?: number
  rate_limit_transactions_per_minute?: number
  daily_transaction_limit?: number
}

export interface RegisterAgentResponse {
  agent: Agent
  token: string
}

export interface UpdateAgentScopeRequest {
  account_patterns?: string[]
  transaction_types?: string[]
  capabilities?: AgentCapability[]
}

export interface ListAgentsParams {
  agent_type?: AgentType
  status?: string
  limit?: number
  offset?: number
}

export const agentsApi = {
  register(data: RegisterAgentRequest): Promise<RegisterAgentResponse> {
    return api.post('/agents/register', data)
  },

  get(agentId: string): Promise<Agent> {
    return api.get(`/agents/${agentId}`)
  },

  list(params?: ListAgentsParams): Promise<PaginatedResponse<Agent>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const queryString = query.toString()
    return api.get(`/agents${queryString ? `?${queryString}` : ''}`)
  },

  updateScope(agentId: string, data: UpdateAgentScopeRequest): Promise<Agent> {
    return api.post(`/agents/${agentId}/scope`, data)
  },

  suspend(agentId: string, reason?: string): Promise<Agent> {
    return api.post(`/agents/${agentId}/suspend`, { reason })
  },

  revoke(agentId: string, reason?: string): Promise<Agent> {
    return api.post(`/agents/${agentId}/revoke`, { reason })
  },

  reactivate(agentId: string): Promise<Agent> {
    return api.post(`/agents/${agentId}/reactivate`)
  },
}
