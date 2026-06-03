'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Button, Input, Tag, Card, Modal, Form, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

interface Permission { id: string; action: string; resource: string; description: string | null; }
interface Role       { id: string; code: string; name: string; isActive: boolean; }

export default function PhanQuyenPage() {
    const [roles,        setRoles]        = useState<Role[]>([]);
    const [permissions,  setPermissions]  = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [checkedIds,   setCheckedIds]   = useState<Set<string>>(new Set());

    const [addDialog,   setAddDialog]   = useState(false);
    const [creating,    setCreating]    = useState(false);
    const [addForm] = Form.useForm();

    useEffect(() => {
        api.get('/roles',       { params: { limit: 200 } }).then(({ data }) => setRoles(data.data ?? [])).catch(() => {});
        api.get('/permissions').then(({ data }) => setPermissions(data.data ?? data ?? [])).catch(() => {});
    }, []);

    const loadRolePerms = useCallback(async (role: Role) => {
        setSelectedRole(role);
        setLoadingPerms(true);
        try {
            const { data } = await api.get(`/roles/${role.id}/permissions`);
            const perms: Permission[] = data.data ?? data ?? [];
            setRolePerms(perms);
            setCheckedIds(new Set(perms.map((p: Permission) => p.id)));
        } catch { message.error('Không thể tải quyền của vai trò'); }
        finally { setLoadingPerms(false); }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_rolePerms, setRolePerms] = useState<Permission[]>([]);

    const togglePerm = (id: string) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await api.put(`/roles/${selectedRole.id}/permissions`, { permissionIds: [...checkedIds] });
            message.success(`Đã cập nhật quyền cho vai trò "${selectedRole.name}"`);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Lưu thất bại');
        } finally { setSaving(false); }
    };

    const handleCreatePermission = async () => {
        try {
            const values = await addForm.validateFields();
            setCreating(true);
            await api.post('/permissions', { action: values.action.trim().toUpperCase(), resource: values.resource.trim().toUpperCase(), description: values.desc || undefined });
            message.success('Đã thêm permission');
            const { data } = await api.get('/permissions');
            setPermissions(data.data ?? data ?? []);
            addForm.resetFields();
            setAddDialog(false);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Tạo thất bại');
        } finally { setCreating(false); }
    };

    const handleDeletePermission = async (id: string) => {
        if (!window.confirm('Xoá permission này?')) return;
        try {
            await api.delete(`/permissions/${id}`);
            message.success('Đã xoá permission');
            setPermissions(p => p.filter(x => x.id !== id));
            setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        } catch (err: any) { message.error(err?.response?.data?.message || 'Xoá thất bại'); }
    };

    const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        const key = p.resource || 'Khác';
        (acc[key] ??= []).push(p);
        return acc;
    }, {});

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Hệ thống / Phân quyền</Title>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
                {/* Role list */}
                <Card>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A2B5A', marginBottom: 12 }}>Chọn vai trò</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {roles.map(r => (
                            <button
                                key={r.id}
                                onClick={() => loadRolePerms(r)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', border: 'none',
                                    background: selectedRole?.id === r.id ? '#fff7ed' : 'transparent',
                                    color: selectedRole?.id === r.id ? '#E8890C' : '#4b5563',
                                    fontWeight: selectedRole?.id === r.id ? 500 : 400,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                                    {r.name}
                                </span>
                                <Tag color={r.isActive ? 'success' : 'default'} style={{ fontSize: 10 }}>
                                    {r.isActive ? 'Active' : 'Off'}
                                </Tag>
                            </button>
                        ))}
                        {roles.length === 0 && <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Chưa có vai trò</p>}
                    </div>
                </Card>

                {/* Permissions */}
                <Card>
                    {!selectedRole ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#9ca3af' }}>
                            <ShieldCheck size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>Chọn một vai trò bên trái để phân quyền</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A2B5A', margin: 0 }}>
                                        Quyền của: <span style={{ color: '#E8890C' }}>{selectedRole.name}</span>
                                    </p>
                                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{checkedIds.size} / {permissions.length} quyền được chọn</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Button icon={<PlusOutlined />} onClick={() => { addForm.resetFields(); setAddDialog(true); }}>
                                        Thêm permission
                                    </Button>
                                    <Button type="primary" onClick={handleSave} loading={saving} style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                                        Lưu thay đổi
                                    </Button>
                                </div>
                            </div>

                            {loadingPerms ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E8890C', borderTop: '2px solid transparent', animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: 4 }}>
                                    {Object.entries(grouped).sort().map(([resource, perms]) => (
                                        <div key={resource}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{resource}</span>
                                                <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                                                <button
                                                    style={{ fontSize: 12, color: '#E8890C', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    onClick={() => {
                                                        const allChecked = perms.every(p => checkedIds.has(p.id));
                                                        setCheckedIds(prev => {
                                                            const next = new Set(prev);
                                                            perms.forEach(p => allChecked ? next.delete(p.id) : next.add(p.id));
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {perms.every(p => checkedIds.has(p.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                                {perms.map(p => (
                                                    <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #f3f4f6', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: '#E8890C' }}
                                                            checked={checkedIds.has(p.id)}
                                                            onChange={() => togglePerm(p.id)}
                                                        />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.action}</div>
                                                            {p.description && <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                                                        </div>
                                                        <button
                                                            style={{ padding: 2, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                                            title="Xoá permission"
                                                            onClick={e => { e.preventDefault(); handleDeletePermission(p.id); }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {permissions.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
                                            Chưa có permission nào. Nhấn "Thêm permission" để bắt đầu.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>

            {/* Add Permission Modal */}
            <Modal
                open={addDialog}
                onCancel={() => setAddDialog(false)}
                title="Thêm permission mới"
                width={400}
                footer={[
                    <Button key="cancel" onClick={() => setAddDialog(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleCreatePermission} loading={creating}>Tạo</Button>,
                ]}
            >
                <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="resource" label={<span>Resource <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập resource' }]}>
                        <Input placeholder="VD: PROJECT, USER..." style={{ textTransform: 'uppercase' }} onChange={e => addForm.setFieldValue('resource', e.target.value.toUpperCase())} />
                    </Form.Item>
                    <Form.Item name="action" label={<span>Action <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập action' }]}>
                        <Input placeholder="VD: READ, CREATE, UPDATE..." style={{ textTransform: 'uppercase' }} onChange={e => addForm.setFieldValue('action', e.target.value.toUpperCase())} />
                    </Form.Item>
                    <Form.Item name="desc" label="Mô tả">
                        <Input placeholder="Mô tả ngắn về quyền này..." />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
