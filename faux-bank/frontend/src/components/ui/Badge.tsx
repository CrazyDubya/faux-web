import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'purple' | 'success' | 'warning' | 'error' | 'info' | 'outline'
  size?: 'sm' | 'md'
}

function Badge({ className, variant = 'default', size = 'md', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    purple: 'bg-purple-100 text-purple-700',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
    info: 'bg-info-50 text-info-600',
    outline: 'border border-slate-300 text-slate-600 bg-white',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
