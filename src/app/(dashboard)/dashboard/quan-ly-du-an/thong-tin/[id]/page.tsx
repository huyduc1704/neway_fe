'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { message, Card, Button, Input, Tag, Modal, Table, Upload, Descriptions, Spin, Space, Popconfirm, Typography, InputNumber } from 'antd';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

/* ─── Types ──────────────────────────────────────────────── */
interface Room {
    id: string; roomCode: string; houseNumber: string | null;
    rentalPrice: number | null; depositPrice: number | null; rentalInfo: string | null;
}

interface StaffSlot {
    mEmployeeId?: string;  mRate?: number;  mLeaderId?: string;  mLeaderRate?: number;
    m1EmployeeId?: string; m1Rate?: number; m1LeaderId?: string; m1LeaderRate?: number;
    m2EmployeeId?: string; m2Rate?: number; m2LeaderId?: string; m2LeaderRate?: number;
    s1EmployeeId?: string; s1Rate?: number; s1LeaderId?: string; s1LeaderRate?: number;
    s2EmployeeId?: string; s2Rate?: number; s2LeaderId?: string; s2LeaderRate?: number;
    mEmployee?: { fullName: string }; mLeader?: { fullName: string };
    m1Employee?: { fullName: string }; m1Leader?: { fullName: string };
    m2Employee?: { fullName: string }; m2Leader?: { fullName: string };
    s1Employee?: { fullName: string }; s1Leader?: { fullName: string };
    s2Employee?: { fullName: string }; s2Leader?: { fullName: string };
}

interface ProjectDetail {
    id: string; code: string; ward: string; area: string; province: string | null;
    houseNumber: string | null; status: string; leadSource: string | null;
    contractStartAt: string | null; contractEndAt: string | null;
    rentalStartAt: string | null;  rentalEndAt: string | null;
    expectedStayAt: string | null; checkInDate: string | null;
    depositDate: string | null;    deposit1: number | null;
    deposit2: number | null;       deposit2Date: string | null;
    estimatedCommissionPercent: number | null; customerSupport: number | null;
    estimatedRevenue: number | null; contractImageUrl: string | null;
    customerName: string | null;   customerPhone: string | null;
    managedBranch: { name: string } | null;
    team: { name: string } | null;
    createdBy: { fullName: string } | null;
    customer: { fullName: string; phone: string } | null;
    rooms: Room[];
    staffSlot: StaffSlot | null;
}

