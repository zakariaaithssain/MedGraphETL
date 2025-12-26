import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  className?: string;
}

// Generate a consistent color based on label hash
const generateColorClass = (label: string): string => {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-yellow-100 text-yellow-700 border-yellow-200',
  ];
  
  // Simple hash function to get consistent color for same label
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash) + label.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const LabelBadge = ({ label, variant = 'default', className }: LabelBadgeProps) => {
  const colorClass = generateColorClass(label);
  
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
