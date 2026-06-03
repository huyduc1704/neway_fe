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

interface Role { id: string; name: string; }

interface Props {
    mode: 'create' | 'edit';
    userId?: string;
}

export default function UserForm({ mode, userId }: Props) {
    const router = useRouter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [roleId, setRoleId] = useState('');
    const [isActive, setIsActive] = useState<string>('true');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'edit' && userId) {
            setLoading(true);
            api.get(`/users/${userId}`)
                .then(({ data }) => {
                    setFullName(data.fullName || '');
                    setUsername(data.username || '');
                    setPhone(data.phone || '');
                    setEmail(data.email || '');
                    setRoleId(data.roles?.[0]?.role?.id || '');
                    setIsActive(String(data.isActive ?? true));
                })
                .catch(() => toast.error('Không thể tải thông tin người dùng'))
                .finally(() => setLoading(false));
        }
    }, [mode, userId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!fullName.trim()) e.fullName = 'Nhập họ tên';
        if (!username.trim()) e.username = 'Nhập tên đăng nhập';
        if (mode === 'create' && !password) e.password = 'Nhập mật khẩu';
        if (mode === 'create' && password && password.length < 8) e.password = 'Ít nhất 8 ký tự';
        if (!phone.trim()) e.phone = 'Nhập số điện thoại';
        if (mode === 'create' && !roleId) e.roleId = 'Chọn vai trò';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await api.post('/users', { fullName, username, password, phone, email: email || undefined, roleId });
                toast.success('Tạo người dùng thành công');
            } else {
                await api.patch(`/users/${userId}`, { fullName, phone, email: email || undefined, isActive: isActive === 'true' });
                toast.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/nguoi-dung' as any);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Vô hiệu hoá tài khoản này?')) return;
        try {
            await api.patch(`/users/${userId}/deactivate`);
            toast.success('Đã vô hiệu hoá tài khoản');
            router.push('/dashboard/he-thong/nguoi-dung' as any);
        } catch {
            toast.error('Thao tác thất bại');
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
            <PageHeader title="Tạo mới / Chỉnh sửa" />
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor="fullName">Họ tên <span className="text-red-500">*</span></Label>
                            <Input id="fullName" className="mt-1" placeholder="Nhập họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                        <div>
                            <Label htmlFor="username">Tên đăng nhập <span className="text-red-500">*</span></Label>
                            <Input id="username" className="mt-1" placeholder="Nhập tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} disabled={mode === 'edit'} />
                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                        </div>
                        <div>
                            <Label>Trạng thái</Label>
                            <Select value={isActive} onValueChange={setIsActive}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Hoạt động</SelectItem>
                                    <SelectItem value="false">Không hoạt động</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label htmlFor="password">
                                Mật khẩu {mode === 'create' && <span className="text-red-500">*</span>}
                            </Label>
                            <Input
                                id="password" type="password" className="mt-1"
                                placeholder={mode === 'edit' ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'}
                                value={password} onChange={(e) => setPassword(e.target.value)}
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>
                        <div>
                            <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                            <Input id="phone" className="mt-1" placeholder="Nhập số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                        <div>
                            <Label>Vai trò {mode === 'create' && <span className="text-red-500">*</span>}</Label>
                            <Select value={roleId} onValueChange={setRoleId} disabled={mode === 'edit'}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {errors.roleId && <p className="text-red-500 text-xs mt-1">{errors.roleId}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" className="mt-1" placeholder="Nhập email (không bắt buộc)" value={email} onChange={(e) => setEmail(e.target.value)} />
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
