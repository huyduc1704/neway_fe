'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Upload as UploadIcon, ExternalLink, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Select, Tag, InputNumber, Checkbox, Spin, Card, Row, Col, Descriptions, Typography, Space, Divider, Upload, DatePicker, Table, Modal, Tooltip } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

/* ─── Types ──────────────────────────────────────────────── */
interface TransactionDetail {
    id: string;
    transactionCode: string;
    status: string;
    collectionStatus: string;
    accountantConfirmed: boolean;
    accountantConfirmedAt: string | null;
    accountantConfirmedBy: { fullName: string } | null;
    isMatched: boolean | null;
    hasFullDeposit: boolean;
    supplementDeposit2: number | null;
    totalDeposit: number | null;
    expectedRevenue: number | null;
    actualRevenue: number | null;
    actualCommissionPercent: number | null;
    revenueDiff: number | null;
    transactionImageUrl: string | null;
    transactedAt: string;
    note: string | null;
    project: {
        id: string; code: string;
        deposit1: number | null;
        deposit2: number | null;
        deposit2Date: string | null;
        checkInDate: string | null;
        customerSupport: number | null;
        estimatedRevenue: number | null;
        rooms?: Array<{ rentalPrice: number | null }>;
    } | null;
    room: { id: string; roomCode: string; rentalPrice: number | null } | null;
    customer: { id: string; fullName: string; phone: string } | null;
    branch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    commissions: Array<{ role: { name: string }; amount: number }>;
}

/* ─── Constants ──────────────────────────────────────────── */
const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'SUCCESS', label: 'Thành công' },
    { value: 'CANCELLED', label: 'Huỷ cọc - Hoàn cọc' },
    { value: 'FAILED', label: 'Thất bại' },
];

const ROLE_MAP: Record<string, string> = {
    'ADMIN': 'Quản trị viên (Admin)',
    'SALE': 'Nhân viên Kinh doanh (Sale)',
    'LEADER': 'Trưởng nhóm (Leader)',
    'KE_TOAN': 'Kế toán',
};
const fmtRole = (name: string) => ROLE_MAP[name] || name;

const fmtCurrency = (v: number | null | undefined) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';
const fmtDate = (v: string | null | undefined) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—';

