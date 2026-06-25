'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { Button, Input, Select, Typography, Space, Card, InputNumber, DatePicker } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useProvinceWard } from '@/hooks/useProvinceWard';
import WardAutoComplete from '@/components/WardAutoComplete';

const { Title } = Typography;



/* ─── Types ──────────────────────────────────────────────── */
interface Employee { id: string; code?: string; fullName: string; employeeProfile?: { id?: string; employeeCode?: string; team?: { leaderId?: string; leader?: { id: string; fullName: string } } | null } | null; team?: { leaderId?: string; leader?: { id: string; fullName: string } } | null; }
interface Branch { id: string; name: string; wards: string[]; region?: { id: string; name: string } | null; }
interface Region { id: string; name: string; }

/* ─── Rate auto-calc logic ───────────────────────────────── */
function calcRates(hasM: boolean, hasM1: boolean, hasM2: boolean, hasS1: boolean, hasS2: boolean) {
    const rates = { mRate: 0, m1Rate: 0, m2Rate: 0, s1Rate: 0, s2Rate: 0 };
    if (hasM) {
        rates.mRate = 0.3;
        if (hasS1 && hasS2) { rates.s1Rate = 0.35; rates.s2Rate = 0.35; }
        else if (hasS1) { rates.s1Rate = 0.7; }
    } else if (hasM1 && hasM2) {
        rates.m1Rate = 0.25; rates.m2Rate = 0.25;
        if (hasS1 && hasS2) { rates.s1Rate = 0.25; rates.s2Rate = 0.25; }
        else if (hasS1) { rates.s1Rate = 0.5; }
    } else if (hasM1) {
        rates.m1Rate = 0.5;
        if (hasS1 && hasS2) { rates.s1Rate = 0.25; rates.s2Rate = 0.25; }
        else if (hasS1) { rates.s1Rate = 0.5; }
    }
    return rates;
}

/* ─── Field row helper ───────────────────────────────────── */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            {children}
            {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</p>}
        </div>
    );
}

/* ─── Section header ─────────────────────────────────────── */
function Section({ title }: { title: string }) {
    return (
        <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #fed7aa', paddingBottom: 4, marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E8890C', margin: 0 }}>{title}</h3>
        </div>
    );
}

