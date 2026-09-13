import { generateTraceId } from '@/lib/utils'
import type { ApiError } from '@/types'

const API_BASE = '/v1'

interface RequestOptions extends RequestInit {
  token?: string
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
    // Load token from localStorage on init
    this.token = localStorage.getItem('fauxbank_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('fauxbank_token', token)
    } else {
      localStorage.removeItem('fauxbank_token')
    }
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...init } = options
    const url = `${this.baseUrl}${endpoint}`
    const traceId = generateTraceId()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Trace-ID': traceId,
    }

    // Merge in any additional headers
    if (options.headers) {
      const additionalHeaders = options.headers as Record<string, string>
      Object.assign(headers, additionalHeaders)
    }

    const authToken = token || this.token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(url, {
      ...init,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        code: 'FB-0000',
        message: response.statusText || 'Unknown error',
        trace_id: traceId,
      }))
      throw new ApiClientError(error.message, error.code, response.status, error.details)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export class ApiClientError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export const api = new ApiClient()
