'use client';
import { useEffect, useState, useCallback } from 'react';
import { message, Table, Button, Tag, Card, Typography, Space, Modal, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import dayjs from 'dayjs';
import { useUser } from '@/context/UserContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface EditRequest {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reason: string;
    reviewNote: string | null;
    expiresAt: string | null;
    createdAt: string;
    project: { id: string; code: string; ward: string } | null;
    requestedBy: { id: string; fullName: string } | null;
    reviewedBy: { id: string; fullName: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    PENDING:  { label: 'Chờ duyệt', color: 'warning' },
    APPROVED: { label: 'Đã duyệt',  color: 'success' },
    REJECTED: { label: 'Từ chối',   color: 'error' },
};

export default function YeuCauChinhSuaPage() {
    const { can } = useUser();
    const [requests, setRequests] = useState<EditRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [reviewModal, setReviewModal] = useState<{ open: boolean; id: string; action: 'APPROVE' | 'REJECT' } | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewing, setReviewing] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/edit-requests/pending');
            setRequests(data);
        } catch { message.error('Không thể tải danh sách yêu cầu'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const openReview = (id: string, action: 'APPROVE' | 'REJECT') => {
        setReviewNote('');
        setReviewModal({ open: true, id, action });
    };

    const handleReview = async () => {
        if (!reviewModal) return;
        setReviewing(true);
        try {
            await api.post(`/edit-requests/${reviewModal.id}/review`, {
                action: reviewModal.action,
                reviewNote: reviewNote || undefined,
            });
            message.success(reviewModal.action === 'APPROVE' ? 'Đ�� duyệt yêu cầu' : 'Đã từ chối yêu cầu');
            setReviewModal(null);
            fetchRequests();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setReviewing(false); }
    };

    const columns: ColumnsType<EditRequest> = [
        { title: 'STT', key: 'stt', width: 50, align: 'center', render: (_, __, i) => i + 1 },
        {
            title: 'Dự án', key: 'project', width: 160,
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{r.project?.code || '—'}</div>
                    {r.project?.ward && <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.project.ward}</div>}
                </div>
            ),
        },
        { title: 'Người yêu cầu', key: 'requestedBy', width: 160, render: (_, r) => r.requestedBy?.fullName || '—' },
        {
            title: 'Lý do', key: 'reason',
            render: (_, r) => <Text style={{ fontSize: 13 }}>{r.reason}</Text>,
        },
        {
            title: 'Trạng thái', key: 'status', width: 110, align: 'center',
            render: (_, r) => {
                const s = STATUS_LABEL[r.status];
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: 'Hết hạn', key: 'expires', width: 110, align: 'center',
            render: (_, r) => r.expiresAt ? dayjs(r.expiresAt).format('DD/MM/YYYY') : <Text type="secondary">Không giới hạn</Text>,
        },
        { title: 'Ngày tạo', key: 'createdAt', width: 110, align: 'center', render: (_, r) => dayjs(r.createdAt).format('DD/MM/YYYY') },
        {
            title: 'Thao tác', key: 'actions', width: 120, align: 'center',
            render: (_, r) => r.status === 'PENDING' && can('EDIT_REQUEST_APPROVE') ? (
                <Space>
                    <button
                        title="Duyệt"
                        style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}
                        onClick={() => openReview(r.id, 'APPROVE')}
                    >
                        <CheckCircle size={18} />
                    </button>
                    <button
                        title="Từ chối"
                        style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        onClick={() => openReview(r.id, 'REJECT')}
                    >
                        <XCircle size={18} />
                    </button>
                </Space>
            ) : null,
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Yêu cầu chỉnh sửa giao dịch</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Danh sách yêu cầu chỉnh sửa từ nhân viên cho các giao dịch trong kỳ lương đã khoá
                </Text>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={requests}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 20, showTotal: (t) => `${t} yêu cầu` }}
                />
            </Card>

            <Modal
                open={reviewModal?.open}
                title={reviewModal?.action === 'APPROVE' ? 'Duyệt yêu cầu chỉnh sửa' : 'Từ chối yêu cầu chỉnh sửa'}
                onOk={handleReview}
                onCancel={() => setReviewModal(null)}
                okText={reviewModal?.action === 'APPROVE' ? 'Duyệt' : 'Từ chối'}
                okButtonProps={{
                    loading: reviewing,
                    danger: reviewModal?.action === 'REJECT',
                    style: reviewModal?.action === 'APPROVE' ? { background: '#1A2B5A' } : undefined,
                }}
                cancelText="Huỷ"
            >
                <div style={{ marginBottom: 8 }}>Ghi chú (tuỳ chọn):</div>
                <TextArea
                    rows={3}
                    placeholder="Nhập ghi chú duyệt / từ chối..."
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                />
            </Modal>
        </>
    );
}
