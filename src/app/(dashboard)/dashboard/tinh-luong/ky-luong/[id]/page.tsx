'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { message, Table, Button, Tag, Card, Typography, Space, Tabs, Popconfirm, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeft, CheckCheck, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TxRow {
    id: string;
    transactionCode: string;
    actualValue: number | null;
    transactedAt: string;
    payrollPeriodId: string | null;
    project: { id: string; code: string; ward: string } | null;
    branch: { id: string; name: string } | null;
    customer: { id: string; fullName: string } | null;
    assignments: Array<{
        employeeId: string;
        sharePercent: number | null;
        roleInProject: string;
        employee: { employeeCode: string; user: { fullName: string } };
    }>;
}

const fmtCurrency = (v: number | null | undefined) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';

export default function KyLuongDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [period, setPeriod] = useState<{ code: string; periodStart: string; periodEnd: string; isLocked: boolean } | null>(null);
    const [assignable, setAssignable] = useState<TxRow[]>([]);
    const [assigned, setAssigned] = useState<TxRow[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [activeTab, setActiveTab] = useState('assignable');

    const fetchPeriod = useCallback(async () => {
        try {
            const { data } = await api.get(`/payroll/periods/${id}`);
            setPeriod(data);
        } catch { message.error('Không thể tải thông tin kỳ lương'); }
    }, [id]);

    const fetchAssignable = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/payroll/periods/${id}/assignable-transactions`);
            setAssignable(data);
        } catch { message.error('Không thể tải danh sách giao dịch'); }
        finally { setLoading(false); }
    }, [id]);

    const fetchAssigned = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/payroll/periods/${id}/assigned-transactions`);
            setAssigned(data);
        } catch { message.error('Không thể tải giao dịch đã gán'); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => {
        fetchPeriod();
        fetchAssignable();
        fetchAssigned();
    }, [fetchPeriod, fetchAssignable, fetchAssigned]);

    const handleAssign = async () => {
        if (!selectedKeys.length) { message.warning('Chọn ít nhất 1 giao dịch để gán'); return; }
        setAssigning(true);
        try {
            const { data } = await api.post(`/payroll/periods/${id}/assign-transactions`, { transactionIds: selectedKeys });
            message.success(`Đã gán ${data.assigned} giao dịch vào kỳ lương`);
            setSelectedKeys([]);
            fetchAssignable();
            fetchAssigned();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setAssigning(false); }
    };

    const handleUnassign = async (txId: string) => {
        try {
            await api.delete(`/payroll/periods/${id}/transactions/${txId}/unassign`);
            message.success('Đã bỏ gán giao dịch');
            fetchAssignable();
            fetchAssigned();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const assignableColumns: ColumnsType<TxRow> = [
        { title: 'Mã GD', key: 'code', width: 140, render: (_, r) => <Tag color="orange">{r.transactionCode}</Tag> },
        {
            title: 'Dự án / Phòng', key: 'project',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project?.code || '—'}</div>
                    {r.project?.ward && <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.project.ward}</div>}
                </div>
            ),
        },
        { title: 'Khách hàng', key: 'customer', width: 160, render: (_, r) => r.customer?.fullName || '—' },
        {
            title: 'Giá trị TT', key: 'value', width: 140, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{fmtCurrency(r.actualValue)}</span>,
        },
        { title: 'Ngày GD', key: 'date', width: 110, align: 'center', render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY') },
        {
            title: 'Đang ở kỳ', key: 'period', width: 120, align: 'center',
            render: (_, r) => r.payrollPeriodId
                ? <Tag color="blue">Kỳ này</Tag>
                : <Tag color="default">Chưa gán</Tag>,
        },
    ];

    const assignedColumns: ColumnsType<TxRow> = [
        { title: 'Mã GD', key: 'code', width: 140, render: (_, r) => <Tag color="orange">{r.transactionCode}</Tag> },
        {
            title: 'Dự án', key: 'project',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project?.code || '—'}</div>
                    {r.project?.ward && <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.project.ward}</div>}
                </div>
            ),
        },
        { title: 'Khách hàng', key: 'customer', width: 160, render: (_, r) => r.customer?.fullName || '—' },
        {
            title: 'Giá trị TT', key: 'value', width: 140, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{fmtCurrency(r.actualValue)}</span>,
        },
        { title: 'Ngày GD', key: 'date', width: 110, align: 'center', render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY') },
        {
            title: 'Nhân viên liên quan', key: 'staff', width: 200,
            render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    {r.assignments.slice(0, 3).map((a, i) => (
                        <div key={i}>{a.employee.user.fullName} <Text type="secondary">({a.sharePercent}%)</Text></div>
                    ))}
                    {r.assignments.length > 3 && <Text type="secondary">+{r.assignments.length - 3} người</Text>}
                </div>
            ),
        },
        {
            title: 'Thao tác', key: 'actions', width: 90, align: 'center',
            render: (_, r) => !period?.isLocked ? (
                <Popconfirm
                    title="Bỏ gán giao dịch này khỏi kỳ lương?"
                    onConfirm={() => handleUnassign(r.id)}
                    okText="Bỏ gán"
                    cancelText="Huỷ"
                >
                    <button style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Trash2 size={16} />
                    </button>
                </Popconfirm>
            ) : null,
        },
    ];

    const totalAssignedValue = assigned.reduce((sum, tx) => sum + Number(tx.actualValue ?? 0), 0);

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        Gán giao dịch — {period?.code ?? '...'}
                    </Title>
                    {period && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {dayjs(period.periodStart).format('DD/MM/YYYY')} – {dayjs(period.periodEnd).format('DD/MM/YYYY')}
                            {period.isLocked && <Tag color="blue" style={{ marginLeft: 8 }}>Đã khoá</Tag>}
                        </Text>
                    )}
                </div>
            </div>

            {/* Summary bar */}
            <Card style={{ marginBottom: 16, background: '#f8fafc' }} bodyStyle={{ padding: '12px 20px' }}>
                <Space size={32}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Đã gán</Text>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#1A2B5A' }}>
                            <Badge count={assigned.length} showZero color="#3b82f6" style={{ fontSize: 13 }} />
                            &nbsp;giao dịch
                        </div>
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Tổng giá trị</Text>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#E8890C' }}>{fmtCurrency(totalAssignedValue)}</div>
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Chưa gán</Text>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>
                            {assignable.filter(t => !t.payrollPeriodId).length} giao dịch có thể chọn
                        </div>
                    </div>
                </Space>
            </Card>

            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'assignable',
                            label: (
                                <span>
                                    Chưa gán &nbsp;
                                    <Badge count={assignable.filter(t => !t.payrollPeriodId).length} showZero color="#9ca3af" size="small" />
                                </span>
                            ),
                            children: (
                                <>
                                    {!period?.isLocked && (
                                        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <Button
                                                type="primary"
                                                icon={<CheckCheck size={14} />}
                                                loading={assigning}
                                                disabled={!selectedKeys.length}
                                                onClick={handleAssign}
                                                style={{ background: '#1A2B5A' }}
                                            >
                                                Gán {selectedKeys.length > 0 ? `${selectedKeys.length} GD` : ''} vào kỳ
                                            </Button>
                                            {selectedKeys.length > 0 && (
                                                <Button onClick={() => setSelectedKeys([])}>Bỏ chọn tất cả</Button>
                                            )}
                                        </div>
                                    )}
                                    <Table
                                        columns={assignableColumns}
                                        dataSource={assignable.filter(t => !t.payrollPeriodId)}
                                        rowKey="id"
                                        loading={loading}
                                        size="small"
                                        rowSelection={!period?.isLocked ? {
                                            selectedRowKeys: selectedKeys,
                                            onChange: (keys) => setSelectedKeys(keys as string[]),
                                        } : undefined}
                                        pagination={{ pageSize: 20, showTotal: (t) => `${t} giao dịch` }}
                                    />
                                </>
                            ),
                        },
                        {
                            key: 'assigned',
                            label: (
                                <span>
                                    Đã gán &nbsp;
                                    <Badge count={assigned.length} showZero color="#3b82f6" size="small" />
                                </span>
                            ),
                            children: (
                                <Table
                                    columns={assignedColumns}
                                    dataSource={assigned}
                                    rowKey="id"
                                    loading={loading}
                                    size="small"
                                    pagination={{ pageSize: 20, showTotal: (t) => `${t} giao dịch` }}
                                />
                            ),
                        },
                    ]}
                />
            </Card>
        </>
    );
}
