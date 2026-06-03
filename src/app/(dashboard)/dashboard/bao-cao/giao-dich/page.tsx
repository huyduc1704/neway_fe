'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Download } from 'lucide-react';
import { Button, Select, Tag, Table, Card, Typography, Space, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { downloadExport } from '@/lib/export';
import dayjs from 'dayjs';

const { Title } = Typography;

interface TransactionRow {
    id: string;
    transactionCode: string;
    actualValue: number;
    expectedRevenue: number | null;
    status: string;
    transactedAt: string;
    project: { id: string; code: string; ward: string; area: string } | null;
    room: { id: string; roomCode: string } | null;
    customer: { id: string; fullName: string; phone: string } | null;
    branch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    assignments: {
        roleInProject: string;
        employee: { id: string; employeeCode: string; user: { fullName: string } };
    }[];
}

interface Summary {
    total: number;
    successCount: number;
    pendingCount: number;
    cancelledCount: number;
    totalRevenue: number;
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface Project { id: string; code: string; }
interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING:   { label: 'Đang xử lý', color: 'processing' },
    SUCCESS:   { label: 'Thành công', color: 'success' },
    CANCELLED: { label: 'Đã huỷ',    color: 'default' },
    FAILED:    { label: 'Thất bại',   color: 'error' },
};

const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const ROLE_COLOR: Record<string, { color: string; bg: string }> = {
    LEADER: { color: '#7c3aed', bg: '#f5f3ff' },
    SALES: { color: '#2563eb', bg: '#eff6ff' },
};

export default function BaoCaoGiaoDichPage() {
    const [data, setData] = useState<TransactionRow[]>([]);
    const [summary, setSummary] = useState<Summary>({ total: 0, successCount: 0, pendingCount: 0, cancelledCount: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/transactions', {
                params: {
                    fromDate, toDate,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    projectId: projectFilter || undefined,
                    status: statusFilter || undefined,
                    employeeId: employeeFilter || undefined,
                },
            });
            setData(res.data);
            setSummary(res.summary);
        } catch {
            message.error('Không thể tải báo cáo giao dịch');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, branchFilter, teamFilter, projectFilter, statusFilter, employeeFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/projects', { params: { limit: 200 } }).then(({ data }) => setProjects(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 200 } }).then(({ data }) => {
            setEmployees(data.data.map((e: any) => ({
                id: e.employeeProfile?.id,
                employeeCode: e.employeeProfile?.employeeCode,
                fullName: e.fullName,
            })).filter((e: any) => e.id));
        }).catch(() => {});
    }, []);

    const totalValue = data.reduce((s, r) => s + r.actualValue, 0);

    const columns: ColumnsType<TransactionRow> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        {
            title: 'Mã GD', key: 'transactionCode', width: 130,
            render: (_, r) => <Tag color="orange">{r.transactionCode}</Tag>,
        },
        {
            title: 'Dự án / Phòng', key: 'project',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project?.code || '—'}</div>
                    {r.room && <div style={{ fontSize: 12, color: '#9ca3af' }}>Phòng: {r.room.roomCode}</div>}
                </div>
            ),
        },
        {
            title: 'Khách hàng', key: 'customer', width: 180,
            render: (_, r) => r.customer ? (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.customer.fullName}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.customer.phone}</div>
                </div>
            ) : '—',
        },
        {
            title: 'Nhân sự', key: 'assignments', width: 180,
            render: (_, r) => {
                if (!r.assignments?.length) return '—';
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {r.assignments.map((a, i) => {
                            const rc = ROLE_COLOR[a.roleInProject] || { color: '#16a34a', bg: '#f0fdf4' };
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 12, fontWeight: 500, color: rc.color, background: rc.bg }}>
                                        {a.roleInProject}
                                    </span>
                                    <span>{a.employee.user.fullName}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            },
        },
        {
            title: 'Giá trị GD', key: 'actualValue', width: 150, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#1A2B5A' }}>{formatCurrency(r.actualValue)}</span>,
        },
        {
            title: 'Ngày GD', key: 'transactedAt', width: 110, align: 'center',
            render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY'),
        },
        {
            title: 'Trạng thái', key: 'status', width: 130, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
    ];

    const tableSummary = () => (
        data.length > 0 ? (
            <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}><strong>Tổng cộng ({data.length} giao dịch)</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right"><strong style={{ color: '#E8890C' }}>{formatCurrency(totalValue)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2} />
            </Table.Summary.Row>
        ) : null
    );

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Giao dịch</Title>
                <Button icon={<DownloadOutlined />} onClick={async () => {
                    try {
                        await downloadExport('/reports/transactions/export', { fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined, status: statusFilter || undefined }, 'bao-cao-giao-dich');
                    } catch { message.error('Xuất file thất bại'); }
                }}>
                    Xuất Excel
                </Button>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <input type="date" style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    <span style={{ color: '#9ca3af' }}>→</span>
                    <input type="date" style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />

                    <Select
                        value={statusFilter || undefined}
                        onChange={(v) => setStatusFilter(v ?? '')}
                        placeholder="Trạng thái"
                        style={{ width: 160 }}
                        allowClear
                        options={[{ value: '', label: 'Tất cả' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))]}
                    />
                    <Select
                        value={branchFilter || undefined}
                        onChange={(v) => setBranchFilter(v ?? '')}
                        placeholder="Chi nhánh"
                        style={{ width: 160 }}
                        allowClear
                        options={[{ value: '', label: 'Tất cả' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                    />
                    <Select
                        value={teamFilter || undefined}
                        onChange={(v) => setTeamFilter(v ?? '')}
                        placeholder="Team"
                        style={{ width: 144 }}
                        allowClear
                        options={[{ value: '', label: 'Tất cả' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
                    />
                    <Select
                        value={projectFilter || undefined}
                        onChange={(v) => setProjectFilter(v ?? '')}
                        placeholder="Dự án"
                        style={{ width: 144 }}
                        allowClear
                        options={[{ value: '', label: 'Tất cả' }, ...projects.map((p) => ({ value: p.id, label: p.code }))]}
                    />
                    <Select
                        value={employeeFilter || undefined}
                        onChange={(v) => setEmployeeFilter(v ?? '')}
                        placeholder="Nhân viên"
                        style={{ width: 192 }}
                        allowClear
                        options={[{ value: '', label: 'Tất cả' }, ...employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))]}
                    />
                </Space>
            </Card>

            {/* Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                {[
                    { label: 'Tổng giao dịch', value: summary.total, color: '#1A2B5A' },
                    { label: 'Thành công', value: summary.successCount, color: '#52c41a' },
                    { label: 'Đang xử lý', value: summary.pendingCount, color: '#1677ff' },
                    { label: 'Đã huỷ', value: summary.cancelledCount, color: '#9ca3af' },
                ].map((item) => (
                    <Col key={item.label} span={6}>
                        <Card>
                            <Statistic title={item.label} value={item.value} valueStyle={{ color: item.color, fontSize: 24, fontWeight: 700 }} />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Statistic title="Tổng doanh thu (GD thành công)" value={formatCurrency(summary.totalRevenue)} formatter={(v) => String(v)} valueStyle={{ color: '#E8890C', fontSize: 30, fontWeight: 700 }} />
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    summary={tableSummary}
                    size="small"
                />
            </Card>
        </>
    );
}
