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

const VI_ERRORS: Record<number, string> = {
    400: 'Dữ liệu gửi lên không hợp lệ, vui lòng kiểm tra lại.',
    401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy dữ liệu yêu cầu.',
    409: 'Dữ liệu bị trùng lặp hoặc xung đột.',
    422: 'Dữ liệu không hợp lệ.',
    500: 'Hệ thống đang gặp sự cố, vui lòng thử lại sau.',
};

api.interceptors.response.use(
    (res) => res,
    (error) => {
        const status: number | undefined = error.response?.status;

        if (status === 401) {
            authStorage.clear();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Ghi đè message backend nếu là tiếng Anh mặc định hoặc không có message
        const backendMsg: string | undefined = error.response?.data?.message;
        const isGenericMsg = !backendMsg || /forbidden|unauthorized|internal server|not found/i.test(backendMsg);
        if (status && isGenericMsg && VI_ERRORS[status]) {
            error.response.data = {
                ...error.response.data,
                message: VI_ERRORS[status],
            };
        }

        return Promise.reject(error);
    },
);

export default api;