/* ─── Constants ──────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT:     { label: 'Nháp',           color: 'default' },
    ACTIVE:    { label: 'Đang hoạt động', color: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       color: 'warning' },
    CLOSED:    { label: 'Đã đóng',        color: 'error' },
    CANCELLED: { label: 'Đã huỷ',        color: 'default' },
};

const LEAD_SOURCE_MAP: Record<string, string> = {
    FACEBOOK: 'Facebook', TIKTOK: 'TikTok', THREADS: 'Threads',
    CHO_TOT: 'Chợ Tốt', BDS: 'BĐS', WALK_IN: 'Vãng Lai',
    REFERRAL: 'Giới Thiệu', ZALO: 'Zalo', OTHER: 'Khác',
};

const fmtCurrency = (v: number | null) => v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';
const fmtDate    = (v: string | null)  => v ? dayjs(v).format('DD/MM/YYYY') : '—';
const fmtPct     = (v: number | null)  => v != null ? `${v}%` : '—';

/* ─── Staff slot table ───────────────────────────────────── */
function StaffSlotTable({ slot }: { slot: StaffSlot }) {
    const rows = [
        { role: 'm nhỏ',  emp: slot.mEmployee?.fullName,  rate: slot.mRate,  leader: slot.mLeader?.fullName,  lRate: slot.mLeaderRate,  color: '#E8890C' },
        { role: 'M lớn 1', emp: slot.m1Employee?.fullName, rate: slot.m1Rate, leader: slot.m1Leader?.fullName, lRate: slot.m1LeaderRate, color: '#1A2B5A' },
        { role: 'M lớn 2', emp: slot.m2Employee?.fullName, rate: slot.m2Rate, leader: slot.m2Leader?.fullName, lRate: slot.m2LeaderRate, color: '#1A2B5A' },
        { role: 'S1',       emp: slot.s1Employee?.fullName, rate: slot.s1Rate, leader: slot.s1Leader?.fullName, lRate: slot.s1LeaderRate, color: '#16a34a' },
        { role: 'S2',       emp: slot.s2Employee?.fullName, rate: slot.s2Rate, leader: slot.s2Leader?.fullName, lRate: slot.s2LeaderRate, color: '#16a34a' },
    ].filter(r => r.emp);

    if (!rows.length) return <p style={{ color: '#9ca3af', fontSize: 14 }}>Chưa có nhân sự</p>;

    const columns = [
        { title: 'Vai trò', dataIndex: 'role', key: 'role', render: (text: string, record: any) => <span style={{ fontWeight: 600, color: record.color }}>{text}</span> },
        { title: 'Nhân viên', dataIndex: 'emp', key: 'emp' },
        { title: 'Tỉ lệ', dataIndex: 'rate', key: 'rate', align: 'center' as const, render: (r: number) => r != null ? `${(r * 100).toFixed(0)}%` : '—' },
        { title: 'Leader', dataIndex: 'leader', key: 'leader' },
        { title: 'Tỉ lệ Leader', dataIndex: 'lRate', key: 'lRate', align: 'center' as const, render: (r: number) => r != null ? `${(r * 100).toFixed(0)}%` : '—' },
    ];

    return <Table dataSource={rows} columns={columns} pagination={false} size="small" rowKey="role" />;
}

