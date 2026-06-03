'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Form, Input, Button, Card, Typography, Row, Col,
    InputNumber, Select, Table, Spin, Popconfirm, message, Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';

const { Title, Text } = Typography;

const TASK_STATUS_OPTIONS = [
    { value: 'ACHIEVED',     label: 'Đạt' },
    { value: 'NOT_ACHIEVED', label: 'Chưa Đạt' },
    { value: 'OTHER',        label: 'Khác' },
];

interface TaskRow {
    key: string;
    content: string;
    status: string;
    milestone: number;
    rate: number;
    quantity: number;
}

const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

interface Props { mode: 'create' | 'edit'; roleId?: string; }

export default function RoleForm({ mode, roleId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [loading, setLoading]       = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [tasks, setTasks]           = useState<TaskRow[]>([]);

    useEffect(() => {
        if (mode !== 'edit' || !roleId) return;
        setLoading(true);
        api.get(`/roles/${roleId}`)
            .then(({ data }) => {
                form.setFieldsValue({
                    code:              data.code ?? '',
                    name:              data.name ?? '',
                    description:       data.description ?? '',
                    commissionPercent: data.commissionPercent != null ? Number(data.commissionPercent) : undefined,
                    fixedSalary:       data.fixedSalary != null ? Number(data.fixedSalary) : undefined,
                    kpi:               data.kpi ?? '',
                });
                setTasks(
                    (data.taskSalaries ?? []).map((t: any, i: number) => ({
                        key: String(i),
                        content:   t.content,
                        status:    t.status,
                        milestone: Number(t.milestone),
                        rate:      Number(t.rate),
                        quantity:  t.quantity,
                    }))
                );
            })
            .catch(() => message.error('Không thể tải thông tin vai trò'))
            .finally(() => setLoading(false));
    }, [mode, roleId]);

    const addTask = () => {
        setTasks(prev => [...prev, {
            key: Date.now().toString(),
            content: '', status: 'ACHIEVED', milestone: 0, rate: 0, quantity: 0,
        }]);
    };

    const removeTask = (key: string) => setTasks(prev => prev.filter(t => t.key !== key));

    const updateTask = (key: string, field: keyof TaskRow, value: any) => {
        setTasks(prev => prev.map(t => t.key === key ? { ...t, [field]: value } : t));
    };

    const onFinish = async (values: any) => {
        const invalidTask = tasks.find(t => !t.content.trim());
        if (invalidTask) { message.error('Vui lòng nhập nội dung cho tất cả dòng Lương Nhiệm Vụ'); return; }

        setSubmitting(true);
        const payload = {
            name:              values.name,
            description:       values.description || undefined,
            commissionPercent: values.commissionPercent ?? undefined,
            fixedSalary:       values.fixedSalary ?? undefined,
            kpi:               values.kpi || undefined,
            taskSalaries:      tasks.map(({ key: _k, ...t }) => ({ ...t, milestone: Number(t.milestone), rate: Number(t.rate), quantity: Number(t.quantity) })),
        };

        try {
            if (mode === 'create') {
                await api.post('/roles', { code: values.code.toUpperCase(), ...payload });
                message.success('Tạo vai trò thành công');
            } else {
                await api.patch(`/roles/${roleId}`, payload);
                message.success('Cập nhật vai trò thành công');
            }
            router.push('/dashboard/he-thong/vai-tro');
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            if (err?.response?.status === 409) {
                form.setFields([{ name: 'code', errors: ['Mã vai trò đã tồn tại'] }]);
            } else {
                message.error(Array.isArray(msg) ? msg[0] : msg || 'Thao tác thất bại');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/roles/${roleId}`);
            message.success('Đã xoá vai trò');
            router.push('/dashboard/he-thong/vai-tro');
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Xoá thất bại');
        }
    };

    const taskColumns: ColumnsType<TaskRow> = [
        {
            title: 'Nội dung', dataIndex: 'content', key: 'content',
            render: (v, r) => (
                <Input value={v} placeholder="Nội dung nhiệm vụ"
                    onChange={e => updateTask(r.key, 'content', e.target.value)} />
            ),
        },
        {
            title: 'Tình trạng', dataIndex: 'status', key: 'status', width: 130,
            render: (v, r) => (
                <Select value={v} options={TASK_STATUS_OPTIONS} style={{ width: '100%' }}
                    onChange={val => updateTask(r.key, 'status', val)} />
            ),
        },
        {
            title: 'Mốc (đ)', dataIndex: 'milestone', key: 'milestone', width: 150,
            render: (v, r) => (
                <InputNumber value={v} min={0} style={{ width: '100%' }}
                    formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    onChange={val => updateTask(r.key, 'milestone', val ?? 0)} />
            ),
        },
        {
            title: 'Tỉ lệ (%)', dataIndex: 'rate', key: 'rate', width: 110,
            render: (v, r) => (
                <InputNumber value={v} min={0} max={100} step={0.1} style={{ width: '100%' }}
                    onChange={val => updateTask(r.key, 'rate', val ?? 0)} />
            ),
        },
        {
            title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100,
            render: (v, r) => (
                <InputNumber value={v} min={0} style={{ width: '100%' }}
                    onChange={val => updateTask(r.key, 'quantity', val ?? 0)} />
            ),
        },
        {
            title: 'Lương = SL × Tỉ lệ × Mốc', key: 'salary', width: 180, align: 'right' as const,
            render: (_, r) => (
                <Text strong style={{ color: '#E8890C' }}>
                    {fmtCurrency(r.quantity * (r.rate / 100) * r.milestone)}
                </Text>
            ),
        },
        {
            title: '', key: 'del', width: 50, align: 'center' as const,
            render: (_, r) => (
                <Popconfirm title="Xoá dòng này?" okText="Xoá" cancelText="Huỷ"
                    okButtonProps={{ danger: true }} onConfirm={() => removeTask(r.key)}>
                    <Button size="small" icon={<DeleteOutlined />} type="text" danger />
                </Popconfirm>
            ),
        },
    ];

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
    }

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
                <Title level={4} style={{ margin: 0 }}>
                    {mode === 'create' ? 'Tạo vai trò mới' : 'Chỉnh sửa vai trò'}
                </Title>
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish}>
                {/* ── Thông tin cơ bản ── */}
                <Card title="Thông tin vai trò" style={{ marginBottom: 16 }}>
                    <Row gutter={24}>
                        <Col span={6}>
                            <Form.Item name="code" label="Mã vai trò"
                                rules={[{ required: true, message: 'Nhập mã vai trò' }]}>
                                <Input placeholder="VD: SALE, LEADER..." disabled={mode === 'edit'}
                                    onChange={e => form.setFieldValue('code', e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="name" label="Tên vai trò"
                                rules={[{ required: true, message: 'Nhập tên vai trò' }]}>
                                <Input placeholder="Nhập tên vai trò" />
                            </Form.Item>
                        </Col>
                        <Col span={5}>
                            <Form.Item name="commissionPercent" label="Phần trăm hoa hồng (%)">
                                <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }}
                                    placeholder="VD: 2.5" />
                            </Form.Item>
                        </Col>
                        <Col span={5}>
                            <Form.Item name="fixedSalary" label="Lương cố định (đ)">
                                <InputNumber min={0} style={{ width: '100%' }}
                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    placeholder="VD: 5,000,000" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="kpi" label="KPI">
                                <Input placeholder="Mô tả KPI của vai trò..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="description" label="Ghi chú">
                                <Input.TextArea rows={2} placeholder="Ghi chú thêm về vai trò..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* ── Lương Nhiệm Vụ ── */}
                <Card
                    title="Lương Nhiệm Vụ"
                    style={{ marginBottom: 16 }}
                    extra={
                        <Button icon={<PlusOutlined />} onClick={addTask} size="small">
                            Thêm dòng
                        </Button>
                    }
                >
                    {tasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
                            Chưa có lương nhiệm vụ. Nhấn "Thêm dòng" để thêm.
                        </div>
                    ) : (
                        <Table
                            columns={taskColumns}
                            dataSource={tasks}
                            rowKey="key"
                            pagination={false}
                            size="small"
                            summary={() => {
                                const total = tasks.reduce(
                                    (sum, t) => sum + t.quantity * (t.rate / 100) * t.milestone, 0
                                );
                                return (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={5}>
                                            <Text strong>Tổng lương nhiệm vụ</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text strong style={{ color: '#E8890C' }}>{fmtCurrency(total)}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} />
                                    </Table.Summary.Row>
                                );
                            }}
                        />
                    )}
                </Card>

                {/* ── Actions ── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {mode === 'edit' && (
                        <Popconfirm title="Xác nhận xoá vai trò này?" okText="Xoá" cancelText="Huỷ"
                            okButtonProps={{ danger: true }} onConfirm={handleDelete}>
                            <Button danger>Xoá vai trò</Button>
                        </Popconfirm>
                    )}
                    <Button onClick={() => router.back()}>Huỷ</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}
                        style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                        {mode === 'create' ? 'Tạo vai trò' : 'Lưu thay đổi'}
                    </Button>
                </div>
            </Form>
        </>
    );
}
