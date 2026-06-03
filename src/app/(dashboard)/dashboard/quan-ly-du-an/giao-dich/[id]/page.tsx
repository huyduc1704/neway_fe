'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Upload, ExternalLink, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';

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
        rentalPrice: number | null;
        customerSupport: number | null;
        estimatedRevenue: number | null;
    } | null;
    room: { id: string; roomCode: string; rentalPrice: number | null } | null;
    customer: { id: string; fullName: string; phone: string } | null;
    branch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    commissions: Array<{ role: { name: string }; amount: number }>;
}

/* ─── Constants ──────────────────────────────────────────── */
const STATUS_OPTIONS = [
    { value: 'SUCCESS',   label: 'Thành công' },
    { value: 'CANCELLED', label: 'Huỷ cọc - Hoàn cọc' },
    { value: 'FAILED',    label: 'Thất bại' },
];

const fmtCurrency = (v: number | null | undefined) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';
const fmtDate = (v: string | null | undefined) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—';

/* ─── Info row ───────────────────────────────────────────── */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex">
            <span className="w-52 shrink-0 text-sm font-medium text-[#E8890C] bg-orange-50 px-4 py-2.5">{label}</span>
            <span className="px-4 py-2.5 text-sm flex-1">{children}</span>
        </div>
    );
}

