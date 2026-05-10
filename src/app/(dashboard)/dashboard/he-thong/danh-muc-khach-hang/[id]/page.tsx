'use client';
import { use } from 'react';
import CustomerForm from '../_components/CustomerForm';

export default function ChinhSuaKhachHangPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <CustomerForm mode="edit" customerId={id} />;
}
