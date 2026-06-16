'use client';
import PersonalInfoWidget from './_components/PersonalInfoWidget';
import CalendarWidget from './_components/CalendarWidget';
import CompanyPoliciesWidget from './_components/CompanyPoliciesWidget';
import OrgChartWidget from './_components/OrgChartWidget';

export default function DashboardPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PersonalInfoWidget />
            <CalendarWidget />
            <CompanyPoliciesWidget />
            <div style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
                <OrgChartWidget />
            </div>
        </div>
    );
}
