'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

interface Props {
    mode: 'create' | 'edit';
    projectId?: string;
}

const STATUS_OPTIONS = [
    { value: 'DRAFT',     label: 'Nháp' },
    { value: 'ACTIVE',    label: 'Đang hoạt động' },
    { value: 'ON_HOLD',   label: 'Tạm dừng' },
    { value: 'CLOSED',    label: 'Đã đóng' },
    { value: 'CANCELLED', label: 'Đã huỷ' },
];

export default function ProjectForm({ mode, projectId }: Props) {
    const router = useRouter();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [code, setCode] = useState('');
    const [area, setArea] = useState('');
    const [ward, setWard] = useState('');
    const [managedBranchId, setManagedBranchId] = useState('');
    const [teamId, setTeamId] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [rentalStartAt, setRentalStartAt] = useState('');
    const [rentalEndAt, setRentalEndAt] = useState('');
    const [expectedStayAt, setExpectedStayAt] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'edit' && projectId) {
            setLoading(true);
            api.get(`/projects/${projectId}`)
                .then(({ data }) => {
                    setCode(data.code || '');
                    setWard(data.ward || '');
                    setArea(data.area || '');
                    setManagedBranchId(data.managedBranch?.id || '');
                    setTeamId(data.team?.id || '');
                    setStatus(data.status || 'DRAFT');
                    setRentalStartAt(data.rentalStartAt ? dayjs(data.rentalStartAt).format('YYYY-MM-DD') : '');
                    setRentalEndAt(data.rentalEndAt ? dayjs(data.rentalEndAt).format('YYYY-MM-DD') : '');
                    setExpectedStayAt(data.expectedStayAt ? dayjs(data.expectedStayAt).format('YYYY-MM-DD') : '');
                    setNote(data.note || '');
                })
                .catch(() => toast.error('Không thể tải thông tin dự án'))
                .finally(() => setLoading(false));
        }
    }, [mode, projectId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!code.trim()) e.code = 'Nhập mã dự án';
        if (!area.trim()) e.area = 'Nhập khu vực';
        if (!ward.trim()) e.ward = 'Nhập phường/xã';
        if (!managedBranchId) e.managedBranchId = 'Chọn chi nhánh';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const payload: any = {
                code, area, ward,
                managedBranchId,
                teamId: teamId || undefined,
                status,
                rentalStartAt: rentalStartAt ? new Date(rentalStartAt).toISOString() : undefined,
                rentalEndAt: rentalEndAt ? new Date(rentalEndAt).toISOString() : undefined,
                expectedStayAt: expectedStayAt ? new Date(expectedStayAt).toISOString() : undefined,
                note: note || undefined,
            };

            if (mode === 'create') {
                await api.post('/projects', payload);
                toast.success('Tạo dự án thành công');
            } else {
                const { code: _c, ...rest } = payload;
                await api.patch(`/projects/${projectId}`, rest);
                toast.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-du-an' as any);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá dự án này?')) return;
        try {
            await api.delete(`/projects/${projectId}`);
            toast.success('Đã xoá dự án');
            router.push('/dashboard/he-thong/danh-muc-du-an' as any);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-5 w-5 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <>
            <PageHeader title="Danh mục dự án / Tạo mới · Chỉnh sửa" />
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <Label>Mã dự án <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: DA001" value={code} onChange={(e) => setCode(e.target.value)} disabled={mode === 'edit'} />
                            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                        </div>
                        <div>
                            <Label>Khu vực <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: Quận 12" value={area} onChange={(e) => setArea(e.target.value)} />
                            {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
                        </div>
                        <div>
                            <Label>Phường / Xã <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: Thạnh Lộc" value={ward} onChange={(e) => setWard(e.target.value)} />
                            {errors.ward && <p className="text-red-500 text-xs mt-1">{errors.ward}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label>Chi nhánh quản lý <span className="text-red-500">*</span></Label>
                            <Select value={managedBranchId} onValueChange={setManagedBranchId}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {errors.managedBranchId && <p className="text-red-500 text-xs mt-1">{errors.managedBranchId}</p>}
                        </div>
                        <div>
                            <Label>Team phụ trách</Label>
                            <Select value={teamId} onValueChange={setTeamId}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn team (không bắt buộc)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {mode === 'edit' && (
                            <div>
                                <Label>Trạng thái</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label>Ngày bắt đầu thuê</Label>
                            <input type="date" className="mt-1 h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={rentalStartAt} onChange={(e) => setRentalStartAt(e.target.value)} />
                        </div>
                        <div>
                            <Label>Ngày kết thúc thuê</Label>
                            <input type="date" className="mt-1 h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={rentalEndAt} onChange={(e) => setRentalEndAt(e.target.value)} />
                        </div>
                        <div>
                            <Label>Ngày khách dự kiến ở</Label>
                            <input type="date" className="mt-1 h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={expectedStayAt} onChange={(e) => setExpectedStayAt(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-5">
                        <div>
                            <Label>Ghi chú</Label>
                            <textarea
                                className="mt-1 w-full h-24 px-3 py-2 rounded-md border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                placeholder="Ghi chú thêm..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        {mode === 'edit' && (
                            <Button type="button" variant="destructive" onClick={handleDelete}>Xoá</Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => router.back()}>Huỷ</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Lưu thay đổi
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
