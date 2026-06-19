'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { message } from 'antd';
import { DatePicker, Select, Table, Card, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

type GroupBy = 'BRANCH' | 'REGION';

const COLORS = ['#E8890C', '#1A2B5A', '#52c41a', '#1677ff', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#8c8c8c', '#f5222d'];

interface SourceRow {
    branch?: { id: string; code: string; name: string };
    region?: { id: string; name: string };
    sources: Record<string, number>;
    total: number;
}
interface GrandTotal { sources: Record<string, number>; total: number; }
interface Region { id: string; name: string; }
interface Branch { id: string; name: string; }

export default function BaoCaoNguonKhachPage() {
    const [data, setData] = useState<SourceRow[]>([]);
    const [grandTotal, setGrandTotal] = useState<GrandTotal | null>(null);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('BRANCH');
    const [regions, setRegions] = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [regionFilter, setRegionFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [sourceKeys, setSourceKeys] = useState<string[]>([]);
    const [sourceLabels, setSourceLabels] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/customer-sources', {
                params: { groupBy, fromDate, toDate, regionId: regionFilter || undefined, branchId: branchFilter || undefined },
            });
            if (groupBy === 'BRANCH') {
                setData(res.data ?? []);
                setGrandTotal(res.grandTotal ?? null);
            } else {
                setData(Array.isArray(res) ? res : []);
                setGrandTotal(null);
            }
        } catch { message.error('Không thể tải báo cáo nguồn khách'); }
        finally { setLoading(false); }
    }, [groupBy, fromDate, toDate, regionFilter, branchFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        api.get('/regions', { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/lead-sources').then(({ data: ls }) => {
            const sources = Array.isArray(ls) ? ls : (ls?.data ?? []);
            setSourceKeys(sources.map((s: { code: string }) => s.code));
            const labels: Record<string, string> = {};
            sources.forEach((s: { code: string; label: string }) => { labels[s.code] = s.label; });
            setSourceLabels(labels);
        }).catch(() => {});
    }, []);

    const chartData = sourceKeys.map((key, i) => ({
        name: sourceLabels[key] ?? key,
        value: grandTotal?.sources[key] ?? data.reduce((s, r) => s + (r.sources[key] ?? 0), 0),
        fill: COLORS[i % COLORS.length],
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const columns: ColumnsType<SourceRow> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        groupBy === 'BRANCH'
            ? {
                title: 'Khu vực', key: 'region', width: 150,
                render: (_, r) => r.region?.name ?? <span style={{ color: '#9ca3af' }}>—</span>,
            }
            : {
                title: 'Khu vực', key: 'region',
                render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.region?.name ?? '—'}</span>,
            },
        ...(groupBy === 'BRANCH' ? [{
            title: 'Chi nhánh', key: 'branch',
            render: (_: any, r: SourceRow) => r.branch ? (
                <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.branch.name}</span>
            ) : <span style={{ color: '#9ca3af' }}>—</span>,
        }] : []),
        ...sourceKeys.map((key, i) => ({
            title: sourceLabels[key] ?? key, key, width: 95, align: 'center' as const,
            render: (_: any, r: SourceRow) => {
                const val = r.sources[key] ?? 0;
                return val > 0
                    ? <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{val}</span>
                    : <span style={{ color: '#d1d5db' }}>0</span>;
            },
        })),
        {
            title: 'Tổng', key: 'total', width: 80, align: 'center',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C' }}>{r.total}</span>,
        },
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Nguồn khách</Title>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Thống kê khách hàng theo kênh tiếp thị</p>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                        {(['BRANCH', 'REGION'] as GroupBy[]).map(opt => (
                            <button key={opt} onClick={() => setGroupBy(opt)}
                                style={{
                                    padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                                    background: groupBy === opt ? '#E8890C' : 'white',
                                    color: groupBy === opt ? 'white' : '#4b5563',
                                    transition: 'all 0.2s',
                                }}>
                                {opt === 'BRANCH' ? 'Chi nhánh' : 'Khu vực'}
                            </button>
                        ))}
                    </div>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Từ</span>
                    <DatePicker value={fromDate ? dayjs(fromDate) : null} onChange={(d) => setFromDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>đến</span>
                    <DatePicker value={toDate ? dayjs(toDate) : null} onChange={(d) => setToDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
                    <Select
                        value={regionFilter || undefined}
                        onChange={(v) => setRegionFilter(v === '__all__' ? '' : (v ?? ''))}
                        placeholder="Tất cả khu vực"
                        style={{ width: 176 }}
                        allowClear
                        options={[{ value: '__all__', label: 'Tất cả khu vực' }, ...regions.map(r => ({ value: r.id, label: r.name }))]}
                    />
                    {groupBy === 'BRANCH' && (
                        <Select
                            value={branchFilter || undefined}
                            onChange={(v) => setBranchFilter(v === '__all__' ? '' : (v ?? ''))}
                            placeholder="Tất cả chi nhánh"
                            style={{ width: 176 }}
                            allowClear
                            options={[{ value: '__all__', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                        />
                    )}
                </Space>
            </Card>

            {/* Chart */}
            {chartData.length > 0 && (
                <Card style={{ marginBottom: 16 }} title="Phân bổ nguồn khách">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v) => [`${v} khách`, 'Số lượng']} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Summary chips */}
            {grandTotal && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    {sourceKeys.filter(k => (grandTotal.sources[k] ?? 0) > 0).map((key, i) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '8px 16px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                            <span style={{ fontSize: 14, color: '#4b5563' }}>{sourceLabels[key] ?? key}:</span>
                            <span style={{ fontWeight: 700, fontSize: 14, color: COLORS[i % COLORS.length] }}>{grandTotal.sources[key]}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', padding: '8px 16px' }}>
                        <span style={{ fontSize: 14, color: '#4b5563' }}>Tổng:</span>
                        <span style={{ fontWeight: 700, color: '#E8890C' }}>{grandTotal.total}</span>
                    </div>
                </div>
            )}

            <Card>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey={(r) => r.branch?.id ?? r.region?.id ?? Math.random().toString()}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    size="small"
                />
            </Card>
        </>
    );
}
