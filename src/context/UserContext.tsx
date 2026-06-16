'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface UserContextValue {
    permissions: string[];
    roles: string[];
    loading: boolean;
    can: (permission: string) => boolean;
    isAdmin: boolean;
}

const UserContext = createContext<UserContextValue>({
    permissions: [],
    roles: [],
    loading: true,
    can: () => false,
    isAdmin: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                setPermissions(data.permissions ?? []);
                setRoles(data.roles ?? []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const isAdmin = roles.includes('ADMIN');
    const can = (permission: string) => isAdmin || permissions.includes(permission);

    return (
        <UserContext.Provider value={{ permissions, roles, loading, can, isAdmin }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
