import { useState, useCallback, useEffect } from 'react'
import { ApiClientError } from '@/api/client'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: ApiClientError | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>
  reset: () => void
  setData: (data: T | null) => void
}

export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options?: { immediate?: boolean; args?: unknown[] }
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options?.immediate ?? false,
    error: null,
  })

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const result = await apiFunction(...args)
        setState({ data: result, loading: false, error: null })
        return result
      } catch (err) {
        const error =
          err instanceof ApiClientError
            ? err
            : new ApiClientError(
                err instanceof Error ? err.message : 'Unknown error',
                'FB-0000',
                500
              )
        setState({ data: null, loading: false, error })
        return null
      }
    },
    [apiFunction]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }))
  }, [])

  useEffect(() => {
    if (options?.immediate) {
      execute(...(options.args || []))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, execute, reset, setData }
}

// Hook for queries that auto-fetch
export function useQuery<T>(
  apiFunction: () => Promise<T>,
  deps: unknown[] = []
): UseApiState<T> & { refetch: () => Promise<T | null> } {
  const { data, loading, error, execute } = useApi(apiFunction, { immediate: true })

  useEffect(() => {
    execute()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: execute }
}

// Hook for mutations
export function useMutation<T, TArgs extends unknown[]>(
  apiFunction: (...args: TArgs) => Promise<T>
): UseApiReturn<T> & { mutate: (...args: TArgs) => Promise<T | null> } {
  const result = useApi(apiFunction as (...args: unknown[]) => Promise<T>)

  const mutate = useCallback(
    (...args: TArgs) => result.execute(...args),
    [result]
  )

  return { ...result, mutate }
}
