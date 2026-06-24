'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Tag, Typography, Checkbox, Spin, Tooltip, message, Modal, Form, Select, Input } from 'antd';
import { SafetyCertificateOutlined, ThunderboltOutlined, PlusOutlined, KeyOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';

const { Title, Text } = Typography;

const ACTION_LABELS: Record<string, string> = {
    VIEW:     'Xem',
    VIEW_ALL: 'Xem tất cả',
    CREATE:   'Tạo mới',
    EDIT:     'Chỉnh sửa',
    DELETE:   'Xoá',
    EXPORT:   'Xuất file',
    LOCK:     'Khoá',
    APPROVE:  'Duyệt',
    CANCEL:   'Huỷ',
};

interface ActionDef { code: string; label: string; }
interface ModuleDef  { resource: string; label: string; actions: ActionDef[]; }

const MODULES: ModuleDef[] = [
    { resource: 'EMPLOYEE',           label: 'Quản lý nhân sự',         actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'PROJECT',            label: 'Giao dịch cọc',            actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'TRANSACTION',        label: 'Giao dịch thành công',     actions: ['VIEW','CREATE','EDIT','DELETE','APPROVE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REVENUE',            label: 'Quản lý doanh thu',        actions: ['VIEW','EDIT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REPORT_DOANH_THU',   label: 'Báo cáo doanh thu',        actions: ['VIEW','EXPORT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REPORT_GIAO_DICH',   label: 'Báo cáo giao dịch',        actions: ['VIEW','EXPORT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REPORT_LUONG',       label: 'Báo cáo lương',            actions: ['VIEW','EXPORT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REPORT_NGUON_KHACH', label: 'Báo cáo nguồn khách',      actions: ['VIEW','EXPORT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REPORT_KHU_VUC',     label: 'Báo cáo khu vực',          actions: ['VIEW','EXPORT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REPORT_GIAI_THUONG', label: 'Báo cáo giải thưởng',      actions: ['VIEW','EXPORT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'PAYROLL',            label: 'Tính lương & Hoa hồng',    actions: ['VIEW','CREATE','EDIT','LOCK'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'DISBURSEMENT',       label: 'Uỷ nhiệm chi',             actions: ['VIEW','CREATE','EDIT','APPROVE','CANCEL','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'ROLE',               label: 'Quản lý vai trò',          actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'PERMISSION',         label: 'Phân quyền',               actions: ['VIEW','EDIT'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'BRANCH',             label: 'Chi nhánh',                actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'TEAM',               label: 'Đội / Nhóm',               actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'REGION',             label: 'Khu vực',                  actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'CUSTOMER',           label: 'Danh mục khách hàng',      actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'KPI',                label: 'KPI Targets',              actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'LEAD_SOURCE',         label: 'Nguồn khách',               actions: ['VIEW','CREATE','EDIT','DELETE'].map(c => ({ code: c, label: ACTION_LABELS[c] })) },
    { resource: 'LEAVE_REQUEST',      label: 'Đăng ký nghỉ phép',        actions: [{ code: 'VIEW_ALL', label: 'Xem tất cả' }, { code: 'APPROVE', label: ACTION_LABELS['APPROVE'] }, { code: 'DELETE', label: ACTION_LABELS['DELETE'] }] },
    { resource: 'EDIT_REQUEST',       label: 'Yêu cầu chỉnh sửa GD',    actions: [{ code: 'VIEW', label: ACTION_LABELS['VIEW'] }, { code: 'APPROVE', label: ACTION_LABELS['APPROVE'] }] },
];

type PermKey = string;

const CASCADE_UP: Record<string, string[]> = {
    CREATE: ['VIEW'], EDIT: ['VIEW'], DELETE: ['VIEW','EDIT'],
    EXPORT: ['VIEW'], LOCK: ['VIEW'], APPROVE: ['VIEW'], CANCEL: ['VIEW'],
};
const CASCADE_DOWN: Record<string, string[]> = {
    VIEW: ['CREATE','EDIT','DELETE','EXPORT','LOCK','APPROVE','CANCEL'],
    EDIT: ['DELETE'],
};

interface Permission { id: string; key: string; module: string; action: string; description?: string; }
interface Role        { id: string; code: string; name: string; isActive: boolean; }

export default function PhanQuyenPage() {
    const { can } = useUser();
    const [roles,        setRoles]        = useState<Role[]>([]);
    const [allPerms,     setAllPerms]     = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [checkedKeys,  setCheckedKeys]  = useState<Set<PermKey>>(new Set());
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [seeding,      setSeeding]      = useState(false);
    const [addModal,     setAddModal]     = useState(false);
    const [addForm]                       = Form.useForm();
    const [creating,     setCreating]     = useState(false);
    const [permMap,      setPermMap]      = useState<Map<PermKey, string>>(new Map());

    useEffect(() => {
        api.get('/roles', { params: { limit: 200 } }).then(({ data }) => setRoles(data.data ?? [])).catch(() => {});
        loadAllPerms();
    }, []);

    const loadAllPerms = async () => {
        try {
            const { data } = await api.get('/permissions');
            const perms: Permission[] = Array.isArray(data) ? data : (data.data ?? []);
            setAllPerms(perms);
            const map = new Map<PermKey, string>();
            perms.forEach(p => map.set(`${p.module}::${p.action}`, p.id));
            setPermMap(map);
        } catch { /* silent */ }
    };

    const loadRolePerms = useCallback(async (role: Role) => {
        setSelectedRole(role);
        setLoadingPerms(true);
        try {
            const { data } = await api.get(`/roles/${role.id}/permissions`);
            // backend trả { roleId, roleName, permissions: [{ id, grantedAt, permission: {...} }] }
            const rp: any[] = data.permissions ?? (Array.isArray(data) ? data : (data.data ?? []));
            const perms: Permission[] = rp.map((item: any) => item.permission ?? item);
            setCheckedKeys(new Set(perms.map(p => `${p.module}::${p.action}`)));
        } catch {
            message.error('Không thể tải quyền của vai trò');
        } finally { setLoadingPerms(false); }
    }, []);

    const togglePerm = (resource: string, action: string) => {
        const key: PermKey = `${resource}::${action}`;
        setCheckedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
                (CASCADE_DOWN[action] ?? []).forEach(dep => next.delete(`${resource}::${dep}`));
            } else {
                next.add(key);
                (CASCADE_UP[action] ?? []).forEach(dep => next.add(`${resource}::${dep}`));
            }
            return next;
        });
    };

    const toggleModule = (mod: ModuleDef) => {
        const allKeys = mod.actions.map(a => `${mod.resource}::${a.code}`);
        const allChecked = allKeys.every(k => checkedKeys.has(k));
        setCheckedKeys(prev => {
            const next = new Set(prev);
            if (allChecked) {
                allKeys.forEach(k => next.delete(k));
            } else {
                allKeys.forEach(k => next.add(k));
                mod.actions.forEach(a => {
                    (CASCADE_UP[a.code] ?? []).forEach(dep => next.add(`${mod.resource}::${dep}`));
                });
            }
            return next;
        });
    };

    const handleSeed = async () => {
        const missing: { key: string; module: string; action: string; description: string }[] = [];
        MODULES.forEach(mod => {
            mod.actions.forEach(a => {
                if (!permMap.has(`${mod.resource}::${a.code}`)) {
                    missing.push({ key: `${mod.resource}_${a.code}`, module: mod.resource, action: a.code, description: `${mod.label} — ${a.label}` });
                }
            });
        });
        if (missing.length === 0) { message.info('Tất cả quyền đã được seed rồi'); return; }
        setSeeding(true);
        try {
            for (const m of missing) {
                try { await api.post('/permissions', m); } catch { /* bỏ qua nếu đã tồn tại */ }
            }
            message.success(`Đã seed ${missing.length} quyền mới`);
            await loadAllPerms();
        } catch {
            message.error('Seed thất bại, vui lòng thử lại');
        } finally { setSeeding(false); }
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        const ids: string[] = [];
        checkedKeys.forEach(key => { const id = permMap.get(key); if (id) ids.push(id); });
        setSaving(true);
        try {
            await api.put(`/roles/${selectedRole.id}/permissions`, { permissionIds: ids });
            message.success(`Đã lưu quyền cho vai trò "${selectedRole.name}"`);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Lưu thất bại');
        } finally { setSaving(false); }
    };

    const handleCreatePermission = async () => {
        try {
            const values = await addForm.validateFields();
            setCreating(true);
            await api.post('/permissions', {
                key: values.key, module: values.module, action: values.action,
                description: values.description || undefined,
            });
            message.success('Đã tạo quyền mới');
            await loadAllPerms();
            addForm.resetFields();
            setAddModal(false);
        } catch (err: any) {
            if (err?.response?.status === 409) {
                addForm.setFields([{ name: 'key', errors: ['Mã quyền này đã tồn tại'] }]);
            } else if (err?.response) {
                const msg = err.response.data?.message;
                message.error(Array.isArray(msg) ? msg[0] : msg || 'Tạo thất bại');
            }
        } finally { setCreating(false); }
    };

    const handleModuleOrActionChange = () => {
        const mod    = addForm.getFieldValue('module');
        const action = addForm.getFieldValue('action');
        if (mod && action) addForm.setFieldValue('key', `${mod}_${action}`);
    };

    const missingCount = MODULES.reduce((n, mod) =>
        n + mod.actions.filter(a => !permMap.has(`${mod.resource}::${a.code}`)).length, 0);

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Phân quyền theo vai trò</Title>
                <div style={{ display: 'flex', gap: 8 }}>
                    {can('PERMISSION_EDIT') && missingCount > 0 && (
                        <Tooltip title={`${missingCount} quyền chưa được tạo trong database`}>
                            <Button icon={<ThunderboltOutlined />} onClick={handleSeed} loading={seeding}>
                                Seed {missingCount} quyền còn thiếu
                            </Button>
                        </Tooltip>
                    )}
                    {can('PERMISSION_EDIT') && (
                        <Button type="primary" icon={<PlusOutlined />}
                            style={{ background: '#E8890C', borderColor: '#E8890C' }}
                            onClick={() => { addForm.resetFields(); setAddModal(true); }}>
                            Tạo quyền mới
                        </Button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
                <Card bodyStyle={{ padding: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, paddingLeft: 4 }}>Chọn vai trò</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {roles.map(r => (
                            <button key={r.id} onClick={() => loadRolePerms(r)} style={{
                                width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8,
                                fontSize: 13, cursor: 'pointer', border: 'none',
                                background: selectedRole?.id === r.id ? '#fff7ed' : 'transparent',
                                color:      selectedRole?.id === r.id ? '#E8890C' : '#4b5563',
                                fontWeight: selectedRole?.id === r.id ? 600 : 400,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <SafetyCertificateOutlined />
                                    {r.name}
                                </span>
                                <Tag color={r.isActive ? 'success' : 'default'} style={{ fontSize: 10, lineHeight: '18px' }}>
                                    {r.isActive ? 'Active' : 'Off'}
                                </Tag>
                            </button>
                        ))}
                        {roles.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '16px 0' }}>Chưa có vai trò</p>
                        )}
                    </div>
                </Card>

                <Card>
                    {!selectedRole ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
                            <SafetyCertificateOutlined style={{ fontSize: 40, opacity: 0.3, display: 'block', marginBottom: 12 }} />
                            <p style={{ fontSize: 14 }}>Chọn một vai trò bên trái để phân quyền</p>
                        </div>
                    ) : loadingPerms ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div>
                                    <Text strong style={{ fontSize: 15 }}>
                                        Quyền của: <span style={{ color: '#E8890C' }}>{selectedRole.name}</span>
                                    </Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {checkedKeys.size} / {permMap.size} quyền được chọn
                                    </Text>
                                </div>
                                {can('PERMISSION_EDIT') && (
                                    <Button type="primary" loading={saving} onClick={handleSave}
                                        style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                                        Lưu thay đổi
                                    </Button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {MODULES.map((mod, i) => {
                                    const allKeys = mod.actions.map(a => `${mod.resource}::${a.code}`);
                                    const checkedCount = allKeys.filter(k => checkedKeys.has(k)).length;
                                    const allChecked = checkedCount === mod.actions.length;
                                    const partial = checkedCount > 0 && !allChecked;
                                    return (
                                        <div key={mod.resource} style={{
                                            display: 'grid', gridTemplateColumns: '220px 1fr',
                                            borderTop: i === 0 ? '1px solid #f0f0f0' : undefined,
                                            borderBottom: '1px solid #f0f0f0',
                                        }}>
                                            <div style={{
                                                padding: '12px 16px', borderRight: '1px solid #f0f0f0',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                background: checkedCount > 0 ? '#fffbf5' : 'transparent',
                                            }}>
                                                <Checkbox checked={allChecked} indeterminate={partial} onChange={() => toggleModule(mod)} />
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{mod.label}</div>
                                                    {checkedCount > 0 && (
                                                        <div style={{ fontSize: 11, color: '#E8890C' }}>{checkedCount}/{mod.actions.length} quyền</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                                {mod.actions.map(a => {
                                                    const key = `${mod.resource}::${a.code}`;
                                                    const checked = checkedKeys.has(key);
                                                    const missing = !permMap.has(key);
                                                    return (
                                                        <Tooltip key={a.code} title={missing ? 'Quyền này chưa được seed vào database' : undefined}>
                                                            <Checkbox checked={checked} disabled={missing}
                                                                onChange={() => togglePerm(mod.resource, a.code)}
                                                                style={{ userSelect: 'none' }}>
                                                                <span style={{ fontSize: 13, color: missing ? '#d1d5db' : checked ? '#E8890C' : '#374151', fontWeight: checked ? 500 : 400 }}>
                                                                    {a.label}
                                                                </span>
                                                            </Checkbox>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: 16, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                                <strong>Quy tắc tự động: </strong>
                                Tick <em>Xoá</em> → tự tick <em>Xem + Chỉnh sửa</em> &nbsp;|&nbsp;
                                Tick <em>Chỉnh sửa / Tạo mới</em> → tự tick <em>Xem</em> &nbsp;|&nbsp;
                                Bỏ <em>Xem</em> → tự bỏ tất cả quyền của nhóm đó
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {/* ── Modal tạo quyền mới ── */}
            <Modal open={addModal} onCancel={() => setAddModal(false)}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <KeyOutlined style={{ color: '#E8890C' }} />
                        <span>Tạo quyền tuỳ chỉnh</span>
                    </div>
                }
                width={500} footer={null} destroyOnClose>
                <Form form={addForm} layout="vertical" style={{ marginTop: 16 }} onFinish={handleCreatePermission}>

                    <Form.Item name="module" label="Nhóm chức năng"
                        rules={[{ required: true, message: 'Vui lòng chọn nhóm chức năng' }]}
                        extra="Quyền này thuộc về nhóm chức năng nào trong hệ thống">
                        <Select showSearch allowClear placeholder="Chọn nhóm chức năng..."
                            onChange={handleModuleOrActionChange}
                            options={MODULES.map(m => ({ value: m.resource, label: m.label }))}
                            filterOption={(input, opt) =>
                                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>

                    <Form.Item name="action" label="Hành động"
                        rules={[{ required: true, message: 'Vui lòng chọn hành động' }]}
                        extra="Hành động cụ thể được phép thực hiện">
                        <Select showSearch allowClear placeholder="Chọn hành động..."
                            onChange={handleModuleOrActionChange}
                            options={Object.entries(ACTION_LABELS).map(([value, label]) => ({
                                value,
                                label: (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                        <span>{label}</span>
                                        <span style={{ color: '#d1d5db', fontSize: 12 }}>{value}</span>
                                    </div>
                                ),
                            }))}
                            filterOption={(input, opt) =>
                                (opt?.value as string ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>

                    <Form.Item name="key"
                        label={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                Mã quyền &nbsp;
                                <Tag color="orange" style={{ fontSize: 11, marginRight: 0 }}>không trùng</Tag>
                            </span>
                        }
                        rules={[{ required: true, message: 'Mã quyền không được để trống' }]}
                        extra="Tự sinh từ Nhóm chức năng + Hành động. Có thể chỉnh tay nếu cần.">
                        <Input placeholder="VD: EMPLOYEE_VIEW" style={{ fontFamily: 'monospace' }}
                            onChange={e => addForm.setFieldValue('key', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                        />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} placeholder="Mô tả ngắn về quyền này (tuỳ chọn)..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                        <Button onClick={() => setAddModal(false)}>Huỷ</Button>
                        <Button type="primary" htmlType="submit" loading={creating}
                            style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                            Tạo quyền
                        </Button>
                    </div>
                </Form>
            </Modal>
        </>
    );
}
