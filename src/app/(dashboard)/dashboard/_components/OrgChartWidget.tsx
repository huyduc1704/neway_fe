'use client';
import { useCallback, useEffect, useState } from 'react';
import { Card, Typography, message, Spin, Button, Space, Avatar, Drawer, List, Modal, Form, Input, Select, Tooltip } from 'antd';
import { SaveOutlined, ReloadOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
    MarkerType,
    Handle,
    Position,
    NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '@/lib/api';
import dagre from 'dagre';

const { Text } = Typography;

// --- Dagre Layout Setup ---
const nodeWidth = 320;
const nodeHeight = 120;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode = {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
        return newNode;
    });

    return { nodes: newNodes, edges };
};

// --- Custom Nodes ---

const RoleNode = ({ data }: NodeProps) => {
    const users = data.users || [];
    const displayUsers = users.slice(0, 5);
    const hiddenCount = Math.max(0, users.length - 5);

    return (
        <div style={{
            border: '2px solid #1A2B5A',
            borderRadius: 8,
            background: '#fff',
            width: nodeWidth,
            height: nodeHeight,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            cursor: 'pointer'
        }} onClick={() => data.onRoleClick(data.rawRole)}>
            <Handle type="target" position={Position.Top} style={{ width: 12, height: 12 }} />
            <div style={{ background: '#1A2B5A', color: '#fff', padding: '12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold', fontSize: 16 }}>
                {data.name}
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 14 }}>{data.userCount} nhân sự</Text>
                {users.length > 0 && (
                    <Avatar.Group maxCount={5} size="small" maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf' }}>
                        {displayUsers.map((u: any) => (
                            <Tooltip title={u.user?.fullName} key={u.user?.id}>
                                <Avatar src={u.user?.avatarUrl} icon={<UserOutlined />} />
                            </Tooltip>
                        ))}
                        {hiddenCount > 0 && <Avatar>+{hiddenCount}</Avatar>}
                    </Avatar.Group>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} style={{ width: 12, height: 12 }} />
        </div>
    );
};

const nodeTypes = {
    role: RoleNode,
};

export default function OrgChartWidget() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    
    // Batch move state
    const [pendingMoves, setPendingMoves] = useState<{nodeId: string, newParentId: string | null}[]>([]);

    // Drawer and Modal State
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<any>(null);
    const [form] = Form.useForm();
    
    const [roles, setRoles] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        setPendingMoves([]);
        try {
            const [meRes, orgRes] = await Promise.all([
                api.get('/auth/me'),
                api.get('/organizations/org-chart')
            ]);
            
            const perms = meRes.data.permissions || [];
            const canManage = perms.includes('MANAGE_ORG_CHART');
            setHasPermission(canManage);

            const fetchedRoles = orgRes.data.roles || [];
            const fetchedBranches = orgRes.data.branches || [];
            
            setRoles(fetchedRoles);
            setBranches(fetchedBranches);

            // Cập nhật lại selectedRole nếu Drawer đang mở
            if (selectedRole) {
                const updatedRole = fetchedRoles.find((r: any) => r.id === selectedRole.id);
                if (updatedRole) setSelectedRole(updatedRole);
            }

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            fetchedRoles.forEach((role: any) => {
                newNodes.push({
                    id: role.id,
                    type: 'role',
                    position: { x: 0, y: 0 },
                    data: { 
                        name: role.name,
                        userCount: role._count?.users || 0,
                        users: role.users || [],
                        rawRole: role,
                        onRoleClick: handleRoleClick
                    }
                });

                if (role.parentRoleId) {
                    newEdges.push({
                        id: `e-${role.parentRoleId}-${role.id}`,
                        source: role.parentRoleId,
                        target: role.id,
                        markerEnd: { type: MarkerType.ArrowClosed }
                    });
                }
            });

            const layouted = getLayoutedElements(newNodes, newEdges);
            setNodes(layouted.nodes);
            setEdges(layouted.edges);
        } catch (error) {
            console.error('Failed to load org chart', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRoleClick = (role: any) => {
        setSelectedRole(role);
        setIsDrawerOpen(true);
    };

    const handleEditEmp = (empUser: any) => {
        const empProfile = empUser.user?.employeeProfile;
        if (!empProfile) return;
        setEditingEmp({
            id: empProfile.id,
            fullName: empUser.user?.fullName,
            title: empProfile.title,
            branchId: empProfile.branchId,
            roleId: selectedRole?.id
        });
        form.setFieldsValue({
            title: empProfile.title,
            branchId: empProfile.branchId,
            roleId: selectedRole?.id
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
        } catch (error) {
            console.error(error);
        }
    };

    const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onConnect = useCallback((params: Connection) => {
        if (!hasPermission) {
            message.warning('Bạn không có quyền thay đổi cấu trúc bộ máy');
            return;
        }

        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);
        if (!sourceNode || !targetNode) return;

        // Prevent cyclic or self connections
        if (params.source === params.target) return;

        // Remove any existing edge that targets the same node (a role can only have 1 parent)
        const filteredEdges = edges.filter(e => e.target !== params.target);
        
        const newEdge = {
            id: `e-${params.source}-${params.target}`,
            source: params.source,
            target: params.target,
            markerEnd: { type: MarkerType.ArrowClosed }
        };
        const newEdges = [...filteredEdges, newEdge];

        // Apply dagre layout again to reorganize the graph visually
        const layouted = getLayoutedElements(nodes, newEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);

        // Record the pending move
        setPendingMoves(prev => {
            // Remove any existing pending move for this target
            const rest = prev.filter(m => m.nodeId !== params.target);
            return [...rest, { nodeId: params.target, newParentId: params.source }];
        });

    }, [nodes, edges, hasPermission]);

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
            title="Cấu trúc Chức vụ (Role Hierarchy)" 
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
            {loading && nodes.length === 0 ? (
                <div style={{ padding: 64, textAlign: 'center' }}><Spin /></div>
            ) : (
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    nodesDraggable={hasPermission}
                    nodesConnectable={hasPermission}
                    attributionPosition="bottom-right"
                >
                    <Controls />
                    <Background color="#ccc" gap={16} />
                </ReactFlow>
            )}

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
                            {roles.map(r => <Select.Option key={r.id} value={r.id}>{r.name} ({r.code})</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="branchId" label="Thuộc chi nhánh">
                        <Select placeholder="Chọn chi nhánh" allowClear showSearch optionFilterProp="children">
                            {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}
