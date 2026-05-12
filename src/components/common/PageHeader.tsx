'use client';
import { Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
    title: string;
    createLabel?: string;
    createPath?: string;
    onCreateClick?: () => void;
    buttonStyle?: React.CSSProperties; // Thêm prop tuỳ chỉnh style cho button
}

export default function PageHeader({ title, createLabel, createPath, onCreateClick, buttonStyle }: PageHeaderProps) {
    const router = useRouter();

    const handleCreate = () => {
        if (onCreateClick) { onCreateClick(); return; }
        if (createPath) router.push(createPath as any);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Typography.Title level={4} style={{ margin: 0, color: '#1A2B5A' }}>
                {title}
            </Typography.Title>
            {createLabel && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={buttonStyle}>
                    {createLabel}
                </Button>
            )}
        </div>
    );
}