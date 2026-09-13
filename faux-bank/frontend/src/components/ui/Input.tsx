import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, hint, id, ...props }, ref) => {
    const inputId = id || props.name

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-error-500 focus:border-error-500 focus:ring-error-200'
              : 'border-slate-300 focus:border-purple-500 focus:ring-purple-200',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
            className
          )}
          ref={ref}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-slate-500">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-error-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
