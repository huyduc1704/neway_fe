'use client';
import { use } from 'react';
import UserForm from '../_components/UserForm';

export default function ChinhSuaNguoiDungPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <UserForm mode="edit" userId={id} />;
}
