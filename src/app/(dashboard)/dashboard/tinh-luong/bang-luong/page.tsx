'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { message } from 'antd';
import {
    Calculator, Download, ChevronRight, Pencil, FileText,
    RefreshCw, Lock, TrendingUp, DollarSign, Receipt, Users
} from 'lucide-react';
import api from '@/lib/api';
import { downloadExport } from '@/lib/export';
import { formatCurrency } from '@/lib/utils';
import {
    Button, Select, Tag, Table, Card, Modal, Form, Typography, Space,
    Statistic, Row, Col, Checkbox, Input, Spin
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalculatorOutlined, DownloadOutlined, EditOutlined, FileTextOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

type Tab = 'lines' | 'transactions';

interface Period { id: string; code: string; periodStart: string; periodEnd: string; isLocked: boolean; }
interface PayrollLine {
    id: string;
    grossRevenue: string; netRevenue: string;
    fixedSalarySnapshot: string; taskSalaryAmount: string;
    commissionPercent: string; commissionAmount: string;
    bonus: string; advancePayment: string;
    isTaxExempt: boolean;
    preTaxIncome: string; taxAmount: string;
    socialInsuranceAmount: string; finalNetIncome: string;
    note: string | null;
    employee: { id: string; employeeCode: string; user: { fullName: string }; branch: { code: string; name: string } | null; team: { code: string; name: string } | null; };
    role: { code: string; name: string } | null;
}
interface Summary {
    grossRevenue: number; netRevenue: number; commissionAmount: number;
    bonus: number; advancePayment: number; taxAmount: number;
    socialInsuranceAmount: number; finalNetIncome: number;
}
interface TxSlot { employeeCode: string | null; rate: number; revenue: number; }
interface TxRow {
    transactionCode: string; transactedAt: string; actualValue: number;
    grossRevenue: number; netRevenue: number;
    project: { code: string; ward: string };
    slots: Record<string, TxSlot>;
}

const SLOT_LABELS: Record<string, string> = { m: 'M', m1: 'M1', m2: 'M2', s1: 'S1', s2: 'S2', mLeader: 'M Lớn', m1Leader: 'M1 Lớn', m2Leader: 'M2 Lớn', s1Leader: 'S1 Lớn', s2Leader: 'S2 Lớn' };

function BangLuongContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [periodId, setPeriodId] = useState(searchParams.get('periodId') ?? '');
    const [periods, setPeriods] = useState<Period[]>([]);
    const [period, setPeriod] = useState<Period | null>(null);
    const [lines, setLines] = useState<PayrollLine[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [txData, setTxData] = useState<TxRow[]>([]);
    const [txSummary, setTxSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<Tab>('lines');

    // Calculate dialog
    const [calcOpen, setCalcOpen] = useState(false);
    const [calcForm, setCalcForm] = useState({ overwrite: false, branchId: '', teamId: '' });
    const [calculating, setCalculating] = useState(false);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

    // Edit line dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editLine, setEditLine] = useState<PayrollLine | null>(null);
    const [editForm, setEditForm] = useState({ bonus: '', advancePayment: '', isTaxExempt: false, note: '' });
    const [editSaving, setEditSaving] = useState(false);

    // Manager breakdown dialog
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [breakdownLineId, setBreakdownLineId] = useState('');
    const [breakdown, setBreakdown] = useState<any>(null);
    const [breakdownLoading, setBreakdownLoading] = useState(false);
    const [taskForm, setTaskForm] = useState<any[]>([]);
    const [breakdownSaving, setBreakdownSaving] = useState(false);

    useEffect(() => {
        api.get('/payroll/periods', { params: { limit: 100, isLocked: undefined } })
            .then(({ data }) => setPeriods(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!periodId) return;
        const found = periods.find(p => p.id === periodId) ?? null;
        setPeriod(found);
    }, [periodId, periods]);

    const fetchLines = useCallback(async () => {
        if (!periodId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/payroll/periods/${periodId}/lines`);
            setLines(data.data ?? []);
            setSummary(data.summary ?? null);
            if (!period) setPeriod(data.period);
        } catch { message.error('Không thể tải bảng lương'); }
        finally { setLoading(false); }
    }, [periodId]);

    const fetchTransactions = useCallback(async () => {
        if (!periodId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/payroll/periods/${periodId}/transactions`, { params: { periodOnly: true } });
            setTxData(data.data ?? []);
            setTxSummary(data.summary ?? null);
        } catch { message.error('Không thể tải giao dịch'); }
        finally { setLoading(false); }
    }, [periodId]);

    useEffect(() => {
        if (!periodId) return;
        if (tab === 'lines') fetchLines();
        else fetchTransactions();
    }, [periodId, tab, fetchLines, fetchTransactions]);

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const { data } = await api.post(`/payroll/periods/${periodId}/calculate`, {
                overwrite: calcForm.overwrite,
                branchId: calcForm.branchId || undefined,
                teamId: calcForm.teamId || undefined,
            });
            message.success(data.message ?? 'Tính lương thành công');
            setCalcOpen(false);
            fetchLines();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Tính lương thất bại'); }
        finally { setCalculating(false); }
    };

    const openEditLine = (l: PayrollLine) => {
        setEditLine(l);
        setEditForm({ bonus: String(Number(l.bonus)), advancePayment: String(Number(l.advancePayment)), isTaxExempt: l.isTaxExempt, note: l.note ?? '' });
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editLine) return;
        setEditSaving(true);
        try {
            await api.patch(`/payroll/lines/${editLine.id}`, {
                bonus: Number(editForm.bonus) || 0,
                advancePayment: Number(editForm.advancePayment) || 0,
                isTaxExempt: editForm.isTaxExempt,
                note: editForm.note || undefined,
            });
            message.success('Cập nhật bảng lương thành công');
            setEditOpen(false);
            fetchLines();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
        finally { setEditSaving(false); }
    };

    const openBreakdown = async (lineId: string) => {
        setBreakdownLineId(lineId);
        setBreakdownLoading(true);
        setBreakdownOpen(true);
        try {
            const { data } = await api.get(`/payroll/lines/${lineId}/manager-breakdown`);
            setBreakdown(data);
            setTaskForm(data.taskSalaryLines || []);
        } catch { message.error('Không thể tải chi tiết lương'); }
        finally { setBreakdownLoading(false); }
    };

    const handleBreakdownSave = async () => {
        if (!breakdownLineId) return;
        setBreakdownSaving(true);
        try {
            await api.patch(`/payroll/lines/${breakdownLineId}`, {
                taskSalaries: taskForm.map(t => ({ id: t.id, status: t.status, quantity: Number(t.quantity) || 0 }))
            });
            message.success('Cập nhật lương nhiệm vụ thành công');
            setBreakdownOpen(false);
            fetchLines();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
        finally { setBreakdownSaving(false); }
    };

    const handleExport = async (format: 'excel' | 'pdf', groupBy: string) => {
        try {
            await downloadExport(`/payroll/periods/${periodId}/export`, { groupBy, format }, `bang-luong-${groupBy.toLowerCase()}`);
        } catch { message.error('Xuất file thất bại'); }
    };

    const lineColumns: ColumnsType<PayrollLine> = [
        { title: 'STT', key: 'stt', width: 55, align: 'center', render: (_, __, i) => i + 1 },
        {
            title: 'Nhân viên', key: 'employee', width: 200,
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.employee.user.fullName}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.employee.employeeCode} · {r.role?.name ?? '—'}</div>
                </div>
            ),
        },
        {
            title: 'Chi nhánh / Team', key: 'dept', width: 170,
            render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    {r.employee.branch && <div style={{ color: '#6b7280' }}>{r.employee.branch.name}</div>}
                    {r.employee.team && <div style={{ color: '#9ca3af' }}>{r.employee.team.name}</div>}
                </div>
            ),
        },
        { title: 'Gross', key: 'grossRevenue', width: 140, align: 'right', render: (_, r) => <span style={{ color: '#6b7280' }}>{formatCurrency(Number(r.grossRevenue))}</span> },
        { title: 'Net', key: 'netRevenue', width: 140, align: 'right', render: (_, r) => <span style={{ color: '#6b7280' }}>{formatCurrency(Number(r.netRevenue))}</span> },
        {
            title: 'Hoa hồng', key: 'commission', width: 155, align: 'right',
            render: (_, r) => (
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500, color: '#E8890C' }}>{formatCurrency(Number(r.commissionAmount))}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{Number(r.commissionPercent).toFixed(2)}%</div>
                </div>
            ),
        },
        {
            title: 'Thưởng', key: 'bonus', width: 120, align: 'right',
            render: (_, r) => Number(r.bonus) > 0
                ? <span style={{ color: '#16a34a', fontWeight: 500 }}>{formatCurrency(Number(r.bonus))}</span>
                : <span style={{ color: '#d1d5db' }}>—</span>,
        },
        {
            title: 'Ứng lương', key: 'advancePayment', width: 120, align: 'right',
            render: (_, r) => Number(r.advancePayment) > 0
                ? <span style={{ color: '#f97316', fontWeight: 500 }}>{formatCurrency(Number(r.advancePayment))}</span>
                : <span style={{ color: '#d1d5db' }}>—</span>,
        },
        { title: 'Trước thuế', key: 'preTaxIncome', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(Number(r.preTaxIncome))}</span> },
        {
            title: 'Thuế', key: 'tax', width: 120, align: 'right',
            render: (_, r) => r.isTaxExempt
                ? <Tag color="green">Miễn thuế</Tag>
                : <span style={{ color: '#ef4444' }}>{formatCurrency(Number(r.taxAmount))}</span>,
        },
        {
            title: 'BHXH', key: 'socialInsuranceAmount', width: 120, align: 'right',
            render: (_, r) => Number(r.socialInsuranceAmount) > 0
                ? formatCurrency(Number(r.socialInsuranceAmount))
                : <span style={{ color: '#d1d5db' }}>—</span>,
        },
        {
            title: 'Thực nhận', key: 'finalNetIncome', width: 155, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C', fontSize: 15 }}>{formatCurrency(Number(r.finalNetIncome))}</span>,
        },
        {
            title: '', key: 'actions', width: 100, align: 'center',
            render: (_, r) => (
                <Space size={4}>
                    {!period?.isLocked && (
                        <Button type="text" size="small" icon={<EditOutlined />} title="Điều chỉnh"
                            onClick={() => openEditLine(r)} style={{ color: '#6b7280' }} />
                    )}
                    <Button type="text" size="small" icon={<FileTextOutlined />} title="Chi tiết lương"
                        onClick={() => openBreakdown(r.id)} style={{ color: '#6b7280' }} />
                </Space>
            ),
        },
    ];

    const txColumns: ColumnsType<TxRow> = [
        { title: 'STT', key: 'stt', width: 55, align: 'center', render: (_, __, i) => i + 1 },
        {
            title: 'Mã GD', key: 'transactionCode', width: 140,
            render: (_, r) => <Tag color="orange">{r.transactionCode}</Tag>,
        },
        {
            title: 'Dự án', key: 'project', width: 160,
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project.code}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.project.ward}</div>
                </div>
            ),
        },
        { title: 'Giá trị GD', key: 'actualValue', width: 150, align: 'right', render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(r.actualValue)}</span> },
        ...['m', 'm1', 'm2', 's1', 's2'].flatMap(key => [
            {
                title: `Mã ${SLOT_LABELS[key]}`, key: `${key}_emp`, width: 90, align: 'center' as const,
                render: (_: any, r: TxRow) => r.slots[key]?.employeeCode
                    ? <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B5A' }}>{r.slots[key].employeeCode}</span>
                    : <span style={{ color: '#e5e7eb' }}>—</span>,
            },
            {
                title: `Tỉ lệ ${SLOT_LABELS[key]}`, key: `${key}_rate`, width: 80, align: 'center' as const,
                render: (_: any, r: TxRow) => r.slots[key]?.rate > 0
                    ? <span style={{ fontSize: 12, color: '#6b7280' }}>{(r.slots[key].rate * 100).toFixed(0)}%</span>
                    : <span style={{ color: '#e5e7eb' }}>—</span>,
            },
            {
                title: `DT ${SLOT_LABELS[key]}`, key: `${key}_rev`, width: 120, align: 'right' as const,
                render: (_: any, r: TxRow) => r.slots[key]?.revenue > 0
                    ? <span style={{ fontSize: 12, color: '#E8890C' }}>{formatCurrency(r.slots[key].revenue)}</span>
                    : <span style={{ color: '#e5e7eb' }}>—</span>,
            },
        ]),
        { title: 'Gross', key: 'grossRevenue', width: 140, align: 'right', render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(r.grossRevenue)}</span> },
        { title: 'Net (÷1.1)', key: 'netRevenue', width: 140, align: 'right', render: (_, r) => <span style={{ fontWeight: 700, color: '#1A2B5A' }}>{formatCurrency(r.netRevenue)}</span> },
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Tính lương / Bảng lương</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Tính toán và quản lý bảng lương theo kỳ</p>
                </div>
                <Space>
                    {periodId && !period?.isLocked && (
                        <Button icon={<CalculatorOutlined />} onClick={() => setCalcOpen(true)}>
                            Tính lương
                        </Button>
                    )}
                    {periodId && lines.length > 0 && (
                        <Space size={4}>
                            {['EMPLOYEE', 'TEAM', 'BRANCH'].map(g => (
                                <Button key={g} size="small" icon={<DownloadOutlined />} onClick={() => handleExport('excel', g)}>
                                    {g === 'EMPLOYEE' ? 'NV' : g === 'TEAM' ? 'Team' : 'CN'}
                                </Button>
                            ))}
                        </Space>
                    )}
                </Space>
            </div>

            {/* Period selector */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>Chọn kỳ lương:</span>
                        <Select
                            value={periodId || undefined}
                            onChange={v => { setPeriodId(v); router.replace(`/dashboard/tinh-luong/bang-luong?periodId=${v}` as any); }}
                            placeholder="-- Chọn kỳ lương --"
                            style={{ width: 320 }}
                            options={periods.map(p => ({
                                value: p.id,
                                label: `${p.code} (${new Date(p.periodStart).toLocaleDateString('vi-VN')} → ${new Date(p.periodEnd).toLocaleDateString('vi-VN')})`,
                            }))}
                        />
                    </div>
                    {period && (
                        <Tag color={period.isLocked ? 'navy' : 'warning'} style={{ marginLeft: 'auto' }}>
                            {period.isLocked ? <><LockOutlined style={{ marginRight: 4 }} />Đã khoá</> : '🔓 Đang mở'}
                        </Tag>
                    )}
                </div>
            </Card>

            {!periodId && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#d1d5db' }}>
                    <CalculatorOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ fontSize: 16 }}>Chọn kỳ lương để xem bảng lương</p>
                    <Button style={{ marginTop: 16 }} icon={<ChevronRight size={16} />} onClick={() => router.push('/dashboard/tinh-luong/ky-luong' as any)}>
                        Quản lý kỳ lương
                    </Button>
                </div>
            )}

            {periodId && (
                <>
                    {/* Summary */}
                    {summary && (
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                            <Col xs={12} lg={6}>
                                <Card size="small">
                                    <Statistic title="Tổng Gross" value={formatCurrency(summary.grossRevenue)} formatter={v => String(v)} valueStyle={{ fontSize: 16, color: '#E8890C' }} />
                                </Card>
                            </Col>
                            <Col xs={12} lg={6}>
                                <Card size="small">
                                    <Statistic title="Tổng Hoa hồng" value={formatCurrency(summary.commissionAmount)} formatter={v => String(v)} valueStyle={{ fontSize: 16, color: '#1A2B5A' }} />
                                </Card>
                            </Col>
                            <Col xs={12} lg={6}>
                                <Card size="small">
                                    <Statistic title="Tổng Thuế TNCN" value={formatCurrency(summary.taxAmount)} formatter={v => String(v)} valueStyle={{ fontSize: 16, color: '#ef4444' }} />
                                </Card>
                            </Col>
                            <Col xs={12} lg={6}>
                                <Card size="small">
                                    <Statistic title="Tổng Thực nhận" value={formatCurrency(summary.finalNetIncome)} formatter={v => String(v)} valueStyle={{ fontSize: 16, color: '#16a34a' }} />
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: 4, width: 'fit-content' }}>
                        {[
                            { key: 'lines', label: 'Bảng lương', icon: <Receipt size={16} /> },
                            { key: 'transactions', label: 'GD đã thu', icon: <FileText size={16} /> },
                        ].map(t => (
                            <button key={t.key} onClick={() => setTab(t.key as Tab)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6,
                                    fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                                    background: tab === t.key ? '#E8890C' : 'transparent',
                                    color: tab === t.key ? 'white' : '#6b7280',
                                    transition: 'all 0.2s',
                                }}>
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>

                    <Card>
                        {tab === 'lines' && (
                            <Table
                                columns={lineColumns}
                                dataSource={lines}
                                rowKey="id"
                                loading={loading}
                                pagination={{ pageSize: 20 }}
                                size="small"
                                scroll={{ x: true }}
                                locale={{ emptyText: period?.isLocked ? 'Kỳ lương chưa có bảng lương' : 'Chưa tính lương — nhấn "Tính lương" để bắt đầu' }}
                            />
                        )}
                        {tab === 'transactions' && (
                            <>
                                {txSummary && (
                                    <div style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14, color: '#6b7280' }}>
                                        <span>{txSummary.transactionCount} giao dịch</span>
                                        <span>Gross: <strong style={{ color: '#E8890C' }}>{formatCurrency(txSummary.totalGross)}</strong></span>
                                        <span>Net: <strong style={{ color: '#1A2B5A' }}>{formatCurrency(txSummary.totalNet)}</strong></span>
                                    </div>
                                )}
                                <Table
                                    columns={txColumns}
                                    dataSource={txData}
                                    rowKey="transactionCode"
                                    loading={loading}
                                    pagination={{ pageSize: 20 }}
                                    size="small"
                                    scroll={{ x: true }}
                                    locale={{ emptyText: 'Không có giao dịch đã thu trong kỳ này' }}
                                />
                            </>
                        )}
                    </Card>
                </>
            )}

            {/* Calculate Modal */}
            <Modal
                open={calcOpen}
                onCancel={() => setCalcOpen(false)}
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalculatorOutlined style={{ color: '#E8890C' }} /> Tính lương tự động</span>}
                footer={[
                    <Button key="cancel" onClick={() => setCalcOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleCalculate} loading={calculating} icon={<CalculatorOutlined />}>
                        Bắt đầu tính
                    </Button>,
                ]}
                width={480}
            >
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, fontSize: 14, color: '#1d4ed8' }}>
                        Hệ thống sẽ tự động tính: Gross → Net → Hoa hồng → Lương CB → Lương NV → Thuế → BHXH → Thực nhận cho từng nhân viên.
                    </div>
                    <div>
                        <label style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>Giới hạn theo chi nhánh (tuỳ chọn)</label>
                        <Select
                            value={calcForm.branchId || undefined}
                            onChange={v => setCalcForm(f => ({ ...f, branchId: v === '__all__' ? '' : (v ?? '') }))}
                            placeholder="Tất cả chi nhánh"
                            style={{ width: '100%' }}
                            allowClear
                            options={[{ value: '__all__', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>Giới hạn theo team (tuỳ chọn)</label>
                        <Select
                            value={calcForm.teamId || undefined}
                            onChange={v => setCalcForm(f => ({ ...f, teamId: v === '__all__' ? '' : (v ?? '') }))}
                            placeholder="Tất cả team"
                            style={{ width: '100%' }}
                            allowClear
                            options={[{ value: '__all__', label: 'Tất cả team' }, ...teams.map(t => ({ value: t.id, label: t.name }))]}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <Checkbox
                            checked={calcForm.overwrite}
                            onChange={e => setCalcForm(f => ({ ...f, overwrite: e.target.checked }))}
                        />
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Ghi đè bảng lương đã có</div>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>Bonus / Ứng lương đã nhập sẽ được giữ nguyên</div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Edit Line Modal */}
            <Modal
                open={editOpen}
                onCancel={() => setEditOpen(false)}
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><EditOutlined style={{ color: '#E8890C' }} /> Điều chỉnh bảng lương</span>}
                footer={[
                    <Button key="cancel" onClick={() => setEditOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleEditSave} loading={editSaving}>Lưu điều chỉnh</Button>,
                ]}
                width={480}
            >
                {editLine && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontWeight: 600, color: '#1A2B5A' }}>{editLine.employee.user.fullName}</div>
                            <div style={{ fontSize: 14, color: '#6b7280' }}>{editLine.employee.employeeCode} · {editLine.role?.name ?? '—'}</div>
                        </div>
                        <Row gutter={16}>
                            <Col span={12}>
                                <div>
                                    <label style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>Thưởng / Bonus (VNĐ)</label>
                                    <Input type="number" min={0} value={editForm.bonus}
                                        onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))} />
                                    {Number(editForm.bonus) > 0 && <p style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>{formatCurrency(Number(editForm.bonus))}</p>}
                                </div>
                            </Col>
                            <Col span={12}>
                                <div>
                                    <label style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>Ứng Lương / Trừ tiền (VNĐ)</label>
                                    <Input type="number" min={0} value={editForm.advancePayment}
                                        onChange={e => setEditForm(f => ({ ...f, advancePayment: e.target.value }))} />
                                    {Number(editForm.advancePayment) > 0 && <p style={{ fontSize: 12, color: '#f97316', marginTop: 4 }}>{formatCurrency(Number(editForm.advancePayment))}</p>}
                                </div>
                            </Col>
                        </Row>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <Checkbox
                                checked={editForm.isTaxExempt}
                                onChange={e => setEditForm(f => ({ ...f, isTaxExempt: e.target.checked }))}
                            />
                            <label style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Miễn thuế TNCN (có hợp đồng / cam kết)</label>
                        </div>
                        <div>
                            <label style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>Ghi chú</label>
                            <Input placeholder="Ghi chú điều chỉnh..." value={editForm.note}
                                onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
                        </div>
                        <div style={{ padding: 12, background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', fontSize: 14 }}>
                            <div style={{ color: '#6b7280' }}>Hoa hồng: <strong style={{ color: '#E8890C' }}>{formatCurrency(Number(editLine.commissionAmount))}</strong></div>
                            <div style={{ color: '#6b7280' }}>Lương CB: <strong>{formatCurrency(Number(editLine.fixedSalarySnapshot))}</strong></div>
                            <div style={{ color: '#6b7280', fontWeight: 500 }}>→ Tính lại ngay sau khi lưu</div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Manager Breakdown Modal */}
            <Modal
                open={breakdownOpen}
                onCancel={() => setBreakdownOpen(false)}
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileTextOutlined style={{ color: '#E8890C' }} /> Tab Lương Quản Lý</span>}
                footer={[
                    <Button key="close" onClick={() => setBreakdownOpen(false)}>Đóng</Button>,
                    !period?.isLocked && <Button key="save" type="primary" loading={breakdownSaving} onClick={handleBreakdownSave}>Lưu nhiệm vụ</Button>
                ]}
                width={520}
            >
                {breakdownLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}><Spin /></div>}
                {breakdown && !breakdownLoading && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontWeight: 600, color: '#1A2B5A' }}>{breakdown.employee?.user?.fullName}</div>
                            <div style={{ fontSize: 14, color: '#6b7280' }}>{breakdown.employee?.employeeCode} · {breakdown.role?.name}</div>
                            {breakdown.role?.commissionPercent && <div style={{ fontSize: 12, color: '#E8890C', marginTop: 2 }}>% HH: {Number(breakdown.role.commissionPercent).toFixed(2)}%</div>}
                        </div>
                        <div style={{ fontSize: 14 }}>
                            {[
                                { label: 'Lương CB', value: breakdown.fixedSalary, color: '#1A2B5A' },
                                { label: 'Lương Nhiệm Vụ', value: breakdown.taskSalaryTotal, color: '#1A2B5A' },
                                { label: 'Hoa hồng (Net × %)', value: breakdown.commissionAmount, color: '#E8890C' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                    <span style={{ color: '#6b7280' }}>{item.label}</span>
                                    <strong style={{ color: item.color }}>{formatCurrency(item.value)}</strong>
                                </div>
                            ))}
                            {taskForm?.length > 0 && (
                                <div style={{ paddingLeft: 12, marginTop: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {taskForm.map((ts: any, i: number) => (
                                        <div key={ts.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: '#f9fafb', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ flex: 1, paddingRight: 8 }}>
                                                <div style={{ fontWeight: 500, color: '#4b5563', marginBottom: 4 }}>{ts.content}</div>
                                                <div style={{ color: '#9ca3af', fontSize: 12 }}>
                                                    Mốc: {formatCurrency(ts.milestone)} × {(ts.rate * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <Select 
                                                    size="small" 
                                                    value={ts.status} 
                                                    disabled={period?.isLocked}
                                                    onChange={(v) => {
                                                        const newTasks = [...taskForm];
                                                        newTasks[i].status = v;
                                                        setTaskForm(newTasks);
                                                    }}
                                                    options={[
                                                        { value: 'ACHIEVED', label: 'Đạt' },
                                                        { value: 'NOT_ACHIEVED', label: 'Chưa Đạt' }
                                                    ]}
                                                    style={{ width: 100 }}
                                                />
                                                <Input 
                                                    size="small" 
                                                    type="number" 
                                                    min={0}
                                                    disabled={period?.isLocked}
                                                    value={ts.quantity} 
                                                    onChange={(e) => {
                                                        const newTasks = [...taskForm];
                                                        newTasks[i].quantity = e.target.value;
                                                        setTaskForm(newTasks);
                                                    }}
                                                    style={{ width: 60 }} 
                                                    placeholder="SL"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ fontSize: 12, color: '#f97316', textAlign: 'right' }}>* Hệ thống sẽ tự động tính lại tổng lương khi bấm Lưu.</div>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontWeight: 500 }}>
                                <span>+ Thưởng</span>
                                <span style={{ color: '#16a34a' }}>+{formatCurrency(breakdown.bonus)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontWeight: 500 }}>
                                <span>− Ứng lương</span>
                                <span style={{ color: '#f97316' }}>-{formatCurrency(breakdown.advancePayment)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontWeight: 700 }}>
                                <span style={{ color: '#1A2B5A' }}>Tổng Trước Thuế</span>
                                <span style={{ color: '#1A2B5A', fontSize: 15 }}>{formatCurrency(breakdown.preTaxIncome)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', color: '#ef4444' }}>
                                <span>− Thuế TNCN {breakdown.isTaxExempt && <Tag color="green" style={{ marginLeft: 4, fontSize: 11 }}>Miễn</Tag>}</span>
                                <span>-{formatCurrency(breakdown.taxAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', color: '#6b7280' }}>
                                <span>− BHXH ({breakdown.role?.socialInsurancePercent ?? 0}%)</span>
                                <span>-{formatCurrency(breakdown.socialInsurance)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
                                <span style={{ fontWeight: 700, color: '#E8890C', fontSize: 15 }}>Thu nhập sau thuế</span>
                                <span style={{ fontWeight: 700, color: '#E8890C', fontSize: 20 }}>{formatCurrency(breakdown.finalNetIncome)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}

export default function BangLuongPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spin size="large" /></div>}>
            <BangLuongContent />
        </Suspense>
    );
}
