import api from './api';

export async function downloadExport(
    endpoint: string,
    params: Record<string, any>,
    filename: string,
    format: 'excel' | 'pdf' = 'excel',
): Promise<void> {
    const res = await api.get(endpoint, {
        params: { ...params, format },
        responseType: 'blob',
    });

    const ext = format === 'excel' ? 'xlsx' : 'txt';
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
