'use client';
import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, Tabs, App, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CreateProjectPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const [branches, setBranches] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [bRes, tRes, eRes] = await Promise.all([
                    api.get('/branches', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
                    api.get('/teams', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
                    api.get('/employees', { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
                ]);
                setBranches(bRes.data?.data || []);
                setTeams(tRes.data?.data || []);
                setEmployees(eRes.data?.data || []);
            } catch (error) {
                console.error('Error loading lookup data', error);
            }
        };
        fetchLookups();
    }, []);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                code: values.code,
                ward: values.ward,
                area: values.area,
                managedBranchId: values.managedBranchId,
                rentalStartAt: values.rentalDateRange?.[0]?.toISOString(),
                rentalEndAt: values.rentalDateRange?.[1]?.toISOString(),
                expectedStayAt: values.actualStayRange?.[0]?.toISOString(),
                note: values.roomInfo,
            };

            await api.post('/projects', payload);
            message.success('Tạo mới dự án thành công!');
            router.push('/dashboard/quan-ly-du-an/thong-tin');
        } catch (error: any) {
            message.error(error?.response?.data?.message || 'Không thể tạo dự án, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = { height: 42, borderRadius: 6 };

    return (
        <div style={{ padding: '0 16px' }}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.back()} style={{ fontSize: 16 }} />
                <h1 style={{ margin: 0, fontSize: 24, color: '#1A2B5A', fontWeight: 600 }}>
                    Tạo dự án mới
                </h1>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false}
            >
                <Card 
                    style={{ 
                        borderRadius: 16, 
                        border: 'none', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        minHeight: '60vh'
                    }}
                    styles={{ body: { padding: '24px 32px' } }}
                >
                    <Tabs 
                        defaultActiveKey="1" 
                        type="line"
                        tabBarStyle={{ marginBottom: 32 }}
                        className="custom-project-tabs"
                        items={[
                            {
                                key: '1',
                                label: <span style={{ fontSize: 20, fontWeight: 600 }}>Thông tin cơ bản</span>,
                                children: (
                                    <div style={{ marginBottom: 40 }}>
                                        <Row gutter={[32, 16]}>
                                            <Col span={8}>
                                                <Form.Item label={<b>Mã dự án</b>} name="code" rules={[{ required: true }]}>
                                                    <Select placeholder="Nhập mã dự án" style={{ ...inputStyle, width: '100%' }}>
                                                        {/* Giả lập chọn mã template hoặc nhập */}
                                                        <Select.Option value="DA001">DA001</Select.Option>
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item label={<b>Giá thuê</b>} name="rentalPrice">
                                                    <InputNumber 
                                                        style={{ ...inputStyle, width: '100%', lineHeight: '40px' }} 
                                                        placeholder="Nhập giá thuê" 
                                                        controls={false}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item label={<b>Giá cọc</b>} name="depositPrice">
                                                    <InputNumber 
                                                        style={{ ...inputStyle, width: '100%', lineHeight: '40px' }} 
                                                        placeholder="Nhập giá cọc" 
                                                        controls={false}
                                                    />
                                                </Form.Item>
                                            </Col>

                                            <Col span={8}>
                                                <Form.Item label={<b>Phường/ xã</b>} name="ward" rules={[{ required: true }]}>
                                                    <Input style={inputStyle} placeholder="Nhập xã phường" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item label={<b>Chi nhánh quản lý</b>} name="managedBranchId" rules={[{ required: true }]}>
                                                    <Select style={inputStyle} placeholder="Chọn chi nhánh">
                                                        {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item label={<b>Khu vực</b>} name="area" rules={[{ required: true }]}>
                                                    <Input style={inputStyle} placeholder="Nhập khu vực" />
                                                </Form.Item>
                                            </Col>

                                            <Col span={12}>
                                                <Form.Item label={<b>Thời gian thuê</b>} name="rentalDateRange">
                                                    <DatePicker.RangePicker style={{ ...inputStyle, width: '100%' }} placeholder={['Nhập thời gian thuê', '']} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label={<b>Thời gian ở thực tế</b>} name="actualStayRange">
                                                    <DatePicker.RangePicker style={{ ...inputStyle, width: '100%' }} placeholder={['Nhập thời gian ở thực tế', '']} />
                                                </Form.Item>
                                            </Col>

                                            <Col span={12}>
                                                <Form.Item label={<b>Mã phòng</b>} name="roomCode">
                                                    <Input style={inputStyle} placeholder="Nhập mã phòng" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label={<b>Thông tin phòng cho thuê</b>} name="roomInfo">
                                                    <Input style={inputStyle} placeholder="Nhập thông tin phòng" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </div>
                                )
                            },
                            {
                                key: '2',
                                label: <span style={{ fontSize: 20, fontWeight: 600 }}>Nhân sự tham gia</span>,
                                children: (
                                    <div style={{ marginBottom: 40 }}>
                                        <Row gutter={32}>
                                            <Col span={12}>
                                                <Form.Item label={<b>Nhân viên marketing</b>} name="marketingStaff">
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Select style={{ ...inputStyle, flex: 1 }} placeholder="Chọn nhân viên">
                                                            {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.fullName}</Select.Option>)}
                                                        </Select>
                                                        <Button style={{ height: 42, width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} icon={<PlusOutlined />} />
                                                    </div>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label={<b>Nhân viên sale</b>} name="saleStaff">
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Select style={{ ...inputStyle, flex: 1 }} placeholder="Chọn nhân viên">
                                                            {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.fullName}</Select.Option>)}
                                                        </Select>
                                                        <Button style={{ height: 42, width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} icon={<PlusOutlined />} />
                                                    </div>
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </div>
                                )
                            }
                        ]}
                    />

                    {/* Actions at bottom right like mockup */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 40 }}>
                        <Button 
                            size="large"
                            onClick={() => router.back()}
                            style={{ 
                                height: 44, 
                                width: 90,
                                color: '#E8890C', 
                                borderColor: '#E8890C',
                                borderRadius: 8
                            }}
                        >
                            Xoá
                        </Button>
                        <Button 
                            type="primary"
                            size="large"
                            htmlType="submit"
                            loading={loading}
                            style={{ 
                                height: 44,
                                width: 150,
                                backgroundColor: '#E8890C', 
                                borderColor: '#E8890C',
                                fontWeight: 600,
                                borderRadius: 8
                            }}
                        >
                            Lưu thay đổi
                        </Button>
                    </div>
                </Card>
            </Form>

            {/* Global styles hack to align Antd styles perfectly to orange branding shown in design */}
            <style jsx global>{`
                .custom-project-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
                    color: #E8890C !important;
                }
                .custom-project-tabs .ant-tabs-tab:hover {
                    color: #E8890C !important;
                }
                .custom-project-tabs .ant-tabs-ink-bar {
                    background: #E8890C !important;
                }
                .custom-project-tabs .ant-tabs-tab {
                    color: #000;
                    margin-right: 24px !important;
                }
            `}</style>
        </div>
    );
}
