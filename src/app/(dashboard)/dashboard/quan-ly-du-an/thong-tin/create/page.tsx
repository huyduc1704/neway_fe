'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ─── Constants ─────────────────────────────────────────── */
const LEAD_SOURCES = [
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'TIKTOK',   label: 'TikTok' },
    { value: 'THREADS',  label: 'Threads' },
    { value: 'CHO_TOT',  label: 'Chợ Tốt' },
    { value: 'BDS',      label: 'BĐS' },
    { value: 'WALK_IN',  label: 'Vãng Lai' },
    { value: 'REFERRAL', label: 'Giới Thiệu' },
    { value: 'ZALO',     label: 'Zalo' },
    { value: 'OTHER',    label: 'Khác' },
];

const VIETNAM_PROVINCES = [
    'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh',
    'Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau',
    'Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên',
    'Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh',
    'Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa',
    'Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai',
    'Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ',
    'Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị',
    'Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa',
    'Thừa Thiên Huế','Tiền Giang','TP Hồ Chí Minh','Trà Vinh','Tuyên Quang',
    'Vĩnh Long','Vĩnh Phúc','Yên Bái',
];

/* ─── Types ──────────────────────────────────────────────── */
interface Employee { id: string; code: string; fullName: string; team?: { leaderId?: string; leader?: { id: string; fullName: string } } | null; }
interface Branch   { id: string; name: string; }
interface Team     { id: string; name: string; }

/* ─── Rate auto-calc logic ───────────────────────────────── */
function calcRates(hasM: boolean, hasM1: boolean, hasM2: boolean, hasS1: boolean, hasS2: boolean) {
    const rates = { mRate: 0, m1Rate: 0, m2Rate: 0, s1Rate: 0, s2Rate: 0 };
    if (hasM) {
        rates.mRate = 0.3;
        if (hasS1 && hasS2) { rates.s1Rate = 0.35; rates.s2Rate = 0.35; }
        else if (hasS1)     { rates.s1Rate = 0.7; }
    } else if (hasM1 && hasM2) {
        rates.m1Rate = 0.25; rates.m2Rate = 0.25;
        if (hasS1 && hasS2) { rates.s1Rate = 0.25; rates.s2Rate = 0.25; }
        else if (hasS1)     { rates.s1Rate = 0.5; }
    } else if (hasM1) {
        rates.m1Rate = 0.5;
        if (hasS1 && hasS2) { rates.s1Rate = 0.25; rates.s2Rate = 0.25; }
        else if (hasS1)     { rates.s1Rate = 0.5; }
    }
    return rates;
}

/* ─── Field row helper ───────────────────────────────────── */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="mt-1">{children}</div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

/* ─── Section header ─────────────────────────────────────── */
function Section({ title }: { title: string }) {
    return (
        <div className="col-span-full border-b border-orange-100 pb-1 mb-1">
            <h3 className="text-sm font-semibold text-[#E8890C]">{title}</h3>
        </div>
    );
}

