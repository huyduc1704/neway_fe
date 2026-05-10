const USER_KEY = 'neway_user';
const COOKIE_NAME = 'neway_token';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

export const authStorage = {
    getToken: () => getCookie(COOKIE_NAME),
    setToken: (token: string) => {
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24}`;
    },
    getUser: () => {
        if (typeof window === 'undefined') return null;
        const raw = localStorage.getItem(USER_KEY);
        if (!raw || raw === 'undefined' || raw === 'null') return null;
        try { return JSON.parse(raw); } catch { return null; }
    },
    setUser: (user: object) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
    clear: () => {
        document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/`;
        localStorage.removeItem(USER_KEY);
    },
};
