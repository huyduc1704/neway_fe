'use client';
import { use } from 'react';
import RoleForm from '../_components/RoleForm';

export default function ChinhSuaVaiTroPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <RoleForm mode="edit" roleId={id} />;
}
