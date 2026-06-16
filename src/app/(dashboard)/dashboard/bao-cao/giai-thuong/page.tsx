'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Trophy, TrendingUp, Users, Star } from 'lucide-react';
import { Card, DatePicker, Tag, Select, Table, Typography, Space, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

const { Title } = Typography;

interface AwardsData {
    top3ByRevenue: { rank: number; employeeCode: string; fullName: string; eligibleRevenue: number }[];
    top1ByCount: { rank: number; employeeCode: string; fullName: string; eligibleCount: number } | null;
    eliteSummary: { stt: number; employeeCode: string; fullName: string; title: 'TINH_ANH' | 'TINH_HOA' }[];
    top1Team: { rank: number; teamCode: string; leaderCode: string; leaderName: string; eligibleRevenue: number } | null;
    employeeScores: { stt: number; employeeCode: string; teamCode: string; score: number }[];
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

const RANK_STYLE = ['#facc15', '#d1d5db', '#d97706'];
const RANK_LABEL = ['🥇', '🥈', '🥉'];

export default function GiaiThuongPage() {
    const [awards, setAwards] = useState<AwardsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

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
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const eliteColumns: ColumnsType<AwardsData['eliteSummary'][0]> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', dataIndex: 'stt' },
        { title: 'Mã NV', key: 'employeeCode', width: 120, render: (_, r) => <Tag>{r.employeeCode}</Tag> },
        { title: 'Họ tên', key: 'fullName', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.fullName}</span> },
        {
            title: 'Danh hiệu', key: 'title', width: 130, align: 'center',
            render: (_, r) => (
                <Tag color={r.title === 'TINH_ANH' ? 'blue' : 'default'}>
                    {r.title === 'TINH_ANH' ? '⭐ Tinh Anh' : '✨ Tinh Hoa'}
                </Tag>
            ),
        },
    ];

    const scoreColumns: ColumnsType<AwardsData['employeeScores'][0]> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', dataIndex: 'stt' },
        { title: 'Mã NV', key: 'employeeCode', width: 130, render: (_, r) => <Tag>{r.employeeCode}</Tag> },
        { title: 'Team', key: 'teamCode', width: 120, render: (_, r) => r.teamCode ?? <span style={{ color: '#9ca3af' }}>—</span> },
        {
            title: 'Điểm', key: 'score', width: 100, align: 'center',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C', fontSize: 18 }}>{r.score}</span>,
        },
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Giải thưởng</Title>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Top cá nhân xuất sắc, Tinh Hoa / Tinh Anh, điểm nhân sự</p>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 20 }}>
                <Space wrap>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Từ</span>
                    <DatePicker value={fromDate ? dayjs(fromDate) : null} onChange={(d) => setFromDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>đến</span>
                    <DatePicker value={toDate ? dayjs(toDate) : null} onChange={(d) => setToDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
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

            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #E8890C', borderTop: '2px solid transparent', animation: 'spin 1s linear infinite' }} /></div>}

            {awards && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Top 3 cá nhân doanh thu */}
                    <Row gutter={16}>
                        {awards.top3ByRevenue.map((p, i) => (
                            <Col key={p.employeeCode} xs={24} lg={8}>
                                <Card style={{ border: i === 0 ? '2px solid #facc15' : undefined }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <span style={{ fontSize: 28 }}>{RANK_LABEL[i]}</span>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: RANK_STYLE[i], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                                            {p.rank}
                                        </div>
                                    </div>
                                    <p style={{ fontWeight: 700, color: '#1A2B5A', fontSize: 16, lineHeight: 1.3, margin: 0 }}>{p.fullName}</p>
                                    <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 8px' }}>{p.employeeCode}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <TrendingUp size={16} color="#E8890C" />
                                        <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(p.eligibleRevenue)}</span>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    <Row gutter={16}>
                        {/* Top 1 team */}
                        {awards.top1Team && (
                            <Col xs={24} lg={12}>
                                <Card style={{ border: '2px solid #1A2B5A' }}>
                                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Trophy size={20} color="#E8890C" />
                                        <span style={{ fontWeight: 600, fontSize: 15 }}>Top 1 Team xuất sắc</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1A2B5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                                            🏆
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A2B5A', margin: 0 }}>{awards.top1Team.teamCode}</p>
                                            <p style={{ fontSize: 14, color: '#6b7280', margin: '2px 0' }}>Leader: {awards.top1Team.leaderName} ({awards.top1Team.leaderCode})</p>
                                            <p style={{ fontWeight: 700, color: '#E8890C', margin: 0 }}>{formatCurrency(awards.top1Team.eligibleRevenue)}</p>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        )}

                        {/* Top 1 số GD */}
                        {awards.top1ByCount && (
                            <Col xs={24} lg={12}>
                                <Card>
                                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Star size={20} color="#E8890C" />
                                        <span style={{ fontWeight: 600, fontSize: 15 }}>Top 1 Số giao dịch</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E8890C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>⚡</div>
                                        <div>
                                            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A2B5A', margin: 0 }}>{awards.top1ByCount.fullName}</p>
                                            <p style={{ fontSize: 14, color: '#6b7280', margin: '2px 0' }}>{awards.top1ByCount.employeeCode}</p>
                                            <p style={{ fontWeight: 700, color: '#E8890C', margin: 0 }}>{awards.top1ByCount.eligibleCount} giao dịch</p>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        )}
                    </Row>

                    {/* Tinh Hoa / Tinh Anh */}
                    <Card
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={20} color="#E8890C" />
                                Tổng hợp Tinh Hoa / Tinh Anh
                                {awards.eliteSummary.length > 0 && (
                                    <Tag style={{ marginLeft: 8 }}>{awards.eliteSummary.length} người</Tag>
                                )}
                            </span>
                        }
                    >
                        <Table
                            columns={eliteColumns}
                            dataSource={awards.eliteSummary}
                            rowKey="employeeCode"
                            pagination={false}
                            locale={{ emptyText: 'Chưa có nhân sự đạt danh hiệu trong kỳ này' }}
                            size="small"
                        />
                    </Card>

                    {/* Điểm nhân sự */}
                    <Card
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Star size={20} color="#E8890C" />
                                Điểm nhân sự
                            </span>
                        }
                    >
                        <Table
                            columns={scoreColumns}
                            dataSource={awards.employeeScores}
                            rowKey="employeeCode"
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: 'Chưa có dữ liệu điểm nhân sự' }}
                            size="small"
                        />
                    </Card>
                </div>
            )}
        </>
    );
}
