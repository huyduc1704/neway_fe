'use client';
import { use, useEffect, useState, useCallback } from 'react';
import {
    Spin, Card, Descriptions, Tag, Button, Table, Space, Popconfirm,
    App, Modal, Form, Input, InputNumber, Tooltip,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import dayjs from 'dayjs';

interface Room {
    id: string;
    roomCode: string;
    rentalPrice: number | null;
    depositPrice: number | null;
    rentalInfo: string | null;
}

interface ProjectDetail {
    id: string;
    code: string;
    ward: string;
    area: string;
    status: string;
    rentalStartAt: string | null;
    rentalEndAt: string | null;
    expectedStayAt: string | null;
    actualStayAt: string | null;
    managedBranch: { name: string } | null;
    team: { name: string } | null;
    createdBy: { fullName: string } | null;
    rooms: Room[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT:     { label: 'Nháp',           color: 'default' },
    ACTIVE:    { label: 'Đang hoạt động', color: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       color: 'warning' },
    CLOSED:    { label: 'Đã đóng',        color: 'error' },
    CANCELLED: { label: 'Đã huỷ',         color: 'default' },
};

const formatCurrency = (v: number | null) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { message } = App.useApp();

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [roomModal, setRoomModal] = useState<{ open: boolean; room?: Room }>({ open: false });
    const [roomForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const fetchProject = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
        } catch {
            message.error('Không thể tải thông tin dự án');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchProject(); }, [fetchProject]);

    const openAddRoom = () => {
        roomForm.resetFields();
        setRoomModal({ open: true });
    };

    const openEditRoom = (room: Room) => {
        roomForm.setFieldsValue({
            roomCode: room.roomCode,
            rentalPrice: room.rentalPrice,
            depositPrice: room.depositPrice,
            rentalInfo: room.rentalInfo,
        });
        setRoomModal({ open: true, room });
    };

    const handleRoomSubmit = async () => {
        const values = await roomForm.validateFields();
        setSubmitting(true);
        try {
            if (roomModal.room) {
                await api.patch(`/projects/${id}/rooms/${roomModal.room.id}`, values);
                message.success('Cập nhật phòng thành công');
            } else {
                await api.post(`/projects/${id}/rooms`, values);
                message.success('Thêm phòng thành công');
            }
            setRoomModal({ open: false });
            fetchProject();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        try {
            await api.delete(`/projects/${id}/rooms/${roomId}`);
            message.success('Đã xoá phòng');
            fetchProject();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const roomColumns: TableColumnsType<Room> = [
        {
            title: 'Mã phòng', dataIndex: 'roomCode', width: 120,
            render: (v) => <Tag color="blue">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Giá thuê', width: 150,
            render: (_, r) => formatCurrency(r.rentalPrice),
            onHeaderCell: () => TH,
        },
        {
            title: 'Giá đặt cọc', width: 150,
            render: (_, r) => formatCurrency(r.depositPrice),
            onHeaderCell: () => TH,
        },
        {
            title: 'Thông tin thêm', dataIndex: 'rentalInfo',
            render: (v) => v || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Thao tác', width: 100, align: 'center',
            onHeaderCell: () => TH,
            render: (_, r) => (
                <Space>
                    <Tooltip title="Chỉnh sửa">
                        <Button type="text" icon={<EditOutlined />} onClick={() => openEditRoom(r)} />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Popconfirm
                            title="Xoá phòng này?" okText="Xác nhận" cancelText="Huỷ"
                            onConfirm={() => handleDeleteRoom(r.id)}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const status = project ? (STATUS_MAP[project.status] ?? { label: project.status, color: 'default' }) : null;

    return (
        <Spin spinning={loading}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Quay lại</Button>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#1A2B5A' }}>
                    Thông tin dự án {project ? `— ${project.code}` : ''}
                </span>
            </div>

            {project && (
                <>
                    <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                        <Descriptions column={3} bordered size="small"
                            labelStyle={{ backgroundColor: '#FFF3E0', color: '#E8890C', fontWeight: 500 }}>
                            <Descriptions.Item label="Mã dự án">
                                <Tag color="orange">{project.code}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Khu vực">{project.area}</Descriptions.Item>
                            <Descriptions.Item label="Phường / Xã">{project.ward}</Descriptions.Item>

                            <Descriptions.Item label="Chi nhánh">{project.managedBranch?.name || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Team">{project.team?.name || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                {status && <Tag color={status.color}>{status.label}</Tag>}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày bắt đầu thuê">
                                {project.rentalStartAt ? dayjs(project.rentalStartAt).format('DD/MM/YYYY') : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày kết thúc thuê">
                                {project.rentalEndAt ? dayjs(project.rentalEndAt).format('DD/MM/YYYY') : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày khách dự kiến ở">
                                {project.expectedStayAt ? dayjs(project.expectedStayAt).format('DD/MM/YYYY') : '—'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Người tạo" span={3}>
                                {project.createdBy?.fullName || '—'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card
                        title={<span style={{ color: '#1A2B5A', fontWeight: 600 }}>Danh sách phòng ({project.rooms.length})</span>}
                        extra={
                            <Button type="primary" icon={<PlusOutlined />} onClick={openAddRoom}>
                                Thêm phòng
                            </Button>
                        }
                        style={{ borderRadius: 8 }}
                    >
                        <Table
                            rowKey="id"
                            columns={roomColumns}
                            dataSource={project.rooms}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </>
            )}

            <Modal
                title={roomModal.room ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
                open={roomModal.open}
                onOk={handleRoomSubmit}
                onCancel={() => setRoomModal({ open: false })}
                okText="Lưu" cancelText="Huỷ"
                confirmLoading={submitting}
                destroyOnHidden
            >
                <Form form={roomForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item label="Mã phòng" name="roomCode"
                        rules={[{ required: true, message: 'Nhập mã phòng' }]}>
                        <Input placeholder="VD: P101" disabled={!!roomModal.room} />
                    </Form.Item>
                    <Form.Item label="Giá thuê (VNĐ)" name="rentalPrice">
                        <InputNumber
                            style={{ width: '100%' }} min={0} step={100000}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => v!.replace(/,/g, '') as any}
                            placeholder="Nhập giá thuê"
                        />
                    </Form.Item>
                    <Form.Item label="Giá đặt cọc (VNĐ)" name="depositPrice">
                        <InputNumber
                            style={{ width: '100%' }} min={0} step={100000}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => v!.replace(/,/g, '') as any}
                            placeholder="Nhập giá đặt cọc"
                        />
                    </Form.Item>
                    <Form.Item label="Thông tin thêm" name="rentalInfo">
                        <Input.TextArea rows={2} placeholder="Ghi chú về phòng..." />
                    </Form.Item>
                </Form>
            </Modal>
        </Spin>
    );
}
