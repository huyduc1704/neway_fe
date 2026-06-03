import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color = '#E8890C', className, sub }: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          {icon && (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
              <span style={{ color }}>{icon}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