/* ─── Main component ─────────────────────────────────────── */
export default function CreateProjectPage() {
    const router = useRouter();
    const { can } = useUser();

    useEffect(() => {
        if (!can('PROJECT_CREATE')) {
            message.error('Bạn không có quyền tạo dự án');
            router.replace('/dashboard/quan-ly-du-an/thong-tin');
        }
    }, []);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* lookup data */
    const [empOptions, setEmpOptions] = useState<{ value: string; label: string }[]>([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [allBranches, setAllBranches] = useState<Branch[]>([]);
    const [allRegions, setAllRegions] = useState<Region[]>([]);
    const [leadSources, setLeadSources] = useState<{ value: string; label: string }[]>([]);

    /* province/ward API */
    const { provinceOptions, wardOptions, provincesLoading, wardsLoading, selectedProvinceCode, onProvinceChange } = useProvinceWard();

    /* ── Cụm nhân sự ── */
    const [mId, setMId] = useState('');
    const [m1Id, setM1Id] = useState('');
    const [m2Id, setM2Id] = useState('');
    const [s1Id, setS1Id] = useState('');
    const [s2Id, setS2Id] = useState('');
    const rates = calcRates(!!mId, !!m1Id, !!m2Id, !!s1Id, !!s2Id);
    const [mLeader, setMLeader] = useState('');
    const [m1Leader, setM1Leader] = useState('');
    const [m2Leader, setM2Leader] = useState('');
    const [s1Leader, setS1Leader] = useState('');
    const [s2Leader, setS2Leader] = useState('');

    /* ── Cụm thông tin phòng ── */
    const [roomCode, setRoomCode] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [province, setProvince] = useState('');
    const [ward, setWard] = useState('');
    const [managedBranchId, setManagedBranchId] = useState('');
    const [regionId, setRegionId] = useState('');

    const filteredBranches = allBranches.filter(b =>
        (regionId ? b.region?.id === regionId : true) &&
        (ward ? b.wards.some(w => w.toLowerCase() === ward.toLowerCase()) : true)
    );

    const [rentalPrice, setRentalPrice] = useState('');
    const [depositPrice, setDepositPrice] = useState('');
    const [contractDuration, setContractDuration] = useState<number | null>(null);
    const [leadSource, setLeadSource] = useState('');
    const [contractFile, setContractFile] = useState<File | null>(null);

    /* ── Cụm ngày cọc ── */
    const [deposit1, setDeposit1] = useState('');
    const [deposit2, setDeposit2] = useState('');
    const [deposit2Date, setDeposit2Date] = useState('');
    const [checkInDate, setCheckInDate] = useState('');

    /* ── Cụm doanh thu ── */
    const [estimatedCommissionPercent, setEstimatedCommissionPercent] = useState('');
    const [customerSupport, setCustomerSupport] = useState('');

    /* ── Cụm thông tin dự án ── */
    const [depositDate, setDepositDate] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [note, setNote] = useState('');

    const estimatedRevenue = (() => {
        const price = parseFloat(rentalPrice) || 0;
        const pct = parseFloat(estimatedCommissionPercent) || 0;
        const sup = parseFloat(customerSupport) || 0;
        if (!price || !pct) return null;
        return price * (pct / 100) - sup;
    })();

    const formatCurrencyLocal = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    /* ── Load lookups ── */
    useEffect(() => {
        Promise.all([
            api.get('/branches', { params: { limit: 200 } }),
            api.get('/regions', { params: { limit: 200 } }),
            api.get('/lead-sources'),
        ]).then(([b, r, ls]) => {
            setAllBranches(b.data?.data ?? []);
            setAllRegions(r.data?.data ?? []);
            const sources = (Array.isArray(ls.data) ? ls.data : ls.data?.data ?? []);
            setLeadSources(sources.map((s: { code: string; label: string }) => ({ value: s.code, label: s.label })));
        }).catch(() => { });
    }, []);

    /* ── Server-side employee search (debounced 300ms) ── */
    const empSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleEmpSearch = useCallback((keyword: string) => {
        if (empSearchTimer.current) clearTimeout(empSearchTimer.current);
        if (!keyword || keyword.trim().length < 1) { setEmpOptions([]); return; }
        setEmpLoading(true);
        empSearchTimer.current = setTimeout(async () => {
            try {
                const { data } = await api.get('/employees', { params: { search: keyword.trim(), limit: 20 } });
                const list: Employee[] = data?.data ?? [];
                setEmpOptions(list.map(em => ({
                    value: em.id,
                    label: `${em.fullName} (${em.employeeProfile?.employeeCode || em.code || 'N/A'})`,
                })));
            } catch { }
            finally { setEmpLoading(false); }
        }, 300);
    }, []);

    /* ── Auto-load leader when employee selected ── */
    const getLeaderName = useCallback(async (empId: string): Promise<string> => {
        if (!empId) return '';
        try {
            const { data } = await api.get(`/employees/${empId}`);
            return data?.employeeProfile?.team?.leader?.fullName ?? data?.team?.leader?.fullName ?? data?.team?.leaderName ?? '';
        } catch { return ''; }
    }, []);

    const handleMChange = async (id: string) => {
        setMId(id); setM1Id(''); setM2Id('');
        setM1Leader(''); setM2Leader('');
        setMLeader(id ? await getLeaderName(id) : '');
    };
    const handleM1Change = async (id: string) => {
        setM1Id(id); setMId('');
        setMLeader('');
        if (!id) { setM2Id(''); setM2Leader(''); }
        setM1Leader(id ? await getLeaderName(id) : '');
    };
    const handleM2Change = async (id: string) => {
        setM2Id(id); setMId('');
        setMLeader('');
        setM2Leader(id ? await getLeaderName(id) : '');
    };
    const handleS1Change = async (id: string) => {
        setS1Id(id);
        if (!id) { setS2Id(''); setS2Leader(''); }
        setS1Leader(id ? await getLeaderName(id) : '');
    };
    const handleS2Change = async (id: string) => {
        setS2Id(id);
        setS2Leader(id ? await getLeaderName(id) : '');
    };

    /* ── Validation ── */
    const validate = () => {
        const e: Record<string, string> = {};
        if (!roomCode.trim()) e.roomCode = 'Nhập mã phòng';
        if (!houseNumber.trim()) e.houseNumber = 'Nhập mã dự án';
        if (!ward.trim()) e.ward = 'Nhập phường/xã';
        if (!province) e.province = 'Chọn tỉnh/thành phố';
        if (!managedBranchId) e.managedBranchId = 'Chọn chi nhánh';
        if (!rentalPrice) e.rentalPrice = 'Nhập giá thuê';
        if (!depositPrice) e.depositPrice = 'Nhập giá đặt cọc';
        if (!contractDuration) e.contractDuration = 'Nhập hạn hợp đồng';
        if (!leadSource) e.leadSource = 'Chọn nguồn khách';
        if (!deposit1 || Number(deposit1) < 1) e.deposit1 = 'Nhập tiền cọc lần 1';
        if (!depositDate) e.depositDate = 'Chọn ngày đặt cọc';
        if (!customerName.trim()) e.customerName = 'Nhập tên khách hàng';
        if (!customerPhone.trim()) e.customerPhone = 'Nhập số điện thoại';
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
            if (mId) { staffSlot.mEmployeeId = mId; staffSlot.mRate = rates.mRate; }
            if (m1Id) { staffSlot.m1EmployeeId = m1Id; staffSlot.m1Rate = rates.m1Rate; }
            if (m2Id) { staffSlot.m2EmployeeId = m2Id; staffSlot.m2Rate = rates.m2Rate; }
            if (s1Id) { staffSlot.s1EmployeeId = s1Id; staffSlot.s1Rate = rates.s1Rate; }
            if (s2Id) { staffSlot.s2EmployeeId = s2Id; staffSlot.s2Rate = rates.s2Rate; }

            const payload: Record<string, unknown> = {
                ward,
                province,
                managedBranchId,
                houseNumber: houseNumber || undefined,
                roomCode: roomCode || undefined,
                rentalPrice: rentalPrice ? Number(rentalPrice) : undefined,
                depositPrice: depositPrice ? Number(depositPrice) : undefined,
                contractDurationMonths: contractDuration || undefined,
                leadSource: leadSource || undefined,
                deposit1: Number(deposit1),
                deposit2: deposit2 ? Number(deposit2) : undefined,
                deposit2Date: deposit2Date ? new Date(deposit2Date).toISOString() : undefined,
                checkInDate: checkInDate ? new Date(checkInDate).toISOString() : undefined,
                depositDate: new Date(depositDate).toISOString(),
                customerName,
                customerPhone,
                estimatedCommissionPercent: estimatedCommissionPercent ? Number(estimatedCommissionPercent) : undefined,
                customerSupport: customerSupport ? Number(customerSupport) : undefined,
                note: note || undefined,
                staffSlot: Object.keys(staffSlot).length ? staffSlot : undefined,
            };

            const { data: created } = await api.post('/projects', payload);

            if (contractFile && created?.id) {
                const fd = new FormData();
                fd.append('file', contractFile);
                await api.patch(`/projects/${created.id}/contract-image`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            message.success('Tạo mới dự án thành công!');
            router.push('/dashboard/quan-ly-du-an/thong-tin');
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Không thể tạo dự án, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const dateInputStyle: React.CSSProperties = { height: 32, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ color: '#6b7280' }} />
                <Title level={4} style={{ margin: 0, color: '#1A2B5A' }}>Tạo dự án mới</Title>
            </div>

            <form onSubmit={onSubmit}>
                <Card>
                    {/* ── Cụm thông tin dự án ─────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <Section title="Cụm thông tin dự án" />

                        <Field label="Ngày đặt cọc" required error={errors.depositDate}>
                            <DatePicker style={dateInputStyle} format="DD/MM/YYYY" value={depositDate ? dayjs(depositDate) : null} onChange={(d) => setDepositDate(d ? d.format('YYYY-MM-DD') : '')} />
                        </Field>

                        <Field label="Tên khách hàng" required error={errors.customerName}>
                            <Input placeholder="Nguyễn Văn A" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                        </Field>

                        <Field label="Số điện thoại khách" required error={errors.customerPhone}>
                            <Input placeholder="0901234567" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                        </Field>
                    </div>

                    {/* ── Cụm thông tin phòng ─────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <Section title="Cụm thông tin phòng" />

                        <Field label="Mã phòng" required error={errors.roomCode}>
                            <Input placeholder="VD: P101" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
                        </Field>

                        <Field label="Mã dự án" required error={errors.houseNumber}>
                            <Input placeholder="VD: 163/8 BQL" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
                        </Field>

                        <Field label="Thành phố" required error={errors.province}>
                            <Select
                                value={province || undefined}
                                onChange={(val) => {
                                    setProvince(val ?? '');
                                    onProvinceChange(val, () => setWard(''));
                                }}
                                placeholder={provincesLoading ? 'Đang tải...' : 'Chọn thành phố'}
                                style={{ width: '100%' }}
                                showSearch
                                loading={provincesLoading}
                                allowClear
                                filterOption={(input, option) =>
                                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={provinceOptions.map(p => ({ value: p.name, label: p.name }))}
                            />
                        </Field>

                        <Field label="Phường / Xã" required error={errors.ward}>
                            <WardAutoComplete
                                value={ward}
                                onChange={v => { setWard(v); setManagedBranchId(''); }}
                                wardOptions={wardOptions}
                                loading={wardsLoading}
                                placeholder={wardsLoading ? 'Đang tải...' : selectedProvinceCode ? 'Chọn hoặc nhập phường/xã' : 'Chọn thành phố trước'}
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <Field label="Khu vực" error={errors.regionId}>
                            <Select
                                value={regionId || undefined}
                                onChange={v => { setRegionId(v ?? ''); setManagedBranchId(''); }}
                                placeholder="Chọn khu vực"
                                style={{ width: '100%' }}
                                showSearch
                                allowClear
                                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                                options={allRegions.map(r => ({ value: r.id, label: r.name }))}
                            />
                        </Field>

                        <Field label="Chi nhánh quản lý" required error={errors.managedBranchId}>
                            <Select
                                value={managedBranchId || undefined}
                                onChange={v => setManagedBranchId(v ?? '')}
                                placeholder={regionId ? 'Chọn chi nhánh theo khu vực' : ward ? 'Chọn chi nhánh theo phường' : 'Chọn chi nhánh'}
                                style={{ width: '100%' }}
                                showSearch
                                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                                options={filteredBranches.map(b => ({ value: b.id, label: b.name }))}
                            />
                        </Field>

                        <Field label="Giá thuê (VNĐ)" required error={errors.rentalPrice}>
                            <InputNumber
                                min={0}
                                placeholder="VD: 5000000"
                                value={rentalPrice ? Number(rentalPrice) : null}
                                onChange={v => setRentalPrice(v ? String(v) : '')}
                                onBlur={() => {
                                    if (rentalPrice && !depositPrice) {
                                        setDepositPrice(rentalPrice);
                                        if (!deposit1) setDeposit1(rentalPrice);
                                    }
                                }}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <Field label="Giá đặt cọc phòng (VNĐ)" required error={errors.depositPrice}>
                            <InputNumber
                                min={0}
                                placeholder="VD: 2000000"
                                value={depositPrice ? Number(depositPrice) : null}
                                onChange={v => setDepositPrice(v ? String(v) : '')}
                                onBlur={() => {
                                    if (depositPrice && !deposit1) setDeposit1(depositPrice);
                                }}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <Field label="Hạn hợp đồng" required error={errors.contractDuration}>
                            <InputNumber
                                min={1}
                                max={36}
                                step={1}
                                placeholder="VD: 12"
                                value={contractDuration}
                                onChange={v => setContractDuration(v)}
                                suffix="tháng"
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <Field label="Nguồn khách" required error={errors.leadSource}>
                            <Select
                                value={leadSource || undefined}
                                onChange={setLeadSource}
                                placeholder="Chọn nguồn khách"
                                style={{ width: '100%' }}
                                options={leadSources}
                            />
                        </Field>

                        <Field label="File ảnh hợp đồng">
                            <input
                                type="file"
                                accept="image/*"
                                style={{ height: 32, width: '100%', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, padding: '0 8px' }}
                                onChange={e => setContractFile(e.target.files?.[0] ?? null)}
                            />
                        </Field>
                    </div>

                    {/* ── Cụm ngày cọc ────────────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <Section title="Cụm ngày cọc" />

                        <Field label="Tiền cọc lần 1 (VNĐ)" required error={errors.deposit1}>
                            <InputNumber
                                min={0}
                                placeholder="VD: 3000000"
                                value={deposit1 ? Number(deposit1) : null}
                                onChange={v => setDeposit1(v ? String(v) : '')}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <Field label="Tiền cọc bổ sung (VNĐ)">
                            <InputNumber
                                min={0}
                                placeholder="Không bắt buộc"
                                value={deposit2 ? Number(deposit2) : null}
                                onChange={v => setDeposit2(v ? String(v) : '')}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <Field label="Ngày bổ sung cọc">
                            <DatePicker style={dateInputStyle} format="DD/MM/YYYY" value={deposit2Date ? dayjs(deposit2Date) : null} onChange={(d) => setDeposit2Date(d ? d.format('YYYY-MM-DD') : '')} />
                        </Field>

                        <Field label="Ngày nhận phòng">
                            <DatePicker style={dateInputStyle} format="DD/MM/YYYY" value={checkInDate ? dayjs(checkInDate) : null} onChange={(d) => setCheckInDate(d ? d.format('YYYY-MM-DD') : '')} />
                        </Field>
                    </div>

                    {/* ── Cụm doanh thu ───────────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <Section title="Cụm doanh thu" />

                        <Field label="Hoa hồng ước tính (%)">
                            <InputNumber min={0} max={100} step={0.01} placeholder="VD: 5" value={estimatedCommissionPercent ? Number(estimatedCommissionPercent) : null} onChange={v => setEstimatedCommissionPercent(v ? String(v) : '')} style={{ width: '100%' }} />
                        </Field>

                        <Field label="Hỗ trợ khách (VNĐ)">
                            <InputNumber
                                min={0}
                                placeholder="VD: 500000"
                                value={customerSupport ? Number(customerSupport) : null}
                                onChange={v => setCustomerSupport(v ? String(v) : '')}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                                style={{ width: '100%' }}
                            />
                        </Field>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Doanh thu ước tính</label>
                            <div style={{
                                height: 32, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 6, border: '1px solid',
                                borderColor: estimatedRevenue != null ? '#fed7aa' : '#d9d9d9',
                                background: estimatedRevenue != null ? '#fff7ed' : '#f9fafb',
                                color: estimatedRevenue != null ? '#E8890C' : '#9ca3af',
                                fontSize: 14, fontWeight: estimatedRevenue != null ? 500 : 400,
                            }}>
                                {estimatedRevenue != null ? formatCurrencyLocal(estimatedRevenue) : '— (chưa đủ dữ liệu)'}
                            </div>
                        </div>
                    </div>

                    {/* ── Cụm nhân sự ─────────────────────────────────── */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ borderBottom: '1px solid #fed7aa', paddingBottom: 4, marginBottom: 12 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E8890C', margin: 0 }}>Cụm nhân sự</h3>
                        </div>

                        {mId && (m1Id || m2Id) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                m nhỏ và M1/M2 không thể chọn cùng lúc — hệ thống sẽ tự ưu tiên m nhỏ.
                            </div>
                        )}

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: '#6b7280', width: 112 }}>Vai trò</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: '#6b7280' }}>Mã nhân viên</th>
                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 500, color: '#6b7280', width: 112 }}>Tỉ lệ</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: '#6b7280' }}>Mã Leader</th>
                                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 500, color: '#6b7280', width: 112 }}>Tỉ lệ Leader</th>
                                    </tr>
                                </thead>
                                <tbody style={{ borderTop: '1px solid #f0f0f0' }}>
                                    {[
                                        { role: 'm nhỏ', roleColor: '#E8890C', value: mId, onChange: handleMChange, rate: rates.mRate, rateColor: '#E8890C', leader: mLeader, disabled: false },
                                        { role: 'M lớn 1', roleColor: '#1A2B5A', value: m1Id, onChange: handleM1Change, rate: rates.m1Rate, rateColor: '#1A2B5A', leader: m1Leader, disabled: false },
                                        { role: 'M lớn 2', roleColor: '#1A2B5A', value: m2Id, onChange: handleM2Change, rate: rates.m2Rate, rateColor: '#1A2B5A', leader: m2Leader, disabled: !m1Id },
                                        { role: 'S1', roleColor: '#16a34a', value: s1Id, onChange: handleS1Change, rate: rates.s1Rate, rateColor: '#16a34a', leader: s1Leader, disabled: false },
                                        { role: 'S2', roleColor: '#16a34a', value: s2Id, onChange: handleS2Change, rate: rates.s2Rate, rateColor: '#16a34a', leader: s2Leader, disabled: !s1Id },
                                    ].map((row, i) => (
                                        <tr key={row.role} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 500, color: row.roleColor }}>{row.role}</td>
                                            <td style={{ padding: '8px 12px' }}>
                                                <Select
                                                    value={row.value || undefined}
                                                    onChange={v => row.onChange(v ?? '')}
                                                    placeholder={row.disabled ? 'Điền trước' : 'Gõ tên để tìm...'}
                                                    style={{ width: '100%', fontSize: 12 }}
                                                    allowClear
                                                    disabled={row.disabled}
                                                    options={[{ value: '', label: 'Không chọn' }, ...empOptions]}
                                                    showSearch
                                                    filterOption={false}
                                                    onSearch={handleEmpSearch}
                                                    loading={empLoading}
                                                    notFoundContent={empLoading ? 'Đang tìm...' : 'Gõ tên để tìm nhân viên'}
                                                    size="small"
                                                />
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: row.rate ? row.rateColor : '#d1d5db' }}>
                                                    {row.rate ? `${(row.rate * 100).toFixed(0)}%` : '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{row.leader || '—'}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>Auto</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Ghi chú ────────────────────────────────────── */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 14, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>Ghi chú</label>
                        <textarea
                            style={{ width: '100%', height: 80, padding: '8px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14, resize: 'none', outline: 'none' }}
                            placeholder="Ghi chú thêm..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>

                    {/* ── Actions ─────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                        <Button onClick={() => router.back()}>Huỷ</Button>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ minWidth: 120, background: '#E8890C', borderColor: '#E8890C' }}>
                            Tạo dự án
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