/* ─── Main component ─────────────────────────────────────── */
export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [tx, setTx]           = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);

    /* form state */
    const [status,                   setStatus]                   = useState('');
    const [hasFullDeposit,           setHasFullDeposit]           = useState(false);
    const [addDeposit2,              setAddDeposit2]              = useState(false);
    const [supplementDeposit2,       setSupplementDeposit2]       = useState('');
    const [transactedAt,             setTransactedAt]             = useState('');
    const [actualCommissionPercent,  setActualCommissionPercent]  = useState('');
    const [manualActualRevenue,      setManualActualRevenue]      = useState('');
    const [collectionStatus,         setCollectionStatus]         = useState('NOT_COLLECTED');
    const [note,                     setNote]                     = useState('');

    /* ── Fetch ── */
    const fetchTx = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/transactions/${id}`);
            setTx(data);
            setStatus(data.status ?? '');
            setHasFullDeposit(data.hasFullDeposit ?? false);
            setAddDeposit2(!!data.supplementDeposit2);
            setSupplementDeposit2(data.supplementDeposit2 ? String(data.supplementDeposit2) : '');
            setTransactedAt(data.transactedAt ? dayjs(data.transactedAt).format('YYYY-MM-DDTHH:mm') : '');
            setActualCommissionPercent(data.actualCommissionPercent != null ? String(data.actualCommissionPercent) : '');
            setManualActualRevenue(data.actualRevenue != null ? String(data.actualRevenue) : '');
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
    const rentalPrice = tx?.room?.rentalPrice ?? tx?.project?.rentalPrice ?? 0;
    const deposit1    = tx?.project?.deposit1 ?? 0;
    const deposit2    = tx?.project?.deposit2 ?? 0;
    const customerSupport = tx?.project?.customerSupport ?? 0;

    // tổng tiền cọc
    const totalDeposit = (() => {
        if (hasFullDeposit) return deposit1 + deposit2;
        if (addDeposit2 && supplementDeposit2) return deposit1 + Number(supplementDeposit2);
        return deposit1;
    })();

    // doanh thu thực tế (auto-calc khi SUCCESS)
    const autoActualRevenue = (() => {
        if (status !== 'SUCCESS') return null;
        const pct = parseFloat(actualCommissionPercent) || 0;
        if (!pct || !rentalPrice) return null;
        return rentalPrice * (pct / 100) - customerSupport;
    })();
    const displayActualRevenue = status === 'CANCELLED'
        ? (manualActualRevenue ? Number(manualActualRevenue) : null)
        : autoActualRevenue;

    // chênh lệch
    const revenueDiff = displayActualRevenue != null && tx?.project?.estimatedRevenue != null
        ? displayActualRevenue - tx.project.estimatedRevenue
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
                supplementDeposit2: addDeposit2 && supplementDeposit2 ? Number(supplementDeposit2) : undefined,
                transactedAt: transactedAt ? new Date(transactedAt).toISOString() : undefined,
                actualCommissionPercent: actualCommissionPercent ? Number(actualCommissionPercent) : undefined,
                actualRevenue: status === 'CANCELLED' && manualActualRevenue ? Number(manualActualRevenue) : undefined,
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
    const handleConfirm = async () => {
        if (!window.confirm('Xác nhận giao dịch này với tư cách kế toán?')) return;
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
            <div className="h-6 w-6 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" />
        </div>
    );
    if (!tx) return null;

    const isLocked = tx.accountantConfirmed || tx.status === 'SUCCESS';

    return (
        <div className="space-y-4 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" /> Quay lại
                    </button>
                    <span className="text-lg font-semibold text-[#1A2B5A]">
                        Giao dịch — <Badge variant="warning">{tx.transactionCode}</Badge>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {!tx.accountantConfirmed && (
                        <Button
                            variant="outline"
                            className="border-green-500 text-green-700 hover:bg-green-50"
                            onClick={handleConfirm}
                            disabled={confirming}
                        >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {confirming ? 'Đang xác nhận...' : 'Kế toán xác nhận'}
                        </Button>
                    )}
                    {tx.accountantConfirmed && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
                            <CheckCircle className="h-4 w-4" />
                            KT đã xác nhận — {fmtDate(tx.accountantConfirmedAt)}
                            {tx.accountantConfirmedBy && ` (${tx.accountantConfirmedBy.fullName})`}
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="bg-[#E8890C] hover:bg-[#C8720A]">
                        {saving && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* ── Cột trái: Thông tin giao dịch ── */}
                <div className="space-y-4">

                    {/* Thông tin cơ bản */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                            <h3 className="text-sm font-semibold text-[#E8890C]">Thông tin cơ bản</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            <InfoRow label="Mã giao dịch">{tx.transactionCode}</InfoRow>
                            <InfoRow label="Dự án">{tx.project?.code || '—'}</InfoRow>
                            <InfoRow label="Phòng">{tx.room?.roomCode || '—'}</InfoRow>
                            <InfoRow label="Khách hàng">
                                <div>
                                    <div>{tx.customer?.fullName || '—'}</div>
                                    {tx.customer?.phone && <div className="text-xs text-gray-400">{tx.customer.phone}</div>}
                                </div>
                            </InfoRow>
                            <InfoRow label="Chi nhánh">{tx.branch?.name || '—'}</InfoRow>
                            <InfoRow label="Khu vực">{tx.team?.name || '—'}</InfoRow>
                        </div>
                    </div>

                    {/* Tiền cọc */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-[#E8890C]">Tiền cọc</h3>

                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-600 w-36">Tiền cọc lần 1</span>
                            <span className="font-medium">{fmtCurrency(deposit1 || null)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#E8890C]"
                                    checked={hasFullDeposit}
                                    onChange={e => { setHasFullDeposit(e.target.checked); if (e.target.checked) setAddDeposit2(false); }}
                                />
                                <span>Đã bổ sung cọc đủ</span>
                            </label>
                            {hasFullDeposit && deposit2 > 0 && (
                                <span className="text-xs text-gray-500">
                                    (+ {fmtCurrency(deposit2 || null)} bổ sung)
                                </span>
                            )}
                        </div>

                        {!hasFullDeposit && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-[#E8890C]"
                                        checked={addDeposit2}
                                        onChange={e => { setAddDeposit2(e.target.checked); if (!e.target.checked) setSupplementDeposit2(''); }}
                                    />
                                    <span>Bổ sung cọc lần 2</span>
                                </label>
                                {addDeposit2 && (
                                    <div>
                                        <Label className="text-xs">Số tiền bổ sung (VNĐ)</Label>
                                        <Input
                                            type="number" className="mt-1 h-8" min={0}
                                            placeholder="Nhập số tiền"
                                            value={supplementDeposit2}
                                            onChange={e => setSupplementDeposit2(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-1 border-t border-gray-100 text-sm font-semibold">
                            <span className="text-gray-600 w-36">Tổng tiền cọc</span>
                            <span className="text-[#E8890C]">{fmtCurrency(totalDeposit || null)}</span>
                        </div>
                    </div>

                    {/* Ảnh giao dịch */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-[#E8890C] mb-3">Ảnh giao dịch</h3>
                        <div className="flex items-center gap-3">
                            {tx.transactionImageUrl ? (
                                <a href={tx.transactionImageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                    <ExternalLink className="h-4 w-4" /> Xem ảnh
                                </a>
                            ) : (
                                <span className="text-sm text-gray-400">Chưa có ảnh</span>
                            )}
                            <label className={`flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${uploadingImg ? 'opacity-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <Upload className="h-3.5 w-3.5" />
                                {uploadingImg ? 'Đang upload...' : (tx.transactionImageUrl ? 'Thay ảnh' : 'Upload ảnh')}
                                <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
                                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* ── Cột phải: Nghiệp vụ ── */}
                <div className="space-y-4">

                    {/* Tình trạng & Ngày GD */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-[#E8890C]">Tình trạng giao dịch</h3>

                        <div>
                            <Label className="text-sm">Tình trạng</Label>
                            <Select value={status} onValueChange={setStatus} disabled={isLocked}>
                                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-sm">Ngày GDTC / GDHC</Label>
                            <input
                                type="datetime-local"
                                className="mt-1 h-9 w-full px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none disabled:bg-gray-50"
                                value={transactedAt}
                                onChange={e => setTransactedAt(e.target.value)}
                                disabled={isLocked}
                            />
                        </div>

                        {/* Khớp lệnh */}
                        <div className="flex items-center gap-3 p-3 rounded-md border border-gray-200 bg-gray-50">
                            <span className="text-sm text-gray-600 w-24 shrink-0">Khớp lệnh</span>
                            {!transactedAt || !tx.project?.checkInDate ? (
                                <span className="text-xs text-gray-400">— (chưa đủ dữ liệu)</span>
                            ) : isMatched ? (
                                <Badge variant="success">Khớp</Badge>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Badge variant="destructive">Không khớp</Badge>
                                    <span className="text-xs text-gray-400">
                                        Ngày nhận phòng: {dayjs(tx.project.checkInDate).format('DD/MM/YYYY')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-sm">Trạng thái thu</Label>
                            <Select value={collectionStatus} onValueChange={setCollectionStatus}>
                                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NOT_COLLECTED">Chưa thu</SelectItem>
                                    <SelectItem value="COLLECTED">Đã thu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Doanh thu */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-[#E8890C]">Doanh thu</h3>

                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-600 w-44 shrink-0">Doanh thu ước tính</span>
                            <span className="font-medium">{fmtCurrency(tx.project?.estimatedRevenue ?? null)}</span>
                        </div>

                        {status === 'SUCCESS' && (
                            <div>
                                <Label className="text-sm">Hoa hồng thực tế (%)</Label>
                                <Input
                                    type="number" className="mt-1 h-9" min={0} max={100} step={0.01}
                                    placeholder="VD: 5"
                                    value={actualCommissionPercent}
                                    onChange={e => setActualCommissionPercent(e.target.value)}
                                    disabled={isLocked}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Doanh thu TT = Giá phòng × Hoa hồng% − Hỗ trợ khách
                                </p>
                            </div>
                        )}

                        {status === 'CANCELLED' && (
                            <div>
                                <Label className="text-sm">Doanh thu thực tế (VNĐ)</Label>
                                <Input
                                    type="number" className="mt-1 h-9" min={0}
                                    placeholder="Nhập doanh thu thực tế"
                                    value={manualActualRevenue}
                                    onChange={e => setManualActualRevenue(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-600 w-44 shrink-0">Doanh thu thực tế</span>
                                <span className={`font-semibold ${displayActualRevenue != null ? 'text-[#E8890C]' : 'text-gray-400'}`}>
                                    {fmtCurrency(displayActualRevenue ?? null)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-600 w-44 shrink-0">Chênh lệch</span>
                                {revenueDiff != null ? (
                                    <span className={`font-semibold ${revenueDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {revenueDiff >= 0 ? '+' : ''}{fmtCurrency(revenueDiff)}
                                        {revenueDiff < 0 && (
                                            <AlertTriangle className="inline h-4 w-4 ml-1 text-red-400" />
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hoa hồng theo vai trò */}
                    {tx.commissions?.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-[#E8890C] mb-3">Hoa hồng theo vai trò</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600">
                                        <th className="text-left px-3 py-2">Vai trò</th>
                                        <th className="text-right px-3 py-2">Số tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tx.commissions.map((c, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2">{c.role.name}</td>
                                            <td className="px-3 py-2 text-right font-medium text-[#1A2B5A]">{fmtCurrency(c.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Ghi chú */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <Label className="text-sm font-semibold text-[#E8890C]">Ghi chú</Label>
                        <textarea
                            className="mt-2 w-full h-20 px-3 py-2 rounded-md border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            placeholder="Ghi chú thêm..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
