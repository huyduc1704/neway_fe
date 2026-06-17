'use client';
import { useEffect, useState, useCallback } from 'react';
import {
    Badge, Button, Calendar, Card, Col, Form, Input,
    Modal, Row, Spin, Tag, Tooltip, message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { CalendarIcon, Plus, CheckCircle, XCircle, Users } from 'lucide-react';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';

interface LeaveRequest {
    id: string;
    date: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    employee?: { id: string; employeeCode: string; user: { fullName: string } };
}

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    myAttendance?: { status: 'PENDING' | 'CONFIRMED' | 'REJECTED'; reason?: string } | null;
    _count?: { attendances: number };
    createdBy?: { fullName: string };
}

const LEAVE_COLOR: Record<string, string> = { PENDING: 'gold', APPROVED: 'green', REJECTED: 'red' };
const LEAVE_LABEL: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const ATTEND_COLOR: Record<string, string> = { PENDING: '#6366f1', CONFIRMED: '#10b981', REJECTED: '#ef4444' };

export default function CalendarWidget() {
    const { roles, isAdmin, can } = useUser();
    const isPrivileged = isAdmin || can('LEAVE_REQUEST_VIEW_ALL') || roles.includes('LEADER');

    const [currentMonth, setCurrentMonth] = useState(dayjs());
    const [leaves, setLeaves]             = useState<LeaveRequest[]>([]);
    const [events, setEvents]             = useState<CalendarEvent[]>([]);
    const [loading, setLoading]           = useState(false);

    const [dayModal, setDayModal]           = useState<{ open: boolean; date: Dayjs | null }>({ open: false, date: null });
    const [leaveForm]                       = Form.useForm();
    const [leaveModalOpen, setLeaveModal]   = useState(false);
    const [leaveSubmitting, setLeaveSubmit] = useState(false);

    const [eventModal, setEventModal]       = useState<CalendarEvent | null>(null);
    const [rejectReason, setRejectReason]   = useState('');
    const [attendLoading, setAttendLoading] = useState(false);

    const [createEventOpen, setCreateEvent] = useState(false);
    const [eventForm]                       = Form.useForm();
    const [eventSubmitting, setEventSubmit] = useState(false);

    const [approveModal, setApproveModal]   = useState<LeaveRequest | null>(null);
    const [reviewNote, setReviewNote]       = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);

    const monthStr = currentMonth.format('YYYY-MM');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [lRes, eRes] = await Promise.all([
                api.get('/leave-requests', { params: { month: monthStr } }),
                api.get('/calendar-events', { params: { month: monthStr } }),
            ]);
            setLeaves(lRes.data);
            setEvents(eRes.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [monthStr]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const dateCellRender = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        const dayLeaves = leaves.filter((l) => dayjs(l.date).format('YYYY-MM-DD') === dateStr);
        const dayEvts   = events.filter((e) =>
            !dayjs(value).isBefore(dayjs(e.startDate).startOf('day')) &&
            !dayjs(value).isAfter(dayjs(e.endDate).endOf('day'))
        );
        return (
            <div style={{ fontSize: 11 }}>
                {dayLeaves.map((l) => (
                    <Tooltip key={l.id} title={`${l.employee?.user.fullName ?? 'Bạn'} — ${LEAVE_LABEL[l.status]}`}>
                        <div onClick={(e) => { e.stopPropagation(); setDayModal({ open: true, date: value }); }} style={{ cursor: 'pointer', marginBottom: 2 }}>
                            <Badge color={LEAVE_COLOR[l.status]} text={
                                <span style={{ fontSize: 11 }}>{isPrivileged ? (l.employee?.user.fullName?.split(' ').pop() ?? '') : 'Nghỉ phép'}</span>
                            } />
                        </div>
                    </Tooltip>
                ))}
                {dayEvts.map((ev) => (
                    <Tooltip key={ev.id} title={ev.title}>
                        <div onClick={(e) => { e.stopPropagation(); setEventModal(ev); }}
                            style={{ cursor: 'pointer', marginBottom: 2, background: (ATTEND_COLOR[ev.myAttendance?.status ?? 'PENDING']) + '22', borderLeft: `3px solid ${ATTEND_COLOR[ev.myAttendance?.status ?? 'PENDING']}`, borderRadius: 3, padding: '1px 4px', color: ATTEND_COLOR[ev.myAttendance?.status ?? 'PENDING'], fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            📅 {ev.title}
                        </div>
                    </Tooltip>
                ))}
            </div>
        );
    };

    const dayLeaves    = dayModal.date ? leaves.filter((l) => dayjs(l.date).format('YYYY-MM-DD') === dayModal.date!.format('YYYY-MM-DD')) : [];
    const dayEvtsModal = dayModal.date ? events.filter((e) => !dayjs(dayModal.date!).isBefore(dayjs(e.startDate).startOf('day')) && !dayjs(dayModal.date!).isAfter(dayjs(e.endDate).endOf('day'))) : [];

    const submitLeave = async (values: any) => {
        setLeaveSubmit(true);
        try {
            const dateVal = leaveForm.getFieldValue('date');
            const dateStr = dayjs.isDayjs(dateVal) ? dateVal.format('YYYY-MM-DD') : (dateVal ?? '');
            await api.post('/leave-requests', { date: dateStr, reason: values.reason });
            message.success('Đã gửi đơn đăng ký nghỉ');
            setLeaveModal(false);
            leaveForm.resetFields();
            fetchData();
        } catch (e: any) { message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra'); }
        finally { setLeaveSubmit(false); }
    };

    const cancelLeave = async (id: string) => {
        try {
            await api.delete(`/leave-requests/${id}`);
            message.success('Đã huỷ đơn nghỉ');
            setDayModal({ open: false, date: null });
            fetchData();
        } catch (e: any) { message.error(e?.response?.data?.message ?? 'Không thể huỷ'); }
    };

    const handleReview = async (id: string, action: 'approve' | 'reject') => {
        setReviewLoading(true);
        try {
            await api.patch(`/leave-requests/${id}/${action}`, { reviewNote });
            message.success(action === 'approve' ? 'Đã duyệt' : 'Đã từ chối');
            setApproveModal(null);
            setReviewNote('');
            fetchData();
        } catch (e: any) { message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra'); }
        finally { setReviewLoading(false); }
    };

    const confirmEvent = async (id: string) => {
        setAttendLoading(true);
        try {
            await api.post(`/calendar-events/${id}/confirm`);
            message.success('Đã xác nhận tham gia');
            setEventModal(null);
            fetchData();
        } catch { message.error('Có lỗi xảy ra'); }
        finally { setAttendLoading(false); }
    };

    const rejectEvent = async (id: string) => {
        setAttendLoading(true);
        try {
            await api.post(`/calendar-events/${id}/reject`, { reason: rejectReason || undefined });
            message.success('Đã từ chối tham gia');
            setEventModal(null);
            setRejectReason('');
            fetchData();
        } catch { message.error('Có lỗi xảy ra'); }
        finally { setAttendLoading(false); }
    };

    const submitEvent = async (values: any) => {
        setEventSubmit(true);
        try {
            const startDate = values.startDate;
            const endDate   = values.endDate;
            await api.post('/calendar-events', { title: values.title, description: values.description, startDate, endDate });
            message.success('Đã tạo sự kiện');
            setCreateEvent(false);
            eventForm.resetFields();
            fetchData();
        } catch (e: any) { message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra'); }
        finally { setEventSubmit(false); }
    };

    const pendingCount = isPrivileged ? leaves.filter((l) => l.status === 'PENDING').length : 0;

    return (
        <>
            <Card
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarIcon size={18} color="#1A2B5A" />
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#1A2B5A' }}>Lịch làm việc</span>
                        {pendingCount > 0 && <Tag color="gold" style={{ marginLeft: 4 }}>{pendingCount} chờ duyệt</Tag>}
                    </span>
                }
                extra={
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="small" icon={<Plus size={14} />} onClick={() => setLeaveModal(true)}>Đăng ký nghỉ</Button>
                        {isPrivileged && (
                            <Button size="small" type="primary" icon={<Plus size={14} />} onClick={() => setCreateEvent(true)} style={{ background: '#1A2B5A' }}>
                                Tạo sự kiện
                            </Button>
                        )}
                    </div>
                }
                style={{ borderTop: '3px solid #1A2B5A' }}
                styles={{ body: { padding: 0 } }}
            >
                {loading
                    ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
                    : <Calendar value={currentMonth} onPanelChange={(val) => setCurrentMonth(val)} cellRender={dateCellRender}
                        onSelect={(date, { source }) => { if (source === 'date') setDayModal({ open: true, date }); }}
                        style={{ padding: '0 12px 12px' }} />
                }
                <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#6b7280' }}>
                    <span><Badge color="gold" /> Chờ duyệt</span>
                    <span><Badge color="green" /> Đã duyệt</span>
                    <span><Badge color="red" /> Từ chối</span>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>━ Sự kiện</span>
                </div>
            </Card>

            {/* Day detail modal */}
            <Modal open={dayModal.open} onCancel={() => setDayModal({ open: false, date: null })} footer={null}
                title={`📅 ${dayModal.date?.format('DD/MM/YYYY') ?? ''}`} width={480}>
                {dayLeaves.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Nghỉ phép</div>
                        {dayLeaves.map((l) => (
                            <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', borderRadius: 8, marginBottom: 6 }}>
                                <div>
                                    <Tag color={LEAVE_COLOR[l.status]}>{LEAVE_LABEL[l.status]}</Tag>
                                    {isPrivileged && <strong>{l.employee?.user.fullName}</strong>}
                                    {l.reason && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Lý do: {l.reason}</div>}
                                    {l.reviewNote && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>Ghi chú: {l.reviewNote}</div>}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                                    {isPrivileged && l.status === 'PENDING' && (
                                        <Button size="small" type="primary" onClick={() => { setApproveModal(l); setDayModal({ open: false, date: null }); }}>Xét duyệt</Button>
                                    )}
                                    {!isPrivileged && l.status === 'PENDING' && (
                                        <Button size="small" danger onClick={() => cancelLeave(l.id)}>Huỷ</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {dayEvtsModal.length > 0 && (
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Sự kiện</div>
                        {dayEvtsModal.map((ev) => (
                            <div key={ev.id} onClick={() => { setEventModal(ev); setDayModal({ open: false, date: null }); }}
                                style={{ padding: '8px 12px', background: '#f0f4ff', borderRadius: 8, marginBottom: 6, borderLeft: '3px solid #6366f1', cursor: 'pointer' }}>
                                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{dayjs(ev.startDate).format('DD/MM')} – {dayjs(ev.endDate).format('DD/MM/YYYY')}</div>
                                {ev.myAttendance && (
                                    <Tag style={{ marginTop: 4 }} color={ev.myAttendance.status === 'CONFIRMED' ? 'green' : ev.myAttendance.status === 'REJECTED' ? 'red' : 'default'}>
                                        {ev.myAttendance.status === 'CONFIRMED' ? 'Đã xác nhận' : ev.myAttendance.status === 'REJECTED' ? 'Đã từ chối' : 'Chưa phản hồi'}
                                    </Tag>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {dayLeaves.length === 0 && dayEvtsModal.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Không có lịch ngày này</div>
                )}
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <Button onClick={() => { leaveForm.setFieldValue('date', dayModal.date?.format('YYYY-MM-DD')); setDayModal({ open: false, date: null }); setLeaveModal(true); }} icon={<Plus size={14} />}>
                        Đăng ký nghỉ ngày này
                    </Button>
                </div>
            </Modal>

            {/* Đăng ký nghỉ modal */}
            <Modal open={leaveModalOpen} onCancel={() => { setLeaveModal(false); leaveForm.resetFields(); }}
                onOk={() => leaveForm.submit()} okText="Gửi đơn" cancelText="Huỷ" confirmLoading={leaveSubmitting} title="Đăng ký nghỉ phép">
                <Form form={leaveForm} layout="vertical" onFinish={submitLeave} style={{ marginTop: 16 }}>
                    <Form.Item name="date" label="Ngày nghỉ" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
                        <input type="date" style={{ width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14 }}
                            onChange={(e) => leaveForm.setFieldValue('date', e.target.value)} />
                    </Form.Item>
                    <Form.Item name="reason" label="Lý do (không bắt buộc)">
                        <Input.TextArea rows={3} placeholder="Nhập lý do nghỉ..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Xét duyệt modal */}
            <Modal open={!!approveModal} onCancel={() => { setApproveModal(null); setReviewNote(''); }} footer={null} title="Xét duyệt đơn nghỉ" width={440}>
                {approveModal && (
                    <div>
                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                            <div><strong>{approveModal.employee?.user.fullName}</strong> ({approveModal.employee?.employeeCode})</div>
                            <div style={{ color: '#6b7280', marginTop: 4 }}>Ngày nghỉ: <strong>{dayjs(approveModal.date).format('DD/MM/YYYY')}</strong></div>
                            {approveModal.reason && <div style={{ color: '#6b7280', marginTop: 4 }}>Lý do: {approveModal.reason}</div>}
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Ghi chú (không bắt buộc)</label>
                            <Input.TextArea rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Lý do từ chối hoặc ghi chú..." />
                        </div>
                        <Row gutter={8}>
                            <Col span={12}>
                                <Button block type="primary" icon={<CheckCircle size={14} />} loading={reviewLoading}
                                    onClick={() => handleReview(approveModal.id, 'approve')} style={{ background: '#10b981', borderColor: '#10b981' }}>
                                    Duyệt
                                </Button>
                            </Col>
                            <Col span={12}>
                                <Button block danger icon={<XCircle size={14} />} loading={reviewLoading} onClick={() => handleReview(approveModal.id, 'reject')}>
                                    Từ chối
                                </Button>
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>

            {/* Event detail modal */}
            <Modal open={!!eventModal} onCancel={() => { setEventModal(null); setRejectReason(''); }} footer={null}
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarIcon size={16} color="#6366f1" />{eventModal?.title}</span>} width={480}>
                {eventModal && (
                    <div>
                        <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 12, marginBottom: 16, borderLeft: '3px solid #6366f1' }}>
                            <div style={{ color: '#6b7280', fontSize: 13 }}>{dayjs(eventModal.startDate).format('DD/MM/YYYY')} – {dayjs(eventModal.endDate).format('DD/MM/YYYY')}</div>
                            {eventModal.description && <div style={{ marginTop: 6 }}>{eventModal.description}</div>}
                            <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
                                <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                                {eventModal._count?.attendances ?? 0} người đã phản hồi
                                {eventModal.createdBy && ` · Tạo bởi ${eventModal.createdBy.fullName}`}
                            </div>
                        </div>
                        {eventModal.myAttendance && (
                            <div style={{ marginBottom: 12 }}>
                                <Tag color={eventModal.myAttendance.status === 'CONFIRMED' ? 'green' : eventModal.myAttendance.status === 'REJECTED' ? 'red' : 'default'}>
                                    {eventModal.myAttendance.status === 'CONFIRMED' ? '✓ Đã xác nhận tham gia' : eventModal.myAttendance.status === 'REJECTED' ? '✗ Đã từ chối' : '⏳ Chưa phản hồi'}
                                </Tag>
                            </div>
                        )}
                        {eventModal.myAttendance?.status !== 'CONFIRMED' && (
                            <Button block type="primary" icon={<CheckCircle size={14} />} loading={attendLoading}
                                onClick={() => confirmEvent(eventModal.id)} style={{ marginBottom: 8, background: '#10b981', borderColor: '#10b981' }}>
                                Xác nhận tham gia
                            </Button>
                        )}
                        {eventModal.myAttendance?.status !== 'REJECTED' && (
                            <>
                                <Input.TextArea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Lý do từ chối (không bắt buộc)..." style={{ marginBottom: 8 }} />
                                <Button block danger icon={<XCircle size={14} />} loading={attendLoading} onClick={() => rejectEvent(eventModal.id)}>
                                    Từ chối tham gia
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </Modal>

            {/* Tạo sự kiện modal */}
            <Modal open={createEventOpen} onCancel={() => { setCreateEvent(false); eventForm.resetFields(); }}
                onOk={() => eventForm.submit()} okText="Tạo sự kiện" cancelText="Huỷ" confirmLoading={eventSubmitting} title="Tạo sự kiện mới">
                <Form form={eventForm} layout="vertical" onFinish={submitEvent} style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="Tên sự kiện" rules={[{ required: true, message: 'Vui lòng nhập tên sự kiện' }]}>
                        <Input placeholder="VD: Họp tổng kết tháng 6" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả (không bắt buộc)">
                        <Input.TextArea rows={2} placeholder="Mô tả chi tiết sự kiện..." />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
                                <input type="date" style={{ width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14 }}
                                    onChange={(e) => eventForm.setFieldValue('startDate', e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}>
                                <input type="date" style={{ width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14 }}
                                    onChange={(e) => eventForm.setFieldValue('endDate', e.target.value)} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </>
    );
}
