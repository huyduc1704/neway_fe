'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, Popconfirm, message, Select, Modal, Form, DatePicker, InputNumber } from 'antd';
import { EyeOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

interface Transaction {
    id: string;
    transactionCode: string;
    actualValue: number;
    expectedRevenue: number | null;
    status: string;
    transactedAt: string;
    project: { id: string; code: string; ward: string } | null;
    room: { id: string; roomCode: string } | null;
    customer: { id: string; fullName: string } | null;
    branch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
}

interface Project { id: string; code: string; }
interface Room { id: string; roomCode: string; }
interface Customer { id: string; code: string; fullName: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING:   { label: 'Đang xử lý', color: 'processing' },
    SUCCESS:   { label: 'Thành công', color: 'success' },
    CANCELLED: { label: 'Đã huỷ',    color: 'default' },
    FAILED:    { label: 'Thất bại',   color: 'error' },
};

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function GiaoDichPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    // Create modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/transactions', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    status: statusFilter,
                },
            });
            setTransactions(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            message.error('Không thể tải danh sách giao dịch');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, statusFilter]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const openCreate = async () => {
        createForm.resetFields();
        setRooms([]);
        try {
            const [pRes, cRes] = await Promise.all([
                api.get('/projects', { params: { limit: 200, status: 'ACTIVE' } }),
                api.get('/customers', { params: { limit: 200 } }),
            ]);
            setProjects(pRes.data.data);
            setCustomers(cRes.data.data);
        } catch { /* ignore */ }
        setCreateOpen(true);
    };

    const onProjectChange = async (projectId: string) => {
        createForm.setFieldValue('roomId', undefined);
        setRooms([]);
        if (!projectId) return;
        setLoadingRooms(true);
        try {
            const { data } = await api.get(`/projects/${projectId}/rooms`);
            setRooms(data);
        } catch { /* ignore */ } finally {
            setLoadingRooms(false);
        }
    };

    const handleCreate = async () => {
        const values = await createForm.validateFields();
        setSubmitting(true);
        try {
            await api.post('/transactions', {
                ...values,
                transactedAt: values.transactedAt?.toISOString(),
            });
            message.success('Tạo giao dịch thành công');
            setCreateOpen(false);
            fetchTransactions();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/transactions/${id}`);
            message.success('Đã xoá giao dịch');
            fetchTransactions();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: TableColumnsType<Transaction> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã giao dịch', dataIndex: 'transactionCode', width: 140,
            render: (v) => <Tag color="orange">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Dự án / Phòng',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project?.code || '—'}</div>
                    {r.room && <div style={{ fontSize: 12, color: '#888' }}>Phòng: {r.room.roomCode}</div>}
                </div>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: 'Khách hàng', width: 180,
            render: (_, r) => r.customer?.fullName || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Giá trị GD', width: 150, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(r.actualValue)}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Ngày GD', width: 120, align: 'center',
            render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY'),
            onHeaderCell: () => TH,
        },
        {
            title: 'Trạng thái', width: 130, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Thao tác', width: 100, align: 'center',
            onHeaderCell: () => TH,
            render: (_, r) => (
                <Space>
                    <Button
                        type="text" icon={<EyeOutlined />}
                        onClick={() => router.push(`/dashboard/quan-ly-du-an/giao-dich/${r.id}` as any)}
                    />
                    <Popconfirm
                        title="Xoá giao dịch này?"
                        okText="Xác nhận" cancelText="Huỷ"
                        onConfirm={() => handleDelete(r.id)}
                        disabled={r.status === 'SUCCESS'}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} disabled={r.status === 'SUCCESS'} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="Quản lý dự án / Giao dịch" />

            <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
                    <Space>
                        <Select
                            allowClear placeholder="Trạng thái" style={{ width: 160 }}
                            onChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}
                            options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
                        />
                    </Space>
                    <Space>
                        <Input.Search
                            placeholder="Tìm theo mã giao dịch..." allowClear style={{ width: 260 }}
                            onSearch={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }}
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Tạo giao dịch
                        </Button>
                    </Space>
                </div>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={transactions}
                    loading={loading}
                    onRow={(r) => ({
                        onClick: (e) => {
                            if ((e.target as HTMLElement).closest('button, .ant-popconfirm')) return;
                            router.push(`/dashboard/quan-ly-du-an/giao-dich/${r.id}` as any);
                        },
                        style: { cursor: 'pointer' },
                    })}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: false,
                        onChange: (page) => setPagination((p) => ({ ...p, page })),
                        itemRender: (_, type, el) => {
                            if (type === 'prev') return <a>Trước</a>;
                            if (type === 'next') return <a>Sau</a>;
                            return el;
                        },
                    }}
                />
            </div>

            <Modal
                title="Tạo giao dịch mới"
                open={createOpen}
                onOk={handleCreate}
                onCancel={() => setCreateOpen(false)}
                okText="Tạo" cancelText="Huỷ"
                confirmLoading={submitting}
                width={640}
                destroyOnClose
            >
                <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item label="Mã giao dịch" name="transactionCode"
                        rules={[{ required: true, message: 'Nhập mã giao dịch' }]}>
                        <Input placeholder="VD: GD001" />
                    </Form.Item>

                    <Form.Item label="Dự án" name="projectId"
                        rules={[{ required: true, message: 'Chọn dự án' }]}>
                        <Select
                            showSearch placeholder="Chọn dự án"
                            onChange={onProjectChange}
                            filterOption={(input, opt) =>
                                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={projects.map((p) => ({ value: p.id, label: p.code }))}
                        />
                    </Form.Item>

                    <Form.Item label="Phòng" name="roomId">
                        <Select
                            allowClear placeholder="Chọn phòng (không bắt buộc)"
                            loading={loadingRooms}
                            options={rooms.map((r) => ({ value: r.id, label: r.roomCode }))}
                        />
                    </Form.Item>

                    <Form.Item label="Khách hàng" name="customerId">
                        <Select
                            allowClear showSearch placeholder="Chọn khách hàng (không bắt buộc)"
                            filterOption={(input, opt) =>
                                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={customers.map((c) => ({ value: c.id, label: `${c.fullName} (${c.code})` }))}
                        />
                    </Form.Item>

                    <Form.Item label="Giá trị giao dịch (VNĐ)" name="actualValue"
                        rules={[{ required: true, message: 'Nhập giá trị giao dịch' }]}>
                        <InputNumber
                            style={{ width: '100%' }} min={1} step={1000000}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => v!.replace(/,/g, '') as any}
                            placeholder="Nhập giá trị"
                        />
                    </Form.Item>

                    <Form.Item label="Doanh thu ước tính (VNĐ)" name="expectedRevenue">
                        <InputNumber
                            style={{ width: '100%' }} min={0} step={1000000}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => v!.replace(/,/g, '') as any}
                            placeholder="Nhập doanh thu ước tính (không bắt buộc)"
                        />
                    </Form.Item>

                    <Form.Item label="Ngày giao dịch" name="transactedAt"
                        rules={[{ required: true, message: 'Chọn ngày giao dịch' }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
                    </Form.Item>

                    <Form.Item label="Ghi chú" name="note">
                        <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
