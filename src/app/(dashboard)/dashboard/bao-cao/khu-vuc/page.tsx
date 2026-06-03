'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { ChevronDown, ChevronRight, Users, TrendingUp, Building2, BarChart3 } from 'lucide-react';
import { Card, Tag, Table, Select, Typography, Space, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

const { Title } = Typography;

type Tab = 'teams' | 'branches' | 'company';

interface TeamReport {
    teamId: string; teamCode: string; teamName: string;
    leader: { id: string; employeeCode: string; fullName: string; roles: { code: string; name: string }[] } | null;
    kpi: number; estimatedRevenue: number; overdueCheckin: number; mismatched: number;
    staffCountDiff: number; finalEstimatedRevenue: number; progress: number | null;
    totalTransactions: number; totalStaff: number; competitionRevenue: number;
    yesterday: { estimatedRevenue: number; transactionCount: number };
}
interface BranchReport {
    branchId: string; branchCode: string; branchName: string;
    region: { id: string | null; name: string };
    estimatedRevenue: number; txCountDiff: number; badDebt: number;
    finalRevenue: number; kpi: number; completionRate: number | null;
}
interface RegionTotal { region: { id: string | null; name: string }; estimatedRevenue: number; finalRevenue: number; branchCount: number; }
interface CompanyReport {
    totalContracts: number;
    byDuration: { lessThan6Months: number; exactly6Months: number; between6And12Months: number; exactly12Months: number; moreThan12Months: number };
}
interface Region { id: string; name: string; }
interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

const DURATION_LABELS = [
    { key: 'lessThan6Months', label: '< 6 tháng', color: '#E8890C' },
    { key: 'exactly6Months', label: '6 tháng', color: '#1A2B5A' },
    { key: 'between6And12Months', label: '6 - 12 tháng', color: '#52c41a' },
    { key: 'exactly12Months', label: '12 tháng', color: '#1677ff' },
    { key: 'moreThan12Months', label: '> 12 tháng', color: '#722ed1' },
];

export default function KhuVucPage() {
    const [tab, setTab] = useState<Tab>('teams');
    const [teamsData, setTeamsData] = useState<TeamReport[]>([]);
    const [branchesData, setBranchesData] = useState<BranchReport[]>([]);
    const [regionTotals, setRegionTotals] = useState<RegionTotal[]>([]);
    const [companyData, setCompanyData] = useState<CompanyReport | null>(null);
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
    const [memberData, setMemberData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);

    const [regions, setRegions] = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [regionFilter, setRegionFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

    const params = { fromDate, toDate, regionId: regionFilter || undefined, branchId: branchFilter || undefined, teamId: teamFilter || undefined };

    const fetchTab = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'teams') {
                const { data } = await api.get('/reports/regional/teams', { params });
                setTeamsData(Array.isArray(data) ? data : []);
            } else if (tab === 'branches') {
                const { data } = await api.get('/reports/regional/branches', { params });
                setBranchesData(data.data ?? []);
                setRegionTotals(data.regionTotals ?? []);
            } else {
                const { data } = await api.get('/reports/regional/company', { params: { fromDate, toDate } });
                setCompanyData(data);
            }
        } catch { message.error('Không thể tải báo cáo khu vực'); }
        finally { setLoading(false); }
    }, [tab, fromDate, toDate, regionFilter, branchFilter, teamFilter]);

    useEffect(() => { fetchTab(); }, [fetchTab]);
    useEffect(() => {
        api.get('/regions', { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const loadMembers = async (teamId: string) => {
        if (memberData[teamId]) { setExpandedTeam(expandedTeam === teamId ? null : teamId); return; }
        try {
            const { data } = await api.get(`/reports/regional/teams/${teamId}/members`, { params: { fromDate, toDate } });
            setMemberData(prev => ({ ...prev, [teamId]: data }));
            setExpandedTeam(teamId);
        } catch { message.error('Không thể tải danh sách nhân sự'); }
    };

    const progressColor = (pct: number | null) => {
        if (pct === null) return '#9ca3af';
        if (pct >= 80) return '#16a34a';
        if (pct >= 60) return '#ca8a04';
        return '#ef4444';
    };

    const teamColumns: ColumnsType<TeamReport> = [
        {
            title: '', key: 'expand', width: 40, align: 'center',
            render: (_, r) => (
                <button onClick={() => loadMembers(r.teamId)} style={{ padding: 4, borderRadius: 4, cursor: 'pointer', background: 'none', border: 'none', color: '#9ca3af' }}>
                    {expandedTeam === r.teamId ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
            ),
        },
        { title: 'Mã Team', key: 'teamCode', width: 100, render: (_, r) => <Tag>{r.teamCode}</Tag> },
        {
            title: 'Leader', key: 'leader', width: 180,
            render: (_, r) => r.leader ? (
                <div><p style={{ fontWeight: 500, color: '#1A2B5A', margin: 0 }}>{r.leader.fullName}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{r.leader.employeeCode}</p></div>
            ) : <span style={{ color: '#9ca3af' }}>—</span>,
        },
        { title: 'KPI', key: 'kpi', width: 140, align: 'right', render: (_, r) => r.kpi > 0 ? <span style={{ color: '#1A2B5A', fontWeight: 500 }}>{formatCurrency(r.kpi)}</span> : <span style={{ color: '#9ca3af' }}>Chưa có</span> },
        { title: 'DT ước tính', key: 'estimatedRevenue', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 500, color: '#E8890C' }}>{formatCurrency(r.estimatedRevenue)}</span> },
        { title: 'Quá hạn', key: 'overdueCheckin', width: 130, align: 'right', render: (_, r) => r.overdueCheckin > 0 ? <span style={{ color: '#ef4444' }}>{formatCurrency(r.overdueCheckin)}</span> : <span style={{ color: '#d1d5db' }}>0đ</span> },
        { title: 'Không khớp', key: 'mismatched', width: 130, align: 'right', render: (_, r) => r.mismatched > 0 ? <span style={{ color: '#f97316' }}>{formatCurrency(r.mismatched)}</span> : <span style={{ color: '#d1d5db' }}>0đ</span> },
        { title: 'DT cuối cùng', key: 'finalEstimatedRevenue', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 700, color: '#1A2B5A' }}>{formatCurrency(r.finalEstimatedRevenue)}</span> },
        {
            title: 'Tiến độ', key: 'progress', width: 100, align: 'center',
            render: (_, r) => r.progress !== null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: progressColor(r.progress) }}>{r.progress.toFixed(1)}%</span>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: '#E8890C', width: `${Math.min(r.progress, 100)}%`, transition: 'all 0.3s' }} />
                    </div>
                </div>
            ) : <span style={{ color: '#9ca3af' }}>—</span>,
        },
        { title: 'Số GD', key: 'totalTransactions', width: 80, align: 'center', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.totalTransactions}</span> },
        { title: 'Nhân sự', key: 'totalStaff', width: 80, align: 'center', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.totalStaff}</span> },
        {
            title: 'Hôm qua', key: 'yesterday', width: 150, align: 'right',
            render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    <p style={{ fontWeight: 500, color: '#E8890C', margin: 0 }}>{formatCurrency(r.yesterday.estimatedRevenue)}</p>
                    <p style={{ color: '#9ca3af', margin: 0 }}>{r.yesterday.transactionCount} GD</p>
                </div>
            ),
        },
    ];

    const branchColumns: ColumnsType<BranchReport> = [
        { title: 'Khu vực', key: 'region', width: 150, render: (_, r) => r.region.name },
        { title: 'Mã CN', key: 'code', width: 100, render: (_, r) => <Tag>{r.branchCode}</Tag> },
        { title: 'Chi nhánh', key: 'name', render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.branchName}</span> },
        { title: 'DT ước tính', key: 'estimatedRevenue', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 500, color: '#E8890C' }}>{formatCurrency(r.estimatedRevenue)}</span> },
        { title: 'Số GD', key: 'txCountDiff', width: 80, align: 'center', render: (_, r) => r.txCountDiff },
        { title: 'Nợ xấu', key: 'badDebt', width: 130, align: 'right', render: (_, r) => r.badDebt > 0 ? <span style={{ color: '#ef4444' }}>{formatCurrency(r.badDebt)}</span> : <span style={{ color: '#d1d5db' }}>0đ</span> },
        { title: 'DT cuối', key: 'finalRevenue', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 700, color: '#1A2B5A' }}>{formatCurrency(r.finalRevenue)}</span> },
        { title: 'KPI', key: 'kpi', width: 130, align: 'right', render: (_, r) => r.kpi > 0 ? formatCurrency(r.kpi) : <span style={{ color: '#9ca3af' }}>—</span> },
        {
            title: 'Tỉ lệ HT', key: 'completionRate', width: 100, align: 'center',
            render: (_, r) => r.completionRate !== null
                ? <span style={{ fontWeight: 700, color: progressColor(r.completionRate) }}>{r.completionRate.toFixed(1)}%</span>
                : <span style={{ color: '#9ca3af' }}>—</span>,
        },
    ];

    const memberColumns: ColumnsType<any> = [
        { title: 'STT', key: 'stt', width: 50, align: 'center', dataIndex: 'stt' },
        { title: 'Họ tên', key: 'fullName', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.fullName}</span> },
        { title: 'Mã NV', key: 'employeeCode', width: 110, render: (_, r) => <Tag>{r.employeeCode}</Tag> },
        { title: 'Vai trò', key: 'roles', width: 120, render: (_, r) => r.roles?.map((role: any) => role.code).join(', ') || '—' },
        { title: 'Danh hiệu', key: 'eliteTitle', width: 120, align: 'center', render: (_, r) => r.eliteTitle ? <Tag color={r.eliteTitle === 'TINH_ANH' ? 'blue' : 'default'}>{r.eliteTitle === 'TINH_ANH' ? '⭐ Tinh Anh' : '✨ Tinh Hoa'}</Tag> : <span style={{ color: '#d1d5db' }}>—</span> },
        { title: 'Số GD', key: 'transactionCount', width: 80, align: 'center', dataIndex: 'transactionCount' },
        { title: 'DT ước tính', key: 'estimatedRevenue', width: 150, align: 'right', render: (_, r) => <span style={{ color: '#E8890C', fontWeight: 500 }}>{formatCurrency(r.estimatedRevenue)}</span> },
        { title: 'Chênh lệch', key: 'revenueDiff', width: 130, align: 'right', render: (_, r) => <span style={{ color: r.revenueDiff > 0 ? '#f97316' : '#16a34a' }}>{formatCurrency(r.revenueDiff)}</span> },
        { title: 'GD Thành công', key: 'successRevenue', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(r.successRevenue)}</span> },
    ];

    const TABS = [
        { key: 'teams', label: 'Danh sách Team', icon: <Users size={16} /> },
        { key: 'branches', label: 'Danh sách Chi nhánh', icon: <Building2 size={16} /> },
        { key: 'company', label: 'Tổng Công ty', icon: <BarChart3 size={16} /> },
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Khu vực</Title>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Tổng quan hiệu suất theo team, chi nhánh và toàn công ty</p>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Từ</span>
                    <input type="date" style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}
                        value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>đến</span>
                    <input type="date" style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}
                        value={toDate} onChange={e => setToDate(e.target.value)} />
                    <Select
                        value={regionFilter || undefined}
                        onChange={(v) => setRegionFilter(v === '__all__' ? '' : (v ?? ''))}
                        placeholder="Tất cả khu vực"
                        style={{ width: 176 }}
                        allowClear
                        options={[{ value: '__all__', label: 'Tất cả khu vực' }, ...regions.map(r => ({ value: r.id, label: r.name }))]}
                    />
                    <Select
                        value={branchFilter || undefined}
                        onChange={(v) => setBranchFilter(v === '__all__' ? '' : (v ?? ''))}
                        placeholder="Tất cả chi nhánh"
                        style={{ width: 176 }}
                        allowClear
                        options={[{ value: '__all__', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                    />
                    <Select
                        value={teamFilter || undefined}
                        onChange={(v) => setTeamFilter(v === '__all__' ? '' : (v ?? ''))}
                        placeholder="Tất cả team"
                        style={{ width: 160 }}
                        allowClear
                        options={[{ value: '__all__', label: 'Tất cả team' }, ...teams.map(t => ({ value: t.id, label: t.name }))]}
                    />
                </Space>
            </Card>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: 4, width: 'fit-content' }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as Tab)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                            background: tab === t.key ? '#E8890C' : 'transparent',
                            color: tab === t.key ? 'white' : '#4b5563',
                            transition: 'all 0.2s',
                        }}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {!loading && tab === 'teams' && (
                <Card>
                    <Table columns={teamColumns} dataSource={teamsData} rowKey="teamId" loading={loading} pagination={{ pageSize: 20 }}
                        locale={{ emptyText: 'Không có dữ liệu team trong kỳ này' }} size="small" />
                    {/* Member rows */}
                    {teamsData.map(team => expandedTeam === team.teamId && memberData[team.teamId] && (
                        <div key={`members-${team.teamId}`} style={{ borderTop: '1px dashed #fed7aa', background: 'rgba(255, 237, 213, 0.3)', padding: '16px 24px' }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1A2B5A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={16} color="#E8890C" /> Nhân sự Team {team.teamCode}
                            </p>
                            <Table columns={memberColumns} dataSource={memberData[team.teamId]} rowKey="id" pagination={{ pageSize: 10 }} size="small" />
                        </div>
                    ))}
                </Card>
            )}

            {!loading && tab === 'branches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card>
                        <Table columns={branchColumns} dataSource={branchesData} rowKey="branchId" loading={loading} pagination={{ pageSize: 20 }} locale={{ emptyText: 'Không có dữ liệu chi nhánh' }} size="small" />
                    </Card>
                    {regionTotals.length > 0 && (
                        <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} color="#E8890C" /> Tổng theo Khu vực</span>}>
                            <Row gutter={[12, 12]}>
                                {regionTotals.map((rt, i) => (
                                    <Col key={i} xs={24} md={12} lg={8}>
                                        <div style={{ padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                            <p style={{ fontWeight: 600, color: '#1A2B5A', marginBottom: 8 }}>{rt.region.name}</p>
                                            <p style={{ fontSize: 14, color: '#6b7280', margin: '2px 0' }}>DT ước tính: <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(rt.estimatedRevenue)}</span></p>
                                            <p style={{ fontSize: 14, color: '#6b7280', margin: '2px 0' }}>DT cuối: <span style={{ fontWeight: 700, color: '#1A2B5A' }}>{formatCurrency(rt.finalRevenue)}</span></p>
                                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{rt.branchCount} chi nhánh</p>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    )}
                </div>
            )}

            {!loading && tab === 'company' && companyData && (
                <Row gutter={[20, 20]}>
                    <Col xs={24} md={12}>
                        <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={16} color="#E8890C" /> Hợp đồng theo thời hạn</span>}>
                            <p style={{ fontSize: 30, fontWeight: 700, color: '#1A2B5A', marginBottom: 20 }}>
                                {companyData.totalContracts} <span style={{ fontSize: 16, fontWeight: 400, color: '#9ca3af' }}>hợp đồng</span>
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {DURATION_LABELS.map(({ key, label, color }) => {
                                    const val = (companyData.byDuration as any)[key] ?? 0;
                                    const pct = companyData.totalContracts > 0 ? (val / companyData.totalContracts) * 100 : 0;
                                    return (
                                        <div key={key}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                                                <span style={{ color: '#4b5563' }}>{label}</span>
                                                <span style={{ fontWeight: 700, color }}>{val} ({pct.toFixed(1)}%)</span>
                                            </div>
                                            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'all 0.3s' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="Phân bổ thời hạn HĐ">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {DURATION_LABELS.map(({ key, label, color }) => {
                                    const val = (companyData.byDuration as any)[key] ?? 0;
                                    return (
                                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                                                <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
                                            </div>
                                            <span style={{ fontSize: 20, fontWeight: 700, color }}>{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}
        </>
    );
}