/* ─── Main component ─────────────────────────────────────── */
export default function CreateProjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* lookup data */
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [branches, setBranches]   = useState<Branch[]>([]);
    const [teams, setTeams]         = useState<Team[]>([]);

    /* ── Cụm nhân sự ── */
    const [mId,  setMId]  = useState('');
    const [m1Id, setM1Id] = useState('');
    const [m2Id, setM2Id] = useState('');
    const [s1Id, setS1Id] = useState('');
    const [s2Id, setS2Id] = useState('');
    // computed rates (display only)
    const rates = calcRates(!!mId, !!m1Id, !!m2Id, !!s1Id, !!s2Id);
    // leaders
    const [mLeader,  setMLeader]  = useState('');
    const [m1Leader, setM1Leader] = useState('');
    const [m2Leader, setM2Leader] = useState('');
    const [s1Leader, setS1Leader] = useState('');
    const [s2Leader, setS2Leader] = useState('');

    /* ── Cụm thông tin phòng ── */
    const [roomCode,       setRoomCode]       = useState('');
    const [houseNumber,    setHouseNumber]     = useState('');
    const [province,       setProvince]        = useState('');
    const [ward,           setWard]            = useState('');
    const [managedBranchId, setManagedBranchId] = useState('');
    const [teamId,         setTeamId]          = useState('');
    const [rentalPrice,    setRentalPrice]      = useState('');
    const [contractStartAt, setContractStartAt] = useState('');
    const [contractEndAt,  setContractEndAt]   = useState('');
    const [leadSource,     setLeadSource]       = useState('');
    const [contractFile,   setContractFile]     = useState<File | null>(null);

    /* ── Cụm ngày cọc ── */
    const [deposit1,     setDeposit1]     = useState('');
    const [deposit2,     setDeposit2]     = useState('');
    const [deposit2Date, setDeposit2Date] = useState('');
    const [checkInDate,  setCheckInDate]  = useState('');

    /* ── Cụm doanh thu ── */
    const [estimatedCommissionPercent, setEstimatedCommissionPercent] = useState('');
    const [customerSupport,            setCustomerSupport]            = useState('');

    /* ── Cụm thông tin dự án ── */
    const [depositDate,    setDepositDate]    = useState('');
    const [customerName,   setCustomerName]   = useState('');
    const [customerPhone,  setCustomerPhone]  = useState('');
    const [note,           setNote]           = useState('');

    /* estimated revenue preview */
    const estimatedRevenue = (() => {
        const price = parseFloat(rentalPrice) || 0;
        const pct   = parseFloat(estimatedCommissionPercent) || 0;
        const sup   = parseFloat(customerSupport) || 0;
        if (!price || !pct) return null;
        return price * (pct / 100) - sup;
    })();

    /* ── Load lookups ── */
    useEffect(() => {
        Promise.all([
            api.get('/branches',  { params: { limit: 200 } }),
            api.get('/teams',     { params: { limit: 200 } }),
            api.get('/employees', { params: { limit: 500 } }),
        ]).then(([b, t, e]) => {
            setBranches(b.data?.data ?? []);
            setTeams(t.data?.data ?? []);
            setEmployees(e.data?.data ?? []);
        }).catch(() => {});
    }, []);

    /* ── Auto-load leader when employee selected ── */
    const getLeaderName = useCallback(async (empId: string): Promise<string> => {
        if (!empId) return '';
        try {
            const { data } = await api.get(`/employees/${empId}`);
            return data?.team?.leader?.fullName ?? data?.team?.leaderName ?? '';
        } catch { return ''; }
    }, []);

    const handleMChange = async (id: string) => {
        // mutex: clear M1, M2 when m selected
        setMId(id); setM1Id(''); setM2Id('');
        setM1Leader(''); setM2Leader('');
        setMLeader(id ? await getLeaderName(id) : '');
    };
    const handleM1Change = async (id: string) => {
        // mutex: clear m when M1/M2 selected
        setM1Id(id); setMId('');
        setMLeader('');
        setM1Leader(id ? await getLeaderName(id) : '');
    };
    const handleM2Change = async (id: string) => {
        setM2Id(id); setMId('');
        setMLeader('');
        setM2Leader(id ? await getLeaderName(id) : '');
    };
    const handleS1Change = async (id: string) => {
        setS1Id(id);
        setS1Leader(id ? await getLeaderName(id) : '');
    };
    const handleS2Change = async (id: string) => {
        setS2Id(id);
        setS2Leader(id ? await getLeaderName(id) : '');
    };

    /* ── Validation ── */
    const validate = () => {
        const e: Record<string, string> = {};
        if (!ward.trim())           e.ward = 'Nhập phường/xã';
        if (!province)              e.province = 'Chọn tỉnh/thành phố';
        if (!managedBranchId)       e.managedBranchId = 'Chọn chi nhánh';
        if (!deposit1 || Number(deposit1) < 1) e.deposit1 = 'Nhập tiền cọc lần 1';
        if (!depositDate)           e.depositDate = 'Chọn ngày đặt cọc';
        if (!customerName.trim())   e.customerName = 'Nhập tên khách hàng';
        if (!customerPhone.trim())  e.customerPhone = 'Nhập số điện thoại';
        if (!leadSource)            e.leadSource = 'Chọn nguồn khách';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ── Submit ── */
    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const staffSlot: Record<string, string | number | undefined> = {};
            if (mId)  { staffSlot.mEmployeeId  = mId;  staffSlot.mRate  = rates.mRate; }
            if (m1Id) { staffSlot.m1EmployeeId = m1Id; staffSlot.m1Rate = rates.m1Rate; }
            if (m2Id) { staffSlot.m2EmployeeId = m2Id; staffSlot.m2Rate = rates.m2Rate; }
            if (s1Id) { staffSlot.s1EmployeeId = s1Id; staffSlot.s1Rate = rates.s1Rate; }
            if (s2Id) { staffSlot.s2EmployeeId = s2Id; staffSlot.s2Rate = rates.s2Rate; }

            const payload: Record<string, unknown> = {
                ward,
                province,
                managedBranchId,
                teamId:           teamId || undefined,
                houseNumber:      houseNumber || undefined,
                roomCode:         roomCode || undefined,
                rentalPrice:      rentalPrice ? Number(rentalPrice) : undefined,
                contractStartAt:  contractStartAt ? new Date(contractStartAt).toISOString() : undefined,
                contractEndAt:    contractEndAt  ? new Date(contractEndAt).toISOString()  : undefined,
                leadSource:       leadSource || undefined,
                deposit1:         Number(deposit1),
                deposit2:         deposit2 ? Number(deposit2) : undefined,
                deposit2Date:     deposit2Date ? new Date(deposit2Date).toISOString() : undefined,
                checkInDate:      checkInDate ? new Date(checkInDate).toISOString() : undefined,
                depositDate:      new Date(depositDate).toISOString(),
                customerName,
                customerPhone,
                estimatedCommissionPercent: estimatedCommissionPercent ? Number(estimatedCommissionPercent) : undefined,
                customerSupport:  customerSupport ? Number(customerSupport) : undefined,
                note:             note || undefined,
                staffSlot:        Object.keys(staffSlot).length ? staffSlot : undefined,
            };

            const { data: created } = await api.post('/projects', payload);

            // upload contract image if selected
            if (contractFile && created?.id) {
                const fd = new FormData();
                fd.append('file', contractFile);
                await api.patch(`/projects/${created.id}/contract-image`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            toast.success('Tạo mới dự án thành công!');
            router.push('/dashboard/quan-ly-du-an/thong-tin');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể tạo dự án, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Employee select options ── */
    const empOptions = employees.map(em => (
        <SelectItem key={em.id} value={em.id}>{em.fullName} ({em.code})</SelectItem>
    ));

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-semibold text-[#1A2B5A]">Tạo dự án mới</h1>
            </div>

            <form onSubmit={onSubmit}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

                    {/* ── Cụm thông tin dự án ─────────────────────────── */}
                    <div className="grid grid-cols-3 gap-4">
                        <Section title="Cụm thông tin dự án" />

                        <Field label="Ngày đặt cọc" required error={errors.depositDate}>
                            <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={depositDate} onChange={e => setDepositDate(e.target.value)} />
                        </Field>

                        <Field label="Tên khách hàng" required error={errors.customerName}>
                            <Input className="h-9" placeholder="Nguyễn Văn A" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                        </Field>

                        <Field label="Số điện thoại khách" required error={errors.customerPhone}>
                            <Input className="h-9" placeholder="0901234567" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                        </Field>
                    </div>

                    {/* ── Cụm thông tin phòng ─────────────────────────── */}
                    <div className="grid grid-cols-3 gap-4">
                        <Section title="Cụm thông tin phòng" />

                        <Field label="Mã phòng">
                            <Input className="h-9" placeholder="VD: P101" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
                        </Field>

                        <Field label="Số nhà">
                            <Input className="h-9" placeholder="VD: 12B" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
                        </Field>

                        <Field label="Tỉnh / Thành phố" required error={errors.province}>
                            <Select value={province} onValueChange={setProvince}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn tỉnh/thành" /></SelectTrigger>
                                <SelectContent>
                                    {VIETNAM_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Phường / Xã" required error={errors.ward}>
                            <Input className="h-9" placeholder="VD: Phường Bến Nghé" value={ward} onChange={e => setWard(e.target.value)} />
                        </Field>

                        <Field label="Chi nhánh quản lý" required error={errors.managedBranchId}>
                            <Select value={managedBranchId} onValueChange={setManagedBranchId}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                                <SelectContent>
                                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Khu vực (Team)">
                            <Select value={teamId} onValueChange={setTeamId}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn khu vực" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Giá thuê (VNĐ)">
                            <Input type="number" className="h-9" min={0} placeholder="VD: 5000000" value={rentalPrice} onChange={e => setRentalPrice(e.target.value)} />
                        </Field>

                        <Field label="Ngày bắt đầu HĐ">
                            <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={contractStartAt} onChange={e => setContractStartAt(e.target.value)} />
                        </Field>

                        <Field label="Ngày kết thúc HĐ">
                            <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={contractEndAt} onChange={e => setContractEndAt(e.target.value)} />
                        </Field>

                        <Field label="Nguồn khách" required error={errors.leadSource}>
                            <Select value={leadSource} onValueChange={setLeadSource}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn nguồn khách" /></SelectTrigger>
                                <SelectContent>
                                    {LEAD_SOURCES.map(ls => <SelectItem key={ls.value} value={ls.value}>{ls.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="File ảnh hợp đồng">
                            <input
                                type="file"
                                accept="image/*"
                                className="h-9 w-full text-sm file:mr-3 file:h-full file:border-0 file:bg-orange-50 file:text-[#E8890C] file:font-medium file:px-3 file:rounded-l-md cursor-pointer border border-gray-200 rounded-md"
                                onChange={e => setContractFile(e.target.files?.[0] ?? null)}
                            />
                        </Field>
                    </div>

                    {/* ── Cụm ngày cọc ────────────────────────────────── */}
                    <div className="grid grid-cols-3 gap-4">
                        <Section title="Cụm ngày cọc" />

                        <Field label="Tiền cọc lần 1 (VNĐ)" required error={errors.deposit1}>
                            <Input type="number" className="h-9" min={0} placeholder="VD: 3000000" value={deposit1} onChange={e => setDeposit1(e.target.value)} />
                        </Field>

                        <Field label="Tiền cọc bổ sung (VNĐ)">
                            <Input type="number" className="h-9" min={0} placeholder="Không bắt buộc" value={deposit2} onChange={e => setDeposit2(e.target.value)} />
                        </Field>

                        <Field label="Ngày bổ sung cọc">
                            <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={deposit2Date} onChange={e => setDeposit2Date(e.target.value)} />
                        </Field>

                        <Field label="Ngày nhận phòng">
                            <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} />
                        </Field>
                    </div>

                    {/* ── Cụm doanh thu ───────────────────────────────── */}
                    <div className="grid grid-cols-3 gap-4">
                        <Section title="Cụm doanh thu" />

                        <Field label="Hoa hồng ước tính (%)">
                            <Input type="number" className="h-9" min={0} max={100} step={0.01} placeholder="VD: 5" value={estimatedCommissionPercent} onChange={e => setEstimatedCommissionPercent(e.target.value)} />
                        </Field>

                        <Field label="Hỗ trợ khách (VNĐ)">
                            <Input type="number" className="h-9" min={0} placeholder="VD: 500000" value={customerSupport} onChange={e => setCustomerSupport(e.target.value)} />
                        </Field>

                        <div className="flex flex-col justify-end">
                            <Label className="text-sm font-medium text-gray-700">Doanh thu ước tính</Label>
                            <div className={`mt-1 h-9 flex items-center px-3 rounded-md border text-sm font-medium ${estimatedRevenue != null ? 'border-orange-200 bg-orange-50 text-[#E8890C]' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                                {estimatedRevenue != null ? formatCurrency(estimatedRevenue) : '— (chưa đủ dữ liệu)'}
                            </div>
                        </div>
                    </div>

                    {/* ── Cụm nhân sự ─────────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="border-b border-orange-100 pb-1">
                            <h3 className="text-sm font-semibold text-[#E8890C]">Cụm nhân sự</h3>
                        </div>

                        {/* Mutex warning */}
                        {mId && (m1Id || m2Id) && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                m nhỏ và M1/M2 không thể chọn cùng lúc — hệ thống sẽ tự ưu tiên m nhỏ.
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">Vai trò</th>
                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Mã nhân viên</th>
                                        <th className="text-center px-3 py-2 font-medium text-gray-600 w-28">Tỉ lệ</th>
                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Mã Leader</th>
                                        <th className="text-center px-3 py-2 font-medium text-gray-600 w-28">Tỉ lệ Leader</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* m nhỏ */}
                                    <tr>
                                        <td className="px-3 py-2 font-medium text-[#E8890C]">m nhỏ</td>
                                        <td className="px-3 py-2">
                                            <Select value={mId} onValueChange={handleMChange}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Không chọn</SelectItem>
                                                    {empOptions}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-xs font-semibold ${rates.mRate ? 'text-[#E8890C]' : 'text-gray-300'}`}>
                                                {rates.mRate ? `${(rates.mRate * 100).toFixed(0)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">{mLeader || '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-400">Auto</td>
                                    </tr>
                                    {/* M1 */}
                                    <tr>
                                        <td className="px-3 py-2 font-medium text-[#1A2B5A]">M lớn 1</td>
                                        <td className="px-3 py-2">
                                            <Select value={m1Id} onValueChange={handleM1Change}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Không chọn</SelectItem>
                                                    {empOptions}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-xs font-semibold ${rates.m1Rate ? 'text-[#1A2B5A]' : 'text-gray-300'}`}>
                                                {rates.m1Rate ? `${(rates.m1Rate * 100).toFixed(0)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">{m1Leader || '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-400">Auto</td>
                                    </tr>
                                    {/* M2 */}
                                    <tr>
                                        <td className="px-3 py-2 font-medium text-[#1A2B5A]">M lớn 2</td>
                                        <td className="px-3 py-2">
                                            <Select value={m2Id} onValueChange={handleM2Change}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Không chọn</SelectItem>
                                                    {empOptions}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-xs font-semibold ${rates.m2Rate ? 'text-[#1A2B5A]' : 'text-gray-300'}`}>
                                                {rates.m2Rate ? `${(rates.m2Rate * 100).toFixed(0)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">{m2Leader || '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-400">Auto</td>
                                    </tr>
                                    {/* S1 */}
                                    <tr>
                                        <td className="px-3 py-2 font-medium text-green-700">S1</td>
                                        <td className="px-3 py-2">
                                            <Select value={s1Id} onValueChange={handleS1Change}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Không chọn</SelectItem>
                                                    {empOptions}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-xs font-semibold ${rates.s1Rate ? 'text-green-700' : 'text-gray-300'}`}>
                                                {rates.s1Rate ? `${(rates.s1Rate * 100).toFixed(0)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">{s1Leader || '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-400">Auto</td>
                                    </tr>
                                    {/* S2 */}
                                    <tr>
                                        <td className="px-3 py-2 font-medium text-green-700">S2</td>
                                        <td className="px-3 py-2">
                                            <Select value={s2Id} onValueChange={handleS2Change}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Không chọn</SelectItem>
                                                    {empOptions}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-xs font-semibold ${rates.s2Rate ? 'text-green-700' : 'text-gray-300'}`}>
                                                {rates.s2Rate ? `${(rates.s2Rate * 100).toFixed(0)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">{s2Leader || '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-400">Auto</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="text-xs text-gray-400">
                            * Tỉ lệ tự tính theo quy tắc: m nhỏ=0.3 | M1=0.5 | M1+M2=0.25 mỗi. Leader tự động load từ team của nhân viên.
                        </p>
                    </div>

                    {/* ── Ghi chú ────────────────────────────────────── */}
                    <div>
                        <Label className="text-sm font-medium text-gray-700">Ghi chú</Label>
                        <textarea
                            className="mt-1 w-full h-20 px-3 py-2 rounded-md border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            placeholder="Ghi chú thêm..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>

                    {/* ── Actions ─────────────────────────────────────── */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button type="button" variant="outline" className="border-gray-300" onClick={() => router.back()}>
                            Huỷ
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#E8890C] hover:bg-[#C8720A] min-w-[120px]">
                            {loading && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Tạo dự án
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
