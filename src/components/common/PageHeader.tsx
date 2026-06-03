import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  createLabel?: string;
  createPath?: string;
  onCreateClick?: () => void;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, createLabel, createPath, onCreateClick, actions }: PageHeaderProps) {
  const router = useRouter();

  const handleCreate = () => {
    if (onCreateClick) { onCreateClick(); return; }
    if (createPath) router.push(createPath as any);
  };

  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-xl font-bold text-[#1A2B5A]">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {createLabel && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
