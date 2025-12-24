import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  className?: string;
}

const colorMap: Record<string, string> = {
  'Patient': 'bg-blue-100 text-blue-700 border-blue-200',
  'Doctor': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Disease': 'bg-rose-100 text-rose-700 border-rose-200',
  'Drug': 'bg-purple-100 text-purple-700 border-purple-200',
  'Symptom': 'bg-amber-100 text-amber-700 border-amber-200',
  'Treatment': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Hospital': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'default': 'bg-secondary text-secondary-foreground border-border',
};

export const LabelBadge = ({ label, variant = 'default', className }: LabelBadgeProps) => {
  const colorClass = colorMap[label] || colorMap['default'];
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
      variant === 'default' && colorClass,
      variant === 'primary' && "bg-primary/10 text-primary border-primary/20",
      variant === 'secondary' && "bg-secondary text-secondary-foreground border-border",
      variant === 'outline' && "bg-transparent border-border text-muted-foreground",
      className
    )}>
      {label}
    </span>
  );
};
