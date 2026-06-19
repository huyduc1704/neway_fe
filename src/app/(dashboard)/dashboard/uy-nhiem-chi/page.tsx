'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Form, Input, Select,
    InputNumber, DatePicker, Upload, Typography, message, Alert,
    Descriptions, Divider, Popconfirm, Spin, Badge, Row, Col, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd';
import {
    PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
    CheckOutlined, CloseOutlined, DollarOutlined, WarningOutlined,
    UploadOutlined, CalendarOutlined, FileTextOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { useUser } from '@/context/UserContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const PROVINCES_API = 'https://provinces.open-api.vn/api/v2';

// ── Constants ─────────────────────────────────────────────────────────────────

const DISBURSEMENT_TYPES = [
    { value: 'CUSTOMER_SUPPORT', label: 'Hỗ Trợ Khách' },
    { value: 'OFFICE_EXPENSE', label: 'Chi Phí Văn Phòng' },
    { value: 'DEPOSIT_REFUND', label: 'Hoàn Cọc Khách/Chủ nhà' },
    { value: 'FOOD_TRAVEL', label: 'Ăn Uống / Công Tác' },
    { value: 'COMMITMENT_DEPOSIT', label: 'Cọc Cam Kết' },
    { value: 'SALARY_ADVANCE', label: 'Ứng Lương' },
    { value: 'OTHER', label: 'Khác' },
];

const TYPE_LABEL: Record<string, string> = {
    CUSTOMER_SUPPORT: 'Hỗ Trợ Khách',
    OFFICE_EXPENSE: 'Chi Phí Văn Phòng',
    DEPOSIT_REFUND: 'Hoàn Cọc Khách/CN',
    FOOD_TRAVEL: 'Ăn Uống/Công Tác',
    COMMITMENT_DEPOSIT: 'Cọc Cam Kết',
    SALARY_ADVANCE: 'Ứng Lương',
    OTHER: 'Khác',
};

const TYPE_COLOR: Record<string, string> = {
    CUSTOMER_SUPPORT: 'blue',
    OFFICE_EXPENSE: 'cyan',
    DEPOSIT_REFUND: 'orange',
    FOOD_TRAVEL: 'purple',
    COMMITMENT_DEPOSIT: 'volcano',
    SALARY_ADVANCE: 'green',
    OTHER: 'default',
};

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Chờ Duyệt',
    ACCOUNTANT_APPROVED: 'KT Đã Duyệt',
    APPROVED: 'Đã Duyệt',
    DISBURSED: 'Đã Chi',
    CANCELLED: 'Đã Huỷ',
};

const STATUS_COLOR: Record<string, string> = {
    PENDING: 'warning',
    ACCOUNTANT_APPROVED: 'processing',
    APPROVED: 'success',
    DISBURSED: 'purple',
    CANCELLED: 'error',
};

const fmt = (v: any) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(Number(v)) + ' đ' : '—';
const fmtDate = (v: any) => (v ? dayjs(v).format('DD/MM/YYYY') : '—');
const fmtDateTime = (v: any) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—');

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisbursementRow {
    id: string; code: string; type: string; status: string; amount: string;
    reason?: string; returnDate?: string; returnDateExtended?: string;
    returnDateAlertDisabled?: boolean; createdAt: string;
    createdBy?: { id: string; fullName?: string };
    transaction?: { transactionCode: string };
    employee?: { employeeCode: string; user?: { fullName?: string } };
}

interface DisbursementDetail extends DisbursementRow {
    note?: string; imageUrl?: string; expenseDate?: string;
    bankAccount?: string; bankName?: string; accountHolder?: string;
    houseNumber?: string; province?: string; ward?: string;
    roomCode?: string; commitmentContent?: string;
    accountantApprovedAt?: string; chiefApprovedAt?: string;
    disbursedAt?: string; cancelledAt?: string; cancelReason?: string;
    transaction?: {
        id: string; transactionCode: string; actualValue: string;
        collectionStatus: string; transactedAt: string;
        project?: { deposit1?: string; deposit2?: string; depositDate?: string };
        customer?: { fullName?: string; phone?: string };
    };
    employee?: {
        id: string; employeeCode: string; bankAccount?: string;
        user?: { fullName?: string };
    };
    accountantApprovedBy?: { id: string; fullName?: string };
    chiefApprovedBy?: { id: string; fullName?: string };
    disbursedBy?: { id: string; fullName?: string };
    cancelledBy?: { id: string; fullName?: string };
}

interface TxOption {
    id: string; transactionCode: string; collectionStatus: string;
    customer?: { fullName?: string };
    project?: { depositDate?: string };
}

interface ProvinceOption { code: number; name: string; }
interface WardOption { code: string; name: string; }

// ── FormModal ─────────────────────────────────────────────────────────────────

