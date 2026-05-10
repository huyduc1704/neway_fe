'use client';
import { use } from 'react';
import EmployeeForm from '../_components/EmployeeForm';

export default function ChinhSuaNhanSuPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <EmployeeForm mode="edit" userId={id} />;
}
