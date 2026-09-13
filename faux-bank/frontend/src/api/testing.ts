import { api } from './client'
import type { FailureInjection, SimulatedTime, FailureType, PaginatedResponse } from '@/types'

export interface InjectFailureRequest {
  failure_type: FailureType
  probability: number
  duration_seconds: number
  affected_endpoints?: string[]
}

export interface AdvanceTimeRequest {
  duration: string // ISO 8601 duration (e.g., "P1D", "PT1H", "PT30M")
}

export type TestScenario = 'MINIMAL' | 'RETAIL_DEMO' | 'COMMERCIAL_DEMO' | 'FULL'

export interface ResetEnvironmentRequest {
  scenario?: TestScenario
  seed_data?: boolean
}

export interface EnvironmentStatus {
  simulated_time: SimulatedTime
  active_failures: FailureInjection[]
  account_count: number
  transaction_count: number
  agent_count: number
}

export const testingApi = {
  // Failure Injection
  injectFailure(data: InjectFailureRequest): Promise<FailureInjection> {
    return api.post('/testing/network/inject-failure', data)
  },

  removeFailure(failureId: string): Promise<void> {
    return api.delete(`/testing/network/inject-failure/${failureId}`)
  },

  listFailures(): Promise<PaginatedResponse<FailureInjection>> {
    return api.get('/testing/network/failures')
  },

  // Time Management
  advanceTime(data: AdvanceTimeRequest): Promise<SimulatedTime> {
    return api.post('/testing/time/advance', data)
  },

  getTime(): Promise<SimulatedTime> {
    return api.get('/testing/time')
  },

  resetTime(): Promise<SimulatedTime> {
    return api.post('/testing/time/reset')
  },

  // Environment
  reset(data?: ResetEnvironmentRequest): Promise<EnvironmentStatus> {
    return api.post('/testing/reset', data)
  },

  getStatus(): Promise<EnvironmentStatus> {
    return api.get('/testing/status')
  },
}
