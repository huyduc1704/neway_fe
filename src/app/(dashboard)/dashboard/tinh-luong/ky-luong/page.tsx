'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { Plus, Lock, LockOpen, Trash2, Pencil, CalendarDays, ArrowRight } from 'lucide-react';
import { Button, Input, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const { Title } = Typography;

interface PayrollPeriod {
    id: string;
    code: string;
    periodStart: string;
    periodEnd: string;
    isLocked: boolean;
    createdAt: string;
    _count: { payrollLines: number };
}

export default function KyLuongPage() {
    const router = useRouter();
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [lockedFilter, setLockedFilter] = useState<string>('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchPeriods = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/payroll/periods', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    isLocked: lockedFilter !== '' ? lockedFilter === 'true' : undefined,
                },
            });
            setPeriods(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách kỳ lương'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, lockedFilter]);

    useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

    const openCreate = () => { setEditingId(null); form.resetFields(); setDialogOpen(true); };
    const openEdit = (p: PayrollPeriod) => {
        setEditingId(p.id);
        form.setFieldsValue({ code: p.code, periodStart: p.periodStart.slice(0, 10), periodEnd: p.periodEnd.slice(0, 10) });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editingId) {
                await api.patch(`/payroll/periods/${editingId}`, { periodStart: values.periodStart, periodEnd: values.periodEnd });
                message.success('Cập nhật kỳ lương thành công');
            } else {
                await api.post('/payroll/periods', values);
                message.success('Tạo kỳ lương thành công');
            }
            setDialogOpen(false);
            fetchPeriods();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleLock = async (p: PayrollPeriod) => {
        const action = p.isLocked ? 'Mở khoá' : 'Khoá';
        if (!window.confirm(`${action} kỳ lương "${p.code}"?`)) return;
        try {
            await api.post(`/payroll/periods/${p.id}/${p.isLocked ? 'unlock' : 'lock'}`);
            message.success(`${action} kỳ lương thành công`);
            fetchPeriods();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (p: PayrollPeriod) => {
        if (!window.confirm(`Xoá kỳ lương "${p.code}"? Thao tác không thể hoàn tác.`)) return;
        try {
            await api.delete(`/payroll/periods/${p.id}`);
            message.success('Đã xoá kỳ lương');
            fetchPeriods();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const periodStart = Form.useWatch('periodStart', form);
    const periodEnd = Form.useWatch('periodEnd', form);

    const columns: ColumnsType<PayrollPeriod> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Mã kỳ lương', key: 'code', width: 180, render: (_, r) => <span style={{ fontWeight: 700, color: '#1A2B5A' }}>{r.code}</span> },
        {
            title: 'Thời gian', key: 'period', width: 220,
            render: (_, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <span>{formatDate(r.periodStart)}</span>
                    <ArrowRight size={14} color="#9ca3af" />
                    <span>{formatDate(r.periodEnd)}</span>
                </div>
            ),
        },
        {
            title: 'Bảng lương', key: 'lines', width: 120, align: 'center',
            render: (_, r) => (
                <Tag color={r._count.payrollLines > 0 ? 'success' : 'default'}>
                    {r._count.payrollLines} nhân viên
                </Tag>
            ),
        },
        {
            title: 'Trạng thái', key: 'status', width: 130, align: 'center',
            render: (_, r) => (
                <Tag color={r.isLocked ? 'blue' : 'warning'}>
                    {r.isLocked ? '🔒 Đã khoá' : '🔓 Đang mở'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác', key: 'actions', width: 180, align: 'center',
            render: (_, r) => (
                <Space>
                    <Button size="small" style={{ color: '#E8890C', borderColor: '#E8890C', fontSize: 12 }}
                        onClick={() => router.push(`/dashboard/tinh-luong/bang-luong?periodId=${r.id}` as any)}>
                        <CalendarDays size={14} /> Bảng lương
                    </Button>
                    {!r.isLocked && (
                        <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => openEdit(r)}>
                            <Pencil size={16} />
                        </button>
                    )}
                    <button title={r.isLocked ? 'Mở khoá' : 'Khoá kỳ'} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: r.isLocked ? '#ca8a04' : '#3b82f6' }} onClick={() => handleLock(r)}>
                        {r.isLocked ? <LockOpen size={16} /> : <Lock size={16} />}
                    </button>
                    {!r.isLocked && r._count.payrollLines === 0 && (
                        <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => handleDelete(r)}>
                            <Trash2 size={16} />
                        </button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Tính lương / Kỳ lương</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Quản lý các kỳ lương và chốt bảng lương nhân sự</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo kỳ lương</Button>
            </div>

            {/* Filter */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Lọc theo trạng thái:</span>
                    <Space>
                        {[
                            { value: '', label: 'Tất cả' },
                            { value: 'false', label: '🔓 Đang mở' },
                            { value: 'true', label: '🔒 Đã khoá' },
                        ].map(opt => (
                            <button key={opt.value} onClick={() => { setLockedFilter(opt.value); setPagination(p => ({ ...p, page: 1 })); }}
                                style={{
                                    padding: '6px 12px', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                                    border: `1px solid ${lockedFilter === opt.value ? '#E8890C' : '#d9d9d9'}`,
                                    background: lockedFilter === opt.value ? '#E8890C' : 'white',
                                    color: lockedFilter === opt.value ? 'white' : '#4b5563',
                                    transition: 'all 0.2s',
                                }}>
                                {opt.label}
                            </button>
                        ))}
                    </Space>
                </div>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    dataSource={periods}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })) }}
                    size="small"
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                open={dialogOpen}
                onCancel={() => setDialogOpen(false)}
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays size={20} color="#E8890C" />{editingId ? 'Cập nhật kỳ lương' : 'Tạo kỳ lương mới'}</span>}
                width={480}
                footer={[
                    <Button key="cancel" onClick={() => setDialogOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleSave} loading={saving}>{editingId ? 'Cập nhật' : 'Tạo kỳ lương'}</Button>,
                ]}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="code" label={<span>Mã kỳ lương <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập mã kỳ lương' }]} help={`Gợi ý: LUONG-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}>
                        <Input placeholder="VD: LUONG-2025-06" disabled={!!editingId} onChange={e => form.setFieldValue('code', e.target.value.toUpperCase())} />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="periodStart" label={<span>Từ ngày <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                        <Form.Item name="periodEnd" label={<span>Đến ngày <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}>
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                    </div>
                    {periodStart && periodEnd && (
                        <div style={{ borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', padding: 12, fontSize: 14, color: '#E8890C' }}>
                            <span style={{ fontWeight: 500 }}>Kỳ lương:</span> {formatDate(periodStart)} → {formatDate(periodEnd)}
                        </div>
                    )}
                </Form>
            </Modal>
        </>
    );
}
