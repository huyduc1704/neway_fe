import { Spin } from 'antd';

export default function DashboardLoading() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
            <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
    );
}
