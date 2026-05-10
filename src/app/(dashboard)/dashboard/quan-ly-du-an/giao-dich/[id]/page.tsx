'use client';
import { use, useEffect, useState, useCallback } from 'react';
import {
    Spin, Card, Descriptions, Tag, Button, Table, Space, message,
    Modal, Form, Select, InputNumber, Divider,
} from 'antd';
import { ArrowLeftOutlined, UserAddOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import dayjs from 'dayjs';

interface Assignment {
    id: string;
    roleInProject: string;
    sharePercent: number | null;
    note: string | null;
    employee: { id: string; employeeCode: string; user: { fullName: string } };
}

interface Commission {
    id: string;
    amount: number;
    percentApplied: number | null;
    sourceType: string;
    employee: { employeeCode: string; user: { fullName: string } };
    role: { name: string };
}

interface TransactionDetail {
    id: string;
    transactionCode: string;
    actualValue: number;
    expectedRevenue: number | null;
    status: string;
    transactedAt: string;
    note: string | null;
    project: { id: string; code: string; ward: string; area: string } | null;
    room: { id: string; roomCode: string; rentalPrice: number | null } | null;
    customer: { id: string; fullName: string; phone: string } | null;
    branch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    createdBy: { fullName: string } | null;
    assignments: Assignment[];
    commissions: Commission[];
}

interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING:   { label: 'Đang xử lý', color: 'processing' },
    SUCCESS:   { label: 'Thành công', color: 'success' },
    CANCELLED: { label: 'Đã huỷ',    color: 'default' },
    FAILED:    { label: 'Thất bại',   color: 'error' },
};

const ROLE_OPTIONS = [
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'SALES',     label: 'Sales' },
];

