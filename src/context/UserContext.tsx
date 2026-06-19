'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface RoleObject { id: string; code: string; name: string; }

interface UserContextValue {
    permissions: string[];
    roles: string[];
    roleObjects: RoleObject[];
    loading: boolean;
    can: (permission: string) => boolean;
    isAdmin: boolean;
    myEmployeeId: string | null;
}

const UserContext = createContext<UserContextValue>({
    permissions: [],
    roles: [],
    roleObjects: [],
    loading: true,
    can: () => true,
    isAdmin: false,
    myEmployeeId: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [roleObjects, setRoleObjects] = useState<RoleObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                setPermissions(data.permissions ?? []);
                setRoles(data.roles ?? []);
                setRoleObjects(data.roleObjects ?? []);
                setMyEmployeeId(data.profile?.id ?? null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const isAdmin = roles.includes('ADMIN');

    const can = (permission: string) => {
        if (isAdmin) return true;
        // Nếu role chưa được cấu hình permissions trong DB → fail-open,
        // để backend tự xử lý access control, tránh ẩn hết sidebar
        if (permissions.length === 0) return true;
        return permissions.includes(permission);
    };

    return (
        <UserContext.Provider value={{ permissions, roles, roleObjects, loading, can, isAdmin, myEmployeeId }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
