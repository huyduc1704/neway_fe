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

interface Props {
    mode: 'create' | 'edit';
    roleId?: string;
}

export default function RoleForm({ mode, roleId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState<string>('true');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (mode === 'edit' && roleId) {
            setLoading(true);
            api.get(`/roles/${roleId}`)
                .then(({ data }) => {
                    setCode(data.code || '');
                    setName(data.name || '');
                    setDescription(data.description || '');
                    setIsActive(String(data.isActive ?? true));
                })
                .catch(() => toast.error('Không thể tải thông tin vai trò'))
                .finally(() => setLoading(false));
        }
    }, [mode, roleId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!code.trim()) e.code = 'Nhập mã vai trò';
        if (!name.trim()) e.name = 'Nhập tên vai trò';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await api.post('/roles', { code: code.toUpperCase(), name, description, isActive: isActive === 'true' });
                toast.success('Tạo vai trò thành công');
            } else {
                await api.patch(`/roles/${roleId}`, { name, description, isActive: isActive === 'true' });
                toast.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/vai-tro' as any);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá vai trò này?')) return;
        try {
            await api.delete(`/roles/${roleId}`);
            toast.success('Đã xoá vai trò');
            router.push('/dashboard/he-thong/vai-tro' as any);
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
            <PageHeader title="Vai trò / Tạo mới · Chỉnh sửa" />
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <Label>Mã vai trò <span className="text-red-500">*</span></Label>
                            <Input
                                className="mt-1 uppercase"
                                placeholder="VD: ADMIN, SALE..."
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                disabled={mode === 'edit'}
                            />
                            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                        </div>
                        <div>
                            <Label>Tên vai trò <span className="text-red-500">*</span></Label>
                            <Input
                                className="mt-1"
                                placeholder="Nhập tên vai trò"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
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

                    <div className="grid grid-cols-2 gap-6 mt-5">
                        <div>
                            <Label>Mô tả</Label>
                            <textarea
                                className="mt-1 w-full h-24 px-3 py-2 rounded-md border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                placeholder="Mô tả quyền hạn của vai trò này..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
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