function FormModal({
    open, editingItem, onClose, onSuccess,
}: {
    open: boolean;
    editingItem: DisbursementDetail | null;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('');
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    // Transaction search (for CUSTOMER_SUPPORT & DEPOSIT_REFUND)
    const [txOptions, setTxOptions] = useState<TxOption[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [selectedTx, setSelectedTx] = useState<TxOption | null>(null);
    const txSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Province/Ward (for COMMITMENT_DEPOSIT)
    const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
    const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
    const [wardSearch, setWardSearch] = useState('');
    const [wardsLoading, setWardsLoading] = useState(false);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);
    const filteredWards = useMemo(() => {
        const q = wardSearch.toLowerCase();
        if (!q) return wardOptions.slice(0, 100);
        return wardOptions.filter(w => w.name.toLowerCase().includes(q)).slice(0, 100);
    }, [wardSearch, wardOptions]);

    // Current employee info (for SALARY_ADVANCE & COMMITMENT_DEPOSIT)
    const [currentEmployee, setCurrentEmployee] = useState<{ fullName?: string; bankAccount?: string } | null>(null);

    useEffect(() => {
        if (!open) return;
        // Load provinces once
        fetch(`${PROVINCES_API}/p/`)
            .then(r => r.json())
            .then(setProvinceOptions)
            .catch(() => {});
        // Load current employee info (fullName from localStorage, bankAccount from API)
        const storedUser = authStorage.getUser();
        api.get('/auth/me').then(({ data }) => {
            setCurrentEmployee({
                fullName: storedUser?.fullName,
                bankAccount: data.profile?.bankAccount,
            });
        }).catch(() => {
            setCurrentEmployee({ fullName: storedUser?.fullName, bankAccount: undefined });
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (editingItem) {
            setSelectedType(editingItem.type);
            form.setFieldsValue({
                type: editingItem.type,
                amount: editingItem.amount ? Number(editingItem.amount) : undefined,
                reason: editingItem.reason,
                note: editingItem.note,
                bankAccount: editingItem.bankAccount,
                bankName: editingItem.bankName,
                accountHolder: editingItem.accountHolder,
                expenseDate: editingItem.expenseDate ? dayjs(editingItem.expenseDate) : undefined,
                transactionId: editingItem.transaction?.id,
                returnDate: editingItem.returnDate ? dayjs(editingItem.returnDate) : undefined,
                houseNumber: editingItem.houseNumber,
                province: editingItem.province,
                ward: editingItem.ward,
                roomCode: editingItem.roomCode,
                commitmentContent: editingItem.commitmentContent,
            });
            if (editingItem.transaction) {
                setSelectedTx(editingItem.transaction as any);
            }
            if (editingItem.imageUrl) {
                setFileList([{ uid: '-1', name: 'image', status: 'done', url: editingItem.imageUrl }]);
            }
            // Pre-load wards for edit
            if (editingItem.province && editingItem.type === 'COMMITMENT_DEPOSIT') {
                fetch(`${PROVINCES_API}/p/`)
                    .then(r => r.json())
                    .then((provinces: ProvinceOption[]) => {
                        const prov = provinces.find(p => p.name === editingItem.province);
                        if (prov) loadWards(prov.code);
                    })
                    .catch(() => {});
            }
        } else {
            form.resetFields();
            setSelectedType('');
            setSelectedTx(null);
            setFileList([]);
            setWardOptions([]);
            setSelectedProvinceCode(null);
        }
    }, [open, editingItem]);

    const loadWards = async (code: number) => {
        setWardsLoading(true);
        try {
            const r = await fetch(`${PROVINCES_API}/p/${code}?depth=2`);
            const data = await r.json();
            setWardOptions(data.wards ?? []);
        } catch {} finally { setWardsLoading(false); }
    };

    const handleProvinceChange = async (value: string | undefined, option: any) => {
        form.setFieldValue('ward', undefined);
        setWardOptions([]);
        setWardSearch('');
        if (!value) { setSelectedProvinceCode(null); return; }
        const code = Array.isArray(option) ? option[0]?.code : option?.code;
        setSelectedProvinceCode(code ?? null);
        if (code) await loadWards(code);
    };

    const searchTransactions = (q: string) => {
        if (txSearchRef.current) clearTimeout(txSearchRef.current);
        txSearchRef.current = setTimeout(async () => {
            if (!q || q.length < 2) { setTxOptions([]); return; }
            setTxLoading(true);
            try {
                const { data } = await api.get('/transactions', { params: { search: q, limit: 20 } });
                setTxOptions(data.data ?? []);
            } catch {} finally { setTxLoading(false); }
        }, 400);
    };

    const handleTxSelect = (txId: string) => {
        const tx = txOptions.find(t => t.id === txId);
        setSelectedTx(tx ?? null);
        if (tx && selectedType === 'SALARY_ADVANCE') {
            form.setFieldValue('accountHolder', tx.customer?.fullName);
        }
    };

    const handleTypeChange = (type: string) => {
        setSelectedType(type);
        setSelectedTx(null);
        form.setFieldsValue({
            transactionId: undefined,
            expenseDate: undefined,
            returnDate: undefined,
            houseNumber: undefined,
            province: undefined,
            ward: undefined,
            roomCode: undefined,
            commitmentContent: undefined,
            bankAccount: type === 'SALARY_ADVANCE' ? currentEmployee?.bankAccount : undefined,
            accountHolder: undefined,
        });
        setWardOptions([]);
        setSelectedProvinceCode(null);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const payload: any = {
                type: values.type,
                amount: values.amount,
                reason: values.reason || undefined,
                note: values.note || undefined,
                bankAccount: values.bankAccount || undefined,
                bankName: values.bankName || undefined,
                accountHolder: values.accountHolder || undefined,
                expenseDate: values.expenseDate ? values.expenseDate.toISOString() : undefined,
                transactionId: values.transactionId || undefined,
                returnDate: values.returnDate ? values.returnDate.toISOString() : undefined,
                houseNumber: values.houseNumber || undefined,
                province: values.province || undefined,
                ward: values.ward || undefined,
                roomCode: values.roomCode || undefined,
                commitmentContent: values.commitmentContent || undefined,
            };

            let savedId = editingItem?.id;

            if (editingItem) {
                await api.patch(`/disbursements/${editingItem.id}`, payload);
                message.success('Cập nhật uỷ nhiệm chi thành công');
            } else {
                const { data } = await api.post('/disbursements', payload);
                savedId = data.id;
                message.success('Tạo uỷ nhiệm chi thành công');
            }

            // Upload image if any
            const newFile = fileList.find(f => f.originFileObj);
            if (savedId && newFile?.originFileObj) {
                const fd = new FormData();
                fd.append('file', newFile.originFileObj as File);
                await api.patch(`/disbursements/${savedId}/image`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            if (err?.response) message.error(err.response.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const needsTx = selectedType === 'CUSTOMER_SUPPORT' || selectedType === 'DEPOSIT_REFUND';
    const needsExpenseDate = ['OFFICE_EXPENSE', 'FOOD_TRAVEL', 'OTHER'].includes(selectedType);
    const needsBankInfo = ['OFFICE_EXPENSE', 'FOOD_TRAVEL', 'OTHER', 'DEPOSIT_REFUND', 'COMMITMENT_DEPOSIT'].includes(selectedType);
    const needsImage = ['CUSTOMER_SUPPORT', 'DEPOSIT_REFUND', 'COMMITMENT_DEPOSIT'].includes(selectedType);
    const isCommitment = selectedType === 'COMMITMENT_DEPOSIT';
    const isSalaryAdvance = selectedType === 'SALARY_ADVANCE';

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileTextOutlined style={{ color: '#E8890C' }} />
                    {editingItem ? 'Chỉnh sửa Uỷ Nhiệm Chi' : 'Tạo Uỷ Nhiệm Chi'}
                </span>
            }
            footer={[
                <Button key="cancel" onClick={onClose}>Huỷ</Button>,
                <Button key="ok" type="primary" onClick={handleSave} loading={saving}>
                    {editingItem ? 'Cập nhật' : 'Tạo mới'}
                </Button>,
            ]}
            width={620}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>

                {/* Loại chi */}
                <Form.Item name="type" label="Phân loại việc chi" rules={[{ required: true, message: 'Chọn loại chi' }]}>
                    <Select
                        placeholder="Chọn loại chi"
                        disabled={!!editingItem}
                        onChange={handleTypeChange}
                        options={DISBURSEMENT_TYPES}
                    />
                </Form.Item>

                {/* ── Hỗ Trợ Khách & Hoàn Cọc: chọn giao dịch ── */}
                {needsTx && (
                    <>
                        <Form.Item
                            name="transactionId"
                            label="Mã Giao Dịch"
                            rules={[{ required: true, message: 'Chọn giao dịch' }]}
                        >
                            <Select
                                showSearch
                                filterOption={false}
                                onSearch={searchTransactions}
                                onSelect={handleTxSelect}
                                loading={txLoading}
                                placeholder="Nhập mã giao dịch để tìm kiếm..."
                                notFoundContent={txLoading ? <Spin size="small" /> : 'Không tìm thấy'}
                                options={txOptions.map(t => ({
                                    value: t.id,
                                    label: `${t.transactionCode}${t.customer?.fullName ? ' — ' + t.customer.fullName : ''}`,
                                }))}
                            />
                        </Form.Item>
                        {selectedTx && (
                            <div style={{
                                background: '#f0f9ff', border: '1px solid #bae6fd',
                                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13,
                            }}>
                                <div>
                                    <Text type="secondary">Tình trạng thu: </Text>
                                    <Tag color={selectedTx.collectionStatus === 'COLLECTED' ? 'success' : 'warning'}>
                                        {selectedTx.collectionStatus === 'COLLECTED' ? 'Đã thu' :
                                            selectedTx.collectionStatus === 'PARTIAL' ? 'Thu một phần' : 'Chưa thu'}
                                    </Tag>
                                </div>
                                {selectedTx.customer?.fullName && (
                                    <div><Text type="secondary">Khách hàng: </Text><strong>{selectedTx.customer.fullName}</strong></div>
                                )}
                                {selectedType === 'DEPOSIT_REFUND' && selectedTx.project?.depositDate && (
                                    <div><Text type="secondary">Ngày đặt cọc: </Text><strong>{fmtDate(selectedTx.project.depositDate)}</strong></div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ── CUSTOMER_SUPPORT: STK nhận ── */}
                {selectedType === 'CUSTOMER_SUPPORT' && (
                    <>
                        <Form.Item name="amount" label="Số tiền hỗ trợ (VND)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Nhập số tiền" />
                        </Form.Item>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Form.Item name="bankAccount" label="Số tài khoản">
                                <Input placeholder="Số TK nhận tiền" />
                            </Form.Item>
                            <Form.Item name="bankName" label="Ngân hàng">
                                <Input placeholder="Tên ngân hàng" />
                            </Form.Item>
                        </div>
                    </>
                )}

                {/* ── OFFICE_EXPENSE & FOOD_TRAVEL & OTHER ── */}
                {needsExpenseDate && (
                    <>
                        <Form.Item name="expenseDate" label="Ngày chi" rules={[{ required: true, message: 'Chọn ngày' }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày chi" />
                        </Form.Item>
                        <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}>
                            <Input.TextArea rows={2} placeholder="Nội dung chi tiêu" />
                        </Form.Item>
                        <Form.Item name="amount" label="Số tiền (VND)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Nhập số tiền" />
                        </Form.Item>
                    </>
                )}

                {/* ── DEPOSIT_REFUND: thêm lý do & số tiền ── */}
                {selectedType === 'DEPOSIT_REFUND' && (
                    <>
                        <Form.Item name="reason" label="Lý do hoàn cọc" rules={[{ required: true, message: 'Nhập lý do' }]}>
                            <Input.TextArea rows={2} placeholder="Lý do hoàn cọc" />
                        </Form.Item>
                        <Form.Item name="amount" label="Số tiền hoàn (VND)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Nhập số tiền" />
                        </Form.Item>
                    </>
                )}

                {/* ── Bank info chung ── */}
                {needsBankInfo && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Form.Item name="bankAccount" label="Số tài khoản">
                            <Input placeholder="Số TK nhận tiền" />
                        </Form.Item>
                        <Form.Item name="bankName" label="Ngân hàng">
                            <Input placeholder="Tên ngân hàng" />
                        </Form.Item>
                        <Form.Item name="accountHolder" label="Tên chủ tài khoản" style={{ gridColumn: '1 / -1' }}>
                            <Input placeholder="Họ và tên chủ TK" />
                        </Form.Item>
                    </div>
                )}

                {/* ── COMMITMENT_DEPOSIT ── */}
                {isCommitment && (
                    <>
                        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                            <Text type="secondary">Ngày tạo form: </Text>
                            <strong>{dayjs().format('DD/MM/YYYY')}</strong>
                            {currentEmployee?.fullName && (
                                <span style={{ marginLeft: 16 }}>
                                    <Text type="secondary">Nhân sự: </Text>
                                    <strong>{currentEmployee.fullName}</strong>
                                </span>
                            )}
                        </div>
                        <Form.Item name="returnDate" label="Ngày hoàn trả" rules={[{ required: true, message: 'Chọn ngày hoàn trả' }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Ngày dự kiến hoàn trả" />
                        </Form.Item>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <Form.Item name="houseNumber" label="Số nhà">
                                <Input placeholder="Số nhà" />
                            </Form.Item>
                            <Form.Item name="province" label="Tỉnh / Thành phố">
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Chọn tỉnh..."
                                    filterOption={(input, option) =>
                                        (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={provinceOptions.map(p => ({ value: p.name, label: p.name, code: p.code }))}
                                    onChange={handleProvinceChange}
                                />
                            </Form.Item>
                            <Form.Item name="ward" label="Phường / Xã">
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder={selectedProvinceCode ? 'Chọn phường/xã' : 'Chọn tỉnh trước'}
                                    disabled={!selectedProvinceCode && wardOptions.length === 0}
                                    loading={wardsLoading}
                                    filterOption={false}
                                    onSearch={setWardSearch}
                                    options={filteredWards.map(w => ({ value: w.name, label: w.name }))}
                                />
                            </Form.Item>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Form.Item name="roomCode" label="Mã phòng">
                                <Input placeholder="Mã phòng / căn hộ" />
                            </Form.Item>
                            <Form.Item name="amount" label="Số tiền cọc (VND)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Số tiền" />
                            </Form.Item>
                        </div>
                        <Form.Item name="commitmentContent" label="Nội dung cam kết">
                            <Input.TextArea rows={3} placeholder="Nội dung cam kết cọc" />
                        </Form.Item>
                    </>
                )}

                {/* ── SALARY_ADVANCE ── */}
                {isSalaryAdvance && (
                    <>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                            <Text type="secondary">Nhân sự ứng lương: </Text>
                            <strong>{currentEmployee?.fullName ?? '—'}</strong>
                        </div>
                        <Form.Item name="amount" label="Số tiền ứng (VND)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Nhập số tiền ứng lương" />
                        </Form.Item>
                        <Form.Item name="bankAccount" label="Số tài khoản nhận">
                            <Input placeholder={currentEmployee?.bankAccount ?? 'STK nhận tiền'} />
                        </Form.Item>
                    </>
                )}

                {/* ── Ghi chú chung ── */}
                {selectedType && (
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={2} placeholder="Ghi chú thêm (tuỳ chọn)" />
                    </Form.Item>
                )}

                {/* ── Upload ảnh ── */}
                {needsImage && (
                    <Form.Item label="File đính kèm / Ảnh chứng minh">
                        <Upload
                            fileList={fileList}
                            beforeUpload={() => false}
                            onChange={({ fileList: fl }) => setFileList(fl)}
                            accept="image/*,.pdf"
                            maxCount={1}
                            listType="picture"
                        >
                            <Button icon={<UploadOutlined />}>Chọn file</Button>
                        </Upload>
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
}

// ── DetailModal ────────────────────────────────────────────────────────────────

function DetailModal({
    open, item, onClose, onRefresh,
}: {
    open: boolean;
    item: DisbursementDetail | null;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const { can } = useUser();
    const [actioning, setActioning] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelInput, setShowCancelInput] = useState(false);
    const [showExtendInput, setShowExtendInput] = useState(false);
    const [newReturnDate, setNewReturnDate] = useState<dayjs.Dayjs | null>(null);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        if (item?.imageUrl) {
            setFileList([{ uid: '-1', name: 'image', status: 'done', url: item.imageUrl }]);
        } else {
            setFileList([]);
        }
        setShowCancelInput(false);
        setShowExtendInput(false);
        setCancelReason('');
        setNewReturnDate(null);
    }, [item]);

    if (!item) return null;

    const action = async (type: string, extraPayload?: any) => {
        setActioning(type);
        try {
            if (type === 'approve-accountant') {
                await api.post(`/disbursements/${item.id}/approve-accountant`);
                message.success('Kế toán đã duyệt bước 1');
            } else if (type === 'approve-chief') {
                await api.post(`/disbursements/${item.id}/approve-chief`);
                message.success('Kế toán trưởng đã duyệt bước 2');
            } else if (type === 'disburse') {
                await api.post(`/disbursements/${item.id}/disburse`);
                message.success('Đã đánh dấu Đã Chi');
            } else if (type === 'cancel') {
                await api.post(`/disbursements/${item.id}/cancel`, { cancelReason });
                message.success('Đã huỷ uỷ nhiệm chi');
                setShowCancelInput(false);
            } else if (type === 'extend-return-date') {
                await api.post(`/disbursements/${item.id}/extend-return-date`, {
                    returnDateExtended: newReturnDate!.toISOString(),
                });
                message.success('Đã dời hạn hoàn trả');
                setShowExtendInput(false);
            } else if (type === 'toggle-alert') {
                const { data } = await api.post(`/disbursements/${item.id}/toggle-alert`);
                message.success(data.message);
            }
            onRefresh();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setActioning(null); }
    };

    const handleUploadImage = async () => {
        const newFile = fileList.find(f => f.originFileObj);
        if (!newFile?.originFileObj) return;
        setUploadingImage(true);
        try {
            const fd = new FormData();
            fd.append('file', newFile.originFileObj as File);
            await api.patch(`/disbursements/${item.id}/image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('Đã cập nhật ảnh đính kèm');
            onRefresh();
        } catch { message.error('Upload ảnh thất bại'); }
        finally { setUploadingImage(false); }
    };

    const { status, type } = item;
    const isPending = status === 'PENDING';
    const isAccountantApproved = status === 'ACCOUNTANT_APPROVED';
    const isApproved = status === 'APPROVED';
    const isClosed = status === 'DISBURSED' || status === 'CANCELLED';
    const isCommitment = type === 'COMMITMENT_DEPOSIT';
    const needsImage = ['CUSTOMER_SUPPORT', 'DEPOSIT_REFUND', 'COMMITMENT_DEPOSIT'].includes(type);
    const effectiveReturnDate = item.returnDateExtended ?? item.returnDate;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <Space>
                    <FileTextOutlined style={{ color: '#E8890C' }} />
                    <span>Chi tiết UNC — <strong>{item.code}</strong></span>
                    <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status] ?? status}</Tag>
                    <Tag color={TYPE_COLOR[type]}>{TYPE_LABEL[type] ?? type}</Tag>
                </Space>
            }
            footer={null}
            width={700}
            destroyOnClose
        >
            {/* ── Thông tin chính ── */}
            <Descriptions column={2} size="small" bordered style={{ marginTop: 12 }}>
                <Descriptions.Item label="Số tiền" span={2}>
                    <strong style={{ fontSize: 16, color: '#dc2626' }}>{fmt(item.amount)}</strong>
                </Descriptions.Item>

                {item.transaction && (
                    <>
                        <Descriptions.Item label="Mã Giao Dịch">{item.transaction.transactionCode}</Descriptions.Item>
                        <Descriptions.Item label="Tình trạng thu">
                            <Tag color={item.transaction.collectionStatus === 'COLLECTED' ? 'success' : 'warning'}>
                                {item.transaction.collectionStatus === 'COLLECTED' ? 'Đã thu' :
                                    item.transaction.collectionStatus === 'PARTIAL' ? 'Thu một phần' : 'Chưa thu'}
                            </Tag>
                        </Descriptions.Item>
                        {item.transaction.customer?.fullName && (
                            <Descriptions.Item label="Khách hàng">{item.transaction.customer.fullName}</Descriptions.Item>
                        )}
                        {type === 'DEPOSIT_REFUND' && item.transaction.project?.depositDate && (
                            <Descriptions.Item label="Ngày đặt cọc">{fmtDate(item.transaction.project.depositDate)}</Descriptions.Item>
                        )}
                    </>
                )}

                {item.expenseDate && (
                    <Descriptions.Item label="Ngày chi">{fmtDate(item.expenseDate)}</Descriptions.Item>
                )}
                {item.reason && (
                    <Descriptions.Item label="Lý do" span={2}>{item.reason}</Descriptions.Item>
                )}
                {item.bankAccount && (
                    <Descriptions.Item label="Số TK">{item.bankAccount}</Descriptions.Item>
                )}
                {item.bankName && (
                    <Descriptions.Item label="Ngân hàng">{item.bankName}</Descriptions.Item>
                )}
                {item.accountHolder && (
                    <Descriptions.Item label="Chủ TK" span={2}>{item.accountHolder}</Descriptions.Item>
                )}

                {/* Cọc Cam Kết info */}
                {isCommitment && (
                    <>
                        <Descriptions.Item label="Ngày hoàn trả">
                            <Space>
                                <span style={{ color: item.returnDateExtended ? '#6b7280' : undefined, textDecoration: item.returnDateExtended ? 'line-through' : undefined }}>
                                    {fmtDate(item.returnDate)}
                                </span>
                                {item.returnDateExtended && (
                                    <Tag color="volcano">Dời → {fmtDate(item.returnDateExtended)}</Tag>
                                )}
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Cảnh báo">
                            <Tag color={item.returnDateAlertDisabled ? 'default' : 'warning'}>
                                {item.returnDateAlertDisabled ? 'Đã tắt' : 'Đang bật'}
                            </Tag>
                        </Descriptions.Item>
                        {item.houseNumber && <Descriptions.Item label="Số nhà">{item.houseNumber}</Descriptions.Item>}
                        {item.province && <Descriptions.Item label="Tỉnh/TP">{item.province}</Descriptions.Item>}
                        {item.ward && <Descriptions.Item label="Phường/Xã">{item.ward}</Descriptions.Item>}
                        {item.roomCode && <Descriptions.Item label="Mã phòng">{item.roomCode}</Descriptions.Item>}
                        {item.commitmentContent && (
                            <Descriptions.Item label="Nội dung cam kết" span={2}>{item.commitmentContent}</Descriptions.Item>
                        )}
                    </>
                )}

                {/* Ứng Lương info */}
                {item.employee && (
                    <Descriptions.Item label="Nhân sự" span={2}>
                        {item.employee.user?.fullName} ({item.employee.employeeCode})
                        {item.employee.bankAccount && ` — TK: ${item.employee.bankAccount}`}
                    </Descriptions.Item>
                )}

                {item.note && (
                    <Descriptions.Item label="Ghi chú" span={2}>{item.note}</Descriptions.Item>
                )}
                {item.cancelReason && (
                    <Descriptions.Item label="Lý do huỷ" span={2}>
                        <Text type="danger">{item.cancelReason}</Text>
                    </Descriptions.Item>
                )}
            </Descriptions>

            {/* ── Lịch sử duyệt ── */}
            <Divider plain style={{ fontSize: 13, color: '#6b7280' }}>Lịch sử duyệt</Divider>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                <div style={{ color: '#6b7280' }}>
                    <span>Tạo bởi: </span><strong>{item.createdBy?.fullName ?? '—'}</strong>
                    <span style={{ marginLeft: 8 }}>{fmtDateTime(item.createdAt)}</span>
                </div>
                {item.accountantApprovedBy && (
                    <div style={{ color: '#3b82f6' }}>
                        <CheckOutlined /> KT duyệt bước 1: <strong>{item.accountantApprovedBy.fullName}</strong>
                        <span style={{ marginLeft: 8 }}>{fmtDateTime(item.accountantApprovedAt)}</span>
                    </div>
                )}
                {item.chiefApprovedBy && (
                    <div style={{ color: '#10b981' }}>
                        <CheckOutlined /> KT trưởng duyệt: <strong>{item.chiefApprovedBy.fullName}</strong>
                        <span style={{ marginLeft: 8 }}>{fmtDateTime(item.chiefApprovedAt)}</span>
                    </div>
                )}
                {item.disbursedBy && (
                    <div style={{ color: '#8b5cf6' }}>
                        <DollarOutlined /> Đã chi bởi: <strong>{item.disbursedBy.fullName}</strong>
                        <span style={{ marginLeft: 8 }}>{fmtDateTime(item.disbursedAt)}</span>
                    </div>
                )}
                {item.cancelledBy && (
                    <div style={{ color: '#ef4444' }}>
                        <CloseOutlined /> Huỷ bởi: <strong>{item.cancelledBy.fullName}</strong>
                        <span style={{ marginLeft: 8 }}>{fmtDateTime(item.cancelledAt)}</span>
                    </div>
                )}
            </div>

            {/* ── Ảnh đính kèm ── */}
            {needsImage && (
                <>
                    <Divider plain style={{ fontSize: 13, color: '#6b7280' }}>File đính kèm</Divider>
                    {item.imageUrl && (
                        <div style={{ marginBottom: 8 }}>
                            <a href={item.imageUrl} target="_blank" rel="noreferrer">
                                <img src={item.imageUrl} alt="attachment" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, border: '1px solid #e5e7eb' }} />
                            </a>
                        </div>
                    )}
                    {!isClosed && (
                        <Space>
                            <Upload
                                fileList={fileList.filter(f => f.originFileObj)}
                                beforeUpload={() => false}
                                onChange={({ fileList: fl }) => setFileList(fl)}
                                accept="image/*,.pdf"
                                maxCount={1}
                                showUploadList={false}
                            >
                                <Button icon={<UploadOutlined />} size="small">Chọn ảnh mới</Button>
                            </Upload>
                            {fileList.some(f => f.originFileObj) && (
                                <Button type="primary" size="small" loading={uploadingImage} onClick={handleUploadImage}>
                                    Lưu ảnh
                                </Button>
                            )}
                        </Space>
                    )}
                </>
            )}

            {/* ── Actions ── */}
            {!isClosed && (
                <>
                    <Divider plain style={{ fontSize: 13, color: '#6b7280' }}>Thao tác</Divider>
                    <Space wrap>
                        {can('DISBURSEMENT_APPROVE') && isPending && (
                            <Popconfirm title="Xác nhận duyệt bước 1 (Kế toán)?" onConfirm={() => action('approve-accountant')}>
                                <Button type="primary" icon={<CheckOutlined />} loading={actioning === 'approve-accountant'}>
                                    KT Duyệt bước 1
                                </Button>
                            </Popconfirm>
                        )}
                        {can('DISBURSEMENT_APPROVE') && isAccountantApproved && (
                            <Popconfirm title="Xác nhận duyệt bước 2 (Kế toán trưởng)?" onConfirm={() => action('approve-chief')}>
                                <Button type="primary" icon={<CheckOutlined />} loading={actioning === 'approve-chief'}>
                                    KT Trưởng Duyệt bước 2
                                </Button>
                            </Popconfirm>
                        )}
                        {can('DISBURSEMENT_APPROVE') && isApproved && (
                            <Popconfirm title="Xác nhận đã thực hiện chi?" onConfirm={() => action('disburse')}>
                                <Button type="primary" icon={<DollarOutlined />} style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }} loading={actioning === 'disburse'}>
                                    Đánh dấu Đã Chi
                                </Button>
                            </Popconfirm>
                        )}
                        {isCommitment && (
                            <>
                                <Button
                                    icon={<CalendarOutlined />}
                                    onClick={() => setShowExtendInput(!showExtendInput)}
                                >
                                    Dời hạn hoàn trả
                                </Button>
                                <Button
                                    icon={<WarningOutlined />}
                                    onClick={() => action('toggle-alert')}
                                    loading={actioning === 'toggle-alert'}
                                >
                                    {item.returnDateAlertDisabled ? 'Bật cảnh báo' : 'Tắt cảnh báo'}
                                </Button>
                            </>
                        )}
                        {can('DISBURSEMENT_CANCEL') && (
                            <Button danger icon={<CloseOutlined />} onClick={() => setShowCancelInput(!showCancelInput)}>
                                Huỷ UNC
                            </Button>
                        )}
                    </Space>

                    {showExtendInput && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <DatePicker
                                placeholder="Ngày hoàn trả mới"
                                format="DD/MM/YYYY"
                                value={newReturnDate}
                                onChange={setNewReturnDate}
                                disabledDate={d => !!item.returnDate && d.isBefore(dayjs(item.returnDate))}
                                style={{ width: 180 }}
                            />
                            <Button type="primary" size="small"
                                disabled={!newReturnDate}
                                loading={actioning === 'extend-return-date'}
                                onClick={() => action('extend-return-date')}>
                                Xác nhận dời
                            </Button>
                            <Button size="small" onClick={() => setShowExtendInput(false)}>Huỷ</Button>
                        </div>
                    )}

                    {showCancelInput && (
                        <div style={{ marginTop: 12 }}>
                            <Input.TextArea
                                rows={2}
                                placeholder="Nhập lý do huỷ..."
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                style={{ marginBottom: 8 }}
                            />
                            <Space>
                                <Button danger size="small"
                                    disabled={!cancelReason.trim()}
                                    loading={actioning === 'cancel'}
                                    onClick={() => action('cancel')}>
                                    Xác nhận huỷ
                                </Button>
                                <Button size="small" onClick={() => setShowCancelInput(false)}>Bỏ qua</Button>
                            </Space>
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UyNhiemChiPage() {
    const { can } = useUser();
    const [rows, setRows] = useState<DisbursementRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

    // Modals
    const [formOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DisbursementDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailItem, setDetailItem] = useState<DisbursementDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Commitment alerts
    const [alertCount, setAlertCount] = useState(0);
    const [alertItems, setAlertItems] = useState<any[]>([]);
    const [showAlerts, setShowAlerts] = useState(false);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/disbursements', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: search || undefined,
                    type: typeFilter || undefined,
                    status: statusFilter || undefined,
                    fromDate: dateRange?.[0] ? dateRange[0].startOf('day').toISOString() : undefined,
                    toDate: dateRange?.[1] ? dateRange[1].endOf('day').toISOString() : undefined,
                },
            });
            setRows(data.data ?? []);
            setPagination(p => ({ ...p, total: data.meta?.total ?? 0 }));
        } catch { message.error('Không thể tải danh sách uỷ nhiệm chi'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, typeFilter, statusFilter, dateRange]);

    const fetchAlerts = useCallback(async () => {
        try {
            const { data } = await api.get('/disbursements/commitment-alerts');
            setAlertItems(data ?? []);
            setAlertCount((data ?? []).length);
        } catch {}
    }, []);

    useEffect(() => { fetchRows(); }, [fetchRows]);
    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    const openDetail = async (id: string) => {
        setDetailLoading(true);
        setDetailOpen(true);
        try {
            const { data } = await api.get(`/disbursements/${id}`);
            setDetailItem(data);
        } catch { message.error('Không thể tải chi tiết'); setDetailOpen(false); }
        finally { setDetailLoading(false); }
    };

    const openEdit = async (id: string) => {
        try {
            const { data } = await api.get(`/disbursements/${id}`);
            setEditingItem(data);
            setFormOpen(true);
        } catch { message.error('Không thể tải chi tiết'); }
    };

    const handleRefreshDetail = async () => {
        if (!detailItem) return;
        try {
            const { data } = await api.get(`/disbursements/${detailItem.id}`);
            setDetailItem(data);
            fetchRows();
            fetchAlerts();
        } catch {}
    };

    const resetPage = () => setPagination(p => ({ ...p, page: 1 }));

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/disbursements/${id}`);
            message.success('Đã xoá uỷ nhiệm chi');
            fetchRows();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Xoá thất bại');
        }
    };

    const columns: ColumnsType<DisbursementRow> = [
        {
            title: 'STT', key: 'stt', width: 55, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            title: 'Mã UNC', key: 'code', width: 160,
            render: (_, r) => <Tag style={{ fontFamily: 'monospace' }}>{r.code}</Tag>,
        },
        {
            title: 'Loại chi', key: 'type', width: 170,
            render: (_, r) => <Tag color={TYPE_COLOR[r.type]}>{TYPE_LABEL[r.type] ?? r.type}</Tag>,
        },
        {
            title: 'Số tiền', key: 'amount', width: 140, align: 'right',
            render: (_, r) => <strong style={{ color: '#dc2626' }}>{fmt(r.amount)}</strong>,
        },
        {
            title: 'Trạng thái', key: 'status', width: 130, align: 'center',
            render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Tag>,
        },
        {
            title: 'Giao dịch / Nhân sự', key: 'ref', width: 160,
            render: (_, r) => {
                if (r.transaction?.transactionCode)
                    return <Text type="secondary" style={{ fontSize: 12 }}>{r.transaction.transactionCode}</Text>;
                if (r.employee)
                    return <Text type="secondary" style={{ fontSize: 12 }}>{r.employee.user?.fullName ?? r.employee.employeeCode}</Text>;
                return <span style={{ color: '#d1d5db' }}>—</span>;
            },
        },
        {
            title: 'Người tạo', key: 'createdBy', width: 130,
            render: (_, r) => r.createdBy?.fullName ?? '—',
        },
        {
            title: 'Ngày tạo', key: 'createdAt', width: 110,
            render: (_, r) => fmtDate(r.createdAt),
        },
        {
            title: 'Hoàn trả', key: 'returnDate', width: 110,
            render: (_, r) => {
                if (r.type !== 'COMMITMENT_DEPOSIT') return <span style={{ color: '#d1d5db' }}>—</span>;
                const d = r.returnDateExtended ?? r.returnDate;
                if (!d) return '—';
                const daysLeft = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
                return (
                    <Tooltip title={r.returnDateExtended ? `Dời từ ${fmtDate(r.returnDate)}` : undefined}>
                        <span style={{ color: daysLeft <= 7 && !r.returnDateAlertDisabled ? '#dc2626' : undefined, fontWeight: daysLeft <= 7 ? 600 : undefined }}>
                            {fmtDate(d)}
                            {daysLeft <= 7 && !r.returnDateAlertDisabled && <WarningOutlined style={{ marginLeft: 4, color: '#dc2626' }} />}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Thao tác', key: 'actions', width: 110, align: 'center', fixed: 'right',
            render: (_, r) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)} />
                    </Tooltip>
                    {can('DISBURSEMENT_EDIT') && r.status === 'PENDING' && (
                        <Tooltip title="Chỉnh sửa">
                            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
                        </Tooltip>
                    )}
                    {can('DISBURSEMENT_DELETE') && (
                        <Popconfirm
                            title="Xoá uỷ nhiệm chi này?"
                            onConfirm={() => handleDelete(r.id)}
                            okText="Xoá"
                            cancelText="Huỷ"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Xoá">
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            {/* Title */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Uỷ Nhiệm Chi</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Quản lý các phiếu uỷ nhiệm chi của công ty</p>
                </div>
                <Space>
                    {alertCount > 0 && (
                        <Badge count={alertCount}>
                            <Button
                                icon={<WarningOutlined />}
                                danger
                                onClick={() => setShowAlerts(!showAlerts)}
                            >
                                Cọc Cam Kết sắp đến hạn
                            </Button>
                        </Badge>
                    )}
                    {can('DISBURSEMENT_CREATE') && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setFormOpen(true); }}>
                            Tạo UNC
                        </Button>
                    )}
                </Space>
            </div>

            {/* Commitment alerts banner */}
            {showAlerts && alertItems.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`${alertItems.length} Cọc Cam Kết sắp tới hạn hoàn trả (trong 7 ngày)`}
                    description={
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {alertItems.map(a => {
                                const d = a.returnDateExtended ?? a.returnDate;
                                return (
                                    <div key={a.id} style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Tag style={{ fontFamily: 'monospace' }}>{a.code}</Tag>
                                        <span>{a.employee?.user?.fullName ?? a.createdBy?.fullName ?? '—'}</span>
                                        <span style={{ color: '#6b7280' }}>
                                            {a.houseNumber && `${a.houseNumber}, `}{a.ward && `${a.ward}, `}{a.province}
                                        </span>
                                        <Tag color={a.daysLeft != null && a.daysLeft < 0 ? 'error' : 'warning'}>
                                            {a.daysLeft != null ? (a.daysLeft < 0 ? `Quá hạn ${Math.abs(a.daysLeft)} ngày` : `Còn ${a.daysLeft} ngày`) : fmtDate(d)}
                                        </Tag>
                                        <Button size="small" type="link" style={{ padding: 0 }} onClick={() => openDetail(a.id)}>
                                            Xem
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    }
                />
            )}

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm mã UNC..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); resetPage(); }}
                        allowClear
                        onClear={() => { setSearchInput(''); setSearch(''); resetPage(); }}
                        style={{ width: 200 }}
                    />
                    <Select
                        value={typeFilter || undefined}
                        onChange={v => { setTypeFilter(v ?? ''); resetPage(); }}
                        placeholder="Tất cả loại chi"
                        style={{ width: 200 }}
                        allowClear
                        options={DISBURSEMENT_TYPES}
                    />
                    <Select
                        value={statusFilter || undefined}
                        onChange={v => { setStatusFilter(v ?? ''); resetPage(); }}
                        placeholder="Tất cả trạng thái"
                        style={{ width: 170 }}
                        allowClear
                        options={Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
                    />
                    <RangePicker
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                        value={dateRange}
                        onChange={v => { setDateRange(v as any); resetPage(); }}
                        style={{ width: 240 }}
                    />
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={rows}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                        pageSize: pagination.limit,
                        total: pagination.total,
                        current: pagination.page,
                        showTotal: (t) => `Tổng ${t} bản ghi`,
                        onChange: (page) => setPagination(p => ({ ...p, page })),
                    }}
                />
            </Card>

            {/* Form Modal */}
            <FormModal
                open={formOpen}
                editingItem={editingItem}
                onClose={() => setFormOpen(false)}
                onSuccess={() => { fetchRows(); fetchAlerts(); }}
            />

            {/* Detail Modal */}
            <Modal
                open={detailOpen && detailLoading}
                footer={null}
                closable={false}
                centered
                width={300}
            >
                <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: '#6b7280' }}>Đang tải chi tiết...</div>
                </div>
            </Modal>
            {!detailLoading && (
                <DetailModal
                    open={detailOpen}
                    item={detailItem}
                    onClose={() => setDetailOpen(false)}
                    onRefresh={handleRefreshDetail}
                />
            )}
        </>
    );
}
