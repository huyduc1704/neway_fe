'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import dayjs from 'dayjs';

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
const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'success' | 'warning' | 'destructive' }> = {
    DRAFT:     { label: 'Nháp',           variant: 'secondary' },
    ACTIVE:    { label: 'Đang hoạt động', variant: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       variant: 'warning' },
    CLOSED:    { label: 'Đã đóng',        variant: 'destructive' },
    CANCELLED: { label: 'Đã huỷ',        variant: 'secondary' },
};

const LEAD_SOURCE_MAP: Record<string, string> = {
    FACEBOOK: 'Facebook', TIKTOK: 'TikTok', THREADS: 'Threads',
    CHO_TOT: 'Chợ Tốt', BDS: 'BĐS', WALK_IN: 'Vãng Lai',
    REFERRAL: 'Giới Thiệu', ZALO: 'Zalo', OTHER: 'Khác',
};

const fmtCurrency = (v: number | null) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';
const fmtDate    = (v: string | null)  => v ? dayjs(v).format('DD/MM/YYYY') : '—';
const fmtPct     = (v: number | null)  => v != null ? `${v}%` : '—';

/* ─── Info row component ─────────────────────────────────── */
function InfoRow({ items }: { items: [string, React.ReactNode][] }) {
    return (
        <tr className="border-b border-gray-100">
            {items.map(([label, value], i) => (
                <>
                    <td key={`l${i}`} className="bg-orange-50 text-[#E8890C] font-medium px-4 py-2.5 text-sm whitespace-nowrap w-44">{label}</td>
                    <td key={`v${i}`} className="px-4 py-2.5 text-sm">{value ?? '—'}</td>
                </>
            ))}
        </tr>
    );
}

