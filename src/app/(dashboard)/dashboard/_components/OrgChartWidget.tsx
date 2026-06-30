'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Card, Typography, message, Spin, Button, Space,
    Avatar, Drawer, List, Modal, Form, Input, Select, Tooltip
} from 'antd';
import { SaveOutlined, ReloadOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { Graph } from '@antv/g6';
import api from '@/lib/api';

const { Text } = Typography;

type PendingMove = { nodeId: string; newParentId: string | null };

export default function OrgChartWidget() {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);
    const rolesMapRef = useRef<Map<string, any>>(new Map());

    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);

    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<any>(null);
    const [form] = Form.useForm();

    const [roles, setRoles] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);

    const buildGraph = useCallback((fetchedRoles: any[], canManage: boolean) => {
        if (!containerRef.current) return;

        graphRef.current?.destroy();
        graphRef.current = null;

        const nodes = fetchedRoles.map(role => ({
            id: role.id,
            data: { name: role.name, userCount: role._count?.users || 0 },
            style: {
                size: [220, 70] as [number, number],
                labelText: `${role.name}\n(${role._count?.users || 0} nhân sự)`,
            }
        }));

        const edges = fetchedRoles
            .filter(r => r.parentRoleId)
            .map(r => ({
                id: `e-${r.parentRoleId}-${r.id}`,
                source: r.parentRoleId,
                target: r.id,
            }));

        const behaviors: any[] = ['zoom-canvas', 'drag-canvas'];
        if (canManage) {
            // Kéo từ node này sang node kia để tạo quan hệ cha-con mới
            behaviors.push({ type: 'create-edge', trigger: 'drag' });
        }

        const graph = new Graph({
            container: containerRef.current,
            autoFit: 'view',
            data: { nodes, edges },
            layout: {
                type: 'antv-dagre',
                rankdir: 'TB',
                nodesep: 60,
                ranksep: 80,
                controlPoints: true,
            },
            node: {
                type: 'rect',
                style: {
                    fill: '#1A2B5A',
                    stroke: '#1A2B5A',
                    radius: 8,
                    labelFill: '#ffffff',
                    labelFontSize: 13,
                    labelFontWeight: 'bold',
                    labelPlacement: 'center',
                    cursor: 'pointer',
                    ports: [{ placement: 'top' }, { placement: 'bottom' }, { placement: 'left' }, { placement: 'right' }],
                },
            },
            edge: {
                type: 'polyline',
                style: {
                    stroke: '#94a3b8',
                    lineWidth: 2,
                    endArrow: true,
                    endArrowSize: 8,
                    radius: 8,
                    router: { type: 'orth' },
                },
            },
            behaviors,
        });

        // Click node → mở Drawer
        // G6 v5 dùng e.itemId; nếu không có thì fallback e.target?.id
        graph.on('node:click', (e: any) => {
            const nodeId = e.itemId ?? e.target?.id;
            const role = rolesMapRef.current.get(nodeId);
            if (role) {
                setSelectedRole(role);
                setIsDrawerOpen(true);
            }
        });

        // Sau khi user kéo tạo edge mới → ghi nhận pending move
        // Nếu event không fire, thử các tên khác: 'after:createedge', 'edge:created', 'afterAddItem'
        graph.on('aftercreateedge', (e: any) => {
            const source = e.edge?.source ?? e.edge?.getSource?.()?.getID?.();
            const target = e.edge?.target ?? e.edge?.getTarget?.()?.getID?.();
            if (!source || !target || source === target) return;

            setPendingMoves(prev => {
                const rest = prev.filter(m => m.nodeId !== target);
                return [...rest, { nodeId: target, newParentId: source }];
            });
        });

        graph.render();
        graphRef.current = graph;
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setPendingMoves([]);
        try {
            const [meRes, orgRes] = await Promise.all([
                api.get('/auth/me'),
                api.get('/organizations/org-chart'),
            ]);

            const perms: string[] = meRes.data.permissions || [];
            const canManage = perms.includes('MANAGE_ORG_CHART');
            setHasPermission(canManage);

            const fetchedRoles: any[] = orgRes.data.roles || [];
            const fetchedBranches: any[] = orgRes.data.branches || [];

            setRoles(fetchedRoles);
            setBranches(fetchedBranches);
            rolesMapRef.current = new Map(fetchedRoles.map(r => [r.id, r]));

            buildGraph(fetchedRoles, canManage);
        } catch {
            message.error('Không thể tải sơ đồ tổ chức');
        } finally {
            setLoading(false);
        }
    }, [buildGraph]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Cleanup khi unmount
    useEffect(() => () => { graphRef.current?.destroy(); }, []);

    const handleEditEmp = (empUser: any) => {
        const empProfile = empUser.user?.employeeProfile;
        if (!empProfile) return;
        setEditingEmp({ id: empProfile.id, fullName: empUser.user?.fullName });
        form.setFieldsValue({
            title: empProfile.title,
            branchId: empProfile.branchId,
            roleId: selectedRole?.id,
        });
        setIsModalOpen(true);
    };

    const handleSaveEmp = async () => {
        try {
            const values = await form.validateFields();
            await api.patch(`/organizations/employees/${editingEmp.id}`, values);
            message.success('Đã cập nhật thông tin nhân sự');
            setIsModalOpen(false);
            fetchData();
        } catch {
            // validation error handled by antd form
        }
    };

    const handleSaveChanges = async () => {
        try {
            await api.patch('/organizations/move-batch', { moves: pendingMoves });
            message.success('Đã lưu cấu trúc sơ đồ mới!');
            setPendingMoves([]);
            fetchData();
        } catch (e: any) {
            message.error(e.response?.data?.message || 'Lỗi khi lưu sơ đồ');
        }
    };

    return (
        <Card
            title="Cấu trúc Chức vụ"
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
                    {pendingMoves.length > 0 && (
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveChanges}>
                            Lưu thay đổi ({pendingMoves.length})
                        </Button>
                    )}
                </Space>
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, padding: 0, position: 'relative' } }}
        >
            {/* Container luôn render để containerRef.current không null khi buildGraph được gọi */}
            <div style={{ position: 'relative', width: '100%', height: 600 }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.75)',
                    }}>
                        <Spin />
                    </div>
                )}
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </div>

            <Drawer
                title={`Danh sách: ${selectedRole?.name}`}
                placement="right"
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                width={400}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={selectedRole?.users || []}
                    renderItem={(u: any) => {
                        const profile = u.user?.employeeProfile;
                        return (
                            <List.Item
                                actions={hasPermission && profile ? [
                                    <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => handleEditEmp(u)} />
                                ] : []}
                            >
                                <List.Item.Meta
                                    avatar={<Avatar src={u.user?.avatarUrl} icon={<UserOutlined />} />}
                                    title={u.user?.fullName}
                                    description={
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{profile?.title || 'Chưa có chức danh'}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{profile?.branch?.name || 'Chưa xếp chi nhánh'}</Text>
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Drawer>

            <Modal
                title={`Sửa thông tin: ${editingEmp?.fullName}`}
                open={isModalOpen}
                onOk={handleSaveEmp}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Chức danh hiển thị (Title)">
                        <Input placeholder="VD: Trưởng phòng Kinh doanh" />
                    </Form.Item>
                    <Form.Item name="roleId" label="Vai trò hệ thống (Role)">
                        <Select placeholder="Chọn Role hệ thống" showSearch optionFilterProp="children">
                            {roles.map(r => (
                                <Select.Option key={r.id} value={r.id}>{r.name} ({r.code})</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="branchId" label="Thuộc chi nhánh">
                        <Select placeholder="Chọn chi nhánh" allowClear showSearch optionFilterProp="children">
                            {branches.map(b => (
                                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}
