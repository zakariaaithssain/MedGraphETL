import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success';
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  loading = false,
  variant = 'default' 
}: StatCardProps) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md",
      variant === 'primary' && "border-primary/20 bg-primary/5",
      variant === 'success' && "border-success/20 bg-success/5"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-20 rounded bg-muted animate-pulse" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-lg p-2.5",
          variant === 'default' && "bg-secondary",
          variant === 'primary' && "bg-primary/10",
          variant === 'success' && "bg-success/10"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            variant === 'default' && "text-secondary-foreground",
            variant === 'primary' && "text-primary",
            variant === 'success' && "text-success"
          )} />
        </div>
      </div>
    </div>
  );
};