/* ─── Staff slot table ───────────────────────────────────── */
function StaffSlotTable({ slot }: { slot: StaffSlot }) {
    const rows = [
        { role: 'm nhỏ',  emp: slot.mEmployee?.fullName,  rate: slot.mRate,  leader: slot.mLeader?.fullName,  lRate: slot.mLeaderRate,  color: 'text-[#E8890C]' },
        { role: 'M lớn 1', emp: slot.m1Employee?.fullName, rate: slot.m1Rate, leader: slot.m1Leader?.fullName, lRate: slot.m1LeaderRate, color: 'text-[#1A2B5A]' },
        { role: 'M lớn 2', emp: slot.m2Employee?.fullName, rate: slot.m2Rate, leader: slot.m2Leader?.fullName, lRate: slot.m2LeaderRate, color: 'text-[#1A2B5A]' },
        { role: 'S1',       emp: slot.s1Employee?.fullName, rate: slot.s1Rate, leader: slot.s1Leader?.fullName, lRate: slot.s1LeaderRate, color: 'text-green-700' },
        { role: 'S2',       emp: slot.s2Employee?.fullName, rate: slot.s2Rate, leader: slot.s2Leader?.fullName, lRate: slot.s2LeaderRate, color: 'text-green-700' },
    ].filter(r => r.emp);

    if (!rows.length) return <p className="text-sm text-gray-400">Chưa có nhân sự</p>;

    return (
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="bg-gray-50 text-gray-600 font-medium">
                    <th className="text-left px-3 py-2">Vai trò</th>
                    <th className="text-left px-3 py-2">Nhân viên</th>
                    <th className="text-center px-3 py-2">Tỉ lệ</th>
                    <th className="text-left px-3 py-2">Leader</th>
                    <th className="text-center px-3 py-2">Tỉ lệ Leader</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {rows.map(r => (
                    <tr key={r.role}>
                        <td className={`px-3 py-2 font-semibold ${r.color}`}>{r.role}</td>
                        <td className="px-3 py-2">{r.emp || '—'}</td>
                        <td className="px-3 py-2 text-center font-medium">{r.rate != null ? `${(r.rate * 100).toFixed(0)}%` : '—'}</td>
                        <td className="px-3 py-2">{r.leader || '—'}</td>
                        <td className="px-3 py-2 text-center">{r.lRate != null ? `${(r.lRate * 100).toFixed(0)}%` : '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
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
            toast.error('Không thể tải thông tin dự án');
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
                toast.success('Cập nhật phòng thành công');
            } else {
                await api.post(`/projects/${id}/rooms`, payload);
                toast.success('Thêm phòng thành công');
            }
            setRoomModal({ open: false });
            fetchProject();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };
    const handleDeleteRoom = async (roomId: string) => {
        if (!window.confirm('Xoá phòng này?')) return;
        try {
            await api.delete(`/projects/${id}/rooms/${roomId}`);
            toast.success('Đã xoá phòng');
            fetchProject();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    /* ── Contract image upload ── */
    const handleContractImageUpload = async (file: File) => {
        setUploadingImg(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.patch(`/projects/${id}/contract-image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Upload ảnh hợp đồng thành công');
            fetchProject();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upload thất bại');
        } finally {
            setUploadingImg(false);
        }
    };

    const roomColumns: Column<Room>[] = [
        { key: 'roomCode', title: 'Mã phòng', width: 120, render: (_, r) => <Badge variant="secondary">{r.roomCode}</Badge> },
        { key: 'houseNumber', title: 'Số nhà', width: 100, render: (_, r) => r.houseNumber || '—' },
        { key: 'rentalPrice',  title: 'Giá thuê',   width: 150, render: (_, r) => fmtCurrency(r.rentalPrice) },
        { key: 'depositPrice', title: 'Giá đặt cọc', width: 150, render: (_, r) => fmtCurrency(r.depositPrice) },
        { key: 'rentalInfo',   title: 'Thông tin thêm', render: (_, r) => r.rentalInfo || '—' },
        {
            key: 'actions', title: 'Thao tác', width: 90, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C]" onClick={() => openEditRoom(r)}>
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500" onClick={() => handleDeleteRoom(r.id)}>
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" />
        </div>
    );

    if (!project) return null;

    const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, variant: 'secondary' as const };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" /> Quay lại
                </button>
                <span className="text-lg font-semibold text-[#1A2B5A]">Thông tin dự án — {project.code}</span>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>

            {/* ── Thông tin dự án ── */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                    <h3 className="text-sm font-semibold text-[#E8890C]">Thông tin dự án</h3>
                </div>
                <table className="w-full">
                    <tbody>
                        <InfoRow items={[
                            ['Ngày đặt cọc',   fmtDate(project.depositDate)],
                            ['Tên khách hàng', project.customerName || project.customer?.fullName || '—'],
                            ['SĐT khách',      project.customerPhone || project.customer?.phone || '—'],
                        ]} />
                        <InfoRow items={[
                            ['Nguồn khách',   project.leadSource ? (LEAD_SOURCE_MAP[project.leadSource] ?? project.leadSource) : '—'],
                            ['Chi nhánh',     project.managedBranch?.name || '—'],
                            ['Khu vực',       project.team?.name || '—'],
                        ]} />
                        <InfoRow items={[
                            ['Người tạo', project.createdBy?.fullName || '—'],
                        ]} />
                    </tbody>
                </table>
            </div>

            {/* ── Thông tin phòng ── */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                    <h3 className="text-sm font-semibold text-[#E8890C]">Thông tin phòng</h3>
                </div>
                <table className="w-full">
                    <tbody>
                        <InfoRow items={[
                            ['Tỉnh/Thành phố', project.province || '—'],
                            ['Phường/Xã',      project.ward],
                            ['Số nhà',         project.houseNumber || '—'],
                        ]} />
                        <InfoRow items={[
                            ['Giá thuê', fmtCurrency(null)],
                            ['Ngày bắt đầu HĐ', fmtDate(project.contractStartAt)],
                            ['Ngày kết thúc HĐ', fmtDate(project.contractEndAt)],
                        ]} />
                        <InfoRow items={[
                            ['Ngày nhận phòng', fmtDate(project.checkInDate)],
                        ]} />
                    </tbody>
                </table>

                {/* Contract image */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
                    <span className="text-sm font-medium text-[#E8890C] w-44 shrink-0">Ảnh hợp đồng</span>
                    {project.contractImageUrl ? (
                        <a href={project.contractImageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                            <ExternalLink className="h-4 w-4" /> Xem ảnh hợp đồng
                        </a>
                    ) : (
                        <span className="text-sm text-gray-400">Chưa có</span>
                    )}
                    <label className={`ml-2 flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${uploadingImg ? 'opacity-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingImg ? 'Đang upload...' : (project.contractImageUrl ? 'Thay ảnh' : 'Upload ảnh')}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
                            onChange={e => e.target.files?.[0] && handleContractImageUpload(e.target.files[0])} />
                    </label>
                </div>
            </div>

            {/* ── Ngày cọc ── */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                    <h3 className="text-sm font-semibold text-[#E8890C]">Thông tin cọc</h3>
                </div>
                <table className="w-full">
                    <tbody>
                        <InfoRow items={[
                            ['Tiền cọc lần 1',  fmtCurrency(project.deposit1)],
                            ['Tiền cọc bổ sung', fmtCurrency(project.deposit2)],
                            ['Ngày bổ sung cọc', fmtDate(project.deposit2Date)],
                        ]} />
                    </tbody>
                </table>
            </div>

            {/* ── Doanh thu ── */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                    <h3 className="text-sm font-semibold text-[#E8890C]">Doanh thu ước tính</h3>
                </div>
                <table className="w-full">
                    <tbody>
                        <InfoRow items={[
                            ['Hoa hồng ước tính', fmtPct(project.estimatedCommissionPercent)],
                            ['Hỗ trợ khách',      fmtCurrency(project.customerSupport)],
                            ['Doanh thu ước tính', <span className="font-semibold text-[#E8890C]">{fmtCurrency(project.estimatedRevenue)}</span>],
                        ]} />
                    </tbody>
                </table>
            </div>

            {/* ── Nhân sự ── */}
            {project.staffSlot && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                        <h3 className="text-sm font-semibold text-[#E8890C]">Cụm nhân sự</h3>
                    </div>
                    <div className="p-4">
                        <StaffSlotTable slot={project.staffSlot} />
                    </div>
                </div>
            )}

            {/* ── Danh sách phòng ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-[#1A2B5A]">Danh sách phòng ({project.rooms.length})</h3>
                    <Button size="sm" onClick={openAddRoom}>
                        <Plus className="h-4 w-4 mr-1" /> Thêm phòng
                    </Button>
                </div>
                <DataTable columns={roomColumns} data={project.rooms} rowKey="id" pageSize={50} />
            </div>

            {/* ── Room Dialog ── */}
            <Dialog open={roomModal.open} onOpenChange={open => setRoomModal({ open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{roomModal.room ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <Label>Mã phòng <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: P101" value={roomCode} onChange={e => setRoomCode(e.target.value)} disabled={!!roomModal.room} />
                            {roomErrors.roomCode && <p className="text-red-500 text-xs mt-1">{roomErrors.roomCode}</p>}
                        </div>
                        <div>
                            <Label>Số nhà</Label>
                            <Input className="mt-1" placeholder="VD: 12B" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
                        </div>
                        <div>
                            <Label>Giá thuê (VNĐ)</Label>
                            <Input type="number" className="mt-1" min={0} value={rentalPrice} onChange={e => setRentalPrice(e.target.value)} />
                        </div>
                        <div>
                            <Label>Giá đặt cọc (VNĐ)</Label>
                            <Input type="number" className="mt-1" min={0} value={depositPrice} onChange={e => setDepositPrice(e.target.value)} />
                        </div>
                        <div>
                            <Label>Thông tin thêm</Label>
                            <textarea className="mt-1 w-full h-16 px-3 py-2 rounded-md border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={rentalInfo} onChange={e => setRentalInfo(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoomModal({ open: false })}>Huỷ</Button>
                        <Button onClick={handleRoomSubmit} disabled={submitting}>
                            {submitting && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
