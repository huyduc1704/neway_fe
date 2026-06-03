import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <Card className={cn('mb-4', className)}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
