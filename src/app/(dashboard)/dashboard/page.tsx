'use client';
import { Row, Col } from 'antd';
import PersonalInfoWidget from './_components/PersonalInfoWidget';
import CompanyPoliciesWidget from './_components/CompanyPoliciesWidget';
import OrgChartWidget from './_components/OrgChartWidget';

export default function DashboardPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                    <PersonalInfoWidget />
                </Col>
                <Col xs={24} lg={16}>
                    <CompanyPoliciesWidget />
                </Col>
            </Row>
            <div style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
                <OrgChartWidget />
            </div>
        </div>
    );
}