/* ─── Main component ─────────────────────────────────────── */
export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [tx, setTx] = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);

    /* form state */
    const [status, setStatus] = useState('');
    const [hasFullDeposit, setHasFullDeposit] = useState(false);
    const [addDeposit2, setAddDeposit2] = useState(false);
    const [supplementDeposit2, setSupplementDeposit2] = useState<number | null>(null);
    const [transactedAt, setTransactedAt] = useState('');
    const [actualCommissionPercent, setActualCommissionPercent] = useState<number | null>(null);
    const [manualActualRevenue, setManualActualRevenue] = useState<number | null>(null);
    const [collectionStatus, setCollectionStatus] = useState('NOT_COLLECTED');
    const [note, setNote] = useState('');

    /* ── Fetch ── */
    const fetchTx = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/transactions/${id}`);
            setTx(data);
            setStatus(data.status ?? '');
            setHasFullDeposit(data.hasFullDeposit ?? false);
            setAddDeposit2(!!data.supplementDeposit2);
            setSupplementDeposit2(data.supplementDeposit2 ? Number(data.supplementDeposit2) : null);
            setTransactedAt(data.transactedAt ? dayjs(data.transactedAt).format('YYYY-MM-DDTHH:mm') : '');
            setActualCommissionPercent(data.actualCommissionPercent != null ? Number(data.actualCommissionPercent) : null);
            setManualActualRevenue(data.actualRevenue != null ? Number(data.actualRevenue) : null);
            setCollectionStatus(data.collectionStatus ?? 'NOT_COLLECTED');
            setNote(data.note ?? '');
        } catch {
            toast.error('Không thể tải thông tin giao dịch');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchTx(); }, [fetchTx]);

    /* ── Computed values ── */
    const rentalPrice = Number(tx?.room?.rentalPrice ?? tx?.project?.rooms?.[0]?.rentalPrice ?? 0);
    const deposit1 = Number(tx?.project?.deposit1 ?? 0);
    const deposit2 = Number(tx?.project?.deposit2 ?? 0);
    const customerSupport = Number(tx?.project?.customerSupport ?? 0);

    // tổng tiền cọc
    const totalDeposit = (() => {
        if (hasFullDeposit) return deposit1 + deposit2;
        if (addDeposit2 && supplementDeposit2 != null) return deposit1 + supplementDeposit2;
        return deposit1;
    })();

    // doanh thu thực tế (auto-calc khi SUCCESS)
    const autoActualRevenue = (() => {
        if (status !== 'SUCCESS') return null;
        const pct = actualCommissionPercent || 0;
        if (!pct || !rentalPrice) return null;
        return rentalPrice * (pct / 100) - customerSupport;
    })();
    const displayActualRevenue = status === 'CANCELLED'
        ? (manualActualRevenue != null ? manualActualRevenue : null)
        : autoActualRevenue;

    // chênh lệch
    const revenueDiff = displayActualRevenue != null && tx?.project?.estimatedRevenue != null
        ? displayActualRevenue - Number(tx.project.estimatedRevenue)
        : null;

    // khớp lệnh
    const isMatched = (() => {
        if (!transactedAt || !tx?.project?.checkInDate) return null;
        return dayjs(transactedAt).isBefore(dayjs(tx.project.checkInDate).add(1, 'day'))
            || dayjs(transactedAt).isSame(dayjs(tx.project.checkInDate), 'day');
    })();

    /* ── Save ── */
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                status,
                hasFullDeposit,
                supplementDeposit2: addDeposit2 && supplementDeposit2 != null ? supplementDeposit2 : 0,
                transactedAt: transactedAt ? new Date(transactedAt).toISOString() : undefined,
                actualCommissionPercent: actualCommissionPercent != null ? actualCommissionPercent : undefined,
                actualRevenue: status === 'CANCELLED' && manualActualRevenue != null ? manualActualRevenue : undefined,
                collectionStatus,
                note: note || undefined,
            };
            await api.patch(`/transactions/${id}`, payload);
            toast.success('Cập nhật giao dịch thành công');
            fetchTx();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSaving(false);
        }
    };

    /* ── Kế toán xác nhận ── */
    const handleConfirm = () => {
        Modal.confirm({
            title: 'Xác nhận giao dịch',
            content: 'Bạn có chắc chắn muốn xác nhận giao dịch này với tư cách kế toán?',
            okText: 'Xác nhận',
            cancelText: 'Huỷ',
            okButtonProps: { style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } },
            onOk: async () => {
                setConfirming(true);
                try {
                    await api.patch(`/transactions/${id}/confirm`);
                    toast.success('Đã xác nhận giao dịch');
                    fetchTx();
                } catch (err: any) {
                    toast.error(err?.response?.data?.message || 'Thao tác thất bại');
                } finally {
                    setConfirming(false);
                }
            }
        });
    };

    /* ── Upload ảnh ── */
    const handleImageUpload = async (file: File) => {
        setUploadingImg(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.patch(`/transactions/${id}/image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Upload ảnh thành công');
            fetchTx();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upload thất bại');
        } finally {
            setUploadingImg(false);
        }
    };

    /* ── Render ── */
    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Spin size="large" />
        </div>
    );
    if (!tx) return null;

    const isLocked = tx.accountantConfirmed || tx.status === 'SUCCESS';

    return (
        <div className="space-y-4 pb-8" style={{ padding: '0 24px', backgroundColor: '#f0f2f5', minHeight: '100vh', paddingTop: '24px' }}>
            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Space size="middle" align="center">
                        <Button 
                            icon={<ArrowLeft className="h-4 w-4" />} 
                            onClick={() => router.back()}
                        >
                            Quay lại
                        </Button>
                        <Title level={4} style={{ margin: 0, color: '#1A2B5A' }}>
                            Giao dịch — <Tag color="orange" style={{ fontSize: '14px', padding: '2px 8px' }}>{tx.transactionCode}</Tag>
                        </Title>
                    </Space>
                </Col>
                <Col>
                    <Space>
                        {!tx.accountantConfirmed && (
                            <Tooltip title={status === 'PENDING' ? 'Không thể xác nhận giao dịch đang ở trạng thái Chờ xử lý' : ''}>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={confirming || status === 'PENDING'}
                                    icon={<CheckCircle className="h-4 w-4" />}
                                    style={status === 'PENDING' ? {} : { borderColor: '#52c41a', color: '#52c41a' }}
                                >
                                    {confirming ? 'Đang xác nhận...' : 'Kế toán xác nhận'}
                                </Button>
                            </Tooltip>
                        )}
                        {tx.accountantConfirmed && (
                            <Tag icon={<CheckCircle className="h-3 w-3" />} color="success" style={{ padding: '6px 12px', fontSize: '14px' }}>
                                KT đã xác nhận — {fmtDate(tx.accountantConfirmedAt)}
                                {tx.accountantConfirmedBy && ` (${tx.accountantConfirmedBy.fullName})`}
                            </Tag>
                        )}
                        <Button type="primary" onClick={handleSave} loading={saving} style={{ backgroundColor: '#E8890C', borderColor: '#E8890C' }}>
                            Lưu thay đổi
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                {/* ── Cột trái: Thông tin giao dịch ── */}
                <Col xs={24} md={12}>
                    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                        
                        {/* Thông tin cơ bản */}
                        <Card title={<span style={{ color: '#E8890C' }}>Thông tin cơ bản</span>} bordered={false}>
                            <Descriptions column={1} bordered size="small" labelStyle={{ width: '160px', backgroundColor: '#fff7e6', color: '#E8890C', fontWeight: 500 }}>
                                <Descriptions.Item label="Mã giao dịch">{tx.transactionCode}</Descriptions.Item>
                                <Descriptions.Item label="Dự án">{tx.project?.code || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Phòng">{tx.room?.roomCode || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Khách hàng">
                                    <div>
                                        <div>{tx.customer?.fullName || '—'}</div>
                                        {tx.customer?.phone && <Text type="secondary" style={{ fontSize: '12px' }}>{tx.customer.phone}</Text>}
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="Chi nhánh">{tx.branch?.name || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Khu vực">{tx.team?.name || '—'}</Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {/* Tiền cọc */}
                        <Card title={<span style={{ color: '#E8890C' }}>Tiền cọc</span>} bordered={false}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Row justify="space-between">
                                    <Col><Text type="secondary">Tiền cọc lần 1</Text></Col>
                                    <Col><Text strong>{fmtCurrency(deposit1 || null)}</Text></Col>
                                </Row>

                                <div>
                                    <Checkbox
                                        checked={hasFullDeposit}
                                        onChange={e => { setHasFullDeposit(e.target.checked); if (e.target.checked) setAddDeposit2(false); }}
                                    >
                                        Đã bổ sung cọc đủ
                                    </Checkbox>
                                    {hasFullDeposit && deposit2 > 0 && (
                                        <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                                            (+ {fmtCurrency(deposit2 || null)} bổ sung)
                                        </Text>
                                    )}
                                </div>

                                {!hasFullDeposit && (
                                    <div style={{ paddingLeft: 24 }}>
                                        <Checkbox
                                            checked={addDeposit2}
                                            onChange={e => { setAddDeposit2(e.target.checked); if (!e.target.checked) setSupplementDeposit2(null); }}
                                        >
                                            Bổ sung cọc lần 2
                                        </Checkbox>
                                        {addDeposit2 && (
                                            <div style={{ marginTop: 8 }}>
                                                <div style={{ marginBottom: 4, fontSize: '12px' }}>Số tiền bổ sung (VNĐ)</div>
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    placeholder="Nhập số tiền"
                                                    value={supplementDeposit2}
                                                    onChange={val => setSupplementDeposit2(val)}
                                                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                                    parser={(value) => value?.replace(/\./g, '') as unknown as number}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Divider style={{ margin: '8px 0' }} />
                                
                                <Row justify="space-between">
                                    <Col><Text strong>Tổng tiền cọc</Text></Col>
                                    <Col><Text strong style={{ color: '#E8890C', fontSize: '16px' }}>{fmtCurrency(totalDeposit || null)}</Text></Col>
                                </Row>
                            </Space>
                        </Card>

                        {/* Ảnh giao dịch */}
                        <Card title={<span style={{ color: '#E8890C' }}>Ảnh giao dịch</span>} bordered={false}>
                            <Space size="middle" align="center">
                                {tx.transactionImageUrl ? (
                                    <a href={tx.transactionImageUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <ExternalLink className="h-4 w-4" /> Xem ảnh
                                    </a>
                                ) : (
                                    <Text type="secondary">Chưa có ảnh</Text>
                                )}
                                <Upload
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        handleImageUpload(file);
                                        return false;
                                    }}
                                    disabled={uploadingImg}
                                >
                                    <Button icon={<UploadIcon className="h-4 w-4" />} loading={uploadingImg}>
                                        {tx.transactionImageUrl ? 'Thay ảnh' : 'Upload ảnh'}
                                    </Button>
                                </Upload>
                            </Space>
                        </Card>
                    </Space>
                </Col>

                {/* ── Cột phải: Nghiệp vụ ── */}
                <Col xs={24} md={12}>
                    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                        
                        {/* Tình trạng & Ngày GD */}
                        <Card title={<span style={{ color: '#E8890C' }}>Tình trạng giao dịch</span>} bordered={false}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div>
                                    <div style={{ marginBottom: 4 }}>Tình trạng</div>
                                    <Select 
                                        style={{ width: '100%' }}
                                        value={status} 
                                        onChange={setStatus} 
                                        disabled={isLocked}
                                        options={STATUS_OPTIONS}
                                    />
                                </div>

                                <div>
                                    <div style={{ marginBottom: 4 }}>Ngày GDTC / GDHC</div>
                                    <DatePicker 
                                        showTime 
                                        format="DD/MM/YYYY HH:mm"
                                        style={{ width: '100%' }}
                                        value={transactedAt ? dayjs(transactedAt) : null}
                                        onChange={(date) => setTransactedAt(date ? date.toISOString() : '')}
                                        disabled={isLocked}
                                        placeholder="Chọn ngày giờ"
                                    />
                                </div>

                                {/* Khớp lệnh */}
                                <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Text type="secondary" style={{ width: '80px' }}>Khớp lệnh</Text>
                                    {!transactedAt || !tx.project?.checkInDate ? (
                                        <Text type="secondary" style={{ fontSize: '12px' }}>— (chưa đủ dữ liệu)</Text>
                                    ) : isMatched ? (
                                        <Tag color="success">Khớp</Tag>
                                    ) : (
                                        <Space align="center">
                                            <Tag color="error">Không khớp</Tag>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Ngày nhận phòng: {dayjs(tx.project.checkInDate).format('DD/MM/YYYY')}
                                            </Text>
                                        </Space>
                                    )}
                                </div>

                                <div>
                                    <div style={{ marginBottom: 4 }}>Trạng thái thu</div>
                                    <Select 
                                        style={{ width: '100%' }}
                                        value={collectionStatus} 
                                        onChange={setCollectionStatus}
                                        options={[
                                            { value: 'NOT_COLLECTED', label: 'Chưa thu' },
                                            { value: 'COLLECTED', label: 'Đã thu' }
                                        ]}
                                    />
                                </div>
                            </Space>
                        </Card>

                        {/* Doanh thu */}
                        <Card title={<span style={{ color: '#E8890C' }}>Doanh thu</span>} bordered={false}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Row justify="space-between">
                                    <Col><Text type="secondary">Doanh thu ước tính</Text></Col>
                                    <Col><Text strong>{fmtCurrency(tx.project?.estimatedRevenue ?? null)}</Text></Col>
                                </Row>

                                {status === 'SUCCESS' && (
                                    <div>
                                        <div style={{ marginBottom: 4 }}>Hoa hồng thực tế (%)</div>
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={0} max={100} step={0.01}
                                            placeholder="VD: 5"
                                            value={actualCommissionPercent}
                                            onChange={val => setActualCommissionPercent(val)}
                                            disabled={isLocked}
                                        />
                                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                                            Doanh thu TT = Giá phòng × Hoa hồng% − Hỗ trợ khách
                                        </Text>
                                    </div>
                                )}

                                {status === 'CANCELLED' && (
                                    <div>
                                        <div style={{ marginBottom: 4 }}>Doanh thu thực tế (VNĐ)</div>
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={0}
                                            placeholder="Nhập doanh thu thực tế"
                                            value={manualActualRevenue}
                                            onChange={val => setManualActualRevenue(val)}
                                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                            parser={(value) => value?.replace(/\./g, '') as unknown as number}
                                        />
                                    </div>
                                )}

                                <Divider style={{ margin: '8px 0' }} />

                                <Row justify="space-between">
                                    <Col><Text strong>Doanh thu thực tế</Text></Col>
                                    <Col>
                                        <Text strong style={{ color: displayActualRevenue != null ? '#E8890C' : '#bfbfbf', fontSize: '16px' }}>
                                            {fmtCurrency(displayActualRevenue ?? null)}
                                        </Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col><Text strong>Chênh lệch</Text></Col>
                                    <Col>
                                        {revenueDiff != null ? (
                                            <Space size="small">
                                                <Text strong style={{ color: revenueDiff >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                                    {revenueDiff >= 0 ? '+' : ''}{fmtCurrency(revenueDiff)}
                                                </Text>
                                                {revenueDiff < 0 && <AlertTriangle className="h-4 w-4 text-red-400" />}
                                            </Space>
                                        ) : (
                                            <Text type="secondary">—</Text>
                                        )}
                                    </Col>
                                </Row>
                            </Space>
                        </Card>

                        {/* Hoa hồng theo vai trò */}
                        {tx.status === 'SUCCESS' && (
                            <Card
                                title={<span style={{ color: '#E8890C' }}>Hoa hồng theo vai trò</span>}
                                bordered={false}
                                extra={
                                    <Button
                                        size="small"
                                        onClick={async () => {
                                            try {
                                                await api.post(`/transactions/${id}/recalculate`);
                                                toast.success('Đã tính lại hoa hồng thành công');
                                                fetchTx();
                                            } catch (err: any) {
                                                toast.error(err?.response?.data?.message || 'Tính lại thất bại');
                                            }
                                        }}
                                        style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                                    >
                                        Tính lại hoa hồng
                                    </Button>
                                }
                            >
                                {tx.commissions && tx.commissions.length > 0 ? (
                                    <Table
                                        dataSource={tx.commissions}
                                        pagination={false}
                                        size="small"
                                        rowKey={(_r, i) => String(i)}
                                    >
                                        <Table.Column title="Vai trò" dataIndex={['role', 'name']} key="role" render={(val: string) => fmtRole(val)} />
                                        <Table.Column
                                            title="Số tiền"
                                            dataIndex="amount"
                                            key="amount"
                                            align="right"
                                            render={(val) => <Text strong style={{ color: '#1A2B5A' }}>{fmtCurrency(val)}</Text>}
                                        />
                                    </Table>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 13 }}>Chưa có hoa hồng</Text>
                                )}
                            </Card>
                        )}

                        {/* Ghi chú */}
                        <Card title={<span style={{ color: '#E8890C' }}>Ghi chú</span>} bordered={false}>
                            <TextArea
                                rows={4}
                                placeholder="Ghi chú thêm..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </Card>
                    </Space>
                </Col>
            </Row>
        </div>
    );
}
