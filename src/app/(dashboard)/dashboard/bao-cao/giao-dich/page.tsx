'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Select, Space, message, Row, Col, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

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

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

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
    const [branchFilter, setBranchFilter] = useState<string | undefined>();
    const [teamFilter, setTeamFilter] = useState<string | undefined>();
    const [projectFilter, setProjectFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/transactions', {
                params: {
                    fromDate, toDate,
                    branchId: branchFilter,
                    teamId: teamFilter,
                    projectId: projectFilter,
                    status: statusFilter,
                    employeeId: employeeFilter,
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

    const columns: TableColumnsType<TransactionRow> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã GD', dataIndex: 'transactionCode', width: 130,
            render: (v) => <Tag color="orange">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Dự án / Phòng',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project?.code || '—'}</div>
                    {r.room && <div style={{ fontSize: 12, color: '#888' }}>Phòng: {r.room.roomCode}</div>}
                </div>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: 'Khách hàng', width: 180,
            render: (_, r) => r.customer ? (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.customer.fullName}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.customer.phone}</div>
                </div>
            ) : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Nhân sự', width: 180,
            render: (_, r) => {
                if (!r.assignments?.length) return '—';
                return (
                    <div>
                        {r.assignments.map((a, i) => (
                            <div key={i} style={{ fontSize: 12 }}>
                                <Tag color={a.roleInProject === 'LEADER' ? 'purple' : a.roleInProject === 'SALES' ? 'blue' : 'green'} style={{ fontSize: 10 }}>
                                    {a.roleInProject}
                                </Tag>
                                {a.employee.user.fullName}
                            </div>
                        ))}
                    </div>
                );
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Giá trị GD', width: 150, align: 'right',
            sorter: (a, b) => a.actualValue - b.actualValue,
            render: (_, r) => (
                <span style={{ fontWeight: 600, color: '#1A2B5A' }}>{formatCurrency(r.actualValue)}</span>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: 'Ngày GD', width: 110, align: 'center',
            sorter: (a, b) => dayjs(a.transactedAt).unix() - dayjs(b.transactedAt).unix(),
            render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY'),
            onHeaderCell: () => TH,
        },
        {
            title: 'Trạng thái', width: 130, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
            onHeaderCell: () => TH,
        },
    ];

    return (
        <>
            <PageHeader title="Báo cáo / Giao dịch" />

            {/* Filters */}
            <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                <Space wrap>
                    <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        defaultValue={[dayjs().startOf('year'), dayjs().endOf('year')]}
                        onChange={(_, strings) => {
                            if (strings[0] && strings[1]) {
                                setFromDate(dayjs(strings[0], 'DD/MM/YYYY').format('YYYY-MM-DD'));
                                setToDate(dayjs(strings[1], 'DD/MM/YYYY').format('YYYY-MM-DD'));
                            }
                        }}
                    />
                    <Select
                        allowClear placeholder="Trạng thái" style={{ width: 150 }}
                        onChange={(v) => setStatusFilter(v)}
                        options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
                    />
                    <Select
                        allowClear placeholder="Chi nhánh" style={{ width: 160 }}
                        onChange={(v) => setBranchFilter(v)}
                        options={branches.map((b) => ({ value: b.id, label: b.name }))}
                    />
                    <Select
                        allowClear placeholder="Team" style={{ width: 150 }}
                        onChange={(v) => setTeamFilter(v)}
                        options={teams.map((t) => ({ value: t.id, label: t.name }))}
                    />
                    <Select
                        allowClear showSearch placeholder="Dự án" style={{ width: 150 }}
                        onChange={(v) => setProjectFilter(v)}
                        filterOption={(input, opt) =>
                            (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        options={projects.map((p) => ({ value: p.id, label: p.code }))}
                    />
                    <Select
                        allowClear showSearch placeholder="Nhân viên" style={{ width: 200 }}
                        onChange={(v) => setEmployeeFilter(v)}
                        filterOption={(input, opt) =>
                            (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        options={employees.map((e) => ({
                            value: e.id,
                            label: `${e.fullName} (${e.employeeCode})`,
                        }))}
                    />
                </Space>
            </Card>

            {/* Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                {[
                    { label: 'Tổng giao dịch',    value: summary.total,          color: '#1A2B5A' },
                    { label: 'Thành công',         value: summary.successCount,   color: '#52c41a' },
                    { label: 'Đang xử lý',         value: summary.pendingCount,   color: '#1677ff' },
                    { label: 'Đã huỷ',             value: summary.cancelledCount, color: '#999' },
                ].map((item) => (
                    <Col span={6} key={item.label}>
                        <Card style={{ borderRadius: 8 }}>
                            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng doanh thu (GD thành công)</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#E8890C' }}>
                    {formatCurrency(summary.totalRevenue)}
                </div>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    summary={() => data.length > 0 ? (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={5}>
                                <strong>Tổng cộng ({data.length} giao dịch)</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right">
                                <strong style={{ color: '#E8890C' }}>
                                    {formatCurrency(data.reduce((s, r) => s + r.actualValue, 0))}
                                </strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} colSpan={2} />
                        </Table.Summary.Row>
                    ) : null}
                />
            </Card>
        </>
    );
}
