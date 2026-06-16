'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Trophy, TrendingUp, Star, Users } from 'lucide-react';
import { Card, DatePicker, Tag, Select, Table, Typography, Space, Row, Col, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TopByRevenue { rank: number; employeeCode: string; fullName: string; eligibleRevenue: number; }
interface TopByCount   { rank: number; employeeCode: string; fullName: string; eligibleCount: number; }
interface EliteItem    { stt: number; employeeCode: string; fullName: string; title: 'TINH_ANH' | 'TINH_HOA'; }
interface TopTeam      { rank: number; teamCode: string; leaderCode: string; leaderName: string; eligibleRevenue: number; }

interface AwardsData {
    top3ByRevenue: TopByRevenue[];
    top1ByCount:   TopByCount | null;
    eliteSummary:  EliteItem[];
    top1Team:      TopTeam | null;
}

interface Branch { id: string; name: string; }
interface Team   { id: string; name: string; }

const RANK_ICON: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function GiaiThuongPage() {
    const [awards,       setAwards]       = useState<AwardsData | null>(null);
    const [loading,      setLoading]      = useState(false);
    const [branches,     setBranches]     = useState<Branch[]>([]);
    const [teams,        setTeams]        = useState<Team[]>([]);
    const [fromDate,     setFromDate]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate,       setToDate]       = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter,   setTeamFilter]   = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/awards', {
                params: { fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined },
            });
            setAwards(data);
        } catch { message.error('Không thể tải dữ liệu giải thưởng'); }
        finally { setLoading(false); }
    }, [fromDate, toDate, branchFilter, teamFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams',    { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    // ── Column defs ────────────────────────────────────────────────────────────
    const revenueColumns: ColumnsType<TopByRevenue> = [
        {
            title: 'Hạng', key: 'rank', width: 60, align: 'center',
            render: (_, r) => <span style={{ fontSize: 22 }}>{RANK_ICON[r.rank] ?? r.rank}</span>,
        },
        { title: 'Mã NV', key: 'code', width: 110, render: (_, r) => <Tag color="orange">{r.employeeCode ?? '—'}</Tag> },
        { title: 'Họ tên', key: 'name', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.fullName ?? '—'}</span> },
        {
            title: 'Doanh thu ước tính', key: 'revenue', width: 180, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(r.eligibleRevenue)}</span>,
        },
    ];

    const countColumns: ColumnsType<TopByCount> = [
        {
            title: 'Hạng', key: 'rank', width: 60, align: 'center',
            render: () => <span style={{ fontSize: 22 }}>🥇</span>,
        },
        { title: 'Mã NV', key: 'code', width: 110, render: (_, r) => <Tag color="orange">{r.employeeCode ?? '—'}</Tag> },
        { title: 'Họ tên', key: 'name', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.fullName ?? '—'}</span> },
        {
            title: 'Số giao dịch', key: 'count', width: 120, align: 'center',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C', fontSize: 18 }}>{r.eligibleCount}</span>,
        },
    ];

    const teamColumns: ColumnsType<TopTeam> = [
        {
            title: 'Top', key: 'rank', width: 60, align: 'center',
            render: () => <span style={{ fontSize: 22 }}>🏆</span>,
        },
        { title: 'Mã Team', key: 'teamCode', width: 120, render: (_, r) => <Tag color="blue">{r.teamCode ?? '—'}</Tag> },
        {
            title: 'Tên Leader', key: 'leader',
            render: (_, r) => (
                <span>
                    <span style={{ fontWeight: 600 }}>{r.leaderName ?? '—'}</span>
                    {r.leaderCode && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>({r.leaderCode})</span>}
                </span>
            ),
        },
        {
            title: 'Doanh thu ước tính', key: 'revenue', width: 180, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(r.eligibleRevenue)}</span>,
        },
    ];

    const eliteColumns: ColumnsType<EliteItem> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', dataIndex: 'stt' },
        { title: 'Mã NV', key: 'code', width: 110, render: (_, r) => <Tag color="orange">{r.employeeCode ?? '—'}</Tag> },
        { title: 'Họ tên', key: 'name', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.fullName ?? '—'}</span> },
        {
            title: 'Danh hiệu', key: 'title', width: 140, align: 'center',
            render: (_, r) => (
                <Tag color={r.title === 'TINH_ANH' ? 'blue' : 'gold'} style={{ fontWeight: 600 }}>
                    {r.title === 'TINH_ANH' ? '⭐ Tinh Anh' : '✨ Tinh Hoa'}
                </Tag>
            ),
        },
    ];

    // ── Shared card title style ────────────────────────────────────────────────
    const sectionTitle = (icon: React.ReactNode, label: string) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon}
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1A2B5A' }}>{label}</span>
        </span>
    );

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Giải thưởng</Title>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Top cá nhân xuất sắc, Tinh Hoa / Tinh Anh, Top Team</p>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 20 }}>
                <Space wrap>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Từ</span>
                    <DatePicker value={fromDate ? dayjs(fromDate) : null} onChange={(d) => setFromDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>đến</span>
                    <DatePicker value={toDate ? dayjs(toDate) : null} onChange={(d) => setToDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
                    <Select value={branchFilter || undefined} onChange={(v) => setBranchFilter(v ?? '')} placeholder="Tất cả chi nhánh" style={{ width: 176 }} allowClear
                        options={[{ value: '', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} />
                    <Select value={teamFilter || undefined} onChange={(v) => setTeamFilter(v ?? '')} placeholder="Tất cả team" style={{ width: 160 }} allowClear
                        options={[{ value: '', label: 'Tất cả team' }, ...teams.map(t => ({ value: t.id, label: t.name }))]} />
                </Space>
            </Card>

            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <Spin size="large" />
                </div>
            )}

            {awards && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ── TOP GIẢI THƯỞNG ─────────────────────────────────────── */}
                    <Card
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Trophy size={20} color="#E8890C" />
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#1A2B5A' }}>Top Giải thưởng</span>
                            </span>
                        }
                        style={{ borderTop: '3px solid #E8890C' }}
                    >
                        {/* Row 1: Top 3 doanh thu + Top 1 số GD */}
                        <Row gutter={[24, 24]}>
                            <Col xs={24} xl={15}>
                                <Text strong style={{ display: 'block', marginBottom: 10, color: '#374151' }}>
                                    <TrendingUp size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: '#E8890C' }} />
                                    Top 3 cá nhân xuất sắc — Doanh thu ước tính
                                </Text>
                                <Table
                                    columns={revenueColumns}
                                    dataSource={awards.top3ByRevenue}
                                    rowKey={(r) => r.employeeCode ?? String(r.rank)}
                                    pagination={false}
                                    size="small"
                                    locale={{ emptyText: 'Chưa có dữ liệu trong kỳ này' }}
                                    rowClassName={(_, i) => i === 0 ? 'ant-table-row-selected' : ''}
                                />
                            </Col>

                            <Col xs={24} xl={9}>
                                <Text strong style={{ display: 'block', marginBottom: 10, color: '#374151' }}>
                                    <Star size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: '#E8890C' }} />
                                    Top 1 cá nhân xuất sắc — Số giao dịch
                                </Text>
                                <Table
                                    columns={countColumns}
                                    dataSource={awards.top1ByCount ? [awards.top1ByCount] : []}
                                    rowKey={(r) => r.employeeCode ?? 'top1'}
                                    pagination={false}
                                    size="small"
                                    locale={{ emptyText: 'Chưa có dữ liệu' }}
                                />
                            </Col>
                        </Row>

                        {/* Row 2: Top 1 Team */}
                        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
                            <Text strong style={{ display: 'block', marginBottom: 10, color: '#374151' }}>
                                🏆 Top 1 Team xuất sắc — Doanh thu ước tính
                            </Text>
                            <Table
                                columns={teamColumns}
                                dataSource={awards.top1Team ? [awards.top1Team] : []}
                                rowKey={(r) => r.teamCode ?? 'top1team'}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: 'Chưa có dữ liệu' }}
                            />
                        </div>
                    </Card>

                    {/* ── TỔNG HỢP TINH HOA / TINH ANH ───────────────────────── */}
                    <Card
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={20} color="#E8890C" />
                                <span style={{ fontWeight: 700, fontSize: 15, color: '#1A2B5A' }}>Tổng hợp Tinh Hoa / Tinh Anh</span>
                                {awards.eliteSummary.length > 0 && (
                                    <Tag color="orange" style={{ marginLeft: 4 }}>{awards.eliteSummary.length} người</Tag>
                                )}
                            </span>
                        }
                        style={{ borderTop: '3px solid #1A2B5A' }}
                    >
                        <Table
                            columns={eliteColumns}
                            dataSource={awards.eliteSummary}
                            rowKey={(r) => r.employeeCode ?? String(r.stt)}
                            pagination={false}
                            size="small"
                            locale={{ emptyText: 'Chưa có nhân sự đạt danh hiệu trong kỳ này' }}
                        />
                    </Card>
                </div>
            )}
        </>
    );
}
