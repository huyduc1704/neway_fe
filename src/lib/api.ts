import axios from 'axios';
import { authStorage } from './auth';

let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
}

const api = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = authStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            authStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default api;
