import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './pages/dashboard/Dashboard';
import { RoomListPage } from './pages/rooms/RoomListPage';
import { RoomCalendarPage } from './pages/rooms/RoomCalendarPage';
import { TicketKanbanPage } from './pages/incidents/TicketKanbanPage';
import { CSPStudioPage } from './pages/allocations/CSPStudioPage';
import { EquipmentDisposalPage } from './pages/equipments/EquipmentDisposalPage';
import { RBACMatrixPage } from './pages/admin/RBACMatrixPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { ApprovalQueuePage } from './pages/approvals/ApprovalQueuePage';
import { BookingModal } from './components/ui/BookingModal';
import { QRCheckInModal } from './components/ui/QRCheckInModal';
import { LoginPage } from './pages/auth/LoginPage';
import { UserProfileModal } from './components/ui/UserProfileModal';
import { RoomDetailModal } from './components/ui/RoomDetailModal';
import { Icons } from './components/common/SvgIcons';
import { ROOMS } from './mock/mockData';

const MainAppContent = () => {
  const { isTabAllowed, currentRoleMeta, isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingRoom, setSelectedBookingRoom] = useState(ROOMS[0]);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);
  const [selectedRoomCode, setSelectedRoomCode] = useState(null);

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  const handleOpenBooking = (room) => {
    setSelectedBookingRoom(room || ROOMS[0]);
    setIsBookingModalOpen(true);
  };

  // Subpage wrapper with Return-to-CAD button
  const renderSubPageWrapper = (title, category, component) => (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 80px' }}>
      {/* Return to CAD Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--hairline-soft)'
        }}
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className="laser-btn laser-btn-ghost"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px'
          }}
          title="Quay lại Bản Đồ Mặt Bằng CAD"
        >
          <Icons.ChevronLeft size={14} />
          <span>Quay lại Bản Đồ CAD</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          <span style={{ color: 'var(--ink-muted)' }}>{category}</span>
          <span style={{ color: 'var(--hairline-medium)' }}>/</span>
          <span style={{ color: 'var(--laser-cyan)', fontWeight: 700 }}>{title}</span>
        </div>
      </div>

      {component}
    </div>
  );

  const renderActiveView = () => {
    // 403 Forbidden check if activeTab is not dashboard and unauthorized
    if (activeTab !== 'dashboard' && !isTabAllowed(activeTab)) {
      return (
        <div style={{ maxWidth: '640px', margin: '80px auto', textAlign: 'center', padding: '48px 32px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Icons.Shield size={28} color="var(--laser-rose)" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-pure)', marginBottom: '10px' }}>
            Truy Cập Bị Giới Hạn Theo Vai Trò (RBAC Guard)
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Vai trò hiện tại của bạn là <strong style={{ color: 'var(--laser-cyan)' }}>{currentRoleMeta?.title || 'Sinh viên'}</strong> không có thẩm quyền truy cập vào phân hệ này theo ma trận phân quyền đại học của Ruo.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="laser-btn laser-btn-primary"
            style={{ padding: '8px 24px', borderRadius: 'var(--radius-full)', fontSize: '13px' }}
          >
            Quay lại Bản Đồ Không Gian
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenBookingModal={handleOpenBooking}
            onOpenQRModal={() => setIsQRModalOpen(true)}
          />
        );

      case 'rooms':
        return renderSubPageWrapper(
          'Danh Mục 108 Phòng Học & Tra Cứu',
          'TRỤ CỘT 2 • LỊCH BIỂU',
          <RoomListPage
            onOpenBookingModal={handleOpenBooking}
            onSelectRoomDetail={(room) => {
              setSelectedRoomCode(room.code || room.code);
              setIsRoomDetailOpen(true);
            }}
            onOpenCalendar={() => setActiveTab('calendar')}
          />
        );

      case 'calendar':
      case 'my_bookings':
      case 'series_booking':
        return renderSubPageWrapper(
          'Lịch Biểu Tuần Chuẩn RFC-5545',
          'TRỤ CỘT 2 • LỊCH BIỂU',
          <RoomCalendarPage onOpenBookingModal={handleOpenBooking} />
        );

      case 'approvals':
        return renderSubPageWrapper(
          'Hàng Đợi Phê Duyệt Đa Cấp & SLA Escalation',
          'TRỤ CỘT 3 • ĐIỀU HÀNH',
          <ApprovalQueuePage />
        );

      case 'tickets_kanban':
      case 'tickets':
        return renderSubPageWrapper(
          'Kanban SLA Quản Lý Sự Cố Khẩn Cấp',
          'TRỤ CỘT 3 • ĐIỀU HÀNH',
          <TicketKanbanPage />
        );

      case 'csp_studio':
        return renderSubPageWrapper(
          'Bộ Giải Thuật Toán Xếp TKB Tự Động (CSP Engine)',
          'TRỤ CỘT 1 • THUẬT TOÁN',
          <CSPStudioPage />
        );

      case 'equipments':
      case 'disposal_calc':
        return renderSubPageWrapper(
          activeTab === 'disposal_calc'
            ? 'Quy Trình Thanh Lý Tài Sản & Máy Tính Chỉ Số R ≥ 60%'
            : 'Kho Quản Lý Thiết Bị & Kiểm Kê Mã QR',
          activeTab === 'disposal_calc' ? 'TRỤ CỘT 5 • THANH LÝ' : 'TRỤ CỘT 4 • THIẾT BỊ',
          <EquipmentDisposalPage key={activeTab} initialTab={activeTab === 'disposal_calc' ? 'disposal' : 'inventory'} />
        );

      case 'rbac':
        return renderSubPageWrapper(
          'Ma Trận Phân Quyền 7 Nhóm (RBAC Matrix)',
          'QUẢN TRỊ HỆ THỐNG',
          <RBACMatrixPage />
        );

      case 'audit_log':
        return renderSubPageWrapper(
          'Nhật Ký Kiểm Toán SHA-256 Bất Biến',
          'BẢO MẬT & KIỂM TOÁN',
          <AuditLogPage />
        );

      default:
        return (
          <Dashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenBookingModal={handleOpenBooking}
            onOpenQRModal={() => setIsQRModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="panoramic-shell blueprint-canvas-bg">
      {/* 1. Grounded Two-Tier Enterprise Navigation Header */}
      <AppHeader
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQRDemo={() => setIsQRModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* 2. Main Subsystem Viewport */}
      <main className="ruo-main-viewport">
        {renderActiveView()}
      </main>

      {/* Global Interactive Modals */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        selectedRoom={selectedBookingRoom}
        onBookingSuccess={() => {}}
      />

      <QRCheckInModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        bookingRoom={selectedBookingRoom?.code || 'A1-302'}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <RoomDetailModal
        isOpen={isRoomDetailOpen}
        onClose={() => setIsRoomDetailOpen(false)}
        roomCode={selectedRoomCode}
        onOpenBookingModal={handleOpenBooking}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