const formatCurrency = (v: number | null) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusModal, setStatusModal] = useState(false);
    const [assignModal, setAssignModal] = useState(false);
    const [statusForm] = Form.useForm();
    const [assignForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/transactions/${id}`);
            setTransaction(data);
        } catch {
            message.error('Không thể tải thông tin giao dịch');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchTransaction(); }, [fetchTransaction]);

    const openAssign = async () => {
        assignForm.resetFields();
        assignForm.setFieldsValue({ assignments: [{}] });
        try {
            const { data } = await api.get('/employees', { params: { limit: 200 } });
            setEmployees(data.data.map((e: any) => ({
                id: e.employeeProfile?.id,
                employeeCode: e.employeeProfile?.employeeCode,
                fullName: e.fullName,
            })).filter((e: any) => e.id));
        } catch { /* ignore */ }
        setAssignModal(true);
    };

    const handleStatusUpdate = async () => {
        const values = await statusForm.validateFields();
        setSubmitting(true);
        try {
            await api.patch(`/transactions/${id}/status`, values);
            message.success('Cập nhật trạng thái thành công');
            setStatusModal(false);
            fetchTransaction();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignStaff = async () => {
        const values = await assignForm.validateFields();
        setSubmitting(true);
        try {
            await api.post(`/transactions/${id}/assignments`, values);
            message.success('Gán nhân sự thành công');
            setAssignModal(false);
            fetchTransaction();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const assignColumns: TableColumnsType<Assignment> = [
        {
            title: 'Nhân viên', render: (_, r) => (
                <span>{r.employee.user.fullName} <span style={{ color: '#888', fontSize: 12 }}>({r.employee.employeeCode})</span></span>
            ), onHeaderCell: () => TH,
        },
        {
            title: 'Vai trò', width: 130, render: (_, r) => (
                <Tag color={r.roleInProject === 'LEADER' ? 'purple' : r.roleInProject === 'SALES' ? 'blue' : 'green'}>
                    {r.roleInProject}
                </Tag>
            ), onHeaderCell: () => TH,
        },
        {
            title: '% Hoa hồng', width: 120, align: 'center',
            render: (_, r) => r.sharePercent != null ? `${r.sharePercent}%` : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Ghi chú', dataIndex: 'note', render: (v) => v || '—', onHeaderCell: () => TH,
        },
    ];

    const commissionColumns: TableColumnsType<Commission> = [
        {
            title: 'Nhân viên', render: (_, r) => (
                <span>{r.employee.user.fullName} <span style={{ color: '#888', fontSize: 12 }}>({r.employee.employeeCode})</span></span>
            ), onHeaderCell: () => TH,
        },
        { title: 'Vai trò', width: 160, render: (_, r) => r.role.name, onHeaderCell: () => TH },
        {
            title: '% Áp dụng', width: 110, align: 'center',
            render: (_, r) => r.percentApplied != null ? `${r.percentApplied}%` : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Số tiền hoa hồng', width: 160, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.amount)}</span>,
            onHeaderCell: () => TH,
        },
    ];

    const status = transaction ? (STATUS_MAP[transaction.status] ?? { label: transaction.status, color: 'default' }) : null;
    const isLocked = transaction?.status === 'SUCCESS' || transaction?.status === 'CANCELLED';

    return (
        <Spin spinning={loading}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Quay lại</Button>
                    <span style={{ fontSize: 18, fontWeight: 600, color: '#1A2B5A' }}>
                        Chi tiết giao dịch {transaction ? `— ${transaction.transactionCode}` : ''}
                    </span>
                </div>
                {transaction && !isLocked && (
                    <Space>
                        <Button icon={<UserAddOutlined />} onClick={openAssign}>Gán nhân sự</Button>
                        <Button type="primary" onClick={() => { statusForm.resetFields(); setStatusModal(true); }}>
                            Cập nhật trạng thái
                        </Button>
                    </Space>
                )}
            </div>

            {transaction && (
                <>
                    <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                        <Descriptions column={3} bordered size="small"
                            labelStyle={{ backgroundColor: '#FFF3E0', color: '#E8890C', fontWeight: 500 }}>
                            <Descriptions.Item label="Mã giao dịch">
                                <Tag color="orange">{transaction.transactionCode}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                {status && <Tag color={status.color}>{status.label}</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày giao dịch">
                                {dayjs(transaction.transactedAt).format('DD/MM/YYYY')}
                            </Descriptions.Item>

                            <Descriptions.Item label="Dự án">
                                {transaction.project ? `${transaction.project.code} — ${transaction.project.area}` : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phòng">
                                {transaction.room?.roomCode || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">
                                {transaction.customer
                                    ? `${transaction.customer.fullName} (${transaction.customer.phone})`
                                    : '—'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Giá trị giao dịch">
                                <span style={{ fontWeight: 600, color: '#1A2B5A' }}>
                                    {formatCurrency(transaction.actualValue)}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Doanh thu ước tính">
                                {formatCurrency(transaction.expectedRevenue)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Chi nhánh / Team">
                                {transaction.branch?.name || '—'} / {transaction.team?.name || '—'}
                            </Descriptions.Item>

                            {transaction.note && (
                                <Descriptions.Item label="Ghi chú" span={3}>{transaction.note}</Descriptions.Item>
                            )}
                        </Descriptions>
                    </Card>

                    <Card
                        title={<span style={{ color: '#1A2B5A', fontWeight: 600 }}>Nhân sự phụ trách ({transaction.assignments.length})</span>}
                        style={{ borderRadius: 8, marginBottom: 16 }}
                    >
                        <Table rowKey="id" columns={assignColumns} dataSource={transaction.assignments} pagination={false} size="small" />
                    </Card>

                    <Card
                        title={<span style={{ color: '#1A2B5A', fontWeight: 600 }}>Hoa hồng ({transaction.commissions.length})</span>}
                        style={{ borderRadius: 8 }}
                    >
                        {transaction.commissions.length === 0
                            ? <div style={{ textAlign: 'center', color: '#bbb', padding: '24px 0' }}>
                                Hoa hồng được tính tự động khi giao dịch chuyển sang Thành công
                              </div>
                            : <Table rowKey="id" columns={commissionColumns} dataSource={transaction.commissions} pagination={false} size="small" />
                        }
                    </Card>
                </>
            )}

            {/* Modal đổi trạng thái */}
            <Modal
                title="Cập nhật trạng thái giao dịch"
                open={statusModal}
                onOk={handleStatusUpdate}
                onCancel={() => setStatusModal(false)}
                okText="Xác nhận" cancelText="Huỷ"
                confirmLoading={submitting}
                destroyOnClose
            >
                <Form form={statusForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item label="Trạng thái mới" name="status"
                        rules={[{ required: true, message: 'Chọn trạng thái' }]}>
                        <Select
                            placeholder="Chọn trạng thái"
                            options={[
                                { value: 'SUCCESS',   label: 'Thành công — tự động tính hoa hồng' },
                                { value: 'CANCELLED', label: 'Đã huỷ' },
                                { value: 'FAILED',    label: 'Thất bại' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal gán nhân sự */}
            <Modal
                title="Gán nhân sự vào giao dịch"
                open={assignModal}
                onOk={handleAssignStaff}
                onCancel={() => setAssignModal(false)}
                okText="Lưu" cancelText="Huỷ"
                confirmLoading={submitting}
                width={640}
                destroyOnClose
            >
                <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.List name="assignments">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map((field, index) => (
                                    <div key={field.key} style={{ background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 500 }}>Nhân sự #{index + 1}</span>
                                            {fields.length > 1 && (
                                                <Button type="text" danger size="small" onClick={() => remove(field.name)}>Xoá</Button>
                                            )}
                                        </div>
                                        <Form.Item label="Nhân viên" name={[field.name, 'employeeId']}
                                            rules={[{ required: true, message: 'Chọn nhân viên' }]}>
                                            <Select
                                                showSearch placeholder="Chọn nhân viên"
                                                filterOption={(input, opt) =>
                                                    (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={employees.map((e) => ({
                                                    value: e.id,
                                                    label: `${e.fullName} (${e.employeeCode})`,
                                                }))}
                                            />
                                        </Form.Item>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <Form.Item label="Vai trò" name={[field.name, 'role']}
                                                rules={[{ required: true, message: 'Chọn vai trò' }]}
                                                style={{ flex: 1 }}>
                                                <Select placeholder="Chọn vai trò" options={ROLE_OPTIONS} />
                                            </Form.Item>
                                            <Form.Item label="% Hoa hồng" name={[field.name, 'sharePercent']} style={{ flex: 1 }}>
                                                <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="VD: 50" />
                                            </Form.Item>
                                        </div>
                                    </div>
                                ))}
                                {fields.length < 4 && (
                                    <Button type="dashed" block onClick={() => add()}>+ Thêm nhân sự</Button>
                                )}
                                <Divider style={{ margin: '12px 0 0' }} />
                                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                                    Leader được tự động xác định từ trưởng nhóm của nhân viên Sales.
                                </p>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </Spin>
    );
}
