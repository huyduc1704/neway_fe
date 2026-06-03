'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

interface Props {
    mode: 'create' | 'edit';
    userId?: string;
}

interface UserOption { id: string; fullName: string; username: string; }
interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface ManagerOption { id: string; user: { fullName: string }; }

const ROLE_OPTIONS = [
    { value: 'SALE',      label: 'Nhân viên Kinh doanh' },
    { value: 'LEADER',    label: 'Trưởng nhóm' },
    { value: 'MARKETING', label: 'Nhân viên Marketing' },
];

export default function EmployeeForm({ mode, userId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [users, setUsers] = useState<UserOption[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [managers, setManagers] = useState<ManagerOption[]>([]);

    const [selectedUserId, setSelectedUserId] = useState('');
    const [employeeCode, setEmployeeCode] = useState('');
    const [roleCode, setRoleCode] = useState('');
    const [branchId, setBranchId] = useState('');
    const [teamId, setTeamId] = useState('');
    const [directManagerId, setDirectManagerId] = useState('');
    const [joinedAt, setJoinedAt] = useState('');
    const [isActive, setIsActive] = useState<string>('true');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setManagers(data.data.map((e: any) => ({
            id: e.employeeProfile?.id,
            user: { fullName: e.fullName },
        })).filter((m: any) => m.id && m.id !== userId))).catch(() => {});

        if (mode === 'create') {
            api.get('/users', { params: { limit: 200 } }).then(({ data }) => setUsers(data.data)).catch(() => {});
        }
    }, [mode, userId]);

    useEffect(() => {
        if (mode === 'edit' && userId) {
            setLoading(true);
            api.get(`/employees/${userId}`)
                .then(({ data }) => {
                    setEmployeeCode(data.employeeProfile?.employeeCode || '');
                    setRoleCode(data.roles?.[0]?.role?.code || '');
                    setBranchId(data.employeeProfile?.branch?.id || '');
                    setTeamId(data.employeeProfile?.team?.id || '');
                    setDirectManagerId(data.employeeProfile?.directManager?.id || '');
                    setJoinedAt(data.employeeProfile?.joinedAt ? dayjs(data.employeeProfile.joinedAt).format('YYYY-MM-DD') : '');
                    setIsActive(String(data.employeeProfile?.isActive ?? true));
                    setAvatarUrl(data.employeeProfile?.avatarUrl ?? null);
                })
                .catch(() => toast.error('Không thể tải thông tin nhân viên'))
                .finally(() => setLoading(false));
        }
    }, [mode, userId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (mode === 'create' && !selectedUserId) e.userId = 'Chọn tài khoản';
        if (!employeeCode.trim()) e.employeeCode = 'Nhập mã nhân viên';
        if (!roleCode) e.roleCode = 'Chọn vai trò';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const payload: any = {
                employeeCode,
                roleCode,
                branchId: branchId || undefined,
                teamId: teamId || undefined,
                directManagerId: directManagerId || undefined,
                joinedAt: joinedAt ? new Date(joinedAt).toISOString() : undefined,
            };

            if (mode === 'create') {
                await api.post('/employees', { ...payload, userId: selectedUserId });
                toast.success('Tạo hồ sơ nhân viên thành công');
            } else {
                const { employeeCode: _c, ...rest } = payload;
                await api.patch(`/employees/${userId}/profile`, { ...rest, isActive: isActive === 'true' });
                toast.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-nhan-su' as any);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        if (!userId) return;
        setUploadingAvatar(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.patch(`/employees/${userId}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setAvatarUrl(data?.avatarUrl ?? null);
            toast.success('Upload avatar thành công');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upload thất bại');
        } finally { setUploadingAvatar(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá nhân viên này?')) return;
        try {
            await api.delete(`/employees/${userId}`);
            toast.success('Đã xoá nhân viên');
            router.push('/dashboard/he-thong/danh-muc-nhan-su' as any);
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
            <PageHeader title="Danh mục nhân sự / Tạo mới · Chỉnh sửa" />
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-3 gap-6">
                        {mode === 'create' && (
                            <div>
                                <Label>Tài khoản người dùng <span className="text-red-500">*</span></Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn tài khoản..." /></SelectTrigger>
                                    <SelectContent>
                                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.username})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
                            </div>
                        )}
                        <div>
                            <Label>Mã nhân viên <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: NV001" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} disabled={mode === 'edit'} />
                            {errors.employeeCode && <p className="text-red-500 text-xs mt-1">{errors.employeeCode}</p>}
                        </div>
                        <div>
                            <Label>Vai trò <span className="text-red-500">*</span></Label>
                            <Select value={roleCode} onValueChange={setRoleCode}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {errors.roleCode && <p className="text-red-500 text-xs mt-1">{errors.roleCode}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label>Chi nhánh</Label>
                            <Select value={branchId} onValueChange={setBranchId}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Team</Label>
                            <Select value={teamId} onValueChange={setTeamId}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn team" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Leader trực thuộc</Label>
                            <Select value={directManagerId} onValueChange={setDirectManagerId}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn leader (không bắt buộc)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.user.fullName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {mode === 'edit' && (
                        <div className="mt-5 flex items-center gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <div className="h-16 w-16 rounded-full border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center shrink-0">
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    : <span className="text-2xl text-gray-300">👤</span>}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Ảnh đại diện</p>
                                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${uploadingAvatar ? 'opacity-50' : 'border-gray-300 hover:bg-white'}`}>
                                    <Upload className="h-3.5 w-3.5" />
                                    {uploadingAvatar ? 'Đang upload...' : (avatarUrl ? 'Thay ảnh' : 'Upload ảnh')}
                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar}
                                        onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                                </label>
                                <p className="text-xs text-gray-400 mt-1">Tối đa 5MB</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label>Ngày vào làm</Label>
                            <input type="date" className="mt-1 h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} />
                        </div>
                        {mode === 'edit' && (
                            <div>
                                <Label>Trạng thái</Label>
                                <Select value={isActive} onValueChange={setIsActive}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Đang làm</SelectItem>
                                        <SelectItem value="false">Đã nghỉ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
