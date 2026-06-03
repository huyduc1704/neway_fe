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
    customerId?: string;
}

export default function CustomerForm({ mode, customerId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [code, setCode] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');
    const [isActive, setIsActive] = useState<string>('true');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (mode === 'edit' && customerId) {
            setLoading(true);
            api.get(`/customers/${customerId}`)
                .then(({ data }) => {
                    setCode(data.code || '');
                    setFullName(data.fullName || '');
                    setPhone(data.phone || '');
                    setEmail(data.email || '');
                    setAddress(data.address || '');
                    setNote(data.note || '');
                    setIsActive(String(data.isActive ?? true));
                })
                .catch(() => toast.error('Không thể tải thông tin khách hàng'))
                .finally(() => setLoading(false));
        }
    }, [mode, customerId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!code.trim()) e.code = 'Nhập mã khách hàng';
        if (!fullName.trim()) e.fullName = 'Nhập họ tên';
        if (!phone.trim()) e.phone = 'Nhập số điện thoại';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await api.post('/customers', { code, fullName, phone, email: email || undefined, address: address || undefined, note: note || undefined });
                toast.success('Tạo khách hàng thành công');
            } else {
                await api.patch(`/customers/${customerId}`, { fullName, phone, email: email || undefined, address: address || undefined, note: note || undefined, isActive: isActive === 'true' });
                toast.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-khach-hang' as any);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá khách hàng này?')) return;
        try {
            await api.delete(`/customers/${customerId}`);
            toast.success('Đã xoá khách hàng');
            router.push('/dashboard/he-thong/danh-muc-khach-hang' as any);
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
            <PageHeader title="Danh mục khách hàng / Tạo mới · Chỉnh sửa" />
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <Label>Mã khách hàng <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: KH001" value={code} onChange={(e) => setCode(e.target.value)} disabled={mode === 'edit'} />
                            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                        </div>
                        <div>
                            <Label>Họ tên <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="Nhập họ tên khách hàng" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                        <div>
                            <Label>Số điện thoại <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="Nhập số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-5">
                        <div>
                            <Label>Email</Label>
                            <Input type="email" className="mt-1" placeholder="Nhập email (không bắt buộc)" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <Label>Địa chỉ</Label>
                            <Input className="mt-1" placeholder="Nhập địa chỉ (không bắt buộc)" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        {mode === 'edit' && (
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
                        )}
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
