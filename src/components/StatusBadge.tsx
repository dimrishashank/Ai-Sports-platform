import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  destructive: 'bg-red-100 text-red-700 border-red-200',
  outline: 'bg-transparent text-gray-500 border-gray-300',
};

export function StatusBadge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
}
