import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: ReactNode
  className?: string
  onClose?: () => void
}

function Alert({ variant = 'info', title, children, className, onClose }: AlertProps) {
  const variants = {
    info: {
      container: 'bg-info-50 border-info-500 text-info-600',
      icon: <Info className="h-5 w-5" />,
    },
    success: {
      container: 'bg-success-50 border-success-500 text-success-600',
      icon: <CheckCircle className="h-5 w-5" />,
    },
    warning: {
      container: 'bg-warning-50 border-warning-500 text-warning-600',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    error: {
      container: 'bg-error-50 border-error-500 text-error-600',
      icon: <AlertCircle className="h-5 w-5" />,
    },
  }

  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-lg border-l-4 p-4',
        variants[variant].container,
        className
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">{variants[variant].icon}</div>
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export { Alert }
