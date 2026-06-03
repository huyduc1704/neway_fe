'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RevenueDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(false);

    const [projectCode, setProjectCode] = useState('');
    const [estimatedProjectRevenue, setEstimatedProjectRevenue] = useState('');
    const [personnelCommission, setPersonnelCommission] = useState('');
    const [estimatedTxRevenue, setEstimatedTxRevenue] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        // Mock data fetch for specific ID
        setProjectCode('10195653');
        setEstimatedProjectRevenue('5000000');
        setPersonnelCommission('18000000');
        setEstimatedTxRevenue('877');
        setStatus('Đang giao dịch');
    }, [params.id]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Perform update logic here
            toast.success('Cập nhật doanh thu thành công!');
            router.push('/dashboard/quan-ly-du-an/doanh-thu');
        } catch {
            toast.error('Lỗi lưu dữ liệu, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-semibold text-[#1A2B5A]">Quản lý doanh thu / chi tiết</h1>
            </div>

            <form onSubmit={onSubmit}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 min-h-[60vh]">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-20">
                        <div>
                            <Label className="font-bold">Mã dự án</Label>
                            <Input className="mt-1 h-10" placeholder="Nhập mã dự án" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} />
                        </div>
                        <div>
                            <Label className="font-bold">Doanh thu ước tính dự án</Label>
                            <Input className="mt-1 h-10" placeholder="Nhập giá thuê" value={estimatedProjectRevenue} onChange={(e) => setEstimatedProjectRevenue(e.target.value)} />
                        </div>
                        <div>
                            <Label className="font-bold">Hoa hồng nhân sự</Label>
                            <Input className="mt-1 h-10" placeholder="Nhập hoa hồng" value={personnelCommission} onChange={(e) => setPersonnelCommission(e.target.value)} />
                        </div>
                        <div>
                            <Label className="font-bold">Doanh thu ước tính giao dịch</Label>
                            <Input className="mt-1 h-10" placeholder="Nhập doanh thu" value={estimatedTxRevenue} onChange={(e) => setEstimatedTxRevenue(e.target.value)} />
                        </div>
                        <div>
                            <Label className="font-bold">Trạng thái</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Đang giao dịch">Đang giao dịch</SelectItem>
                                    <SelectItem value="Hoàn thành">Hoàn thành</SelectItem>
                                    <SelectItem value="Chờ">Chờ</SelectItem>
                                    <SelectItem value="Đang xem xét">Đang xem xét</SelectItem>
                                    <SelectItem value="Tạm ngừng">Tạm ngừng</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button" variant="outline"
                            className="h-11 w-24 border-[#E8890C] text-[#E8890C] hover:bg-orange-50"
                            onClick={() => router.back()}
                        >
                            Xoá
                        </Button>
                        <Button
                            type="submit" disabled={loading}
                            className="h-11 w-36 bg-[#E8890C] hover:bg-[#C8720A]"
                        >
                            {loading && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