/* ─── Main component ─────────────────────────────────────── */
export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [roomModal, setRoomModal] = useState<{ open: boolean; room?: Room }>({ open: false });
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);

    /* room form */
    const [roomCode,      setRoomCode]      = useState('');
    const [houseNumber,   setHouseNumber]   = useState('');
    const [rentalPrice,   setRentalPrice]   = useState('');
    const [depositPrice,  setDepositPrice]  = useState('');
    const [rentalInfo,    setRentalInfo]    = useState('');
    const [roomErrors,    setRoomErrors]    = useState<Record<string, string>>({});

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

    /* ── Room handlers ── */
    const openAddRoom = () => {
        setRoomCode(''); setHouseNumber(''); setRentalPrice('');
        setDepositPrice(''); setRentalInfo(''); setRoomErrors({});
        setRoomModal({ open: true });
    };
    const openEditRoom = (room: Room) => {
        setRoomCode(room.roomCode); setHouseNumber(room.houseNumber ?? '');
        setRentalPrice(String(room.rentalPrice ?? '')); setDepositPrice(String(room.depositPrice ?? ''));
        setRentalInfo(room.rentalInfo ?? ''); setRoomErrors({});
        setRoomModal({ open: true, room });
    };
    const validateRoom = () => {
        const e: Record<string, string> = {};
        if (!roomCode.trim()) e.roomCode = 'Nhập mã phòng';
        setRoomErrors(e);
        return Object.keys(e).length === 0;
    };
    const handleRoomSubmit = async () => {
        if (!validateRoom()) return;
        setSubmitting(true);
        try {
            const payload = {
                roomCode, houseNumber: houseNumber || undefined,
                rentalPrice: rentalPrice ? Number(rentalPrice) : undefined,
                depositPrice: depositPrice ? Number(depositPrice) : undefined,
                rentalInfo: rentalInfo || undefined,
            };
            if (roomModal.room) {
                await api.patch(`/projects/${id}/rooms/${roomModal.room.id}`, payload);
                message.success('Cập nhật phòng thành công');
            } else {
                await api.post(`/projects/${id}/rooms`, payload);
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

    /* ── Contract image upload ── */
    const handleContractImageUpload = async (options: any) => {
        const { file } = options;
        setUploadingImg(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.patch(`/projects/${id}/contract-image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('Upload ảnh hợp đồng thành công');
            fetchProject();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Upload thất bại');
        } finally {
            setUploadingImg(false);
        }
    };

    const roomColumns = [
        { title: 'Mã phòng', dataIndex: 'roomCode', key: 'roomCode', render: (text: string) => <Tag color="blue">{text}</Tag> },
        { title: 'Số nhà', dataIndex: 'houseNumber', key: 'houseNumber', render: (t: string) => t || '—' },
        { title: 'Giá thuê', dataIndex: 'rentalPrice', key: 'rentalPrice', render: (t: number) => fmtCurrency(t) },
        { title: 'Giá đặt cọc', dataIndex: 'depositPrice', key: 'depositPrice', render: (t: number) => fmtCurrency(t) },
        { title: 'Thông tin thêm', dataIndex: 'rentalInfo', key: 'rentalInfo', render: (t: string) => t || '—' },
        {
            title: 'Thao tác', key: 'actions', align: 'center' as const,
            render: (_: any, r: Room) => (
                <Space>
                    <Button type="text" icon={<EditOutlined style={{ color: '#E8890C' }} />} onClick={() => openEditRoom(r)} />
                    <Popconfirm title="Xoá phòng này?" onConfirm={() => handleDeleteRoom(r.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;
    if (!project) return null;

    const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, color: 'default' };

    const headStyle = { background: '#fff7ed', color: '#E8890C', fontWeight: 600, borderBottom: '1px solid #fed7aa' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ color: '#6b7280' }} />
                <Title level={4} style={{ margin: 0, color: '#1A2B5A' }}>Thông tin dự án — {project.code}</Title>
                <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
            </div>

            <Card title="Thông tin dự án" size="small" styles={{ header: headStyle }}>
                <Descriptions column={3} size="small" bordered>
                    <Descriptions.Item label="Ngày đặt cọc" labelStyle={{ background: '#f9fafb', width: 150 }}>{fmtDate(project.depositDate)}</Descriptions.Item>
                    <Descriptions.Item label="Tên khách hàng" labelStyle={{ background: '#f9fafb', width: 150 }}>{project.customerName || project.customer?.fullName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="SĐT khách" labelStyle={{ background: '#f9fafb', width: 150 }}>{project.customerPhone || project.customer?.phone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Nguồn khách">{project.leadSource ? (LEAD_SOURCE_MAP[project.leadSource] ?? project.leadSource) : '—'}</Descriptions.Item>
                    <Descriptions.Item label="Chi nhánh">{project.managedBranch?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Khu vực">{project.team?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Người tạo">{project.createdBy?.fullName || '—'}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="Thông tin phòng" size="small" styles={{ header: headStyle }}>
                <Descriptions column={3} size="small" bordered>
                    <Descriptions.Item label="Tỉnh/Thành phố" labelStyle={{ background: '#f9fafb', width: 150 }}>{project.province || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Phường/Xã" labelStyle={{ background: '#f9fafb', width: 150 }}>{project.ward}</Descriptions.Item>
                    <Descriptions.Item label="Số nhà" labelStyle={{ background: '#f9fafb', width: 150 }}>{project.houseNumber || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Giá thuê">{fmtCurrency(null)}</Descriptions.Item>
                    <Descriptions.Item label="Ngày bắt đầu HĐ">{fmtDate(project.contractStartAt)}</Descriptions.Item>
                    <Descriptions.Item label="Ngày kết thúc HĐ">{fmtDate(project.contractEndAt)}</Descriptions.Item>
                    <Descriptions.Item label="Ngày nhận phòng">{fmtDate(project.checkInDate)}</Descriptions.Item>
                    <Descriptions.Item label="Ảnh hợp đồng" span={2}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {project.contractImageUrl ? (
                                <a href={project.contractImageUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1677ff' }}>
                                    <LinkOutlined /> Xem ảnh hợp đồng
                                </a>
                            ) : (
                                <span style={{ color: '#9ca3af' }}>Chưa có</span>
                            )}
                            <Upload customRequest={handleContractImageUpload} showUploadList={false} accept="image/*" disabled={uploadingImg}>
                                <Button size="small" icon={<UploadOutlined />} loading={uploadingImg}>
                                    {project.contractImageUrl ? 'Thay ảnh' : 'Upload ảnh'}
                                </Button>
                            </Upload>
                        </div>
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="Thông tin cọc" size="small" styles={{ header: headStyle }}>
                <Descriptions column={3} size="small" bordered>
                    <Descriptions.Item label="Tiền cọc lần 1" labelStyle={{ background: '#f9fafb', width: 150 }}>{fmtCurrency(project.deposit1)}</Descriptions.Item>
                    <Descriptions.Item label="Tiền cọc bổ sung" labelStyle={{ background: '#f9fafb', width: 150 }}>{fmtCurrency(project.deposit2)}</Descriptions.Item>
                    <Descriptions.Item label="Ngày bổ sung cọc" labelStyle={{ background: '#f9fafb', width: 150 }}>{fmtDate(project.deposit2Date)}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="Doanh thu ước tính" size="small" styles={{ header: headStyle }}>
                <Descriptions column={3} size="small" bordered>
                    <Descriptions.Item label="Hoa hồng ước tính" labelStyle={{ background: '#f9fafb', width: 150 }}>{fmtPct(project.estimatedCommissionPercent)}</Descriptions.Item>
                    <Descriptions.Item label="Hỗ trợ khách" labelStyle={{ background: '#f9fafb', width: 150 }}>{fmtCurrency(project.customerSupport)}</Descriptions.Item>
                    <Descriptions.Item label="Doanh thu ước tính" labelStyle={{ background: '#f9fafb', width: 150 }}>
                        <span style={{ fontWeight: 600, color: '#E8890C' }}>{fmtCurrency(project.estimatedRevenue)}</span>
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {project.staffSlot && (
                <Card title="Cụm nhân sự" size="small" styles={{ header: headStyle }}>
                    <StaffSlotTable slot={project.staffSlot} />
                </Card>
            )}

            <Card
                title={<span style={{ fontSize: 14, fontWeight: 600, color: '#1A2B5A' }}>Danh sách phòng ({project.rooms.length})</span>}
                size="small"
                extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddRoom}>Thêm phòng</Button>}
            >
                <Table dataSource={project.rooms} columns={roomColumns} rowKey="id" pagination={{ pageSize: 50 }} size="small" />
            </Card>

            <Modal
                title={roomModal.room ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
                open={roomModal.open}
                onCancel={() => setRoomModal({ open: false })}
                onOk={handleRoomSubmit}
                confirmLoading={submitting}
                okText="Lưu"
                cancelText="Huỷ"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
                    <div>
                        <div style={{ marginBottom: 4 }}>Mã phòng <span style={{ color: 'red' }}>*</span></div>
                        <Input placeholder="VD: P101" value={roomCode} onChange={e => setRoomCode(e.target.value)} disabled={!!roomModal.room} />
                        {roomErrors.roomCode && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{roomErrors.roomCode}</div>}
                    </div>
                    <div>
                        <div style={{ marginBottom: 4 }}>Số nhà</div>
                        <Input placeholder="VD: 12B" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
                    </div>
                    <div>
                        <div style={{ marginBottom: 4 }}>Giá thuê (VNĐ)</div>
                        <InputNumber
                            min={0}
                            value={rentalPrice ? Number(rentalPrice) : null}
                            onChange={v => setRentalPrice(v ? String(v) : '')}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <div style={{ marginBottom: 4 }}>Giá đặt cọc (VNĐ)</div>
                        <InputNumber
                            min={0}
                            value={depositPrice ? Number(depositPrice) : null}
                            onChange={v => setDepositPrice(v ? String(v) : '')}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <div style={{ marginBottom: 4 }}>Thông tin thêm</div>
                        <Input.TextArea rows={3} value={rentalInfo} onChange={e => setRentalInfo(e.target.value)} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
